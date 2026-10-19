"""Fixture checks for genuine N-MFP3 tables, units, identity and amendments."""
import copy
import csv
import gzip
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import zipfile

MODULE = Path(__file__).resolve().parents[1] / "scripts/fund-adapters/sec_nmfp.py"
SPEC = importlib.util.spec_from_file_location("sec_nmfp", MODULE)
m = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(m)
ACC = "0000123456-26-000001"
CID = "C000000001"
SID = "S000000001"
EVIDENCE = {"url": "https://www.sec.gov/files/dera/data/form-n-mfp-data-sets/20260909-20261007_nmfp.zip",
    "retrievedAt": "2026-10-19T00:00:00Z", "sha256": "a" * 64}
BATCH = {"url": EVIDENCE["url"], "label": "2026 September NMFP", "filingWindowStart": "2026-09-09", "filingWindowEnd": "2026-10-07"}


def tables():
    return {"SUBMISSION": [{"ACCESSION_NUMBER": ACC, "FILING_DATE": "05-OCT-2026", "SUBMISSIONTYPE": "N-MFP3",
        "FILER_CIK": "0000123456", "REPORTDATE": "30-SEP-2026", "SERIESID": SID, "SERIES_NAME": "Fixture Money Market Fund",
        "REGISTRANTFULLNAME": "Fixture Registrant", "TOTALSHARECLASSESINSERIES": "1"}],
        "SERIESLEVELINFO": [{"ACCESSION_NUMBER": ACC, "NETASSETOFSERIES": "1000000000.00", "TOTALVALUEPORTFOLIOSECURITIES": "200000000.01",
            "TOTALVALUELIABILITIES": "0.00", "CASH": "799999999.99", "TOTALVALUEOTHERASSETS": "0.00", "MONEYMARKETFUNDCATEGORY": "Government"}],
        "CLASSLEVELINFO": [{"ACCESSION_NUMBER": ACC, "CLASSESID": CID, "CLASS_NAME": "Institutional", "NETASSETSOFCLASS": "1000000000.00"}],
        "SCHPORTFOLIOSECURITIES": [{"ACCESSION_NUMBER": ACC, "SECURITY_ID": "1", "NAMEOFISSUER": "Fixture Treasury", "TITLEOFISSUER": "Treasury Bill",
            "CUSIP_NUMBER": "012345678", "ISIN": "US0123456789", "INCLUDINGVALUEOFANYSPONSORSUPP": "200000000.01", "EXCLUDINGVALUEOFANYSPONSORSUPP": "200000000.01",
            "PERCENTAGEOFMONEYMARKETFUNDNET": ".2000", "INVESTMENTCATEGORY": "U.S. Treasury Debt"}],
        "DLYNETASSETVALUEPERSHARC": [{"ACCESSION_NUMBER": ACC, "CLASSESID": CID, "DLYNETASSETVALUEPERSHARECLASS": "1.0002", "DLYNETASSETVALUEPERSHAREDATEC": "30-SEP-2026"}],
        "SEVENDAYNETYIELD": [{"ACCESSION_NUMBER": ACC, "CLASSESID": CID, "SEVENDAYNETYIELDVALUE": ".0373", "SEVENDAYNETYIELDDATE": "30-SEP-2026"}]}


def write_zip(directory, value=None, extra=None):
    value = value if value is not None else tables()
    path = Path(directory) / "fixture.zip"
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as archive:
        for name, rows in value.items():
            fields = sorted(m.CORE.get(name, set()) | {key for row in rows for key in row})
            output = io.StringIO(newline="")
            writer = csv.DictWriter(output, fields, delimiter="\t")
            writer.writeheader()
            writer.writerows(rows)
            archive.writestr("NMFP_" + name + ".tsv", output.getvalue())
        for name, body in (extra or {}).items():
            archive.writestr(name, body)
    return path


