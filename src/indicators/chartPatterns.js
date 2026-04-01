// ============================================================
// chartPatterns.js - Chart pattern detection (Phase 1: reversals)
// ============================================================

// --------------- Helper functions ---------------

export function findLocalMaxima(data, window = 5) {
  const results = [];
  for (let i = window; i < data.length - window; i++) {
    let isMax = true;
    for (let j = i - window; j <= i + window; j++) {
      if (j !== i && data[j].h >= data[i].h) {
        isMax = false;
        break;
      }
    }
    if (isMax) {
      results.push({ index: i, value: data[i].h });
    }
  }
  return results;
}

export function findLocalMinima(data, window = 5) {
  const results = [];
  for (let i = window; i < data.length - window; i++) {
    let isMin = true;
    for (let j = i - window; j <= i + window; j++) {
      if (j !== i && data[j].l <= data[i].l) {
        isMin = false;
        break;
      }
    }
    if (isMin) {
      results.push({ index: i, value: data[i].l });
    }
  }
  return results;
}

function isSimilarLevel(a, b, tolerance = 0.015) {
  return Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b), 0.001) <= tolerance;
}

// --------------- Pattern detectors ---------------

// 1. ダブルトップ (Double Top) - sell
function detectDoubleTop(data, maxima, minima, endIndex) {
  const patterns = [];

  for (let i = 0; i < maxima.length - 1; i++) {
    const peak1 = maxima[i];
    const peak2 = maxima[i + 1];

    if (peak2.index > endIndex) continue;
    if (peak2.index - peak1.index < 5) continue;

    if (!isSimilarLevel(peak1.value, peak2.value)) continue;

    // Find the trough between the two peaks
    let trough = null;
    for (const m of minima) {
      if (m.index > peak1.index && m.index < peak2.index) {
        if (!trough || m.value < trough.value) {
          trough = m;
        }
      }
    }
    if (!trough) continue;

    // The trough should be meaningfully lower than the peaks
    const peakAvg = (peak1.value + peak2.value) / 2;
    if ((peakAvg - trough.value) / peakAvg < 0.015) continue;

    // Check for neckline break after the second peak
    const neckline = trough.value;
    let broken = false;
    for (let j = peak2.index + 1; j <= Math.min(peak2.index + 10, endIndex); j++) {
      if (j < data.length && data[j].c < neckline) {
        broken = true;
        break;
      }
    }

    if (broken) {
      patterns.push({
        name: "Double Top",
        nameJa: "ダブルトップ",
        signal: "sell",
        strength: 3,
        description: "2つの同水準の高値とその間の谷でネックラインを下抜け。天井圏の反転パターン。",
        startIndex: peak1.index,
        endIndex: peak2.index,
        breakoutLevel: neckline,
      });
    }
  }
  return patterns;
}

// 2. ダブルボトム (Double Bottom) - buy
function detectDoubleBottom(data, maxima, minima, endIndex) {
  const patterns = [];

  for (let i = 0; i < minima.length - 1; i++) {
    const trough1 = minima[i];
    const trough2 = minima[i + 1];

    if (trough2.index > endIndex) continue;
    if (trough2.index - trough1.index < 5) continue;

    if (!isSimilarLevel(trough1.value, trough2.value)) continue;

    // Find the peak between the two troughs
    let peak = null;
    for (const m of maxima) {
      if (m.index > trough1.index && m.index < trough2.index) {
        if (!peak || m.value > peak.value) {
          peak = m;
        }
      }
    }
    if (!peak) continue;

    // The peak should be meaningfully higher than the troughs
    const troughAvg = (trough1.value + trough2.value) / 2;
    if ((peak.value - troughAvg) / troughAvg < 0.015) continue;

    // Check for neckline break after the second trough
    const neckline = peak.value;
    let broken = false;
    for (let j = trough2.index + 1; j <= Math.min(trough2.index + 10, endIndex); j++) {
      if (j < data.length && data[j].c > neckline) {
        broken = true;
        break;
      }
    }

    if (broken) {
      patterns.push({
        name: "Double Bottom",
        nameJa: "ダブルボトム",
        signal: "buy",
        strength: 3,
        description: "2つの同水準の安値とその間の山でネックラインを上抜け。底値圏の反転パターン。",
        startIndex: trough1.index,
        endIndex: trough2.index,
        breakoutLevel: neckline,
      });
    }
  }
  return patterns;
}

