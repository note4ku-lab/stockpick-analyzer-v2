export type Candle = { date:string; open:number; high:number; low:number; close:number; volume:number }
export type AnalysisMode = "AUTO" | "SCALPING" | "DAY TRADE" | "SWING" | "LONG SWING"
export type Signal = "BUY" | "HOLD" | "SELL"

export type AnalysisResult = {
  score:number; confidence:number; signal:Signal; trend:"BULLISH"|"NEUTRAL"|"BEARISH"; method:Exclude<AnalysisMode,"AUTO">;
  entry:number; entryLow:number; entryHigh:number; stopLoss:number; tp1:number; tp2:number; riskReward:number;
  support:number; resistance:number; reasons:string[];
  indicators:{price:number; changePct:number; ma5:number; ma20:number; ma50:number; ma100:number; rsi:number; macd:number; macdSignal:number; macdHistogram:number; volume:number; volumeMA20:number; priceVsMA20:"ABOVE"|"BELOW"; priceVsMA50:"ABOVE"|"BELOW"; priceVsMA100:"ABOVE"|"BELOW"; maTrend:"BULLISH"|"NEUTRAL"|"BEARISH"; momentum:"STRONG"|"POSITIVE"|"WEAK"; volumeStatus:"HIGH"|"NORMAL"|"LOW"}
}

function sma(v:number[],p:number){if(v.length<p)return null;const s=v.slice(-p);return s.reduce((a,b)=>a+b,0)/p}
function ema(v:number[],p:number){if(v.length<p)return null;const k=2/(p+1);let r=v.slice(0,p).reduce((a,b)=>a+b,0)/p;for(let i=p;i<v.length;i++)r=(v[i]-r)*k+r;return r}
function rsi(v:number[],p=14){if(v.length<=p)return 50;let g=0,l=0;for(let i=v.length-p;i<v.length;i++){const d=v[i]-v[i-1];if(d>0)g+=d;else l+=-d}return l===0?100:100-100/(1+g/l)}
function macd(v:number[]){const vals:number[]=[];for(let i=26;i<=v.length;i++){const s=v.slice(0,i),a=ema(s,12),b=ema(s,26);if(a!==null&&b!==null)vals.push(a-b)}const m=vals.at(-1)??0, sig=ema(vals,9)??m;return {macd:m,signal:sig,histogram:m-sig}}
function clamp(n:number,a:number,b:number){return Math.max(a,Math.min(b,n))}
function roundToTick(n:number){return Math.round(n)}

