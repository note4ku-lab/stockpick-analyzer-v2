StockPick Analyzer V2.4.1 - Foreign Flow Diagnostic

Tujuan:
- Memvalidasi data Foreign Flow BBRI langsung dari server tanpa mengubah /api/analyze.
- Endpoint GET baru: /api/foreign-flow?symbol=BBRI
- Tidak mengekspos ZAPI_API_KEY.
- Menguji dua bentuk parameter umum (symbol dan code).
- Menampilkan status HTTP, jumlah baris, sample keys, dan sample foreign buy/sell/net.

Setelah deploy:
1. Buka /api/foreign-flow?symbol=BBRI
2. Kirim screenshot JSON hasilnya.
3. Jangan membuat perubahan engine sebelum data mentah tervalidasi.
