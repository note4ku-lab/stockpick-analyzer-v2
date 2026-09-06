import { NextResponse } from "next/server";

const ZAPI_RESOLVE = "https://api.zpi.web.id/v1/finance:pluang/resolve";
const ZAPI_BROKER = "https://api.zpi.web.id/v1/finance:pluang/broker-summary";

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function validSymbol(value: string) {
  return /^[A-Z0-9.-]{2,10}$/.test(value);
}

async function zapi(url: string, apiKey: string) {
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

function simplifyBrokerList(items: any[]) {
  return items.map((item) => ({
    broker: item?.broker ?? item?.code ?? null,
    lots: item?.lots ?? null,
    value: item?.value ?? null,
    averagePrice: item?.averagePrice ?? null,
  }));
}

export async function GET(request: Request) {
  const apiKey = process.env.ZAPI_API_KEY;
  const url = new URL(request.url);
  const symbol = clean(url.searchParams.get("symbol") || "BBRI").toUpperCase();
  const startDate = clean(url.searchParams.get("startDate") || "2026-08-01");
  const endDate = clean(url.searchParams.get("endDate") || "2026-09-04");

  if (!apiKey) {
    return NextResponse.json({ success: false, error: "ZAPI_API_KEY belum tersedia" }, { status: 500 });
  }
  if (!validSymbol(symbol)) {
    return NextResponse.json({ success: false, error: "Kode saham tidak valid" }, { status: 400 });
  }

  try {
    const resolve = await zapi(
      `${ZAPI_RESOLVE}?code=${encodeURIComponent(symbol)}`,
      apiKey
    );

    const stockId = resolve.data?.stockId ?? resolve.data?.data?.stockId ?? null;
    const base = `${stockId ? `stockId=${encodeURIComponent(String(stockId))}&` : ""}code=${encodeURIComponent(symbol)}&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;

    const [gross, net] = await Promise.all([
      zapi(`${ZAPI_BROKER}?${base}&net=false`, apiKey),
      zapi(`${ZAPI_BROKER}?${base}&net=true`, apiKey),
    ]);

    const grossBuyers = Array.isArray(gross.data?.buyers) ? gross.data.buyers : [];
    const grossSellers = Array.isArray(gross.data?.sellers) ? gross.data.sellers : [];
    const netBuyers = Array.isArray(net.data?.buyers) ? net.data.buyers : [];
    const netSellers = Array.isArray(net.data?.sellers) ? net.data.sellers : [];

    const target = ["AK", "BK", "XL", "XC"];
    const findTarget = (items: any[]) =>
      target.map((broker) => {
        const row = items.find((item) => String(item?.broker ?? "").toUpperCase() === broker);
        return row
          ? { broker, found: true, lots: row.lots ?? null, value: row.value ?? null, averagePrice: row.averagePrice ?? null }
          : { broker, found: false };
      });

    return NextResponse.json({
      success: true,
      symbol,
      stockId,
      source: "Zapi Pluang broker-summary",
      range: { startDate, endDate },
      resolve: {
        status: resolve.status,
        ok: resolve.ok,
        stockId,
        keys: resolve.data && typeof resolve.data === "object" ? Object.keys(resolve.data) : [],
      },
      result: gross.ok && grossBuyers.length + grossSellers.length > 0
        ? "BROKER_BY_STOCK_SOURCE_CONFIRMED"
        : "BROKER_BY_STOCK_SOURCE_NOT_CONFIRMED",
      targetBrokers: {
        grossBuyers: findTarget(grossBuyers),
        grossSellers: findTarget(grossSellers),
        netBuyers: findTarget(netBuyers),
        netSellers: findTarget(netSellers),
      },
      gross: {
        status: gross.status,
        count: gross.data?.count ?? 0,
        capped: gross.data?.capped ?? null,
        buyers: simplifyBrokerList(grossBuyers),
        sellers: simplifyBrokerList(grossSellers),
      },
      net: {
        status: net.status,
        count: net.data?.count ?? 0,
        capped: net.data?.capped ?? null,
        buyers: simplifyBrokerList(netBuyers),
        sellers: simplifyBrokerList(netSellers),
      },
      note: "Diagnostic only. Data belum dipakai untuk scoring atau watchlist. Gross menunjukkan aktivitas buy/sell; net menunjukkan posisi bersih per broker. Upstream dapat membatasi hasil ke 10 broker teratas.",
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      symbol,
      error: error instanceof Error ? error.message : "Fetch error",
    }, { status: 502 });
  }
}
