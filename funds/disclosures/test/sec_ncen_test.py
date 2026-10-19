"""N-CEN source-bound identity, version, classification and failure fixtures."""
import copy
import csv
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import zipfile

SPEC = importlib.util.spec_from_file_location("sec_ncen", Path(__file__).resolve().parents[1] / "scripts/fund-adapters/sec_ncen.py")
m = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(m)
ACC, CIK, SID, CID = "0000123456-26-000001", "0000123456", "S000000001", "C000000001"
SOURCE_ID = ACC + "_" + CIK + "_" + SID
URL = "https://www.sec.gov/files/dera/data/form-n-cen-data-sets/2026q3_ncen.zip"
BATCH = {"url": URL, "filingWindowStart": "2026-07-01", "filingWindowEnd": "2026-09-30", "schema31Omitted": True}


def tables():
    result = {table: [] for table in m.CORE}
    result.update({"SUBMISSION": [{"ACCESSION_NUMBER": ACC, "CIK": CIK, "FILING_DATE": "15-JUL-2026", "REPORT_ENDING_PERIOD": "30-JUN-2026", "SUBMISSION_TYPE": "N-CEN", "IS_REPORT_PERIOD_LT_12MONTH": "N"}],
        "REGISTRANT": [{"ACCESSION_NUMBER": ACC, "CIK": CIK, "REGISTRANT_NAME": "Fixture Trust", "FILE_NUM": "811-12345", "INVESTMENT_COMPANY_TYPE": "N-1A", "IS_FIRST_FILING": "N", "IS_LAST_FILING": "N", "LEI": "", "TOTAL_SERIES": "1"}],
        "FUND_REPORTED_INFO": [{"ACCESSION_NUMBER": ACC, "FUND_ID": SOURCE_ID, "FUND_NAME": "Fixture Fund", "SERIES_ID": SID, "LEI": "", **{field: "" for field in m.TYPES}, "IS_ETF": "Y", "IS_FUND_OF_FUND": "Y"}],
        "SHARES_OUTSTANDING": [{"FUND_ID": SOURCE_ID, "CLASS_ID": CID, "CLASS_NAME": "Institutional", "TICKER": "ABCDE"}],
        "ADVISER": [{"FUND_ID": SOURCE_ID, "SOURCE": "Part C", "ADVISER_TYPE": "Advisor", "ADVISER_NAME": "Fixture Adviser LLC", "FILE_NUM": "801-100", "CRD_NUM": "000000123", "ADVISER_LEI": "", "IS_ADVISOR_HIRED": "Y", "ADVISOR_START_DATE": "01-JAN-2026", "ADVISOR_TERMINATED_DATE": ""}],
        "ETF": [{"FUND_ID": SOURCE_ID, "FUND_NAME": "Fixture Fund", "SERIES_ID": SID, "IS_FUND_IN_KIND_ETF": "N"}],
        "SECURITY_EXCHANGE": [{"FUND_ID": SOURCE_ID, "FUND_EXCHANGE": "XNYS", "FUND_TICKER_SYMBOL": "ABCDE"}]})
    return result


def archive(directory, source_tables, extra=None):
    path = Path(directory) / "fixture.zip"
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        for table, rows in source_tables.items():
            fields = sorted(m.CORE[table] | {key for row in rows for key in row})
            stream = io.StringIO(newline="")
            writer = csv.DictWriter(stream, fieldnames=fields, delimiter="\t", lineterminator="\n")
            writer.writeheader()
            for row in rows:
                writer.writerow({field: row.get(field, "") for field in fields})
            z.writestr(table + ".tsv", stream.getvalue())
        for name, value in (extra or {}).items():
            z.writestr(name, value)
    raw = path.read_bytes()
    evidence = {"url": URL, "retrievedAt": "2026-10-19T13:00:00Z", "sha256": m.sha(raw), "bytes": len(raw)}
    return path, evidence


def parsed(source_tables=None):
    with tempfile.TemporaryDirectory() as directory:
        path, evidence = archive(directory, source_tables or tables())
        return m.parse_archive(path, evidence, BATCH)


def amend(source_tables, filed="16-JUL-2026"):
    newer, new_id = "0000123456-26-000002", "0000123456-26-000002_" + CIK + "_" + SID
    for table in ["SUBMISSION", "REGISTRANT", "FUND_REPORTED_INFO", "ETF"]:
        row = copy.deepcopy(source_tables[table][0])
        if "ACCESSION_NUMBER" in row:
            row["ACCESSION_NUMBER"] = newer
        if "FUND_ID" in row:
            row["FUND_ID"] = new_id
        if table == "SUBMISSION":
            row.update(SUBMISSION_TYPE="N-CEN/A", FILING_DATE=filed)
        source_tables[table].append(row)
    return new_id


