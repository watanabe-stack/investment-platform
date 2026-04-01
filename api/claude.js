/**
 * Vercel Serverless Function — Claude API Proxy
 *
 * モデル: claude-haiku-4-5-20251001（高速・低コスト・レート制限に余裕あり）
 * web_searchツールでリアルタイムのニュース・株価情報を取得可能
 */

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY is not configured" });

  try {
    const { prompt, system } = req.body;
    if (!prompt) return res.status(400).json({ error: "prompt is required" });

    // プロンプトが長すぎる場合は切り詰め（レート制限対策）
    const trimmedPrompt = prompt.length > 3000 ? prompt.slice(0, 3000) + "\n\n（以上の情報を元に分析してください）" : prompt;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1500,
        system: system || "あなたは投資リサーチアシスタントです。客観的事実と分析のみ提供し、投資推奨は絶対にしません。簡潔に回答してください。",
        messages: [{ role: "user", content: trimmedPrompt }],
        tools: [{ type: "web_search_20250305", name: "web_search" }],
      }),
    });

    const data = await response.json();

    // レート制限の場合はリトライ案内
    if (response.status === 429) {
      return res.status(429).json({
        error: "APIレート制限に達しました。30秒ほど待ってから再試行してください。",
      });
    }

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || "Claude API error",
      });
    }

    const text = data.content
      ?.filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n") || "";

    return res.status(200).json({ text });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
