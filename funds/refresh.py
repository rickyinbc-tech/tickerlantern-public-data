#!/usr/bin/env python3
"""Refresh complete SEC fund-reference sources; preserve last verified components.

Source-native series/class identities are reference metadata, not a fund's
financial data, a retail-availability universe, or a holdings/NAV/fees feed.
"""
import argparse
import csv
import datetime as dt
import hashlib
from html import unescape
import io
import json
import os
from pathlib import Path
import re
import ssl
import time
import urllib.error
import urllib.parse
import urllib.request
import urllib.robotparser
import uuid

CATALOG_PAGE = "https://www.sec.gov/data-research/sec-markets-data/investment-company-series-class-information"
TICKERS = "https://www.sec.gov/files/company_tickers_mf.json"
UA = "TickerLantern Fund Research (https://tickerlantern.com; support@tickerlantern.com)"
CLASS_FIELDS = ["Reporting File Number", "CIK Number", "Entity Name", "Entity Org Type", "Series ID", "Series Name", "Class ID", "Class Name", "Class Ticker", "Address_1", "Address_2", "City", "State", "Zip Code"]
FIELDS = {"registrants": ["cik", "name", "organizationTypes", "reportingFileNumbers"],
          "series": ["cik", "seriesId", "name"],
          "classes": ["cik", "seriesId", "classId", "name", "catalogTicker"],
          "tickers": ["cik", "seriesId", "classId", "symbol"]}


def digest(body):
    return hashlib.sha256(body).hexdigest()


def now():
    return dt.datetime.now(dt.timezone.utc).isoformat()


def source(body, target, retrieved_at, **extra):
    return {"url": target, "retrievedAt": retrieved_at, "sha256": digest(body), "bytes": len(body), **extra}


def discover_catalog(body, today):
    text = body.decode("utf-8")
    pattern = r'<a\b[^>]*href=["\']([^"\']*investment-company-series-class-(\d{4})\.csv)["\'][^>]*>.*?</a>\s*<em>\s*Updated\s+(\d{1,2}/\d{1,2}/\d{2,4})\s*</em>'
    entries = {}
    for href, year, updated in re.findall(pattern, text, flags=re.I|re.S):
        month, day, date_year = map(int, updated.split("/"))
        date_year = date_year+2000 if date_year < 100 else date_year
        date = dt.date(date_year, month, day)
        target = urllib.parse.urljoin(CATALOG_PAGE, unescape(href))
        if urllib.parse.urlsplit(target).hostname != "www.sec.gov" or date > today:
            raise ValueError("Catalog discovery changed host or reports a future update")
        entries[(int(year), target)] = date.isoformat()
    if not entries:
        raise ValueError("No complete dated annual catalog link discovered; prior catalog retained")
    (year, target), date = max(entries.items())
    return {"year": year, "url": target, "asOf": date,
            "asOfMeaning": "Official catalog page updated date; not a fund financial-report date"}


def identity(cik, series, share_class):
    if isinstance(cik, bool):
        raise ValueError("Invalid CIK")
    cik = str(cik).zfill(10)
    if not re.fullmatch(r"\d{10}", cik) or not re.fullmatch(r"S\d{9}", series) or not re.fullmatch(r"C\d{9}", share_class):
        raise ValueError("Invalid exact CIK/series/class identity")
    return cik, series, share_class


def parse_catalog(body):
    reader = csv.DictReader(io.StringIO(body.decode("utf-8-sig"), newline=""))
    if reader.fieldnames != CLASS_FIELDS:
        raise ValueError("SEC catalog column schema changed")
    registrants, series, classes, class_parents = {}, {}, {}, {}
    raw_count, footer_count = 0, 0
    for record in reader:
        raw_count += 1
        if None in record or any(value is None for value in record.values()):
            raise ValueError("Malformed SEC CSV row")
        if all(not value.strip() for value in record.values()) or record["Reporting File Number"] == "No filters applied" and all(not value.strip() for key, value in record.items() if key != "Reporting File Number"):
            footer_count += 1
            continue
        cik, sid, cid = identity(record["CIK Number"], record["Series ID"], record["Class ID"])
        if not record["Entity Name"].strip() or not record["Series Name"].strip() or not record["Class Name"].strip() or not re.fullmatch(r"\d+", record["Entity Org Type"]):
            raise ValueError("Incomplete disclosed entity/series/class name or organization type")
        reg = registrants.setdefault(cik, [cik, record["Entity Name"], set(), set()])
        if reg[1] != record["Entity Name"]:
            raise ValueError("Conflicting registrant identity; no name-based reconciliation")
        reg[2].add(record["Entity Org Type"])
        reg[3].add(record["Reporting File Number"])
        row = [cik, sid, record["Series Name"]]
        if (cik, sid) in series and series[(cik, sid)] != row:
            raise ValueError("Conflicting exact series identity")
        series[(cik, sid)] = row
        row = [cik, sid, cid, record["Class Name"], record["Class Ticker"] or None]
        if (cik, sid, cid) in classes:
            raise ValueError("Duplicate exact SEC class identity")
        if (cik, cid) in class_parents and class_parents[(cik, cid)] != sid:
            raise ValueError("Class appears under different series")
        class_parents[(cik, cid)] = sid
        classes[(cik, sid, cid)] = row
    if not classes:
        raise ValueError("Empty SEC catalog is not a successful zero-fund universe")
    return {"registrants": [[cik, row[1], sorted(row[2]), sorted(row[3])] for cik, row in sorted(registrants.items())],
            "series": [row for key, row in sorted(series.items())], "classes": [row for key, row in sorted(classes.items())],
            "rawRows": raw_count, "recognizedFooterRows": footer_count}


