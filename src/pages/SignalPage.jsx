import { useState, useMemo, useEffect } from "react";
import { C } from "../constants/colors";
import { F } from "../constants/fonts";
import { TF } from "../scoring/timeframes";
import { scoreAll, getVerdict } from "../scoring/engine";
import { DATASETS, genDaily, genIntraday } from "../data/simulate";
import { fetchDailyData, getApiKey, setApiKey, getWatchlist, addToWatchlist, removeFromWatchlist } from "../data/api";
import { generateDailyHypothesis, verifyPendingHypotheses, loadAutoHypos } from "../data/autoHypothesis";
import { VERDICT_PRINCIPLES, REGIME_PRINCIPLES } from "../constants/principles";
import ScoreBar from "../components/ScoreBar";
import MiniChart from "../components/MiniChart";

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

export default function SignalPage() {
  const [tf, setTf] = useState("swing");
  const [expIdx, setExpIdx] = useState(null);

  // データソース: "sim" (シミュレーション) or "real" (実データ)
  const [mode, setMode] = useState("sim");
  const [si, setSi] = useState(0);

  // ウォッチリスト
  const [watchlist, setWatchlist] = useState([]);
  const [newSymbol, setNewSymbol] = useState("");
  const [newName, setNewName] = useState("");
  const [selectedSymbol, setSelectedSymbol] = useState(null);
  const [showWatchSettings, setShowWatchSettings] = useState(false);

  // デフォルト銘柄の表示管理
  const [hiddenDefaults, setHiddenDefaults] = useState(() => {
    try { return JSON.parse(localStorage.getItem("hidden-defaults-v1") || "[]"); } catch { return []; }
  });
  const visibleDatasets = DATASETS.map((d, i) => ({ ...d, idx: i })).filter((_, i) => !hiddenDefaults.includes(i));
  const hideDefault = (idx) => {
    const updated = [...hiddenDefaults, idx];
    setHiddenDefaults(updated);
    localStorage.setItem("hidden-defaults-v1", JSON.stringify(updated));
    if (mode === "sim" && si === idx) { setSi(visibleDatasets[0]?.idx ?? 0); }
  };
  const showAllDefaults = () => { setHiddenDefaults([]); localStorage.removeItem("hidden-defaults-v1"); };

  // 実データ
  const [realDaily, setRealDaily] = useState(null);
  const [realLoading, setRealLoading] = useState(false);
  const [realError, setRealError] = useState("");
  const [apiKey, setApiKeyState] = useState(getApiKey());

  // 自動仮説
  const [autoHypoMsg, setAutoHypoMsg] = useState("");

  useEffect(() => { setWatchlist(getWatchlist()); }, []);

  // 実データ取得
  const loadRealData = async (symbol) => {
    setRealLoading(true); setRealError("");
    try {
      const data = await fetchDailyData(symbol);
      setRealDaily(data);
      setSelectedSymbol(symbol);
      setMode("real");
    } catch (e) {
      setRealError(e.message);
      setRealDaily(null);
    }
    setRealLoading(false);
  };

  const handleAddWatch = () => {
    if (!newSymbol.trim()) return;
    const updated = addToWatchlist(newSymbol.trim().toUpperCase(), newName.trim() || newSymbol.trim().toUpperCase());
    setWatchlist(updated);
    setNewSymbol(""); setNewName("");
  };

  const handleRemoveWatch = (symbol) => {
    const updated = removeFromWatchlist(symbol);
    setWatchlist(updated);
    if (selectedSymbol === symbol) { setMode("sim"); setSelectedSymbol(null); setRealDaily(null); }
  };

  const handleSaveApiKey = () => { setApiKey(apiKey); setApiKeyState(apiKey); };

  // 全ウォッチリスト銘柄の日次自動仮説生成 + 前日分検証
  const runDailyAutoHypo = async () => {
    if (watchlist.length === 0) { setAutoHypoMsg("⚠️ ウォッチリストに銘柄を登録してください"); return; }
    if (!getApiKey()) { setAutoHypoMsg("⚠️ APIキーを設定してください"); return; }

    setAutoHypoMsg("📡 全銘柄のデータ取得中...");
    let generated = 0, verified = 0, errors = 0;

    for (const w of watchlist) {
      try {
        const data = await fetchDailyData(w.symbol);
        if (data.length < 2) continue;
        const lastClose = data[data.length - 1].c;
        const intraData = genIntraday(data);
        const scoreResult = scoreAll("swing", data, intraData);
        const v = getVerdict(scoreResult.composite);

        // 仮説生成
        generateDailyHypothesis(w.symbol, w.name, scoreResult.composite, v.label, lastClose);
        generated++;

        // 前日分の検証
        const before = loadAutoHypos().filter((h) => h.symbol === w.symbol && h.result === null).length;
        verifyPendingHypotheses(w.symbol, lastClose);
        const after = loadAutoHypos().filter((h) => h.symbol === w.symbol && h.result === null).length;
        verified += before - after;
      } catch {
        errors++;
      }
      // APIレート制限対策: 1銘柄ごとに少し待つ
      await new Promise((r) => setTimeout(r, 1200));
    }

    setAutoHypoMsg(`✅ 完了: ${generated}件の仮説を生成、${verified}件を検証${errors > 0 ? `、${errors}件エラー` : ""}`);
  };

  // データ選択
  const simDaily = useMemo(() => genDaily(400, DATASETS[si].p, DATASETS[si].v), [si]);
  const simIntra = useMemo(() => genIntraday(simDaily), [simDaily]);
  const realIntra = useMemo(() => realDaily ? genIntraday(realDaily) : [], [realDaily]);

  const daily = mode === "real" && realDaily ? realDaily : simDaily;
  const intra = mode === "real" && realDaily ? realIntra : simIntra;

  const result = useMemo(() => scoreAll(tf, daily, intra), [tf, daily, intra]);
  const verdict = getVerdict(result.composite);
  const tfConf = TF[tf];
  const principles = VERDICT_PRINCIPLES[verdict.label];
  const regimePrinciple = result.regime ? REGIME_PRINCIPLES[result.regime.regime] : null;

  const bullC = result.scores.filter((s) => s.score > 10).length;
  const bearC = result.scores.filter((s) => s.score < -10).length;
  const agree = Math.max(bullC, bearC);
  const total = result.scores.length;
  const conf = agree >= Math.ceil(total * 0.7) ? "高" : agree >= Math.ceil(total * 0.4) ? "中" : "低";
  const confCol = conf === "高" ? C.green : conf === "中" ? C.orange : C.red;

  const currentLabel = mode === "real" && selectedSymbol
    ? watchlist.find((w) => w.symbol === selectedSymbol)?.name || selectedSymbol
    : DATASETS[si].label;

  return (
    <div>
      {/* ── ウォッチリスト & データソース ── */}
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: F.h3, fontWeight: 700, color: C.accent }}>📋 銘柄選択</div>
          <button onClick={() => setShowWatchSettings(!showWatchSettings)}
            style={{ ...btnStyle(C.dim, false), padding: "6px 12px", fontSize: F.xs }}>
            ⚙️ 設定
          </button>
        </div>

        {/* API設定 */}
        {showWatchSettings && (
          <div style={{ background: "#f0f2f5", borderRadius: 8, padding: 14, marginBottom: 12 }}>
            <div style={{ fontSize: F.xs, color: C.dim, marginBottom: 6 }}>
              Alpha Vantage APIキー（無料: <a href="https://www.alphavantage.co/support/#api-key" target="_blank" rel="noreferrer" style={{ color: C.accent }}>ここで取得</a>）
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={apiKey} onChange={(e) => setApiKeyState(e.target.value)}
                placeholder="APIキーを入力" style={{ ...inputStyle, flex: 1, fontSize: F.sm }} type="password" />
              <button onClick={handleSaveApiKey} style={{ ...btnStyle(C.green, true), padding: "8px 14px" }}>保存</button>
            </div>
            <div style={{ fontSize: F.xs, color: C.dim, marginTop: 6, lineHeight: 1.6 }}>
              無料枠: 25リクエスト/日。日本株は「7203.T」、米国株は「AAPL」形式で登録。
            </div>
          </div>
        )}

        {/* ウォッチリスト銘柄追加 */}
        <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
          <input value={newSymbol} onChange={(e) => setNewSymbol(e.target.value)}
            placeholder="ティッカー (例: 7203.T)" style={{ ...inputStyle, width: 140, fontSize: F.sm }}
            onKeyDown={(e) => e.key === "Enter" && handleAddWatch()} />
          <input value={newName} onChange={(e) => setNewName(e.target.value)}
            placeholder="表示名 (例: トヨタ)" style={{ ...inputStyle, width: 120, fontSize: F.sm }} />
          <button onClick={handleAddWatch} style={{ ...btnStyle(C.accent, true), padding: "8px 14px" }}>+ 追加</button>
        </div>

        {/* 銘柄一覧（シミュレーション + ウォッチリスト） */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
          {visibleDatasets.map((s) => (
            <div key={`sim-${s.idx}`} style={{ display: "flex", alignItems: "center", gap: 2 }}>
              <button onClick={() => { setMode("sim"); setSi(s.idx); setSelectedSymbol(null); setRealDaily(null); }}
                style={{ ...btnStyle(mode === "sim" && si === s.idx ? C.accent : C.dim, mode === "sim" && si === s.idx), padding: "8px 12px", fontSize: F.xs }}>
                🎲 {s.label}
              </button>
              <button onClick={() => hideDefault(s.idx)}
                style={{ background: "none", border: "none", color: C.dim, cursor: "pointer", fontSize: F.xs, padding: "4px" }}>✕</button>
            </div>
          ))}
          {watchlist.map((w) => (
            <div key={w.symbol} style={{ display: "flex", alignItems: "center", gap: 2 }}>
              <button onClick={() => loadRealData(w.symbol)}
                style={{ ...btnStyle(mode === "real" && selectedSymbol === w.symbol ? C.green : C.dim, mode === "real" && selectedSymbol === w.symbol), padding: "8px 12px", fontSize: F.xs }}>
                📈 {w.name}
              </button>
              <button onClick={() => handleRemoveWatch(w.symbol)}
                style={{ background: "none", border: "none", color: C.dim, cursor: "pointer", fontSize: F.xs, padding: "4px" }}>✕</button>
            </div>
          ))}
          {hiddenDefaults.length > 0 && (
            <button onClick={showAllDefaults}
              style={{ ...btnStyle(C.dim, false), padding: "6px 10px", fontSize: F.xs }}>
              ↩️ デフォルト復元
            </button>
          )}
        </div>

        {/* 日次自動仮説ボタン */}
        {watchlist.length > 0 && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <button onClick={runDailyAutoHypo}
              style={{ ...btnStyle(C.cyan, true), padding: "8px 14px", fontSize: F.xs }}>
              🔄 全銘柄の日次仮説を生成・検証
            </button>
            {autoHypoMsg && <span style={{ fontSize: F.xs, color: autoHypoMsg.startsWith("✅") ? C.green : autoHypoMsg.startsWith("⚠") ? C.orange : C.accent }}>{autoHypoMsg}</span>}
          </div>
        )}

        {realLoading && <div style={{ fontSize: F.sm, color: C.accent, marginTop: 4 }}>📡 データ取得中...</div>}
        {realError && <div style={{ fontSize: F.sm, color: C.red, marginTop: 4 }}>❌ {realError}</div>}

        <div style={{ fontSize: F.xs, color: C.dim, marginTop: 4 }}>
          現在表示: <strong style={{ color: C.text }}>{currentLabel}</strong>
          {mode === "sim" && " （シミュレーションデータ）"}
          {mode === "real" && ` （実データ: ${selectedSymbol}）`}
        </div>
      </div>

      {/* タイムフレーム選択 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {Object.entries(TF).map(([key, val]) => (
          <button key={key} onClick={() => { setTf(key); setExpIdx(null); }} style={{
            flex: 1, padding: "14px 8px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
            background: tf === key ? `${val.color}15` : C.card,
            border: `2px solid ${tf === key ? val.color : C.border}`,
            color: tf === key ? val.color : C.dim, transition: "all 0.15s",
          }}>
            <div style={{ fontSize: 20 }}>{val.icon}</div>
            <div style={{ fontSize: F.sm, fontWeight: 700, marginTop: 4 }}>{val.label}</div>
            <div style={{ fontSize: F.label, marginTop: 2, opacity: 0.6 }}>{val.sub}</div>
          </button>
        ))}
      </div>

      {/* レジーム表示 + 原則 */}
      {result.regime && (
        <div style={{
          ...cardStyle, padding: "12px 18px",
          background: result.regime.regime.includes("up") ? `${C.green}06` : result.regime.regime.includes("down") ? `${C.red}06` : `${C.orange}06`,
          borderColor: result.regime.regime.includes("up") ? `${C.green}25` : result.regime.regime.includes("down") ? `${C.red}25` : `${C.orange}25`,
        }}>
          <span style={{ fontSize: F.sm, color: "#4a6070" }}>🔍 <strong>相場局面：</strong>{result.regime.desc}</span>
          {regimePrinciple && (
            <div style={{ fontSize: F.xs, color: C.dim, marginTop: 6, lineHeight: 1.8 }}>
              💡 {regimePrinciple.warning}
            </div>
          )}
        </div>
      )}

      {/* 判定結果 */}
      <div style={{
        background: verdict.bg, border: `2px solid ${verdict.color}35`, borderRadius: 16,
        padding: "28px 20px", marginBottom: 16, textAlign: "center",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at center,${verdict.color}08,transparent 70%)` }} />
        <div style={{ position: "relative" }}>
          <div style={{
            fontSize: F.big + 10, fontWeight: 800, color: verdict.color, letterSpacing: 4,
            fontFamily: "'Orbitron'", animation: "glow 2.5s infinite",
          }}>{verdict.label}</div>
          <div style={{ fontSize: 52, fontWeight: 300, color: verdict.color, margin: "8px 0" }}>
            {result.composite > 0 ? "+" : ""}{result.composite}
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 24, fontSize: F.sm, color: "#5a6a78", flexWrap: "wrap" }}>
            <span>信頼度 <strong style={{ color: confCol }}>{conf}</strong> ({agree}/{total}指標一致)</span>
            <span style={{ color: tfConf.color }}>{tfConf.icon} {tfConf.label}</span>
          </div>
        </div>
      </div>

      {/* 未検証警告（バックテスト未実装の段階） */}
      <div style={{ ...cardStyle, padding: "10px 14px", background: `${C.orange}06`, borderColor: `${C.orange}25` }}>
        <div style={{ fontSize: F.xs, color: C.orange, lineHeight: 1.8 }}>
          ⚠️ <strong>このスコアは未検証です。</strong>過去の実データでの収益はまだ計算されていません。参考値としてご利用ください。
          バックテスト実装後に「✅ 検証済み（収益+○%、N=○件）」が表示されるようになります。
        </div>
      </div>

      {/* docs原則に基づく行動指針 */}
      {principles && (
        <div style={{ ...cardStyle, borderColor: `${verdict.color}20`, background: `${verdict.color}04` }}>
          <div style={{ fontSize: F.sm, fontWeight: 700, color: verdict.color, marginBottom: 8 }}>
            📖 {principles.action}
          </div>
          {principles.warnings.map((w, i) => (
            <div key={i} style={{ fontSize: F.sm, color: "#4a6070", lineHeight: 2, marginBottom: 2 }}>{w}</div>
          ))}
          <div style={{ fontSize: F.xs, color: C.dim, marginTop: 8, fontStyle: "italic", borderTop: `1px solid ${C.border}`, paddingTop: 8 }}>
            原則: {principles.principle}
          </div>
        </div>
      )}

      {/* ゲージ */}
      <div style={{ ...cardStyle, padding: "14px 18px" }}>
        <div style={{ position: "relative", height: 20, background: "#f0f2f5", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: "33%", background: `linear-gradient(90deg,${C.red},transparent)`, opacity: 0.12 }} />
          <div style={{ position: "absolute", right: 0, top: 0, height: "100%", width: "33%", background: `linear-gradient(270deg,${C.green},transparent)`, opacity: 0.12 }} />
          <div style={{ position: "absolute", left: "50%", top: 0, width: 1, height: "100%", background: C.border }} />
          <div style={{
            position: "absolute", top: 2, width: 16, height: 16, borderRadius: "50%",
            background: verdict.color, border: `2px solid ${C.bg}`,
            left: `calc(${((result.composite + 100) / 200) * 100}% - 8px)`,
            transition: "left 0.5s", boxShadow: `0 0 10px ${verdict.color}50`,
          }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: F.label, color: C.dim, marginTop: 5 }}>
          <span>-100 強い売り</span><span>0 中立</span><span>+100 強い買い</span>
        </div>
      </div>

      {/* チャート */}
      <div style={{ ...cardStyle, padding: 14 }}>
        <div style={{ fontSize: F.xs, color: C.dim, marginBottom: 6 }}>
          {tf === "day" ? "📈 本日の5分足" : `📈 日足（直近60日）`}
          {mode === "real" && " — 実データ"}
        </div>
        <MiniChart data={tf === "day" ? intra : daily} count={tf === "day" ? 78 : 60} />
      </div>

      {/* チャートパターン検出結果 */}
      {result.chartPatterns && result.chartPatterns.length > 0 && (
        <div style={{ ...cardStyle, borderColor: `${C.purple}30` }}>
          <div style={{ fontSize: F.sm, fontWeight: 700, color: C.purple, marginBottom: 8 }}>📐 検出されたチャートパターン</div>
          {result.chartPatterns.map((p, i) => (
            <div key={i} style={{
              display: "flex", gap: 10, alignItems: "center", padding: "8px 0",
              borderBottom: i < result.chartPatterns.length - 1 ? `1px solid ${C.border}` : "none",
            }}>
              <span style={{
                fontSize: F.xs, fontWeight: 700, padding: "3px 10px", borderRadius: 6,
                background: p.signal === "buy" ? `${C.green}15` : p.signal === "sell" ? `${C.red}15` : `${C.orange}15`,
                color: p.signal === "buy" ? C.green : p.signal === "sell" ? C.red : C.orange,
              }}>
                {p.signal === "buy" ? "買い" : p.signal === "sell" ? "売り" : "中立"}
              </span>
              <span style={{ fontSize: F.sm, fontWeight: 600, color: C.text }}>{p.nameJa}</span>
              <span style={{ fontSize: F.xs, color: C.dim, flex: 1 }}>{p.description}</span>
              <span style={{ fontSize: F.xs, color: C.dim }}>強度{p.strength}/3</span>
            </div>
          ))}
        </div>
      )}

      {/* 指標スコア */}
      <div style={cardStyle}>
        <div style={{ fontSize: F.sm, color: C.dim, marginBottom: 8 }}>
          {tfConf.icon} {tfConf.label}の指標（タップで解説）
        </div>
        {result.scores.map((item, i) => (
          <ScoreBar key={item.key} item={item} expanded={expIdx === i} onToggle={() => setExpIdx(expIdx === i ? null : i)} />
        ))}
      </div>

      {/* 免責事項 */}
      <div style={{ padding: 10, background: `${C.orange}05`, borderRadius: 8, border: `1px solid ${C.orange}12` }}>
        <p style={{ fontSize: F.xs, color: "#8a7a5a", lineHeight: 1.8 }}>
          ⚠️ 投資助言ではありません。{mode === "sim" ? "シミュレーションデータを使用しています。" : "実データですが、スコアリングの精度は未検証です。"}投資は自己責任で行ってください。
        </p>
      </div>
    </div>
  );
}
