StockPick Analyzer V2.4.2 - Foreign Flow Source Fix

Perbaikan utama:
- Foreign Flow multi-day sekarang 100% dihitung dari Zapi stock-history.
- Tidak lagi mengandalkan endpoint foreign-flow untuk histori 5D/20D.
- Riwayat Foreign Flow diurutkan berdasarkan tanggal perdagangan sebelum mengambil 5D/20D.
- Latest Foreign Buy/Sell/Net memakai hari perdagangan terbaru.
- Menambahkan endpoint GET diagnostic:
  /api/foreign-flow?symbol=BBRI
- Endpoint diagnostic menampilkan data 5 hari terakhir, net 5D/20D, dan jumlah hari net buy.
- Engine, Trade Plan, Chart, dan Market Pulse dipertahankan.

Setelah deploy:
1. Buka /api/foreign-flow?symbol=BBRI
2. Pastikan success:true dan data recent5 terisi.
3. Setelah itu tes halaman utama BBRI dan bandingkan Arus Asing.
