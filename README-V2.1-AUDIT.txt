STOCKPICK ANALYZER V2.1 - ENGINE AUDIT

Perbaikan:
- Trade Plan tidak lagi memakai persentase stop loss statis yang bisa terlalu jauh dari harga.
- Stop loss memakai kombinasi ATR + struktur support/resistance dan parameter berbeda untuk setiap mode.
- TP1/TP2 dihitung dari risk multiple per mode, dengan penyesuaian terhadap resistance/support.
- Confidence dibatasi sebagai confidence sinyal, bukan probabilitas profit.
- Scoring mode-aware: SCALPING, DAY TRADE, SWING, LONG SWING menggunakan bobot berbeda.
- Analisis membutuhkan minimal 100 candle agar MA100 tersedia dengan lebih stabil.
- API mengambil stock-history dan trading-info-daily; harga tampilan memakai quote harian jika tersedia.
- Ditambahkan /api/market untuk IHSG dari Zapi index-summary.
- UI tidak lagi menampilkan IHSG placeholder sebagai seolah-olah live; jika data tidak tersedia ditulis jelas.

Catatan data:
- Zapi stock-history adalah data harian; trading-info-daily juga merupakan ringkasan perdagangan harian. Jangan menyebutnya tick-by-tick real-time tanpa sumber streaming khusus.
- Confidence bukan peluang profit.
