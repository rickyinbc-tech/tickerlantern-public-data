# Daily SEC disclosure batches

The canonical producer is `disclosure_refresh.py`, using the adjacent reviewed
SEC transport and `scripts/fund-adapters/sec_{nmfp,ncen}.py`. The deployed copy
is in `rickyinbc-tech/tickerlantern-public-data` under `funds/disclosures/`.
Review and synchronize parser, producer and source tests together.

```sh
python3 scripts/fund-publisher/disclosure_refresh.py --output qa/disclosures/published --work qa/disclosures/source-check
python3 scripts/fund-publisher/test_disclosure_refresh.py
```

Each check freshly discovers and retrieves the latest official N-MFP and N-CEN
ZIPs into a new timestamped work directory, observes robots and request limits,
and validates complete parsed sources and every referenced N-MFP holding pack
before publishing. Supplied offline `--nmfp-extension` / `--ncen-extension`
options are explicitly labelled offline validation, not fresh source retrieval.

The public index is
https://raw.githubusercontent.com/rickyinbc-tech/tickerlantern-public-data/main/data/fund-disclosures/index.json.
Each source points to an immutable gzip JSON object at
`objects/<compressed-SHA256>.json.bin`, with its compressed length and hash.
Referenced holding packs use the same hash-addressed prefix. The consumer only
accepts this exact public-repository path, validates hashes/byte and expanded
budgets, then replaces facts belonging to that source. Unchanged source bytes
and parser fingerprints retain financial object bytes and original retrieval
dates; only the check date advances. No historical denominator is invented.

Independent source failures publish explicit error statuses, retaining only a
previous complete source whose object and every holding pack still validate.
The client uses compatible last-good data or the reviewed release baseline and
shows the failure, dates, retained origin and Retry action. `fund-delivery=bundled`
selects the reviewed N-MFP/N-CEN release baseline; GLEIF and SEC class-reference
checks have their own independent provenance.

Workflow `389619379` is active, daily **06:43 UTC**, sharing concurrency group
`public-financial-refresh` with the existing data publishers. Initial manual run:
https://github.com/rickyinbc-tech/tickerlantern-public-data/actions/runs/39285363549.
The run completed successfully at 2026-10-19T16:40:25Z. The actual public feed was read
back: both sources ready, all 191 remote holding-pack hashes verified, and a
457-position exact-accession sample loaded in the real client. Original source/check receipts are retained
as GitHub artifacts for 14 days, separate from the persistent public objects.

This job checks the latest batch only. It does not refresh N-PORT automatically,
backfill the 98 older N-MFP / 32 older N-CEN archive entries, complete Canadian
products or supply missing fees/NAV/returns. N-CEN's published schema-3.1 omission
is retained; absence of that note in a future source page means unknown, not
proof that omitted filings have become included.