def parse_tickers(body):
    data = json.loads(body)
    if data.get("fields") != ["cik", "seriesId", "classId", "symbol"] or not isinstance(data.get("data"), list):
        raise ValueError("SEC fund ticker schema changed")
    rows, seen = [], set()
    for row in data["data"]:
        if not isinstance(row, list) or len(row) != 4 or not isinstance(row[3], str) or len(row[3]) > 32:
            raise ValueError("Malformed SEC fund ticker row")
        cik, sid, cid = identity(*row[:3])
        key = cik, sid, cid
        if key in seen:
            raise ValueError("Duplicate exact SEC ticker identity")
        seen.add(key)
        rows.append([cik, sid, cid, row[3] or None])
    if not rows:
        raise ValueError("Empty SEC ticker file is not a successful zero-fund universe")
    return sorted(rows)


class Transport:
    def __init__(self, user_agent=UA, sleeper=time.sleep, raw_directory=None):
        if "tickerlantern.com" not in user_agent and "@" not in user_agent:
            raise ValueError("Identified SEC User-Agent required")
        self.ua, self.sleep, self.last, self.robots = user_agent, sleeper, 0, None
        self.raw_directory = Path(raw_directory) if raw_directory else None
        self.ssl_context = ssl.create_default_context()
        if not ssl.get_default_verify_paths().cafile and Path("/etc/ssl/cert.pem").is_file():
            self.ssl_context.load_verify_locations("/etc/ssl/cert.pem")

    def get(self, target, robots=True):
        parsed = urllib.parse.urlsplit(target)
        if parsed.scheme != "https" or parsed.hostname != "www.sec.gov" or parsed.username or parsed.password:
            raise ValueError("Only fixed official SEC HTTPS source hosts are allowed")
        if robots and self.robots is None:
            robot = urllib.robotparser.RobotFileParser()
            robot.parse(self.get("https://www.sec.gov/robots.txt", robots=False).decode("utf-8").splitlines())
            self.robots = robot
        if robots and not self.robots.can_fetch(self.ua, target):
            raise PermissionError("SEC robots.txt disallows source path")
        wait = max(1, self.robots.crawl_delay(self.ua) or self.robots.crawl_delay("*") or 0) if self.robots else 1
        for attempt in range(3):
            self.sleep(max(0, self.last+wait-time.monotonic()))
            self.last = time.monotonic()
            request = urllib.request.Request(target, headers={"User-Agent": self.ua, "Accept": "text/csv,application/json,text/html,text/plain"})
            try:
                # No redirects: a changed source location requires review.
                class NoRedirect(urllib.request.HTTPRedirectHandler):
                    def redirect_request(self, *args, **kwargs):
                        return None
                with urllib.request.build_opener(NoRedirect, urllib.request.HTTPSHandler(context=self.ssl_context)).open(request, timeout=45) as response:
                    body = response.read(25_000_001)
                if len(body) > 25_000_000:
                    raise ValueError("SEC reference source exceeds 25 MB budget")
                if self.raw_directory:
                    self.raw_directory.mkdir(parents=True, exist_ok=True)
                    path = self.raw_directory/(digest(target.encode())[:12]+"-"+digest(body)+".bin")
                    path.write_bytes(body)
                    path.with_suffix(".source.json").write_text(json.dumps(source(body, target, now()), indent=2)+"\n")
                return body
            except urllib.error.HTTPError as error:
                # A denied path is an access decision, not a transient failure.
                # Never retry 401/403 or try another URL to evade that decision.
                if error.code not in {408, 429, 500, 502, 503, 504} or attempt == 2:
                    raise
                retry_after = error.headers.get("Retry-After", "") if error.headers else ""
                delay = int(retry_after) if retry_after.isdigit() else 2**(attempt+1)
                if delay > 60:
                    raise
                self.sleep(max(2**(attempt+1), delay))
            except (urllib.error.URLError, TimeoutError):
                if attempt == 2:
                    raise
                self.sleep(2**(attempt+1))


