import { NextRequest, NextResponse } from "next/server";
import { analyzeStock, Candle, AnalysisMode } from "../../../lib/analysis-engine";

const ZAPI_HISTORY = "https://api.zpi.web.id/v1/finance:idx/stock-history";
const ZAPI_DAILY = "https://api.zpi.web.id/v1/finance:idx/trading-info-daily";
const VALID_MODES: AnalysisMode[] = ["AUTO", "SCALPING", "DAY TRADE", "SWING", "LONG SWING"];

async function zapi(path:string, apiKey:string) {
  const response = await fetch(path, { headers: { "x-api-key": apiKey }, cache: "no-store" });
  const text = await response.text();
  if (!response.ok) throw new Error(`Zapi IDX error (${response.status})`);
  try { return JSON.parse(text); } catch { throw new Error("Response Zapi bukan JSON yang valid"); }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const ticker = String(body.ticker || "").trim().toUpperCase();
    if (!ticker) return NextResponse.json({ success:false, error:"Kode saham tidak ditemukan" }, { status:400 });

    const requested = String(body.mode || "AUTO").toUpperCase() as AnalysisMode;
    const mode:AnalysisMode = VALID_MODES.includes(requested) ? requested : "AUTO";
    const apiKey = process.env.ZAPI_API_KEY;
    if (!apiKey) return NextResponse.json({ success:false, error:"ZAPI_API_KEY belum tersedia di environment Vercel" }, { status:500 });

    const [history, daily] = await Promise.all([
      zapi(`${ZAPI_HISTORY}?code=${encodeURIComponent(ticker)}&length=250`, apiKey),
      zapi(`${ZAPI_DAILY}?code=${encodeURIComponent(ticker)}`, apiKey).catch(() => null),
    ]);

    const items = Array.isArray(history?.items) ? history.items : Array.isArray(history?.data?.items) ? history.data.items : [];
    const candles:Candle[] = items.map((item:any) => ({
      date:String(item.date ?? item.Date ?? ""),
      open:Number(item.open ?? item.Open ?? item.openPrice),
      high:Number(item.high ?? item.High),
      low:Number(item.low ?? item.Low),
      close:Number(item.close ?? item.Close ?? item.last),
      volume:Number(item.volume ?? item.Volume),
    })).filter((c:Candle) => Object.values(c).every((v,i) => i === 0 || Number.isFinite(v))).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (candles.length < 100) return NextResponse.json({ success:false, error:`Data ${ticker} hanya memiliki ${candles.length} candle. Minimal 100 candle.` }, { status:400 });

    const result = analyzeStock(candles, mode);
    const historyLatest = candles[candles.length - 1];
    const dailyQuote = daily?.data ?? daily?.item ?? daily;
    const latestPrice = Number(dailyQuote?.close ?? dailyQuote?.last ?? dailyQuote?.price ?? historyLatest.close);
    const latestDate = String(dailyQuote?.date ?? historyLatest.date);

    return NextResponse.json({
      success:true,
      ticker,
      mode,
      candlesCount:candles.length,
      latestPrice:Number.isFinite(latestPrice) ? latestPrice : historyLatest.close,
      latestDate,
      priceSource: dailyQuote?.close != null ? "Zapi IDX trading-info-daily" : "Zapi IDX stock-history",
      result,
      candles:candles.slice(-120),
    });
  } catch (error) {
    console.error("Analyze API error:", error);
    return NextResponse.json({ success:false, error:error instanceof Error ? error.message : "Gagal melakukan analisis saham" }, { status:500 });
  }
}
