import csv
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("fund_reference_publisher", Path(__file__).with_name("refresh.py"))
publisher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(publisher)

CSV_URL = "https://www.sec.gov/files/investment/data/other/investment-company-series-class-information/investment-company-series-class-2026.csv"
PAGE = ('<a href="'+CSV_URL+'" download>2026</a>\n<em>Updated 6/1/26</em>').encode()
CHECKED = "2026-10-19T12:00:00+00:00"


def catalog(rows=3):
    output = io.StringIO(newline="")
    writer = csv.writer(output)
    writer.writerow(publisher.CLASS_FIELDS)
    for index in range(rows):
        writer.writerow(["811-12345", "0000000001", "Disclosed registrant", "30", "S000000001", "Disclosed portfolio", "C"+str(index+1).zfill(9), "Series "+str(index+1), "OLD" if not index else "", "", "", "", "", ""])
    writer.writerow([""]*len(publisher.CLASS_FIELDS))
    writer.writerow(["No filters applied"]+[""]*(len(publisher.CLASS_FIELDS)-1))
    return output.getvalue().encode()


def tickers(rows=None):
    return json.dumps({"fields": ["cik", "seriesId", "classId", "symbol"], "data": rows or [[1, "S000000001", "C000000001", "NEW"], [2, "S000000002", "C000000004", "OTHER"]]}).encode()


def fetcher(overrides=None):
    data = {publisher.CATALOG_PAGE: PAGE, CSV_URL: catalog(), publisher.TICKERS: tickers(), **(overrides or {})}
    def fetch(url):
        result = data[url]
        if isinstance(result, Exception):
            raise result
        return result
    return fetch


