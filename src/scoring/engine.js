import { calcSMA } from "../indicators/sma";
import { calcRSI } from "../indicators/rsi";
import { calcMACD } from "../indicators/macd";
import { calcBollinger } from "../indicators/bollinger";
import { calcADX } from "../indicators/adx";
import { calcStoch } from "../indicators/stochastic";
import { calcVWAP } from "../indicators/vwap";
import { detectCandlePatterns } from "../indicators/candlePatterns";
import { detectChartPatterns } from "../indicators/chartPatterns";
import { TF } from "./timeframes";
import { detectRegime, getRegimeMultiplier } from "./regime";
import { C } from "../constants/colors";

/**
 * 全指標スコアリング
 * タイムフレーム別に6〜7指標を複合スコアリング（-100〜+100）
 */
export function scoreAll(tf, daily, intra) {
  const d = tf === "day" ? intra : daily;
  const n = d.length - 1;
  if (n < 20) return { scores: [], composite: 0, regime: null };

  // 日足ベースの指標計算
  const sma20 = calcSMA(daily, 20);
  const sma50 = calcSMA(daily, 50);
  const sma200 = calcSMA(daily, 200);
  const rsi14 = calcRSI(daily, 14);
  const rsi21 = calcRSI(daily, 21);
  const macdD = calcMACD(daily);
  const macdL = calcMACD(daily, 26, 52, 18);
  const bb = calcBollinger(daily, 20);
  const adxD = calcADX(daily, 14);
  const stochD = calcStoch(daily, 14, 3);
  const dn = daily.length - 1;

  // デイトレ用の指標
  const vwap = tf === "day" ? calcVWAP(intra) : [];
  const rsi7 = tf === "day" ? calcRSI(intra, 7) : [];
  const sf = tf === "day" ? calcStoch(intra, 5, 3) : { k: [], d: [] };
  const s5 = tf === "day" ? calcSMA(intra, 5) : [];
  const s10 = tf === "day" ? calcSMA(intra, 10) : [];

  // レジーム判定
  const regime = detectRegime(daily, adxD, bb);
  const rm = getRegimeMultiplier(regime.regime);

  const scores = [];

  for (const ind of TF[tf].inds) {
    let s = 0;
    const reasons = [];

    // --- デイトレード ---
    if (tf === "day") {
      s = scoreDayIndicator(ind, { n, intra, vwap, rsi7, sf, s5, s10 }, s, reasons);
    }

    // --- スイング ---
    if (tf === "swing") {
      s = scoreSwingIndicator(ind, { dn, daily, sma20, sma50, rsi14, macdD, bb, adxD, stochD }, s, reasons);
    }

    // --- 中長期 ---
    if (tf === "long") {
      s = scoreLongIndicator(ind, { dn, daily, sma50, sma200, rsi21, macdL, adxD }, s, reasons);
    }

    s = Math.max(-100, Math.min(100, Math.round(s * rm)));
    scores.push({ ...ind, score: s, reasons });
  }

  const tw = scores.reduce((s, x) => s + x.weight, 0);
  const composite = +(scores.reduce((s, x) => s + x.score * x.weight, 0) / tw).toFixed(1);

  // チャートパターン検出（日足のみ）
  const chartPats = tf !== "day" ? detectChartPatterns(daily, Math.min(60, daily.length)) : [];

  return { scores, composite, regime, chartPatterns: chartPats };
}

