/**
 * Vercel Serverless Function — 銘柄検索プロキシ
 * Alpha Vantage SYMBOL_SEARCH API を使用
 * 環境変数: ALPHA_VANTAGE_API_KEY
 *
 * GET /api/search?q=トヨタ
 * GET /api/search?q=AAPL
 */

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ALPHA_VANTAGE_API_KEY is not configured" });

  const { q } = req.query;
  if (!q) return res.status(400).json({ error: "q parameter is required" });

  try {
    const url = `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(q)}&apikey=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data["Note"] || data["Information"]) {
      return res.status(429).json({ error: "API制限に達しました。しばらく待ってから再試行してください。" });
    }

    const results = (data["bestMatches"] || []).map((m) => ({
      symbol: m["1. symbol"],
      name: m["2. name"],
      type: m["3. type"],
      region: m["4. region"],
      currency: m["8. currency"],
    }));

    return res.status(200).json({ results });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
