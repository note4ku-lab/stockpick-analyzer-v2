StockPick Analyzer V2.5.1 - Broker Source Diagnostic

Tujuan:
- Menguji sumber Zapi Pluang Broker Summary per saham.
- Tidak mengubah scoring, watchlist, atau UI utama.
- Menguji broker AK, BK, XL, XC pada data BBRI.

Endpoint:
/api/broker-source-diagnostic?symbol=BBRI&startDate=2026-08-01&endDate=2026-09-04

Data yang diuji:
- Gross BUY broker
- Gross SELL broker
- Net BUY broker
- Net SELL broker
- Target broker AK/BK/XL/XC

Catatan:
- API key hanya berada di server.
- Upstream broker-summary dapat membatasi hasil ke 10 broker teratas.
- Diagnostic harus berhasil dan struktur data harus tervalidasi sebelum Broker Scanner dibuat.