// --- デイトレ指標スコアリング ---
function scoreDayIndicator(ind, ctx, s, reasons) {
  const { n, intra, vwap, rsi7, sf, s5, s10 } = ctx;

  if (ind.key === "vwap" && vwap[n]) {
    const dev = ((intra[n].c - vwap[n]) / vwap[n]) * 100;
    if (dev < -0.3) { s = 60; reasons.push(`VWAP下方${dev.toFixed(2)}%（割安）`); }
    else if (dev > 0.3) { s = -60; reasons.push(`VWAP上方+${dev.toFixed(2)}%（割高）`); }
    else { reasons.push(`VWAP近辺（${dev.toFixed(2)}%）`); }
  }
  else if (ind.key === "momentum") {
    let c = 0;
    for (let i = n; i > Math.max(0, n - 5); i--) {
      if (intra[i].c > intra[i].o) c++; else c--;
    }
    if (c >= 4) { s = 55; reasons.push("連続陽線（強い上昇勢い）"); }
    else if (c <= -4) { s = -55; reasons.push("連続陰線（強い下落勢い）"); }
    else { reasons.push("方向感なし"); }
    if (n > 0 && s5[n] && s10[n]) {
      if (s5[n] > s10[n] && (s5[n - 1] || 0) <= (s10[n - 1] || 0)) { s += 30; reasons.push("SMA5がSMA10上抜け"); }
      if (s5[n] < s10[n] && (s5[n - 1] || 0) >= (s10[n - 1] || 0)) { s -= 30; reasons.push("SMA5がSMA10下抜け"); }
    }
  }
  else if (ind.key === "rsi_fast" && rsi7[n] != null) {
    const v = rsi7[n];
    if (v < 20) { s = 80; reasons.push(`RSI(7)=${v.toFixed(0)} 極度の売られすぎ`); }
    else if (v < 30) { s = 45; reasons.push(`RSI(7)=${v.toFixed(0)} 売られすぎ`); }
    else if (v > 80) { s = -80; reasons.push(`RSI(7)=${v.toFixed(0)} 極度の買われすぎ`); }
    else if (v > 70) { s = -45; reasons.push(`RSI(7)=${v.toFixed(0)} 買われすぎ`); }
    else { reasons.push(`RSI(7)=${v.toFixed(0)} 中立`); }
  }
  else if (ind.key === "stoch_fast" && sf.k[n] != null) {
    const kv = sf.k[n], dv = sf.d[n] || 50;
    if (kv < 20 && kv > dv) { s = 70; reasons.push("売られすぎ圏でGC"); }
    else if (kv > 80 && kv < dv) { s = -70; reasons.push("買われすぎ圏でDC"); }
    else if (kv < 20) { s = 40; reasons.push(`%K=${kv.toFixed(0)} 売られすぎ`); }
    else if (kv > 80) { s = -40; reasons.push(`%K=${kv.toFixed(0)} 買われすぎ`); }
    else { reasons.push(`%K=${kv.toFixed(0)} 中立`); }
  }
  else if (ind.key === "vol_spike") {
    const av = n > 5 ? intra.slice(Math.max(0, n - 20), n).reduce((sum, x) => sum + x.v, 0) / Math.min(20, n) : intra[n].v;
    const r = av > 0 ? intra[n].v / av : 1;
    const up = intra[n].c > intra[n].o;
    if (r > 2 && up) { s = 70; reasons.push(`出来高${r.toFixed(1)}倍+陽線`); }
    else if (r > 2) { s = -70; reasons.push(`出来高${r.toFixed(1)}倍+陰線`); }
    else if (r > 1.5 && up) { s = 35; reasons.push(`出来高${r.toFixed(1)}倍+上昇`); }
    else if (r > 1.5) { s = -35; reasons.push(`出来高${r.toFixed(1)}倍+下落`); }
    else { reasons.push(`出来高${r.toFixed(1)}倍（平均的）`); }
  }
  else if (ind.key === "candle") {
    // ローソク足パターン認識ライブラリで検出
    const patterns = detectCandlePatterns(intra, n);
    if (patterns.length > 0) {
      const best = patterns.reduce((a, b) => b.strength > a.strength ? b : a, patterns[0]);
      const sign = best.signal === "buy" ? 1 : best.signal === "sell" ? -1 : 0;
      s = sign * best.strength * 25; // strength 1=25, 2=50, 3=75
      reasons.push(`${best.nameJa}（${best.signal === "buy" ? "買い" : best.signal === "sell" ? "売り" : "中立"}シグナル）`);
      if (patterns.length > 1) {
        reasons.push(`他に${patterns.length - 1}つのパターンも検出`);
      }
    } else {
      const body = Math.abs(intra[n].c - intra[n].o);
      const range = intra[n].h - intra[n].l || 0.001;
      if (body / range > 0.7 && intra[n].c > intra[n].o) { s = 50; reasons.push("大陽線"); }
      else if (body / range > 0.7) { s = -50; reasons.push("大陰線"); }
      else { reasons.push("特筆すべきパターンなし"); }
    }
  }

  return s;
}

