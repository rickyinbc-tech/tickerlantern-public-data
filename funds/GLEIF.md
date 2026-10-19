# GLEIF Canadian-address fund identity publisher

Reviewed standard-library source publisher synchronized from
`tickerlantern-responsive/scripts/fund-adapters/gleif_catalog.py` and
`scripts/fund-publisher/gleif_refresh.py`. Source data are CC0 under the
[GLEIF LEI/reference data terms](https://www.gleif.org/en/meta/lei-data-terms-of-use).
This contains public legal-entity identities, never private accounts, customer
data or downloaded bank research archives.

```bash
python funds/test_gleif_catalog.py -v
python funds/test_gleif_refresh.py -v
python funds/gleif_refresh.py data/gleif-fund-catalog.json.bin /tmp/gleif-next.json \
  --cache /tmp/gleif-source-pages \
  --public-gzip data/gleif-fund-catalog.json.bin \
  --public-index data/gleif-fund-catalog-index.json
```

The exact query is Canadian legal-address country plus entity category FUND,
all statuses. This is not all Canadian retail products/series, verified
domicile or financial-data completeness. Original legal jurisdictions and
historical/inactive identities remain visible. Exact reported manager LEI
relationships retain dates and review warnings; names never establish ownership
or a guaranteed current manager.

Every run probes current Golden Copy, traverses all pages with verified
checkpoints, validates the source denominator and LEI checksums, and separately
checks manager relationships. Deterministic gzip is hash-bound by the small
index; `sha256` and `bytes` describe the compressed bytes. Raw pages and the
candidate 20 MB JSON remain 14-day workflow artifacts, not committed duplicates.
Only complete successful batches replace gzip. Partial/failed checks retain the
prior successful gzip and source dates, update index error/checkedAt, and fail
the job. No first-run failure is represented as a zero-fund success.

`.github/workflows/gleif-fund-catalog.yml` shares `public-financial-refresh`, runs
daily at 06:13 UTC and supports manual dispatch. The schedule is a target and may
be delayed by GitHub. Configuration alone is not evidence of an enabled or
successful deployed schedule; verify an actual workflow run and its live files.
