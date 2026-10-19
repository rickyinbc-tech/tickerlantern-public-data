#!/usr/bin/env python3
"""Import a complete official SEC N-MFP batch without merging filing versions.

Decimal text, source identities and report/filing/retrieval dates remain exact.
Raw sources and staged extension/packs belong in ignored QA until reviewed.
"""
import argparse
from collections import Counter, defaultdict
from datetime import date, datetime, timezone
from decimal import Decimal, InvalidOperation, localcontext
import gzip
import hashlib
from html.parser import HTMLParser
import importlib.util
import io
import json
from pathlib import Path, PurePosixPath
import re
import sys
from urllib.parse import urljoin, urlsplit
import zipfile

SOURCE_PAGE = "https://www.sec.gov/data-research/sec-markets-data/dera-form-n-mfp-data-sets"
README = "https://www.sec.gov/files/nmfp_readme.pdf"
FORM = "https://www.sec.gov/files/formn-mfp.pdf"
SPEC = "https://www.sec.gov/files/edgar-form-n-mfp3-xml-technical-specification.zip"
RULE = "https://www.ecfr.gov/current/title-17/chapter-II/part-270/section-270.2a-7"
MAX_ARCHIVE = 25_000_000
MAX_EXPANDED = 250_000_000
MAX_TABLE = 100_000_000
MAX_ROWS = 1_000_000
MONEY_FIELDS = {"series": ["CASH", "TOTALVALUEPORTFOLIOSECURITIES", "AMORTIZEDCOSTPORTFOLIOSECURITI",
    "TOTALVALUEOTHERASSETS", "TOTALVALUELIABILITIES", "NETASSETOFSERIES", "STABLEPRICEPERSHARE"],
    "class": ["MININITIALINVESTMENT", "NETASSETSOFCLASS", "NUMBEROFSHARESOUTSTANDING"]}
CORE = {"SUBMISSION": {"ACCESSION_NUMBER", "FILING_DATE", "SUBMISSIONTYPE", "FILER_CIK", "REPORTDATE", "SERIESID", "SERIES_NAME", "TOTALSHARECLASSESINSERIES"},
    "SERIESLEVELINFO": {"ACCESSION_NUMBER", "NETASSETOFSERIES", "TOTALVALUEPORTFOLIOSECURITIES", "TOTALVALUELIABILITIES", "CASH", "TOTALVALUEOTHERASSETS", "MONEYMARKETFUNDCATEGORY"},
    "CLASSLEVELINFO": {"ACCESSION_NUMBER", "CLASSESID", "CLASS_NAME", "NETASSETSOFCLASS"},
    "SCHPORTFOLIOSECURITIES": {"ACCESSION_NUMBER", "SECURITY_ID", "NAMEOFISSUER", "TITLEOFISSUER", "CUSIP_NUMBER", "ISIN", "INCLUDINGVALUEOFANYSPONSORSUPP", "EXCLUDINGVALUEOFANYSPONSORSUPP", "PERCENTAGEOFMONEYMARKETFUNDNET"},
    "DLYNETASSETVALUEPERSHARC": {"ACCESSION_NUMBER", "CLASSESID", "DLYNETASSETVALUEPERSHARECLASS", "DLYNETASSETVALUEPERSHAREDATEC"},
    "SEVENDAYNETYIELD": {"ACCESSION_NUMBER", "CLASSESID", "SEVENDAYNETYIELDVALUE", "SEVENDAYNETYIELDDATE"},
    "DLYNETASSETVALUEPERSHARS": {"ACCESSION_NUMBER", "DLYNETASSETVALUEPERSHARESER", "DLYNETASSETVALPERSHAREDATES"},
    "SEVENDAYGROSSYIELD": {"ACCESSION_NUMBER", "SEVENDAYGROSSYIELDVALUE", "SEVENDAYGROSSYIELDDATE"},
    "ADVISER": {"ACCESSION_NUMBER", "ADVISERNAME", "ADVISERFILENUMBER", "ADVISER_TYPE"},
    "MASTERFEEDERFUND": {"ACCESSION_NUMBER", "SERIESID", "FUND_TYPE"},
    "FUND": {"ACCESSION_NUMBER", "SERIESID", "FUND_TYPE"}}
