/**
 * 実データAPI（Alpha Vantage）
 * 無料枠: 25リクエスト/日、5/分
 * 日本株: "7203.T"形式、米国株: "AAPL"形式
 */

const BASE_URL = "https://www.alphavantage.co/query";

/**
 * APIキーの取得（localStorageに保存）
 */
export function getApiKey() {
  return localStorage.getItem("av-api-key") || "";
}

export function setApiKey(key) {
  localStorage.setItem("av-api-key", key);
}

/**
 * 日足OHLCVデータを取得
 * @param {string} symbol - ティッカーシンボル（例: "7203.T", "AAPL"）
 * @returns {Array} - [{date, ds, o, h, l, c, v}, ...]
 */
export async function fetchDailyData(symbol) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("APIキーが設定されていません");

  const url = `${BASE_URL}?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(symbol)}&outputsize=full&apikey=${apiKey}`;
  const res = await fetch(url);
  const json = await res.json();

  if (json["Error Message"]) throw new Error(`銘柄が見つかりません: ${symbol}`);
  if (json["Note"]) throw new Error("APIリクエスト制限に達しました。しばらく待ってから再試行してください。");
  if (json["Information"]) throw new Error("API制限: " + json["Information"]);

  const timeSeries = json["Time Series (Daily)"];
  if (!timeSeries) throw new Error("データを取得できませんでした");

  const data = Object.entries(timeSeries)
    .map(([dateStr, values]) => {
      const dt = new Date(dateStr);
      return {
        date: dateStr,
        ds: `${dt.getMonth() + 1}/${dt.getDate()}`,
        o: +parseFloat(values["1. open"]).toFixed(2),
        h: +parseFloat(values["2. high"]).toFixed(2),
        l: +parseFloat(values["3. low"]).toFixed(2),
        c: +parseFloat(values["4. close"]).toFixed(2),
        v: parseInt(values["5. volume"]),
      };
    })
    .reverse(); // 古い順に並べる

  return data;
}

/**
 * シンボル検索
 * @param {string} keywords - 検索キーワード（例: "トヨタ", "Apple"）
 * @returns {Array} - [{symbol, name, type, region}, ...]
 */
export async function searchSymbol(keywords) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("APIキーが設定されていません");

  const url = `${BASE_URL}?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(keywords)}&apikey=${apiKey}`;
  const res = await fetch(url);
  const json = await res.json();

  const matches = json["bestMatches"] || [];
  return matches.map((m) => ({
    symbol: m["1. symbol"],
    name: m["2. name"],
    type: m["3. type"],
    region: m["4. region"],
  }));
}

/**
 * ウォッチリストの管理（localStorage）
 */
const WATCHLIST_KEY = "watchlist-v1";

export function getWatchlist() {
  try {
    return JSON.parse(localStorage.getItem(WATCHLIST_KEY) || "[]");
  } catch {
    return [];
  }
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
