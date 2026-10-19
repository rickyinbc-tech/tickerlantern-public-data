#!/usr/bin/env python3
"""Refresh CC0 Canadian-address fund identities; retain last-good source data.

Canonical adapter: ../fund-adapters/gleif_catalog.py. A synchronized publisher
copy may place gleif_catalog.py beside this file. This module does not enable a
cloud schedule; that requires the existing public-data workflow and a verified
actual execution.
"""
import argparse
import copy
from datetime import datetime, timedelta, timezone
import gzip
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import sys
import uuid
from urllib.parse import urlencode

PUBLIC_URL = "https://raw.githubusercontent.com/rickyinbc-tech/tickerlantern-public-data/main/data/gleif-fund-catalog.json.bin"
MAX_RAW_BYTES = 64_000_000


def load_snapshot(path):
    if not path.exists():
        return None
    raw = path.read_bytes()
    if raw[:2] == b"\x1f\x8b":
        # A bounded stream avoids trusting a compressed source's claimed size.
        import io
        with gzip.GzipFile(fileobj=io.BytesIO(raw)) as source:
            raw = source.read(MAX_RAW_BYTES + 1)
    if len(raw) > MAX_RAW_BYTES:
        raise ValueError("Prior GLEIF snapshot exceeds bounded decompressed size")
    return json.loads(raw)


def next_scheduled(checked_at):
    checked = datetime.fromisoformat(checked_at.replace("Z", "+00:00")).astimezone(timezone.utc)
    scheduled = checked.replace(hour=6, minute=13, second=0, microsecond=0)
    if scheduled <= checked:
        scheduled += timedelta(days=1)
    return scheduled.isoformat().replace("+00:00", "Z")


def publish(result, gzip_path, index_path, adapter, public_url=PUBLIC_URL):
    """Publish only complete batches; a failed check changes index status only.

    sha256 binds the compressed bytes consumers actually request. The cloud
    writer commits gzip and index together. Readers reject a transient mismatch
    during delivery and retain their prior verified catalog.
    """
    checked = result["sync"]["checkedAt"]
    status = result["sync"]["status"]
    prior_index = json.loads(index_path.read_text()) if index_path.exists() else None
    if status == "ready":
        validate_snapshot(result, adapter)
        if not result.get("sourceAsOf") or not result.get("retrievedAt"):
            raise ValueError("Publishable source requires Golden Copy and retrieval dates")
        compressed = gzip.compress(adapter.encoded(result), compresslevel=9, mtime=0)
        index = {"schemaVersion": 1, "sourceType": "GLEIF", "sourceAsOf": result["sourceAsOf"],
            "universeAsOf": result["manifest"]["universe_as_of"], "sha256": hashlib.sha256(compressed).hexdigest(),
            "bytes": len(compressed), "path": public_url, "stats": copy.deepcopy(result["manifest"]),
            "sync": {"status": "ready", "checkedAt": checked, "lastSuccessAt": checked, "error": None,
                "sourceRetrievedAt": result["retrievedAt"]}}
        adapter.atomic(gzip_path, compressed)
    elif prior_index is not None and gzip_path.exists():
        # A partial manager batch must not silently remove previously verified
        # relationships. Keep the precise last-success source and byte hash.
        prior_bytes = gzip_path.read_bytes()
        if (prior_index.get("schemaVersion") != 1 or prior_index.get("sourceType") != "GLEIF"
                or prior_index.get("sha256") != hashlib.sha256(prior_bytes).hexdigest()
                or prior_index.get("bytes") != len(prior_bytes)):
            raise ValueError("Last-good gzip/index identity mismatch; publication refused")
        validate_snapshot(load_snapshot(gzip_path), adapter)
        index = copy.deepcopy(prior_index)
        index["sync"] = {**index.get("sync", {}), "status": "partial" if status == "partial" else "error",
            "checkedAt": checked, "error": result["sync"].get("error") or
                "Manager relationship refresh incomplete; last successful complete source retained",
            "failedManagerChecks": result["sync"].get("managerRequestErrors", [])}
    else:
        # No false empty success when the first complete import fails.
        index = {"schemaVersion": 1, "sourceType": "GLEIF", "sourceAsOf": None, "universeAsOf": None,
            "sha256": None, "bytes": None, "path": public_url,
            "stats": {"declared_source_records": None, "validated": None, "imported": None,
                "source_pagination_reconciled": False},
            "sync": {"status": "unavailable", "checkedAt": checked, "lastSuccessAt": None,
                "error": result["sync"].get("error") or "No complete validated source is available"}}
    index["sync"].update({"schedule": "Daily at 06:13 UTC; GitHub Actions may delay scheduled runs",
        "nextScheduledAt": next_scheduled(checked),
        "scope": "Canadian-address FUND legal identities only; not complete retail products, classes or financial data"})
    adapter.atomic(index_path, adapter.encoded(index))
    return index


