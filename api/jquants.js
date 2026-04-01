/**
 * Vercel Serverless Function — J-Quants API Proxy
 *
 * 日本株の株価データをJ-Quants API v2経由で取得する。
 * APIキーはVercelの環境変数 JQUANTS_API_KEY に設定する。
 *
 * エンドポイント:
 *   GET /api/jquants?action=daily&code=7203&from=2026-01-01&to=2026-03-31
 *   GET /api/jquants?action=listed&code=7203
 *   GET /api/jquants?action=search&keyword=トヨタ
 */

const BASE = "https://api.jquants.com/v2";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.JQUANTS_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "JQUANTS_API_KEY is not configured" });
  }

  const { action, code, from, to, date, keyword } = req.query;
  const headers = { "x-api-key": apiKey };

  try {
    let url;

    switch (action) {
      case "daily": {
        // 株価四本値（日足OHLCV）
        url = `${BASE}/equities/bars/daily?code=${code}`;
        if (from) url += `&from=${from}`;
        if (to) url += `&to=${to}`;
        if (date) url += `&date=${date}`;
        break;
      }
      case "listed": {
        // 上場銘柄情報
        url = `${BASE}/listed/info`;
        if (code) url += `?code=${code}`;
        break;
      }
      case "search": {
        // 銘柄検索（上場銘柄一覧から検索）
        url = `${BASE}/listed/info`;
        break;
      }
      case "fins": {
        // 財務情報
        url = `${BASE}/fins/statements?code=${code}`;
        break;
      }
      default:
        return res.status(400).json({ error: "Invalid action. Use: daily, listed, search, fins" });
    }

    const response = await fetch(url, { headers });
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.message || "J-Quants API error",
        status: response.status,
      });
    }

    // 銘柄検索の場合はフィルタリング
    if (action === "search" && keyword) {
      const items = data.info || [];
      const filtered = items.filter(
        (item) =>
          item.CompanyName?.includes(keyword) ||
          item.CompanyNameEnglish?.toLowerCase().includes(keyword.toLowerCase()) ||
          item.Code?.startsWith(keyword)
      ).slice(0, 20);
      return res.status(200).json({ results: filtered });
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
