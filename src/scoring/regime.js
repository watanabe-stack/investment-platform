import { C } from "../constants/colors";

/**
 * マーケットレジーム検出
 * ADXとボリンジャーバンド幅でトレンド/レンジ相場を判定
 * レンジ相場ではトレンド系指標のスコアを0.7倍に減衰
 */
export function detectRegime(data, adxData, bb) {
  const n = data.length - 1;
  const adxVal = adxData.adx[n];
  const bbVal = bb[n];
  let regime = "unknown";
  let desc = "";

  if (adxVal != null) {
    if (adxVal > 30) {
      const up = data[n].c > data[Math.max(0, n - 20)].c;
      regime = up ? "strong_up" : "strong_down";
      desc = up
        ? `強い上昇トレンド（ADX=${adxVal.toFixed(0)}）`
        : `強い下降トレンド（ADX=${adxVal.toFixed(0)}）`;
    } else if (adxVal > 20) {
      const up = data[n].c > data[Math.max(0, n - 20)].c;
      regime = up ? "mild_up" : "mild_down";
      desc = up
        ? `緩やかな上昇（ADX=${adxVal.toFixed(0)}）`
        : `緩やかな下降（ADX=${adxVal.toFixed(0)}）`;
    } else {
      regime = "range";
      desc = `レンジ相場（ADX=${adxVal.toFixed(0)}）`;
    }
  }

  if (bbVal && bbVal.bw < 3) {
    desc += " ⚡バンド収縮中";
  }

  return { regime, desc };
}

/**
 * レジームに基づくスコア減衰率を返す
 */
export function getRegimeMultiplier(regime) {
  return regime === "range" ? 0.7 : 1;
}

/**
 * レジーム表示用の色を返す
 */
export function getRegimeColor(regime) {
  if (regime.includes("up")) return C.green;
  if (regime.includes("down")) return C.red;
  return C.orange;
}
