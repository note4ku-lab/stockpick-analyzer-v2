StockPick Analyzer V2.9.2 — Zapi Resilience

- Market Pulse now degrades gracefully when Zapi returns HTTP 429 or is temporarily unavailable.
- Uses a last-verified IDX snapshot only as a clearly labeled CACHED DATA fallback.
- Live Zapi data remains preferred whenever available.
- No API key is exposed to the browser.
- Broker Scanner remains in MOCK development mode and does not consume Index Alpha quota.
