/**
 * VWAP (Volume Weighted Average Price / 出来高加重平均価格)
 * 機関投資家の基準価格。上方 = 割高、下方 = 割安
 */
export function calcVWAP(data) {
  let cumVP = 0;
  let cumV = 0;

  return data.map((x) => {
    const tp = (x.h + x.l + x.c) / 3;
    cumVP += tp * x.v;
    cumV += x.v;
    return cumV === 0 ? null : +(cumVP / cumV).toFixed(2);
  });
}
