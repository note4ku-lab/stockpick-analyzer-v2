STOCKPICK ANALYZER V2.9 — BROKER INTELLIGENCE

Tujuan:
- Mengubah hasil Broker Scanner menjadi ringkasan yang mudah dibaca.
- Menggabungkan target broker BUY dan SELL menjadi metrik net broker flow.
- Menampilkan sinyal aktivitas broker: AKUMULASI / DISTRIBUSI / NETRAL.
- Menampilkan strength, buy dominance, net value, net volume, serta narasi singkat.

Rumus utama:
- Buy Value = total Buy Value broker target BUY.
- Sell Value = total Sell Value broker target SELL.
- Net Broker Flow = Buy Value - Sell Value.
- Buy Dominance = Buy Value / (Buy Value + Sell Value).
- Strength = |Net Broker Flow| / (Buy Value + Sell Value) x 100, dibatasi 100.

Catatan penting:
- Data default masih Mock Broker Data untuk development.
- Mock Data bukan data pasar nyata dan tidak boleh dipakai sebagai dasar keputusan trading.
- Broker Intelligence adalah interpretasi aktivitas broker target, bukan prediksi harga.
- Provider LIVE tetap tersedia di server route dan dapat diaktifkan setelah modul siap.

Workflow:
Download ZIP → Extract All → Upload ke GitHub → tunggu Vercel deploy → screenshot hasil.
Jangan gunakan VS Code.
