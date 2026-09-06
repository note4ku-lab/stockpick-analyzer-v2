STOCKPICK ANALYZER V2.8.2 — MOCK BROKER DATA + PROVIDER ARCHITECTURE

Tujuan:
- Broker Scanner tidak lagi bergantung pada kuota Index Alpha selama development.
- Default scanner menggunakan Mock Broker Data yang deterministik berdasarkan ticker/tanggal.
- Struktur provider sudah disiapkan untuk LIVE Index Alpha dan AUTO fallback.

Mode provider:
1. MOCK (default)
   Tidak memanggil Index Alpha dan tidak mengurangi kuota.
2. LIVE
   Memanggil Index Alpha /stocks/broker-summary/batch menggunakan INDEX_ALPHA_API_KEY.
3. AUTO
   Mencoba Index Alpha jika API key tersedia; bila gagal, fallback ke Mock Data.

Saat ini UI sengaja mengirim providerMode: mock agar setiap pengujian Broker Scanner aman terhadap kuota.

PENTING:
- Mock Data hanya untuk pengembangan UI, scoring, watchlist, dan algoritma.
- Mock Data bukan data pasar nyata dan tidak boleh dipakai sebagai dasar keputusan trading.
- API key tetap server-side melalui Vercel Environment Variable INDEX_ALPHA_API_KEY.

Workflow pengguna:
Download ZIP → Extract All → Upload ke GitHub → tunggu Vercel deploy → screenshot hasil.
Jangan gunakan VS Code.
