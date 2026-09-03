import { NextResponse } from "next/server";

const ZAPI = "https://api.zpi.web.id/v1/finance:idx/index-summary?length=50&start=0";

export async function GET() {
  try {
    const apiKey = process.env.ZAPI_API_KEY;
    if (!apiKey) return NextResponse.json({ success:false, error:"ZAPI_API_KEY belum tersedia" }, { status:500 });
    const r = await fetch(ZAPI, { headers:{"x-api-key":apiKey}, cache:"no-store" });
    const text = await r.text();
    if (!r.ok) return NextResponse.json({ success:false, error:`Zapi IDX error (${r.status})` }, { status:502 });
    const data = JSON.parse(text);
    const rows = Array.isArray(data?.data) ? data.data : Array.isArray(data?.items) ? data.items : [];
    const row = rows.find((x:any) => String(x.IndexCode ?? x.code ?? "").toUpperCase() === "COMPOSITE") ?? rows.find((x:any) => /composite|ihsg/i.test(String(x.name ?? x.IndexName ?? x.IndexCode ?? "")));
    if (!row) return NextResponse.json({ success:false, error:"Data IHSG tidak ditemukan" }, { status:404 });
    const last = Number(row.Close ?? row.close ?? row.last);
    const previous = Number(row.Previous ?? row.previous);
    const change = Number(row.Change ?? row.change ?? (Number.isFinite(last) && Number.isFinite(previous) ? last-previous : NaN));
    const changePercent = Number.isFinite(last) && Number.isFinite(previous) && previous !== 0 ? (last-previous)/previous*100 : NaN;
    return NextResponse.json({ success:true, index:{code:"COMPOSITE", name:"IHSG", last, change, changePercent, date:row.Date ?? row.date ?? null}, source:"Zapi IDX index-summary" });
  } catch {
    return NextResponse.json({ success:false, error:"Gagal mengambil data IHSG" }, { status:502 });
  }
}
