/**
 * Claude API呼び出し
 * Research Lab用のウェブ検索+分析
 * 注意: 株価予測・購入推奨は絶対に行わない（法的リスクあり）
 */
export async function askClaude(prompt, sys) {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system:
          sys ||
          "あなたは投資リサーチアシスタントです。客観的事実と分析のみ提供し、投資推奨は絶対にしません。",
        messages: [{ role: "user", content: prompt }],
        tools: [{ type: "web_search_20250305", name: "web_search" }],
      }),
    });

    const data = await res.json();
    return (
      data.content
        ?.filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("\n") || "取得失敗"
    );
  } catch {
    return "エラー: 再試行してください";
  }
}
