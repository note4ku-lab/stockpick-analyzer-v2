StockPick Analyzer V2.7 - Broker Intelligence

Upgrade dari V2.6.1:
- Detail audit broker menampilkan Buy/Sell Volume, Net Volume, Buy/Sell Value, Net Value, Buy/Sell Average, Frequency.
- Net Value dibuat lebih mudah dibaca dalam format Rupiah.
- Broker classification memakai dominasi Net Value dan dikonfirmasi Net Volume.
- Broker match score mempertimbangkan jumlah broker yang sesuai dan kekuatan net flow.
- Tetap memakai Index Alpha di server melalui INDEX_ALPHA_API_KEY.
- Tidak menyimpan API key di source code.

Catatan:
Broker match bukan sinyal BUY otomatis. Gunakan sebagai filter awal lalu konfirmasi dengan foreign flow, teknikal, price action, dan trade plan.
