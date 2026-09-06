import { NextRequest, NextResponse } from "next/server";
import { analyzeStock, Candle, AnalysisMode, ForeignFlowContext } from "../../../lib/analysis-engine";

const ZAPI_HISTORY = "https://api.zpi.web.id/v1/finance:idx/stock-history";
const ZAPI_DAILY = "https://api.zpi.web.id/v1/finance:idx/trading-info-daily";
const VALID_MODES: AnalysisMode[] = ["AUTO", "SCALPING", "DAY TRADE", "SWING", "LONG SWING"];

type ZapiError = Error & { status?: number };

async function zapi(path: string, apiKey: string) {
  const response = await fetch(path, {
    headers: { "x-api-key": apiKey, Accept: "application/json" },
    cache: "no-store",
  });
  const text = await response.text();
  if (!response.ok) {
    const error: ZapiError = new Error(`Zapi IDX error (${response.status})`);
    error.status = response.status;
    throw error;
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Response Zapi bukan JSON yang valid");
  }
}

function toFinite(value: any) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function hashTicker(ticker: string) {
  return [...ticker].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
}

function buildMockData(ticker: string) {
  const hash = hashTicker(ticker);
  const base = 800 + (hash % 5200);
  const trend = ((hash % 17) - 8) / 1000;
  let close = base;
  const candles: Candle[] = [];
  const end = new Date("2026-09-04T00:00:00Z");

  for (let i = 0; i < 180; i++) {
    const d = new Date(end);
    d.setUTCDate(d.getUTCDate() - (179 - i));
    const wave = Math.sin((i + hash % 23) / 7) * base * 0.008;
    const drift = base * trend;
    const open = close;
    close = Math.max(100, close + drift + wave * 0.18 + Math.sin(i / 3 + hash) * base * 0.003);
    const high = Math.max(open, close) + Math.max(2, base * (0.004 + ((hash + i) % 4) / 1000));
    const low = Math.min(open, close) - Math.max(2, base * (0.004 + ((hash + i * 3) % 4) / 1000));
    const volume = Math.round(2_000_000 + (hash % 800_000) + Math.abs(Math.sin(i / 5)) * 1_500_000);
    candles.push({ date: d.toISOString().slice(0, 10), open, high, low, close, volume });
  }

  const recent = candles.slice(-20);
  const latest = candles.at(-1)!;
  const positive = ((hash % 5) + 1);
  const latestBuy = 25_000_000 + (hash % 20_000_000);
  const latestSell = latestBuy - (positive >= 3 ? 4_000_000 : 7_000_000);
  const latestNet = latestBuy - latestSell;
  const net5 = latestNet * positive;
  const net20 = net5 * 2;
  const foreignFlow: ForeignFlowContext = {
    latestNetShares: latestNet,
    latestBuyShares: latestBuy,
    latestSellShares: latestSell,
    latestDate: latest.date,
    net5,
    net20,
    positiveDays5: positive,
    sampleDays5: 5,
    status: latestNet > 0 && net5 > 0 ? "ACCUMULATION" : latestNet < 0 && net5 < 0 ? "DISTRIBUTION" : "NEUTRAL",
    trend: net5 > 0 && net20 > 0 ? "IMPROVING" : net5 < 0 && net20 < 0 ? "WEAKENING" : "FLAT",
  };
  return { candles, foreignFlow, latestPrice: latest.close, latestDate: latest.date, source: "DEVELOPMENT MOCK" };
}