POSITION_FIELDS = ["holdingId", "issuer", "title", "cusip", "balance", "unit", "instrumentCurrency", "value",
    "reportedPercent", "identifiers", "flags", "assetCategory", "profile", "country", "otherUnit", "otherAsset",
    "exchangeRate", "restricted", "fairValueLevel", "derivativeCategory", "sourceFields"]


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
    found = []
    for href, label in links.rows:
        url = urljoin(SOURCE_PAGE, href)
        match = re.search(r"/(\d{8})-(\d{8})_nmfp\.zip$", url)
        if not match:
            continue
        if urlsplit(url).scheme != "https" or urlsplit(url).netloc != "www.sec.gov":
            raise ValueError("N-MFP archive link left official SEC HTTPS host")
        start, end = [datetime.strptime(value, "%Y%m%d").date() for value in match.groups()]
        if start > end or end > today:
            raise ValueError("N-MFP batch window is invalid or in the future")
        found.append({"url": url, "label": label.strip(), "filingWindowStart": start.isoformat(),
            "filingWindowEnd": end.isoformat(), "financialReportingDate": None,
            "windowMeaning": "Source archive submission window; each filing retains its own REPORTDATE"})
    if not found:
        raise ValueError("No dated monthly N-MFP archive discovered; source failure is not an empty fund universe")
    return max(found, key=lambda x: (x["filingWindowEnd"], x["filingWindowStart"]))


def source_date(value, required=True):
    value = str(value or "").strip()
    if not value and not required:
        return None
    if re.fullmatch(r"\d{2}-[A-Za-z]{3}-\d{4}", value):
        return datetime.strptime(value.upper(), "%d-%b-%Y").date().isoformat()
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        return date.fromisoformat(value).isoformat()
    raise ValueError("Invalid source date: " + value)


def decimal_text(value, multiplier=1, required=False):
    text = "" if value is None else str(value).strip()
    if not text:
        if required:
            raise ValueError("Required source decimal is blank")
        return None
    if not re.fullmatch(r"[+-]?(?:\d+(?:\.\d*)?|\.\d+)", text) or len(text) > 80:
        raise ValueError("Invalid exact source decimal: " + text)
    try:
        with localcontext() as context:
            context.prec = 100
            value = Decimal(text) * Decimal(multiplier)
            return format(value, "f")
    except InvalidOperation as exc:
        raise ValueError("Invalid exact source decimal") from exc


def identity(cik, series, class_id=None):
    cik = str(cik).strip().zfill(10)
    if not re.fullmatch(r"\d{10}", cik) or int(cik) == 0 or not re.fullmatch(r"S\d{9}", series):
        raise ValueError("Invalid exact SEC CIK/series identity")
    if class_id is not None and not re.fullmatch(r"C\d{9}", class_id):
        raise ValueError("Invalid exact SEC class identity")
    return cik + ":" + series + (":" + class_id if class_id else "")


def accession(value):
    if not re.fullmatch(r"\d{10}-\d{2}-\d{6}", value):
        raise ValueError("Invalid SEC accession")
    return value


def filing_url(cik, acc):
    return f"https://www.sec.gov/Archives/edgar/data/{int(cik)}/{acc.replace('-', '')}/{acc}-index.html"


class Archive:
    def __init__(self, path):
        if Path(path).stat().st_size > MAX_ARCHIVE:
            raise ValueError("N-MFP ZIP exceeds compressed size budget")
        self.zip = zipfile.ZipFile(path)
        self.counts, self.headers, self.hashes = {}, {}, {}
        names = set()
        total = 0
        for member in self.zip.infolist():
            parts = PurePosixPath(member.filename).parts
            if member.filename in names or member.filename.startswith("/") or ".." in parts or len(parts) != 1 or member.flag_bits & 1:
                raise ValueError("Unsafe, encrypted or duplicate archive member")
            names.add(member.filename)
            total += member.file_size
            if member.file_size > MAX_TABLE or total > MAX_EXPANDED:
                raise ValueError("N-MFP ZIP exceeds expanded size budget")
        self.total_expanded = total
        self.available_tables = sorted(name[5:-4] for name in names if name.startswith("NMFP_") and name.endswith(".tsv"))

    def rows(self, table, optional=False):
        name = "NMFP_" + table + ".tsv"
        if name not in self.zip.namelist():
            if optional:
                self.counts[table] = 0
                return []
            raise ValueError("N-MFP source omitted table " + table)
        # Inspect CRC on close/read through ZipExtFile. No archive extraction.
        result = []
        raw = self.zip.read(name)
        self.hashes[table] = sha(raw)
        reader = csv_reader(raw)
        fields = reader.fieldnames
        if not fields or len(fields) != len(set(fields)) or not CORE.get(table, set()).issubset(fields):
            raise ValueError("N-MFP table schema changed: " + table)
        self.headers[table] = fields
        for row in reader:
            if None in row or any(value is None for value in row.values()):
                raise ValueError("Malformed N-MFP TSV row in " + table)
            if len(result) >= MAX_ROWS:
                raise ValueError("N-MFP table exceeds bounded row count")
            result.append({key: value.strip() for key, value in row.items()})
        self.counts[table] = len(result)
        return result


