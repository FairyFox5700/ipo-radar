# IPO Radar

A public, source-linked IPO research tracker covering the **US, Europe and Middle East**.

## Features

- Upcoming and recently completed IPO pipeline
- Region, status and text filters
- Browser-local watchlist with JSON import/export
- Transparent Quality, Risk and Research scores
- Source links, data-completeness gates and freshness labels
- Responsive mobile cards and desktop dashboard
- Daily SEC filing refresh via GitHub Actions

## Score model

```text
Research Score = 0.55 × Quality + 0.45 × (100 − Risk)
```

A composite score is suppressed below 60% data completeness. Scores summarize selected public information for research triage; they are not investment recommendations or return forecasts.

## Data policy

Official filings, prospectuses, exchange notices and issuer announcements are preferred. Unknown dates and offer terms remain `null`; the tracker does not manufacture estimates. Automated refresh currently checks tracked SEC issuers. Europe and Middle East records require human review because many exchange sites prohibit unattended scraping or do not offer a permissive public API.

## Local verification

```bash
python -m unittest discover -s tests -v
python -m http.server 4177
```

Open <http://localhost:4177>.

## Disclaimer

For informational and research purposes only. This project does not provide investment, legal or tax advice and does not constitute an offer, solicitation or recommendation to buy or sell securities.
