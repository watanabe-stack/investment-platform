/**
 * ストキャスティクス
 * %K: 現在の終値がN日間の価格レンジのどこに位置するか
 * %D: %Kの移動平均
 * 80超: 買われすぎ / 20未満: 売られすぎ
 */
export function calcStoch(data, kPeriod = 14, dPeriod = 3) {
  const kArray = data.map((_, i) => {
    if (i < kPeriod - 1) return null;
    const slice = data.slice(i - kPeriod + 1, i + 1);
    const hi = Math.max(...slice.map((x) => x.h));
    const lo = Math.min(...slice.map((x) => x.l));
    return hi === lo ? 50 : +((data[i].c - lo) / (hi - lo) * 100).toFixed(2);
  });

  const dArray = kArray.map((_, i) => {
    if (i < kPeriod - 1 + dPeriod - 1) return null;
    const slice = kArray.slice(i - dPeriod + 1, i + 1).filter((v) => v !== null);
    return slice.length === dPeriod
      ? +(slice.reduce((s, v) => s + v, 0) / dPeriod).toFixed(2)
      : null;
  });

  return { k: kArray, d: dArray };
}
