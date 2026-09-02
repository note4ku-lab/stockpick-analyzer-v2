STOCKPICK ANALYZER V2 - UI/UX REBUILD

Perubahan utama:
- UI mobile-first dark premium sesuai mockup final.
- Alur decision-first: saham -> BUY/HOLD/SELL -> Confidence -> Trade Plan -> alasan -> chart -> Detail Analysis.
- AUTO / SCALPING / DAY TRADE / SWING / LONG SWING tetap dipertahankan dan mode memengaruhi setup trade plan.
- Trade Plan menampilkan Entry Zone, Stop Loss, TP1, TP2, Risk/Reward, Support, Resistance dan timeframe.
- Confidence dan signal dihitung dari engine teknikal, bukan teks dekoratif.
- Chart harga memakai candle historis yang dikembalikan API.
- Detail Analysis memiliki tab Ringkasan, Teknikal, AI Insight dan Fundamental.
- Endpoint Zapi IDX tetap server-side dan ZAPI_API_KEY tetap dari environment variable.
- API sekarang mengembalikan 120 candle terakhir untuk chart.

CATATAN:
- Angka BBRI/Top Picks bukan angka mockup tetap; halaman memanggil /api/analyze.
- Modul Fundamental masih placeholder karena endpoint project saat ini hanya menyediakan data historis harga/volume.
- IHSG/foreign flow/news belum dihubungkan karena belum ada sumber data tersebut di project ZIP ini.

DEPLOY:
1. Replace file sesuai struktur project.
2. Pastikan ZAPI_API_KEY tersedia di Vercel Environment Variables.
3. Commit/push ke repository.
4. Tunggu deployment Vercel Ready.
5. Tes BBRI, BMRI, ANTM, INCO dan semua mode.
