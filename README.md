# TickerLantern public corporate data

Public company financial facts for tickerlantern.com, refreshed every six hours from SEC EDGAR, issuer declarations and public government yield sources. Public ETF holdings supply the supported index membership references. Each financial field retains its issuer filing URL and observation period.

The generated `data/` directory contains only public corporate facts and source-check metadata. There are no private accounts, personal portfolios, watchlists, private research notes or customer records. Prices, analyst targets and consensus estimates are not supplied by this public-filings publisher. The website uses independent embedded market panels for additional coverage.

`refresh.mjs` is generated from the website's financial parsers. It performs conservative source requests, validates issuer and currency, and retains dated last-known records after failed checks. A failed or incomplete batch cannot replace the published snapshot. These data support conditional valuation scenarios; they are not verified fair prices.


The bank comparison publisher (`banks/`) checks official Big Five retail fund
reports, risk/fee documents, current outlook indexes and Bank of Canada CORRA
daily at 06:47 UTC. It publishes only normalized public facts and check metadata
in `data/bank-portfolios.json`, with a common annual return date across all 25
representative funds. Allocations/outlooks retain their own dates. Failed or
unsupported sources keep their prior verified data and are explicitly marked.
Raw bank PDFs and website archives are never committed. The website checks this
feed without needing a rebuild or Codex session. Schedule delays and source
access/format changes remain observable in the published status and Actions log.
