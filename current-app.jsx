import { useState, useMemo, useEffect, useCallback, useRef } from "react";

/* ════════════════════════════════════════════════════════════════
   STYLES — 全体の文字サイズ・余白を大幅に改善
   ════════════════════════════════════════════════════════════════ */
const C = {
  bg: "#070e1a", card: "#0c1628", border: "#1a2840", text: "#c4d8ec",
  dim: "#5a7e9e", accent: "#42a5f5", green: "#00e676", red: "#ff5252",
  orange: "#ffab40", purple: "#ce93d8", cyan: "#4dd0e1",
};
const F = { base: 14, sm: 12, xs: 11, label: 10, h1: 20, h2: 16, h3: 14, big: 28 };

const cardStyle = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, marginBottom: 14 };
const btnStyle = (color, active) => ({
  background: active ? `${color}20` : "transparent", border: `1.5px solid ${active ? color : C.border}`,
  color: active ? color : C.dim, padding: "10px 18px", borderRadius: 8, cursor: "pointer",
  fontSize: F.sm, fontFamily: "inherit", fontWeight: 600, transition: "all 0.15s",
});
const inputStyle = {
  background: "#0e1a30", border: `1.5px solid ${C.border}`, color: C.text,
  padding: "10px 14px", borderRadius: 8, fontSize: F.base, fontFamily: "inherit", width: "100%", outline: "none",
};

/* ════════════════════════════════════════════════════════════════
   SIGNAL ENGINE — データ生成・指標計算・スコアリング
   ════════════════════════════════════════════════════════════════ */
function genDaily(days=400,sp=150,vol=0.02){const d=[];let p=sp,t=0;const now=new Date();for(let i=days-1;i>=0;i--){const dt=new Date(now);dt.setDate(dt.getDate()-i);if(dt.getDay()===0||dt.getDay()===6)continue;t+=(Math.random()-0.505)*0.003;t=Math.max(-0.015,Math.min(0.015,t));p*=1+t+(Math.random()-0.5)*vol*2;const h=p*(1+Math.random()*0.015),l=p*(1-Math.random()*0.015);const o=l+Math.random()*(h-l),c=l+Math.random()*(h-l);const v=Math.floor(800000+Math.random()*1200000);d.push({date:dt.toISOString().split("T")[0],ds:`${dt.getMonth()+1}/${dt.getDate()}`,o:+o.toFixed(2),h:+h.toFixed(2),l:+l.toFixed(2),c:+c.toFixed(2),v});}return d;}
function genIntraday(dd){const last=dd.slice(-1)[0];if(!last)return[];const bars=[];let p=last.o;const bv=last.v/78;for(let i=0;i<78;i++){const mins=9*60+30+i*5;const hh=String(Math.floor(mins/60)).padStart(2,"0"),mm=String(mins%60).padStart(2,"0");p*=(1+(Math.random()-0.5)*0.003);const h=p*(1+Math.random()*0.003),l=p*(1-Math.random()*0.003);const o=l+Math.random()*(h-l),c=l+Math.random()*(h-l);const vm=(i<12||i>66)?2.5:1;bars.push({date:`${hh}:${mm}`,ds:`${hh}:${mm}`,o:+o.toFixed(2),h:+h.toFixed(2),l:+l.toFixed(2),c:+c.toFixed(2),v:Math.floor(bv*vm*(0.5+Math.random()))});}return bars;}

const calcSMA=(d,p)=>d.map((_,i)=>i<p-1?null:+(d.slice(i-p+1,i+1).reduce((s,x)=>s+x.c,0)/p).toFixed(4));
function calcEMA(d,p){const k=2/(p+1),r=[];let prev=null;for(let i=0;i<d.length;i++){if(i<p-1){r.push(null);continue;}prev=prev===null?d.slice(0,p).reduce((s,x)=>s+x.c,0)/p:d[i].c*k+prev*(1-k);r.push(+prev.toFixed(4));}return r;}
function calcRSI(d,p=14){const r=[];let ag=0,al=0;for(let i=0;i<d.length;i++){if(i===0){r.push(null);continue;}const ch=d[i].c-d[i-1].c,g=ch>0?ch:0,lo=ch<0?-ch:0;if(i<p){ag+=g/p;al+=lo/p;r.push(null);}else if(i===p){ag+=g/p;al+=lo/p;r.push(al===0?100:+(100-100/(1+ag/al)).toFixed(2));}else{ag=(ag*(p-1)+g)/p;al=(al*(p-1)+lo)/p;r.push(al===0?100:+(100-100/(1+ag/al)).toFixed(2));}}return r;}
function calcMACD(d,fast=12,slow=26,sig=9){const ef=calcEMA(d,fast),es=calcEMA(d,slow);const ml=ef.map((v,i)=>v!=null&&es[i]!=null?+(v-es[i]).toFixed(4):null);const k=2/(sig+1);const signal=[];let prev=null;for(let i=0;i<ml.length;i++){if(ml[i]===null){signal.push(null);continue;}if(prev===null){const valid=ml.slice(0,i+1).filter(v=>v!==null);if(valid.length>=sig)prev=valid.slice(-sig).reduce((s,v)=>s+v,0)/sig;else{signal.push(null);continue;}}else prev=ml[i]*k+prev*(1-k);signal.push(+prev.toFixed(4));}const hist=ml.map((v,i)=>v!=null&&signal[i]!=null?+(v-signal[i]).toFixed(4):null);return{ml,signal,hist};}
function calcBollinger(d,p=20,mult=2){const s=calcSMA(d,p);return s.map((avg,i)=>{if(!avg)return null;const sl=d.slice(i-p+1,i+1).map(x=>x.c);const std=Math.sqrt(sl.reduce((sum,v)=>sum+(v-avg)**2,0)/p);return{u:+(avg+mult*std).toFixed(2),m:+avg,l:+(avg-mult*std).toFixed(2),bw:+((mult*2*std)/avg*100).toFixed(2)};});}
function calcStoch(d,kP=14,dP=3){const kA=d.map((_,i)=>{if(i<kP-1)return null;const sl=d.slice(i-kP+1,i+1);const hi=Math.max(...sl.map(x=>x.h)),lo=Math.min(...sl.map(x=>x.l));return hi===lo?50:+((d[i].c-lo)/(hi-lo)*100).toFixed(2);});const dA=kA.map((_,i)=>{if(i<kP-1+dP-1)return null;const sl=kA.slice(i-dP+1,i+1).filter(v=>v!==null);return sl.length===dP?+(sl.reduce((s,v)=>s+v,0)/dP).toFixed(2):null;});return{k:kA,d:dA};}
function calcVWAP(d){let cumVP=0,cumV=0;return d.map(x=>{const tp=(x.h+x.l+x.c)/3;cumVP+=tp*x.v;cumV+=x.v;return cumV===0?null:+(cumVP/cumV).toFixed(2);});}
function calcADX(d,p=14){if(d.length<p+1)return{adx:d.map(()=>null),pdi:d.map(()=>null),ndi:d.map(()=>null)};const pdm=[],ndm=[],tr=[];for(let i=0;i<d.length;i++){if(i===0){pdm.push(0);ndm.push(0);tr.push(d[i].h-d[i].l);continue;}const u=d[i].h-d[i-1].h,dn=d[i-1].l-d[i].l;pdm.push(u>dn&&u>0?u:0);ndm.push(dn>u&&dn>0?dn:0);tr.push(Math.max(d[i].h-d[i].l,Math.abs(d[i].h-d[i-1].c),Math.abs(d[i].l-d[i-1].c)));}const smooth=(arr)=>{const r=[];let s=0;for(let i=0;i<arr.length;i++){if(i<p){s+=arr[i];if(i===p-1)r.push(s);else r.push(null);}else{s=s-s/p+arr[i];r.push(s);}}return r;};const sTR=smooth(tr),sPDM=smooth(pdm),sNDM=smooth(ndm);const pdi=sTR.map((v,i)=>v&&sPDM[i]!=null?sPDM[i]/v*100:null);const ndi=sTR.map((v,i)=>v&&sNDM[i]!=null?sNDM[i]/v*100:null);const dx=pdi.map((v,i)=>v!=null&&ndi[i]!=null&&(v+ndi[i])!==0?Math.abs(v-ndi[i])/(v+ndi[i])*100:null);const adx=[];let adxAvg=null;for(let i=0;i<dx.length;i++){if(dx[i]===null){adx.push(null);continue;}if(adxAvg===null){const valid=dx.slice(0,i+1).filter(v=>v!==null);if(valid.length>=p)adxAvg=valid.slice(-p).reduce((s,v)=>s+v,0)/p;else{adx.push(null);continue;}}else adxAvg=(adxAvg*(p-1)+dx[i])/p;adx.push(+adxAvg.toFixed(2));}return{adx,pdi,ndi};}

function detectRegime(d,adxData,bb){const n=d.length-1;const av=adxData.adx[n],bl=bb[n];let regime="unknown",desc="";if(av!=null){if(av>30){const up=d[n].c>d[Math.max(0,n-20)].c;regime=up?"strong_up":"strong_down";desc=up?`強い上昇トレンド（ADX=${av.toFixed(0)}）`:`強い下降トレンド（ADX=${av.toFixed(0)}）`;}else if(av>20){const up=d[n].c>d[Math.max(0,n-20)].c;regime=up?"mild_up":"mild_down";desc=up?`緩やかな上昇（ADX=${av.toFixed(0)}）`:`緩やかな下降（ADX=${av.toFixed(0)}）`;}else{regime="range";desc=`レンジ相場（ADX=${av.toFixed(0)}）`;}}if(bl&&bl.bw<3)desc+=" ⚡バンド収縮中";return{regime,desc};}