// --- スイング指標スコアリング ---
function scoreSwingIndicator(ind, ctx, s, reasons) {
  const { dn, daily, sma20, sma50, rsi14, macdD, bb, adxD, stochD } = ctx;

  if (ind.key === "sma_trend" && sma20[dn] && sma50[dn]) {
    const a20 = daily[dn].c > sma20[dn], a50 = daily[dn].c > sma50[dn];
    if (a20 && a50) { s = 40; reasons.push("SMA20/50の上（強気）"); }
    else if (!a20 && !a50) { s = -40; reasons.push("SMA20/50の下（弱気）"); }
    else { s = a20 ? 10 : -10; reasons.push(a20 ? "SMA20上・50下" : "SMA20下・50上"); }
    if (dn > 0 && sma20[dn] > sma50[dn] && sma20[dn - 1] <= sma50[dn - 1]) { s += 50; reasons.push("ゴールデンクロス!"); }
    if (dn > 0 && sma20[dn] < sma50[dn] && sma20[dn - 1] >= sma50[dn - 1]) { s -= 50; reasons.push("デッドクロス!"); }
  }
  else if (ind.key === "macd" && macdD.hist[dn] != null) {
    const h = macdD.hist;
    if (h[dn] > 0 && h[dn - 1] <= 0) { s = 70; reasons.push("ヒストグラム負→正"); }
    else if (h[dn] < 0 && h[dn - 1] >= 0) { s = -70; reasons.push("ヒストグラム正→負"); }
    else if (h[dn] > 0 && h[dn] > h[dn - 1]) { s = 35; reasons.push("ヒストグラム拡大（強気）"); }
    else if (h[dn] < 0 && h[dn] < h[dn - 1]) { s = -35; reasons.push("ヒストグラム拡大（弱気）"); }
    else { s = h[dn] > 0 ? 10 : -10; reasons.push(h[dn] > 0 ? "ヒストグラム正" : "ヒストグラム負"); }
  }
  else if (ind.key === "rsi" && rsi14[dn] != null) {
    const v = rsi14[dn];
    if (v < 30) { s = 60; reasons.push(`RSI=${v.toFixed(0)} 売られすぎ`); }
    else if (v > 70) { s = -60; reasons.push(`RSI=${v.toFixed(0)} 買われすぎ`); }
    else { reasons.push(`RSI=${v.toFixed(0)} 中立`); }
  }
  else if (ind.key === "bb" && bb[dn]) {
    const b = bb[dn], pos = (daily[dn].c - b.l) / (b.u - b.l);
    if (pos < 0.05) { s = 70; reasons.push("下限バンド接触"); }
    else if (pos > 0.95) { s = -70; reasons.push("上限バンド接触"); }
    else { reasons.push("バンド中央付近"); }
  }
  else if (ind.key === "adx" && adxD.adx[dn] != null) {
    const av = adxD.adx[dn];
    if (av > 30) { s = 30 * (adxD.pdi[dn] > adxD.ndi[dn] ? 1 : -1); reasons.push(`ADX=${av.toFixed(0)} 強トレンド`); }
    else if (av > 20) { s = 15 * (adxD.pdi[dn] > adxD.ndi[dn] ? 1 : -1); reasons.push(`ADX=${av.toFixed(0)} 中トレンド`); }
    else { reasons.push(`ADX=${av.toFixed(0)} レンジ`); }
  }
  else if (ind.key === "vol") {
    const av = daily.slice(Math.max(0, dn - 20), dn).reduce((sum, x) => sum + x.v, 0) / 20;
    const r = daily[dn].v / av;
    const up = daily[dn].c > daily[dn - 1].c;
    if (r > 1.5 && up) { s = 50; reasons.push(`出来高${r.toFixed(1)}倍+上昇`); }
    else if (r > 1.5) { s = -50; reasons.push(`出来高${r.toFixed(1)}倍+下落`); }
    else { reasons.push(`出来高${r.toFixed(1)}倍`); }
  }
  else if (ind.key === "stoch" && stochD.k[dn] != null) {
    const kv = stochD.k[dn], dv = stochD.d[dn] || 50;
    if (kv < 20 && kv > dv) { s = 60; reasons.push("売られすぎGC"); }
    else if (kv > 80 && kv < dv) { s = -60; reasons.push("買われすぎDC"); }
    else { reasons.push(`%K=${kv.toFixed(0)}`); }
  }

  return s;
}

