#!/usr/bin/env python3
"""Normalize dated SEC N-CEN census identities and characteristics, not prices.

The quarterly filing extract omits schema 3.1 filings as of 19 October 2026.
Every as-filed version survives. No name/ticker joins, financial-unit guesses,
or absent-series substitutions are allowed. Staged public facts stay in QA
until the application build validates and publishes them.
"""
import argparse
from collections import Counter, defaultdict
import csv
from datetime import date, datetime, timezone
from html import unescape
from html.parser import HTMLParser
import hashlib
import importlib.util
import io
import json
from pathlib import Path, PurePosixPath
import re
from urllib.parse import urljoin, urlsplit
import zipfile

SOURCE_PAGE = "https://www.sec.gov/data-research/sec-markets-data/form-n-cen-data-sets"
README = "https://www.sec.gov/file/ncen_readme"
MAX_ARCHIVE, MAX_EXPANDED, MAX_TABLE, MAX_ROWS = 25_000_000, 250_000_000, 80_000_000, 500_000
TYPES = {"IS_ETF": "Exchange-Traded Fund", "IS_ETMF": "Exchange-Traded Managed Fund",
    "IS_INDEX": "Index Fund", "IS_MULTI_INVERSE_INDEX": "Multi Inverse Index",
    "IS_INTERVAL": "Interval Fund", "IS_FUND_OF_FUND": "Fund of Funds",
    "IS_MASTER_FEEDER": "Master-Feeder Fund", "IS_MONEY_MARKET": "Money Market Fund",
    "IS_TARGET_DATE": "Target Date Fund", "IS_UNDERLYING_FUND": "Underlying Fund",
    "IS_FUND_TYPE_NA": "Fund type reported as N/A"}
CORE = {"SUBMISSION": {"ACCESSION_NUMBER", "SUBMISSION_TYPE", "CIK", "FILING_DATE", "REPORT_ENDING_PERIOD", "IS_REPORT_PERIOD_LT_12MONTH"},
    "REGISTRANT": {"ACCESSION_NUMBER", "REGISTRANT_NAME", "CIK", "LEI", "FILE_NUM", "INVESTMENT_COMPANY_TYPE", "IS_FIRST_FILING", "IS_LAST_FILING", "TOTAL_SERIES"},
    "FUND_REPORTED_INFO": {"FUND_ID", "ACCESSION_NUMBER", "FUND_NAME", "SERIES_ID", "LEI", *TYPES},
    "SHARES_OUTSTANDING": {"FUND_ID", "CLASS_ID", "CLASS_NAME", "TICKER"},
    "ADVISER": {"FUND_ID", "SOURCE", "ADVISER_TYPE", "ADVISER_NAME", "FILE_NUM", "CRD_NUM", "ADVISER_LEI", "IS_ADVISOR_HIRED", "ADVISOR_START_DATE", "ADVISOR_TERMINATED_DATE"},
    "ETF": {"FUND_ID", "FUND_NAME", "SERIES_ID", "IS_FUND_IN_KIND_ETF"},
    "SECURITY_EXCHANGE": {"FUND_ID", "FUND_EXCHANGE", "FUND_TICKER_SYMBOL"},
    "MASTER_FUNDS": {"FUND_ID", "FUND_NAME", "FILE_NUM", "SEC_FILE_NUM", "FUND_LEI"},
    "FEEDER_FUNDS": {"FUND_ID", "FUND_NAME", "REGISTERED_FILE_NUM", "REGISTERED_SERIES_ID", "REGISTERED_FUND_LEI", "UNREGISTERED_FILE_NUM", "UNREGISTERED_FUND_LEI"}}
LIMITATION = ("One quarterly annual-census filing extract, not a complete current US/global fund universe. "
    "SEC reports schema 3.1 filings omitted; older/late filings and other quarters are not imported. "
    "Annual report, filing and retrieval dates differ. Census characteristics/advisers are dated as filed, "
    "not current trading eligibility or a current manager guarantee. Blank flags are unreported, not false. "
    "No holdings, NAV, fee, return or currency values are normalized by this adapter.")


def now():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def encoded(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False).encode()


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def atomic(path, body):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + ".tmp")
    temporary.write_bytes(body)
    temporary.replace(path)