// Timeframe configs (abbreviated terms for space)
const TF={
  day:{label:"デイトレード",sub:"数分〜数時間",icon:"⚡",color:"#ff6e40",inds:[
    {key:"vwap",name:"VWAP乖離",weight:20,what:"その日の出来高加重平均価格からの距離。機関投資家の基準価格。",terms:[{w:"VWAP",d:"大口注文の基準価格。上＝割高、下＝割安"},{w:"乖離率",d:"VWAPからの距離%。大きく離れると戻す傾向"}]},
    {key:"momentum",name:"短期モメンタム",weight:20,what:"直近数本の勢い。デイトレでは今の勢いが最重要。",terms:[{w:"モメンタム",d:"価格変化の勢い。連続陽線＝上昇勢い"},{w:"SMA5/10クロス",d:"超短期の移動平均の交差。方向転換シグナル"}]},
    {key:"rsi_fast",name:"RSI（7）",weight:15,what:"7本のRSI。通常14より速く反応。デイトレ向け。",terms:[{w:"RSI(7)",d:"80超＝買われすぎ、20未満＝売られすぎ"}]},
    {key:"stoch_fast",name:"ストキャス（高速）",weight:15,what:"短期的ストキャスティクス。転換タイミング検出用。",terms:[{w:"%K(5)",d:"直近5本のレンジ内位置。80超/20未満に注目"},{w:"GC/DC",d:"%Kと%Dの交差。売られすぎ圏GC＝買い"}]},
    {key:"vol_spike",name:"出来高スパイク",weight:15,what:"出来高が平均比で急増しているか。大口参入の証拠。",terms:[{w:"出来高比",d:"直近÷平均。1.5倍以上で注目、2倍以上で強シグナル"}]},
    {key:"candle",name:"足型パターン",weight:15,what:"ローソク足の形状から売買の力関係を直接読み取る。",terms:[{w:"大陽線/大陰線",d:"実体が大きい足。強い圧力の証拠"},{w:"ハンマー",d:"下ひげ長い→反発サイン"},{w:"包み足",d:"前の足を包む大きな足→反転サイン"}]},
  ]},
  swing:{label:"スイング",sub:"数日〜数週間",icon:"🌊",color:"#42a5f5",inds:[
    {key:"sma_trend",name:"SMAトレンド",weight:18,what:"SMA20/50の位置関係でトレンド判断。",terms:[{w:"ゴールデンクロス",d:"SMA20がSMA50を上抜け→買い"},{w:"デッドクロス",d:"SMA20がSMA50を下抜け→売り"}]},
    {key:"macd",name:"MACD",weight:18,what:"短期・長期EMAの差でトレンド転換を検出。",terms:[{w:"ヒストグラム転換",d:"正グラフの正負が反転→トレンド変化"},{w:"ゼロライン",d:"MACD=0超え→トレンド転換確実"}]},
    {key:"rsi",name:"RSI（14）",weight:14,what:"14日間の相対力指数。30以下で売られすぎ。",terms:[{w:"ダイバージェンス",d:"価格とRSIが逆方向→転換の前兆"}]},
    {key:"bb",name:"ボリンジャー",weight:14,what:"移動平均±標準偏差の帯。価格の変化範囲を示す。",terms:[{w:"スクイーズ",d:"バンド収縮→大きな動きの前兆"},{w:"バンドウォーク",d:"バンド端に沿って動く→強トレンド"}]},
    {key:"adx",name:"ADX",weight:12,what:"トレンドの強さ（方向ではなく）を0〜100で測定。",terms:[{w:"ADX>25",d:"トレンド明確→順張り有効"},{w:"ADX<20",d:"トレンドなし→逆張り有効"}]},
    {key:"vol",name:"出来高",weight:12,what:"変化日に出来高の裏付けがあるか確認。",terms:[{w:"出来高確認",d:"ブレイク時に増→本物。増えず→ダマシ"}]},
    {key:"stoch",name:"ストキャス",weight:12,what:"RSI補完。両方同方向なら信頼度UP。",terms:[{w:"二重確認",d:"RSI+ストキャス両方売られすぎ→高信頼買い"}]},
  ]},
  long:{label:"中長期",sub:"数ヶ月〜数年",icon:"🏔️",color:"#66bb6a",inds:[
    {key:"sma200",name:"SMA200",weight:20,what:"約1年平均。これより上＝強気相場、下＝弱気。",terms:[{w:"SMA200",d:"機関投資家の基準線"},{w:"強気/弱気",d:"上昇/下落が続く相場"}]},
    {key:"slope",name:"トレンド傾き",weight:15,what:"SMA50の傾き。長期では向きが位置以上に重要。",terms:[{w:"傾き加速",d:"傾き急→トレンド強化中"}]},
    {key:"macd_l",name:"MACD長期",weight:15,what:"MACD(26/52/18)。月単位のトレンド転換検出。",terms:[{w:"ゼロライン超え",d:"長期MACD上昇↑→本格上昇転換"}]},
    {key:"rsi_l",name:"RSI（21）",weight:12,what:"長期RSI。大底・天井の検出に向く。",terms:[{w:"長期RSI",d:"30以下→長期割安、70以上→割高"}]},
    {key:"adx_l",name:"トレンド存在度",weight:12,what:"ADXでトレンドの有無を判定。明確な時のみエントリー。",terms:[{w:"トレンドレス",d:"ADX低→方向感なし→見送り推奨"}]},
    {key:"dd",name:"ドローダウン",weight:14,what:"直近高値からの下落率。押し目買いの判断に使う。",terms:[{w:"ドローダウン",d:"-10%→調整、-20%→弱気相場入り"},{w:"押し目買い",d:"上昇中の一時下落で買う手法"}]},
    {key:"vol_t",name:"出来高トレンド",weight:12,what:"数週間の出来高傾向で買い集め・売り抜けを検出。",terms:[{w:"買い集め",d:"横ばい+出来高増→大口が静かに買い中"}]},
  ]},
};