// --- 中長期指標スコアリング ---
function scoreLongIndicator(ind, ctx, s, reasons) {
  const { dn, daily, sma50, sma200, rsi21, macdL, adxD } = ctx;

  if (ind.key === "sma200" && sma200[dn]) {
    s = daily[dn].c > sma200[dn] ? 50 : -50;
    reasons.push(s > 0 ? "SMA200上（強気相場）" : "SMA200下（弱気相場）");
    if (sma50[dn] && dn > 0) {
      if (sma50[dn] > sma200[dn] && sma50[dn - 1] <= sma200[dn - 1]) { s += 40; reasons.push("SMA50がSMA200をGC"); }
      if (sma50[dn] < sma200[dn] && sma50[dn - 1] >= sma200[dn - 1]) { s -= 40; reasons.push("SMA50がSMA200をDC"); }
    }
  }
  else if (ind.key === "slope" && sma50[dn] && sma50[dn - 10]) {
    const sl = ((sma50[dn] - sma50[dn - 10]) / sma50[dn - 10]) * 100;
    if (sl > 1) { s = 50; reasons.push(`傾き+${sl.toFixed(1)}%（上向き加速）`); }
    else if (sl > 0) { s = 20; reasons.push(`傾き+${sl.toFixed(1)}%`); }
    else if (sl > -1) { s = -20; reasons.push(`傾き${sl.toFixed(1)}%`); }
    else { s = -50; reasons.push(`傾き${sl.toFixed(1)}%（下向き加速）`); }
  }
  else if (ind.key === "macd_l" && macdL.hist[dn] != null) {
    const { ml, hist } = macdL;
    if (dn > 0 && ml[dn] > 0 && ml[dn - 1] <= 0) { s = 70; reasons.push("長期MACDゼロ上抜け"); }
    else if (dn > 0 && ml[dn] < 0 && ml[dn - 1] >= 0) { s = -70; reasons.push("長期MACDゼロ下抜け"); }
    else { s = hist[dn] > 0 ? 15 : -15; reasons.push(hist[dn] > 0 ? "長期ヒストグラム正" : "長期ヒストグラム負"); }
  }
  else if (ind.key === "rsi_l" && rsi21[dn] != null) {
    const v = rsi21[dn];
    if (v < 30) { s = 70; reasons.push(`RSI(21)=${v.toFixed(0)} 長期売られすぎ`); }
    else if (v > 70) { s = -70; reasons.push(`RSI(21)=${v.toFixed(0)} 長期買われすぎ`); }
    else { reasons.push(`RSI(21)=${v.toFixed(0)}`); }
  }
  else if (ind.key === "adx_l" && adxD.adx[dn] != null) {
    const av = adxD.adx[dn];
    if (av > 25 && adxD.pdi[dn] > adxD.ndi[dn]) { s = 40; reasons.push(`ADX=${av.toFixed(0)} 上昇トレンド明確`); }
    else if (av > 25) { s = -40; reasons.push(`ADX=${av.toFixed(0)} 下降トレンド`); }
    else { reasons.push(`ADX=${av.toFixed(0)} トレンド不明瞭`); }
  }
  else if (ind.key === "dd") {
    const mx = Math.max(...daily.slice(Math.max(0, dn - 60), dn + 1).map((x) => x.h));
    const dd = ((daily[dn].c - mx) / mx) * 100;
    if (dd < -20) { s = 60; reasons.push(`DD${dd.toFixed(1)}%（弱気相場レベル）`); }
    else if (dd < -10) { s = 40; reasons.push(`DD${dd.toFixed(1)}%（調整局面）`); }
    else if (dd > -1) { s = -20; reasons.push("高値圏"); }
    else { reasons.push(`DD${dd.toFixed(1)}%`); }
  }
  else if (ind.key === "vol_t") {
    const rc = daily.slice(-10).reduce((sum, x) => sum + x.v, 0) / 10;
    const ol = daily.slice(-30, -10).reduce((sum, x) => sum + x.v, 0) / 20;
    const r = ol > 0 ? rc / ol : 1;
    const up = daily[dn].c > (daily[dn - 20]?.c || daily[dn].c);
    if (r > 1.3 && up) { s = 40; reasons.push("出来高増+上昇（買い集め兆候）"); }
    else if (r > 1.3) { s = -40; reasons.push("出来高増+下落（売り抜け兆候）"); }
    else { reasons.push("出来高安定"); }
  }

  return s;
}

/**
 * スコアから売買判定を返す
 */
export function getVerdict(score) {
  if (score >= 45) return { label: "強い買い", color: C.green, bg: `${C.green}12` };
  if (score >= 20) return { label: "買い", color: "#0d8a45", bg: `${C.green}08` };
  if (score >= 5) return { label: "やや買い", color: "#2a9a5a", bg: `${C.green}05` };
  if (score > -5) return { label: "様子見", color: "#6b7a8d", bg: "rgba(107,122,141,0.06)" };
  if (score > -20) return { label: "やや売り", color: "#c04030", bg: `${C.red}05` };
  if (score > -45) return { label: "売り", color: C.red, bg: `${C.red}08` };
  return { label: "強い売り", color: "#d93025", bg: `${C.red}12` };
}