def source_date(value, required=True):
    value = str(value or "").strip()
    if not value and not required:
        return None
    if re.fullmatch(r"\d{2}-[A-Za-z]{3}-\d{4}", value):
        return datetime.strptime(value.upper(), "%d-%b-%Y").date().isoformat()
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        return date.fromisoformat(value).isoformat()
    raise ValueError("Invalid N-CEN source date: " + value)


def timestamp(value):
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError("Retrieval timestamp requires timezone")
    return parsed


def cik(value):
    value = str(value).strip().zfill(10)
    if not re.fullmatch(r"\d{10}", value) or int(value) == 0:
        raise ValueError("Invalid exact SEC CIK")
    return value


def accession(value):
    if not re.fullmatch(r"\d{10}-\d{2}-\d{6}", value):
        raise ValueError("Invalid exact SEC accession")
    return value


def identity(registrant, series):
    if not re.fullmatch(r"S\d{9}", series):
        raise ValueError("Exact series ID required for cross-source joins")
    return "nport-" + cik(registrant) + "-" + series.lower()


def flag(value):
    if value not in {"Y", "N", ""}:
        raise ValueError("Unexpected N-CEN checkbox value: " + value)
    return {"Y": True, "N": False, "": None}[value]


def filing_url(registrant, acc):
    return f"https://www.sec.gov/Archives/edgar/data/{int(registrant)}/{acc.replace('-', '')}/{acc}-index.html"


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.rows, self.current = [], None

    def handle_starttag(self, tag, attrs):
        if tag == "a":
            self.current = [dict(attrs).get("href", ""), ""]

    def handle_data(self, value):
        if self.current is not None:
            self.current[1] += value

    def handle_endtag(self, tag):
        if tag == "a" and self.current is not None:
            self.rows.append(self.current)
            self.current = None


def discover(body, today=None):
    today = today or date.today()
    links = Links()
    links.feed(body.decode("utf-8"))
    entries = {}
    for href, label in links.rows:
        url = urljoin(SOURCE_PAGE, href)
        match = re.search(r"/(\d{4})q([1-4])_ncen(?:_\d+)?\.zip$", url)
        if not match:
            continue
        parsed = urlsplit(url)
        if parsed.scheme != "https" or parsed.netloc != "www.sec.gov" or parsed.username or parsed.password:
            raise ValueError("N-CEN discovery left official SEC HTTPS source")
        year, quarter = map(int, match.groups())
        start = date(year, quarter * 3 - 2, 1)
        end = date(year + 1, 1, 1) if quarter == 4 else date(year, quarter * 3 + 1, 1)
        from datetime import timedelta
        end -= timedelta(days=1)
        if end > today:
            raise ValueError("N-CEN quarterly source window is in the future")
        if (year, quarter) in entries and entries[(year, quarter)]["url"] != url:
            raise ValueError("Competing archive URLs for one N-CEN quarter require review")
        entries[(year, quarter)] = {"url": url, "label": label.strip(), "filingWindowStart": start.isoformat(),
            "filingWindowEnd": end.isoformat(), "financialReportingDate": None,
            "windowMeaning": "Quarterly filing extract; each submission retains its annual REPORT_ENDING_PERIOD"}
    if not entries:
        raise ValueError("No dated official N-CEN archives found; not a zero-fund universe")
    text = re.sub(r"\s+", " ", unescape(re.sub(r"<[^>]*>", " ", body.decode("utf-8"))))
    omission = re.search(r"The data sets do not include.*?schema version 3\.1.*?EDGAR version \d+\.\d+\.", text, re.I)
    latest = dict(entries[max(entries)])
    latest.update({"availableArchiveCount": len(entries), "historicalArchivesPending": len(entries) - 1,
        "availableArchives": [entries[key] for key in sorted(entries, reverse=True)],
        "schema31Omitted": True if omission else None,
        "sourceCoverageNote": omission.group(0).strip() if omission else "Schema 3.1 coverage requires review; absence of a note is not proof of inclusion"})
    return latest


