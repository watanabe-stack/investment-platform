import { useState, useEffect, useCallback } from "react";
import { C } from "../constants/colors";
import { F } from "../constants/fonts";
import { askClaude } from "../api/claude";

const cardStyle = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, marginBottom: 14 };
const btnStyle = (color, active) => ({
  background: active ? `${color}20` : "transparent", border: `1.5px solid ${active ? color : C.border}`,
  color: active ? color : C.dim, padding: "10px 18px", borderRadius: 8, cursor: "pointer",
  fontSize: F.sm, fontFamily: "inherit", fontWeight: 600, transition: "all 0.15s",
});
const inputStyle = {
  background: "#f0f2f5", border: `1.5px solid ${C.border}`, color: C.text,
  padding: "12px 14px", borderRadius: 8, fontSize: F.base, fontFamily: "inherit", width: "100%", outline: "none",
};

const WL_KEY = "watchlist-v1";
const loadWatchlist = () => { try { return JSON.parse(localStorage.getItem(WL_KEY)) || []; } catch { return []; } };
const saveWatchlist = (list) => { localStorage.setItem(WL_KEY, JSON.stringify(list)); };

export default function ScreenerPage({ cache, setCache }) {
  const [tab, setTab] = useState("screener");
  const [market, setMarket] = useState("日本株");
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState("");
  // キャッシュから復元（ページ遷移しても結果が残る）
  const [summary, setSummary] = useState(cache?.summary || "");
  const [stocks, setStocks] = useState(cache?.stocks || []);
  const [rawText, setRawText] = useState(cache?.rawText || "");

  const [watchlist, setWatchlist] = useState(loadWatchlist);
  const [newStock, setNewStock] = useState({ name: "", code: "", market: "JP", reason: "" });
  const [checkLoading, setCheckLoading] = useState(null);
  const [checkResult, setCheckResult] = useState({});

  useEffect(() => { saveWatchlist(watchlist); }, [watchlist]);

  const runScreening = useCallback(async () => {
    setLoading(true);
    setSummary(""); setStocks([]); setRawText("");

    const ml = market === "日本株" ? "日本市場" : market === "米国株" ? "米国市場" : "日本市場・米国市場";

    try {
      // 1ステップで結論まで出す（API呼び出しを1回に抑えてレート制限回避）
      setPhase("分析中...");
      const r = await askClaude(
        `${ml}の本日の注目銘柄を5つ教えてください。

以下の形式で回答してください:

【今日の結論】
（1〜2行で「今日の市場の方向性」と「注目テーマ」を書く）

【注目銘柄】
1. 銘柄名（コード）- セクター
   注目理由:（1行）
   リスク:（1行）

2. ...（5つまで）

ウェブ検索で本日のニュースを確認し、具体的な銘柄コードを含めてください。`,
        "投資リサーチアシスタント。ウェブ検索で最新情報を取得。簡潔に結論から書く。投資推奨はしない。調査候補を提示するのみ。"
      );

      setPhase("完了");

      // テキストをパースして構造化
      const lines = r.split("\n").filter((l) => l.trim());

      // 結論部分を抽出
      let summaryText = "";
      const conclusionIdx = lines.findIndex((l) => l.includes("今日の結論") || l.includes("結論"));
      const stocksIdx = lines.findIndex((l) => l.includes("注目銘柄") || l.includes("銘柄"));

      if (conclusionIdx >= 0 && stocksIdx > conclusionIdx) {
        summaryText = lines.slice(conclusionIdx + 1, stocksIdx).join("\n").trim();
      } else {
        summaryText = lines.slice(0, 2).join("\n");
      }
      setSummary(summaryText);

      // 銘柄部分をパース（番号付きリストを検出）
      const parsed = [];
      let current = null;
      for (const line of lines) {
        const numMatch = line.match(/^(\d+)[.．)）]\s*(.+)/);
        if (numMatch) {
          if (current) parsed.push(current);
          // 銘柄名（コード）形式をパース
          const nameMatch = numMatch[2].match(/(.+?)[（(](\d{4})[)）]/);
          current = {
            name: nameMatch ? nameMatch[1].trim() : numMatch[2].split("-")[0].trim(),
            code: nameMatch ? nameMatch[2] : "",
            sector: numMatch[2].split("-").slice(1).join("-").trim() || "",
            reason: "",
            risk: "",
            market: market === "米国株" ? "US" : "JP",
          };
        } else if (current) {
          const lower = line.trim();
          if (lower.startsWith("注目理由") || lower.startsWith("理由")) {
            current.reason = lower.replace(/^(注目理由|理由)[：:]?\s*/, "");
          } else if (lower.startsWith("リスク")) {
            current.risk = lower.replace(/^リスク[：:]?\s*/, "");
          } else if (!current.reason && lower.length > 5) {
            current.reason = lower;
          }
        }
      }
      if (current) parsed.push(current);

      if (parsed.length > 0) {
        setStocks(parsed);
        setCache?.({ summary: summaryText, stocks: parsed, rawText: "" });
      } else {
        setRawText(r);
        setCache?.({ summary: summaryText, stocks: [], rawText: r });
      }
    } catch {
      setPhase("");
      setRawText("エラー: スクリーニングに失敗しました。しばらく待ってから再試行してください。");
    }
    setLoading(false);
  }, [market]);

  const addToWatchlist = (stock) => {
    if (watchlist.some((w) => w.name === stock.name)) return;
    setWatchlist([{
      id: Date.now(), name: stock.name, code: stock.code, market: stock.market || "JP",
      sector: stock.sector || "", reason: stock.reason || "", status: "監視中", addedAt: new Date().toISOString(),
    }, ...watchlist]);
  };

  const addManualStock = () => {
    if (!newStock.name.trim()) return;
    setWatchlist([{
      id: Date.now(), ...newStock, sector: "", status: "監視中", addedAt: new Date().toISOString(),
    }, ...watchlist]);
    setNewStock({ name: "", code: "", market: "JP", reason: "" });
  };

  const checkLatest = async (stock) => {
    setCheckLoading(stock.id);
    const r = await askClaude(
      `「${stock.name}」(${stock.code})の最新状況を3行で。1行目:株価動向、2行目:注目点、3行目:リスク。`,
      "投資リサーチアシスタント。3行で簡潔に。投資推奨はしない。"
    );
    setCheckResult({ ...checkResult, [stock.id]: r });
    setCheckLoading(null);
  };

  return (
    <div>
      {/* タブ */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {[["screener", `🔎 スクリーナー`], ["watchlist", `📋 ウォッチ(${watchlist.length})`]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            style={{ ...btnStyle(tab === k ? C.accent : C.dim, tab === k), padding: "10px 24px" }}>{l}</button>
        ))}
      </div>

      {/* ── スクリーナー ── */}
      {tab === "screener" && (
        <div>
          <div style={cardStyle}>
            <div style={{ fontSize: F.h2, fontWeight: 700, color: C.text, marginBottom: 12 }}>☀️ 今日の注目銘柄を見つける</div>

            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {["日本株", "米国株", "両方"].map((m) => (
                <button key={m} onClick={() => setMarket(m)}
                  style={btnStyle(C.accent, market === m)}>{m}</button>
              ))}
            </div>

            <button onClick={runScreening} disabled={loading}
              style={{
                ...btnStyle(C.accent, true), padding: "16px", fontSize: F.base, width: "100%",
                opacity: loading ? 0.6 : 1, fontWeight: 700,
              }}>
              {loading ? `⏳ ${phase}` : "🚀 スクリーニング開始"}
            </button>
          </div>

          {/* 結論（最も重要 → 一番上に大きく表示） */}
          {summary && (
            <div style={{
              ...cardStyle, borderLeft: `4px solid ${C.accent}`,
              background: `${C.accent}06`,
            }}>
              <div style={{ fontSize: F.h3, fontWeight: 700, color: C.accent, marginBottom: 8 }}>📌 今日の結論</div>
              <div style={{ fontSize: F.base, color: C.text, lineHeight: 2, whiteSpace: "pre-wrap" }}>{summary}</div>
            </div>
          )}

          {/* 銘柄リスト */}
          {stocks.length > 0 && (
            <div>
              <div style={{ fontSize: F.h3, fontWeight: 700, color: C.text, marginBottom: 12 }}>
                📊 注目銘柄（調査候補であり購入推奨ではありません）
              </div>
              {stocks.map((s, i) => (
                <div key={i} style={{
                  ...cardStyle, padding: 18,
                  borderLeft: `4px solid ${i < 2 ? C.green : C.border}`,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div>
                      <span style={{ fontSize: F.h3, fontWeight: 700, color: C.text }}>{i + 1}. {s.name}</span>
                      {s.code && <span style={{ fontSize: F.sm, color: C.dim, marginLeft: 10 }}>{s.code}</span>}
                      {s.sector && <span style={{ fontSize: F.xs, color: C.purple, marginLeft: 10, padding: "2px 8px", borderRadius: 4, background: `${C.purple}10` }}>{s.sector}</span>}
                    </div>
                    <button onClick={() => addToWatchlist(s)}
                      disabled={watchlist.some((w) => w.name === s.name)}
                      style={{ ...btnStyle(watchlist.some((w) => w.name === s.name) ? C.dim : C.accent, false), padding: "8px 16px", fontSize: F.xs }}>
                      {watchlist.some((w) => w.name === s.name) ? "追加済" : "+ ウォッチ"}
                    </button>
                  </div>
                  {s.reason && (
                    <div style={{ fontSize: F.sm, color: C.text, lineHeight: 1.9, marginBottom: 6 }}>
                      <strong style={{ color: C.green }}>注目:</strong> {s.reason}
                    </div>
                  )}
                  {s.risk && (
                    <div style={{ fontSize: F.sm, color: C.dim, lineHeight: 1.9 }}>
                      <strong style={{ color: C.orange }}>リスク:</strong> {s.risk}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* フォールバック（パース失敗時） */}
          {rawText && !stocks.length && (
            <div style={cardStyle}>
              <div style={{ fontSize: F.h3, fontWeight: 700, color: C.text, marginBottom: 10 }}>📊 分析結果</div>
              <div style={{ fontSize: F.sm, color: C.text, lineHeight: 2, whiteSpace: "pre-wrap" }}>{rawText}</div>
            </div>
          )}

          {(summary || stocks.length > 0 || rawText) && (
            <div style={{ fontSize: F.xs, color: C.dim, textAlign: "center", padding: 12, lineHeight: 1.8 }}>
              ⚠️ 調査候補であり購入推奨ではありません。Research Lab → Signal Engine → 仮説ジャーナルの順に検証してください。
            </div>
          )}
        </div>
      )}

      {/* ── ウォッチリスト ── */}
      {tab === "watchlist" && (
        <div>
          <div style={cardStyle}>
            <div style={{ fontSize: F.h3, fontWeight: 700, color: C.text, marginBottom: 12 }}>+ 銘柄を手動追加</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
              <div style={{ flex: 2, minWidth: 140 }}>
                <input value={newStock.name} onChange={(e) => setNewStock({ ...newStock, name: e.target.value })}
                  placeholder="銘柄名" style={inputStyle} />
              </div>
              <div style={{ flex: 1, minWidth: 100 }}>
                <input value={newStock.code} onChange={(e) => setNewStock({ ...newStock, code: e.target.value })}
                  placeholder="コード" style={inputStyle} />
              </div>
              <div style={{ flex: 1, minWidth: 80 }}>
                <select value={newStock.market} onChange={(e) => setNewStock({ ...newStock, market: e.target.value })}
                  style={{ ...inputStyle, appearance: "auto" }}>
                  <option value="JP">日本</option><option value="US">米国</option>
                </select>
              </div>
              <button onClick={addManualStock} style={{ ...btnStyle(C.accent, true), padding: "12px 20px" }}>追加</button>
            </div>
          </div>

          {watchlist.length === 0 && (
            <div style={{ ...cardStyle, textAlign: "center", padding: 40, color: C.dim }}>
              ウォッチリストは空です。スクリーナーで銘柄を見つけるか、手動で追加してください。
            </div>
          )}

          {watchlist.map((w) => (
            <div key={w.id} style={{
              ...cardStyle,
              borderLeft: `4px solid ${w.status === "購入済" ? C.green : w.status === "見送り" ? C.dim : C.accent}`,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div>
                  <span style={{ fontSize: F.base, fontWeight: 700, color: C.text }}>{w.name}</span>
                  {w.code && <span style={{ fontSize: F.sm, color: C.dim, marginLeft: 10 }}>{w.code}</span>}
                  <span style={{
                    fontSize: F.label, marginLeft: 10, padding: "2px 8px", borderRadius: 4,
                    background: w.market === "US" ? `${C.cyan}15` : `${C.orange}15`,
                    color: w.market === "US" ? C.cyan : C.orange,
                  }}>{w.market === "US" ? "米国" : "日本"}</span>
                </div>
                <span style={{
                  fontSize: F.sm, fontWeight: 700, padding: "4px 14px", borderRadius: 6,
                  background: w.status === "購入済" ? `${C.green}15` : w.status === "見送り" ? `${C.dim}15` : `${C.accent}15`,
                  color: w.status === "購入済" ? C.green : w.status === "見送り" ? C.dim : C.accent,
                }}>{w.status}</span>
              </div>

              {w.reason && <div style={{ fontSize: F.sm, color: C.dim, lineHeight: 1.8, marginBottom: 8 }}>{w.reason}</div>}
              <div style={{ fontSize: F.xs, color: C.dim, marginBottom: 10 }}>追加: {new Date(w.addedAt).toLocaleDateString("ja-JP")}</div>

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {["監視中", "購入済", "見送り"].map((st) => (
                  <button key={st} onClick={() => setWatchlist(watchlist.map((x) => x.id === w.id ? { ...x, status: st } : x))}
                    style={{ ...btnStyle(st === "購入済" ? C.green : st === "見送り" ? C.dim : C.accent, w.status === st), padding: "6px 14px", fontSize: F.xs }}>{st}</button>
                ))}
                <button onClick={() => checkLatest(w)} disabled={checkLoading === w.id}
                  style={{ ...btnStyle(C.cyan, false), padding: "6px 14px", fontSize: F.xs }}>
                  {checkLoading === w.id ? "確認中..." : "🔍 チェック"}
                </button>
                <button onClick={() => setWatchlist(watchlist.filter((x) => x.id !== w.id))}
                  style={{ ...btnStyle(C.red, false), padding: "6px 14px", fontSize: F.xs, marginLeft: "auto" }}>削除</button>
              </div>

              {checkResult[w.id] && (
                <div style={{ background: "#f0f2f5", borderRadius: 8, padding: 14, marginTop: 10, borderLeft: `3px solid ${C.accent}`, fontSize: F.sm, color: C.text, lineHeight: 2, whiteSpace: "pre-wrap" }}>
                  {checkResult[w.id]}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
