StockPick Analyzer V2.9.5 — Analysis Provider & Fallback

Changes:
- On-demand analysis remains enabled.
- /api/analyze uses LIVE Zapi when available.
- If Zapi stock-history returns HTTP 429, server falls back to clearly-labelled DEVELOPMENT MOCK data.
- Client stores successful LIVE analyses in localStorage per ticker/mode.
- When a later 429 occurs and a prior LIVE cache exists, client displays CACHED ANALYSIS instead of mock.
- MOCK data is explicitly labelled and never presented as live market data.
- Daily quote remains optional; a daily 429 does not destroy a successful history analysis.

Commit message:
V2.9.5: Add analysis provider fallback
