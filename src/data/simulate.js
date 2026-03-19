/**
 * シミュレーションデータ生成
 * Phase 1: ランダム生成 / Phase 2: 実データAPI接続予定
 */

/** データセット定義 */
export const DATASETS = [
  { label: "テック株A", p: 185, v: 0.022 },
  { label: "テック株B", p: 310, v: 0.025 },
  { label: "高配当株", p: 52, v: 0.011 },
  { label: "USD/JPY", p: 150, v: 0.005 },
  { label: "BTC", p: 62000, v: 0.035 },
  { label: "小型株", p: 28, v: 0.032 },
];

/** 日足データ生成 */
export function genDaily(days = 400, startPrice = 150, volatility = 0.02) {
  const data = [];
  let price = startPrice;
  let trend = 0;
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const dt = new Date(now);
    dt.setDate(dt.getDate() - i);

    // 土日スキップ
    if (dt.getDay() === 0 || dt.getDay() === 6) continue;

    trend += (Math.random() - 0.505) * 0.003;
    trend = Math.max(-0.015, Math.min(0.015, trend));
    price *= 1 + trend + (Math.random() - 0.5) * volatility * 2;

    const h = price * (1 + Math.random() * 0.015);
    const l = price * (1 - Math.random() * 0.015);
    const o = l + Math.random() * (h - l);
    const c = l + Math.random() * (h - l);
    const v = Math.floor(800000 + Math.random() * 1200000);

    data.push({
      date: dt.toISOString().split("T")[0],
      ds: `${dt.getMonth() + 1}/${dt.getDate()}`,
      o: +o.toFixed(2),
      h: +h.toFixed(2),
      l: +l.toFixed(2),
      c: +c.toFixed(2),
      v,
    });
  }
  return data;
}

/** イントラデイ（5分足）データ生成 */
export function genIntraday(dailyData) {
  const last = dailyData.slice(-1)[0];
  if (!last) return [];

  const bars = [];
  let price = last.o;
  const baseVol = last.v / 78;

  for (let i = 0; i < 78; i++) {
    const mins = 9 * 60 + 30 + i * 5;
    const hh = String(Math.floor(mins / 60)).padStart(2, "0");
    const mm = String(mins % 60).padStart(2, "0");

    price *= 1 + (Math.random() - 0.5) * 0.003;
    const h = price * (1 + Math.random() * 0.003);
    const l = price * (1 - Math.random() * 0.003);
    const o = l + Math.random() * (h - l);
    const c = l + Math.random() * (h - l);
    const volMult = i < 12 || i > 66 ? 2.5 : 1;

    bars.push({
      date: `${hh}:${mm}`,
      ds: `${hh}:${mm}`,
      o: +o.toFixed(2),
      h: +h.toFixed(2),
      l: +l.toFixed(2),
      c: +c.toFixed(2),
      v: Math.floor(baseVol * volMult * (0.5 + Math.random())),
    });
  }
  return bars;
}
