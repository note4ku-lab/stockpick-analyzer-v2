StockPick Analyzer V2.6.1 — Broker Detail Audit

Tujuan:
- Menampilkan detail angka broker target tanpa request API tambahan.
- Audit AK/BK/XL/XC: Buy/Sell Volume, Net Volume, Buy/Sell Value, Net Value, Buy/Sell Average, dan Frequency.
- Status BUY/SELL/NO_ACTIVITY/MIXED mengikuti logika V2.6.

Sumber data:
- Index Alpha /stocks/broker-summary/batch
- API key tetap server-side melalui INDEX_ALPHA_API_KEY.

Catatan:
- Detail audit memakai data yang sudah diterima oleh Broker Scanner, sehingga tidak menambah request Index Alpha saat tombol Detail Broker dibuka.
- Status broker bukan sinyal BUY otomatis.
