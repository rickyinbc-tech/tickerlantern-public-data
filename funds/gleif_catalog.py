#!/usr/bin/env python3
"""Import the complete paginated GLEIF Canadian-address FUND subset (CC0).

Legal-entity catalog only: no retail-product completeness, series, NAV, holdings
or current-investor-eligibility inference. Exact fund-manager RR records enrich
provider identity; names never merge funds. Cached successful pages survive a
restart and a new public snapshot replaces the last only after reconciliation.
"""
from __future__ import annotations

import argparse
from collections import Counter, defaultdict
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import subprocess
import time
import unicodedata
from urllib.parse import urlencode, urlparse

ORIGIN = "https://api.gleif.org/api/v1/lei-records"
TERMS = "https://www.gleif.org/en/meta/lei-data-terms-of-use"
LEI = re.compile(r"^[A-Z0-9]{18}[0-9]{2}$")
INVESCO_CI_EVIDENCE = "https://ir.cifinancial.com/news/news-details/2026/CI-Global-Asset-Management-Completes-Acquisition-of-Invescos-Canadian-Investment-Fund-Assets-2026-YI4IwPN3Ov/default.aspx"
# Search candidates are accepted only by exact current legal name, active status
# and Canadian legal jurisdiction. Provider membership then needs an explicit
# IS_FUND-MANAGED_BY relationship. This is not fund-name prefix classification.
MANAGERS = [
    ("ca-rbc", "RBC Global Asset Management Inc."),
    ("ca-td", "TD Asset Management Inc."),
    ("ca-bmo", "BMO Asset Management Inc."),
    ("ca-bmo", "BMO Investments Inc."),
    ("ca-cibc", "CIBC Asset Management Inc."),
    ("ca-scotia", "1832 Asset Management L.P."),
    ("ca-nbi", "National Bank Investments Inc."),
    ("ca-blackrock", "BlackRock Asset Management Canada Limited"),
    ("ca-vanguard", "Vanguard Investments Canada Inc."),
    ("ca-global-x", "Global X Investments Canada Inc."),
    ("ca-capital-group", "Capital International Asset Management (Canada), Inc."),
    ("ca-fidelity", "Fidelity Investments Canada ULC"),
    ("ca-mackenzie", "Mackenzie Financial Corporation"),
    ("ca-ci", "CI Investments Inc."),
    ("ca-agf", "AGF Investments Inc."),
    ("ca-manulife", "Manulife Investment Management Limited"),
    ("ca-sun-life", "SLGI Asset Management Inc."),
    ("ca-franklin-templeton", "Franklin Templeton Investments Corp."),
    ("ca-invesco", "Invesco Canada Ltd."),
]


def now():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def encoded(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def atomic(path, raw):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + ".tmp")
    temporary.write_bytes(raw)
    temporary.replace(path)


def safe_api(url):
    p = urlparse(url)
    if p.scheme != "https" or p.netloc != "api.gleif.org" or not p.path.startswith("/api/v1/lei-records"):
        raise ValueError("Source pagination left the official GLEIF access service")
    return url