class Archive:
    def __init__(self, path):
        if Path(path).stat().st_size > MAX_ARCHIVE:
            raise ValueError("N-CEN ZIP exceeds compressed size budget")
        self.zip = zipfile.ZipFile(path)
        self.counts, self.headers, self.hashes = {}, {}, {}
        names, total = set(), 0
        for member in self.zip.infolist():
            parts = PurePosixPath(member.filename).parts
            if member.filename in names or member.filename.startswith("/") or ".." in parts or len(parts) != 1 or member.flag_bits & 1:
                raise ValueError("Unsafe, encrypted or duplicate N-CEN archive member")
            names.add(member.filename)
            total += member.file_size
            if member.file_size > MAX_TABLE or total > MAX_EXPANDED:
                raise ValueError("N-CEN ZIP exceeds expanded size budget")
        self.total_expanded = total
        self.available_tables = sorted(name[:-4] for name in names if name.endswith(".tsv"))
        self.reference_hashes = {name: sha(self.zip.read(name)) for name in ["ncen_readme.htm", "ncen_metadata.json"] if name in names}

    def rows(self, table):
        name = table + ".tsv"
        if name not in self.zip.namelist():
            raise ValueError("N-CEN source omitted selected table " + table)
        raw = self.zip.read(name)
        self.hashes[table] = sha(raw)
        csv.field_size_limit(2_000_000)
        reader = csv.DictReader(io.StringIO(raw.decode("utf-8-sig"), newline=""), delimiter="\t")
        fields = reader.fieldnames
        if not fields or len(set(fields)) != len(fields) or not CORE[table].issubset(fields):
            raise ValueError("N-CEN table schema changed: " + table)
        self.headers[table] = fields
        result = []
        for row in reader:
            if None in row or any(value is None for value in row.values()):
                raise ValueError("Malformed N-CEN TSV row: " + table)
            if len(result) >= MAX_ROWS:
                raise ValueError("N-CEN table exceeds bounded row count")
            result.append({key: value.strip() for key, value in row.items()})
        self.counts[table] = len(result)
        return result


def group_children(rows, parents, table, key=None):
    grouped, seen = defaultdict(list), set()
    for row in rows:
        parent = row["FUND_ID"]
        exact = (parent, row[key]) if key else tuple(row.items())
        if parent not in parents or exact in seen:
            raise ValueError("Orphan/duplicate exact row in " + table)
        seen.add(exact)
        grouped[parent].append(row)
    return grouped


def select_versions(observations):
    """Select dated as-filed observations without filling amendment omissions."""
    periods = defaultdict(list)
    for observation in observations:
        periods[observation["reportingDate"]].append(observation)
    for versions in periods.values():
        ordered = sorted(versions, key=lambda value: (value["filingDate"], value["accession"]), reverse=True)
        candidates = [value for value in ordered if value["filingDate"] == ordered[0]["filingDate"]]
        for observation in ordered:
            observation["periodFilingLineage"] = [value["accession"] for value in ordered]
            observation["versionSelectionStatus"] = "review_required" if len(candidates) > 1 and observation in candidates else "latest_as_filed_version" if observation is candidates[0] else "superseded"
            observation["isLatestForPeriod"] = len(candidates) == 1 and observation is candidates[0]
    latest_period = max(periods)
    latest = [value for value in periods[latest_period] if value["isLatestForPeriod"]]
    return {"observations": sorted(observations, key=lambda value: (value["reportingDate"], value["filingDate"], value["accession"]), reverse=True),
        "latestObservationId": latest[0]["id"] if len(latest) == 1 else None,
        "selectionStatus": "latest_as_filed_version" if len(latest) == 1 else "review_required",
        "latestReportingDate": latest_period,
        "amendmentTreatment": "Separate as-filed census responses; no field carry-forward, no missing-fund termination inference, no holdings union"}


