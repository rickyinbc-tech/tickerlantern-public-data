# TickerLantern public corporate data

Public company financial facts for tickerlantern.com, refreshed every six hours from SEC EDGAR, issuer declarations and public government yield sources. Public ETF holdings supply the supported index membership references. Each financial field retains its issuer filing URL and observation period.

The generated `data/` directory contains only public corporate facts and source-check metadata. There are no accounts, portfolios, watchlists, private research notes or customer records. Prices, analyst targets and consensus estimates are not supplied by this public-filings publisher. The website uses independent embedded market panels for additional coverage.

`refresh.mjs` is generated from the website's financial parsers. It performs conservative source requests, validates issuer and currency, and retains dated last-known records after failed checks. A failed or incomplete batch cannot replace the published snapshot. These data support conditional valuation scenarios; they are not verified fair prices.
