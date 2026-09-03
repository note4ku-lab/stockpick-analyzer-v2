export type Candle = { date:string; open:number; high:number; low:number; close:number; volume:number }
export type AnalysisMode = "AUTO" | "SCALPING" | "DAY TRADE" | "SWING" | "LONG SWING"
export type Signal = "BUY" | "HOLD" | "SELL"

type Direction = "BULLISH" | "NEUTRAL" | "BEARISH"

export type AnalysisResult = {
  score:number
  confidence:number
  signal:Signal
  trend:Direction
  method:Exclude<AnalysisMode,"AUTO">
  entry:number
  entryLow:number
  entryHigh:number
  stopLoss:number
  tp1:number
  tp2:number
  riskReward:number
  entryType:"BUY ON PULLBACK"|"SELL ON RETEST"|"WAIT"
  support:number
  resistance:number
  reasons:string[]
  confidenceBreakdown:{label:string; score:number; note:string}[]
  indicators:{
    price:number; changePct:number; ma5:number; ma20:number; ma50:number; ma100:number
    rsi:number; macd:number; macdSignal:number; macdHistogram:number
    volume:number; volumeMA20:number; atr:number; atrPct:number
    priceVsMA20:"ABOVE"|"BELOW"; priceVsMA50:"ABOVE"|"BELOW"; priceVsMA100:"ABOVE"|"BELOW"
    maTrend:Direction; momentum:"STRONG"|"POSITIVE"|"WEAK"; volumeStatus:"HIGH"|"NORMAL"|"LOW"
  }
}

const MODE = {
  "SCALPING": { stopAtr:1.0, tp1R:1.0, tp2R:1.8, entryAtr:0.20 },
  "DAY TRADE": { stopAtr:1.25, tp1R:1.15, tp2R:2.0, entryAtr:0.30 },
  "SWING": { stopAtr:1.50, tp1R:1.30, tp2R:2.30, entryAtr:0.40 },
  "LONG SWING": { stopAtr:2.00, tp1R:1.50, tp2R:2.80, entryAtr:0.60 },
} as const

function sma(v:number[],p:number){if(v.length<p)return null;const s=v.slice(-p);return s.reduce((a,b)=>a+b,0)/p}
function ema(v:number[],p:number){if(v.length<p)return null;const k=2/(p+1);let r=v.slice(0,p).reduce((a,b)=>a+b,0)/p;for(let i=p;i<v.length;i++)r=(v[i]-r)*k+r;return r}
function rsi(v:number[],p=14){if(v.length<=p)return 50;let g=0,l=0;for(let i=v.length-p;i<v.length;i++){const d=v[i]-v[i-1];if(d>0)g+=d;else l+=-d}if(g===0&&l===0)return 50;return l===0?100:100-100/(1+g/l)}
function macd(v:number[]){const vals:number[]=[];for(let i=26;i<=v.length;i++){const s=v.slice(0,i),a=ema(s,12),b=ema(s,26);if(a!==null&&b!==null)vals.push(a-b)}const m=vals.at(-1)??0,sig=ema(vals,9)??m;return {macd:m,signal:sig,histogram:m-sig}}
function atr(c:Candle[],p=14){if(c.length<=p)return 0;const tr:number[]=[];for(let i=1;i<c.length;i++)tr.push(Math.max(c[i].high-c[i].low,Math.abs(c[i].high-c[i-1].close),Math.abs(c[i].low-c[i-1].close)));return sma(tr,p)??0}
function clamp(n:number,a:number,b:number){return Math.max(a,Math.min(b,n))}
function tick(n:number){return Math.max(1,Math.round(n))}

