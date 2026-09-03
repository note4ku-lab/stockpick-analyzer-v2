StockPick Analyzer V2.2

Fokus:
- Market Pulse membaca schema resmi Zapi IDX index-summary (IndexCode/Close/Previous/Change/Date).
- Chart harian menggunakan candle OHLC dari stock-history, plus volume dan MA20.
- Chart menampilkan Entry, SL, TP1, TP2 dari engine.
- Trade Plan membedakan BUY ON PULLBACK dan SELL ON RETEST.
- Stop loss diperbaiki agar selalu berada di sisi protektif dari entry.
- Data market diberi label IDX DATA, bukan LIVE, karena endpoint yang digunakan adalah data IDX/daily.

Environment:
ZAPI_API_KEY wajib diisi di Vercel. Jangan commit .env.local atau API key.