class Client:
    def __init__(self, cache, delay=0.5):
        self.cache = Path(cache)
        self.delay = delay
        self.golden = None
        self.requests = 0
        self.cached = 0
        self.evidence = []
        self.row_retrievals = {}

    def get(self, url):
        safe_api(url)
        key = sha(url.encode())
        raw_path = self.cache / (key + ".json")
        meta_path = self.cache / (key + ".meta.json")
        if raw_path.exists() and meta_path.exists():
            raw = raw_path.read_bytes()
            meta = json.loads(meta_path.read_text())
            if meta.get("url") != url or meta.get("sha256") != sha(raw):
                raise ValueError("Cached GLEIF response identity/hash mismatch")
            self.cached += 1
        else:
            time.sleep(self.delay)
            result = subprocess.run(["curl", "--fail", "--silent", "--show-error", "--globoff",
                "--connect-timeout", "10", "--max-time", "45", "--retry", "2", "--retry-delay", "1", url],
                capture_output=True, check=True)
            raw = result.stdout
            if len(raw) > 12_000_000:
                raise ValueError("GLEIF response exceeds bounded page budget")
            meta = {"url": url, "retrieved_at": now(), "sha256": sha(raw)}
            # Validate before caching. An HTTP success containing source errors
            # must never replace a prior successful page.
            data = json.loads(raw)
            if data.get("errors") or "data" not in data:
                raise ValueError("GLEIF source returned errors or omitted data")
            atomic(raw_path, raw)
            atomic(meta_path, encoded(meta))
            self.requests += 1
        data = json.loads(raw)
        golden = data.get("meta", {}).get("goldenCopy", {}).get("publishDate")
        if not golden:
            raise ValueError("GLEIF response omitted golden-copy observation date")
        if self.golden is not None and self.golden != golden:
            raise ValueError("Golden-copy version changed; use a fresh dated cache and retry")
        self.golden = golden
        self.evidence.append(meta)
        return data, meta

    def all(self, first, max_total=None):
        rows, seen = [], set()
        current = first
        total = None
        while current:
            if current in seen or len(seen) > 1000:
                raise ValueError("Repeated or unbounded source pagination")
            seen.add(current)
            data, meta = self.get(current)
            page = data.get("data")
            pagination = data.get("meta", {}).get("pagination")
            if not isinstance(page, list) or not isinstance(pagination, dict):
                raise ValueError("Expected a paginated source list")
            declared = pagination.get("total")
            if not isinstance(declared, int) or (total is not None and declared != total):
                raise ValueError("Source total changed during pagination")
            if max_total is not None and declared > max_total:
                raise ValueError("Manager discovery query exceeds bounded candidate scope; exact identity review required")
            total = declared
            rows.extend(page)
            if not hasattr(self, "row_retrievals"):
                self.row_retrievals = {}
            for row in page:
                if isinstance(row, dict):
                    self.row_retrievals[(row.get("type"), row.get("id"))] = meta.get("retrieved_at")
            current = data.get("links", {}).get("next")
            if current:
                safe_api(current)
            print(f"GLEIF {len(rows)}/{total} rows; {len(seen)} pages", flush=True)
        if len(rows) != total:
            raise ValueError("Last page reached without reconciling declared source total")
        return rows, {"total": total, "pages": len(seen), "complete": True, "first_url": first}


def exact_name(value):
    return unicodedata.normalize("NFKC", value).casefold().strip()


def canadian_jurisdiction(value):
    return isinstance(value, str) and (value == "CA" or value.startswith("CA-"))


def valid_lei(value):
    if not isinstance(value, str) or not LEI.fullmatch(value):
        return False
    converted = "".join(str(ord(c) - 55) if c.isalpha() else c for c in value)
    return int(converted) % 97 == 1


def normalize(row, golden, retrieved_at, relationships):
    source_id = row.get("id")
    attributes = row.get("attributes", {})
    entity = attributes.get("entity", {})
    registration = attributes.get("registration", {})
    if not valid_lei(source_id) or attributes.get("lei") != source_id:
        raise ValueError("Invalid or mismatched LEI")
    if entity.get("category") != "FUND" or entity.get("legalAddress", {}).get("country") != "CA":
        raise ValueError("Source record falls outside the locked Canadian-address FUND filter")
    name = entity.get("legalName", {}).get("name")
    if not isinstance(name, str) or not name.strip():
        raise ValueError("Source fund legal name is missing")
    jurisdiction = entity.get("jurisdiction")
    managers = relationships.get(source_id, [])
    unique_managers = {x["manager_lei"] for x in managers}
    selected = managers[0] if len(unique_managers) == 1 else None
    manager = selected["manager_name"] if selected else "Legal manager unverified"
    manager_warning = ({"status": "review_required", "current_manager_status": "unverified",
        "reason": "CI announced acquisition of management agreements for 98 Invesco Canadian funds effective 2026-06-01; reconcile exact fund identity and manager versus subadvisor before current attribution",
        "evidence_url": INVESCO_CI_EVIDENCE, "event_date": "2026-06-01", "verified_at": "2026-10-19"}
        if selected and selected["provider_id"] == "ca-invesco" else None)
    return {"id": "gleif-" + source_id.lower(), "name": name,
        "otherNames": entity.get("otherNames", []), "registrant": manager,
        "providerId": selected["provider_id"] if selected else None,
        "sourceType": "GLEIF", "registrationJurisdiction": "CA" if canadian_jurisdiction(jurisdiction) else jurisdiction,
        "legalJurisdiction": jurisdiction, "legalAddressCountry": entity.get("legalAddress", {}).get("country"),
        "domicile": None, "domicileMissingReason": "legal_jurisdiction_and_address_are_not_a_verified_fund_domicile_field",
        "sourceURL": ORIGIN + "/" + source_id,
        "sourceId": source_id, "lei": source_id, "classes": [], "reports": [], "pack": None,
        "catalogOnly": True, "sourceAsOf": golden, "registryAsOf": golden[:10], "asOf": golden[:10],
        "retrievedAt": retrieved_at, "legalManagerLEI": selected["manager_lei"] if selected else None,
        "providerEvidence": managers,
        "providerIdentityStatus": "review_required" if manager_warning else "dated_registry_relationship" if selected else "unverified_or_ambiguous",
        "asReportedLegalManager": manager if selected else None, "currentManagerVerified": False,
        "managerWarning": manager_warning,
        "entityStatus": entity.get("status"), "leiRegistrationStatus": registration.get("status"),
        "lastEntityUpdate": registration.get("lastUpdateDate"), "nextLEIRenewal": registration.get("nextRenewalDate"),
        "creationDate": entity.get("creationDate"), "sourceRegistrationId": entity.get("registeredAs"),
        "sourceRegistrationAuthority": entity.get("registeredAt"), "successorEntities": entity.get("successorEntities", []),
        "fieldStatus": {field: {"status": "pending", "reason": "not_provided_by_legal_entity_registry"} for field in
            ["series", "nav", "fees", "performance", "holdings", "asset_allocation", "sector_allocation", "geographic_allocation"]},
        "holdingsDepth": None, "sourceScope": "LEI-registered fund legal entities with Canadian legal address; not all retail products"}


