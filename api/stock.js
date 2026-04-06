/**
 * Vercel Serverless Function — 株価データプロキシ
 *
 * 日本株（4桁コード or .T付き）→ J-Quants API
 * 米国株・その他 → Alpha Vantage API
 *
 * GET /api/stock?symbol=7203   → J-Quants（トヨタ）
 * GET /api/stock?symbol=7203.T → J-Quants（トヨタ）
 * GET /api/stock?symbol=AAPL   → Alpha Vantage
 * GET /api/stock?symbol=TM     → Alpha Vantage
 */

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { symbol } = req.query;
  if (!symbol) return res.status(400).json({ error: "symbol parameter is required" });

  // 日本株判定: 4桁数字 or 数字.T
  const jpMatch = symbol.match(/^(\d{4,5})(\.T)?$/i);
  if (jpMatch) {
    return fetchJQuants(jpMatch[1], res);
  }

  return fetchAlphaVantage(symbol, res);
}

async function fetchJQuants(code, res) {
  const apiKey = process.env.JQUANTS_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "JQUANTS_API_KEY is not configured. Vercelの環境変数に設定してください。" });
  }

  try {
    // 直近2年分のデータを取得（無料プランは12週間遅延）
    const to = new Date();
    to.setDate(to.getDate() - 84); // 12週前
    const from = new Date(to);
    from.setFullYear(from.getFullYear() - 2);

    const fromStr = from.toISOString().split("T")[0].replace(/-/g, "");
    const toStr = to.toISOString().split("T")[0].replace(/-/g, "");

    const url = `https://api.jquants.com/v2/equities/bars/daily?code=${code}&from=${fromStr}&to=${toStr}`;
    const response = await fetch(url, {
      headers: { "x-api-key": apiKey },
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.message || `J-Quants APIエラー (${response.status})`,
      });
    }

    const quotes = data.data || [];
    if (quotes.length === 0) {
      return res.status(404).json({ error: `日本株 ${code} のデータが見つかりません` });
    }

    // Signal Engine互換フォーマットに変換（分割調整済み株価を優先）
    const bars = quotes.map((q) => {
      const dt = new Date(q.Date);
      return {
        date: q.Date,
        ds: `${dt.getMonth() + 1}/${dt.getDate()}`,
        o: parseFloat(q.AdjO || q.O || 0),
        h: parseFloat(q.AdjH || q.H || 0),
        l: parseFloat(q.AdjL || q.L || 0),
        c: parseFloat(q.AdjC || q.C || 0),
        v: parseInt(q.AdjVo || q.Vo || 0),
      };
    }).filter((d) => d.c > 0);

    return res.status(200).json({ bars, source: "jquants", code });
  } catch (err) {
    return res.status(500).json({ error: err.message || "J-Quants API接続エラー" });
  }
}

async function fetchAlphaVantage(symbol, res) {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ALPHA_VANTAGE_API_KEY is not configured" });
  }

  try {
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(symbol)}&outputsize=compact&apikey=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data["Error Message"]) return res.status(404).json({ error: `銘柄が見つかりません: ${symbol}` });
    if (data["Note"] || data["Information"]) return res.status(429).json({ error: "API制限です。しばらく待ってください。" });

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

    return res.status(200).json({ bars, source: "alphavantage", symbol });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
