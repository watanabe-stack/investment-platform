import { calcEMA } from "./ema";

/**
 * MACD (Moving Average Convergence Divergence)
 * トレンドの方向と勢いを示す指標
 * MACDライン: 短期EMA - 長期EMA
 * シグナルライン: MACDラインのEMA
 * ヒストグラム: MACD - シグナル
 */
export function calcMACD(data, fast = 12, slow = 26, sig = 9) {
  const emaFast = calcEMA(data, fast);
  const emaSlow = calcEMA(data, slow);

  const macdLine = emaFast.map((v, i) =>
    v != null && emaSlow[i] != null ? +(v - emaSlow[i]).toFixed(4) : null
  );

  const k = 2 / (sig + 1);
  const signal = [];
  let prev = null;

  for (let i = 0; i < macdLine.length; i++) {
    if (macdLine[i] === null) {
      signal.push(null);
      continue;
    }
    if (prev === null) {
      const valid = macdLine.slice(0, i + 1).filter((v) => v !== null);
      if (valid.length >= sig) {
        prev = valid.slice(-sig).reduce((s, v) => s + v, 0) / sig;
      } else {
        signal.push(null);
        continue;
      }
    } else {
      prev = macdLine[i] * k + prev * (1 - k);
    }
    signal.push(+prev.toFixed(4));
  }

  const hist = macdLine.map((v, i) =>
    v != null && signal[i] != null ? +(v - signal[i]).toFixed(4) : null
  );

  return { ml: macdLine, signal, hist };
}
