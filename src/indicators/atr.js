/**
 * ATR (Average True Range / 平均真の値幅)
 * ボラティリティの指標。ストップロス幅の算出に使用
 * ATRベースのストップ: エントリー価格 ± ATR × 倍率
 */
export function calcATR(data, period = 14) {
  const tr = data.map((d, i) => {
    if (i === 0) return d.h - d.l;
    return Math.max(
      d.h - d.l,
      Math.abs(d.h - data[i - 1].c),
      Math.abs(d.l - data[i - 1].c)
    );
  });

  const result = [];
  let avg = null;

  for (let i = 0; i < tr.length; i++) {
    if (i < period - 1) {
      result.push(null);
      continue;
    }
    if (avg === null) {
      avg = tr.slice(0, period).reduce((s, v) => s + v, 0) / period;
    } else {
      avg = (avg * (period - 1) + tr[i]) / period;
    }
    result.push(+avg.toFixed(4));
  }

  return result;
}
