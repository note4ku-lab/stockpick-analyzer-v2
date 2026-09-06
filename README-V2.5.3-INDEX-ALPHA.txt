StockPick Analyzer V2.5.3 — Index Alpha Broker Diagnostic

Tujuan:
- Menguji sumber broker x saham melalui Index Alpha.
- Endpoint yang dipakai: GET /stocks/broker-summary
- API key dibaca dari Vercel Environment Variable INDEX_ALPHA_API_KEY.
- API key tidak dikirim ke browser dan tidak disimpan di repository.

Default test:
BBRI, tanggal 2026-09-04, investor=all, market=RG.

Endpoint diagnostic:
/api/broker-source-diagnostic?symbol=BBRI

Opsional:
/api/broker-source-diagnostic?symbol=BBRI&startDate=2026-09-04&endDate=2026-09-04&investor=all&market=RG

Catatan:
- Ini diagnostic saja; belum memengaruhi scoring, watchlist, atau UI.
- Index Alpha mendukung broker summary per ticker dengan buy/sell frequency, volume, value, dan weighted average price.
