// ============================================================
// candlePatterns.js - Japanese candlestick pattern recognition
// ============================================================

// --------------- Helper functions ---------------

export function bodySize(d) {
  return Math.abs(d.c - d.o);
}

export function upperWick(d) {
  return d.h - Math.max(d.o, d.c);
}

export function lowerWick(d) {
  return Math.min(d.o, d.c) - d.l;
}

export function range(d) {
  return d.h - d.l || 0.001;
}

export function isBullish(d) {
  return d.c >= d.o;
}

export function isInUptrend(data, i, lookback = 5) {
  if (i < lookback) return false;
  return data[i].c > data[i - lookback].c;
}

export function isInDowntrend(data, i, lookback = 5) {
  if (i < lookback) return false;
  return data[i].c < data[i - lookback].c;
}

// --------------- Individual pattern detectors ---------------

// 1. 首吊り線 (Hanging Man) - sell
function detectHangingMan(data, i) {
  const d = data[i];
  const body = bodySize(d);
  const lower = lowerWick(d);
  const upper = upperWick(d);
  const r = range(d);

  if (
    body < r * 0.35 &&
    lower >= body * 2 &&
    upper < body * 0.5 &&
    isInUptrend(data, i)
  ) {
    return {
      detected: true,
      name: "Hanging Man",
      nameJa: "首吊り線",
      signal: "sell",
      strength: 2,
      description: "上昇トレンド中に長い下ひげと小さな実体が出現。天井圏の反転示唆。",
    };
  }
  return null;
}

// 2. 三羽烏/黒三兵 (Three Black Crows) - sell
function detectThreeBlackCrows(data, i) {
  if (i < 2) return null;
  const d0 = data[i - 2];
  const d1 = data[i - 1];
  const d2 = data[i];

  if (
    !isBullish(d0) &&
    !isBullish(d1) &&
    !isBullish(d2) &&
    d1.c < d0.c &&
    d2.c < d1.c &&
    d1.o < d0.o &&
    d2.o < d1.o &&
    bodySize(d0) > range(d0) * 0.5 &&
    bodySize(d1) > range(d1) * 0.5 &&
    bodySize(d2) > range(d2) * 0.5
  ) {
    return {
      detected: true,
      name: "Three Black Crows",
      nameJa: "三羽烏（黒三兵）",
      signal: "sell",
      strength: 3,
      description: "3本連続の大陰線が安値を更新。強い下落圧力を示唆。",
    };
  }
  return null;
}

// 3. 宵の明星 (Evening Star) - sell
function detectEveningStar(data, i) {
  if (i < 2) return null;
  const d0 = data[i - 2];
  const d1 = data[i - 1];
  const d2 = data[i];

  const body0 = bodySize(d0);
  const body1 = bodySize(d1);
  const body2 = bodySize(d2);

  if (
    isBullish(d0) &&
    body0 > range(d0) * 0.5 &&
    body1 < range(d1) * 0.3 &&
    Math.min(d1.o, d1.c) > d0.c &&
    !isBullish(d2) &&
    body2 > range(d2) * 0.5 &&
    d2.c < (d0.o + d0.c) / 2
  ) {
    return {
      detected: true,
      name: "Evening Star",
      nameJa: "宵の明星",
      signal: "sell",
      strength: 3,
      description: "大陽線→小さな足（上方窓）→大陰線の3本組み。天井圏の強力な反転パターン。",
    };
  }
  return null;
}

// 4. 陽の陽はらみ (Bearish Harami in uptrend) - sell
function detectBearishHarami(data, i) {
  if (i < 1) return null;
  const prev = data[i - 1];
  const curr = data[i];

  if (
    isBullish(prev) &&
    bodySize(prev) > range(prev) * 0.5 &&
    !isBullish(curr) &&
    curr.o < prev.c &&
    curr.c > prev.o &&
    curr.h <= prev.h &&
    curr.l >= prev.l &&
    isInUptrend(data, i)
  ) {
    return {
      detected: true,
      name: "Bearish Harami",
      nameJa: "陽の陽はらみ",
      signal: "sell",
      strength: 2,
      description: "大陽線の実体内に小さな陰線が収まる。上昇トレンドの勢い低下を示唆。",
    };
  }
  return null;
}

// 5. 最後の抱き線 (Bearish Engulfing) - sell
function detectBearishEngulfing(data, i) {
  if (i < 1) return null;
  const prev = data[i - 1];
  const curr = data[i];

  if (
    isBullish(prev) &&
    !isBullish(curr) &&
    curr.o >= prev.c &&
    curr.c <= prev.o &&
    bodySize(curr) > bodySize(prev)
  ) {
    return {
      detected: true,
      name: "Bearish Engulfing",
      nameJa: "最後の抱き線（弱気包み足）",
      signal: "sell",
      strength: 3,
      description: "前の陽線を完全に包む大陰線。強い売り圧力への転換を示唆。",
    };
  }
  return null;
}

