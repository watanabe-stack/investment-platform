import { useState, useEffect, useCallback } from "react";
import { C } from "../constants/colors";
import { F } from "../constants/fonts";
import { askClaude } from "../api/claude";
import ResultBox from "../components/ResultBox";

const cardStyle = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, marginBottom: 14 };
const btnStyle = (color, active) => ({
  background: active ? `${color}20` : "transparent", border: `1.5px solid ${active ? color : C.border}`,
  color: active ? color : C.dim, padding: "10px 18px", borderRadius: 8, cursor: "pointer",
  fontSize: F.sm, fontFamily: "inherit", fontWeight: 600, transition: "all 0.15s",
});
const inputStyle = {
  background: "#f0f2f5", border: `1.5px solid ${C.border}`, color: C.text,
  padding: "10px 14px", borderRadius: 8, fontSize: F.base, fontFamily: "inherit", width: "100%", outline: "none",
};

const WL_KEY = "watchlist-v1";
const loadWatchlist = () => { try { return JSON.parse(localStorage.getItem(WL_KEY)) || []; } catch { return []; } };
const saveWatchlist = (list) => { localStorage.setItem(WL_KEY, JSON.stringify(list)); };

export default function ScreenerPage() {
  const [tab, setTab] = useState("screener");
  const [market, setMarket] = useState("両方");
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState(""); // "news" | "sector" | "stocks" | "done"
  const [result, setResult] = useState(null); // parsed JSON or text
  const [resultText, setResultText] = useState("");

  // Watchlist
  const [watchlist, setWatchlist] = useState(loadWatchlist);
  const [newStock, setNewStock] = useState({ name: "", code: "", market: "JP", reason: "" });
  const [checkLoading, setCheckLoading] = useState(null); // id of stock being checked
  const [checkResult, setCheckResult] = useState({}); // { id: text }

  useEffect(() => { saveWatchlist(watchlist); }, [watchlist]);

  const runScreening = useCallback(async () => {
    setLoading(true);
    setResult(null);
    setResultText("");

    try {
      // Phase 1: News
      setPhase("news");
      const marketLabel = market === "日本株" ? "日本市場" : market === "米国株" ? "米国市場" : "日本市場と米国市場";
      const newsPrompt = `${marketLabel}の本日の重要ニュースを5つ収集。各ニュースの概要(2行)、影響度(高/中/低)、影響セクターを整理。`;
      const newsR = await askClaude(newsPrompt, "Morning Screenerアシスタント。最新ニュースをウェブ検索し市場影響を分析。投資推奨は絶対にしない。");

      // Phase 2: Sector
      setPhase("sector");
      const sectorPrompt = `以下のニュース分析を踏まえて、${marketLabel}で本日注目すべきセクター上位3つと、避けるべきセクター2つを挙げてください。各セクターに一行理由を付けてください。\n\nニュース:\n${newsR.slice(0, 600)}`;
      const sectorR = await askClaude(sectorPrompt);

      // Phase 3: Stocks
      setPhase("stocks");
      const stockPrompt = `以下のセクター分析を踏まえ、${marketLabel}で本日スクリーニングすべき注目銘柄を5つ選定してください。\n\n以下のJSON形式で返してください（JSON以外のテキストは不要）:\n[{"name":"企業名","code":"証券コード","market":"JP or US","sector":"セクター","reason":"注目理由(1行)","risk":"リスク(1行)"}]\n\nセクター分析:\n${sectorR.slice(0, 500)}`;
      const stockR = await askClaude(stockPrompt, "投資リサーチアシスタント。ウェブ検索で正確な情報提供。必ずJSON形式で回答。購入推奨は絶対にしない。");

      // Parse JSON result
      setPhase("done");
      try {
        const jsonMatch = stockR.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          setResult(parsed);
        } else {
          setResult(null);
          setResultText(stockR);
        }
      } catch {
        setResult(null);
        setResultText(stockR);
      }
      // Store full text for fallback display
      if (!resultText && !result) setResultText(newsR + "\n\n---\n\n" + sectorR + "\n\n---\n\n" + stockR);
    } catch {
      setPhase("");
      setResultText("エラー: スクリーニングに失敗しました。再試行してください。");
    }
    setLoading(false);
  }, [market]);

  const addToWatchlist = (stock) => {
    const exists = watchlist.some((w) => w.code === stock.code && w.market === stock.market);
    if (exists) return;
    const item = {
      id: Date.now(),
      name: stock.name,
      code: stock.code,
      market: stock.market || "JP",
      sector: stock.sector || "",
      reason: stock.reason || "",
      status: "監視中",
      addedAt: new Date().toISOString(),
    };
    setWatchlist([item, ...watchlist]);
  };

  const addManualStock = () => {
    if (!newStock.name.trim()) return;
    const item = {
      id: Date.now(),
      name: newStock.name,
      code: newStock.code,
      market: newStock.market,
      sector: "",
      reason: newStock.reason,
      status: "監視中",
      addedAt: new Date().toISOString(),
    };
    setWatchlist([item, ...watchlist]);
    setNewStock({ name: "", code: "", market: "JP", reason: "" });
  };

  const updateStatus = (id, status) => {
    setWatchlist(watchlist.map((w) => w.id === id ? { ...w, status } : w));
  };

  const deleteFromWatchlist = (id) => {
    setWatchlist(watchlist.filter((w) => w.id !== id));
  };

  const checkLatest = async (stock) => {
    setCheckLoading(stock.id);
    const r = await askClaude(
      `「${stock.name}」(${stock.code}, ${stock.market === "JP" ? "日本市場" : "米国市場"})の最新状況を簡潔に教えてください。直近のニュース、株価動向、注目ポイント、リスク要因を各1-2行で。`,
      "投資リサーチアシスタント。客観的事実のみ。投資推奨は絶対にしない。"
    );
    setCheckResult({ ...checkResult, [stock.id]: r });
    setCheckLoading(null);
  };

  const phaseLabels = { news: "📰 ニュース収集中...", sector: "🏭 セクター分析中...", stocks: "🔍 銘柄スクリーニング中...", done: "✅ 完了" };

  return (
    <div>
      {/* タブ */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {[["screener", "🔎 スクリーナー"], ["watchlist", "📋 ウォッチリスト"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            style={{ ...btnStyle(tab === k ? C.accent : C.dim, tab === k), padding: "8px 20px" }}>{l}</button>
        ))}
      </div>

      {/* スクリーナー */}
      {tab === "screener" && (
        <div>
          <div style={cardStyle}>
            <div style={{ fontSize: F.h2, fontWeight: 700, color: C.accent, marginBottom: 8 }}>🌅 Morning Screener</div>
            <div style={{ fontSize: F.sm, color: C.dim, lineHeight: 2, marginBottom: 16 }}>
              AIがニュース→セクター→銘柄の順に自動スクリーニング。今日注目すべき銘柄候補を発見します。
            </div>

            {/* Market Selector */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {["日本株", "米国株", "両方"].map((m) => (
                <button key={m} onClick={() => setMarket(m)}
                  style={btnStyle(C.accent, market === m)}>{m}</button>
              ))}
            </div>

            {/* Screen Button */}
            <button onClick={runScreening} disabled={loading}
              style={{ ...btnStyle(C.green, true), padding: "14px 28px", fontSize: F.base, width: "100%", opacity: loading ? 0.5 : 1 }}>
              {loading ? phaseLabels[phase] || "分析中..." : "🚀 スクリーニング開始"}
            </button>

            {/* Progress */}
            {loading && (
              <div style={{ marginTop: 14 }}>
                {["news", "sector", "stocks"].map((p, i) => {
                  const done = ["news", "sector", "stocks"].indexOf(phase) > i;
                  const current = phase === p;
                  return (
                    <div key={p} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                        background: done ? C.green : current ? C.accent : C.border, color: "#fff", fontSize: 12, fontWeight: 700,
                      }}>{done ? "✓" : i + 1}</div>
                      <span style={{ fontSize: F.sm, color: done ? C.green : current ? C.accent : C.dim }}>
                        {["ニュース収集", "セクター分析", "銘柄スクリーニング"][i]}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Results */}
          {result && Array.isArray(result) && (
            <div style={cardStyle}>
              <div style={{ fontSize: F.h3, fontWeight: 700, color: C.green, marginBottom: 12 }}>📊 スクリーニング結果</div>
              {result.map((stock, i) => (
                <div key={i} style={{
                  background: "#f0f2f5", borderRadius: 10, padding: 16, marginBottom: 10,
                  border: `1px solid ${C.border}`,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div>
                      <span style={{ fontSize: F.base, fontWeight: 700, color: C.text }}>{stock.name}</span>
                      <span style={{ fontSize: F.xs, color: C.dim, marginLeft: 8 }}>{stock.code}</span>
                      <span style={{
                        fontSize: F.label, marginLeft: 8, padding: "2px 8px", borderRadius: 4,
                        background: stock.market === "US" ? `${C.cyan}15` : `${C.orange}15`,
                        color: stock.market === "US" ? C.cyan : C.orange,
                      }}>{stock.market === "US" ? "米国" : "日本"}</span>
                    </div>
                    <button onClick={() => addToWatchlist(stock)}
                      style={{ ...btnStyle(C.accent, false), padding: "6px 14px", fontSize: F.xs }}>+ ウォッチリスト</button>
                  </div>
                  {stock.sector && <div style={{ fontSize: F.xs, color: C.purple, marginBottom: 4 }}>セクター: {stock.sector}</div>}
                  {stock.reason && <div style={{ fontSize: F.sm, color: C.text, lineHeight: 1.8, marginBottom: 4 }}>💡 {stock.reason}</div>}
                  {stock.risk && <div style={{ fontSize: F.sm, color: C.orange, lineHeight: 1.8 }}>⚠️ {stock.risk}</div>}
                </div>
              ))}
            </div>
          )}

          {/* Fallback text result */}
          {!result && resultText && (
            <div style={cardStyle}>
              <div style={{ fontSize: F.h3, fontWeight: 700, color: C.accent, marginBottom: 10 }}>📊 分析結果</div>
              <ResultBox text={resultText} />
            </div>
          )}

          <div style={{ padding: 10, background: `${C.orange}05`, borderRadius: 8, border: `1px solid ${C.orange}12`, marginTop: 8 }}>
            <p style={{ fontSize: F.xs, color: "#8a7a5a", lineHeight: 1.8 }}>⚠️ スクリーニング補助ツールです。AIの分析は調査の出発点であり、投資助言ではありません。最終判断は必ずご自身で行ってください。</p>
          </div>
        </div>
      )}

      {/* ウォッチリスト */}
      {tab === "watchlist" && (
        <div>
          {/* 手動追加フォーム */}
          <div style={cardStyle}>
            <div style={{ fontSize: F.h3, fontWeight: 700, color: C.accent, marginBottom: 10 }}>+ 銘柄を追加</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
              <div style={{ flex: 2, minWidth: 140 }}>
                <label style={{ fontSize: F.xs, color: C.dim, display: "block", marginBottom: 4 }}>銘柄名</label>
                <input value={newStock.name} onChange={(e) => setNewStock({ ...newStock, name: e.target.value })}
                  placeholder="例: トヨタ自動車" style={inputStyle} />
              </div>
              <div style={{ flex: 1, minWidth: 100 }}>
                <label style={{ fontSize: F.xs, color: C.dim, display: "block", marginBottom: 4 }}>コード</label>
                <input value={newStock.code} onChange={(e) => setNewStock({ ...newStock, code: e.target.value })}
                  placeholder="7203" style={inputStyle} />
              </div>
              <div style={{ flex: 1, minWidth: 80 }}>
                <label style={{ fontSize: F.xs, color: C.dim, display: "block", marginBottom: 4 }}>市場</label>
                <select value={newStock.market} onChange={(e) => setNewStock({ ...newStock, market: e.target.value })}
                  style={{ ...inputStyle, appearance: "auto" }}>
                  <option value="JP">日本</option>
                  <option value="US">米国</option>
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: F.xs, color: C.dim, display: "block", marginBottom: 4 }}>注目理由（任意）</label>
              <input value={newStock.reason} onChange={(e) => setNewStock({ ...newStock, reason: e.target.value })}
                placeholder="例: AI関連で業績好調" style={inputStyle} />
            </div>
            <button onClick={addManualStock} style={btnStyle(C.accent, true)}>追加</button>
          </div>

          {/* ウォッチリスト一覧 */}
          {watchlist.length === 0 && (
            <div style={{ ...cardStyle, textAlign: "center", padding: 40, color: C.dim, fontSize: F.base }}>
              ウォッチリストは空です。スクリーナーで銘柄を見つけるか、手動で追加してください。
            </div>
          )}
          {watchlist.map((w) => (
            <div key={w.id} style={{
              ...cardStyle,
              borderColor: w.status === "購入済" ? `${C.green}30` : w.status === "見送り" ? `${C.dim}30` : C.border,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  <span style={{ fontSize: F.base, fontWeight: 700, color: C.text }}>{w.name}</span>
                  <span style={{ fontSize: F.xs, color: C.dim, marginLeft: 8 }}>{w.code}</span>
                  <span style={{
                    fontSize: F.label, marginLeft: 8, padding: "2px 8px", borderRadius: 4,
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

              {w.reason && <div style={{ fontSize: F.sm, color: "#5a6a78", lineHeight: 1.8, marginBottom: 8 }}>💡 {w.reason}</div>}
              <div style={{ fontSize: F.xs, color: C.dim, marginBottom: 10 }}>追加日: {new Date(w.addedAt).toLocaleDateString("ja-JP")}</div>

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                {["監視中", "購入済", "見送り"].map((st) => (
                  <button key={st} onClick={() => updateStatus(w.id, st)}
                    style={{ ...btnStyle(st === "購入済" ? C.green : st === "見送り" ? C.dim : C.accent, w.status === st), padding: "6px 14px", fontSize: F.xs }}>{st}</button>
                ))}
                <button onClick={() => checkLatest(w)} disabled={checkLoading === w.id}
                  style={{ ...btnStyle(C.cyan, false), padding: "6px 14px", fontSize: F.xs }}>
                  {checkLoading === w.id ? "確認中..." : "🔍 最新状況チェック"}
                </button>
                <button onClick={() => deleteFromWatchlist(w.id)}
                  style={{ ...btnStyle("#78909c", false), padding: "6px 14px", fontSize: F.xs, marginLeft: "auto" }}>削除</button>
              </div>

              {checkResult[w.id] && (
                <div style={{ background: `${C.accent}06`, borderRadius: 8, padding: 12, borderLeft: `3px solid ${C.accent}`, fontSize: F.sm, color: "#4a6a88", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
                  <div style={{ fontSize: F.xs, color: C.dim, marginBottom: 6 }}>🔍 最新状況</div>
                  {checkResult[w.id]}
                </div>
              )}
            </div>
          ))}

          <div style={{ padding: 10, background: `${C.orange}05`, borderRadius: 8, border: `1px solid ${C.orange}12`, marginTop: 8 }}>
            <p style={{ fontSize: F.xs, color: "#8a7a5a", lineHeight: 1.8 }}>⚠️ ウォッチリストは投資推奨リストではありません。必ずResearch Labで深掘り調査してから判断してください。</p>
          </div>
        </div>
      )}
    </div>
  );
}
