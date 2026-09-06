StockPick Analyzer V2.9.3

Zapi rate-limit UX + initial request reduction.
- Initial homepage no longer fires four parallel /api/analyze requests for Top Picks.
- Homepage analyzes BBRI once and keeps Top Picks as neutral placeholders until selected.
- HTTP 429 analysis errors are explained as temporary Zapi rate limiting instead of a generic red error.
- Market Pulse cached-data fallback remains active.

Commit message:
V2.9.3: Reduce Zapi load and improve 429 UX