def csv_reader(raw):
    import csv
    csv.field_size_limit(2_000_000)
    return csv.DictReader(io.StringIO(raw.decode("utf-8-sig"), newline=""), delimiter="\t")


def grouped(rows, parents, keys, table):
    result, seen = defaultdict(list), set()
    for row in rows:
        acc = accession(row["ACCESSION_NUMBER"])
        key = tuple(row.get(field) for field in keys)
        if acc not in parents or key in seen:
            raise ValueError("Orphan/duplicate exact row in " + table)
        seen.add(key)
        result[acc].append(row)
    return result


def normalize_position(row, modern=True):
    if not re.fullmatch(r"\d+", row["SECURITY_ID"]):
        raise ValueError("Invalid source SECURITY_ID")
    flags = []
    if any(row.get(field) == "N/A" for field in ["CUSIP_NUMBER", "ISIN", "LEI"]):
        flags.append("Source contains N/A identifier text; exact source fields retained, no security mapping inferred")
    principal = decimal_text(row.get("INVESTMENTOWNEDBALANCEPRINCI_L"))
    if principal is None:
        flags.append("This N-MFP extract does not supply a position share/principal amount; valuation is not quantity")
    if not modern:
        flags.append("Legacy percentage convention requires separate source verification; raw value retained")
    values = {"holdingId": row["SECURITY_ID"], "issuer": row["NAMEOFISSUER"], "title": row["TITLEOFISSUER"],
        "cusip": row["CUSIP_NUMBER"] if row["CUSIP_NUMBER"] and row["CUSIP_NUMBER"] != "N/A" else None,
        "balance": principal, "unit": "PA" if principal is not None else None, "instrumentCurrency": None,
        "value": decimal_text(row["INCLUDINGVALUEOFANYSPONSORSUPP"], required=True),
        "reportedPercent": decimal_text(row["PERCENTAGEOFMONEYMARKETFUNDNET"], 100, True) if modern else None,
        "identifiers": [[row.get("ISIN") if row.get("ISIN") != "N/A" else None, None, row.get("OTHERUNIQUEID") or None, None]],
        "flags": flags, "assetCategory": row.get("INVESTMENTCATEGORY") or None, "profile": None, "country": None,
        "otherUnit": None, "otherAsset": row.get("BRIEFDESCRIPTION") or None, "exchangeRate": None, "restricted": None,
        "fairValueLevel": "3" if row.get("SECURITYCATEGORIZEDATLEVEL3FLA") == "Y" else None,
        "derivativeCategory": None, "sourceFields": row}
    decimal_text(row["EXCLUDINGVALUEOFANYSPONSORSUPP"], required=True)
    for field in ["INVESTMENTMATURITYDATEWAM", "INVESTMENTMATURITYDATEWAL", "FINALLEGALINVESTMENTMATURITYDA"]:
        if row.get(field):
            source_date(row[field])
    return [values[field] for field in POSITION_FIELDS]


def observations(rows, value_field, date_field, parent_classes=None, multiplier=1):
    result = defaultdict(list)
    seen = set()
    for row in rows:
        acc = accession(row["ACCESSION_NUMBER"])
        cid = row.get("CLASSESID")
        if parent_classes is not None and (acc, cid) not in parent_classes:
            raise ValueError("NAV/yield references unavailable exact share class")
        observed = source_date(row[date_field])
        key = acc, cid, observed
        if key in seen:
            raise ValueError("Duplicate dated NAV/yield observation")
        seen.add(key)
        result[(acc, cid)].append({"asOf": observed, "value": decimal_text(row[value_field], multiplier),
            "sourceField": value_field, "sourceValue": row[value_field], "sourceDateField": date_field,
            "sourceDate": row[date_field], "sourceAccession": acc})
    return {key: sorted(values, key=lambda x: x["asOf"]) for key, values in result.items()}


