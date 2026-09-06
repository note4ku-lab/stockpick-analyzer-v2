import { NextResponse } from "next/server";

const INDEX_ALPHA_BASE = "https://api.indexalpha.id";
const MAX_TICKERS = 5;
const MAX_BROKERS = 4;

type BrokerRow = { code?: string; buy_freq?: number; buy_volume?: number; buy_value?: number; sell_freq?: number; sell_volume?: number; sell_value?: number; buy_avg?: number; sell_avg?: number };
const clean=(v:unknown)=>String(v??"").trim();
const validSymbol=(v:string)=>/^[A-Z0-9.-]{2,10}$/.test(v);
const validDate=(v:string)=>/^\d{4}-\d{2}-\d{2}$/.test(v);
const num=(v:unknown)=>{const n=Number(v);return Number.isFinite(n)?n:0};
function classify(row:BrokerRow|undefined){if(!row)return "NOT_FOUND" as const;const buy=num(row.buy_value),sell=num(row.sell_value),bv=num(row.buy_volume),sv=num(row.sell_volume);if(buy===0&&sell===0)return "NO_ACTIVITY" as const;const netValue=buy-sell,netVolume=bv-sv;if(netValue>0&&netVolume>=0)return "BUY" as const;if(netValue<0&&netVolume<=0)return "SELL" as const;if(netValue>0)return "BUY" as const;if(netValue<0)return "SELL" as const;return "MIXED" as const}
function summarize(row:BrokerRow|undefined){if(!row)return null;const buyValue=num(row.buy_value),sellValue=num(row.sell_value),buyVolume=num(row.buy_volume),sellVolume=num(row.sell_volume);const grossValue=buyValue+sellValue;return {buyValue,sellValue,netValue:buyValue-sellValue,buyVolume,sellVolume,netVolume:buyVolume-sellVolume,buyAvg:num(row.buy_avg),sellAvg:num(row.sell_avg),buyFreq:num(row.buy_freq),sellFreq:num(row.sell_freq),strength:grossValue>0?Math.abs(buyValue-sellValue)/grossValue:0}}
type ProviderMode = "mock" | "live" | "auto";

function mockNumber(seed:number,min:number,max:number){
 const x=Math.abs(Math.sin(seed*12.9898+78.233)*43758.5453)%1;
 return min+Math.floor(x*(max-min+1));
}
function mockRowsForTicker(ticker:string, targets:string[], date:string):BrokerRow[]{
 const seed=[...ticker].reduce((a,c)=>a+c.charCodeAt(0),0)+[...date].reduce((a,c)=>a+c.charCodeAt(0),0);
 const allCodes=["AK","BK","XL","XC","YP","PD","CC","NI","YU","DX","ZP","XA","KI","LG","OD","EP","RX","SQ","AI","DR","CP","BB","TF","MG","AG","IF","HD","MS","SH","LS","TP","GR","FS","KZ","HP","XA","YJ","BQ","FO","AZ","EL","GW","QA","RO","TX","KI","RF","YO","AD","AT","CC","DH","DM","ES","GI","IB","IN","JB","KK","LH","NI","OC","PD","PG","RB","SA","TS","XC","XL"];
 const codes=[...new Set([...targets,...allCodes])];
 return codes.map((code,i)=>{
   const targetIndex=targets.indexOf(code);
   let buy,sell;
   if(targetIndex>=0){
     const shouldBuy=(code==="AK"||code==="BK") && ((seed+i)%3!==0);
     const shouldSell=(code==="XL"||code==="XC") && ((seed+i)%4!==0);
     if(shouldBuy){buy=mockNumber(seed+i*17,18000000,95000000);sell=mockNumber(seed+i*23,5000000,Math.max(6000000,Math.floor(buy*.72)));}
     else if(shouldSell){sell=mockNumber(seed+i*23,18000000,95000000);buy=mockNumber(seed+i*17,5000000,Math.max(6000000,Math.floor(sell*.72)));}
     else {buy=mockNumber(seed+i*17,12000000,55000000);sell=mockNumber(seed+i*23,12000000,55000000);}
   }else{
     buy=mockNumber(seed+i*17,3000000,70000000);sell=mockNumber(seed+i*23,3000000,70000000);
   }
   const priceBase=mockNumber(seed+i*7,Math.max(500,Math.floor(100000/Math.max(1,ticker.length))),Math.max(800,Math.floor(1000000/Math.max(1,ticker.length))));
   const buyVolume=Math.max(100,Math.round(buy/Math.max(1,priceBase)));
   const sellVolume=Math.max(100,Math.round(sell/Math.max(1,priceBase)));
   return {code,buy_freq:mockNumber(seed+i*3,120,7000),buy_volume:buyVolume,buy_value:buy,sell_freq:mockNumber(seed+i*5,120,7000),sell_volume:sellVolume,sell_value:sell,buy_avg:priceBase,sell_avg:priceBase+mockNumber(seed+i*2,-3,3)};
 });
}

async function fetchLiveRows(tickers:string[],date:string,investor:string,market:string,apiKey:string){
 const response=await fetch(`${INDEX_ALPHA_BASE}/stocks/broker-summary/batch`,{method:"POST",headers:{Authorization:`Bearer ${apiKey}`,Accept:"application/json","Content-Type":"application/json"},body:JSON.stringify({tickers,from:date,to:date,investor,market}),cache:"no-store"});
 const text=await response.text();let upstream:any;try{upstream=JSON.parse(text)}catch{upstream={error:text.slice(0,1000)}}
 return {response,upstream};
}

