import { NextResponse } from "next/server";

const ZAPI_BASE = "https://api.zpi.web.id/v1/finance:idx";

function rowsFrom(data: any): any[] {
  const candidates = [
    data?.data,
    data?.items,
    data?.content,
    data?.result,
    data?.data?.items,
    data?.data?.content,
  ];
  for (const value of candidates) {
    if (Array.isArray(value)) return value;
  }
  return [];
}

function num(...values: any[]) {
  for (const value of values) {
    const x = Number(value);
    if (Number.isFinite(x)) return x;
  }
  return null;
}

export async function GET(request: Request) {
  const apiKey = process.env.ZAPI_API_KEY;
  const url = new URL(request.url);
  const symbol = String(url.searchParams.get("symbol") || "BBRI")
    .trim()
    .toUpperCase();

  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: "ZAPI_API_KEY belum tersedia" },
      { status: 500 }
    );
  }

  if (!/^[A-Z0-9.-]{2,10}$/.test(symbol)) {
    return NextResponse.json(
      { success: false, error: "Kode saham tidak valid" },
      { status: 400 }
    );
  }

  try {
    // The diagnostic intentionally uses GET and does not expose the API key.
    // Query both common documented parameter forms so we can see which
    // response shape the current Zapi account returns.
    const endpoints = [
      `foreign-flow?symbol=${encodeURIComponent(symbol)}&length=20&start=0`,
      `foreign-flow?code=${encodeURIComponent(symbol)}&length=20&start=0`,
    ];

    const results = [];

    for (const path of endpoints) {
      const response = await fetch(`${ZAPI_BASE}/${path}`, {
        headers: {
          "x-api-key": apiKey,
          Accept: "application/json",
        },
        cache: "no-store",
      });

      const text = await response.text();
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text.slice(0, 1000) };
      }

      const rows = rowsFrom(data);

      results.push({
        endpoint: path,
        status: response.status,
        ok: response.ok,
        keys:
          data && typeof data === "object"
            ? Object.keys(data).slice(0, 20)
            : [],
        count: rows.length,
        sampleKeys:
          rows[0] && typeof rows[0] === "object"
            ? Object.keys(rows[0]).slice(0, 30)
            : [],
        sample: rows.slice(0, 5).map((row: any) => ({
          date: row.date ?? row.Date ?? row.tanggal ?? null,
          foreignBuy: num(
            row.foreignBuy,
            row.ForeignBuy,
            row.foreign_buy,
            row.buyForeign,
            row.BuyForeign
          ),
          foreignSell: num(
            row.foreignSell,
            row.ForeignSell,
            row.foreign_sell,
            row.sellForeign,
            row.SellForeign
          ),
          netForeign: num(
            row.netForeign,
            row.NetForeign,
            row.net_foreign,
            row.foreignNet,
            row.ForeignNet
          ),
        })),
      });
    }

    const successful = results.find((item) => item.ok && item.count > 0);

    return NextResponse.json({
      success: Boolean(successful),
      symbol,
      message: successful
        ? "Foreign Flow berhasil ditemukan."
        : "Foreign Flow belum ditemukan. Lihat diagnostic untuk status dan bentuk response Zapi.",
      diagnostic: results,
      note: "Endpoint diagnostic GET. API key tidak dikirim ke browser.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? `Fetch error: ${error.message}`
            : "Fetch error",
      },
      { status: 502 }
    );
  }
}
