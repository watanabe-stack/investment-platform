/**
 * Vercel Serverless Function — Claude API Proxy
 *
 * ブラウザからClaude APIを直接呼ぶとCORSでブロックされるため、
 * このプロキシを経由してリクエストを中継する。
 *
 * APIキーはVercelの環境変数 ANTHROPIC_API_KEY に設定する。
 * ブラウザにAPIキーが露出しないため安全。
 *
 * エンドポイント: POST /api/claude
 * Body: { prompt: string, system?: string }
 */

export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY is not configured in Vercel environment variables" });
  }

  try {
    const { prompt, system } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "prompt is required" });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        system: system || "あなたは投資リサーチアシスタントです。客観的事実と分析のみ提供し、投資推奨は絶対にしません。",
        messages: [{ role: "user", content: prompt }],
        tools: [{ type: "web_search_20250305", name: "web_search" }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || "Claude API error",
        type: data.error?.type,
      });
    }

    // テキストブロックのみ抽出して返す
    const text = data.content
      ?.filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n") || "";

    return res.status(200).json({ text });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