function responseFromData(ticker: string, mode: AnalysisMode, candles: Candle[], foreignFlow: ForeignFlowContext, latestPrice: number, latestDate: string, provider: "LIVE" | "MOCK", priceSource: string) {
  const result = analyzeStock(candles, mode, foreignFlow);
  return {
    success: true,
    ticker,
    mode,
    provider,
    isMock: provider === "MOCK",
    candlesCount: candles.length,
    latestPrice,
    latestDate,
    priceSource,
    foreignFlow,
    result,
    candles: candles.slice(-120),
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const ticker = String(body.ticker || "").trim().toUpperCase();
    if (!ticker) return NextResponse.json({ success: false, error: "Kode saham tidak ditemukan" }, { status: 400 });

    const requested = String(body.mode || "AUTO").toUpperCase() as AnalysisMode;
    const mode: AnalysisMode = VALID_MODES.includes(requested) ? requested : "AUTO";
    const apiKey = process.env.ZAPI_API_KEY;
    if (!apiKey) return NextResponse.json({ success: false, error: "ZAPI_API_KEY belum tersedia di environment Vercel" }, { status: 500 });

    let history: any;
    try {
      history = await zapi(`${ZAPI_HISTORY}?code=${encodeURIComponent(ticker)}&length=250`, apiKey);
    } catch (error) {
      const zapiError = error as ZapiError;
      if (zapiError.status === 429) {
        const mock = buildMockData(ticker);
        return NextResponse.json({ ...responseFromData(ticker, mode, mock.candles, mock.foreignFlow, mock.latestPrice, mock.latestDate, "MOCK", "Development mock • Zapi rate limit (429)"), fallbackReason: "Zapi rate limit (429)" });
      }
      throw error;
    }

    const items = Array.isArray(history?.items) ? history.items : Array.isArray(history?.data?.items) ? history.data.items : [];
    const foreignHistory = items.map((item: any) => ({
      date: String(item.date ?? item.Date ?? ""),
      net: toFinite(item.netForeignShares ?? item.NetForeignShares),
      buy: toFinite(item.foreignBuyShares ?? item.ForeignBuyShares),
      sell: toFinite(item.foreignSellShares ?? item.ForeignSellShares),
    })).filter((x: any) => x.date && x.net !== null && x.buy !== null && x.sell !== null)
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const recent5 = foreignHistory.slice(-5), recent20 = foreignHistory.slice(-20), latest = foreignHistory.at(-1) ?? null;
    const latestNet = latest?.net ?? 0, latestBuy = latest?.buy ?? 0, latestSell = latest?.sell ?? 0;
    const net5 = recent5.reduce((sum: number, x: any) => sum + x.net, 0), net20 = recent20.reduce((sum: number, x: any) => sum + x.net, 0);
    const positiveDays5 = recent5.filter((x: any) => x.net > 0).length;
    const foreignFlow: ForeignFlowContext = {
      latestNetShares: latestNet, latestBuyShares: latestBuy, latestSellShares: latestSell,
      latestDate: latest?.date ?? null, net5, net20, positiveDays5, sampleDays5: recent5.length,
      status: latestNet > 0 && net5 > 0 ? "ACCUMULATION" : latestNet < 0 && net5 < 0 ? "DISTRIBUTION" : "NEUTRAL",
      trend: net5 > 0 && net20 > 0 ? "IMPROVING" : net5 < 0 && net20 < 0 ? "WEAKENING" : "FLAT",
    };

    const candles: Candle[] = items.map((item: any) => ({
      date: String(item.date ?? item.Date ?? ""), open: Number(item.open ?? item.Open ?? item.openPrice), high: Number(item.high ?? item.High), low: Number(item.low ?? item.Low), close: Number(item.close ?? item.Close ?? item.last), volume: Number(item.volume ?? item.Volume),
    })).filter((c: Candle) => Object.values(c).every((v, i) => i === 0 || Number.isFinite(v)))
      .sort((a: Candle, b: Candle) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (candles.length < 100) return NextResponse.json({ success: false, error: `Data ${ticker} hanya memiliki ${candles.length} candle. Minimal 100 candle.` }, { status: 400 });

    let daily: any = null;
    try { daily = await zapi(`${ZAPI_DAILY}?code=${encodeURIComponent(ticker)}`, apiKey); } catch (error) {
      const status = (error as ZapiError).status;
      if (status !== 429) console.warn("Zapi daily quote failed", error);
    }
    const historyLatest = candles[candles.length - 1];
    const dailyQuote = daily?.data ?? daily?.item ?? daily;
    const latestPrice = Number(dailyQuote?.close ?? dailyQuote?.last ?? dailyQuote?.price ?? historyLatest.close);
    const latestDate = String(dailyQuote?.date ?? historyLatest.date);

    return NextResponse.json(responseFromData(ticker, mode, candles, foreignFlow, Number.isFinite(latestPrice) ? latestPrice : historyLatest.close, latestDate, "LIVE", dailyQuote?.close != null ? "Zapi IDX trading-info-daily" : "Zapi IDX stock-history"));
  } catch (error) {
    console.error("Analyze API error:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Gagal melakukan analisis saham" }, { status: 500 });
  }
}
