/**
 * シミュレーションデータ生成（シード付き擬似乱数）
 * 同じ銘柄インデックスなら常に同じデータを返す → 一貫性を保証
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

/**
 * シード付き擬似乱数生成器（Mulberry32）
 * 同じシードなら常に同じ数列を返す
 */
function createRng(seed) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// データキャッシュ（同じパラメータなら再計算しない）
const dailyCache = new Map();
const intradayCache = new Map();

/** 日足データ生成（シード固定） */
export function genDaily(days = 400, startPrice = 150, volatility = 0.02) {
  const cacheKey = `${days}-${startPrice}-${volatility}`;
  if (dailyCache.has(cacheKey)) return dailyCache.get(cacheKey);

  const rng = createRng(Math.round(startPrice * 1000 + volatility * 100000));
  const data = [];
  let price = startPrice;
  let trend = 0;
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const dt = new Date(now);
    dt.setDate(dt.getDate() - i);
    if (dt.getDay() === 0 || dt.getDay() === 6) continue;

    trend += (rng() - 0.505) * 0.003;
    trend = Math.max(-0.015, Math.min(0.015, trend));
    price *= 1 + trend + (rng() - 0.5) * volatility * 2;

    const h = price * (1 + rng() * 0.015);
    const l = price * (1 - rng() * 0.015);
    const o = l + rng() * (h - l);
    const c = l + rng() * (h - l);
    const v = Math.floor(800000 + rng() * 1200000);

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

  dailyCache.set(cacheKey, data);
  return data;
}

/** イントラデイ（5分足）データ生成（シード固定） */
export function genIntraday(dailyData) {
  const last = dailyData.slice(-1)[0];
  if (!last) return [];

  const cacheKey = `intra-${last.date}-${last.c}`;
  if (intradayCache.has(cacheKey)) return intradayCache.get(cacheKey);

  const rng = createRng(Math.round(last.c * 10000));
  const bars = [];
  let price = last.o;
  const baseVol = last.v / 78;

  for (let i = 0; i < 78; i++) {
    const mins = 9 * 60 + 30 + i * 5;
    const hh = String(Math.floor(mins / 60)).padStart(2, "0");
    const mm = String(mins % 60).padStart(2, "0");

    price *= 1 + (rng() - 0.5) * 0.003;
    const h = price * (1 + rng() * 0.003);
    const l = price * (1 - rng() * 0.003);
    const o = l + rng() * (h - l);
    const c = l + rng() * (h - l);
    const volMult = i < 12 || i > 66 ? 2.5 : 1;

    bars.push({
      date: `${hh}:${mm}`,
      ds: `${hh}:${mm}`,
      o: +o.toFixed(2),
      h: +h.toFixed(2),
      l: +l.toFixed(2),
      c: +c.toFixed(2),
      v: Math.floor(baseVol * volMult * (0.5 + rng())),
    });
  }

  intradayCache.set(cacheKey, bars);
  return bars;
}
