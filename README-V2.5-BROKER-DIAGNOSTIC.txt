STOCKPICK ANALYZER V2.5 — BROKER SCANNER DIAGNOSTIC

Tujuan:
- Memvalidasi apakah IDX raw endpoint TradingSummary/GetBrokerSummary dapat mengembalikan data broker × saham dengan sisi BUY dan SELL.
- Contoh target: broker AK/BK BUY dan XL/XC SELL pada saham tertentu.

Endpoint internal:
GET /api/broker-diagnostic?symbol=BBRI
GET /api/broker-diagnostic?symbol=BBRI&date=20260904

PENTING:
- Tahap ini diagnostik saja.
- Belum mengubah confidence engine.
- Belum otomatis memasukkan saham ke Watchlist.
- API key tetap berada di server melalui ZAPI_API_KEY.

Alasan dibuat diagnostik terlebih dahulu:
Dokumentasi Zapi menyatakan broker-summary sebagai agregat per broker untuk seluruh market dan tidak mendokumentasikan broker × stock buy/sell. Zapi juga menyediakan raw passthrough ke endpoint IDX /primary/, sehingga tahap ini menguji apakah TradingSummary/GetBrokerSummary pada raw IDX memberi struktur yang lebih detail.