class FundReferencePublisher(unittest.TestCase):
    def test_complete_sources_keep_native_ids_dates_and_missing_financial_fields(self):
        result = publisher.refresh(fetch=fetcher(), checked_at=CHECKED)
        self.assertEqual(result["sync"]["status"], "ready")
        self.assertEqual(result["stats"]["classes"], 3)
        self.assertEqual(result["stats"]["series"], 1)
        self.assertEqual(result["stats"]["currentTickerClassesAbsentAnnual"], 1)
        self.assertEqual(result["stats"]["differingDatedTickerLabels"], 1)
        self.assertEqual(result["sources"]["catalog"]["recognizedFooterRows"], 2)
        self.assertEqual(result["sources"]["catalog"]["asOf"], "2026-06-01")
        self.assertIsNone(result["sources"]["tickers"]["asOf"])
        self.assertIsNone(result["domicile"])
        self.assertIsNone(result["reportingCurrency"])
        self.assertEqual(result["classes"][0][-1], "OLD")
        self.assertEqual(result["tickers"][0][-1], "NEW")
        self.assertNotIn("NAV", result)

    def test_one_source_failure_retains_exact_prior_component_and_dates(self):
        old = publisher.refresh(fetch=fetcher(), checked_at=CHECKED)
        result = publisher.refresh(old, fetcher({CSV_URL: RuntimeError("HTTP 503 source failure")}), "2026-10-20T12:00:00Z")
        self.assertEqual(result["classes"], old["classes"])
        self.assertEqual(result["sources"]["catalog"], old["sources"]["catalog"])
        self.assertEqual(result["sources"]["tickers"]["retrievedAt"], "2026-10-20T12:00:00Z")
        self.assertEqual(result["sync"]["status"], "partial")
        self.assertEqual(result["sync"]["checks"][0]["status"], "source_error")
        self.assertEqual(result["sync"]["lastSuccessAt"], CHECKED)

    def test_both_sources_failure_has_explicit_status_and_preserves_last_success(self):
        failures = {publisher.CATALOG_PAGE: RuntimeError("offline"), publisher.TICKERS: RuntimeError("offline")}
        empty = publisher.refresh(fetch=fetcher(failures), checked_at=CHECKED)
        self.assertEqual(empty["sync"]["status"], "unavailable")
        self.assertIsNone(empty["stats"]["classes"])
        self.assertIsNone(empty["stats"]["tickerReferences"])
        old = publisher.refresh(fetch=fetcher(), checked_at=CHECKED)
        retained = publisher.refresh(old, fetcher(failures), "2026-10-20T12:00:00Z")
        self.assertEqual(retained["classes"], old["classes"])
        self.assertEqual(retained["tickers"], old["tickers"])
        self.assertEqual(retained["sync"]["lastSuccessAt"], CHECKED)
        self.assertEqual(retained["sync"]["status"], "error")

    def test_schema_and_identity_failures_do_not_publish_empty_success(self):
        old = publisher.refresh(fetch=fetcher(), checked_at=CHECKED)
        for body in (b"wrong,columns\n1,2\n", catalog(0), catalog().replace(b"C000000002", b"C000000001")):
            result = publisher.refresh(old, fetcher({CSV_URL: body}), "2026-10-20T12:00:00Z")
            self.assertEqual(result["sync"]["checks"][0]["status"], "parse_failed")
            self.assertEqual(result["classes"], old["classes"])

    def test_publication_regression_and_truncated_source_are_retained(self):
        old = publisher.refresh(fetch=fetcher(), checked_at=CHECKED)
        for overrides in ({CSV_URL: catalog(1)}, {publisher.CATALOG_PAGE: PAGE.replace(b"6/1/26", b"5/1/26")}):
            result = publisher.refresh(old, fetcher(overrides), "2026-10-20T12:00:00Z")
            self.assertEqual(result["classes"], old["classes"])
            self.assertEqual(result["sync"]["checks"][0]["status"], "parse_failed")

    def test_dynamic_newest_annual_discovery_requires_dated_official_link(self):
        page = PAGE+PAGE.replace(b"2026.csv", b"2027.csv").replace(b"6/1/26", b"1/1/27")
        latest = publisher.discover_catalog(page, publisher.dt.date(2027, 2, 1))
        self.assertEqual(latest["year"], 2027)
        with self.assertRaisesRegex(ValueError, "future update"):
            publisher.discover_catalog(page, publisher.dt.date(2026, 10, 19))
        with self.assertRaisesRegex(ValueError, "No complete dated"):
            publisher.discover_catalog(b"No CSV links", publisher.dt.date(2026, 10, 19))

    def test_atomic_publication_keeps_prior_when_rename_is_interrupted(self):
        result = publisher.refresh(fetch=fetcher(), checked_at=CHECKED)
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder)/"fund-reference.json"
            publisher.publish(result, path)
            original = path.read_bytes()
            with patch.object(Path, "replace", side_effect=OSError("interrupted rename")):
                with self.assertRaises(OSError):
                    publisher.publish(result, path)
            self.assertEqual(path.read_bytes(), original)
            self.assertEqual(list(Path(folder).glob("*.tmp")), [])

    def test_ticker_duplicates_and_guessed_cik_are_rejected(self):
        for rows in ([[1, "S000000001", "C000000001", "A"]]*2, [["name", "S000000001", "C000000001", "A"]]):
            with self.assertRaises(ValueError):
                publisher.parse_tickers(tickers(rows))

    def test_official_blank_symbol_keeps_class_identity_as_missing_not_parse_failure(self):
        body = tickers([[225030, "S000009768", "C000026832", ""]])
        result = publisher.refresh(fetch=fetcher({publisher.TICKERS: body}), checked_at=CHECKED)
        self.assertEqual(result["sync"]["status"], "ready")
        self.assertEqual(result["stats"]["tickerReferences"], 1)
        self.assertEqual(result["stats"]["referencesWithSymbol"], 0)
        self.assertEqual(result["stats"]["referencesMissingSymbol"], 1)
        self.assertEqual(result["tickers"], [["0000225030", "S000009768", "C000026832", None]])

    def test_http_403_is_not_retried_or_bypassed(self):
        transport = publisher.Transport(sleeper=lambda seconds: None)
        denied = publisher.urllib.error.HTTPError(publisher.TICKERS, 403, "Forbidden", {}, None)
        with patch.object(publisher.urllib.request, "build_opener") as build:
            build.return_value.open.side_effect = denied
            with self.assertRaises(publisher.urllib.error.HTTPError):
                transport.get(publisher.TICKERS, robots=False)
            self.assertEqual(build.return_value.open.call_count, 1)


if __name__ == "__main__":
    unittest.main()
