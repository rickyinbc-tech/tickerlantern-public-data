"""GLEIF fixture coverage for scope, identity, pagination and resumable pages."""
import importlib.util
import json
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

MODULE = Path(__file__).resolve().parents[1] / "scripts/fund-adapters/gleif_catalog.py"
if not MODULE.is_file():
    MODULE = Path(__file__).with_name("gleif_catalog.py")
SPEC = importlib.util.spec_from_file_location("gleif_catalog", MODULE)
g = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(g)
FUND = "02125PFFNNDK2YW74M07"
GOLDEN = "2026-10-19T00:00:00Z"
RETRIEVED = "2026-10-19T15:00:00Z"


def record(lei=FUND, name="Synthetic Canadian Fund", jurisdiction="CA-ON", country="CA", category="FUND"):
    return {"id": lei, "attributes": {"lei": lei, "entity": {"legalName": {"name": name}, "category": category,
        "legalAddress": {"country": country}, "jurisdiction": jurisdiction, "status": "ACTIVE"},
        "registration": {"status": "LAPSED", "lastUpdateDate": "2020-01-01T00:00:00Z"}}}


def source(rows, total, next_url=None):
    return {"meta": {"goldenCopy": {"publishDate": GOLDEN}, "pagination": {"total": total}},
        "data": rows, "links": {"next": next_url}}


class FixtureClient(g.Client):
    def __init__(self, pages):
        self.pages = iter(pages)
        self.golden = GOLDEN
        self.evidence = []

    def get(self, url):
        return next(self.pages), {}


