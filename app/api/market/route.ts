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
    const row = rows.find((x:any) => String(x.code ?? x.IndexCode ?? x.indexCode ?? "").toUpperCase() === "COMPOSITE") ?? rows.find((x:any) => /composite|ihsg/i.test(String(x.name ?? x.IndexName ?? "")));
    if (!row) return NextResponse.json({ success:false, error:"Data IHSG tidak ditemukan" }, { status:404 });
    return NextResponse.json({ success:true, index:{code:"COMPOSITE", name:"IHSG", last:Number(row.last ?? row.Close ?? row.close ?? row.current ?? row.IndexValue), change:Number(row.change ?? row.Change), changePercent:Number(row.changePercent ?? row.ChangePercent ?? row.persen ?? (Number(row.Close ?? row.close) && Number(row.Previous) ? ((Number(row.Close ?? row.close)-Number(row.Previous))/Number(row.Previous))*100 : 0)), date:row.date ?? row.Date ?? null}, source:"Zapi IDX index-summary" });
  } catch {
    return NextResponse.json({ success:false, error:"Gagal mengambil data IHSG" }, { status:502 });
  }
}