def parse_archive(path, evidence, batch):
    if evidence.get("url") != batch.get("url") or evidence.get("sha256") != sha(Path(path).read_bytes()) or evidence.get("bytes") != Path(path).stat().st_size:
        raise ValueError("Archive URL/hash/length does not match locked source evidence")
    retrieved = timestamp(evidence["retrievedAt"])
    archive = Archive(path)
    tables = {table: archive.rows(table) for table in CORE}
    if not tables["SUBMISSION"] or not tables["FUND_REPORTED_INFO"]:
        raise ValueError("Empty N-CEN source is not a successful zero-fund universe")
    submissions, registrants, notices, issues = {}, {}, [], []
    for row in tables["SUBMISSION"]:
        acc = accession(row["ACCESSION_NUMBER"])
        if acc in submissions or row["SUBMISSION_TYPE"] not in {"N-CEN", "N-CEN/A", "NT N-CEN", "NT N-CEN/A"}:
            raise ValueError("Duplicate accession or unknown N-CEN form")
        row_cik = cik(row["CIK"])
        filed = source_date(row["FILING_DATE"])
        reported = source_date(row["REPORT_ENDING_PERIOD"])
        if reported > filed or filed > retrieved.date().isoformat() or not batch["filingWindowStart"] <= filed <= batch["filingWindowEnd"]:
            raise ValueError("N-CEN filing/report date outside locked source window")
        submissions[acc] = {"accession": acc, "cik": row_cik, "filingDate": filed,
            "reportingDate": reported, "form": row["SUBMISSION_TYPE"], "reportPeriodLessThan12Months": flag(row["IS_REPORT_PERIOD_LT_12MONTH"]),
            "amendment": row["SUBMISSION_TYPE"].endswith("/A"), "sourceURL": filing_url(row_cik, acc)}
        if row["SUBMISSION_TYPE"].startswith("NT "):
            notices.append({**submissions[acc], "status": "notice", "sourceFields": row})
    for row in tables["REGISTRANT"]:
        acc = accession(row["ACCESSION_NUMBER"])
        if acc not in submissions or acc in registrants or cik(row["CIK"]) != submissions[acc]["cik"] or not row["REGISTRANT_NAME"]:
            raise ValueError("Duplicate/orphan/conflicting registrant identity")
        flag(row["IS_FIRST_FILING"])
        flag(row["IS_LAST_FILING"])
        registrants[acc] = row
    if set(registrants) != set(submissions):
        raise ValueError("Registrant/submission denominator mismatch")
    source_funds = {}
    for row in tables["FUND_REPORTED_INFO"]:
        source_id, acc, sid = row["FUND_ID"], accession(row["ACCESSION_NUMBER"]), row["SERIES_ID"]
        if acc not in submissions or source_id in source_funds or submissions[acc]["form"].startswith("NT "):
            raise ValueError("Orphan/duplicate fund row or notice represented as census fund")
        expected = acc + "_" + submissions[acc]["cik"] + ("_" + sid if sid else "")
        if source_id != expected or sid and not re.fullmatch(r"S\d{9}", sid):
            raise ValueError("FUND_ID contradicts exact accession/CIK/series parent")
        source_funds[source_id] = row
    children = {table: group_children(tables[table], source_funds, table, "FUND_ID" if table == "ETF" else None)
        for table in CORE if table not in {"SUBMISSION", "REGISTRANT", "FUND_REPORTED_INFO"}}
    funds, unjoinable, observations = {}, [], []
    class_parents = {}
    for source_id, row in source_funds.items():
        submission = submissions[row["ACCESSION_NUMBER"]]
        reg = registrants[submission["accession"]]
        sid = row["SERIES_ID"]
        fund_id = identity(submission["cik"], sid) if sid else "ncen-" + submission["cik"] + "-" + submission["accession"].replace("-", "")
        product_types = [{"sourceField": field, "label": label, "value": flag(row[field]), "sourceValue": row[field]} for field, label in TYPES.items()]
        advisers = []
        for advice in children["ADVISER"][source_id]:
            role = advice["ADVISER_TYPE"].lower().replace("adviser", "advisor")
            if role not in {"advisor", "subadvisor", "terminated advisor", "terminated subadvisor"} or advice["SOURCE"] not in {"Part C", "Part D"}:
                raise ValueError("Unknown source adviser role/section requires review")
            started = source_date(advice["ADVISOR_START_DATE"], False)
            terminated = source_date(advice["ADVISOR_TERMINATED_DATE"], False)
            warnings = []
            if (started and started > submission["reportingDate"]) or (terminated and terminated > submission["reportingDate"]):
                warnings.append("Source adviser date exceeds annual report end; exact source date retained for review")
            if started and terminated and started > terminated:
                warnings.append("Source adviser start follows termination; exact source dates retained for review")
            if warnings:
                issues.append({"sourceFundId": source_id, "type": "adviser_date_review", "name": advice["ADVISER_NAME"], "warnings": warnings})
            advisers.append({"name": advice["ADVISER_NAME"] or None, "role": advice["ADVISER_TYPE"], "sourceSection": advice["SOURCE"],
                "fileNumber": advice["FILE_NUM"] or None, "crdNumber": advice["CRD_NUM"] or None, "lei": advice["ADVISER_LEI"] or None,
                "country": advice.get("COUNTRY") or None, "state": advice.get("STATE") or None,
                "hiredDuringPeriod": flag(advice["IS_ADVISOR_HIRED"]), "startDate": started, "terminationDate": terminated,
                "relationshipStatus": "terminated_as_filed" if role.startswith("terminated") else "reported_during_annual_period_not_current_guarantee",
                "warnings": warnings})
        classes, seen_classes = [], set()
        for item in children["SHARES_OUTSTANDING"][source_id]:
            cid = item["CLASS_ID"]
            if cid and not re.fullmatch(r"C\d{9}", cid):
                raise ValueError("Invalid exact SEC class ID")
            original_cid = cid
            if cid == "C000000000":
                # The live extract repeats this source placeholder for three
                # differently named closed-end classes. It is not an ID join.
                cid = None
                issues.append({"sourceFundId": source_id, "type": "source_placeholder_class_id",
                    "sourceClassId": original_cid, "className": item["CLASS_NAME"]})
            if cid:
                if cid in seen_classes:
                    raise ValueError("Duplicate exact class ID within filing/fund")
                seen_classes.add(cid)
                parent = submission["cik"], sid
                if cid in class_parents and class_parents[cid] != parent:
                    raise ValueError("Exact class ID appears under conflicting CIK/series parents")
                class_parents[cid] = parent
            classes.append({"id": cid or None, "sourceClassId": original_cid or None, "name": item["CLASS_NAME"], "ticker": item["TICKER"] or None,
                "identityStatus": "exact_class_id" if cid else "source_placeholder_class_id" if original_cid else "source_class_id_missing",
                "currency": None, "listingVerified": False})
        etf = children["ETF"][source_id]
        if etf and (etf[0]["SERIES_ID"] != sid or flag(row["IS_ETF"]) is not True):
            raise ValueError("ETF detail table contradicts fund series/classification")
        for relationship in children["FEEDER_FUNDS"][source_id]:
            related_sid = relationship["REGISTERED_SERIES_ID"]
            if related_sid and related_sid != "N/A" and not re.fullmatch(r"S\d{9}", related_sid):
                raise ValueError("Invalid exact feeder series ID")
        observation = {"id": source_id, "sourceFundId": source_id, "fundId": fund_id, "canonicalFundId": fund_id if sid else None,
            "cik": submission["cik"], "seriesId": sid or None,
            **submission, "sourceType": "SEC_NCEN", "name": row["FUND_NAME"] or None, "registrant": reg["REGISTRANT_NAME"],
            "retrievedAt": evidence["retrievedAt"], "bulkSourceURL": evidence["url"], "sourceSha256": evidence["sha256"],
            "registration": {"form": reg["INVESTMENT_COMPANY_TYPE"] or None, "fileNumber": reg["FILE_NUM"] or None,
                "registrantLEI": reg["LEI"] or None, "fundLEI": row["LEI"] or None,
                "firstRegistrantFiling": flag(reg["IS_FIRST_FILING"]), "lastRegistrantFiling": flag(reg["IS_LAST_FILING"]),
                "familyName": reg.get("FAMILY_INVESTMENT_COMPANY_NAME") or None, "domicile": None},
            "productTypes": product_types, "advisers": advisers, "classes": classes,
            "etfFacts": {"isInKindETF": flag(etf[0]["IS_FUND_IN_KIND_ETF"])} if etf else None,
            "exchangeListings": [{"exchange": value["FUND_EXCHANGE"] or None, "ticker": value["FUND_TICKER_SYMBOL"] or None,
                "status": "as_filed_not_current_listing_verification"} for value in children["SECURITY_EXCHANGE"][source_id]],
            "masterFundRelationships": children["MASTER_FUNDS"][source_id], "feederFundRelationships": children["FEEDER_FUNDS"][source_id]}
        observations.append(observation)
        if not sid:
            unjoinable.append({**observation, "identityStatus": "exact_registrant_only_series_not_supplied",
                "reason": "Source has no series ID; retained without a synthetic series or name/ticker cross-source join"})
        if sid and not row["FUND_NAME"]:
            raise ValueError("Exact-series fund lacks a name; source review required")
        fund = funds.setdefault(fund_id, {"id": fund_id, "cik": submission["cik"], "seriesId": sid or None,
            "identityKind": "exact_cik_series" if sid else "filing_scoped_unresolved_series",
            "canonicalFundId": fund_id if sid else None, "crossSourceJoinAllowed": bool(sid),
            "sourceType": "SEC_NCEN", "registrationJurisdiction": "US", "domicile": None, "currency": "",
            "catalogOnly": True, "reports": [], "classes": [], "censusFacts": {"observations": []}})
        fund["censusFacts"]["observations"].append(observation)
    for fund in funds.values():
        facts = select_versions(fund["censusFacts"]["observations"])
        facts["sourceType"] = "SEC_NCEN"
        fund["censusFacts"] = facts
        latest = next((value for value in facts["observations"] if value["id"] == facts["latestObservationId"]), None)
        # Identity text is only a fallback for a stand-alone catalog row. A
        # current registry/N-PORT name is never overwritten by this extension.
        named = latest or facts["observations"][0]
        fund.update({"name": named["name"] or "Census filing · " + named["registrant"], "registrant": named["registrant"], "sourceURL": named["sourceURL"],
            "sourceId": fund["cik"] + "/" + fund["seriesId"] if fund["seriesId"] else named["sourceFundId"], "sourceAsOf": named["reportingDate"],
            "retrievedAt": evidence["retrievedAt"], "classes": [{**value, "asOf": latest["reportingDate"],
                "sourceURL": latest["sourceURL"], "sourceAccession": latest["accession"]} for value in latest["classes"] if value["id"]] if latest else []})
    if len(observations) != archive.counts["FUND_REPORTED_INFO"] or sum(len(value["classes"]) for value in observations) != archive.counts["SHARES_OUTSTANDING"] or sum(len(value["advisers"]) for value in observations) != archive.counts["ADVISER"]:
        raise ValueError("N-CEN normalized row counts do not reconcile with complete selected tables")
    manifest = {"source_url": evidence["url"], "source_scope": batch, "source_submission_rows": len(submissions),
        "source_registrant_rows": len(registrants), "source_fund_rows": len(observations),
        "unique_registrants": len({value["cik"] for value in submissions.values()}), "unique_exact_series_funds": sum(value["seriesId"] is not None for value in funds.values()),
        "filing_scoped_records": len(unjoinable), "catalog_records": len(funds),
        "joinable_fund_observations": len(observations) - len(unjoinable), "unjoinable_fund_observations": len(unjoinable),
        "source_class_rows": archive.counts["SHARES_OUTSTANDING"], "source_adviser_rows": archive.counts["ADVISER"],
        "source_etf_rows": archive.counts["ETF"], "source_exchange_rows": archive.counts["SECURITY_EXCHANGE"],
        "source_master_fund_rows": archive.counts["MASTER_FUNDS"], "source_feeder_fund_rows": archive.counts["FEEDER_FUNDS"],
        "forms": dict(Counter(value["form"] for value in submissions.values())),
        "amendment_submissions": sum(value["amendment"] for value in submissions.values()),
        "amendment_fund_observations": sum(value["amendment"] for value in observations),
        "notices": len(notices), "report_dates": dict(Counter(value["reportingDate"] for value in submissions.values())),
        "product_type_observations": {field: sum(value["value"] is True for obs in observations for value in obs["productTypes"] if value["sourceField"] == field) for field in TYPES},
        "table_rows_imported": archive.counts, "table_columns": archive.headers, "table_hashes_imported": archive.hashes,
        "reference_hashes": archive.reference_hashes, "available_tables": archive.available_tables,
        "unimported_ancillary_tables": sorted(set(archive.available_tables) - set(CORE)),
        "source_batch_complete_for_selected_tables": True, "parse_failed": 0,
        "schema_31_omitted": batch.get("schema31Omitted"), "complete_current_us_fund_universe": False,
        "provider_product_denominator": None, "global_product_denominator": None,
        "financial_values_normalized": 0, "limitations": LIMITATION}
    return {"schemaVersion": 1, "sourceType": "SEC_NCEN", "builtAt": now(), "retrievedAt": evidence["retrievedAt"],
        "sourceEvidence": evidence, "sourcePageEvidence": batch.get("sourcePageEvidence"),
        "funds": sorted(funds.values(), key=lambda value: value["id"]), "unjoinable": unjoinable, "notices": notices,
        "manifest": manifest, "issues": issues}


