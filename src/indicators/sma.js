/**
 * 単純移動平均線 (Simple Moving Average)
 * 過去N日間の終値の平均値
 */
export function calcSMA(data, period) {
  return data.map((_, i) => {
    if (i < period - 1) return null;
    const sum = data.slice(i - period + 1, i + 1).reduce((s, x) => s + x.c, 0);
    return +(sum / period).toFixed(4);
  });
}