def validate(data):
    if data.get("schemaVersion") != 1 or data.get("fields") != FIELDS or data.get("jurisdiction") != "US":
        raise ValueError("Invalid fund-reference output schema")
    if data.get("domicile") is not None or data.get("reportingCurrency") is not None:
        raise ValueError("Reference metadata cannot infer domicile or financial currency")
    for entry in data["sources"].values():
        if entry is None:
            continue
        if not re.fullmatch(r"[a-f0-9]{64}", entry.get("sha256", "")) or urllib.parse.urlsplit(entry.get("url", "")).hostname != "www.sec.gov":
            raise ValueError("Missing official source hash/URL evidence")
        observed = dt.datetime.fromisoformat(entry["retrievedAt"].replace("Z", "+00:00"))
        if observed.tzinfo is None:
            raise ValueError("Source retrieval must include timezone")
        if entry.get("asOf") is not None:
            dt.date.fromisoformat(entry["asOf"])
    series = set()
    registrants = {row[0] for row in data["registrants"]}
    for row in data["series"]:
        if len(row) != 3 or row[0] not in registrants or (row[0], row[1]) in series:
            raise ValueError("Invalid or duplicate series reference")
        series.add((row[0], row[1]))
    classes = set()
    for row in data["classes"]:
        key = identity(*row[:3])
        if len(row) != 5 or key in classes or key[:2] not in series:
            raise ValueError("Invalid or duplicate class reference")
        classes.add(key)
    tickers = set()
    for row in data["tickers"]:
        key = identity(*row[:3])
        if len(row) != 4 or key in tickers or row[3] is not None and (not isinstance(row[3], str) or not row[3]):
            raise ValueError("Invalid or duplicate ticker reference")
        tickers.add(key)
    for key, count in (("registrants", len(registrants)), ("series", len(series)), ("classes", len(classes)), ("tickerReferences", len(tickers))):
        expected = count if data["sources"]["tickers" if key == "tickerReferences" else "catalog"] else None
        if data["stats"][key] != expected:
            raise ValueError("Published reference counts differ from complete source rows")
    if data["sync"]["status"] not in {"ready", "partial", "error", "unavailable"}:
        raise ValueError("Unknown source refresh status")
    json.dumps(data, allow_nan=False)
    return data


