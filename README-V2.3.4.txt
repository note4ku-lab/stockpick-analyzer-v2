StockPick Analyzer V2.3.4 - Market API Robust Fix

Perbaikan:
- Menghapus timeout AbortController 8 detik yang dapat menyembunyikan penyebab fetch error.
- Error fetch/network sekarang dicatat secara aman di diagnostic.
- index-summary tetap menjadi endpoint utama.
- index-constituent?code=COMPOSITE&group=all menjadi fallback.
- Tidak mengubah analysis engine, Trade Plan, Confidence Breakdown, atau chart.

Tes setelah deploy:
1. Buka /api/market
2. Jika success:true, UI Market Pulse harus menampilkan IHSG.
3. Jika gagal, kirim JSON diagnostic agar penyebab bisa ditentukan tanpa menebak.
