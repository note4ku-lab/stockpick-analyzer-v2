import { NextResponse } from "next/server";

const BASE = "https://api.zpi.web.id/v1/finance:idx";

async function fetchJson(path: string, apiKey: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const r = await fetch(`${BASE}/${path}`, {
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

function n(...values: any[]) {
  for (const v of values) {
    const x = Number(v);
    if (Number.isFinite(x)) return x;
  }
  return NaN;
}

function normalize(row: any) {
  if (!row) return null;
  const last = n(row.last, row.Last, row.Close, row.close, row.value, row.Value);
  const previous = n(row.previous, row.Previous);
  const change = n(row.change, row.Change, Number.isFinite(last) && Number.isFinite(previous) ? last - previous : NaN);
  const changePercent = n(
    row.changePercent,
    row.ChangePercent,
    row.percent,
    row.Percent,
    Number.isFinite(last) && Number.isFinite(previous) && previous !== 0 ? ((last - previous) / previous) * 100 : NaN
  );
  if (!Number.isFinite(last)) return null;
  return {
    last,
    previous,
    change,
    changePercent,
    date: row.date ?? row.Date ?? null,
  };
}

export async function GET() {
  const apiKey = process.env.ZAPI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ success: false, error: "ZAPI_API_KEY belum tersedia" }, { status: 500 });
  }

  try {
    // Primary: documented single-index endpoint. Keep the query minimal so
    // the response shape is not affected by optional grouping parameters.
    const direct = await fetchJson("index-constituent?code=COMPOSITE", apiKey);
    const directRows = Array.isArray(direct.data?.items)
      ? direct.data.items
      : Array.isArray(direct.data?.data) ? direct.data.data : [];
    const directRow = directRows.find((x: any) => String(x.code ?? x.IndexCode ?? "").toUpperCase() === "COMPOSITE") ?? directRows[0];
    let parsed = direct.ok ? normalize(directRow) : null;
    let source = "Zapi IDX index-constituent";

    // Fallback: full index summary.
    if (!parsed) {
      const summary = await fetchJson("index-summary?length=50&start=0", apiKey);
      const rows = Array.isArray(summary.data?.data)
        ? summary.data.data
        : Array.isArray(summary.data?.items) ? summary.data.items : [];
      const row = rows.find((x: any) => String(x.IndexCode ?? x.code ?? "").toUpperCase() === "COMPOSITE")
        ?? rows.find((x: any) => /composite|ihsg/i.test(String(x.IndexName ?? x.name ?? x.IndexCode ?? x.code ?? "")));
      if (summary.ok) {
        parsed = normalize(row);
        if (parsed) source = "Zapi IDX index-summary";
      }
    }

    if (!parsed) {
      return NextResponse.json({
        success: false,
        error: "Data IHSG belum tersedia dari Zapi IDX",
        diagnostic: {
          directStatus: direct.status,
          directKeys: direct.data && typeof direct.data === "object" ? Object.keys(direct.data).slice(0, 10) : [],
          directCount: directRows.length,
        },
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
