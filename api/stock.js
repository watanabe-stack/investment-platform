/**
 * Vercel Serverless Function — 株価データプロキシ
 * Alpha Vantage TIME_SERIES_DAILY API を使用
 * 環境変数: ALPHA_VANTAGE_API_KEY
 *
 * GET /api/stock?symbol=7203.T
 * GET /api/stock?symbol=AAPL
 */

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ALPHA_VANTAGE_API_KEY is not configured" });

  const { symbol } = req.query;
  if (!symbol) return res.status(400).json({ error: "symbol parameter is required" });

  try {
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(symbol)}&outputsize=compact&apikey=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data["Error Message"]) return res.status(404).json({ error: `銘柄が見つかりません: ${symbol}` });
    if (data["Note"] || data["Information"]) return res.status(429).json({ error: "API制限です。しばらく待ってから再試行してください。" });

    const ts = data["Time Series (Daily)"];
    if (!ts) return res.status(404).json({ error: "データを取得できませんでした" });

    const bars = Object.entries(ts).map(([dateStr, v]) => {
      const dt = new Date(dateStr);
      return {
        date: dateStr,
        ds: `${dt.getMonth() + 1}/${dt.getDate()}`,
        o: +parseFloat(v["1. open"]).toFixed(2),
        h: +parseFloat(v["2. high"]).toFixed(2),
        l: +parseFloat(v["3. low"]).toFixed(2),
        c: +parseFloat(v["4. close"]).toFixed(2),
        v: parseInt(v["5. volume"]),
      };
    }).reverse();

    return res.status(200).json({ bars });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