// 6. ハンマー/たくり線 (Hammer) - buy
function detectHammer(data, i) {
  const d = data[i];
  const body = bodySize(d);
  const lower = lowerWick(d);
  const upper = upperWick(d);
  const r = range(d);

  if (
    body < r * 0.35 &&
    lower >= body * 2 &&
    upper < body * 0.5 &&
    isInDowntrend(data, i)
  ) {
    return {
      detected: true,
      name: "Hammer",
      nameJa: "ハンマー（たくり線）",
      signal: "buy",
      strength: 2,
      description: "下降トレンド中に長い下ひげと小さな実体が出現。底値圏の反転示唆。",
    };
  }
  return null;
}

// 7. 赤三兵 (Three White Soldiers) - buy
function detectThreeWhiteSoldiers(data, i) {
  if (i < 2) return null;
  const d0 = data[i - 2];
  const d1 = data[i - 1];
  const d2 = data[i];

  if (
    isBullish(d0) &&
    isBullish(d1) &&
    isBullish(d2) &&
    d1.c > d0.c &&
    d2.c > d1.c &&
    d1.o > d0.o &&
    d2.o > d1.o &&
    bodySize(d0) > range(d0) * 0.5 &&
    bodySize(d1) > range(d1) * 0.5 &&
    bodySize(d2) > range(d2) * 0.5
  ) {
    return {
      detected: true,
      name: "Three White Soldiers",
      nameJa: "赤三兵",
      signal: "buy",
      strength: 3,
      description: "3本連続の大陽線が高値を更新。強い上昇圧力を示唆。",
    };
  }
  return null;
}

// 8. 明けの明星 (Morning Star) - buy
function detectMorningStar(data, i) {
  if (i < 2) return null;
  const d0 = data[i - 2];
  const d1 = data[i - 1];
  const d2 = data[i];

  const body0 = bodySize(d0);
  const body1 = bodySize(d1);
  const body2 = bodySize(d2);

  if (
    !isBullish(d0) &&
    body0 > range(d0) * 0.5 &&
    body1 < range(d1) * 0.3 &&
    Math.max(d1.o, d1.c) < d0.c &&
    isBullish(d2) &&
    body2 > range(d2) * 0.5 &&
    d2.c > (d0.o + d0.c) / 2
  ) {
    return {
      detected: true,
      name: "Morning Star",
      nameJa: "明けの明星",
      signal: "buy",
      strength: 3,
      description: "大陰線→小さな足（下方窓）→大陽線の3本組み。底値圏の強力な反転パターン。",
    };
  }
  return null;
}

// 9. トンボ (Dragonfly Doji) - buy
function detectDragonflyDoji(data, i) {
  const d = data[i];
  const body = bodySize(d);
  const lower = lowerWick(d);
  const upper = upperWick(d);
  const r = range(d);

  if (
    body < r * 0.05 &&
    lower > r * 0.7 &&
    upper < r * 0.05
  ) {
    return {
      detected: true,
      name: "Dragonfly Doji",
      nameJa: "トンボ",
      signal: "buy",
      strength: 2,
      description: "極端に長い下ひげとほぼ実体なし。底値圏で出現すると反転の可能性。",
    };
  }
  return null;
}

// 10. 大陽線 (Big Bullish Candle) - buy
function detectBigBullishCandle(data, i) {
  const d = data[i];
  const body = bodySize(d);
  const r = range(d);

  if (isBullish(d) && body >= r * 0.7) {
    return {
      detected: true,
      name: "Big Bullish Candle",
      nameJa: "大陽線",
      signal: "buy",
      strength: 2,
      description: "実体がレンジの70%以上を占める大きな陽線。強い買い圧力を示唆。",
    };
  }
  return null;
}

// 11. 大陰線 (Big Bearish Candle) - sell
function detectBigBearishCandle(data, i) {
  const d = data[i];
  const body = bodySize(d);
  const r = range(d);

  if (!isBullish(d) && body >= r * 0.7) {
    return {
      detected: true,
      name: "Big Bearish Candle",
      nameJa: "大陰線",
      signal: "sell",
      strength: 2,
      description: "実体がレンジの70%以上を占める大きな陰線。強い売り圧力を示唆。",
    };
  }
  return null;
}

// --------------- Main detection function ---------------

const detectors = [
  detectHangingMan,
  detectThreeBlackCrows,
  detectEveningStar,
  detectBearishHarami,
  detectBearishEngulfing,
  detectHammer,
  detectThreeWhiteSoldiers,
  detectMorningStar,
  detectDragonflyDoji,
  detectBigBullishCandle,
  detectBigBearishCandle,
];

export function detectCandlePatterns(data, index) {
  if (!data || index < 0 || index >= data.length) return [];

  const results = [];
  for (const detect of detectors) {
    const result = detect(data, index);
    if (result) {
      results.push(result);
    }
  }
  return results;
}