def stage_extension(catalog, path):
    extension = {"schemaVersion": 1, "sourceType": "SEC_NCEN", "funds": catalog["funds"],
        "unjoinable": catalog["unjoinable"], "notices": catalog["notices"], "manifest": catalog["manifest"], "issues": catalog["issues"],
        "sources": [{"id": "sec-ncen-" + catalog["manifest"]["source_scope"]["filingWindowEnd"],
            "type": "SEC_NCEN", **catalog["sourceEvidence"], "scopeURL": SOURCE_PAGE, "readmeURL": README,
            "scopeComplete": False, "scope": LIMITATION, "discovery": catalog.get("sourcePageEvidence")}]}
    atomic(path, encoded(extension))
    return extension


def download_latest(directory):
    """Reuse reviewed identified SEC transport, with no access-denial fallback."""
    directory = Path(directory)
    directory.mkdir(parents=True, exist_ok=True)
    transport_path = Path(__file__).resolve().parent.parent / "fund-publisher/refresh.py"
    spec = importlib.util.spec_from_file_location("tickerlantern_existing_sec_transport", transport_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    transport = module.Transport()
    page = transport.get(SOURCE_PAGE)
    page_path = directory / "source-page.html"
    atomic(page_path, page)
    atomic(page_path.with_suffix(".html.meta.json"), encoded(module.source(page, SOURCE_PAGE, now())))
    batch = discover(page)
    archive = directory / Path(urlsplit(batch["url"]).path).name
    metadata = archive.with_suffix(archive.suffix + ".meta.json")
    if archive.exists() and metadata.exists():
        prior = json.loads(metadata.read_text())
        if prior.get("url") != batch["url"] or prior.get("sha256") != sha(archive.read_bytes()) or prior.get("bytes") != archive.stat().st_size:
            raise ValueError("Stored N-CEN ZIP identity/hash/bytes mismatch; review required")
    else:
        raw = transport.get(batch["url"])
        with zipfile.ZipFile(io.BytesIO(raw)) as source:
            if not source.namelist():
                raise ValueError("Empty source ZIP")
        atomic(archive, raw)
        atomic(metadata, encoded(module.source(raw, batch["url"], now())))
    return archive, page_path, metadata


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--archive", type=Path)
    parser.add_argument("--source-page", type=Path)
    parser.add_argument("--source-meta", type=Path)
    parser.add_argument("--download-latest", action="store_true")
    parser.add_argument("--raw-directory", type=Path, default=Path("qa/sec-ncen/" + now()[:10]))
    parser.add_argument("--output", type=Path, default=Path("qa/sec-ncen/catalog.json"))
    parser.add_argument("--extension", type=Path, default=Path("qa/sec-ncen/research-extension.json"))
    args = parser.parse_args()
    if args.download_latest:
        if any([args.archive, args.source_page, args.source_meta]):
            parser.error("Use --download-latest or three locked source paths")
        args.archive, args.source_page, args.source_meta = download_latest(args.raw_directory)
    elif not all([args.archive, args.source_page, args.source_meta]):
        parser.error("Provide --archive, --source-page and --source-meta, or --download-latest")
    page = args.source_page.read_bytes()
    batch = discover(page)
    page_meta = args.source_page.with_suffix(".html.meta.json")
    if not page_meta.exists():
        raise ValueError("Source discovery page requires original URL/hash/retrieval evidence")
    page_evidence = json.loads(page_meta.read_text())
    if page_evidence.get("url") != SOURCE_PAGE or page_evidence.get("sha256") != sha(page) or page_evidence.get("bytes") != len(page):
        raise ValueError("Discovery page source evidence mismatch")
    timestamp(page_evidence["retrievedAt"])
    batch["sourcePageEvidence"] = page_evidence
    evidence = json.loads(args.source_meta.read_text())
    catalog = parse_archive(args.archive, evidence, batch)
    # All source/schema/identity failures occur before either staged write.
    atomic(args.output, encoded(catalog))
    stage_extension(catalog, args.extension)
    print(json.dumps({"output": str(args.output), "extension": str(args.extension), "manifest": catalog["manifest"]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
