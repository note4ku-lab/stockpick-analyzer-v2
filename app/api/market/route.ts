import { NextResponse } from "next/server";

const BASE = "https://api.zpi.web.id/v1/finance:idx";

async function fetchJson(url:string, apiKey:string) {
  const r = await fetch(url, { headers:{"x-api-key":apiKey}, cache:"no-store" });
  const text = await r.text();
  let data:any = null;
  try { data = JSON.parse(text); } catch {}
  return { ok:r.ok, status:r.status, data };
}

function parseIndex(data:any) {
  const rows = Array.isArray(data?.data) ? data.data : Array.isArray(data?.items) ? data.items : [];
  const row = rows.find((x:any) => String(x.IndexCode ?? x.code ?? "").toUpperCase() === "COMPOSITE")
    ?? rows.find((x:any) => /composite|ihsg/i.test(String(x.name ?? x.IndexName ?? x.IndexCode ?? x.code ?? "")));
  if (!row) return null;
  const last = Number(row.Close ?? row.close ?? row.last);
  const previous = Number(row.Previous ?? row.previous);
  const change = Number(row.Change ?? row.change ?? (Number.isFinite(last) && Number.isFinite(previous) ? last-previous : NaN));
  const directPct = Number(row.changePercent ?? row.ChangePercent);
  const changePercent = Number.isFinite(directPct) ? directPct : (Number.isFinite(last) && Number.isFinite(previous) && previous !== 0 ? (last-previous)/previous*100 : NaN);
  return { last, change, changePercent, date:row.Date ?? row.date ?? null };
}

export async function GET() {
  try {
    const apiKey = process.env.ZAPI_API_KEY;
    if (!apiKey) return NextResponse.json({success:false,error:"ZAPI_API_KEY belum tersedia"},{status:500});

    // Primary source: index-summary. Fallback: index-constituent, which exposes COMPOSITE directly.
    const primary = await fetchJson(`${BASE}/index-summary?length=50&start=0`, apiKey);
    let parsed = primary.ok ? parseIndex(primary.data) : null;
    let source = "Zapi IDX index-summary";

    if (!parsed) {
      const fallback = await fetchJson(`${BASE}/index-constituent?code=COMPOSITE&group=main`, apiKey);
      const rows = Array.isArray(fallback.data?.items) ? fallback.data.items : [];
      const row = rows[0];
      if (fallback.ok && row) {
        const last = Number(row.last);
        const previous = Number(row.previous);
        const change = Number(row.change ?? (Number.isFinite(last)&&Number.isFinite(previous)?last-previous:NaN));
        const changePercent = Number(row.changePercent ?? (Number.isFinite(last)&&Number.isFinite(previous)&&previous!==0?(last-previous)/previous*100:NaN));
        parsed = {last,change,changePercent,date:row.date ?? null};
        source = "Zapi IDX index-constituent";
      }
    }

    if (!parsed || !Number.isFinite(parsed.last)) {
      return NextResponse.json({success:false,error:"Data IHSG belum tersedia dari Zapi IDX",diagnostic:{primaryStatus:primary.status}},{status:502});
    }

    return NextResponse.json({success:true,index:{code:"COMPOSITE",name:"IHSG",...parsed,marketStatus:"IDX DATA",fetchedAt:new Date().toISOString()},source});
  } catch (error) {
    console.error("Market API error:",error);
    return NextResponse.json({success:false,error:"Gagal mengambil data IHSG"},{status:502});
  }
}