def import_catalog(client, include_managers=True):
    first = ORIGIN + "?" + urlencode({"filter[entity.legalAddress.country]": "CA", "filter[entity.category]": "FUND", "sort": "lei", "page[size]": 200})
    rows, traversal = client.all(first)
    if not rows:
        raise ValueError("Empty Canadian fund registry is not a verified replacement for a successful catalog")
    relationships = defaultdict(list)
    manager_reports = []
    if include_managers:
        for provider, name in MANAGERS:
            try:
                print("GLEIF manager candidate search: " + name, flush=True)
                # A comma is the API's multi-value OR separator. It is removed
                # only from the search query; acceptance still compares the
                # unaltered full legal name below.
                search, _ = client.all(ORIGIN + "?" + urlencode({"filter[entity.legalName]": name.replace(",", ""),
                    "filter[entity.legalAddress.country]": "CA", "filter[entity.category]": "GENERAL",
                    "filter[entity.status]": "ACTIVE", "page[size]": 200}), max_total=400)
                matches = [x for x in search if exact_name(x["attributes"]["entity"]["legalName"]["name"]) == exact_name(name)
                    and x["attributes"]["entity"].get("status") == "ACTIVE"
                    and canadian_jurisdiction(x["attributes"]["entity"].get("jurisdiction"))]
                if len(matches) != 1:
                    manager_reports.append({"provider_id": provider, "requested_name": name, "status": "review_required", "exact_active_matches": len(matches)})
                    continue
                manager = matches[0]
                manager_lei = manager["id"]
                link = manager.get("relationships", {}).get("managed-funds", {}).get("links", {}).get("relationship-records")
                if not link:
                    manager_reports.append({"provider_id": provider, "manager_lei": manager_lei, "status": "no_reported_relationship_link"})
                    continue
                related, scope = client.all(link + "?" + urlencode({"page[size]": 200}))
                accepted = 0
                for relation in related:
                    a = relation.get("attributes", {})
                    rr = a.get("relationship", {})
                    if rr.get("type") != "IS_FUND-MANAGED_BY" or rr.get("endNode", {}).get("id") != manager_lei:
                        raise ValueError("Manager relationship identity/type mismatch")
                    fund_lei = rr.get("startNode", {}).get("id")
                    if not valid_lei(fund_lei):
                        raise ValueError("Fund-manager relationship LEI invalid")
                    # Retired, deleted and ended relationships remain in page
                    # evidence, but do not establish current provider membership.
                    if rr.get("status") != "ACTIVE" or a.get("validTo") or a.get("extension", {}).get("deletedAt"):
                        continue
                    relationships[fund_lei].append({"provider_id": provider, "manager_lei": manager_lei,
                        "manager_name": manager["attributes"]["entity"]["legalName"]["name"],
                        "manager_source_url": ORIGIN + "/" + manager_lei,
                        "relationship_id": relation.get("id"), "source_url": link,
                        "relationship_status": rr.get("status"), "periods": rr.get("periods", []),
                        "registration_status": a.get("registration", {}).get("status"),
                        "last_updated": a.get("registration", {}).get("lastUpdateDate"),
                        "corroboration": a.get("registration", {}).get("corroborationLevel"),
                        "retrieved_at": client.row_retrievals.get((relation.get("type"), relation.get("id"))),
                        "golden_copy_as_of": client.golden})
                    accepted += 1
                manager_reports.append({"provider_id": provider, "manager_lei": manager_lei, "name": name,
                    "status": "traversed", "source_relationships": scope["total"], "active_relationships": accepted, "pages": scope["pages"]})
            except Exception as exc:
                # One unavailable manager enrichment must not discard the complete
                # fund directory or another manager's successfully verified rows.
                manager_reports.append({"provider_id": provider, "requested_name": name, "status": "source_error", "error": str(exc)[:300]})
    funds, failures, ids = [], [], set()
    built_at = now()
    retrieved_at = max((x["retrieved_at"] for x in client.evidence), default=built_at)
    for index, row in enumerate(rows):
        try:
            record = normalize(row, client.golden,
                client.row_retrievals.get((row.get("type"), row.get("id"))) or retrieved_at, relationships)
            if record["lei"] in ids:
                raise ValueError("Duplicate source LEI during full traversal")
            ids.add(record["lei"])
            funds.append(record)
        except Exception as exc:
            failures.append({"source_row": index + 1, "source_id": row.get("id"), "status": "parse_failed", "reason": str(exc)})
    coverage = {"universe_as_of": client.golden, "scope": "entity.legalAddress.country=CA AND entity.category=FUND; all statuses",
        "source_url": first, "declared_source_records": traversal["total"], "discovered": len(rows), "validated": len(funds),
        "imported": len(funds), "parse_failed": len(failures), "pages": traversal["pages"], "source_pagination_reconciled": True,
        "canadian_provider_product_denominator": None, "canadian_provider_product_scope_complete": False,
        "with_manager_relationship": sum(bool(f["legalManagerLEI"]) for f in funds),
        "legal_jurisdictions": dict(Counter(f["legalJurisdiction"] for f in funds)),
        "entity_status": dict(Counter(f["entityStatus"] for f in funds)),
        "lei_registration_status": dict(Counter(f["leiRegistrationStatus"] for f in funds)),
        "provider_records": dict(Counter(f["providerId"] or "unverified" for f in funds)),
        "nav": 0, "fees": 0, "performance": 0, "full_holdings": 0,
        "limitations": "Legal entities are not all products/classes; financial fields remain pending. Canadian address differs from legal jurisdiction/domicile. No name-based manager matching."}
    return {"schemaVersion": 1, "sourceType": "GLEIF", "sourceAsOf": client.golden, "retrievedAt": retrieved_at, "builtAt": built_at,
        "permission": {"status": "permitted", "evidence_url": TERMS, "verified_at": retrieved_at[:10], "scope": "CC0 LEI/reference data via official Access Service"},
        "manifest": coverage, "funds": sorted(funds, key=lambda x: x["id"]), "failures": failures,
        "managerDiscovery": manager_reports, "pageEvidence": client.evidence}