def refresh(prior=None, fetch=None, checked_at=None):
    checked = checked_at or now()
    day = dt.datetime.fromisoformat(checked.replace("Z", "+00:00")).date()
    fetch = fetch or Transport(os.getenv("SEC_USER_AGENT", UA)).get
    if prior is not None:
        validate(prior)
    data = {"schemaVersion": 1, "fields": FIELDS, "jurisdiction": "US", "domicile": None, "reportingCurrency": None,
            "registrants": prior["registrants"] if prior else [], "series": prior["series"] if prior else [],
            "classes": prior["classes"] if prior else [], "tickers": prior["tickers"] if prior else [],
            "sources": dict(prior["sources"]) if prior else {"catalog": None, "tickers": None},
            "coverage": "Complete rows from the listed SEC series/class catalog and current ticker reference. Organization types include non-mutual-fund entities. Not all US/global funds, active retail products, NAV, fees, returns or holdings. Filing jurisdiction does not establish domicile.",
            "cadence": "Daily check at 05:43 UTC; official source publication dates are retained"}
    checks = []
    try:
        page = fetch(CATALOG_PAGE)
        catalog = discover_catalog(page, day)
        body = fetch(catalog["url"])
        parsed = parse_catalog(body)
        if prior and prior["sources"]["catalog"]:
            previous = prior["sources"]["catalog"]
            if catalog["asOf"] < previous["asOf"]:
                raise ValueError("Catalog publication date regressed")
            if len(parsed["classes"]) < len(prior["classes"])*0.75:
                raise ValueError("Unexplained catalog size collapse; prior complete data retained")
        for key in ("registrants", "series", "classes"):
            data[key] = parsed[key]
        data["sources"]["catalog"] = source(body, catalog["url"], checked, **{key: value for key, value in catalog.items() if key != "url"},
            rawRows=parsed["rawRows"], recognizedFooterRows=parsed["recognizedFooterRows"],
            discovery=source(page, CATALOG_PAGE, checked))
        checks.append({"id": "catalog", "status": "ready", "message": "Complete annual catalog parsed and exact identities validated"})
    except Exception as error:
        checks.append({"id": "catalog", "status": "parse_failed" if isinstance(error, (ValueError, KeyError, TypeError)) else "source_error", "message": type(error).__name__+": "+str(error)[:700]})
    try:
        body = fetch(TICKERS)
        parsed = parse_tickers(body)
        if prior and prior["sources"]["tickers"] and len(parsed) < len(prior["tickers"])*0.75:
            raise ValueError("Unexplained ticker reference size collapse; prior data retained")
        data["tickers"] = parsed
        data["sources"]["tickers"] = source(body, TICKERS, checked, asOf=None,
            asOfReason="SEC current ticker reference does not supply an observation/report date; retrieval time is not a report date",
            missingSymbolReason="Empty as-filed symbols remain null; symbols are not inferred from names")
        checks.append({"id": "tickers", "status": "ready", "message": "Complete current ticker reference parsed; no name or ticker-based fund joins"})
    except Exception as error:
        checks.append({"id": "tickers", "status": "parse_failed" if isinstance(error, (ValueError, KeyError, TypeError)) else "source_error", "message": type(error).__name__+": "+str(error)[:700]})
    annual = {tuple(row[:3]) for row in data["classes"]}
    ticker_ids = {tuple(row[:3]) for row in data["tickers"]}
    matched = annual & ticker_ids
    annual_tickers = {tuple(row[:3]): row[4] for row in data["classes"]}
    current_tickers = {tuple(row[:3]): row[3] for row in data["tickers"]}
    data["stats"] = {"registrants": len(data["registrants"]) if data["sources"]["catalog"] else None,
                     "series": len(data["series"]) if data["sources"]["catalog"] else None,
                     "classes": len(annual) if data["sources"]["catalog"] else None,
                     "tickerReferences": len(ticker_ids) if data["sources"]["tickers"] else None,
                     "referencesWithSymbol": sum(row[3] is not None for row in data["tickers"]) if data["sources"]["tickers"] else None,
                     "referencesMissingSymbol": sum(row[3] is None for row in data["tickers"]) if data["sources"]["tickers"] else None,
                     "exactClassMatches": len(matched), "currentTickerClassesAbsentAnnual": len(ticker_ids-annual),
                     "annualClassesWithoutCurrentTicker": len(annual-ticker_ids),
                     "differingDatedTickerLabels": sum(bool(annual_tickers[key]) and annual_tickers[key] != current_tickers[key] for key in matched)}
    good = sum(check["status"] == "ready" for check in checks)
    status = "ready" if good == len(checks) else "partial" if good else "error" if any(data["sources"].values()) else "unavailable"
    data["sync"] = {"status": status, "checkedAt": checked, "lastSuccessAt": checked if good == len(checks) else prior["sync"].get("lastSuccessAt") if prior else None,
                    "checks": checks, "workflowRun": os.getenv("GITHUB_RUN_ID"), "workflowEvent": os.getenv("GITHUB_EVENT_NAME")}
    return validate(data)


def publish(data, target):
    validate(data)
    target = Path(target)
    target.parent.mkdir(parents=True, exist_ok=True)
    temp = target.with_name(target.name+"."+uuid.uuid4().hex+".tmp")
    try:
        with temp.open("w", encoding="utf-8") as handle:
            json.dump(data, handle, ensure_ascii=False, separators=(",", ":"), allow_nan=False)
            handle.write("\n")
            handle.flush()
            os.fsync(handle.fileno())
        temp.replace(target)
    finally:
        temp.unlink(missing_ok=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("prior", type=Path, help="Missing path is allowed on first run")
    parser.add_argument("output", type=Path)
    parser.add_argument("--raw-directory", type=Path, help="Preserve immutable original public source bytes and SHA-256 manifests")
    args = parser.parse_args()
    previous = json.loads(args.prior.read_text()) if args.prior.exists() else None
    result = refresh(previous, fetch=Transport(os.getenv("SEC_USER_AGENT", UA), raw_directory=args.raw_directory).get)
    publish(result, args.output)
    print(json.dumps({"sync": result["sync"], "stats": result["stats"]}, indent=2))
