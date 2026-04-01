/**
 * Claude API呼び出し（Vercel Serverless Function経由）
 * レート制限時は自動リトライ（最大2回、30秒間隔）
 */
export async function askClaude(prompt, sys) {
  const maxRetries = 2;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, system: sys || undefined }),
      });

      const data = await res.json();

      // レート制限 → 待ってリトライ
      if (res.status === 429 && attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 30000)); // 30秒待機
        continue;
      }

      if (!res.ok) {
        return `エラー: ${data.error || "APIリクエストに失敗しました"}`;
      }

      return data.text || "取得失敗";
    } catch (err) {
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 5000));
        continue;
      }
      return "エラー: ネットワークエラーが発生しました。再試行してください。";
    }
  }

  return "エラー: リクエストに失敗しました。しばらく待ってから再試行してください。";
}
