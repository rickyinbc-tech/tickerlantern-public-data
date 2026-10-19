"""Offline publisher state-transition fixtures; no changing live source reliance."""
import importlib.util
import copy
import gzip
import hashlib
import json
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest

SPEC = importlib.util.spec_from_file_location("gleif_refresh", Path(__file__).with_name("gleif_refresh.py"))
p = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(p)
g = p.load_adapter()
LEIS = ["02125PFFNNDK2YW74M07", "549300GEP62IUCL05M64"]


def snapshot(leis=LEIS):
    return {"schemaVersion": 1, "sourceType": "GLEIF", "retrievedAt": "2026-10-18T00:00:00Z",
        "sourceAsOf": "2026-10-18T00:00:00Z",
        "funds": [{"id": "gleif-" + lei.lower(), "lei": lei, "sourceType": "GLEIF", "legalAddressCountry": "CA",
                   "domicile": None, "classes": [], "reports": []} for lei in leis],
        "failures": [], "managerDiscovery": [],
        "manifest": {"universe_as_of": "2026-10-18T00:00:00Z", "declared_source_records": len(leis), "validated": len(leis), "parse_failed": 0,
                     "source_pagination_reconciled": True}}


class FakeClient:
    requests = 1
    cached = 0

    def __init__(self, cache):
        self.cache = cache
        self.golden = "2026-10-19T00:00:00Z"

    def get(self, url):
        return {}, {"url": url, "retrieved_at": "2026-10-19T00:00:00Z", "sha256": "a" * 64}


def fake_adapter(result=None, failure=None):
    def import_catalog(client):
        if failure:
            raise failure
        return result or snapshot()
    return SimpleNamespace(Client=FakeClient, ORIGIN=g.ORIGIN, valid_lei=g.valid_lei,
        import_catalog=import_catalog, now=lambda: "2026-10-19T01:00:00Z")


