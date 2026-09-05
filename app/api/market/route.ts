import { NextResponse } from "next/server";

const BASE = "https://api.zpi.web.id/v1/finance:idx";

type FetchResult = {
  ok: boolean;
  status: number;
  data: any;
  error?: string;
};

async function fetchJson(path: string, apiKey: string): Promise<FetchResult> {
  try {
    const r = await fetch(`${BASE}/${path}`, {
      headers: {
        "x-api-key": apiKey,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const text = await r.text();
    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text.slice(0, 500) };
    }

    return { ok: r.ok, status: r.status, data };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: error instanceof Error ? error.message : "Fetch error",
    };
  }
}

function n(...values: any[]) {
  for (const v of values) {
    const x = Number(v);
    if (Number.isFinite(x)) return x;
  }
  return NaN;
}

function rowsFrom(data: any): any[] {
  const candidates = [
    data?.data,
    data?.items,
    data?.content,
    data?.result,
    data?.data?.items,
    data?.data?.content,
  ];

  for (const value of candidates) {
    if (Array.isArray(value)) return value;
  }

  return [];
}

function normalize(row: any) {
  if (!row) return null;

  const last = n(
    row.last,
    row.Last,
    row.Close,
    row.close,
    row.value,
    row.Value
  );

  const previous = n(row.previous, row.Previous);

  const change = n(
    row.change,
    row.Change,
    Number.isFinite(last) && Number.isFinite(previous)
      ? last - previous
      : NaN
  );

  const changePercent = n(
    row.changePercent,
    row.ChangePercent,
    row.percent,
    row.Percent,
    Number.isFinite(last) &&
      Number.isFinite(previous) &&
      previous !== 0
      ? ((last - previous) / previous) * 100
      : NaN
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

function diagnostic(result: FetchResult, rows: any[]) {
  return {
    status: result.status,
    ok: result.ok,
    error: result.error ?? null,
    keys:
      result.data && typeof result.data === "object"
        ? Object.keys(result.data).slice(0, 15)
        : [],
    count: rows.length,
    sampleKeys:
      rows[0] && typeof rows[0] === "object"
        ? Object.keys(rows[0]).slice(0, 20)
        : [],
  };
}

export async function GET() {
  const apiKey = process.env.ZAPI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        error: "ZAPI_API_KEY belum tersedia",
      },
      { status: 500 }
    );
  }

  // Primary source: documented IDX index-summary endpoint.
  const summary = await fetchJson(
    "index-summary?length=50&start=0",
    apiKey
  );

  const summaryRows = rowsFrom(summary.data);

  const summaryRow =
    summaryRows.find(
      (x: any) =>
        String(x.IndexCode ?? x.code ?? "").toUpperCase() === "COMPOSITE"
    ) ??
    summaryRows.find((x: any) =>
      /composite|ihsg/i.test(
        String(x.IndexName ?? x.name ?? x.IndexCode ?? x.code ?? "")
      )
    );

  let parsed = summary.ok ? normalize(summaryRow) : null;
  let source = "Zapi IDX index-summary";

  // Fallback: documented direct index endpoint.
  let direct: FetchResult | null = null;
  let directRows: any[] = [];

  if (!parsed) {
    direct = await fetchJson(
      "index-constituent?code=COMPOSITE&group=all",
      apiKey
    );

    directRows = rowsFrom(direct.data);

    const directRow =
      directRows.find(
        (x: any) =>
          String(x.code ?? x.IndexCode ?? "").toUpperCase() === "COMPOSITE"
      ) ?? directRows[0];

    parsed = direct.ok ? normalize(directRow) : null;

    if (parsed) {
      source = "Zapi IDX index-constituent";
    }
  }

  if (!parsed) {
    return NextResponse.json(
      {
        success: false,
        error: "Data IHSG belum tersedia dari Zapi IDX",
        diagnostic: {
          summary: diagnostic(summary, summaryRows),
          direct: direct
            ? diagnostic(direct, directRows)
            : null,
          note:
            "V2.3.4 memisahkan error jaringan/fetch dari HTTP error dan tidak lagi memakai timeout 8 detik.",
        },
      },
      { status: 502 }
    );
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
}
