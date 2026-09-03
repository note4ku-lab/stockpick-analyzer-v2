import { NextResponse } from "next/server";

const BASE = "https://api.zpi.web.id/v1/finance:idx";

async function fetchJson(url: string, apiKey: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const r = await fetch(url, {
      headers: { "x-api-key": apiKey, Accept: "application/json" },
      cache: "no-store",
      signal: controller.signal,
    });
    const text = await r.text();
    let data: any = null;
    try { data = JSON.parse(text); } catch {}
    return { ok: r.ok, status: r.status, data };
  } finally {
    clearTimeout(timer);
  }
}

function numberOrNaN(...values: any[]) {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return NaN;
}

function normalize(last: any, previous: any, change: any, changePercent: any, date: any) {
  const close = numberOrNaN(last);
  const prev = numberOrNaN(previous);
  const chg = numberOrNaN(change, Number.isFinite(close) && Number.isFinite(prev) ? close - prev : NaN);
  const pct = numberOrNaN(
    changePercent,
    Number.isFinite(close) && Number.isFinite(prev) && prev !== 0 ? ((close - prev) / prev) * 100 : NaN
  );
  if (!Number.isFinite(close)) return null;
  return { last: close, previous: prev, change: chg, changePercent: pct, date: date ?? null };
}

export async function GET() {
  const apiKey = process.env.ZAPI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ success: false, error: "ZAPI_API_KEY belum tersedia" }, { status: 500 });
  }

  try {
    // Prefer index-constituent because it is a direct single-index lookup for COMPOSITE.
    const direct = await fetchJson(`${BASE}/index-constituent?code=COMPOSITE&group=main`, apiKey);
    const directRow = Array.isArray(direct.data?.items)
      ? direct.data.items.find((x: any) => String(x.code ?? "").toUpperCase() === "COMPOSITE") ?? direct.data.items[0]
      : null;
    let parsed = direct.ok && directRow
      ? normalize(directRow.last, directRow.previous, directRow.change, directRow.changePercent, directRow.date)
      : null;
    let source = "Zapi IDX index-constituent";

    // Fallback to the full index summary endpoint.
    if (!parsed) {
      const summary = await fetchJson(`${BASE}/index-summary?length=50&start=0`, apiKey);
      const rows = Array.isArray(summary.data?.data)
        ? summary.data.data
        : Array.isArray(summary.data?.items) ? summary.data.items : [];
      const row = rows.find((x: any) => String(x.IndexCode ?? x.code ?? "").toUpperCase() === "COMPOSITE")
        ?? rows.find((x: any) => /composite|ihsg/i.test(String(x.IndexName ?? x.name ?? x.IndexCode ?? x.code ?? "")));
      if (summary.ok && row) {
        parsed = normalize(row.Close ?? row.close ?? row.last, row.Previous ?? row.previous, row.Change ?? row.change, row.ChangePercent ?? row.changePercent, row.Date ?? row.date);
        source = "Zapi IDX index-summary";
      }
    }

    if (!parsed) {
      return NextResponse.json({
        success: false,
        error: "Data IHSG belum tersedia dari Zapi IDX",
        diagnostic: { directStatus: direct.status, directHasItems: Array.isArray(direct.data?.items) },
      }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      index: {
        code: "COMPOSITE",
        name: "IHSG",
        ...parsed,
        marketStatus: "IDX DATA",
        fetchedAt: new Date().toISOString(),
      },
      source,
    });
  } catch (error) {
    console.error("Market API error:", error);
    return NextResponse.json({ success: false, error: "Gagal mengambil data IHSG" }, { status: 502 });
  }
}