def parse_archive(path, evidence, batch):
    archive = Archive(path)
    submissions = archive.rows("SUBMISSION")
    if not submissions:
        raise ValueError("Empty N-MFP submission table is not a successful zero-fund universe")
    parents = {}
    for row in submissions:
        acc = accession(row["ACCESSION_NUMBER"])
        if acc in parents:
            raise ValueError("Duplicate filing accession")
        if not re.fullmatch(r"(?:NT )?N-MFP[123]?(?:/A)?", row["SUBMISSIONTYPE"]):
            raise ValueError("Unknown N-MFP submission type")
        identity(row["FILER_CIK"], row["SERIESID"])
        source_date(row["REPORTDATE"])
        if source_date(row["REPORTDATE"]) > source_date(row["FILING_DATE"]):
            raise ValueError("Filing date precedes its financial report date")
        parents[acc] = row
    series = grouped(archive.rows("SERIESLEVELINFO"), parents, ["ACCESSION_NUMBER"], "SERIESLEVELINFO")
    classes = grouped(archive.rows("CLASSLEVELINFO"), parents, ["ACCESSION_NUMBER", "CLASSESID"], "CLASSLEVELINFO")
    holdings = grouped(archive.rows("SCHPORTFOLIOSECURITIES"), parents, ["ACCESSION_NUMBER", "SECURITY_ID"], "SCHPORTFOLIOSECURITIES")
    advisers = grouped(archive.rows("ADVISER", True), parents, ["ACCESSION_NUMBER", "ADVISERFILENUMBER", "ADVISER_TYPE"], "ADVISER")
    masters = grouped(archive.rows("MASTERFEEDERFUND", True), parents, ["ACCESSION_NUMBER", "SERIESID", "FUND_TYPE"], "MASTERFEEDERFUND")
    mergers = grouped(archive.rows("FUND", True), parents, ["ACCESSION_NUMBER", "FILENUMBER", "SERIESID", "FUND_TYPE"], "FUND")
    class_keys = set()
    for acc, rows in classes.items():
        for row in rows:
            identity(parents[acc]["FILER_CIK"], parents[acc]["SERIESID"], row["CLASSESID"])
            class_keys.add((acc, row["CLASSESID"]))
    nav = observations(archive.rows("DLYNETASSETVALUEPERSHARC", True), "DLYNETASSETVALUEPERSHARECLASS", "DLYNETASSETVALUEPERSHAREDATEC", class_keys)
    yields = observations(archive.rows("SEVENDAYNETYIELD", True), "SEVENDAYNETYIELDVALUE", "SEVENDAYNETYIELDDATE", class_keys, 100)
    series_nav = observations(archive.rows("DLYNETASSETVALUEPERSHARS", True), "DLYNETASSETVALUEPERSHARESER", "DLYNETASSETVALPERSHAREDATES")
    series_yield = observations(archive.rows("SEVENDAYGROSSYIELD", True), "SEVENDAYGROSSYIELDVALUE", "SEVENDAYGROSSYIELDDATE", multiplier=100)
    for observations_ in [nav, yields, series_nav, series_yield]:
        for (acc, _), values in observations_.items():
            if acc not in parents or any(value["asOf"] > source_date(parents[acc]["REPORTDATE"]) for value in values):
                raise ValueError("Dated observation has missing filing or exceeds its report date")
    funds, reports, notices = {}, [], []
    issues = []
    for acc, submission in sorted(parents.items()):
        cik, sid = submission["FILER_CIK"].zfill(10), submission["SERIESID"]
        fund_id = "nport-" + cik + "-" + sid.lower()
        url = filing_url(cik, acc)
        report_date, filing_date = source_date(submission["REPORTDATE"]), source_date(submission["FILING_DATE"])
        form = submission["SUBMISSIONTYPE"]
        if form.startswith("NT "):
            notices.append({"fundId": fund_id, "accession": acc, "reportingDate": report_date, "filingDate": filing_date,
                "form": form, "sourceURL": url, "status": "notice", "sourceFields": submission})
            continue
        if len(series[acc]) != 1:
            raise ValueError("Full N-MFP filing lacks exact series-level row")
        info = series[acc][0]
        facts = []
        flags = ["Dated N-MFP disclosed holdings; not live positions or trade activity",
            "Values include sponsor support; separate excluding-support valuation is preserved in sourceFields",
            "Percentages/yields are source decimal fractions multiplied by 100 using the official N-MFP3 stylesheet; never renormalized",
            "USD denomination is supported by rule 2a-7(d)(2)(i) and official dollar-format N-MFP3 display; the extract has no per-instrument currency column",
            "Repo collateral, guarantees and ratings remain separate source tables; collateral is not added as duplicate portfolio positions"]
        declared = int(submission["TOTALSHARECLASSESINSERIES"])
        if declared != len(classes[acc]):
            issue = {"accession": acc, "type": "share_class_count_mismatch", "declared": declared, "provided": len(classes[acc])}
            issues.append(issue)
            flags.append(f"Source declares {declared} classes but supplies {len(classes[acc])} class rows; class coverage requires review")
        for row in classes[acc]:
            cid = row["CLASSESID"]
            for field in MONEY_FIELDS["class"]:
                decimal_text(row.get(field))
            facts.append({"id": cid, "classId": cid, "name": row.get("CLASSFULLNAME") or row["CLASS_NAME"], "currency": "USD",
                "asOf": report_date, "filingDate": filing_date, "retrievedAt": evidence["retrievedAt"], "sourceURL": url,
                "sourceAccession": acc, "netAssets": decimal_text(row["NETASSETSOFCLASS"]),
                "navObservations": nav.get((acc, cid), []), "sevenDayNetYieldObservations": yields.get((acc, cid), []),
                "navUnit": "USD per share", "yieldUnit": "percent annualized seven-day net yield; not total return",
                "managementFee": None, "mer": None, "feeStatus": "pending_separate_prospectus_source",
                "totalReturn": None, "returnStatus": "not_supplied_by_nmfp; yield is not total return", "sourceFields": row})
        for field in MONEY_FIELDS["series"]:
            decimal_text(info.get(field))
        modern = form.startswith("N-MFP3")
        if not modern:
            flags.append("Legacy source percentage convention is not verified by this N-MFP3 adapter; normalized weights remain missing")
        positions = [normalize_position(row, modern) for row in holdings[acc]]
        included = sum((Decimal(row[7]) for row in positions), Decimal(0))
        portfolio = decimal_text(info.get("TOTALVALUEPORTFOLIOSECURITIES"))
        difference = included - Decimal(portfolio) if portfolio is not None else None
        if difference and abs(difference) > Decimal("0.01"):
            issues.append({"accession": acc, "type": "portfolio_value_reconciliation", "differenceUSD": format(difference, "f")})
            flags.append(f"As-filed holding value sum differs from stated portfolio securities by USD {difference}; source values retained")
        report = {"schemaVersion": 1, "sourceType": "SEC_NMFP", "fundId": fund_id, "id": acc,
            "accession": acc, "cik": cik, "seriesId": sid, "name": submission.get("NAMEOFSERIES") or submission["SERIES_NAME"],
            "registrant": submission.get("REGISTRANTFULLNAME") or submission.get("REGISTRANT"),
            "reportingDate": report_date, "filingDate": filing_date, "form": form, "sourceURL": url,
            "bulkSource": evidence["url"], "retrievedAt": evidence["retrievedAt"], "currency": "USD", "valueUnit": "USD, no thousands multiplier",
            "weightBasis": "AS_FILED_PERCENT_OF_NET_ASSETS" if modern else "UNVERIFIED_LEGACY_SOURCE_RATIO",
            "netAssets": decimal_text(info["NETASSETOFSERIES"], required=True), "totalAssets": None,
            "liabilities": decimal_text(info["TOTALVALUELIABILITIES"]), "cash": decimal_text(info["CASH"]),
            "miscellaneousAssets": decimal_text(info["TOTALVALUEOTHERASSETS"]), "portfolioSecuritiesValue": portfolio,
            "holdingValueSum": format(included, "f"), "holdingValueDifference": format(difference, "f") if difference is not None else None,
            "holdingDepth": "full_disclosed_portfolio", "classification": info["MONEYMARKETFUNDCATEGORY"],
            "positionFields": POSITION_FIELDS, "positions": positions, "flags": flags,
            "classFacts": facts, "seriesFacts": info, "submissionFacts": {key: value for key, value in submission.items() if key not in {"SIGNATURE", "NAMEOFSIGNINGOFFICER", "TITLEOFSIGNINGOFFICER"}},
            "seriesNAVObservations": series_nav.get((acc, None), []), "seriesGrossYieldObservations": series_yield.get((acc, None), []),
            "advisers": advisers[acc], "masterFeederRelationships": masters[acc], "fundMergers": mergers[acc],
            "amendment": form.endswith("/A"), "amendmentTreatment": "Full replacement for exact CIK/series/report date; never concatenate holdings",
            "sourceEvidence": evidence, "unitEvidence": {"form": FORM, "readme": README, "stylesheetArchive": SPEC, "dollarDenominationRule": RULE}}
        reports.append(report)
        fund = funds.setdefault(fund_id, {"id": fund_id, "cik": cik, "seriesId": sid, "sourceType": "SEC_NMFP",
            "currency": "USD", "registrationJurisdiction": "US", "domicile": None, "reports": [], "classes": [], "catalogOnly": False})
        fund["reports"].append([report_date, filing_date, acc, form, len(positions)])
    by_period = defaultdict(list)
    for report in reports:
        by_period[(report["fundId"], report["reportingDate"])].append(report)
    for versions in by_period.values():
        ordered = sorted(versions, key=lambda r: (r["filingDate"], r["amendment"]), reverse=True)
        tied = len(ordered) > 1 and (ordered[0]["filingDate"], ordered[0]["amendment"]) == (ordered[1]["filingDate"], ordered[1]["amendment"])
        for report in versions:
            report["versionSelectionStatus"] = "review_required" if tied else "latest_complete_filing" if report is ordered[0] else "superseded"
            report["isLatestForPeriod"] = not tied and report is ordered[0]
            report["periodFilingLineage"] = [r["accession"] for r in ordered]
    report_map = {r["id"]: r for r in reports}
    for fund in funds.values():
        fund["reports"].sort(key=lambda row: (row[0], row[1], report_map[row[2]]["isLatestForPeriod"], row[2]), reverse=True)
        current = report_map[fund["reports"][0][2]]
        class_facts_by_accession = {row[2]: report_map[row[2]]["classFacts"] for row in fund["reports"]}
        class_identities = [{key: fact[key] for key in ["id", "classId", "name", "currency", "asOf", "filingDate", "retrievedAt", "sourceURL", "sourceAccession"]} for fact in current["classFacts"]]
        fund.update({"name": current["name"], "registrant": current["registrant"], "sourceURL": current["sourceURL"],
            "sourceAsOf": current["reportingDate"], "asOf": current["reportingDate"], "retrievedAt": evidence["retrievedAt"],
            "classes": class_identities, "moneyMarketFacts": {"reportingDate": current["reportingDate"], "filingDate": current["filingDate"],
                "sourceAccession": current["id"], "sourceURL": current["sourceURL"], "currency": "USD",
                "category": current["classification"], "netAssets": current["netAssets"], "declaredClasses": current["submissionFacts"]["TOTALSHARECLASSESINSERIES"],
                "providedClasses": len(current["classFacts"]), "classFactsByAccession": class_facts_by_accession,
                "versionSelectionStatus": current["versionSelectionStatus"]}})
    manifest = {"universe_as_of": batch["filingWindowEnd"], "source_url": evidence["url"], "source_scope": batch,
        "source_submission_rows": len(submissions), "discovered": len(funds), "validated": len(funds), "imported": len(funds),
        "unique_registrants": len({r["cik"] for r in reports}), "unique_funds": len(funds),
        "unique_share_classes": len({(r["cik"], r["seriesId"], c["classId"]) for r in reports for c in r["classFacts"]}),
        "snapshot_versions": len(reports), "unique_fund_report_periods": len(by_period), "notices": len(notices),
        "amendments": sum(r["amendment"] for r in reports), "source_holdings_rows": archive.counts["SCHPORTFOLIOSECURITIES"],
        "source_class_rows": archive.counts["CLASSLEVELINFO"], "class_count_discrepancies": sum(i["type"] == "share_class_count_mismatch" for i in issues),
        "value_reconciliation_warnings": sum(i["type"] == "portfolio_value_reconciliation" for i in issues),
        "forms": dict(Counter(r["SUBMISSIONTYPE"] for r in submissions)), "report_dates": dict(Counter(r["reportingDate"] for r in reports)),
        "table_rows_imported": archive.counts, "table_hashes_imported": archive.hashes, "table_columns": archive.headers,
        "full_holdings_snapshots": len(reports), "fees_imported": 0, "total_returns_imported": 0,
        "provider_product_denominator": None, "global_product_denominator": None, "source_batch_complete_for_selected_tables": True,
        "available_tables": archive.available_tables, "unimported_ancillary_tables": sorted(set(archive.available_tables) - set(archive.counts)),
        "scope_complete_for_all_us_money_market_funds": False, "parse_failed": 0,
        "limitations": "Complete tables from one filing-window archive; missing/late filings and complete historical universe not established. N-MFP yields are not total returns; fees require prospectuses. Source class-count and valuation discrepancies remain visible."}
    if sum(len(r["positions"]) for r in reports) != archive.counts["SCHPORTFOLIOSECURITIES"]:
        raise ValueError("Imported holdings do not reconcile with complete source table")
    if sum(len(r["classFacts"]) for r in reports) != archive.counts["CLASSLEVELINFO"]:
        raise ValueError("Imported class rows do not reconcile with complete source table")
    return {"schemaVersion": 1, "sourceType": "SEC_NMFP", "retrievedAt": evidence["retrievedAt"], "builtAt": now(),
        "funds": sorted(funds.values(), key=lambda x: x["id"]), "reports": reports, "notices": notices,
        "manifest": manifest, "sourceEvidence": evidence, "issues": issues}


