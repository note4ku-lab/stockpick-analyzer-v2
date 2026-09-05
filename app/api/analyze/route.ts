import { NextRequest, NextResponse } from "next/server";
import { analyzeStock, Candle, AnalysisMode, ForeignFlowContext } from "../../../lib/analysis-engine";

const ZAPI_HISTORY = "https://api.zpi.web.id/v1/finance:idx/stock-history";
const ZAPI_DAILY = "https://api.zpi.web.id/v1/finance:idx/trading-info-daily";
const VALID_MODES: AnalysisMode[] = ["AUTO", "SCALPING", "DAY TRADE", "SWING", "LONG SWING"];

async function zapi(path: string, apiKey: string) {
  const response = await fetch(path, {
    headers: { "x-api-key": apiKey, Accept: "application/json" },
    cache: "no-store",
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Zapi IDX error (${response.status})`);
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const ticker = String(body.ticker || "").trim().toUpperCase();
    if (!ticker) {
      return NextResponse.json({ success: false, error: "Kode saham tidak ditemukan" }, { status: 400 });
    }

    const requested = String(body.mode || "AUTO").toUpperCase() as AnalysisMode;
    const mode: AnalysisMode = VALID_MODES.includes(requested) ? requested : "AUTO";
    const apiKey = process.env.ZAPI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "ZAPI_API_KEY belum tersedia di environment Vercel" },
        { status: 500 }
      );
    }

    // Stock History is the authoritative source for the multi-day Foreign Flow
    // used by this app. It returns one row per trading day and includes
    // foreignBuyShares, foreignSellShares and netForeignShares.
    const [history, daily] = await Promise.all([
      zapi(`${ZAPI_HISTORY}?code=${encodeURIComponent(ticker)}&length=250`, apiKey),
      zapi(`${ZAPI_DAILY}?code=${encodeURIComponent(ticker)}`, apiKey).catch(() => null),
    ]);

    const items = Array.isArray(history?.items)
      ? history.items
      : Array.isArray(history?.data?.items)
        ? history.data.items
        : [];

    const foreignHistory = items
      .map((item: any) => ({
        date: String(item.date ?? item.Date ?? ""),
        net: toFinite(item.netForeignShares ?? item.NetForeignShares),
        buy: toFinite(item.foreignBuyShares ?? item.ForeignBuyShares),
        sell: toFinite(item.foreignSellShares ?? item.ForeignSellShares),
      }))
      .filter(
        (x: any) =>
          x.date &&
          x.net !== null &&
          x.buy !== null &&
          x.sell !== null
      )
      .sort(
        (a: any, b: any) =>
          new Date(a.date).getTime() - new Date(b.date).getTime()
      );

    const recent5 = foreignHistory.slice(-5);
    const recent20 = foreignHistory.slice(-20);
    const latest = foreignHistory.at(-1) ?? null;

    const latestNet = latest?.net ?? 0;
    const latestBuy = latest?.buy ?? 0;
    const latestSell = latest?.sell ?? 0;
    const net5 = recent5.reduce((sum: number, x: any) => sum + x.net, 0);
    const net20 = recent20.reduce((sum: number, x: any) => sum + x.net, 0);
    const positiveDays5 = recent5.filter((x: any) => x.net > 0).length;
    const sampleDays5 = recent5.length;

    const status: ForeignFlowContext["status"] =
      latestNet > 0 && net5 > 0
        ? "ACCUMULATION"
        : latestNet < 0 && net5 < 0
          ? "DISTRIBUTION"
          : "NEUTRAL";

    const trend: ForeignFlowContext["trend"] =
      net5 > 0 && net20 > 0
        ? "IMPROVING"
        : net5 < 0 && net20 < 0
          ? "WEAKENING"
          : "FLAT";

    const foreignFlow: ForeignFlowContext = {
      latestNetShares: latestNet,
      latestBuyShares: latestBuy,
      latestSellShares: latestSell,
      latestDate: latest?.date ?? null,
      net5,
      net20,
      positiveDays5,
      sampleDays5,
      status,
      trend,
    };

    const candles: Candle[] = items
      .map((item: any) => ({
        date: String(item.date ?? item.Date ?? ""),
        open: Number(item.open ?? item.Open ?? item.openPrice),
        high: Number(item.high ?? item.High),
        low: Number(item.low ?? item.Low),
        close: Number(item.close ?? item.Close ?? item.last),
        volume: Number(item.volume ?? item.Volume),
      }))
      .filter((c: Candle) =>
        Object.values(c).every((v, i) => i === 0 || Number.isFinite(v))
      )
      .sort(
        (a: Candle, b: Candle) =>
          new Date(a.date).getTime() - new Date(b.date).getTime()
      );

    if (candles.length < 100) {
      return NextResponse.json(
        {
          success: false,
          error: `Data ${ticker} hanya memiliki ${candles.length} candle. Minimal 100 candle.`,
        },
        { status: 400 }
      );
    }

    const result = analyzeStock(candles, mode, foreignFlow);
    const historyLatest = candles[candles.length - 1];
    const dailyQuote = daily?.data ?? daily?.item ?? daily;
    const latestPrice = Number(
      dailyQuote?.close ?? dailyQuote?.last ?? dailyQuote?.price ?? historyLatest.close
    );
    const latestDate = String(dailyQuote?.date ?? historyLatest.date);

    return NextResponse.json({
      success: true,
      ticker,
      mode,
      candlesCount: candles.length,
      latestPrice: Number.isFinite(latestPrice) ? latestPrice : historyLatest.close,
      latestDate,
      priceSource:
        dailyQuote?.close != null
          ? "Zapi IDX trading-info-daily"
          : "Zapi IDX stock-history",
      foreignFlow,
      result,
      candles: candles.slice(-120),
    });
  } catch (error) {
    console.error("Analyze API error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Gagal melakukan analisis saham",
      },
      { status: 500 }
    );
  }
}
