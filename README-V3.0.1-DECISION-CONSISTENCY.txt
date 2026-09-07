StockPick Analyzer V3.0.1 — Decision Consistency Fix

Perbaikan:
- Unified Decision menjadi sumber utama signal dan confidence pada tampilan analyzer.
- Confidence Breakdown memakai confidence Unified Decision yang sama.
- Judul saham dan “Kenapa …?” mengikuti keputusan Unified (BUY/WAIT/SELL).
- Jika Unified berbeda dengan sinyal teknikal, Trade Plan ditahan menjadi WAIT agar tidak menampilkan rencana entry yang bertentangan dengan keputusan akhir.
- Mode AUTO menampilkan metode yang dipilih mesin, misalnya AUTO → LONG SWING.
- AI Insight mengikuti keputusan dan confidence Unified.

Catatan:
- Confidence bukan probabilitas profit.
- Broker tetap Mock Data untuk development.
