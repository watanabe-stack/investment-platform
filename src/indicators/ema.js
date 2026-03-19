/**
 * 指数移動平均線 (Exponential Moving Average)
 * 直近の値に重みを置いた移動平均
 */
export function calcEMA(data, period) {
  const k = 2 / (period + 1);
  const result = [];
  let prev = null;

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
      continue;
    }
    if (prev === null) {
      prev = data.slice(0, period).reduce((s, x) => s + x.c, 0) / period;
    } else {
      prev = data[i].c * k + prev * (1 - k);
    }
    result.push(+prev.toFixed(4));
  }
  return result;
}