class SecNmfpTest(unittest.TestCase):
    def parse(self, value=None):
        with tempfile.TemporaryDirectory() as directory:
            return m.parse_archive(write_zip(directory, value), EVIDENCE, BATCH)

    def test_filing_window_and_financial_report_dates_remain_separate(self):
        html=b'<a href="/files/dera/data/form-n-mfp-data-sets/20260909-20261007_nmfp.zip">2026 September NMFP</a>'
        found=m.discover(html, m.date(2026,10,19))
        self.assertEqual(found["filingWindowEnd"], "2026-10-07")
        self.assertIsNone(found["financialReportingDate"])
        result=self.parse()
        self.assertEqual(result["reports"][0]["reportingDate"], "2026-09-30")
        self.assertEqual(result["reports"][0]["filingDate"], "2026-10-05")
        self.assertEqual(result["reports"][0]["retrievedAt"], EVIDENCE["retrievedAt"])

    def test_official_stylesheet_fraction_conversion_and_full_precision(self):
        result=self.parse()
        report=result["reports"][0]
        position=dict(zip(report["positionFields"],report["positions"][0]))
        self.assertEqual(position["reportedPercent"], "20.0000")
        self.assertEqual(position["value"], "200000000.01")
        self.assertEqual(report["classFacts"][0]["sevenDayNetYieldObservations"][0]["value"], "3.7300")
        self.assertEqual(m.decimal_text("12345678901234567890.12345678901234567890",100),"1234567890123456789012.34567890123456789000")

    def test_valuation_is_not_quantity_and_instrument_currency_not_invented(self):
        report=self.parse()["reports"][0]
        p=dict(zip(report["positionFields"],report["positions"][0]))
        self.assertIsNone(p["balance"])
        self.assertIsNone(p["unit"])
        self.assertIsNone(p["instrumentCurrency"])
        self.assertIsNone(p["identifiers"][0][1])
        self.assertEqual(report["currency"],"USD")
        self.assertIsNone(self.parse()["funds"][0]["domicile"])

    def test_explicit_legacy_principal_remains_principal_not_shares(self):
        value=tables();value["SCHPORTFOLIOSECURITIES"][0]["INVESTMENTOWNEDBALANCEPRINCI_L"]="500000.00"
        r=self.parse(value)["reports"][0];p=dict(zip(r["positionFields"],r["positions"][0]))
        self.assertEqual(p["balance"],"500000.00")
        self.assertEqual(p["unit"],"PA")

    def test_amendment_replaces_period_without_concatenating_positions(self):
        value=tables();new_acc="0000123456-26-000002"
        for name, rows in list(value.items()):
            amended=copy.deepcopy(rows[0]);amended["ACCESSION_NUMBER"]=new_acc
            if name=="SUBMISSION":amended.update({"FILING_DATE":"06-OCT-2026","SUBMISSIONTYPE":"N-MFP3/A"})
            rows.append(amended)
        result=self.parse(value)
        self.assertEqual(len(result["funds"]),1)
        self.assertEqual(len(result["reports"]),2)
        self.assertEqual(result["funds"][0]["reports"][0][2],new_acc)
        self.assertTrue(next(r for r in result["reports"] if r["id"]==new_acc)["isLatestForPeriod"])
        self.assertFalse(next(r for r in result["reports"] if r["id"]==ACC)["isLatestForPeriod"])
        self.assertTrue(all(len(r["positions"])==1 for r in result["reports"]))
        self.assertEqual(result["manifest"]["unique_fund_report_periods"],1)

    def test_same_day_competing_amendments_require_review(self):
        value=tables()
        value["SUBMISSION"][0]["SUBMISSIONTYPE"]="N-MFP3/A"
        for name, rows in list(value.items()):
            other=copy.deepcopy(rows[0]);other["ACCESSION_NUMBER"]="0000987654-26-000001";rows.append(other)
        result=self.parse(value)
        self.assertTrue(all(r["versionSelectionStatus"]=="review_required" for r in result["reports"]))
        self.assertFalse(any(r["isLatestForPeriod"] for r in result["reports"]))

    def test_class_nav_does_not_leak_between_classes(self):
        value=tables();value["SUBMISSION"][0]["TOTALSHARECLASSESINSERIES"]="2"
        other=copy.deepcopy(value["CLASSLEVELINFO"][0]);other["CLASSESID"]="C000000002";other["CLASS_NAME"]="Retail";value["CLASSLEVELINFO"].append(other)
        facts=self.parse(value)["reports"][0]["classFacts"]
        self.assertEqual(len(facts[0]["navObservations"]),1)
        self.assertEqual(facts[1]["navObservations"],[])
        self.assertIsNone(facts[1]["managementFee"])
        self.assertIsNone(facts[1]["totalReturn"])

    def test_missing_source_class_count_stays_visible(self):
        value=tables();value["SUBMISSION"][0]["TOTALSHARECLASSESINSERIES"]="2"
        result=self.parse(value)
        self.assertEqual(result["manifest"]["class_count_discrepancies"],1)
        self.assertEqual(result["reports"][0]["classFacts"][0]["classId"],CID)

    def test_source_portfolio_total_difference_is_not_balanced_or_renormalized(self):
        value=tables();value["SERIESLEVELINFO"][0]["TOTALVALUEPORTFOLIOSECURITIES"]="200000001.01"
        result=self.parse(value)
        report=result["reports"][0]
        self.assertEqual(report["holdingValueDifference"],"-1.00")
        self.assertEqual(report["netAssets"],"1000000000.00")
        self.assertEqual(report["positions"][0][8],"20.0000")
        self.assertEqual(result["manifest"]["value_reconciliation_warnings"],1)

    def test_orphan_class_observation_rejected(self):
        value=tables();value["DLYNETASSETVALUEPERSHARC"][0]["CLASSESID"]="C000000009"
        with self.assertRaisesRegex(ValueError,"exact share class"):self.parse(value)

    def test_future_observation_rejected(self):
        value=tables();value["DLYNETASSETVALUEPERSHARC"][0]["DLYNETASSETVALUEPERSHAREDATEC"]="01-OCT-2026"
        with self.assertRaisesRegex(ValueError,"exceeds"):self.parse(value)

    def test_duplicate_exact_holding_rejected(self):
        value=tables();value["SCHPORTFOLIOSECURITIES"].append(copy.deepcopy(value["SCHPORTFOLIOSECURITIES"][0]))
        with self.assertRaisesRegex(ValueError,"duplicate"):self.parse(value)

    def test_same_name_different_series_remain_distinct(self):
        value=tables()
        for name, rows in list(value.items()):
            other=copy.deepcopy(rows[0]);other["ACCESSION_NUMBER"]="0000123456-26-000002"
            if name=="SUBMISSION":other["SERIESID"]="S000000002"
            if "CLASSESID" in other:other["CLASSESID"]="C000000002"
            rows.append(other)
        result=self.parse(value)
        self.assertEqual(len(result["funds"]),2)

    def test_no_results_source_failure_not_empty_success(self):
        with self.assertRaisesRegex(ValueError,"No dated monthly"):m.discover(b"<html>error</html>")
        value=tables();value["SUBMISSION"]=[]
        with self.assertRaisesRegex(ValueError,"not a successful zero"):self.parse(value)

    def test_source_path_escape_and_future_batch_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            path=write_zip(directory,extra={"../escape.tsv":"x"})
            with self.assertRaisesRegex(ValueError,"Unsafe"):m.Archive(path)
        with self.assertRaisesRegex(ValueError,"future"):
            m.discover(b'<a href="/files/20261009-20261107_nmfp.zip">November</a>',m.date(2026,10,19))

    def test_nonfinite_and_blank_values_stay_invalid_or_missing(self):
        self.assertIsNone(m.decimal_text(" "))
        self.assertEqual(m.decimal_text(0),"0")
        self.assertEqual(m.decimal_text("0.00"),"0.00")
        for value in ["NaN","Infinity","1,000","1e3"]:
            with self.assertRaises(ValueError):m.decimal_text(value)

    def test_notice_is_retained_without_a_zero_value_portfolio(self):
        value=tables();value["SUBMISSION"][0]["SUBMISSIONTYPE"]="NT N-MFP3"
        for key in list(value):
            if key!="SUBMISSION":value[key]=[]
        result=self.parse(value)
        self.assertEqual(len(result["notices"]),1)
        self.assertEqual(result["notices"][0]["status"],"notice")
        self.assertNotIn("netAssets",result["notices"][0])
        self.assertEqual(result["reports"],[])
        self.assertIsNone(result["manifest"]["provider_product_denominator"])

    def test_class_financials_are_keyed_by_exact_report_version(self):
        value=tables();new_acc="0000123456-26-000002"
        for name,rows in list(value.items()):
            changed=copy.deepcopy(rows[0]);changed["ACCESSION_NUMBER"]=new_acc
            if name=="SUBMISSION":changed.update({"FILING_DATE":"06-OCT-2026","SUBMISSIONTYPE":"N-MFP3/A"})
            if name=="DLYNETASSETVALUEPERSHARC":changed["DLYNETASSETVALUEPERSHARECLASS"]=".9999"
            rows.append(changed)
        fund=self.parse(value)["funds"][0]
        by_accession=fund["moneyMarketFacts"]["classFactsByAccession"]
        self.assertEqual(by_accession[ACC][0]["navObservations"][0]["value"],"1.0002")
        self.assertEqual(by_accession[new_acc][0]["navObservations"][0]["value"],"0.9999")
        self.assertEqual(fund["classes"][0]["id"],CID)
        self.assertNotIn("navObservations",fund["classes"][0])

    def test_compact_packs_match_existing_report_contract_and_hash(self):
        result=self.parse()
        with tempfile.TemporaryDirectory() as directory:
            index=m.stage_extension(result,Path(directory)/"research-extension.json")
            fund=index["funds"][0];meta=index["packs"][fund["pack"]]
            path=Path(directory)/"packs"/(fund["pack"]+".json.bin")
            raw=path.read_bytes();pack=json.loads(gzip.decompress(raw));report=pack["reports"][0]
            self.assertEqual(hashlib.sha256(raw).hexdigest(),meta["sha256"])
            self.assertEqual(len(raw),meta["bytes"])
            self.assertEqual(report["fundId"],fund["id"])
            self.assertEqual(report["id"],fund["reports"][0][2])
            self.assertEqual(len(report["positions"]),fund["reports"][0][4])
            self.assertEqual(set(m.POSITION_FIELDS),set(report["positionFields"]))
            runtime=m.adapter_page(result,index)
            snapshot=next(r for r in runtime["records"] if r["kind"]=="snapshot")
            self.assertNotIn("positions",snapshot["data"])
            self.assertEqual(snapshot["data"]["holding_count"],1)
            self.assertEqual(snapshot["data"]["holdings_artifact"]["sha256"],meta["sha256"])


if __name__=="__main__":unittest.main()
