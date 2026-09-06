import { NextResponse } from "next/server";

const INDEX_ALPHA_BASE = "https://api.indexalpha.id";

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function validSymbol(value: string) {
  return /^[A-Z0-9.-]{2,10}$/.test(value);
}

function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function simplify(rows: any[]) {
  return rows.map((row) => ({
    broker: row?.code ?? null,
    buyFreq: row?.buy_freq ?? null,
    buyVolume: row?.buy_volume ?? null,
    buyValue: row?.buy_value ?? null,
    sellFreq: row?.sell_freq ?? null,
    sellVolume: row?.sell_volume ?? null,
    sellValue: row?.sell_value ?? null,
    buyAvg: row?.buy_avg ?? null,
    sellAvg: row?.sell_avg ?? null,
  }));
}

export async function GET(request: Request) {
  const apiKey = process.env.INDEX_ALPHA_API_KEY;
  const url = new URL(request.url);
  const symbol = clean(url.searchParams.get("symbol") || "BBRI").toUpperCase();
  const startDate = clean(url.searchParams.get("startDate") || "2026-09-04");
  const endDate = clean(url.searchParams.get("endDate") || startDate);
  const investor = clean(url.searchParams.get("investor") || "all");
  const market = clean(url.searchParams.get("market") || "RG");

  if (!apiKey) {
    return NextResponse.json({ success: false, error: "INDEX_ALPHA_API_KEY belum tersedia di Vercel" }, { status: 500 });
  }
  if (!validSymbol(symbol)) {
    return NextResponse.json({ success: false, error: "Kode saham tidak valid" }, { status: 400 });
  }
  if (!validDate(startDate) || !validDate(endDate)) {
    return NextResponse.json({ success: false, error: "Tanggal harus YYYY-MM-DD" }, { status: 400 });
  }

  try {
    const params = new URLSearchParams({
      ticker: symbol,
      from: startDate,
      to: endDate,
      investor,
      market,
    });

    const response = await fetch(
      `${INDEX_ALPHA_BASE}/stocks/broker-summary?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );

    const text = await response.text();
    let body: any = null;
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text.slice(0, 1500) };
    }

    const rows = Array.isArray(body?.data) ? body.data : [];
    const target = ["AK", "BK", "XL", "XC"];
    const findTarget = (code: string) => {
      const row = rows.find((item: any) => String(item?.code ?? "").toUpperCase() === code);
      return row
        ? {
            broker: code,
            found: true,
            buyVolume: row.buy_volume ?? null,
            buyValue: row.buy_value ?? null,
            buyAvg: row.buy_avg ?? null,
            sellVolume: row.sell_volume ?? null,
            sellValue: row.sell_value ?? null,
            sellAvg: row.sell_avg ?? null,
          }
        : { broker: code, found: false };
    };

    return NextResponse.json({
      success: true,
      symbol,
      source: "Index Alpha /stocks/broker-summary",
      range: { startDate, endDate },
      investor,
      market,
      upstream: {
        status: response.status,
        ok: response.ok,
        success: body?.success ?? null,
        error: body?.error ?? null,
        count: rows.length,
      },
      result: response.ok && rows.length > 0
        ? "BROKER_BY_STOCK_SOURCE_CONFIRMED"
        : "BROKER_BY_STOCK_SOURCE_NOT_CONFIRMED",
      targetBrokers: {
        AK: findTarget("AK"),
        BK: findTarget("BK"),
        XL: findTarget("XL"),
        XC: findTarget("XC"),
      },
      brokers: simplify(rows),
      note: "Diagnostic only. Data belum dipakai untuk scoring atau watchlist. Index Alpha mengembalikan satu baris per broker; rentang multi-hari diagregasi, sedangkan from=to menghasilkan data satu hari.",
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      symbol,
      error: error instanceof Error ? error.message : "Fetch error",
    }, { status: 502 });
  }
}