function scoreAll(tf,daily,intra){
  const d=tf==="day"?intra:daily;const n=d.length-1;if(n<20)return{scores:[],composite:0,regime:null};
  const sma20=calcSMA(daily,20),sma50=calcSMA(daily,50),sma200=calcSMA(daily,200);
  const rsi14=calcRSI(daily,14),rsi21=calcRSI(daily,21);const macdD=calcMACD(daily);const macdL=calcMACD(daily,26,52,18);
  const bb=calcBollinger(daily,20);const adxD=calcADX(daily,14);const stochD=calcStoch(daily,14,3);const dn=daily.length-1;
  const vwap=tf==="day"?calcVWAP(intra):[];const rsi7=tf==="day"?calcRSI(intra,7):[];
  const sf=tf==="day"?calcStoch(intra,5,3):{k:[],d:[]};const s5=tf==="day"?calcSMA(intra,5):[];const s10=tf==="day"?calcSMA(intra,10):[];
  const regime=detectRegime(daily,adxD,bb);const rm=regime.regime==="range"?0.7:1;
  const scores=[];
  for(const ind of TF[tf].inds){let s=0,reasons=[];
    if(tf==="day"){
      if(ind.key==="vwap"&&vwap[n]){const dev=(intra[n].c-vwap[n])/vwap[n]*100;if(dev<-0.3){s=60;reasons.push(`VWAP下方${dev.toFixed(2)}%（割安）`);}else if(dev>0.3){s=-60;reasons.push(`VWAP上方+${dev.toFixed(2)}%（割高）`);}else{reasons.push(`VWAP近辺（${dev.toFixed(2)}%）`);}}
      else if(ind.key==="momentum"){let c=0;for(let i=n;i>Math.max(0,n-5);i--){if(intra[i].c>intra[i].o)c++;else c--;}if(c>=4){s=55;reasons.push("連続陽線（強い上昇勢い）");}else if(c<=-4){s=-55;reasons.push("連続陰線（強い下落勢い）");}else{reasons.push("方向感なし");}if(n>0&&s5[n]&&s10[n]){if(s5[n]>s10[n]&&(s5[n-1]||0)<=(s10[n-1]||0)){s+=30;reasons.push("SMA5がSMA10上抜け");}if(s5[n]<s10[n]&&(s5[n-1]||0)>=(s10[n-1]||0)){s-=30;reasons.push("SMA5がSMA10下抜け");}}}
      else if(ind.key==="rsi_fast"&&rsi7[n]!=null){const v=rsi7[n];if(v<20){s=80;reasons.push(`RSI(7)=${v.toFixed(0)} 極度の売られすぎ`);}else if(v<30){s=45;reasons.push(`RSI(7)=${v.toFixed(0)} 売られすぎ`);}else if(v>80){s=-80;reasons.push(`RSI(7)=${v.toFixed(0)} 極度の買われすぎ`);}else if(v>70){s=-45;reasons.push(`RSI(7)=${v.toFixed(0)} 買われすぎ`);}else{reasons.push(`RSI(7)=${v.toFixed(0)} 中立`);}}
      else if(ind.key==="stoch_fast"&&sf.k[n]!=null){const kv=sf.k[n],dv=sf.d[n]||50;if(kv<20&&kv>dv){s=70;reasons.push("売られすぎ圏でGC");}else if(kv>80&&kv<dv){s=-70;reasons.push("買われすぎ圏でDC");}else if(kv<20){s=40;reasons.push(`%K=${kv.toFixed(0)} 売られすぎ`);}else if(kv>80){s=-40;reasons.push(`%K=${kv.toFixed(0)} 買われすぎ`);}else{reasons.push(`%K=${kv.toFixed(0)} 中立`);}}
      else if(ind.key==="vol_spike"){const av=n>5?intra.slice(Math.max(0,n-20),n).reduce((sum,x)=>sum+x.v,0)/Math.min(20,n):intra[n].v;const r=av>0?intra[n].v/av:1;const up=intra[n].c>intra[n].o;if(r>2&&up){s=70;reasons.push(`出来高${r.toFixed(1)}倍+陽線`);}else if(r>2){s=-70;reasons.push(`出来高${r.toFixed(1)}倍+陰線`);}else if(r>1.5&&up){s=35;reasons.push(`出来高${r.toFixed(1)}倍+上昇`);}else if(r>1.5){s=-35;reasons.push(`出来高${r.toFixed(1)}倍+下落`);}else{reasons.push(`出来高${r.toFixed(1)}倍（平均的）`);}}
      else if(ind.key==="candle"){const body=Math.abs(intra[n].c-intra[n].o),range=intra[n].h-intra[n].l||0.001;if(body/range>0.7&&intra[n].c>intra[n].o){s=50;reasons.push("大陽線");}else if(body/range>0.7){s=-50;reasons.push("大陰線");}else{reasons.push("通常の足型");}}
    }
    if(tf==="swing"){
      if(ind.key==="sma_trend"&&sma20[dn]&&sma50[dn]){const a20=daily[dn].c>sma20[dn],a50=daily[dn].c>sma50[dn];if(a20&&a50){s=40;reasons.push("SMA20/50の上（強気）");}else if(!a20&&!a50){s=-40;reasons.push("SMA20/50の下（弱気）");}else{s=a20?10:-10;reasons.push(a20?"SMA20上・50下":"SMA20下・50上");}if(dn>0&&sma20[dn]>sma50[dn]&&sma20[dn-1]<=sma50[dn-1]){s+=50;reasons.push("ゴールデンクロス!");}if(dn>0&&sma20[dn]<sma50[dn]&&sma20[dn-1]>=sma50[dn-1]){s-=50;reasons.push("デッドクロス!");}}
      else if(ind.key==="macd"&&macdD.hist[dn]!=null){const h=macdD.hist;if(h[dn]>0&&h[dn-1]<=0){s=70;reasons.push("ヒストグラム負→正");}else if(h[dn]<0&&h[dn-1]>=0){s=-70;reasons.push("ヒストグラム正→負");}else if(h[dn]>0&&h[dn]>h[dn-1]){s=35;reasons.push("ヒストグラム拡大（強気）");}else if(h[dn]<0&&h[dn]<h[dn-1]){s=-35;reasons.push("ヒストグラム拡大（弱気）");}else{s=h[dn]>0?10:-10;reasons.push(h[dn]>0?"ヒストグラム正":"ヒストグラム負");}}
      else if(ind.key==="rsi"&&rsi14[dn]!=null){const v=rsi14[dn];if(v<30){s=60;reasons.push(`RSI=${v.toFixed(0)} 売られすぎ`);}else if(v>70){s=-60;reasons.push(`RSI=${v.toFixed(0)} 買われすぎ`);}else{reasons.push(`RSI=${v.toFixed(0)} 中立`);}}
      else if(ind.key==="bb"&&bb[dn]){const b=bb[dn],pos=(daily[dn].c-b.l)/(b.u-b.l);if(pos<0.05){s=70;reasons.push("下限バンド接触");}else if(pos>0.95){s=-70;reasons.push("上限バンド接触");}else{reasons.push("バンド中央付近");}}
      else if(ind.key==="adx"&&adxD.adx[dn]!=null){const av=adxD.adx[dn];if(av>30){s=30*(adxD.pdi[dn]>adxD.ndi[dn]?1:-1);reasons.push(`ADX=${av.toFixed(0)} 強トレンド`);}else if(av>20){s=15*(adxD.pdi[dn]>adxD.ndi[dn]?1:-1);reasons.push(`ADX=${av.toFixed(0)} 中トレンド`);}else{reasons.push(`ADX=${av.toFixed(0)} レンジ`);}}
      else if(ind.key==="vol"){const av=daily.slice(Math.max(0,dn-20),dn).reduce((s,x)=>s+x.v,0)/20;const r=daily[dn].v/av;const up=daily[dn].c>daily[dn-1].c;if(r>1.5&&up){s=50;reasons.push(`出来高${r.toFixed(1)}倍+上昇`);}else if(r>1.5){s=-50;reasons.push(`出来高${r.toFixed(1)}倍+下落`);}else{reasons.push(`出来高${r.toFixed(1)}倍`);}}
      else if(ind.key==="stoch"&&stochD.k[dn]!=null){const kv=stochD.k[dn],dv=stochD.d[dn]||50;if(kv<20&&kv>dv){s=60;reasons.push("売られすぎGC");}else if(kv>80&&kv<dv){s=-60;reasons.push("買われすぎDC");}else{reasons.push(`%K=${kv.toFixed(0)}`);}}}
    if(tf==="long"){
      if(ind.key==="sma200"&&sma200[dn]){s=daily[dn].c>sma200[dn]?50:-50;reasons.push(s>0?"SMA200上（強気相場）":"SMA200下（弱気相場）");if(sma50[dn]&&dn>0){if(sma50[dn]>sma200[dn]&&sma50[dn-1]<=sma200[dn-1]){s+=40;reasons.push("SMA50がSMA200をGC");}if(sma50[dn]<sma200[dn]&&sma50[dn-1]>=sma200[dn-1]){s-=40;reasons.push("SMA50がSMA200をDC");}}}
      else if(ind.key==="slope"&&sma50[dn]&&sma50[dn-10]){const sl=(sma50[dn]-sma50[dn-10])/sma50[dn-10]*100;if(sl>1){s=50;reasons.push(`傾き+${sl.toFixed(1)}%（上向き加速）`);}else if(sl>0){s=20;reasons.push(`傾き+${sl.toFixed(1)}%`);}else if(sl>-1){s=-20;reasons.push(`傾き${sl.toFixed(1)}%`);}else{s=-50;reasons.push(`傾き${sl.toFixed(1)}%（下向き加速）`);}}
      else if(ind.key==="macd_l"&&macdL.hist[dn]!=null){const{ml,hist}=macdL;if(dn>0&&ml[dn]>0&&ml[dn-1]<=0){s=70;reasons.push("長期MACDゼロ上抜け");}else if(dn>0&&ml[dn]<0&&ml[dn-1]>=0){s=-70;reasons.push("長期MACDゼロ下抜け");}else{s=hist[dn]>0?15:-15;reasons.push(hist[dn]>0?"長期ヒストグラム正":"長期ヒストグラム負");}}
      else if(ind.key==="rsi_l"&&rsi21[dn]!=null){const v=rsi21[dn];if(v<30){s=70;reasons.push(`RSI(21)=${v.toFixed(0)} 長期売られすぎ`);}else if(v>70){s=-70;reasons.push(`RSI(21)=${v.toFixed(0)} 長期買われすぎ`);}else{reasons.push(`RSI(21)=${v.toFixed(0)}`);}}
      else if(ind.key==="adx_l"&&adxD.adx[dn]!=null){const av=adxD.adx[dn];if(av>25&&adxD.pdi[dn]>adxD.ndi[dn]){s=40;reasons.push(`ADX=${av.toFixed(0)} 上昇トレンド明確`);}else if(av>25){s=-40;reasons.push(`ADX=${av.toFixed(0)} 下降トレンド`);}else{reasons.push(`ADX=${av.toFixed(0)} トレンド不明瞭`);}}
      else if(ind.key==="dd"){const mx=Math.max(...daily.slice(Math.max(0,dn-60),dn+1).map(x=>x.h));const dd=(daily[dn].c-mx)/mx*100;if(dd<-20){s=60;reasons.push(`DD${dd.toFixed(1)}%（弱気相場レベル）`);}else if(dd<-10){s=40;reasons.push(`DD${dd.toFixed(1)}%（調整局面）`);}else if(dd>-1){s=-20;reasons.push("高値圏");}else{reasons.push(`DD${dd.toFixed(1)}%`);}}
      else if(ind.key==="vol_t"){const rc=daily.slice(-10).reduce((s,x)=>s+x.v,0)/10;const ol=daily.slice(-30,-10).reduce((s,x)=>s+x.v,0)/20;const r=ol>0?rc/ol:1;const up=daily[dn].c>(daily[dn-20]?.c||daily[dn].c);if(r>1.3&&up){s=40;reasons.push("出来高増+上昇（買い集め兆候）");}else if(r>1.3){s=-40;reasons.push("出来高増+下落（売り抜け兆候）");}else{reasons.push("出来高安定");}}}
    s=Math.max(-100,Math.min(100,Math.round(s*rm)));scores.push({...ind,score:s,reasons});
  }
  const tw=scores.reduce((s,x)=>s+x.weight,0);const comp=+(scores.reduce((s,x)=>s+x.score*x.weight,0)/tw).toFixed(1);
  return{scores,composite:comp,regime};
}

function getVerdict(s){
  if(s>=45)return{label:"強い買い",color:C.green,bg:`${C.green}12`};
  if(s>=20)return{label:"買い",color:"#66ffa6",bg:`${C.green}08`};
  if(s>=5)return{label:"やや買い",color:"#a5d6a7",bg:`${C.green}05`};
  if(s>-5)return{label:"様子見",color:"#90a4ae",bg:"rgba(144,164,174,0.06)"};
  if(s>-20)return{label:"やや売り",color:"#ef9a9a",bg:`${C.red}05`};
  if(s>-45)return{label:"売り",color:C.red,bg:`${C.red}08`};
  return{label:"強い売り",color:"#ff1744",bg:`${C.red}12`};
}

/* ════════════════════════════════════════════════════════════════
   CHART & SCORE BAR COMPONENTS
   ════════════════════════════════════════════════════════════════ */
function MiniChart({data,count=60}){
  const sl=data.slice(-count);const W=700,H=140,P={t:8,r:48,b:14,l:8};
  const iw=W-P.l-P.r,ih=H-P.t-P.b;const prices=sl.flatMap(d=>[d.h,d.l]);
  const mn=Math.min(...prices)*0.998,mx=Math.max(...prices)*1.002;
  const x=i=>P.l+(i/(sl.length-1))*iw,y=v=>P.t+(1-(v-mn)/(mx-mn))*ih;
  const cw=Math.max(2,iw/sl.length*0.5);
  return(<svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",maxHeight:140}}>
    {[0,.5,1].map(f=>{const v=mn+(mx-mn)*f;return<g key={f}><line x1={P.l} y1={y(v)} x2={W-P.r} y2={y(v)} stroke="#152035" strokeWidth="0.5"/><text x={W-P.r+4} y={y(v)+4} fill={C.dim} fontSize="9" fontFamily="monospace">{v.toFixed(v>1000?0:1)}</text></g>})}
    {sl.map((d,i)=>{const bull=d.c>=d.o,col=bull?"#00c853":"#ff1744";return<g key={i}><line x1={x(i)} y1={y(d.h)} x2={x(i)} y2={y(d.l)} stroke={col} strokeWidth="0.8"/><rect x={x(i)-cw/2} y={y(Math.max(d.o,d.c))} width={cw} height={Math.max(0.5,Math.abs(y(d.o)-y(d.c)))} fill={bull?"none":col} stroke={col} strokeWidth="0.8"/></g>})}
  </svg>);
}

function ScoreBar({item,expanded,onToggle}){
  const pct=(item.score+100)/200*100;const col=item.score>15?C.green:item.score<-15?C.red:"#607d8b";
  return(<div style={{marginBottom:2,borderBottom:`1px solid ${C.border}`}}>
    <div onClick={onToggle} style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",padding:"12px 0"}}>
      <div style={{width:140,fontSize:F.sm,color:"#8ab0cc",flexShrink:0,fontWeight:500}}>{item.name}</div>
      <div style={{flex:1,height:8,background:"#0e1a30",borderRadius:4,position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",left:"50%",top:0,width:1,height:"100%",background:C.border}}/>
        <div style={{position:"absolute",top:0,height:"100%",borderRadius:4,left:item.score>=0?"50%":`${pct}%`,width:`${Math.abs(item.score)/2}%`,background:col,opacity:0.75,transition:"all 0.4s"}}/>
      </div>
      <div style={{width:55,textAlign:"right",fontSize:F.h3,fontWeight:700,color:col}}>{item.score>0?"+":""}{item.score}</div>
      <div style={{width:16,fontSize:F.label,color:C.dim,transition:"transform 0.2s",transform:expanded?"rotate(180deg)":""}}>▼</div>
    </div>
    {expanded&&(<div style={{padding:"0 0 16px",animation:"fadeIn 0.2s"}}>
      <div style={{background:`${C.accent}08`,borderRadius:8,padding:"12px 16px",marginBottom:10,borderLeft:`3px solid ${C.accent}`}}>
        <div style={{fontSize:F.xs,color:C.accent,fontWeight:700,marginBottom:4}}>📖 この指標とは？</div>
        <div style={{fontSize:F.sm,color:"#90b8d4",lineHeight:1.9}}>{item.what}</div>
      </div>
      <div style={{padding:"0 16px",marginBottom:10}}>
        <div style={{fontSize:F.xs,color:C.orange,fontWeight:700,marginBottom:6}}>⚡ 判定根拠</div>
        {item.reasons.map((r,i)=><div key={i} style={{fontSize:F.sm,color:"#8ab0cc",lineHeight:2}}>• {r}</div>)}
        <div style={{color:C.dim,fontSize:F.xs,marginTop:4}}>ウェイト: {item.weight}%</div>
      </div>
      {item.terms?.length>0&&(<div style={{background:`${C.purple}08`,borderRadius:8,padding:"12px 16px",borderLeft:`3px solid ${C.purple}`}}>
        <div style={{fontSize:F.xs,color:C.purple,fontWeight:700,marginBottom:8}}>📚 用語辞書</div>
        {item.terms.map((t,i)=>(<div key={i} style={{marginBottom:i<item.terms.length-1?8:0}}>
          <span style={{fontSize:F.sm,color:"#d4b8e8",fontWeight:600}}>{t.w}</span>
          <div style={{fontSize:F.xs,color:"#7890a0",lineHeight:1.8,paddingLeft:10}}>{t.d}</div>
        </div>))}
      </div>)}
    </div>)}
  </div>);
}

/* ════════════════════════════════════════════════════════════════
   CLAUDE API + STORAGE
   ════════════════════════════════════════════════════════════════ */
async function askClaude(prompt,sys){
  try{const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,system:sys||"あなたは投資リサーチアシスタントです。客観的事実と分析のみ提供し、投資推奨は絶対にしません。",messages:[{role:"user",content:prompt}],tools:[{type:"web_search_20250305",name:"web_search"}]})});const data=await res.json();return data.content?.filter(b=>b.type==="text").map(b=>b.text).join("\n")||"取得失敗";}catch{return"エラー: 再試行してください";}
}
async function loadD(k,fb){try{const r=await window.storage.get(k);return r?JSON.parse(r.value):fb;}catch{return fb;}}
async function saveD(k,v){try{await window.storage.set(k,JSON.stringify(v));}catch{}}