class GleifPublisherTest(unittest.TestCase):
    def test_success_publishes_complete_source(self):
        result, status = p.refresh(None, "/tmp/fixture-unused", fake_adapter())
        self.assertEqual(status, 0)
        self.assertEqual(result["sync"]["status"], "ready")
        self.assertEqual(len(result["funds"]), 2)

    def test_failed_source_retains_last_good_and_original_dates(self):
        prior = snapshot()
        result, status = p.refresh(prior, "/tmp/fixture-unused", fake_adapter(failure=RuntimeError("fixture HTTP 503")))
        self.assertEqual(status, 2)
        self.assertEqual(result["funds"], prior["funds"])
        self.assertEqual(result["retrievedAt"], prior["retrievedAt"])
        self.assertEqual(result["sync"]["status"], "error")
        self.assertNotIn("sync", prior)

    def test_first_failure_is_unavailable_not_zero_universe(self):
        result, status = p.refresh(None, "/tmp/fixture-unused", fake_adapter(failure=RuntimeError("fixture timeout")))
        self.assertEqual(status, 2)
        self.assertIsNone(result["manifest"]["declared_source_records"])
        self.assertEqual(result["sync"]["status"], "unavailable")

    def test_collapse_retains_prior(self):
        prior = snapshot()
        result, status = p.refresh(prior, "/tmp/fixture-unused", fake_adapter(result=snapshot(LEIS[:1])))
        self.assertEqual(status, 2)
        self.assertEqual(len(result["funds"]), 2)
        self.assertIn("collapse", result["sync"]["error"])

    def test_duplicate_identity_is_rejected(self):
        result = snapshot([LEIS[0], LEIS[0]])
        with self.assertRaisesRegex(ValueError, "Duplicate"):
            p.validate_snapshot(result, g)

    def test_invalid_record_does_not_replace_prior(self):
        changed = snapshot()
        changed["funds"][0]["domicile"] = "CA"
        result, status = p.refresh(snapshot(), "/tmp/fixture-unused", fake_adapter(result=changed))
        self.assertEqual(status, 2)
        self.assertIsNone(result["funds"][0]["domicile"])

    def test_manager_request_failure_is_partial_without_losing_directory(self):
        changed = snapshot()
        changed["managerDiscovery"] = [{"status": "source_error", "error": "fixture HTTP 503"}]
        result, status = p.refresh(None, "/tmp/fixture-unused", fake_adapter(result=changed))
        self.assertEqual(status, 0)
        self.assertEqual(result["sync"]["status"], "partial")
        self.assertEqual(len(result["funds"]), 2)

    def test_validated_count_must_match_source_denominator(self):
        changed = snapshot()
        changed["manifest"]["declared_source_records"] = 3
        with self.assertRaisesRegex(ValueError, "denominator"):
            p.validate_snapshot(changed, g)

    def test_compressed_published_bytes_are_deterministic_and_hash_bound(self):
        result, _ = p.refresh(None, "/tmp/fixture-unused", fake_adapter())
        with tempfile.TemporaryDirectory() as directory:
            output, index_path = Path(directory) / "catalog.bin", Path(directory) / "index.json"
            first = p.publish(result, output, index_path, g)
            first_bytes = output.read_bytes()
            second = p.publish(result, output, index_path, g)
            self.assertEqual(first, second)
            self.assertEqual(first_bytes, output.read_bytes())
            self.assertEqual(first["sha256"], hashlib.sha256(first_bytes).hexdigest())
            self.assertEqual(first["bytes"], len(first_bytes))
            self.assertEqual(p.load_snapshot(output), result)
            self.assertEqual(first["stats"]["declared_source_records"], 2)
            self.assertIn("not complete retail products", first["sync"]["scope"])

    def test_failed_refresh_keeps_exact_last_good_bytes_hash_and_dates(self):
        result, _ = p.refresh(None, "/tmp/fixture-unused", fake_adapter())
        with tempfile.TemporaryDirectory() as directory:
            output, index_path = Path(directory) / "catalog.bin", Path(directory) / "index.json"
            ready = p.publish(result, output, index_path, g)
            prior_bytes = output.read_bytes()
            failed, _ = p.refresh(result, "/tmp/fixture-unused", fake_adapter(failure=RuntimeError("fixture 503")))
            failed["sync"]["checkedAt"] = "2026-10-20T01:00:00Z"
            index = p.publish(failed, output, index_path, g)
            self.assertEqual(output.read_bytes(), prior_bytes)
            for field in ["sourceAsOf", "universeAsOf", "sha256", "bytes", "stats"]:
                self.assertEqual(index[field], ready[field])
            self.assertEqual(index["sync"]["lastSuccessAt"], ready["sync"]["lastSuccessAt"])
            self.assertEqual(index["sync"]["status"], "error")
            self.assertIn("fixture 503", index["sync"]["error"])

    def test_partial_manager_refresh_keeps_prior_complete_catalog(self):
        result, _ = p.refresh(None, "/tmp/fixture-unused", fake_adapter())
        with tempfile.TemporaryDirectory() as directory:
            output, index_path = Path(directory) / "catalog.bin", Path(directory) / "index.json"
            ready = p.publish(result, output, index_path, g)
            prior_bytes = output.read_bytes()
            partial = copy.deepcopy(result)
            partial["sync"]["status"] = "partial"
            partial["sync"]["managerRequestErrors"] = [{"provider_id": "fixture", "status": "source_error"}]
            index = p.publish(partial, output, index_path, g)
            self.assertEqual(output.read_bytes(), prior_bytes)
            self.assertEqual(index["sha256"], ready["sha256"])
            self.assertEqual(index["sync"]["status"], "partial")
            self.assertEqual(index["sync"]["failedManagerChecks"][0]["provider_id"], "fixture")

    def test_initial_partial_batch_cannot_be_published_as_complete(self):
        partial, _ = p.refresh(None, "/tmp/fixture-unused", fake_adapter())
        partial["sync"]["status"] = "partial"
        with tempfile.TemporaryDirectory() as directory:
            output, index_path = Path(directory) / "catalog.bin", Path(directory) / "index.json"
            index = p.publish(partial, output, index_path, g)
            self.assertFalse(output.exists())
            self.assertIsNone(index["stats"]["declared_source_records"])
            self.assertIsNone(index["sha256"])
            self.assertEqual(index["sync"]["status"], "unavailable")

    def test_mismatched_prior_hash_refuses_status_publication(self):
        result, _ = p.refresh(None, "/tmp/fixture-unused", fake_adapter())
        with tempfile.TemporaryDirectory() as directory:
            output, index_path = Path(directory) / "catalog.bin", Path(directory) / "index.json"
            p.publish(result, output, index_path, g)
            prior_index = index_path.read_bytes()
            output.write_bytes(b"corrupted fixture")
            result["sync"]["status"] = "error"
            with self.assertRaisesRegex(ValueError, "identity mismatch"):
                p.publish(result, output, index_path, g)
            self.assertEqual(index_path.read_bytes(), prior_index)

    def test_schedule_is_utc_and_rolls_to_tomorrow(self):
        self.assertEqual(p.next_scheduled("2026-10-19T06:12:59Z"), "2026-10-19T06:13:00Z")
        self.assertEqual(p.next_scheduled("2026-10-19T06:13:00Z"), "2026-10-20T06:13:00Z")
        self.assertEqual(p.next_scheduled("2026-12-31T23:59:00Z"), "2027-01-01T06:13:00Z")

    def test_prior_plain_json_and_absent_path_are_supported(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "source.json"
            self.assertIsNone(p.load_snapshot(path))
            path.write_text(json.dumps(snapshot()))
            self.assertEqual(p.load_snapshot(path), snapshot())

    def test_bounded_gzip_prevents_unbounded_expansion(self):
        from unittest.mock import patch
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "source.bin"
            path.write_bytes(gzip.compress(b" " * 200))
            with patch.object(p, "MAX_RAW_BYTES", 100):
                with self.assertRaisesRegex(ValueError, "bounded decompressed"):
                    p.load_snapshot(path)


if __name__ == "__main__":
    unittest.main()