// 3. ヘッドアンドショルダーズ (Head and Shoulders) - sell
function detectHeadAndShoulders(data, maxima, minima, endIndex) {
  const patterns = [];

  for (let i = 0; i < maxima.length - 2; i++) {
    const leftShoulder = maxima[i];
    const head = maxima[i + 1];
    const rightShoulder = maxima[i + 2];

    if (rightShoulder.index > endIndex) continue;

    // Head must be the highest
    if (head.value <= leftShoulder.value || head.value <= rightShoulder.value) continue;

    // Shoulders should be at a similar level
    if (!isSimilarLevel(leftShoulder.value, rightShoulder.value)) continue;

    // Find troughs between shoulders and head
    let trough1 = null;
    let trough2 = null;
    for (const m of minima) {
      if (m.index > leftShoulder.index && m.index < head.index) {
        if (!trough1 || m.value < trough1.value) trough1 = m;
      }
      if (m.index > head.index && m.index < rightShoulder.index) {
        if (!trough2 || m.value < trough2.value) trough2 = m;
      }
    }
    if (!trough1 || !trough2) continue;

    // Neckline is the higher of the two troughs (conservative)
    const neckline = Math.max(trough1.value, trough2.value);

    // Check for neckline break after right shoulder
    let broken = false;
    for (let j = rightShoulder.index + 1; j <= Math.min(rightShoulder.index + 10, endIndex); j++) {
      if (j < data.length && data[j].c < neckline) {
        broken = true;
        break;
      }
    }

    if (broken) {
      patterns.push({
        name: "Head and Shoulders",
        nameJa: "ヘッドアンドショルダーズ",
        signal: "sell",
        strength: 3,
        description: "左肩・頭・右肩の3つの山でネックラインを下抜け。天井圏の強力な反転パターン。",
        startIndex: leftShoulder.index,
        endIndex: rightShoulder.index,
        breakoutLevel: neckline,
      });
    }
  }
  return patterns;
}

// 4. 逆ヘッドアンドショルダーズ (Inverse Head and Shoulders) - buy
function detectInverseHeadAndShoulders(data, maxima, minima, endIndex) {
  const patterns = [];

  for (let i = 0; i < minima.length - 2; i++) {
    const leftShoulder = minima[i];
    const head = minima[i + 1];
    const rightShoulder = minima[i + 2];

    if (rightShoulder.index > endIndex) continue;

    // Head must be the lowest
    if (head.value >= leftShoulder.value || head.value >= rightShoulder.value) continue;

    // Shoulders should be at a similar level
    if (!isSimilarLevel(leftShoulder.value, rightShoulder.value)) continue;

    // Find peaks between shoulders and head
    let peak1 = null;
    let peak2 = null;
    for (const m of maxima) {
      if (m.index > leftShoulder.index && m.index < head.index) {
        if (!peak1 || m.value > peak1.value) peak1 = m;
      }
      if (m.index > head.index && m.index < rightShoulder.index) {
        if (!peak2 || m.value > peak2.value) peak2 = m;
      }
    }
    if (!peak1 || !peak2) continue;

    // Neckline is the lower of the two peaks (conservative)
    const neckline = Math.min(peak1.value, peak2.value);

    // Check for neckline break after right shoulder
    let broken = false;
    for (let j = rightShoulder.index + 1; j <= Math.min(rightShoulder.index + 10, endIndex); j++) {
      if (j < data.length && data[j].c > neckline) {
        broken = true;
        break;
      }
    }

    if (broken) {
      patterns.push({
        name: "Inverse Head and Shoulders",
        nameJa: "逆ヘッドアンドショルダーズ",
        signal: "buy",
        strength: 3,
        description: "左肩・頭・右肩の3つの谷でネックラインを上抜け。底値圏の強力な反転パターン。",
        startIndex: leftShoulder.index,
        endIndex: rightShoulder.index,
        breakoutLevel: neckline,
      });
    }
  }
  return patterns;
}

// --------------- Main detection function ---------------

export function detectChartPatterns(data, lookback = 60) {
  if (!data || data.length < 10) return [];

  const endIndex = data.length - 1;
  const startIndex = Math.max(0, endIndex - lookback);
  const slice = data.slice(startIndex);

  // Find extrema on the slice, then remap indices back to original data
  const rawMaxima = findLocalMaxima(slice);
  const rawMinima = findLocalMinima(slice);

  const maxima = rawMaxima.map((m) => ({ index: m.index + startIndex, value: m.value }));
  const minima = rawMinima.map((m) => ({ index: m.index + startIndex, value: m.value }));

  const patterns = [
    ...detectDoubleTop(data, maxima, minima, endIndex),
    ...detectDoubleBottom(data, maxima, minima, endIndex),
    ...detectHeadAndShoulders(data, maxima, minima, endIndex),
    ...detectInverseHeadAndShoulders(data, maxima, minima, endIndex),
  ];

  return patterns;
}
