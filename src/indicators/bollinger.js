import { calcSMA } from "./sma";

/**
 * ボリンジャーバンド
 * 移動平均線 ± 標準偏差 × 倍率
 * バンド幅が狭まる → 大きな動きの前兆
 */
export function calcBollinger(data, period = 20, mult = 2) {
  const sma = calcSMA(data, period);

  return sma.map((avg, i) => {
    if (!avg) return null;
    const slice = data.slice(i - period + 1, i + 1).map((x) => x.c);
    const std = Math.sqrt(slice.reduce((sum, v) => sum + (v - avg) ** 2, 0) / period);
    return {
      u: +(avg + mult * std).toFixed(2),
      m: +avg,
      l: +(avg - mult * std).toFixed(2),
      bw: +((mult * 2 * std) / avg * 100).toFixed(2),
    };
  });
}