def adapter_page(catalog):
    return {"records": [{"kind": "fund", "source_id": f["lei"], "jurisdiction": f["legalAddressCountry"],
        "source_url": f["sourceURL"], "as_of": f["registryAsOf"], "retrieved_at": f["retrievedAt"], "data": f} for f in catalog["funds"]],
        "next_cursor": None, "evidence": {"url": catalog["manifest"]["source_url"], "retrieved_at": catalog["retrievedAt"],
            "sha256": sha(encoded(catalog)), "scope": catalog["manifest"]}}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cache", type=Path, default=Path("qa/gleif/" + now()[:10]))
    parser.add_argument("--output", type=Path, default=Path("qa/gleif/" + now()[:10] + "/snapshot.json"),
        help="Staged source snapshot; the research builder publishes a compressed hash-bound catalog")
    parser.add_argument("--adapter-output", type=Path)
    parser.add_argument("--skip-manager-enrichment", action="store_true")
    args = parser.parse_args()
    client = Client(args.cache)
    catalog = import_catalog(client, not args.skip_manager_enrichment)
    if catalog["failures"]:
        atomic(args.cache / "parse-failures.json", encoded(catalog["failures"]))
        raise ValueError("Unresolved fund parse failures; prior public snapshot preserved")
    atomic(args.output, encoded(catalog))
    if args.adapter_output:
        atomic(args.adapter_output, encoded(adapter_page(catalog)))
    print(json.dumps({"output": str(args.output), "coverage": catalog["manifest"], "requests": client.requests, "cache_hits": client.cached}, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()
