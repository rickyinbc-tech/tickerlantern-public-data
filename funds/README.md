# SEC fund-reference publisher

Standard-library Python source publisher for the complete latest dated SEC
series/class CSV and the complete current mutual-fund ticker reference. It
discovers the latest annual CSV from the official dated source page, rather than
freezing the source URL at 2026. All classes and all organization types remain
visible; the file is not described as an all-mutual-fund or active-product list.

Canonical implementation: `tickerlantern-responsive/scripts/fund-publisher/`.
The identical deployed copy is `tickerlantern-public-data/funds/`. The separate
public-data repository owns `.github/workflows/fund-reference.yml`; source
changes require reviewing and synchronizing the two copies.

```bash
python3 scripts/fund-publisher/test_refresh.py -v
python3 scripts/fund-publisher/refresh.py prior.json next.json --raw-directory qa/fund-reference/raw
```

A missing `prior.json` is allowed on the first run. Output is compact
`schemaVersion:1` JSON containing `fields`, `registrants`, `series`, `classes`,
`tickers`, `sources`, `stats` and `sync`. Table columns are declared in `fields`.
The exact CIK/series/class tuple is the only class join. Both annual catalog
tickers and current ticker-reference symbols are retained with separate sources
and dates; differences do not trigger a name/ticker guess. Blank source symbols
become null with a source-level explanation. A current ticker class absent from
the annual catalog remains in the ticker reference; its name is not invented.

Filing jurisdiction is US; domicile and financial reporting currency are null.
The reference contains no NAV, fees, returns, classifications, fund AUM or
holdings. The annual source's `asOf` means its official page's updated date,
not a financial-report date. The current ticker source has no official report
date, so its `asOf` remains null. Retrieval and check times stay separate.

Source parser/identity/date failures preserve the prior complete component and
its original source provenance. Other sources continue. `sync.status` is
`ready`, `partial`, `error` (all requests failed with last-good data retained) or
`unavailable` (no successful prior components). Missing component counts are
null, not zero. A 25% unexplained collapse rejects a source; valid large product
closures need an explicit review before changing that guard. Output validation
and rename publication are atomic. Source failure status is publishable so
readers see the failed refresh, rather than a fabricated new success date.

Transport uses a public identified User-Agent, verifies HTTPS certificates,
checks robots, requests only `www.sec.gov`, rejects redirects, limits source
bodies to 25 MB, spaces requests at least one second apart and retries at most
three times with backoff. If the local Python installation has no CA bundle,
it loads the existing system `/etc/ssl/cert.pem`; verification stays enabled.
`SEC_USER_AGENT` can supply an existing operator identity. Raw originals and
SHA-256 source manifests are preserved when `--raw-directory` is supplied.

The proposed cloud workflow shares the existing public publisher writer lock,
runs daily at 05:43 UTC and supports manual dispatch. It publishes only
`data/fund-reference.json`, preserves original sources as a 14-day Actions
artifact, reports exact source outcomes and marks the run failed if both source
checks failed. Previous public-data files stay intact. A workflow file alone
does not prove scheduling: review/commit/push, enablement and a completed actual
cloud execution must be verified separately.