def stage_extension(catalog, output):
    output = Path(output)
    buckets = defaultdict(list)
    funds = {fund["id"]: dict(fund) for fund in catalog["funds"]}
    for report in catalog["reports"]:
        pack = "e" + sha(report["fundId"].encode())[:2]
        funds[report["fundId"]]["pack"] = pack
        buckets[pack].append(report)
    packs = {}
    for key, reports in sorted(buckets.items()):
        packed = gzip.compress(encoded({"schemaVersion": 1, "reports": reports}), compresslevel=9, mtime=0)
        relative = "packs/" + key + ".json.bin"
        atomic(output.parent / relative, packed)
        packs[key] = {"path": "/institutional/funds/" + relative, "sha256": sha(packed), "bytes": len(packed), "reports": len(reports)}
    extension = {"schemaVersion": 1, "sourceType": "SEC_NMFP", "funds": list(funds.values()), "packs": packs,
        "manifest": catalog["manifest"], "issues": catalog["issues"], "sources": [{"url": SOURCE_PAGE, "type": "SEC_NMFP", **catalog["sourceEvidence"]}]}
    atomic(output, encoded(extension))
    return extension


def adapter_page(catalog, extension):
    records = []
    report_by_id = {r["id"]: r for r in catalog["reports"]}
    pack_by_fund = {fund["id"]: fund["pack"] for fund in extension["funds"]}
    for fund in catalog["funds"]:
        source_id = identity(fund["cik"], fund["seriesId"])
        base = {"jurisdiction": "US", "source_url": fund["sourceURL"], "as_of": fund["asOf"], "retrieved_at": fund["retrievedAt"]}
        records.append({"kind": "fund", "source_id": source_id, **base, "data": fund})
        for row in fund["moneyMarketFacts"]["classFactsByAccession"][fund["reports"][0][2]]:
            records.append({"kind": "series", "source_id": identity(fund["cik"], fund["seriesId"], row["classId"]),
                **base, "data": {**row, "fund_id": source_id}})
        for index in fund["reports"]:
            report = report_by_id[index[2]]
            base = {"jurisdiction": "US", "source_url": report["sourceURL"], "as_of": report["reportingDate"], "retrieved_at": report["retrievedAt"]}
            records.append({"kind": "document", "source_id": report["id"], **base,
                "data": {"fund_id": source_id, "form": report["form"], "filing_date": report["filingDate"], "amendment": report["amendment"]}})
            pack_id = pack_by_fund[fund["id"]]
            meta = extension["packs"][pack_id]
            records.append({"kind": "snapshot", "source_id": report["id"], **base,
                "data": {**{key: value for key, value in report.items() if key != "positions"},
                    "fund_id": source_id, "classification_depth": report["holdingDepth"],
                    "processing_status": "validated", "reporting_date": report["reportingDate"],
                    "holding_count": len(report["positions"]), "holdings_artifact": {**meta, "report_id": report["id"],
                        "publication_status": "staged_not_published"}}})
    return {"records": records, "next_cursor": None, "evidence": {"url": catalog["sourceEvidence"]["url"],
        "retrieved_at": catalog["retrievedAt"], "sha256": catalog["sourceEvidence"]["sha256"], "scope": catalog["manifest"]}}


