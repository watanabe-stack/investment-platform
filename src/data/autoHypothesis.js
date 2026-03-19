/**
 * 日次自動仮説システム
 *
 * 毎日、登録済み全銘柄に対して:
 * 1. Signal Engineでスコアリング → 仮説を自動生成（「明日上がる/下がる/横ばい」）
 * 2. 翌日、実際の値動きと照合して自動検証
 * 3. 的中率を蓄積 → 自分のスコアリングの信頼度が数字でわかる
 *
 * データ構造:
 * {
 *   id: string,            // "AAPL-2026-03-19"
 *   symbol: string,        // "AAPL"
 *   name: string,          // "Apple"
 *   date: string,          // "2026-03-19" (仮説生成日)
 *   score: number,         // Signal Engineのcomposite score
 *   verdict: string,       // "強い買い" etc.
 *   prediction: string,    // "上昇" | "下落" | "横ばい"
 *   closeAtPrediction: number, // 仮説時点の終値
 *   closeNextDay: number | null, // 翌日の終値（検証時に埋まる）
 *   actualMove: string | null,   // "上昇" | "下落" | "横ばい"
 *   result: string | null,       // "的中" | "外れ" | null (未検証)
 *   verifiedAt: string | null,   // 検証日時
 * }
 */

const STORAGE_KEY = "auto-hypo-v1";

export function loadAutoHypos() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveAutoHypos(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/**
 * スコアから予測方向を決定
 */
export function scoreToPrediction(score) {
  if (score >= 15) return "上昇";
  if (score <= -15) return "下落";
  return "横ばい";
}

/**
 * 実際の値動きを判定
 * ±0.3%以内は横ばいとみなす
 */
export function calcActualMove(closeBefore, closeAfter) {
  if (closeBefore === 0 || closeAfter == null) return null;
  const pct = ((closeAfter - closeBefore) / closeBefore) * 100;
  if (pct > 0.3) return "上昇";
  if (pct < -0.3) return "下落";
  return "横ばい";
}

/**
 * 予測と実際の照合
 */
export function checkResult(prediction, actualMove) {
  if (!actualMove) return null;
  if (prediction === actualMove) return "的中";
  // 横ばい予測で実際も小幅なら的中とみなす
  if (prediction === "横ばい" && actualMove !== prediction) return "外れ";
  if (prediction !== "横ばい" && actualMove === "横ばい") return "外れ";
  return "外れ";
}

/**
 * 今日の仮説を生成（まだ今日分がなければ）
 */
export function generateDailyHypothesis(symbol, name, score, verdict, closePrice) {
  const today = new Date().toISOString().split("T")[0];
  const id = `${symbol}-${today}`;
  const existing = loadAutoHypos();

  // 既に今日分があればスキップ
  if (existing.some((h) => h.id === id)) return existing;

  const newEntry = {
    id,
    symbol,
    name,
    date: today,
    score,
    verdict,
    prediction: scoreToPrediction(score),
    closeAtPrediction: closePrice,
    closeNextDay: null,
    actualMove: null,
    result: null,
    verifiedAt: null,
  };

  const updated = [newEntry, ...existing];
  saveAutoHypos(updated);
  return updated;
}

/**
 * 未検証の仮説を検証する（翌日以降のデータで）
 */
export function verifyPendingHypotheses(symbol, latestClose) {
  const all = loadAutoHypos();
  const today = new Date().toISOString().split("T")[0];
  let changed = false;

  const updated = all.map((h) => {
    // この銘柄の未検証分で、今日より前の仮説を検証
    if (h.symbol === symbol && h.result === null && h.date < today) {
      const actualMove = calcActualMove(h.closeAtPrediction, latestClose);
      const result = checkResult(h.prediction, actualMove);
      if (result) {
        changed = true;
        return {
          ...h,
          closeNextDay: latestClose,
          actualMove,
          result,
          verifiedAt: new Date().toISOString(),
        };
      }
    }
    return h;
  });

  if (changed) saveAutoHypos(updated);
  return updated;
}

/**
 * 全銘柄の仮説を一括生成
 */
export function generateAllDailyHypotheses(watchlistWithScores) {
  let all = loadAutoHypos();
  for (const item of watchlistWithScores) {
    all = generateDailyHypothesis(item.symbol, item.name, item.score, item.verdict, item.close);
  }
  return all;
}

/**
 * 統計計算
 */
export function calcAutoHypoStats(data) {
  const verified = data.filter((h) => h.result !== null);
  const hit = verified.filter((h) => h.result === "的中").length;
  const miss = verified.filter((h) => h.result === "外れ").length;
  const total = verified.length;
  const pending = data.filter((h) => h.result === null).length;
  const hitRate = total > 0 ? ((hit / total) * 100).toFixed(1) : "—";

  // 銘柄別集計
  const bySymbol = {};
  verified.forEach((h) => {
    if (!bySymbol[h.symbol]) bySymbol[h.symbol] = { name: h.name, hit: 0, miss: 0, total: 0 };
    bySymbol[h.symbol].total++;
    if (h.result === "的中") bySymbol[h.symbol].hit++;
    else bySymbol[h.symbol].miss++;
  });

  // 直近7日間の的中率推移
  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const dayData = verified.filter((h) => h.date === dateStr);
    const dayHit = dayData.filter((h) => h.result === "的中").length;
    last7.push({
      date: `${d.getMonth() + 1}/${d.getDate()}`,
      total: dayData.length,
      hit: dayHit,
      rate: dayData.length > 0 ? Math.round((dayHit / dayData.length) * 100) : null,
    });
  }

  return { hit, miss, total, pending, hitRate, bySymbol, last7 };
}
