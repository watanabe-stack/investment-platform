/**
 * Claude API呼び出し（Vercel Serverless Function経由）
 *
 * ブラウザ → /api/claude → Anthropic API
 * APIキーはサーバー側（Vercel環境変数）に保持され、ブラウザには露出しない
 *
 * 注意: 株価予測・購入推奨は絶対に行わない（法的リスクあり）
 */
export async function askClaude(prompt, sys) {
  try {
    const res = await fetch("/api/claude", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        system: sys || undefined,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Claude API error:", data);
      return `エラー: ${data.error || "APIリクエストに失敗しました"}`;
    }

    return data.text || "取得失敗";
  } catch (err) {
    console.error("Claude API fetch error:", err);
    return "エラー: ネットワークエラーが発生しました。再試行してください。";
  }
}