class GleifCatalogTest(unittest.TestCase):
    def test_real_cc0_example_lei_checksum(self):
        self.assertTrue(g.valid_lei(FUND))
        self.assertFalse(g.valid_lei(FUND[:-1] + "8"))
        self.assertFalse(g.valid_lei("RBC"))

    def test_address_does_not_infer_domicile_or_sales_registration(self):
        result = g.normalize(record(), GOLDEN, RETRIEVED, {})
        self.assertEqual(result["legalAddressCountry"], "CA")
        self.assertEqual(result["legalJurisdiction"], "CA-ON")
        self.assertIsNone(result["domicile"])
        self.assertTrue(result["catalogOnly"])
        self.assertEqual(result["reports"], [])

    def test_overseas_legal_jurisdiction_remains_overseas(self):
        result = g.normalize(record(jurisdiction="KY"), GOLDEN, RETRIEVED, {})
        self.assertEqual(result["registrationJurisdiction"], "KY")
        self.assertIsNone(result["domicile"])

    def test_name_does_not_supply_provider(self):
        result = g.normalize(record(name="RBC Fixture Fund"), GOLDEN, RETRIEVED, {})
        self.assertIsNone(result["providerId"])
        self.assertIsNone(result["legalManagerLEI"])

    def test_exact_source_relationship_supplies_manager(self):
        relation = {"manager_lei": "549300GEP62IUCL05M64", "provider_id": "ca-rbc", "manager_name": "Fixture manager"}
        result = g.normalize(record(), GOLDEN, RETRIEVED, {FUND: [relation]})
        self.assertEqual(result["providerId"], "ca-rbc")
        self.assertEqual(result["legalManagerLEI"], relation["manager_lei"])

    def test_ambiguous_managers_remain_unverified(self):
        evidence = [{"manager_lei": "one"}, {"manager_lei": "two"}]
        result = g.normalize(record(), GOLDEN, RETRIEVED, {FUND: evidence})
        self.assertIsNone(result["providerId"])
        self.assertEqual(result["providerEvidence"], evidence)

    def test_reported_relationship_is_not_a_current_manager_guarantee(self):
        relation = {"manager_lei": "549300GEP62IUCL05M64", "provider_id": "ca-rbc", "manager_name": "Fixture manager"}
        result = g.normalize(record(), GOLDEN, RETRIEVED, {FUND: [relation]})
        self.assertEqual(result["providerIdentityStatus"], "dated_registry_relationship")
        self.assertFalse(result["currentManagerVerified"])

    def test_invesco_corporate_change_flags_review_without_guessing_ci(self):
        relation = {"manager_lei": "9F443AVI6KXI3MYCLS29", "provider_id": "ca-invesco", "manager_name": "Invesco Canada Ltd."}
        result = g.normalize(record(), GOLDEN, RETRIEVED, {FUND: [relation]})
        self.assertEqual(result["providerId"], "ca-invesco")
        self.assertEqual(result["providerIdentityStatus"], "review_required")
        self.assertEqual(result["managerWarning"]["event_date"], "2026-06-01")
        self.assertEqual(result["managerWarning"]["evidence_url"], g.INVESCO_CI_EVIDENCE)

    def test_lei_status_is_separate_from_entity_status_and_observation(self):
        result = g.normalize(record(), GOLDEN, RETRIEVED, {})
        self.assertEqual(result["entityStatus"], "ACTIVE")
        self.assertEqual(result["leiRegistrationStatus"], "LAPSED")
        self.assertEqual(result["lastEntityUpdate"], "2020-01-01T00:00:00Z")
        self.assertEqual(result["registryAsOf"], "2026-10-19")

    def test_missing_financial_fields_are_pending(self):
        result = g.normalize(record(), GOLDEN, RETRIEVED, {})
        self.assertIsNone(result["holdingsDepth"])
        self.assertEqual(result["fieldStatus"]["fees"]["status"], "pending")

    def test_scope_mismatch_rejected(self):
        for row in [record(country="US"), record(category="GENERAL")]:
            with self.assertRaisesRegex(ValueError, "scope|filter"):
                g.normalize(row, GOLDEN, RETRIEVED, {})

    def test_mismatched_lei_rejected(self):
        row = record()
        row["attributes"]["lei"] = "549300GEP62IUCL05M64"
        with self.assertRaisesRegex(ValueError, "mismatched"):
            g.normalize(row, GOLDEN, RETRIEVED, {})

    def test_every_page_is_traversed(self):
        next_url = g.ORIGIN + "?page=2"
        client = FixtureClient([source([record()], 2, next_url), source([record("549300GEP62IUCL05M64")], 2)])
        rows, evidence = client.all(g.ORIGIN)
        self.assertEqual(len(rows), 2)
        self.assertEqual(evidence["pages"], 2)
        self.assertTrue(evidence["complete"])

    def test_truncated_last_page_fails(self):
        with self.assertRaisesRegex(ValueError, "declared source total"):
            FixtureClient([source([record()], 2)]).all(g.ORIGIN)

    def test_repeated_next_page_fails(self):
        with self.assertRaisesRegex(ValueError, "Repeated"):
            FixtureClient([source([record()], 2, g.ORIGIN)]).all(g.ORIGIN)

    def test_external_next_page_fails(self):
        with self.assertRaisesRegex(ValueError, "official GLEIF"):
            FixtureClient([source([record()], 2, "https://example.org/next")]).all(g.ORIGIN)

    def test_changed_total_fails(self):
        client = FixtureClient([source([record()], 2, g.ORIGIN + "?page=2"), source([record()], 3)])
        with self.assertRaisesRegex(ValueError, "total changed"):
            client.all(g.ORIGIN)

    def test_unbounded_manager_candidate_search_fails(self):
        with self.assertRaisesRegex(ValueError, "bounded candidate"):
            FixtureClient([source([record()], 500)]).all(g.ORIGIN, max_total=400)

    def test_cached_pages_resume_without_network_and_verify_hash(self):
        with tempfile.TemporaryDirectory() as tmp:
            raw = json.dumps(source([record()], 1)).encode()
            with patch.object(g.subprocess, "run", return_value=SimpleNamespace(stdout=raw)) as network:
                first = g.Client(tmp, delay=0)
                first.get(g.ORIGIN)
                self.assertEqual(network.call_count, 1)
                resumed = g.Client(tmp, delay=0)
                resumed.get(g.ORIGIN)
                self.assertEqual(network.call_count, 1)
                self.assertEqual(resumed.cached, 1)
            path = next(p for p in Path(tmp).glob("*.json") if not p.name.endswith(".meta.json"))
            path.write_text("{}")
            with self.assertRaisesRegex(ValueError, "hash mismatch"):
                g.Client(tmp, delay=0).get(g.ORIGIN)

    def test_golden_copy_drift_fails(self):
        with tempfile.TemporaryDirectory() as tmp:
            raw = json.dumps(source([record()], 1)).encode()
            with patch.object(g.subprocess, "run", return_value=SimpleNamespace(stdout=raw)):
                client = g.Client(tmp, delay=0)
                client.golden = "2026-10-18T00:00:00Z"
                with self.assertRaisesRegex(ValueError, "version changed"):
                    client.get(g.ORIGIN)

    def test_parse_failures_stay_in_declared_denominator(self):
        client = FixtureClient([source([record(), record("INVALID")], 2)])
        result = g.import_catalog(client, include_managers=False)
        self.assertEqual(result["manifest"]["discovered"], 2)
        self.assertEqual(result["manifest"]["validated"], 1)
        self.assertEqual(result["manifest"]["parse_failed"], 1)
        self.assertIsNone(result["manifest"]["canadian_provider_product_denominator"])


if __name__ == "__main__":
    unittest.main()
