/**
 * J-Quants API クライアント（フロントエンド側）
 * Vercelのプロキシ /api/jquants を経由してデータ取得
 *
 * 無料プラン制限: データは12週間遅延、5リクエスト/分
 */

const API_BASE = "/api/jquants";

/**
 * 日本株の日足OHLCVデータを取得
 * @param {string} code - 銘柄コード（例: "7203"）
 * @param {string} from - 開始日 YYYY-MM-DD
 * @param {string} to - 終了日 YYYY-MM-DD
 * @returns {Array} Signal Engine互換フォーマット [{date, ds, o, h, l, c, v}, ...]
 */
export async function fetchJQuantsDaily(code, from, to) {
  const params = new URLSearchParams({ action: "daily", code });
  if (from) params.set("from", from);
  if (to) params.set("to", to);

  const res = await fetch(`${API_BASE}?${params}`);
  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.error || `J-Quants APIエラー (${res.status})`);
  }

  // J-Quants v2のレスポンスをSignal Engine互換に変換
  const bars = json.daily_quotes || json.data || [];

  return bars.map((bar) => {
    const dt = new Date(bar.Date || bar.date);
    return {
      date: bar.Date || bar.date,
      ds: `${dt.getMonth() + 1}/${dt.getDate()}`,
      o: parseFloat(bar.AdjustmentOpen || bar.Open || bar.O || 0),
      h: parseFloat(bar.AdjustmentHigh || bar.High || bar.H || 0),
      l: parseFloat(bar.AdjustmentLow || bar.Low || bar.L || 0),
      c: parseFloat(bar.AdjustmentClose || bar.Close || bar.C || 0),
      v: parseInt(bar.Volume || bar.Vo || 0),
    };
  }).filter((d) => d.c > 0); // 無効データを除外
}

/**
 * 銘柄検索
 * @param {string} keyword - 検索キーワード（企業名 or コード）
 * @returns {Array} [{code, name, nameEn, sector, market}, ...]
 */
export async function searchJQuantsStocks(keyword) {
  const res = await fetch(`${API_BASE}?action=search&keyword=${encodeURIComponent(keyword)}`);
  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.error || "銘柄検索に失敗しました");
  }

  return (json.results || []).map((item) => ({
    code: item.Code,
    name: item.CompanyName,
    nameEn: item.CompanyNameEnglish,
    sector: item.Sector33Name || item.Sector17Name || "",
    market: item.MarketName || "",
  }));
}

/**
 * 銘柄情報の取得
 * @param {string} code - 銘柄コード
 */
export async function fetchJQuantsInfo(code) {
  const res = await fetch(`${API_BASE}?action=listed&code=${code}`);
  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.error || "銘柄情報の取得に失敗しました");
  }

  const info = json.info?.[0];
  if (!info) throw new Error("銘柄が見つかりません");

  return {
    code: info.Code,
    name: info.CompanyName,
    nameEn: info.CompanyNameEnglish,
    sector: info.Sector33Name || "",
    market: info.MarketName || "",
  };
}

/**
 * 日足データを取得して最新N日分を返す（Signal Engine用ヘルパー）
 * 無料プランは12週間前までのデータなので、fromを自動計算
 */
export async function fetchJQuantsDailyForSignal(code, days = 400) {
  const to = new Date();
  // 無料プランは12週間遅延
  to.setDate(to.getDate() - 84); // 12週間 = 84日前
  const from = new Date(to);
  from.setDate(from.getDate() - days);

  const fromStr = from.toISOString().split("T")[0];
  const toStr = to.toISOString().split("T")[0];

  return fetchJQuantsDaily(code, fromStr, toStr);
}