def download_latest(directory):
    """Reuse the project's identified, robots-aware, TLS-verified SEC transport.

    The current source page is checked each invocation. Complete dated ZIPs are
    resumable only when their stored URL/hash match; no denied-path fallback.
    """
    directory = Path(directory)
    directory.mkdir(parents=True, exist_ok=True)
    transport_path = Path(__file__).resolve().parent.parent / "fund-publisher" / "refresh.py"
    if not transport_path.is_file():
        raise RuntimeError("The existing reviewed SEC transport is required for source downloads")
    spec = importlib.util.spec_from_file_location("tickerlantern_existing_sec_transport", transport_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    transport = module.Transport(raw_directory=directory / "objects")
    page = transport.get(SOURCE_PAGE)
    page_path = directory / "source-page.html"
    atomic(page_path, page)
    atomic(page_path.with_suffix(".html.meta.json"), encoded(module.source(page, SOURCE_PAGE, now())))
    batch = discover(page)
    archive = directory / Path(urlsplit(batch["url"]).path).name
    metadata = archive.with_suffix(archive.suffix + ".meta.json")
    if archive.exists() and metadata.exists():
        prior = json.loads(metadata.read_text())
        if prior.get("url") != batch["url"] or prior.get("sha256") != sha(archive.read_bytes()):
            raise ValueError("Stored SEC ZIP identity/hash mismatch; source cache requires review")
    else:
        raw = transport.get(batch["url"])
        # Validate ZIP structure before saving a resumable complete object.
        with zipfile.ZipFile(io.BytesIO(raw)) as source:
            if not source.namelist():
                raise ValueError("Source returned an empty ZIP")
        atomic(archive, raw)
        atomic(metadata, encoded(module.source(raw, batch["url"], now())))
    return archive, page_path, metadata


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--archive", type=Path)
    parser.add_argument("--source-page", type=Path)
    parser.add_argument("--source-meta", type=Path)
    parser.add_argument("--download-latest", action="store_true")
    parser.add_argument("--raw-directory", type=Path, default=Path("qa/sec-nmfp/" + now()[:10] + "/raw"))
    parser.add_argument("--output", type=Path, default=Path("qa/sec-nmfp/catalog.json"))
    parser.add_argument("--extension", type=Path)
    parser.add_argument("--adapter-output", type=Path)
    args = parser.parse_args()
    if args.download_latest:
        if any([args.archive, args.source_page, args.source_meta]):
            parser.error("Use --download-latest or the three explicit locked source paths")
        args.archive, args.source_page, args.source_meta = download_latest(args.raw_directory)
    elif not all([args.archive, args.source_page, args.source_meta]):
        parser.error("Provide --archive, --source-page and --source-meta, or --download-latest")
    if args.adapter_output and not args.extension:
        parser.error("--adapter-output requires --extension for bounded hash-bound holdings artifacts")
    batch = discover(args.source_page.read_bytes())
    evidence = json.loads(args.source_meta.read_text())
    raw_hash = sha(args.archive.read_bytes())
    if evidence.get("url") != batch["url"] or evidence.get("sha256") != raw_hash:
        raise ValueError("Archive identity/hash does not match locked discovered source")
    catalog = parse_archive(args.archive, evidence, batch)
    atomic(args.output, encoded(catalog))
    extension = stage_extension(catalog, args.extension) if args.extension else None
    if args.adapter_output:
        atomic(args.adapter_output, encoded(adapter_page(catalog, extension)))
    print(json.dumps({"output": str(args.output), "manifest": catalog["manifest"], "packs": len(extension["packs"]) if extension else None}, ensure_ascii=False))


if __name__ == "__main__":
    main()