def load_adapter():
    directory = Path(__file__).resolve().parent
    candidates = [directory.parent / "fund-adapters" / "gleif_catalog.py", directory / "gleif_catalog.py"]
    path = next((p for p in candidates if p.is_file()), None)
    if path is None:
        raise RuntimeError("Reviewed GLEIF adapter is not installed beside the canonical publisher")
    spec = importlib.util.spec_from_file_location("tickerlantern_gleif_adapter", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def validate_snapshot(value, adapter):
    if not isinstance(value, dict) or value.get("schemaVersion") != 1 or value.get("sourceType") != "GLEIF":
        raise ValueError("Invalid GLEIF source snapshot schema")
    funds, manifest = value.get("funds"), value.get("manifest")
    if not isinstance(funds, list) or not funds or not isinstance(manifest, dict):
        raise ValueError("GLEIF source snapshot has no complete successful fund directory")
    if manifest.get("declared_source_records") != len(funds) or manifest.get("validated") != len(funds) or manifest.get("parse_failed") != 0:
        raise ValueError("GLEIF source denominator/validation mismatch")
    if manifest.get("source_pagination_reconciled") is not True or value.get("failures"):
        raise ValueError("GLEIF source pagination/record failures unresolved")
    ids = set()
    for fund in funds:
        if not adapter.valid_lei(fund.get("lei")) or fund.get("id") != "gleif-" + fund["lei"].lower():
            raise ValueError("GLEIF source identity invalid")
        if fund["lei"] in ids or fund.get("sourceType") != "GLEIF":
            raise ValueError("Duplicate or mismatched GLEIF source identity")
        ids.add(fund["lei"])
        if fund.get("legalAddressCountry") != "CA" or fund.get("domicile") is not None:
            raise ValueError("GLEIF address scope must not imply verified domicile")
        if fund.get("reports") or fund.get("classes"):
            raise ValueError("Legal-entity source must not fabricate series or holding snapshots")
    return value


def refresh(prior, cache, adapter):
    checked = adapter.now()
    if prior is not None:
        validate_snapshot(prior, adapter)
    try:
        # Always check the currently published Golden Copy. Reusing a dated
        # cache alone could otherwise make a once-successful dataset stale.
        probe = adapter.Client(Path(cache) / "probes" / uuid.uuid4().hex)
        probe_url = adapter.ORIGIN + "?" + urlencode({"filter[entity.legalAddress.country]": "CA", "filter[entity.category]": "FUND", "sort": "lei", "page[size]": 1})
        _, probe_meta = probe.get(probe_url)
        if not isinstance(probe.golden, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z", probe.golden):
            raise ValueError("Golden Copy version is missing or malformed")
        version = re.sub(r"[^0-9TZ]", "", probe.golden)
        client = adapter.Client(Path(cache) / version)
        client.golden = probe.golden
        result = validate_snapshot(adapter.import_catalog(client), adapter)
        if prior and len(result["funds"]) < len(prior["funds"]) * 0.75:
            raise ValueError("Unexplained fund-identity count collapse exceeds 25%; prior successful snapshot retained")
        source_errors = [m for m in result.get("managerDiscovery", []) if m.get("status") == "source_error"]
        result["sync"] = {"status": "partial" if source_errors else "ready", "checkedAt": checked,
            "lastSuccessfulSourceRefresh": result["retrievedAt"], "goldenCopyProbe": probe_meta,
            "networkRequests": client.requests + probe.requests, "verifiedCacheHits": client.cached,
            "managerRequestErrors": source_errors,
            "scope": "Source identity directory refresh only; product/series and financial data coverage remain independent"}
        return result, 0
    except Exception as exc:
        if prior is None:
            return {"schemaVersion": 1, "sourceType": "GLEIF", "funds": [],
                "manifest": {"declared_source_records": None, "validated": None, "imported": None,
                    "source_pagination_reconciled": False},
                "sync": {"status": "unavailable", "checkedAt": checked, "lastSuccessfulSourceRefresh": None,
                    "error": str(exc)[:1000], "scope": "Source request failed; no verified zero-fund universe"}}, 2
        result = copy.deepcopy(prior)
        result["sync"] = {"status": "error", "checkedAt": checked,
            "lastSuccessfulSourceRefresh": prior["retrievedAt"], "error": str(exc)[:1000],
            "scope": "Last successful fund identities and original provenance retained; this check failed"}
        return result, 2


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("prior", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--cache", type=Path, default=Path("qa/gleif-publisher"))
    parser.add_argument("--public-gzip", type=Path)
    parser.add_argument("--public-index", type=Path)
    parser.add_argument("--public-url", default=PUBLIC_URL)
    args = parser.parse_args()
    adapter = load_adapter()
    if bool(args.public_gzip) != bool(args.public_index):
        parser.error("--public-gzip and --public-index must be provided together")
    prior = load_snapshot(args.prior)
    result, status = refresh(prior, args.cache, adapter)
    adapter.atomic(args.output, adapter.encoded(result))
    index = publish(result, args.public_gzip, args.public_index, adapter, args.public_url) if args.public_gzip else None
    print(json.dumps({"sync": result["sync"], "manifest": result["manifest"], "output": str(args.output),
        "published": index}, ensure_ascii=False))
    if index and index["sync"]["status"] != "ready":
        status = 2
    return status


if __name__ == "__main__":
    sys.exit(main())
