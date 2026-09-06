StockPick Analyzer V3.0 — Unified Trading Decision

V3.0 combines three signals after an on-demand stock analysis:
- Technical score: 50%
- Foreign Flow: 25%
- Broker Intelligence: 25%

Broker input uses the existing development Mock Provider, so this layer does not consume Index Alpha quota.

Decision thresholds:
- >= 68: BUY
- 33–67: WAIT
- <= 32: SELL

If technical, foreign flow, and broker directions conflict, the UI marks CONFLICT and recommends a more conservative interpretation. Confidence is a signal-strength metric, not probability of profit.

Commit message:
V3.0: Add unified trading decision engine