export function analyzeStock(c:Candle[],requestedMode:AnalysisMode="AUTO"):AnalysisResult{
  if(c.length<100)throw new Error("Minimal membutuhkan 100 data candle untuk analisis yang stabil")
  const closes=c.map(x=>x.close), vols=c.map(x=>x.volume), price=closes.at(-1)!, prev=closes.at(-2)??price
  const ma5=sma(closes,5)??price, ma20=sma(closes,20)??price, ma50=sma(closes,50)??ma20, ma100=sma(closes,100)??ma50
  const rv=rsi(closes), mx=macd(closes), volume=vols.at(-1)!, vma=sma(vols,20)??volume, atrValue=atr(c,14)
  const recent=c.slice(-20), support=Math.min(...recent.map(x=>x.low)), resistance=Math.max(...recent.map(x=>x.high))
  const priceVsMA20=price>=ma20?"ABOVE":"BELOW", priceVsMA50=price>=ma50?"ABOVE":"BELOW", priceVsMA100=price>=ma100?"ABOVE":"BELOW"
  let maTrend:Direction="NEUTRAL"; if(ma5>ma20&&ma20>ma50){maTrend="BULLISH"} else if(ma5<ma20&&ma20<ma50){maTrend="BEARISH"}
  let momentum:"STRONG"|"POSITIVE"|"WEAK"="WEAK"; if(rv>=60&&rv<=70)momentum="STRONG"; else if(rv>=50&&rv<75)momentum="POSITIVE"
  const volumeStatus=volume>vma*1.5?"HIGH":volume<vma*.7?"LOW":"NORMAL"

  const auto:Exclude<AnalysisMode,"AUTO"> = rv>=60&&price>ma5&&ma5>ma20&&mx.macd>mx.signal ? "SCALPING" : rv>=55&&price>ma5&&price>ma20 ? "DAY TRADE" : price>ma20&&ma20>=ma50 ? "SWING" : "LONG SWING"
  const method=requestedMode==="AUTO"?auto:requestedMode

  const weights = method==="SCALPING"
    ? {trend:0.22,ma:0.13,momentum:0.25,macd:0.18,volume:0.14,price:0.08}
    : method==="DAY TRADE"
    ? {trend:0.25,ma:0.15,momentum:0.20,macd:0.17,volume:0.15,price:0.08}
    : method==="SWING"
    ? {trend:0.30,ma:0.18,momentum:0.16,macd:0.14,volume:0.12,price:0.10}
    : {trend:0.34,ma:0.22,momentum:0.12,macd:0.12,volume:0.08,price:0.12}

  const trendScore=(price>=ma20?1:-1)*0.45+(price>=ma50?1:-1)*0.30+(price>=ma100?1:-1)*0.25
  const maScore=maTrend==="BULLISH"?1:maTrend==="BEARISH"?-1:0
  const momentumScore=rv>=60&&rv<=70?1:rv>=50&&rv<60?0.5:rv>70?0.2:rv<40?-1:-0.5
  const macdScore=mx.macd>mx.signal?(mx.histogram>=0?1:0.5):-1
  const volumeScore=volumeStatus==="HIGH"?(price>=prev?1:-1):volumeStatus==="LOW"?0:0.35
  const priceScore=price>=prev?0.6:-0.6
  const composite=trendScore*weights.trend+maScore*weights.ma+momentumScore*weights.momentum+macdScore*weights.macd+volumeScore*weights.volume+priceScore*weights.price
  const score=clamp(Math.round(50+50*composite),0,100)
  const signal:Signal=score>=65?"BUY":score<=35?"SELL":"HOLD"
  const trend:Direction=score>=60?"BULLISH":score<=40?"BEARISH":"NEUTRAL"

  const reasons:string[]=[]
  if(price>=ma20) reasons.push("Harga berada di atas MA20"); else reasons.push("Harga berada di bawah MA20")
  if(price>=ma50) reasons.push("Harga berada di atas MA50"); else reasons.push("Harga berada di bawah MA50")
  if(maTrend==="BULLISH") reasons.push("Susunan MA menunjukkan tren bullish"); else if(maTrend==="BEARISH") reasons.push("Susunan MA menunjukkan tren bearish")
  if(rv>=60&&rv<=70) reasons.push("RSI mendukung momentum bullish"); else if(rv<40) reasons.push("RSI menunjukkan momentum lemah"); else if(rv>70) reasons.push("RSI tinggi; momentum kuat tetapi rawan jenuh beli"); else reasons.push("RSI berada di area netral")
  if(mx.macd>mx.signal) reasons.push("MACD berada di atas signal"); else reasons.push("MACD berada di bawah signal")
  if(volumeStatus==="HIGH") reasons.push("Volume meningkat signifikan"); else if(volumeStatus==="LOW") reasons.push("Volume di bawah rata-rata MA20"); else reasons.push("Volume berada di sekitar rata-rata MA20")
  reasons.push(`Setup ${method.toLowerCase()} menggunakan volatilitas ATR untuk level risiko`)

  const cfg=MODE[method], atrSafe=Math.max(atrValue,price*0.005)
  // Trade plan: entries are explicitly directional. BUY waits below price (pullback),
  // SELL waits above price (retest). Stops are always on the protective side of entry.
  const entryLow = signal === "SELL" ? price + atrSafe*cfg.entryAtr*0.30 : price - atrSafe*cfg.entryAtr
  const entryHigh = signal === "SELL" ? price + atrSafe*cfg.entryAtr : price - atrSafe*cfg.entryAtr*0.30
  const entry = (entryLow + entryHigh) / 2
  const structuralStop = signal === "SELL" ? resistance + atrSafe*0.15 : support - atrSafe*0.15
  const volatilityStop = signal === "SELL" ? entryHigh + atrSafe*cfg.stopAtr : entryLow - atrSafe*cfg.stopAtr
  const stopLoss = signal === "SELL" ? Math.max(structuralStop, volatilityStop) : Math.min(structuralStop, volatilityStop)
  const risk = Math.max(Math.abs(entry-stopLoss), atrSafe*0.35)
  const direction = signal === "SELL" ? -1 : 1
  let tp1 = entry + direction*risk*cfg.tp1R, tp2 = entry + direction*risk*cfg.tp2R
  if(signal!=="SELL"){
    if(resistance>entry && resistance<tp1) tp1=resistance
    if(resistance>tp1 && resistance<tp2) tp2=resistance
  } else {
    if(support<entry && support>tp1) tp1=support
    if(support<tp2 && support<tp1) tp2=support
  }
  const reward=Math.abs(tp2-entry), rr=reward/risk

  // Confidence is signal confidence, not a probability of profit.
  const components=[trendScore,maScore,momentumScore,macdScore,volumeScore,priceScore]
  const agreement=components.reduce((sum,x)=>sum+(Math.abs(x)>=0.5?1:0),0)/components.length
  const confidence=clamp(Math.round(52+agreement*25+Math.abs(composite)*18),52,92)
  const rrScore=clamp(Math.round((Math.min(rr,3)/3)*100),0,100)
  const confidenceBreakdown=[
    {label:"Trend",score:clamp(Math.round(50+50*trendScore),0,100),note:"Arah harga terhadap MA20/50/100"},
    {label:"Moving Average",score:clamp(Math.round(50+50*maScore),0,100),note:"Susunan MA5/20/50"},
    {label:"MACD",score:clamp(Math.round(50+50*macdScore),0,100),note:"MACD dibanding signal line"},
    {label:"RSI",score:clamp(Math.round(50+50*momentumScore),0,100),note:"Momentum dan kondisi jenuh"},
    {label:"Volume",score:clamp(Math.round(50+50*volumeScore),0,100),note:"Aktivitas volume vs MA20"},
    {label:"Price Action",score:clamp(Math.round(50+50*priceScore),0,100),note:"Perubahan harga terbaru"},
    {label:"Risk / Reward",score:rrScore,note:`R/R 1 : ${rr.toFixed(1)}`},
  ]

  const entryType = signal === "BUY" ? "BUY ON PULLBACK" : signal === "SELL" ? "SELL ON RETEST" : "WAIT"

  return {score,confidence,signal,trend,method,entryType,entry:tick(entry),entryLow:tick(entryLow),entryHigh:tick(entryHigh),stopLoss:tick(stopLoss),tp1:tick(tp1),tp2:tick(tp2),riskReward:rr,support:tick(support),resistance:tick(resistance),reasons,confidenceBreakdown,indicators:{price,changePct:(price-prev)/prev*100,ma5,ma20,ma50,ma100,rsi:rv,macd:mx.macd,macdSignal:mx.signal,macdHistogram:mx.histogram,volume,volumeMA20:vma,atr:atrSafe,atrPct:atrSafe/price*100,priceVsMA20,priceVsMA50,priceVsMA100,maTrend,momentum,volumeStatus}}
}
