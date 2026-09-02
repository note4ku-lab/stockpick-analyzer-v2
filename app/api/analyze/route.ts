import { NextRequest, NextResponse } from "next/server";
import {
  analyzeStock,
  Candle,
  AnalysisMode,
} from "../../../lib/analysis-engine";

const ZAPI_URL =
  "https://api.zpi.web.id/v1/finance:idx/stock-history";

const VALID_MODES: AnalysisMode[] = [
  "AUTO",
  "SCALPING",
  "DAY TRADE",
  "SWING",
  "LONG SWING",
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // =========================
    // TICKER
    // =========================

    const ticker = String(body.ticker || "")
      .trim()
      .toUpperCase();

    if (!ticker) {
      return NextResponse.json(
        {
          success: false,
          error: "Kode saham tidak ditemukan",
        },
        { status: 400 }
      );
    }

    // =========================
    // MODE
    // =========================

    const requestedMode = String(
      body.mode || "AUTO"
    ).toUpperCase() as AnalysisMode;

    const mode: AnalysisMode = VALID_MODES.includes(
      requestedMode
    )
      ? requestedMode
      : "AUTO";

    // =========================
    // ZAPI API KEY
    // =========================

    const apiKey = process.env.ZAPI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            "ZAPI_API_KEY belum tersedia di environment Vercel",
        },
        { status: 500 }
      );
    }

    // =========================
    // REQUEST ZAPI
    // =========================

    const url =
      `${ZAPI_URL}?code=${encodeURIComponent(
        ticker
      )}&length=250`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
      },
      cache: "no-store",
    });

    const rawText = await response.text();

    console.log(
      "Zapi HTTP status:",
      response.status
    );

    if (!response.ok) {
      console.error(
        "Zapi HTTP error:",
        response.status,
        rawText
      );

      return NextResponse.json(
        {
          success: false,
          error: `Zapi IDX error (${response.status})`,
        },
        { status: 502 }
      );
    }

    // =========================
    // PARSE RESPONSE
    // =========================

    let data: any;

    try {
      data = JSON.parse(rawText);
    } catch {
      console.error(
        "Zapi response bukan JSON"
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Response Zapi bukan JSON yang valid",
        },
        { status: 502 }
      );
    }

    /*
     * Zapi dapat mengembalikan:
     *
     * data.items
     *
     * atau:
     *
     * data.data.items
     */

    const items =
      Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.data?.items)
        ? data.data.items
        : Array.isArray(data?.data)
        ? data.data
        : null;

    if (!items) {
      console.error(
        "Zapi tidak mengembalikan items:",
        JSON.stringify(data)
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Data historis saham tidak ditemukan",
        },
        { status: 404 }
      );
    }

    console.log(
      `Zapi ${ticker}: ${items.length} data ditemukan`
    );

    // =========================
    // CONVERT TO CANDLE
    // =========================

    const candles: Candle[] = items
      .map((item: any) => ({
        date: String(item.date ?? item.Date ?? ""),
        open: Number(item.open ?? item.Open ?? item.openPrice),
        high: Number(item.high ?? item.High),
        low: Number(item.low ?? item.Low),
        close: Number(item.close ?? item.Close ?? item.last),
        volume: Number(item.volume ?? item.Volume),
      }))
      .filter(
        (candle: Candle) =>
          Number.isFinite(candle.open) &&
          Number.isFinite(candle.high) &&
          Number.isFinite(candle.low) &&
          Number.isFinite(candle.close) &&
          Number.isFinite(candle.volume)
      )
      .sort(
        (a: Candle, b: Candle) =>
          new Date(a.date).getTime() -
          new Date(b.date).getTime()
      );

    console.log(
      `Candle valid ${ticker}: ${candles.length}`
    );

    if (candles.length < 20) {
      return NextResponse.json(
        {
          success: false,
          error: `Data ${ticker} hanya memiliki ${candles.length} candle. Minimal 20 candle.`,
        },
        { status: 400 }
      );
    }

    // =========================
    // ANALYSIS ENGINE
    // =========================

    const result = analyzeStock(
      candles,
      mode
    );

    const latestPrice =
      candles[candles.length - 1].close;

    // =========================
    // RESPONSE
    // =========================

    return NextResponse.json({
      success: true,
      ticker,
      mode,
      candlesCount: candles.length,
      latestPrice,
      result,
      candles: candles.slice(-120),
    });
  } catch (error) {
    console.error(
      "Analyze API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Gagal melakukan analisis saham",
      },
      { status: 500 }
    );
  }
}