class CensusAdapterTest(unittest.TestCase):
    def test_discovery_keeps_updated_suffixes_and_schema_omission(self):
        body = b'''<p>The data sets do not include, at this time, N-CEN filings submitted in the schema version 3.1 introduced in EDGAR version 25.2.</p><a href="/files/dera/data/form-n-cen-data-sets/2025q2_ncen_0.zip">2025 Q2 NCEN</a><a href="/files/dera/data/form-n-cen-data-sets/2026q3_ncen.zip">2026 Q3 NCEN</a>'''
        result = m.discover(body, m.date(2026, 10, 19))
        self.assertEqual(result["availableArchiveCount"], 2)
        self.assertEqual(result["historicalArchivesPending"], 1)
        self.assertTrue(result["schema31Omitted"])
        self.assertIn("25.2.", result["sourceCoverageNote"])
        self.assertIsNone(result["financialReportingDate"])

    def test_discovery_rejects_external_host_and_future_quarter(self):
        for url in ["https://other.example/2026q3_ncen.zip", "https://www.sec.gov/2027q1_ncen.zip"]:
            with self.assertRaises(ValueError):
                m.discover(('<a href="' + url + '">Archive</a>').encode(), m.date(2026, 10, 19))

    def test_exact_identity_and_dated_types_not_financial_values(self):
        value = parsed()
        fund = value["funds"][0]
        self.assertEqual(fund["id"], "nport-" + CIK + "-" + SID.lower())
        obs = fund["censusFacts"]["observations"][0]
        flags = {item["sourceField"]: item["value"] for item in obs["productTypes"]}
        self.assertIs(flags["IS_ETF"], True)
        self.assertIs(flags["IS_FUND_OF_FUND"], True)
        self.assertIsNone(flags["IS_MONEY_MARKET"])
        self.assertEqual(obs["reportingDate"], "2026-06-30")
        self.assertEqual(obs["filingDate"], "2026-07-15")
        self.assertEqual(obs["registration"]["form"], "N-1A")
        self.assertIsNone(obs["registration"]["domicile"])
        self.assertEqual(fund["currency"], "")
        self.assertEqual(fund["reports"], [])
        self.assertNotIn("nav", obs)
        self.assertEqual(value["manifest"]["financial_values_normalized"], 0)

    def test_exact_class_identity_has_no_inferred_currency_or_listing(self):
        item = parsed()["funds"][0]["censusFacts"]["observations"][0]["classes"][0]
        self.assertEqual(item["id"], CID)
        self.assertIsNone(item["currency"])
        self.assertFalse(item["listingVerified"])

    def test_missing_series_is_reachable_filing_record_not_name_join(self):
        data = tables()
        replacement = ACC + "_" + CIK
        data["FUND_REPORTED_INFO"][0].update(FUND_ID=replacement, SERIES_ID="", FUND_NAME="")
        data["REGISTRANT"][0]["INVESTMENT_COMPANY_TYPE"] = "N-2"
        for table in ["SHARES_OUTSTANDING", "ADVISER", "SECURITY_EXCHANGE"]:
            for row in data[table]:
                row["FUND_ID"] = replacement
        data["ETF"] = []
        value = parsed(data)
        fund = value["funds"][0]
        self.assertEqual(fund["id"], "ncen-" + CIK + "-" + ACC.replace("-", ""))
        self.assertFalse(fund["crossSourceJoinAllowed"])
        self.assertIsNone(fund["seriesId"])
        self.assertIsNone(fund["canonicalFundId"])
        self.assertEqual(value["manifest"]["unique_exact_series_funds"], 0)
        self.assertEqual(value["manifest"]["filing_scoped_records"], 1)
        self.assertEqual(len(value["unjoinable"]), 1)
        self.assertTrue(fund["name"].startswith("Census filing"))

    def test_source_placeholder_classes_remain_unresolved_and_separate(self):
        data = tables()
        data["SHARES_OUTSTANDING"] = [{"FUND_ID": SOURCE_ID, "CLASS_ID": "C000000000", "CLASS_NAME": name, "TICKER": ticker} for name, ticker in [("A", "AAAAA"), ("Y", "YYYYY")]]
        value = parsed(data)
        classes = value["funds"][0]["censusFacts"]["observations"][0]["classes"]
        self.assertEqual(len(classes), 2)
        self.assertTrue(all(item["id"] is None and item["sourceClassId"] == "C000000000" for item in classes))
        self.assertEqual(value["funds"][0]["classes"], [])

    def test_adviser_legal_ids_dates_and_terminated_role_stay_dated(self):
        data = tables()
        data["ADVISER"][0].update(ADVISER_TYPE="Terminated Subadvisor", ADVISOR_TERMINATED_DATE="01-MAY-2026")
        item = parsed(data)["funds"][0]["censusFacts"]["observations"][0]["advisers"][0]
        self.assertEqual(item["relationshipStatus"], "terminated_as_filed")
        self.assertEqual(item["crdNumber"], "000000123")
        self.assertEqual(item["startDate"], "2026-01-01")
        self.assertEqual(item["terminationDate"], "2026-05-01")

    def test_adviser_date_source_discrepancy_is_warned_not_corrected(self):
        data = tables()
        data["ADVISER"][0]["ADVISOR_START_DATE"] = "01-JUL-2026"
        value = parsed(data)
        self.assertEqual(value["issues"][0]["type"], "adviser_date_review")
        self.assertEqual(value["funds"][0]["censusFacts"]["observations"][0]["advisers"][0]["startDate"], "2026-07-01")

    def test_amendments_preserve_history_without_carrying_old_adviser(self):
        data = tables()
        new_id = amend(data)
        facts = parsed(data)["funds"][0]["censusFacts"]
        self.assertEqual(len(facts["observations"]), 2)
        self.assertEqual(facts["latestObservationId"], new_id)
        latest = facts["observations"][0]
        self.assertTrue(latest["amendment"])
        self.assertEqual(latest["advisers"], [])
        self.assertEqual(latest["classes"], [])
        self.assertEqual(facts["observations"][1]["versionSelectionStatus"], "superseded")

    def test_same_day_versions_require_explicit_review_not_accession_order(self):
        data = tables()
        amend(data, "15-JUL-2026")
        facts = parsed(data)["funds"][0]["censusFacts"]
        self.assertIsNone(facts["latestObservationId"])
        self.assertEqual(facts["selectionStatus"], "review_required")
        self.assertTrue(all(item["versionSelectionStatus"] == "review_required" for item in facts["observations"]))

    def test_invalid_checkbox_fails(self):
        data = tables()
        data["FUND_REPORTED_INFO"][0]["IS_ETF"] = "yes"
        with self.assertRaisesRegex(ValueError, "checkbox"):
            parsed(data)

    def test_conflicting_fund_id_or_registrant_is_rejected(self):
        for field in ["FUND_ID", "CIK"]:
            data = tables()
            if field == "FUND_ID":
                data["FUND_REPORTED_INFO"][0][field] += "1"
            else:
                data["REGISTRANT"][0][field] = "0000999999"
            with self.assertRaises(ValueError):
                parsed(data)

    def test_orphan_and_duplicate_adviser_rows_are_rejected(self):
        for mode in ["orphan", "duplicate"]:
            data = tables()
            if mode == "orphan":
                data["ADVISER"][0]["FUND_ID"] = "missing"
            else:
                data["ADVISER"].append(copy.deepcopy(data["ADVISER"][0]))
            with self.assertRaisesRegex(ValueError, "Orphan/duplicate"):
                parsed(data)

    def test_duplicate_exact_class_id_does_not_merge_distinct_rows(self):
        data = tables()
        data["SHARES_OUTSTANDING"].append({**data["SHARES_OUTSTANDING"][0], "CLASS_NAME": "Different"})
        with self.assertRaisesRegex(ValueError, "Duplicate exact class"):
            parsed(data)

    def test_dates_must_be_real_and_within_filing_window(self):
        for field, value in [("FILING_DATE", "30-JUN-2026"), ("REPORT_ENDING_PERIOD", "31-FEB-2026"), ("REPORT_ENDING_PERIOD", "31-AUG-2026")]:
            data = tables()
            data["SUBMISSION"][0][field] = value
            with self.assertRaises(ValueError):
                parsed(data)

    def test_hash_or_source_url_mismatch_never_publishes(self):
        with tempfile.TemporaryDirectory() as directory:
            path, evidence = archive(directory, tables())
            for field, value in [("sha256", "0" * 64), ("url", "https://www.sec.gov/wrong.zip"), ("bytes", 0)]:
                with self.assertRaisesRegex(ValueError, "locked source"):
                    m.parse_archive(path, {**evidence, field: value}, BATCH)

    def test_missing_table_or_empty_source_is_failure(self):
        for mode in ["missing", "empty"]:
            data = tables()
            if mode == "missing":
                del data["ADVISER"]
            else:
                data["SUBMISSION"] = []
            with self.assertRaises(ValueError):
                parsed(data)

    def test_archive_traversal_and_expansion_budget_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            path, _ = archive(directory, tables(), {"../escape.tsv": "bad"})
            with self.assertRaisesRegex(ValueError, "Unsafe"):
                m.Archive(path)
            path, _ = archive(directory, tables())
            with patch.object(m, "MAX_EXPANDED", 20):
                with self.assertRaisesRegex(ValueError, "expanded"):
                    m.Archive(path)

    def test_staged_extension_counts_and_source_provenance(self):
        catalog = parsed()
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "extension.json"
            result = m.stage_extension(catalog, target)
            self.assertEqual(json.loads(target.read_text()), result)
            self.assertEqual(result["manifest"]["source_fund_rows"], 1)
            self.assertEqual(result["manifest"]["source_adviser_rows"], 1)
            self.assertFalse(result["sources"][0]["scopeComplete"])
            self.assertEqual(result["sources"][0]["url"], URL)
            self.assertIn("schema 3.1", result["sources"][0]["scope"])


if __name__ == "__main__":
    unittest.main()