export async function POST(request:Request){
 const apiKey=process.env.INDEX_ALPHA_API_KEY||"";
 let body:any;try{body=await request.json()}catch{return NextResponse.json({success:false,error:"Body JSON tidak valid"},{status:400})}
 const codeList=(value:unknown, fallback:string[])=>{const arr=Array.isArray(value)?value:fallback;return [...new Set(arr.map((x:unknown)=>clean(x).toUpperCase()).filter((x:string)=>/^[A-Z]{2}$/.test(x)))].slice(0,MAX_BROKERS)};
 const raw=Array.isArray(body?.tickers)?body.tickers:[];const tickers:string[]=Array.from(new Set(raw.map((x:unknown)=>clean(x).toUpperCase()).filter((x:string)=>validSymbol(x))));
 const buyBrokers:string[]=codeList(body?.buyBrokers,["AK","BK"]); const sellBrokers:string[]=codeList(body?.sellBrokers,["XL","XC"]);
 const date=clean(body?.date||"2026-09-04"),investor=clean(body?.investor||"all").toLowerCase(),market=clean(body?.market||"RG").toUpperCase();
 const requestedMode=clean(body?.providerMode||process.env.BROKER_DATA_MODE||"mock").toLowerCase() as ProviderMode; const providerMode:ProviderMode=["mock","live","auto"].includes(requestedMode)?requestedMode:"mock";
 if(!tickers.length)return NextResponse.json({success:false,error:"Masukkan minimal 1 ticker"},{status:400});
 if(tickers.length>MAX_TICKERS)return NextResponse.json({success:false,error:`Versi Free dibatasi ${MAX_TICKERS} ticker/scan`},{status:400});
 if(!buyBrokers.length||!sellBrokers.length)return NextResponse.json({success:false,error:"Broker BUY dan SELL harus diisi"},{status:400});
 if(!validDate(date))return NextResponse.json({success:false,error:"Tanggal harus YYYY-MM-DD"},{status:400});
 if(!["all","f","d"].includes(investor))return NextResponse.json({success:false,error:"Investor harus all, f, atau d"},{status:400});
 if(!["RG","NG","ALL"].includes(market))return NextResponse.json({success:false,error:"Market harus RG, NG, atau ALL"},{status:400});
 try{
   let source="Mock Broker Data (development)", rowsByTicker:Record<string,BrokerRow[]>={}; let upstreamStatus:number|undefined;
   if(providerMode==="live" || providerMode==="auto"){
     if(!apiKey && providerMode==="live") return NextResponse.json({success:false,error:"INDEX_ALPHA_API_KEY belum tersedia di Vercel untuk mode LIVE"},{status:500});
     if(apiKey){
       const {response,upstream}=await fetchLiveRows(tickers,date,investor,market,apiKey); upstreamStatus=response.status;
       if(response.ok){
         const data=upstream?.data&&typeof upstream.data==="object"?upstream.data:{};
         for(const ticker of tickers) rowsByTicker[ticker]=Array.isArray(data[ticker])?data[ticker]:[];
         source="Index Alpha /stocks/broker-summary/batch";
       }else if(providerMode==="live"){
         return NextResponse.json({success:false,error:upstream?.error||`Index Alpha HTTP ${response.status}`,upstreamStatus:response.status,providerMode:"live"},{status:502});
       }
     } else if(providerMode==="live") return NextResponse.json({success:false,error:"INDEX_ALPHA_API_KEY belum tersedia di Vercel untuk mode LIVE"},{status:500});
   }
   if(source.startsWith("Mock")){
     const targets=[...new Set([...buyBrokers,...sellBrokers])];
     for(const ticker of tickers) rowsByTicker[ticker]=mockRowsForTicker(ticker,targets,date);
   }
   const results=tickers.map((ticker:string)=>{const rows:BrokerRow[]=rowsByTicker[ticker]||[];const byCode=new Map(rows.map(row=>[String(row?.code??"").toUpperCase(),row]));const brokerStatus:Record<string,any>={};const targets=[...new Set([...buyBrokers,...sellBrokers])];for(const code of targets){const row=byCode.get(code);brokerStatus[code]={broker:code,side:buyBrokers.includes(code)?"BUY_TARGET":"SELL_TARGET",status:classify(row),metrics:summarize(row)}}
     const buyMatches=buyBrokers.filter(code=>brokerStatus[code]?.status==="BUY"),sellMatches=sellBrokers.filter(code=>brokerStatus[code]?.status==="SELL");const matchCount=buyMatches.length+sellMatches.length,targetCount=buyBrokers.length+sellBrokers.length;const matchScore=targetCount?Math.round(matchCount/targetCount*80):0;const matched=[...buyMatches,...sellMatches].map(code=>brokerStatus[code]?.metrics).filter(Boolean);const strength=matched.length?matched.reduce((s:number,m:any)=>s+(m.strength??0),0)/matched.length:0;const score=Math.min(100,matchScore+Math.round(Math.min(20,strength*20)));let verdict:"STRONG MATCH"|"MATCH"|"PARTIAL"|"NO MATCH"="NO MATCH";if(matchCount===targetCount&&targetCount>0)verdict="STRONG MATCH";else if(matchCount>=Math.ceil(targetCount*.75))verdict="MATCH";else if(matchCount>0)verdict="PARTIAL";return {ticker,brokerCount:rows.length,score,verdict,matchCount,targetCount,buyMatches,sellMatches,brokers:brokerStatus}}).sort((a:any,b:any)=>b.score-a.score||b.matchCount-a.matchCount);
   return NextResponse.json({success:true,source,date,investor,market,target:{buyBrokers,sellBrokers},providerMode,upstreamStatus,quotaImpact:source.startsWith("Mock")?"Tidak memakai kuota Index Alpha":"Menggunakan kuota Index Alpha sesuai jumlah ticker",results});
 }catch(error){return NextResponse.json({success:false,error:error instanceof Error?error.message:"Fetch error",providerMode},{status:502})}
}
