/**
 * RSI (Relative Strength Index / 相対力指数)
 * 0〜100で買われすぎ・売られすぎを判定
 * 70以上: 買われすぎ / 30以下: 売られすぎ
 */
export function calcRSI(data, period = 14) {
  const result = [];
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      result.push(null);
      continue;
    }

    const change = data[i].c - data[i - 1].c;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;

    if (i < period) {
      avgGain += gain / period;
      avgLoss += loss / period;
      result.push(null);
    } else if (i === period) {
      avgGain += gain / period;
      avgLoss += loss / period;
      result.push(avgLoss === 0 ? 100 : +(100 - 100 / (1 + avgGain / avgLoss)).toFixed(2));
    } else {
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
      result.push(avgLoss === 0 ? 100 : +(100 - 100 / (1 + avgGain / avgLoss)).toFixed(2));
    }
  }
  return result;
}
