StockPick Analyzer V3.2 — Multi-Timeframe Diagnostic

Commit message:
V3.2: Add multi-timeframe diagnostic

Tujuan:
- Menyiapkan fondasi Multi-Timeframe Analysis tanpa mengarang data intraday.
- 1D ditandai READY karena Zapi IDX stock-history menyediakan candle harian.
- 4H, 1H, dan 15M ditandai NOT AVAILABLE sampai ada sumber candle intraday yang tervalidasi.

Catatan:
Jangan menjadikan 4H/1H/15M sebagai sinyal aktif sebelum provider candle intraday tersedia.
