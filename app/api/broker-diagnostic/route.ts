import { NextResponse } from "next/server";

const ZAPI_RAW = "https://api.zpi.web.id/v1/finance:idx/raw";

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function validSymbol(value: string) {
  return /^[A-Z0-9.-]{2,10}$/.test(value);
}

function extractRows(data: any): any[] {
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data?.items)) return data.data.items;
  return [];
}

function inspectRows(rows: any[]) {
  const sample = rows.slice(0, 5);
  const keys = Array.from(
    new Set(sample.flatMap((row) =>
      row && typeof row === "object" ? Object.keys(row) : []
    ))
  );

  const stockKeys = ["StockCode", "stockCode", "KodeEmiten", "code", "Code"];
  const buyKeys = [
    "BuyVolume", "buyVolume", "Buy", "buy", "BuyLot", "buyLot",
    "VolumeBuy", "volumeBuy", "BuyerVolume", "buyerVolume"
  ];
  const sellKeys = [
    "SellVolume", "sellVolume", "Sell", "sell", "SellLot", "sellLot",
    "VolumeSell", "volumeSell", "SellerVolume", "sellerVolume"
  ];

  const hasAny = (row: any, candidates: string[]) =>
    candidates.some((key) => Object.prototype.hasOwnProperty.call(row ?? {}, key));

  return {
    count: rows.length,
    keys,
    hasStockIdentifier: sample.some((row) => hasAny(row, stockKeys)),
    hasBuyField: sample.some((row) => hasAny(row, buyKeys)),
    hasSellField: sample.some((row) => hasAny(row, sellKeys)),
    sample,
  };
}

async function callRaw(apiKey: string, path: string, query: string) {
  const url = `${ZAPI_RAW}?path=${encodeURIComponent(path)}&query=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: { "x-api-key": apiKey, Accept: "application/json" },
    cache: "no-store",
  });
  const text = await response.text();
  let data: any = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text.slice(0, 1200) };
  }
  return { status: response.status, ok: response.ok, data };
}

export async function GET(request: Request) {
  const apiKey = process.env.ZAPI_API_KEY;
  const url = new URL(request.url);
  const symbol = clean(url.searchParams.get("symbol") || "BBRI").toUpperCase();
  const date = clean(url.searchParams.get("date") || "");

  if (!apiKey) {
    return NextResponse.json({ success: false, error: "ZAPI_API_KEY belum tersedia" }, { status: 500 });
  }

  if (!validSymbol(symbol)) {
    return NextResponse.json({ success: false, error: "Kode saham tidak valid" }, { status: 400 });
  }

  const datePart = date ? `&date=${encodeURIComponent(date)}` : "";
  const queries = [
    `length=100&start=0&kodeEmiten=${encodeURIComponent(symbol)}${datePart}`,
    `length=100&start=0&code=${encodeURIComponent(symbol)}${datePart}`,
  ];

  const attempts = [] as any[];

  for (const query of queries) {
    try {
      const result = await callRaw(apiKey, "TradingSummary/GetBrokerSummary", query);
      const rows = extractRows(result.data);
      attempts.push({
        path: "TradingSummary/GetBrokerSummary",
        query,
        status: result.status,
        ok: result.ok,
        topLevelKeys: result.data && typeof result.data === "object" ? Object.keys(result.data) : [],
        inspection: inspectRows(rows),
      });
    } catch (error) {
      attempts.push({
        path: "TradingSummary/GetBrokerSummary",
        query,
        status: 0,
        ok: false,
        error: error instanceof Error ? error.message : "Fetch error",
      });
    }
  }

  const useful = attempts.find(
    (attempt) => attempt.ok && attempt.inspection?.hasStockIdentifier && attempt.inspection?.hasBuyField && attempt.inspection?.hasSellField
  );

  return NextResponse.json({
    success: true,
    symbol,
    date: date || null,
    source: "Zapi IDX raw → TradingSummary/GetBrokerSummary",
    result: useful
      ? "POTENTIAL_BROKER_BY_STOCK_SOURCE_FOUND"
      : "BROKER_BY_STOCK_NOT_CONFIRMED",
    attempts,
    note:
      "Diagnostic only. API key tetap di server. Data belum dipakai untuk scoring atau watchlist sampai struktur broker×stock buy/sell tervalidasi.",
  });
}