/* ════════════════════════════════════════════════════════════════
   DATASETS
   ════════════════════════════════════════════════════════════════ */
const SETS=[{label:"テック株A",p:185,v:0.022},{label:"テック株B",p:310,v:0.025},{label:"高配当株",p:52,v:0.011},{label:"USD/JPY",p:150,v:0.005},{label:"BTC",p:62000,v:0.035},{label:"小型株",p:28,v:0.032}];

/* ════════════════════════════════════════════════════════════════
   MAIN APP
   ════════════════════════════════════════════════════════════════ */
export default function App(){
  const [page,setPage]=useState("signal");
  const [si,setSi]=useState(0);const [tf,setTf]=useState("swing");const [expIdx,setExpIdx]=useState(null);
  // Research state
  const [step,setStep]=useState(0);const [loading,setLoading]=useState(false);
  const [newsR,setNewsR]=useState("");const [ddQ,setDdQ]=useState("");const [ddR,setDdR]=useState("");
  const [secR,setSecR]=useState("");const [secReasonR,setSecReasonR]=useState("");
  const [stockQ,setStockQ]=useState("");const [stockR,setStockR]=useState("");
  const [compQ,setCompQ]=useState("");const [compR,setCompR]=useState("");
  // Hypothesis state
  const [hypos,setHypos]=useState([]);const [newH,setNewH]=useState({thesis:"",sector:"",timeframe:"3ヶ月",basis:""});const [showNewH,setShowNewH]=useState(false);
  const [hypoTab,setHypoTab]=useState("list");
  // Discipline state
  const [discTab,setDiscTab]=useState("reframe");
  const [reframes,setReframes]=useState([]);const [rfName,setRfName]=useState("");const [rfBuyPrice,setRfBuyPrice]=useState("");const [rfNowPrice,setRfNowPrice]=useState("");const [rfAnswer,setRfAnswer]=useState("");const [rfReason,setRfReason]=useState("");
  const [biasChecks,setBiasChecks]=useState({});
  const [kellyWinRate,setKellyWinRate]=useState("55");const [kellyWinAvg,setKellyWinAvg]=useState("10");const [kellyLossAvg,setKellyLossAvg]=useState("5");const [kellyCapital,setKellyCapital]=useState("1000000");
  const [ips,setIps]=useState({stopLoss:"5",maxPosition:"10",rebalancePeriod:"四半期",moatRule:"",customRules:""});

  useEffect(()=>{(async()=>{const h=await loadD("hypo-v2",[]);setHypos(h);const rf=await loadD("reframes-v1",[]);setReframes(rf);const bc=await loadD("bias-checks-v1",{});setBiasChecks(bc);const ip=await loadD("ips-v1",{stopLoss:"5",maxPosition:"10",rebalancePeriod:"四半期",moatRule:"",customRules:""});setIps(ip);})();},[]);
  const saveH=useCallback(async(h)=>{setHypos(h);await saveD("hypo-v2",h);},[]);
  const saveRF=useCallback(async(r)=>{setReframes(r);await saveD("reframes-v1",r);},[]);
  const saveBC=useCallback(async(b)=>{setBiasChecks(b);await saveD("bias-checks-v1",b);},[]);
  const saveIPS=useCallback(async(i)=>{setIps(i);await saveD("ips-v1",i);},[]);

  const addReframe=async()=>{if(!rfName.trim())return;const r={id:Date.now(),name:rfName,buyPrice:parseFloat(rfBuyPrice)||0,nowPrice:parseFloat(rfNowPrice)||0,answer:rfAnswer,reason:rfReason,date:new Date().toISOString()};await saveRF([r,...reframes]);setRfName("");setRfBuyPrice("");setRfNowPrice("");setRfAnswer("");setRfReason("");};

  const kellyResult=useMemo(()=>{const p=parseFloat(kellyWinRate)/100;const w=parseFloat(kellyWinAvg)/100;const l=parseFloat(kellyLossAvg)/100;if(isNaN(p)||isNaN(w)||isNaN(l)||l===0)return null;const b=w/l;const k=(p*(b+1)-1)/b;const halfK=k/2;const cap=parseFloat(kellyCapital)||0;return{kelly:Math.max(0,k*100),halfKelly:Math.max(0,halfK*100),optimalAmount:Math.max(0,halfK*cap),expectation:(p*w-(1-p)*l)*100,b};},[kellyWinRate,kellyWinAvg,kellyLossAvg,kellyCapital]);

  const daily=useMemo(()=>genDaily(400,SETS[si].p,SETS[si].v),[si]);
  const intra=useMemo(()=>genIntraday(daily),[daily]);
  const result=useMemo(()=>scoreAll(tf,daily,intra),[tf,daily,intra]);
  const verdict=getVerdict(result.composite);const tfConf=TF[tf];
  const bullC=result.scores.filter(s=>s.score>10).length,bearC=result.scores.filter(s=>s.score<-10).length;
  const agree=Math.max(bullC,bearC),total=result.scores.length;
  const conf=agree>=Math.ceil(total*0.7)?"高":agree>=Math.ceil(total*0.4)?"中":"低";
  const confCol=conf==="高"?C.green:conf==="中"?C.orange:C.red;

  // Research helpers
  const run=async(fn)=>{setLoading(true);await fn();setLoading(false);};
  const fetchNews=()=>run(async()=>{const r=await askClaude("本日のニュースで今後の株式市場に影響しそうな重要ニュースを5つ。各ニュースの概要(2行)、影響度(高/中/低)、時間軸(短/中/長)を整理して。","投資リサーチアシスタント。最新ニュースをウェブ検索し客観的に分析。投資推奨はしない。");setNewsR(r);setStep(1);});
  const fetchDD=()=>run(async()=>{const r=await askClaude(`「${ddQ}」について深掘り。1)背景 2)なぜ今重要か 3)シナリオ(楽観/中立/悲観) 4)注目ポイント`);setDdR(r);setStep(2);});
  const fetchSec=()=>run(async()=>{const r=await askClaude(`「${ddQ||newsR.slice(0,200)}」から恩恵セクター3つと逆風セクター3つ。各セクター名、影響度、一行理由。日米両市場の視点で。`);setSecR(r);setStep(3);});
  const fetchSecReason=()=>run(async()=>{const r=await askClaude(`セクター分析の根拠を深掘り:${secR.slice(0,400)}\n各セクターの因果関係、過去類似ケース、想定時間軸、リスク要因を分析。`);setSecReasonR(r);setStep(4);});
  const fetchStocks=()=>run(async()=>{const r=await askClaude(`「${stockQ}」セクターの注目企業5社。企業名/証券コード、事業概要、テーマとの関連性、競争優位性、リスク（ダイレクトに銘柄含む）。`,"投資リサーチアシスタント。ウェブ検索で正確な情報提供。購入推奨は絶対にしない。");setStockR(r);setStep(5);});
  const fetchComp=()=>run(async()=>{const r=await askClaude(`「${compQ}」を詳細リサーチ。1)会社概要 2)業績トレンド 3)競合比較の強み弱み 4)事業環境要因 5)財務注意点。株価予測不要、事実のみ。`);setCompR(r);setStep(6);});

  const addHypo=async()=>{if(!newH.thesis.trim())return;const h={...newH,id:Date.now(),createdAt:new Date().toISOString(),status:"検証中",review:""};await saveH([h,...hypos]);setNewH({thesis:"",sector:"",timeframe:"3ヶ月",basis:""});setShowNewH(false);};
  const verifyHypo=async(h)=>{setLoading(true);const r=await askClaude(`仮説の検証:「${h.thesis}」(${h.sector},${new Date(h.createdAt).toLocaleDateString("ja-JP")}設定,${h.timeframe})\n根拠:${h.basis}\n→最新状況、支持材料、否定材料、当初との乖離を分析`);await saveH(hypos.map(x=>x.id===h.id?{...x,lastVerification:r,lastVerifiedAt:new Date().toISOString()}:x));setLoading(false);};

  const stats={total:hypos.length,active:hypos.filter(h=>h.status==="検証中").length,hit:hypos.filter(h=>h.status==="的中").length,miss:hypos.filter(h=>h.status==="外れ").length,partial:hypos.filter(h=>h.status==="一部的中").length};
  const hitRate=stats.hit+stats.miss+stats.partial>0?((stats.hit+stats.partial*0.5)/(stats.hit+stats.miss+stats.partial)*100).toFixed(0):"—";

  const ResultBox=({text})=>text?<div style={{background:"#0e1a30",borderRadius:8,padding:16,fontSize:F.sm,color:C.text,lineHeight:2,whiteSpace:"pre-wrap",marginTop:10,animation:"fadeIn 0.3s"}}>{text}</div>:null;

  // Computed values for reframe panel
  const rfBp=parseFloat(rfBuyPrice),rfNp=parseFloat(rfNowPrice);
  const rfValid=rfBuyPrice&&rfNowPrice&&!isNaN(rfBp)&&!isNaN(rfNp)&&rfBp>0;
  const rfPct=rfValid?((rfNp-rfBp)/rfBp*100).toFixed(1):null;
  const rfIsLoss=rfValid&&rfNp<rfBp;

  // Computed values for bias diagnosis
  const biasTotal=14;
  const biasChecked=Object.values(biasChecks).filter(Boolean).length;
  const biasPct=Math.round(biasChecked/biasTotal*100);
  const biasLevel=biasPct>=60?"危険":biasPct>=30?"注意":"良好";
  const biasCol=biasPct>=60?C.red:biasPct>=30?C.orange:C.green;

  return(
    <div style={{background:C.bg,color:C.text,minHeight:"100vh",fontFamily:"'Noto Sans JP','JetBrains Mono',sans-serif",padding:"16px 16px 30px"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;600;700&family=Orbitron:wght@700;900&display=swap');*{box-sizing:border-box;margin:0}textarea{resize:vertical;font-family:inherit}@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}@keyframes glow{0%,100%{filter:brightness(1)}50%{filter:brightness(1.25)}}.loader{animation:glow 1.2s infinite}`}</style>

      {/* ——— TOP NAVIGATION ——— */}
      <div style={{display:"flex",gap:0,marginBottom:18,borderRadius:10,overflow:"hidden",border:`1.5px solid ${C.border}`}}>
        {[["signal","📊 Signal","テクニカル"],["research","🔬 Research","ファンダ"],["hypo",`💡 仮説(${stats.active})`,"ジャーナル"],["disc","🛡️ 規律","心理・資金管理"]].map(([k,label,sub])=>(
          <button key={k} onClick={()=>setPage(k)} style={{
            flex:1,padding:"14px 10px",cursor:"pointer",fontFamily:"inherit",border:"none",
            background:page===k?`${C.accent}18`:C.card,color:page===k?C.accent:C.dim,
            borderRight:`1px solid ${C.border}`,transition:"all 0.15s",
          }}>
            <div style={{fontSize:F.sm,fontWeight:700}}>{label}</div>
            <div style={{fontSize:F.label,opacity:0.6,marginTop:2}}>{sub}</div>
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════
           SIGNAL ENGINE PAGE
         ═══════════════════════════════════════════ */}
      {page==="signal"&&(<div>
        {/* Dataset selector */}
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
          {SETS.map((s,i)=>(<button key={i} onClick={()=>setSi(i)} style={{...btnStyle(i===si?C.accent:C.dim,i===si),padding:"8px 14px",fontSize:F.xs}}>{s.label}</button>))}
        </div>

        {/* Timeframe tabs */}
        <div style={{display:"flex",gap:8,marginBottom:16}}>
          {Object.entries(TF).map(([key,val])=>(
            <button key={key} onClick={()=>{setTf(key);setExpIdx(null);}} style={{
              flex:1,padding:"14px 8px",borderRadius:10,cursor:"pointer",fontFamily:"inherit",
              background:tf===key?`${val.color}15`:C.card,border:`2px solid ${tf===key?val.color:C.border}`,
              color:tf===key?val.color:C.dim,transition:"all 0.15s",
            }}>
              <div style={{fontSize:20}}>{val.icon}</div>
              <div style={{fontSize:F.sm,fontWeight:700,marginTop:4}}>{val.label}</div>
              <div style={{fontSize:F.label,marginTop:2,opacity:0.6}}>{val.sub}</div>
            </button>
          ))}
        </div>

        {/* Regime */}
        {result.regime&&<div style={{...cardStyle,padding:"12px 18px",background:result.regime.regime.includes("up")?`${C.green}06`:result.regime.regime.includes("down")?`${C.red}06`:`${C.orange}06`,borderColor:result.regime.regime.includes("up")?`${C.green}25`:result.regime.regime.includes("down")?`${C.red}25`:`${C.orange}25`}}>
          <span style={{fontSize:F.sm,color:"#8ab0cc"}}>🔍 <strong>相場局面：</strong>{result.regime.desc}</span>
        </div>}

        {/* VERDICT */}
        <div style={{background:verdict.bg,border:`2px solid ${verdict.color}35`,borderRadius:16,padding:"28px 20px",marginBottom:16,textAlign:"center",position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",inset:0,background:`radial-gradient(ellipse at center,${verdict.color}08,transparent 70%)`}}/>
          <div style={{position:"relative"}}>
            <div style={{fontSize:F.big+10,fontWeight:800,color:verdict.color,letterSpacing:4,fontFamily:"'Orbitron'",animation:"glow 2.5s infinite"}}>{verdict.label}</div>
            <div style={{fontSize:52,fontWeight:300,color:verdict.color,margin:"8px 0"}}>{result.composite>0?"+":""}{result.composite}</div>
            <div style={{display:"flex",justifyContent:"center",gap:24,fontSize:F.sm,color:"#7090a8",flexWrap:"wrap"}}>
              <span>信頼度 <strong style={{color:confCol}}>{conf}</strong> ({agree}/{total}指標一致)</span>
              <span style={{color:tfConf.color}}>{tfConf.icon} {tfConf.label}</span>
            </div>
          </div>
        </div>

        {/* Gauge */}
        <div style={{...cardStyle,padding:"14px 18px"}}>
          <div style={{position:"relative",height:20,background:"#0e1a30",borderRadius:10,overflow:"hidden"}}>
            <div style={{position:"absolute",left:0,top:0,height:"100%",width:"33%",background:`linear-gradient(90deg,${C.red},transparent)`,opacity:0.12}}/>
            <div style={{position:"absolute",right:0,top:0,height:"100%",width:"33%",background:`linear-gradient(270deg,${C.green},transparent)`,opacity:0.12}}/>
            <div style={{position:"absolute",left:"50%",top:0,width:1,height:"100%",background:C.border}}/>
            <div style={{position:"absolute",top:2,width:16,height:16,borderRadius:"50%",background:verdict.color,border:`2px solid ${C.bg}`,left:`calc(${(result.composite+100)/200*100}% - 8px)`,transition:"left 0.5s",boxShadow:`0 0 10px ${verdict.color}50`}}/>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:F.label,color:C.dim,marginTop:5}}>
            <span>-100 強い売り</span><span>0 中立</span><span>+100 強い買い</span>
          </div>
        </div>

        {/* Chart */}
        <div style={{...cardStyle,padding:14}}>
          <div style={{fontSize:F.xs,color:C.dim,marginBottom:6}}>{tf==="day"?"📈 本日の5分足":"📈 日足（直近60日）"}</div>
          <MiniChart data={tf==="day"?intra:daily} count={tf==="day"?78:60}/>
        </div>

        {/* Scores */}
        <div style={{...cardStyle}}>
          <div style={{fontSize:F.sm,color:C.dim,marginBottom:8}}>{tfConf.icon} {tfConf.label}の指標（タップで解説）</div>
          {result.scores.map((item,i)=><ScoreBar key={item.key} item={item} expanded={expIdx===i} onToggle={()=>setExpIdx(expIdx===i?null:i)}/>)}
        </div>
      </div>)}

      {/* ═══════════════════════════════════════════
           RESEARCH LAB PAGE
         ═══════════════════════════════════════════ */}
      {page==="research"&&(<div>
        {/* Steps */}
        {[
          {n:0,icon:"📰",title:"Step 1: ニュース収集",desc:"市場に影響する最新ニュースをAIが収集・整理",action:fetchNews,actionLabel:"最新ニュースを分析",result:newsR,color:C.accent},
          {n:1,icon:"🔍",title:"Step 2: 深掘り",desc:"気になるトピックを入力して背景・シナリオを分析",hasInput:true,inputVal:ddQ,setInput:setDdQ,placeholder:"例: 半導体輸出規制の強化",action:fetchDD,actionLabel:"深掘り",result:ddR,color:C.cyan},
          {n:2,icon:"🏭",title:"Step 3: セクター分析",desc:"恩恵セクターと逆風セクターを特定",action:fetchSec,actionLabel:"セクターを分析",result:secR,color:C.green},
          {n:3,icon:"🧪",title:"Step 4: 根拠の検証",desc:"各セクターが影響を受ける因果関係と過去事例を分析",action:fetchSecReason,actionLabel:"根拠を検証",result:secReasonR,color:C.orange,needsPrev:!!secR},
          {n:4,icon:"🏢",title:"Step 5: 銘柄候補",desc:"興味あるセクターの企業をリサーチ（ダイレクトに銘柄含む）",hasInput:true,inputVal:stockQ,setInput:setStockQ,placeholder:"例: 半導体製造装置",action:fetchStocks,actionLabel:"企業を検索",result:stockR,color:C.purple},
          {n:5,icon:"📋",title:"Step 6: 企業深掘り",desc:"1社を選んで業績・競合・リスクを徹底調査",hasInput:true,inputVal:compQ,setInput:setCompQ,placeholder:"例: 東京エレクトロン",action:fetchComp,actionLabel:"徹底調査",result:compR,color:"#ef5350"},
        ].filter(s=>s.n===0||s.n<=step||(s.needsPrev)).map(s=>(
          <div key={s.n} style={{...cardStyle,animation:s.n>0?"fadeIn 0.3s":"none"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,flexWrap:"wrap",gap:8}}>
              <div style={{fontSize:F.h3,fontWeight:700,color:s.color}}>{s.icon} {s.title}</div>
              <button onClick={s.action} disabled={loading} style={{...btnStyle(s.color,true),opacity:loading?0.5:1}}>
                {loading?<span className="loader">分析中...</span>:s.actionLabel}
              </button>
            </div>
            <div style={{fontSize:F.sm,color:C.dim,marginBottom:s.hasInput?10:0}}>{s.desc}</div>
            {s.hasInput&&(<div style={{display:"flex",gap:10,marginTop:8}}>
              <input value={s.inputVal} onChange={e=>s.setInput(e.target.value)} placeholder={s.placeholder} style={{...inputStyle,flex:1}} onKeyDown={e=>e.key==="Enter"&&s.action()}/>
            </div>)}
            <ResultBox text={s.result}/>
          </div>
        ))}

        {step>=5&&(<div style={{...cardStyle,borderColor:`${C.orange}30`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{fontSize:F.h3,fontWeight:700,color:C.orange}}>💡 Step 7: 仮説を記録</div>
            <button onClick={()=>{setShowNewH(!showNewH);setStep(6);}} style={btnStyle(C.orange,true)}>仮説を記録</button>
          </div>
          <div style={{fontSize:F.sm,color:C.dim}}>分析を元に仮説を言語化。後で検証して精度を磨く。</div>
          {showNewH&&(<div style={{background:"#0e1a30",borderRadius:10,padding:18,marginTop:12}}>
            <label style={{fontSize:F.xs,color:C.dim,display:"block",marginBottom:4}}>仮説</label>
            <textarea value={newH.thesis} onChange={e=>setNewH({...newH,thesis:e.target.value})} style={{...inputStyle,minHeight:60,marginBottom:12}}/>
            <div style={{display:"flex",gap:10,marginBottom:12}}>
              <div style={{flex:1}}><label style={{fontSize:F.xs,color:C.dim,display:"block",marginBottom:4}}>セクター</label><input value={newH.sector} onChange={e=>setNewH({...newH,sector:e.target.value})} style={inputStyle}/></div>
              <div style={{flex:1}}><label style={{fontSize:F.xs,color:C.dim,display:"block",marginBottom:4}}>期間</label><select value={newH.timeframe} onChange={e=>setNewH({...newH,timeframe:e.target.value})} style={{...inputStyle,appearance:"auto"}}>{["1ヶ月","3ヶ月","6ヶ月","1年","2年以上"].map(t=><option key={t}>{t}</option>)}</select></div>
            </div>
            <label style={{fontSize:F.xs,color:C.dim,display:"block",marginBottom:4}}>根拠</label>
            <textarea value={newH.basis} onChange={e=>setNewH({...newH,basis:e.target.value})} style={{...inputStyle,minHeight:60,marginBottom:12}}/>
            <button onClick={addHypo} style={btnStyle(C.orange,true)}>保存</button>
          </div>)}
        </div>)}

        <div style={{padding:10,background:`${C.orange}05`,borderRadius:8,border:`1px solid ${C.orange}12`,marginTop:8}}>
          <p style={{fontSize:F.xs,color:"#7a6a4a",lineHeight:1.8}}>⚠️ リサーチ補助ツールです。AIの分析は調査の出発点であり、投資助言ではありません。</p>
        </div>
      </div>)}

      {/* ═══════════════════════════════════════════
           HYPOTHESIS PAGE
         ═══════════════════════════════════════════ */}
      {page==="hypo"&&(<div>
        {/* Sub tabs */}
        <div style={{display:"flex",gap:6,marginBottom:16}}>
          {[["list","仮説一覧"],["stats","成績"]].map(([k,l])=>(
            <button key={k} onClick={()=>setHypoTab(k)} style={{...btnStyle(hypoTab===k?C.orange:C.dim,hypoTab===k),padding:"8px 20px"}}>{l}</button>
          ))}
          <button onClick={()=>setShowNewH(!showNewH)} style={{...btnStyle(C.orange,true),marginLeft:"auto"}}>+ 新しい仮説</button>
        </div>

        {showNewH&&(<div style={{...cardStyle,borderColor:`${C.orange}30`}}>
          <label style={{fontSize:F.xs,color:C.dim,display:"block",marginBottom:4}}>仮説</label>
          <textarea value={newH.thesis} onChange={e=>setNewH({...newH,thesis:e.target.value})} style={{...inputStyle,minHeight:60,marginBottom:12}}/>
          <div style={{display:"flex",gap:10,marginBottom:12}}>
            <div style={{flex:1}}><label style={{fontSize:F.xs,color:C.dim,display:"block",marginBottom:4}}>セクター</label><input value={newH.sector} onChange={e=>setNewH({...newH,sector:e.target.value})} style={inputStyle}/></div>
            <div style={{flex:1}}><label style={{fontSize:F.xs,color:C.dim,display:"block",marginBottom:4}}>期間</label><select value={newH.timeframe} onChange={e=>setNewH({...newH,timeframe:e.target.value})} style={{...inputStyle,appearance:"auto"}}>{["1ヶ月","3ヶ月","6ヶ月","1年","2年以上"].map(t=><option key={t}>{t}</option>)}</select></div>
          </div>
          <label style={{fontSize:F.xs,color:C.dim,display:"block",marginBottom:4}}>根拠</label>
          <textarea value={newH.basis} onChange={e=>setNewH({...newH,basis:e.target.value})} style={{...inputStyle,minHeight:60,marginBottom:12}}/>
          <button onClick={addHypo} style={btnStyle(C.orange,true)}>保存</button>
        </div>)}

        {hypoTab==="list"&&(<div>
          {hypos.length===0&&<div style={{...cardStyle,textAlign:"center",padding:40,color:C.dim,fontSize:F.base}}>まだ仮説がありません。Research Labで分析して仮説を立てましょう。</div>}
          {hypos.map(h=>(<div key={h.id} style={{...cardStyle,borderColor:h.status==="的中"?`${C.green}30`:h.status==="外れ"?`${C.red}30`:h.status==="一部的中"?`${C.orange}30`:C.border}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
              <div style={{flex:1}}>
                <div style={{fontSize:F.base,fontWeight:600,color:C.text,lineHeight:1.7,marginBottom:6}}>{h.thesis}</div>
                <div style={{display:"flex",gap:10,flexWrap:"wrap",fontSize:F.xs}}>
                  {h.sector&&<span style={{background:`${C.purple}15`,color:C.purple,padding:"3px 10px",borderRadius:6}}>{h.sector}</span>}
                  <span style={{color:C.dim}}>{h.timeframe}</span>
                  <span style={{color:C.dim}}>{new Date(h.createdAt).toLocaleDateString("ja-JP")}</span>
                </div>
              </div>
              <span style={{fontSize:F.sm,fontWeight:700,padding:"4px 14px",borderRadius:6,flexShrink:0,background:h.status==="的中"?`${C.green}15`:h.status==="外れ"?`${C.red}15`:h.status==="一部的中"?`${C.orange}15`:`${C.accent}15`,color:h.status==="的中"?C.green:h.status==="外れ"?C.red:h.status==="一部的中"?C.orange:C.accent}}>{h.status}</span>
            </div>
            {h.basis&&<div style={{fontSize:F.sm,color:"#7090a8",lineHeight:1.8,padding:"10px 14px",background:"#0e1a30",borderRadius:8,marginBottom:10}}><strong style={{color:C.dim}}>根拠：</strong>{h.basis}</div>}
            {h.lastVerification&&<div style={{fontSize:F.sm,color:"#7a9ab8",lineHeight:1.8,padding:"12px 14px",background:`${C.accent}06`,borderRadius:8,borderLeft:`3px solid ${C.accent}`,marginBottom:10}}>
              <div style={{fontSize:F.xs,color:C.dim,marginBottom:6}}>🔍 最終検証: {h.lastVerifiedAt?new Date(h.lastVerifiedAt).toLocaleDateString("ja-JP"):""}</div>
              <div style={{whiteSpace:"pre-wrap"}}>{h.lastVerification}</div>
            </div>}
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
              <button onClick={()=>verifyHypo(h)} disabled={loading} style={{...btnStyle(C.accent,false),padding:"8px 14px"}}>{loading?"検証中...":"🔍 AI検証"}</button>
              {["的中","一部的中","外れ"].map(st=><button key={st} onClick={()=>saveH(hypos.map(x=>x.id===h.id?{...x,status:st,reviewedAt:new Date().toISOString()}:x))} style={{...btnStyle(st==="的中"?C.green:st==="外れ"?C.red:C.orange,h.status===st),padding:"8px 14px"}}>{st}</button>)}
              <button onClick={()=>saveH(hypos.filter(x=>x.id!==h.id))} style={{...btnStyle("#78909c",false),padding:"8px 14px"}}>削除</button>
            </div>
            <input value={h.review||""} onChange={e=>saveH(hypos.map(x=>x.id===h.id?{...x,review:e.target.value}:x))} placeholder="振り返りメモ（何が想定と違った？）" style={{...inputStyle,fontSize:F.sm}}/>
          </div>))}
        </div>)}

        {hypoTab==="stats"&&(<div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(120px, 1fr))",gap:10,marginBottom:16}}>
            {[{l:"仮説総数",v:stats.total,c:C.accent},{l:"検証中",v:stats.active,c:C.accent},{l:"的中",v:stats.hit,c:C.green},{l:"一部的中",v:stats.partial,c:C.orange},{l:"外れ",v:stats.miss,c:C.red},{l:"的中率",v:`${hitRate}%`,c:hitRate!=="—"&&parseInt(hitRate)>=50?C.green:C.red}].map((c,i)=>(
              <div key={i} style={{...cardStyle,textAlign:"center",padding:"16px 10px"}}>
                <div style={{fontSize:F.xs,color:C.dim,marginBottom:6}}>{c.l}</div>
                <div style={{fontSize:28,fontWeight:700,color:c.c}}>{c.v}</div>
              </div>
            ))}
          </div>
        </div>)}
      </div>)}

      {/* ═══════════════════════════════════════════
           DISCIPLINE PAGE — 規律ツール群
         ═══════════════════════════════════════════ */}
      {page==="disc"&&(<div>
        {/* Sub tabs */}
        <div style={{display:"flex",gap:4,marginBottom:16,flexWrap:"wrap"}}>
          {[["reframe","💪 リフレーミング"],["bias","🧠 バイアス診断"],["kelly","📊 ケリー基準"],["ips","📜 投資方針書"]].map(([k,l])=>(
            <button key={k} onClick={()=>setDiscTab(k)} style={{...btnStyle(discTab===k?C.cyan:C.dim,discTab===k),padding:"10px 16px"}}>{l}</button>
          ))}
        </div>

        {/* ════ REFRAMING ════ */}
        {discTab==="reframe"&&(<div>
          <div style={cardStyle}>
            <div style={{fontSize:F.h2,fontWeight:700,color:C.cyan,marginBottom:8}}>💪 リフレーミング回診</div>
            <div style={{fontSize:F.sm,color:C.dim,lineHeight:2,marginBottom:16}}>
              保有銘柄に対して「もし今この株を持っていなかったら、今の価格で新たに買うか？」と問う。
              答えが「No」なら、持ち続ける理由は合理的判断ではなく、損失を認めたくない感情（アンカリング）に過ぎない可能性がある。
            </div>
            <div style={{background:"#0e1a30",borderRadius:10,padding:18}}>
              <div style={{display:"flex",gap:10,marginBottom:12,flexWrap:"wrap"}}>
                <div style={{flex:2,minWidth:150}}><label style={{fontSize:F.xs,color:C.dim,display:"block",marginBottom:4}}>銘柄名</label><input value={rfName} onChange={e=>setRfName(e.target.value)} placeholder="例: トヨタ自動車" style={inputStyle}/></div>
                <div style={{flex:1,minWidth:100}}><label style={{fontSize:F.xs,color:C.dim,display:"block",marginBottom:4}}>買値</label><input type="number" value={rfBuyPrice} onChange={e=>setRfBuyPrice(e.target.value)} placeholder="1000" style={inputStyle}/></div>
                <div style={{flex:1,minWidth:100}}><label style={{fontSize:F.xs,color:C.dim,display:"block",marginBottom:4}}>現在値</label><input type="number" value={rfNowPrice} onChange={e=>setRfNowPrice(e.target.value)} placeholder="800" style={inputStyle}/></div>
              </div>

              {rfValid&&(
                <div style={{background:rfIsLoss?`${C.red}08`:`${C.green}08`,borderRadius:8,padding:14,marginBottom:12,border:`1px solid ${rfIsLoss?C.red:C.green}20`}}>
                  <div style={{fontSize:F.h3,fontWeight:700,color:rfIsLoss?C.red:C.green,marginBottom:6}}>
                    {rfIsLoss?"📉":"📈"} 含み{rfIsLoss?"損":"益"}: {rfPct}%（{rfIsLoss?"":"+"}¥{(rfNp-rfBp).toLocaleString()}）
                  </div>
                  {rfIsLoss&&<div style={{fontSize:F.sm,color:C.orange,lineHeight:1.9}}>
                    ⚠️ 含み損の状態です。プロスペクト理論によると、この状況であなたの脳は「損失を確定させたくない」というリスク追求モードに入っている可能性があります。
                    冷静に以下の問いに答えてください。
                  </div>}
                </div>
              )}

              <div style={{background:`${C.cyan}08`,borderRadius:8,padding:16,marginBottom:14,borderLeft:`3px solid ${C.cyan}`}}>
                <div style={{fontSize:F.h3,fontWeight:700,color:C.cyan,marginBottom:8}}>核心の問い</div>
                <div style={{fontSize:F.base,color:C.text,lineHeight:2}}>
                  「もし今日、手元に現金があり、この銘柄を持っていなかったとして——<br/>
                  <strong style={{color:"#fff"}}>今の価格（{rfNowPrice||"???"}円）で、新たにこの株を買いますか？</strong>」
                </div>
              </div>

              <div style={{display:"flex",gap:8,marginBottom:12}}>
                {[{v:"Yes",label:"買う",color:C.green},{v:"No",label:"買わない",color:C.red},{v:"Maybe",label:"迷う",color:C.orange}].map(o=>(
                  <button key={o.v} onClick={()=>setRfAnswer(o.v)} style={{...btnStyle(o.color,rfAnswer===o.v),flex:1,padding:"14px",fontSize:F.base,fontWeight:700}}>
                    {o.label}
                  </button>
                ))}
              </div>

              {rfAnswer==="No"&&(<div style={{background:`${C.red}08`,borderRadius:8,padding:16,marginBottom:12,borderLeft:`3px solid ${C.red}`}}>
                <div style={{fontSize:F.h3,fontWeight:700,color:C.red,marginBottom:6}}>⚠️ 売却を検討すべきです</div>
                <div style={{fontSize:F.sm,color:"#c08080",lineHeight:2}}>
                  「買わない」と答えたなら、今から持ち続けている理由は合理的判断ではなく、買値に戻ってほしいという感情（アンカリング）です。
                  買値はもう関係ありません。今の価格で新規に買う価値がないなら、保有を続ける価値もありません。
                </div>
              </div>)}
              {rfAnswer==="Yes"&&(<div style={{background:`${C.green}08`,borderRadius:8,padding:16,marginBottom:12,borderLeft:`3px solid ${C.green}`}}>
                <div style={{fontSize:F.h3,fontWeight:700,color:C.green,marginBottom:6}}>✅ 保有継続に合理的根拠あり</div>
                <div style={{fontSize:F.sm,color:"#80c0a0",lineHeight:2}}>今の価格でも買う価値があるなら、保有継続は合理的です。ただし、その「買う理由」を言語化して記録しましょう。</div>
              </div>)}
              {rfAnswer==="Maybe"&&(<div style={{background:`${C.orange}08`,borderRadius:8,padding:16,marginBottom:12,borderLeft:`3px solid ${C.orange}`}}>
                <div style={{fontSize:F.h3,fontWeight:700,color:C.orange,marginBottom:6}}>💡 判断保留 → 追加リサーチが必要</div>
                <div style={{fontSize:F.sm,color:"#c0a060",lineHeight:2}}>迷うなら、何が足りないのか書き出してみましょう。判断材料が揃うまでは、ポジションサイズを半分に減らすことも選択肢です。</div>
              </div>)}

              <div style={{marginBottom:12}}>
                <label style={{fontSize:F.xs,color:C.dim,display:"block",marginBottom:4}}>判断の理由メモ</label>
                <textarea value={rfReason} onChange={e=>setRfReason(e.target.value)} placeholder="なぜその判断をしたか、根拠を記録" style={{...inputStyle,minHeight:60}}/>
              </div>
              <button onClick={addReframe} style={btnStyle(C.cyan,true)}>記録を保存</button>
            </div>
          </div>

          {/* Past reframes */}
          {reframes.length>0&&<div style={cardStyle}>
            <div style={{fontSize:F.h3,fontWeight:700,color:C.dim,marginBottom:10}}>📋 過去の回診記録</div>
            {reframes.slice(0,10).map(r=>(
              <div key={r.id} style={{display:"flex",gap:12,alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
                <span style={{fontSize:F.base,fontWeight:600,color:C.text,minWidth:100}}>{r.name}</span>
                <span style={{fontSize:F.sm,color:C.dim}}>買値{r.buyPrice}→現在{r.nowPrice}</span>
                <span style={{fontSize:F.sm,fontWeight:700,color:r.answer==="Yes"?C.green:r.answer==="No"?C.red:C.orange,padding:"2px 10px",borderRadius:4,background:r.answer==="Yes"?`${C.green}15`:r.answer==="No"?`${C.red}15`:`${C.orange}15`}}>{r.answer==="Yes"?"買う":r.answer==="No"?"買わない":"迷う"}</span>
                <span style={{fontSize:F.xs,color:C.dim,marginLeft:"auto"}}>{new Date(r.date).toLocaleDateString("ja-JP")}</span>
              </div>
            ))}
          </div>}
        </div>)}

        {/* ════ BIAS DIAGNOSIS ════ */}
        {discTab==="bias"&&(<div>
          <div style={cardStyle}>
            <div style={{fontSize:F.h2,fontWeight:700,color:C.purple,marginBottom:8}}>🧠 バイアス自己診断</div>
            <div style={{fontSize:F.sm,color:C.dim,lineHeight:2,marginBottom:16}}>
              正直に答えてください。チェックが多いほど、心理バイアスに支配されている危険性が高い。
              定期的に（月1回推奨）診断し、自分の状態を客観視することが目的です。
            </div>
            {[
              {cat:"🎯 自信過剰バイアス",color:C.red,items:[
                {id:"oc1",text:"投資成績が良いとき、自分の実力だけだと思い、悪いとき運が悪かったと思う"},
                {id:"oc2",text:"「自分だけは暴落の直前で逃げ切れる」と思ったことがある"},
                {id:"oc3",text:"過去に1回成功した手法を、状況が変わっても信じ続けている"},
                {id:"oc4",text:"他人の投資アドバイスを「素人の意見」と反射的に馬鹿にしている"},
              ]},
              {cat:"🔍 確証バイアス",color:C.orange,items:[
                {id:"cb1",text:"保有銘柄のポジティブなニュースばかりSNSで検索してしまう"},
                {id:"cb2",text:"自分の銘柄に否定的な分析を見ると、イラっとする"},
                {id:"cb3",text:"「この株は必ず上がる」と思い込み、反証を探そうとしない"},
              ]},
              {cat:"⚓ アンカリング・損失回避",color:C.cyan,items:[
                {id:"an1",text:"「買値に戻るまで売らない」と決めている銘柄がある"},
                {id:"an2",text:"含み損の銘柄を見ないようにしている（証券アプリを開かない等）"},
                {id:"an3",text:"少し利益が出ると「失う前に確定しよう」と焦る"},
                {id:"an4",text:"含み損の銘柄をナンピン（買い増し）して平均取得価格を下げようとしている"},
              ]},
              {cat:"🚩 その他の危険信号",color:"#78909c",items:[
                {id:"ot1",text:"SNSの「爆益報告」を見て焦りを感じたことがある"},
                {id:"ot2",text:"投資方針書（IPS）を書いていない、または書いたが守っていない"},
                {id:"ot3",text:"損切りルールが曖昧、または「状況を見て判断」としている"},
              ]},
            ].map(section=>(
              <div key={section.cat} style={{...cardStyle,borderColor:`${section.color}20`}}>
                <div style={{fontSize:F.h3,fontWeight:700,color:section.color,marginBottom:12}}>{section.cat}</div>
                {section.items.map(item=>(
                  <label key={item.id} style={{display:"flex",gap:12,alignItems:"flex-start",padding:"10px 0",borderBottom:`1px solid ${C.border}`,cursor:"pointer"}}>
                    <input type="checkbox" checked={!!biasChecks[item.id]} onChange={e=>{const bc={...biasChecks,[item.id]:e.target.checked};saveBC(bc);}} style={{marginTop:4,width:20,height:20,flexShrink:0,accentColor:section.color}}/>
                    <span style={{fontSize:F.base,color:biasChecks[item.id]?section.color:C.text,lineHeight:1.8}}>{item.text}</span>
                  </label>
                ))}
              </div>
            ))}
            <div style={{...cardStyle,textAlign:"center",borderColor:`${biasCol}30`}}>
              <div style={{fontSize:F.h3,color:C.dim,marginBottom:8}}>診断結果</div>
              <div style={{fontSize:42,fontWeight:700,color:biasCol}}>{biasChecked}/{biasTotal}</div>
              <div style={{fontSize:F.h2,fontWeight:700,color:biasCol,marginBottom:8}}>バイアスリスク: {biasLevel}</div>
              <div style={{fontSize:F.sm,color:C.dim,lineHeight:2}}>
                {biasPct>=60?"⚠️ 複数のバイアスが判断を歪めている可能性が高い。投資方針書の見直しと、全保有銘柄のリフレーミングを強く推奨。":
                 biasPct>=30?"💡 一部のバイアスが活性化しています。チェックが入った項目を意識的に監視し、ルールベース運用を徹底してください。":
                 "✅ 現時点ではバイアスのコントロールができています。この状態を維持するため、定期的な自己診断を続けてください。"}
              </div>
            </div>
          </div>
        </div>)}

        {/* ════ KELLY CRITERION ════ */}
        {discTab==="kelly"&&(<div>
          <div style={cardStyle}>
            <div style={{fontSize:F.h2,fontWeight:700,color:C.green,marginBottom:8}}>📊 ケリー基準計算機</div>
            <div style={{fontSize:F.sm,color:C.dim,lineHeight:2,marginBottom:6}}>
              勝率とリスクリワード比から、1回の取引で資産の何%を賭けるべきかを数学的に算出。
              意見ではなく数式で破滅を回避する。
            </div>
            <div style={{fontSize:F.xs,color:C.orange,lineHeight:2,marginBottom:16,padding:"10px 14px",background:`${C.orange}08`,borderRadius:8}}>
              ⚠️ 実運用では「ハーフケリー（ケリー基準の半分）」を推奨。フルケリーは理論上の最適値だが、推定誤差によるリスクが大きい。
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
              <div><label style={{fontSize:F.xs,color:C.dim,display:"block",marginBottom:4}}>勝率 %</label><input type="number" value={kellyWinRate} onChange={e=>setKellyWinRate(e.target.value)} style={inputStyle} placeholder="55"/></div>
              <div><label style={{fontSize:F.xs,color:C.dim,display:"block",marginBottom:4}}>平均利益率 %</label><input type="number" value={kellyWinAvg} onChange={e=>setKellyWinAvg(e.target.value)} style={inputStyle} placeholder="10"/></div>
              <div><label style={{fontSize:F.xs,color:C.dim,display:"block",marginBottom:4}}>平均損失率 %</label><input type="number" value={kellyLossAvg} onChange={e=>setKellyLossAvg(e.target.value)} style={inputStyle} placeholder="5"/></div>
              <div><label style={{fontSize:F.xs,color:C.dim,display:"block",marginBottom:4}}>総資産額 ¥</label><input type="number" value={kellyCapital} onChange={e=>setKellyCapital(e.target.value)} style={inputStyle} placeholder="1000000"/></div>
            </div>

            {kellyResult&&(<div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(140px, 1fr))",gap:10,marginBottom:16}}>
                {[
                  {l:"期待値",v:`${kellyResult.expectation.toFixed(2)}%`,c:kellyResult.expectation>0?C.green:C.red,sub:"1取引あたりの期待リターン"},
                  {l:"ケリー基準",v:`${kellyResult.kelly.toFixed(1)}%`,c:C.accent,sub:"理論上の最適投入率"},
                  {l:"ハーフケリー（推奨）",v:`${kellyResult.halfKelly.toFixed(1)}%`,c:C.green,sub:"安全マージン込みの推奨値"},
                  {l:"推奨投入額",v:`¥${Math.round(kellyResult.optimalAmount).toLocaleString()}`,c:C.cyan,sub:`総資産 ¥${parseInt(kellyCapital).toLocaleString()} の ${kellyResult.halfKelly.toFixed(1)}%`},
                ].map((c,i)=>(
                  <div key={i} style={{...cardStyle,textAlign:"center",padding:"16px 12px"}}>
                    <div style={{fontSize:F.xs,color:C.dim,marginBottom:6}}>{c.l}</div>
                    <div style={{fontSize:F.h2,fontWeight:700,color:c.c}}>{c.v}</div>
                    <div style={{fontSize:F.label,color:C.dim,marginTop:4}}>{c.sub}</div>
                  </div>
                ))}
              </div>

              {kellyResult.expectation<=0&&(
                <div style={{...cardStyle,borderColor:`${C.red}30`,background:`${C.red}08`}}>
                  <div style={{fontSize:F.h3,fontWeight:700,color:C.red,marginBottom:6}}>🚫 期待値がマイナスです</div>
                  <div style={{fontSize:F.sm,color:"#c08080",lineHeight:2}}>
                    この勝率とリスクリワード比では、取引を繰り返すほど資産が減少します。
                    ケリー基準以前の問題として、手法そのものを見直す必要があります。
                  </div>
                </div>
              )}

              <div style={cardStyle}>
                <div style={{fontSize:F.h3,fontWeight:700,color:C.dim,marginBottom:10}}>📐 ケリー基準の公式</div>
                <div style={{background:"#0e1a30",borderRadius:8,padding:16,fontSize:F.base,color:C.text,lineHeight:2.2,fontFamily:"'JetBrains Mono',monospace"}}>
                  K = (p × (B + 1) - 1) / B<br/><br/>
                  <span style={{color:C.dim}}>p = 勝率 = {(parseFloat(kellyWinRate)/100).toFixed(2)}</span><br/>
                  <span style={{color:C.dim}}>B = オッズ（平均利益÷平均損失）= {kellyResult.b.toFixed(2)}</span><br/>
                  <span style={{color:C.dim}}>K = ({(parseFloat(kellyWinRate)/100).toFixed(2)} × ({kellyResult.b.toFixed(2)} + 1) - 1) / {kellyResult.b.toFixed(2)}</span><br/>
                  <span style={{color:C.accent}}>K = {(kellyResult.kelly/100).toFixed(4)} = <strong>{kellyResult.kelly.toFixed(1)}%</strong></span>
                </div>
                <div style={{fontSize:F.sm,color:C.dim,lineHeight:2,marginTop:12}}>
                  <strong style={{color:C.orange}}>重要：</strong>ケリー基準は「期待値がプラスの状態を大数の法則が効くまで繰り返す」前提で成立する。
                  一度の勝負に全額投入すれば、統計的にいつか必ず破滅する。この計算機は「破滅確率をゼロにする」ための道具。
                </div>
              </div>
            </div>)}
          </div>
        </div>)}

        {/* ════ IPS (Investment Policy Statement) ════ */}
        {discTab==="ips"&&(<div>
          <div style={cardStyle}>
            <div style={{fontSize:F.h2,fontWeight:700,color:C.orange,marginBottom:8}}>📜 投資方針書（IPS）</div>
            <div style={{fontSize:F.sm,color:C.dim,lineHeight:2,marginBottom:16}}>
              パニック時の自分を縛るための「自分との契約書」。冷静な今のうちに書き、相場が荒れた時はこれだけを見る。
              ルールを変えたくなった時こそ、感情に支配されている証拠。
            </div>

            <div style={{background:`${C.orange}08`,borderRadius:10,padding:18,marginBottom:16,borderLeft:`3px solid ${C.orange}`}}>
              <div style={{fontSize:F.h3,fontWeight:700,color:C.orange,marginBottom:12}}>📌 Clause 1: 損切りルール（絶対遵守）</div>
              <div style={{fontSize:F.sm,color:C.dim,marginBottom:8,lineHeight:2}}>
                「私は買値から <strong style={{color:C.text}}>____%</strong> 下落したら、理由を問わず機械的に売却する」
              </div>
              <div style={{display:"flex",gap:10,alignItems:"center"}}>
                <span style={{fontSize:F.base,color:C.text}}>損切りライン:</span>
                <input type="number" value={ips.stopLoss} onChange={e=>{const v={...ips,stopLoss:e.target.value};setIps(v);saveIPS(v);}} style={{...inputStyle,width:80,textAlign:"center"}} />
                <span style={{fontSize:F.base,color:C.text}}>%下落で売却</span>
              </div>
              <div style={{fontSize:F.xs,color:C.dim,marginTop:8,lineHeight:1.8}}>
                推奨: 短期5〜8% / スイング8〜15% / 長期15〜20%。逆指値注文で自動化すること。
              </div>
            </div>

            <div style={{background:`${C.accent}08`,borderRadius:10,padding:18,marginBottom:16,borderLeft:`3px solid ${C.accent}`}}>
              <div style={{fontSize:F.h3,fontWeight:700,color:C.accent,marginBottom:12}}>📌 Clause 2: ポジションサイズ上限</div>
              <div style={{fontSize:F.sm,color:C.dim,marginBottom:8,lineHeight:2}}>
                「1銘柄に対する投資額は、総資産の <strong style={{color:C.text}}>____%</strong> を超えない」
              </div>
              <div style={{display:"flex",gap:10,alignItems:"center"}}>
                <span style={{fontSize:F.base,color:C.text}}>1銘柄上限:</span>
                <input type="number" value={ips.maxPosition} onChange={e=>{const v={...ips,maxPosition:e.target.value};setIps(v);saveIPS(v);}} style={{...inputStyle,width:80,textAlign:"center"}} />
                <span style={{fontSize:F.base,color:C.text}}>% / ケリー基準で算出も可</span>
              </div>
            </div>

            <div style={{background:`${C.green}08`,borderRadius:10,padding:18,marginBottom:16,borderLeft:`3px solid ${C.green}`}}>
              <div style={{fontSize:F.h3,fontWeight:700,color:C.green,marginBottom:12}}>📌 Clause 3: リバランス規則</div>
              <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:8}}>
                <span style={{fontSize:F.base,color:C.text}}>リバランス頻度:</span>
                <select value={ips.rebalancePeriod} onChange={e=>{const v={...ips,rebalancePeriod:e.target.value};setIps(v);saveIPS(v);}} style={{...inputStyle,width:150,appearance:"auto"}}>
                  {["毎月","四半期","半年","年1回"].map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
              <div style={{fontSize:F.xs,color:C.dim,lineHeight:1.8}}>
                資産配分が目標から±5%以上乖離した場合、機械的にリバランスを実行する。「上がったものを売り、下がったものを買う」
              </div>
            </div>

            <div style={{background:`${C.purple}08`,borderRadius:10,padding:18,marginBottom:16,borderLeft:`3px solid ${C.purple}`}}>
              <div style={{fontSize:F.h3,fontWeight:700,color:C.purple,marginBottom:12}}>📌 Clause 4: エコノミックモート崩壊ルール</div>
              <div style={{fontSize:F.sm,color:C.dim,marginBottom:8,lineHeight:2}}>
                企業の競争優位性（堀）が構造的に崩壊したと判断した場合、損益に関わらず即座に全ポジション解消。
              </div>
              <textarea value={ips.moatRule} onChange={e=>{const v={...ips,moatRule:e.target.value};setIps(v);saveIPS(v);}} placeholder="例: 主力製品の市場シェアが20%以上低下した場合、新規参入者がコスト構造で逆転した場合、等" style={{...inputStyle,minHeight:60}}/>
            </div>

            <div style={{background:"#0e1a30",borderRadius:10,padding:18,marginBottom:16}}>
              <div style={{fontSize:F.h3,fontWeight:700,color:C.text,marginBottom:12}}>📌 Clause 5: 自分ルール（自由記述）</div>
              <div style={{fontSize:F.sm,color:C.dim,marginBottom:8,lineHeight:2}}>
                暴落時にやること・やらないこと。ナンピン禁止、SNS遮断、等。冷静な今の自分が、パニック時の自分に残す遺言。
              </div>
              <textarea value={ips.customRules} onChange={e=>{const v={...ips,customRules:e.target.value};setIps(v);saveIPS(v);}} placeholder={"例:\n・暴落時にTwitter(X)を見ない\n・ナンピンは絶対にしない\n・含み損が-20%を超えたら一旦全ポジション閉じて1週間休む\n・月1回リフレーミング回診を全銘柄に実施する"} style={{...inputStyle,minHeight:120}}/>
            </div>

            <div style={{...cardStyle,background:`${C.cyan}06`,borderColor:`${C.cyan}20`}}>
              <div style={{fontSize:F.h3,fontWeight:700,color:C.cyan,marginBottom:10}}>🔄 定次リフレーミング・リマインダー</div>
              <div style={{fontSize:F.sm,color:"#80b8c8",lineHeight:2}}>
                毎月、保有する全銘柄に対して「💪 リフレーミング回診」タブで以下を実行してください：<br/>
                1. 「今この株を持っていなかったら、今の価格で買うか？」に答える<br/>
                2. 答えが「No」の銘柄は、損益に関わらず売却を検討<br/>
                3. バイアス自己診断を実施し、前月と比較<br/>
                この習慣こそが、あなたの最大の「エッジ（優位性）」になります。
              </div>
            </div>
          </div>
        </div>)}
      </div>)}
    </div>
  );
}
