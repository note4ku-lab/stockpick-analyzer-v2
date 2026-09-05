import { NextResponse } from "next/server";

const ZAPI_HISTORY = "https://api.zpi.web.id/v1/finance:idx/stock-history";

function toFinite(value: any) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
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
    const response = await fetch(
      `${ZAPI_HISTORY}?code=${encodeURIComponent(symbol)}&length=20`,
      {
        headers: {
          "x-api-key": apiKey,
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );

    const text = await response.text();
    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text.slice(0, 1000) };
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          symbol,
          status: response.status,
          error: "Zapi stock-history gagal",
          responseKeys:
            data && typeof data === "object" ? Object.keys(data) : [],
        },
        { status: 502 }
      );
    }

    const items = Array.isArray(data?.items)
      ? data.items
      : Array.isArray(data?.data?.items)
        ? data.data.items
        : [];

    const rows = items
      .map((item: any) => ({
        date: String(item.date ?? item.Date ?? ""),
        foreignBuyShares: toFinite(
          item.foreignBuyShares ?? item.ForeignBuyShares
        ),
        foreignSellShares: toFinite(
          item.foreignSellShares ?? item.ForeignSellShares
        ),
        netForeignShares: toFinite(
          item.netForeignShares ?? item.NetForeignShares
        ),
      }))
      .filter(
        (x: any) =>
          x.date &&
          x.foreignBuyShares !== null &&
          x.foreignSellShares !== null &&
          x.netForeignShares !== null
      )
      .sort(
        (a: any, b: any) =>
          new Date(a.date).getTime() - new Date(b.date).getTime()
      );

    const recent5 = rows.slice(-5);
    const recent20 = rows.slice(-20);
    const latest = rows.at(-1) ?? null;
    const net5 = recent5.reduce(
      (sum: number, x: any) => sum + x.netForeignShares,
      0
    );
    const net20 = recent20.reduce(
      (sum: number, x: any) => sum + x.netForeignShares,
      0
    );

    return NextResponse.json({
      success: true,
      symbol,
      source: "Zapi IDX stock-history",
      unit: "shares",
      latest,
      summary: {
        tradingDays: rows.length,
        net5,
        net20,
        positiveDays5: recent5.filter((x: any) => x.netForeignShares > 0).length,
        sampleDays5: recent5.length,
        recent5,
      },
      rawKeys:
        items[0] && typeof items[0] === "object"
          ? Object.keys(items[0])
          : [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Fetch error",
      },
      { status: 502 }
    );
  }
}
