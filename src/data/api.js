/**
 * 株式データAPI（Vercelプロキシ経由）
 * APIキーはサーバー側（環境変数）で管理。ブラウザに露出しない。
 */

/**
 * 日足OHLCVデータを取得
 */
export async function fetchDailyData(symbol) {
  const res = await fetch(`/api/stock?symbol=${encodeURIComponent(symbol)}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "株価データの取得に失敗しました");
  return json.bars || [];
}

/**
 * 銘柄検索（企業名 or ティッカー）
 */
export async function searchStocks(query) {
  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "検索に失敗しました");
  return json.results || [];
}

/**
 * ウォッチリストの管理（localStorage）
 */
const WATCHLIST_KEY = "watchlist-v1";

export function getWatchlist() {
  try { return JSON.parse(localStorage.getItem(WATCHLIST_KEY) || "[]"); }
  catch { return []; }
}

export function saveWatchlist(list) {
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list));
}

export function addToWatchlist(symbol, name) {
  const list = getWatchlist();
  if (list.some((item) => item.symbol === symbol)) return list;
  const updated = [...list, { symbol, name, addedAt: new Date().toISOString() }];
  saveWatchlist(updated);
  return updated;
}

export function removeFromWatchlist(symbol) {
  const list = getWatchlist().filter((item) => item.symbol !== symbol);
  saveWatchlist(list);
  return list;
}

// レガシー互換
export function getApiKey() { return "server-managed"; }
export function setApiKey() { }
