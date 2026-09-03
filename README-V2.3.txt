StockPick Analyzer V2.3 — Trading Intelligence

Upgrade dari V2.2.

Perubahan utama:
1. Market Pulse IHSG diperbaiki dengan fallback index-constituent COMPOSITE jika index-summary tidak mengembalikan data.
2. Market Pulse menampilkan sumber/status data IDX secara jujur.
3. Trade Plan menampilkan method aktif dan membedakan BUY ON PULLBACK / SELL ON RETEST / WAIT.
4. Trade Plan tetap memakai parameter ATR berbeda untuk SCALPING, DAY TRADE, SWING, dan LONG SWING.
5. Confidence Breakdown ditambahkan: Trend, Moving Average, MACD, RSI, Volume, Price Action, Risk/Reward.
6. Confidence tetap bukan probabilitas profit.
7. Chart dan engine V2.2 dipertahankan.

Deploy:
- Extract ZIP.
- Upload isi folder ke repository GitHub note4ku-lab/stockpick-analyzer-v2.
- Vercel akan auto deploy.
- Pastikan environment variable ZAPI_API_KEY tetap ada di Vercel.

Catatan validasi:
- Analysis engine TypeScript berhasil dicek tanpa error.
- Full Next.js build tidak dijalankan lokal karena dependency npm install di environment kerja mengalami timeout; validasi build final dilakukan oleh Vercel.

Sumber data:
Zapi IDX API. Dokumentasi: https://zpi.web.id/api/finance/idx
