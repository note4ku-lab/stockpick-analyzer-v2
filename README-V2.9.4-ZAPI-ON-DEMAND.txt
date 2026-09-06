StockPick Analyzer V2.9.4 — On-Demand Analysis

Perubahan:
- Homepage tidak lagi otomatis menjalankan /api/analyze saat dibuka.
- Top Picks hanya menampilkan placeholder sampai saham dipilih.
- Analisis teknikal Zapi hanya dipanggil ketika user klik Analisa, memilih Top Pick, atau mengganti mode.
- Market Pulse tetap mengambil /api/market dan memakai fallback/cache V2.9.2.
- Broker Scanner tetap menggunakan Mock Broker Data untuk development.

Commit message:
V2.9.4: Make stock analysis on-demand