export function analyzeStock(c:Candle[],requestedMode:AnalysisMode="AUTO"):AnalysisResult{
 if(c.length<20)throw new Error("Minimal membutuhkan 20 data candle")
 const closes=c.map(x=>x.close),vols=c.map(x=>x.volume),price=closes.at(-1)!,prev=closes.at(-2)??price
 const ma5=sma(closes,5)??price,ma20=sma(closes,20)??price,ma50=sma(closes,50)??ma20,ma100=sma(closes,100)??ma50
 const rv=rsi(closes),mx=macd(closes),volume=vols.at(-1)!,vma=sma(vols,20)??volume
 const recent=c.slice(-20),support=Math.min(...recent.map(x=>x.low)),resistance=Math.max(...recent.map(x=>x.high))
 const priceVsMA20=price>=ma20?"ABOVE":"BELOW",priceVsMA50=price>=ma50?"ABOVE":"BELOW",priceVsMA100=price>=ma100?"ABOVE":"BELOW"
 let score=50,reasons:string[]=[]
 const add=(n:number,yes:string,no:string)=>{score+=n;reasons.push(score===score?((n>0)?yes:no):no)}
 add(price>=ma20?15:-15,"Harga berada di atas MA20","Harga berada di bawah MA20")
 add(price>=ma50?10:-10,"Harga berada di atas MA50","Harga berada di bawah MA50")
 add(price>=ma100?5:-5,"Harga berada di atas MA100","Harga berada di bawah MA100")
 let maTrend:"BULLISH"|"NEUTRAL"|"BEARISH"="NEUTRAL"; if(ma5>ma20&&ma20>ma50){maTrend="BULLISH";score+=10;reasons.push("Susunan MA menunjukkan tren bullish")}else if(ma5<ma20&&ma20<ma50){maTrend="BEARISH";score-=10;reasons.push("Susunan MA menunjukkan tren bearish")}else reasons.push("Susunan MA belum memberikan konfirmasi tren kuat")
 let momentum:"STRONG"|"POSITIVE"|"WEAK"="WEAK"; if(rv>=60&&rv<=70){momentum="STRONG";score+=15;reasons.push("RSI mendukung momentum bullish")}else if(rv>=50){momentum="POSITIVE";score+=8;reasons.push("Momentum RSI cenderung positif")}else if(rv>70){momentum="STRONG";score+=4;reasons.push("RSI tinggi; momentum kuat tetapi rawan jenuh beli")}else{score-=10;reasons.push("Momentum RSI masih lemah")}
 if(mx.macd>mx.signal){score+=5;reasons.push("MACD berada di atas signal")}else{score-=5;reasons.push("MACD berada di bawah signal")}
 let volumeStatus:"HIGH"|"NORMAL"|"LOW"="NORMAL";if(volume>vma*1.5){volumeStatus="HIGH";score+=5;reasons.push("Volume meningkat signifikan")}else if(volume<vma*.7){volumeStatus="LOW";reasons.push("Volume di bawah rata-rata MA20")}else reasons.push("Volume berada di sekitar rata-rata MA20")
 score=clamp(Math.round(score),0,100)
 let trend:AnalysisResult["trend"]=score>=70?"BULLISH":score<45?"BEARISH":"NEUTRAL"
 let auto:Exclude<AnalysisMode,"AUTO">="SWING";if(rv>=60&&price>ma5&&ma5>ma20&&mx.macd>mx.signal)auto="SCALPING";else if(rv>=55&&price>ma5&&price>ma20)auto="DAY TRADE";else if(price>ma20&&ma20>=ma50)auto="SWING";else auto="LONG SWING"
 const method=requestedMode==="AUTO"?auto:requestedMode
 const settings={"SCALPING":.985,"DAY TRADE":.98,"SWING":.97,"LONG SWING":.94} as const
 const sl=price*settings[method], fallbackTp1=price*(method==="SCALPING"?1.02:method==="DAY TRADE"?1.035:method==="SWING"?1.05:1.08),fallbackTp2=price*(method==="SCALPING"?1.035:method==="DAY TRADE"?1.055:method==="SWING"?1.08:1.15)
 const entryLow=Math.max(support,price*.995),entryHigh=Math.min(resistance,price*1.005),entry=Math.round((entryLow+entryHigh)/2)
 const stopLoss=roundToTick(Math.min(sl,support*.99)),tp1=roundToTick(Math.max(fallbackTp1,resistance>price?resistance:fallbackTp1)),tp2=roundToTick(Math.max(fallbackTp2,tp1*1.015))
 const rr=(tp2-entry)/Math.max(entry-stopLoss,1)
 const signal:Signal=score>=70?"BUY":score<45?"SELL":"HOLD"
 const confidence=clamp(Math.round(55+Math.abs(score-50)*.9),55,95)
 reasons.push(`Setup ${method.toLowerCase()} menggunakan level support/resistance terbaru`)
 return {score,confidence,signal,trend,method,entry,entryLow:roundToTick(entryLow),entryHigh:roundToTick(entryHigh),stopLoss,tp1,tp2,riskReward:rr,support:roundToTick(support),resistance:roundToTick(resistance),reasons,indicators:{price,changePct:(price-prev)/prev*100,ma5,ma20,ma50,ma100,rsi:rv,macd:mx.macd,macdSignal:mx.signal,macdHistogram:mx.histogram,volume,volumeMA20:vma,priceVsMA20,priceVsMA50,priceVsMA100,maTrend,momentum,volumeStatus}}
}
