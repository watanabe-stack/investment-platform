import { useState, useEffect, useMemo } from "react";
import { C } from "../constants/colors";
import { F } from "../constants/fonts";

const cardStyle = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, marginBottom: 14 };
const btnStyle = (color, active) => ({
  background: active ? `${color}20` : "transparent", border: `1.5px solid ${active ? color : C.border}`,
  color: active ? color : C.dim, padding: "10px 18px", borderRadius: 8, cursor: "pointer",
  fontSize: F.sm, fontFamily: "inherit", fontWeight: 600, transition: "all 0.15s",
});
const inputStyle = {
  background: "#0e1a30", border: `1.5px solid ${C.border}`, color: C.text,
  padding: "10px 14px", borderRadius: 8, fontSize: F.base, fontFamily: "inherit", width: "100%", outline: "none",
};

const TJ_KEY = "trade-journal-v1";
const loadTrades = () => { try { return JSON.parse(localStorage.getItem(TJ_KEY)) || []; } catch { return []; } };
const saveTrades = (list) => { localStorage.setItem(TJ_KEY, JSON.stringify(list)); };

const TAX_RATE = 20.315;

const calcTrade = (t) => {
  const qty = parseFloat(t.quantity) || 0;
  const entry = parseFloat(t.entryPrice) || 0;
  const exit = parseFloat(t.exitPrice) || 0;
  const commission = parseFloat(t.commission) || 0;
  const dir = t.direction === "売り" ? -1 : 1;
  const pnl = exit > 0 ? (exit - entry) * qty * dir : 0;
  const pnlPercent = entry > 0 && exit > 0 ? ((exit - entry) / entry * 100 * dir) : 0;
  const tax = pnl > 0 ? pnl * (parseFloat(t.tax) || TAX_RATE) / 100 : 0;
  const netPnl = pnl - commission - tax;
  return { ...t, pnl: Math.round(pnl), pnlPercent: Math.round(pnlPercent * 100) / 100, tax: Math.round(tax), netPnl: Math.round(netPnl) };
};

const emptyTrade = {
  stockName: "", stockCode: "", market: "JP", entryDate: "", entryPrice: "", exitDate: "", exitPrice: "",
  quantity: "", direction: "買い", commission: "0", tax: String(TAX_RATE), hypothesisId: "",
  entryReason: "", exitReason: "", review: "", emotionAtEntry: "", emotionAtExit: "", followedIPS: "",
  // 新フィールド（CLAUDE.md粗点1,4対応）
  myChartReading: "",         // 自分の目でチャートを見た分析（AIを見る前に記入）
  infoSource: "",             // 情報の出所: "AI検索" | "自分で発見" | "両方"
  plannedTakeProfit: "",      // 利確ライン
  plannedStopLoss: "",        // 損切りライン（IPSの値を自動参照）
  plannedExitCondition: "",   // 条件付きエグジット（モート崩壊、仮説崩壊等）
  followedExitPlan: "",       // 計画通りに売れたか
};

export default function TradeJournalPage() {
  const [trades, setTrades] = useState(loadTrades);
  const [tab, setTab] = useState("list");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...emptyTrade });
  const [editId, setEditId] = useState(null);

  useEffect(() => { saveTrades(trades); }, [trades]);

  const updateForm = (key, val) => setForm({ ...form, [key]: val });

  const submitTrade = () => {
    if (!form.stockName.trim() || !form.entryPrice) return;
    const base = {
      ...form,
      id: editId || Date.now(),
      createdAt: editId ? form.createdAt : new Date().toISOString(),
    };
    const calculated = calcTrade(base);
    if (editId) {
      setTrades(trades.map((t) => t.id === editId ? calculated : t));
    } else {
      setTrades([calculated, ...trades]);
    }
    setForm({ ...emptyTrade });
    setShowForm(false);
    setEditId(null);
  };

  const editTrade = (t) => {
    setForm({ ...t });
    setEditId(t.id);
    setShowForm(true);
  };

  const deleteTrade = (id) => {
    setTrades(trades.filter((t) => t.id !== id));
  };

  // Stats
  const stats = useMemo(() => {
    const closed = trades.filter((t) => t.exitPrice && parseFloat(t.exitPrice) > 0);
    if (closed.length === 0) return null;
    const wins = closed.filter((t) => t.netPnl > 0);
    const losses = closed.filter((t) => t.netPnl < 0);
    const winRate = closed.length > 0 ? (wins.length / closed.length * 100).toFixed(1) : 0;
    const avgProfit = wins.length > 0 ? (wins.reduce((s, t) => s + t.pnlPercent, 0) / wins.length).toFixed(2) : 0;
    const avgLoss = losses.length > 0 ? (losses.reduce((s, t) => s + Math.abs(t.pnlPercent), 0) / losses.length).toFixed(2) : 0;
    const rrRatio = parseFloat(avgLoss) > 0 ? (parseFloat(avgProfit) / parseFloat(avgLoss)).toFixed(2) : "—";
    const totalPnl = closed.reduce((s, t) => s + t.netPnl, 0);
    const totalCommission = closed.reduce((s, t) => s + (parseFloat(t.commission) || 0), 0);
    const totalTax = closed.reduce((s, t) => s + t.tax, 0);

    // IPS compliance
    const ipsAnswered = closed.filter((t) => t.followedIPS === "はい" || t.followedIPS === "いいえ");
    const ipsYes = ipsAnswered.filter((t) => t.followedIPS === "はい").length;
    const ipsRate = ipsAnswered.length > 0 ? (ipsYes / ipsAnswered.length * 100).toFixed(0) : "—";

    // Emotion analysis
    const emotions = {};
    closed.forEach((t) => {
      if (t.emotionAtEntry) {
        if (!emotions[t.emotionAtEntry]) emotions[t.emotionAtEntry] = { entry: 0, winEntry: 0 };
        emotions[t.emotionAtEntry].entry++;
        if (t.netPnl > 0) emotions[t.emotionAtEntry].winEntry++;
      }
    });

    return {
      total: closed.length, wins: wins.length, losses: losses.length, winRate,
      avgProfit, avgLoss, rrRatio, totalPnl, totalCommission, totalTax,
      ipsRate, emotions, openTrades: trades.filter((t) => !t.exitPrice || parseFloat(t.exitPrice) === 0).length,
    };
  }, [trades]);

  const emotions = ["冷静", "興奮", "不安", "焦り", "自信過剰", "恐怖", "無感情"];

  return (
    <div>
      {/* タブ */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {[["list", "📝 取引記録"], ["stats", "📊 成績"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            style={{ ...btnStyle(tab === k ? C.green : C.dim, tab === k), padding: "8px 20px" }}>{l}</button>
        ))}
        <button onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ ...emptyTrade }); }}
          style={{ ...btnStyle(C.green, true), marginLeft: "auto" }}>+ 新しい取引</button>
      </div>

      {/* 取引入力フォーム */}
      {showForm && (
        <div style={{ ...cardStyle, borderColor: `${C.green}30` }}>
          <div style={{ fontSize: F.h3, fontWeight: 700, color: C.green, marginBottom: 14 }}>
            {editId ? "取引を編集" : "新しい取引を記録"}
          </div>

          {/* Row 1: Basic Info */}
          <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 2, minWidth: 140 }}>
              <label style={{ fontSize: F.xs, color: C.dim, display: "block", marginBottom: 4 }}>銘柄名 *</label>
              <input value={form.stockName} onChange={(e) => updateForm("stockName", e.target.value)} placeholder="例: トヨタ自動車" style={inputStyle} />
            </div>
            <div style={{ flex: 1, minWidth: 80 }}>
              <label style={{ fontSize: F.xs, color: C.dim, display: "block", marginBottom: 4 }}>コード</label>
              <input value={form.stockCode} onChange={(e) => updateForm("stockCode", e.target.value)} placeholder="7203" style={inputStyle} />
            </div>
            <div style={{ flex: 1, minWidth: 80 }}>
              <label style={{ fontSize: F.xs, color: C.dim, display: "block", marginBottom: 4 }}>市場</label>
              <select value={form.market} onChange={(e) => updateForm("market", e.target.value)} style={{ ...inputStyle, appearance: "auto" }}>
                <option value="JP">日本</option>
                <option value="US">米国</option>
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 80 }}>
              <label style={{ fontSize: F.xs, color: C.dim, display: "block", marginBottom: 4 }}>売買</label>
              <select value={form.direction} onChange={(e) => updateForm("direction", e.target.value)} style={{ ...inputStyle, appearance: "auto" }}>
                <option value="買い">買い</option>
                <option value="売り">売り（空売り）</option>
              </select>
            </div>
          </div>

          {/* Row 2: Entry */}
          <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 120 }}>
              <label style={{ fontSize: F.xs, color: C.dim, display: "block", marginBottom: 4 }}>エントリー日 *</label>
              <input type="date" value={form.entryDate} onChange={(e) => updateForm("entryDate", e.target.value)} style={inputStyle} />
            </div>
            <div style={{ flex: 1, minWidth: 100 }}>
              <label style={{ fontSize: F.xs, color: C.dim, display: "block", marginBottom: 4 }}>エントリー価格 *</label>
              <input type="number" value={form.entryPrice} onChange={(e) => updateForm("entryPrice", e.target.value)} placeholder="1000" style={inputStyle} />
            </div>
            <div style={{ flex: 1, minWidth: 100 }}>
              <label style={{ fontSize: F.xs, color: C.dim, display: "block", marginBottom: 4 }}>数量</label>
              <input type="number" value={form.quantity} onChange={(e) => updateForm("quantity", e.target.value)} placeholder="100" style={inputStyle} />
            </div>
          </div>

          {/* Row 3: Exit */}
          <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 120 }}>
              <label style={{ fontSize: F.xs, color: C.dim, display: "block", marginBottom: 4 }}>決済日</label>
              <input type="date" value={form.exitDate} onChange={(e) => updateForm("exitDate", e.target.value)} style={inputStyle} />
            </div>
            <div style={{ flex: 1, minWidth: 100 }}>
              <label style={{ fontSize: F.xs, color: C.dim, display: "block", marginBottom: 4 }}>決済価格</label>
              <input type="number" value={form.exitPrice} onChange={(e) => updateForm("exitPrice", e.target.value)} placeholder="1100" style={inputStyle} />
            </div>
            <div style={{ flex: 1, minWidth: 100 }}>
              <label style={{ fontSize: F.xs, color: C.dim, display: "block", marginBottom: 4 }}>手数料</label>
              <input type="number" value={form.commission} onChange={(e) => updateForm("commission", e.target.value)} placeholder="0" style={inputStyle} />
            </div>
            <div style={{ flex: 1, minWidth: 100 }}>
              <label style={{ fontSize: F.xs, color: C.dim, display: "block", marginBottom: 4 }}>税率 %</label>
              <input type="number" value={form.tax} onChange={(e) => updateForm("tax", e.target.value)} style={inputStyle} />
            </div>
          </div>

          {/* Row 4: Reasons & Emotions */}
          {/* 自分のチャート分析（AIの判定を見る前に記入） */}
          <div style={{ background: `${C.cyan}06`, borderRadius: 8, padding: 14, marginBottom: 12, borderLeft: `3px solid ${C.cyan}` }}>
            <label style={{ fontSize: F.xs, color: C.cyan, fontWeight: 700, display: "block", marginBottom: 4 }}>👁️ 自分の目で見たチャート分析（AI判定を見る前に書く）</label>
            <textarea value={form.myChartReading} onChange={(e) => updateForm("myChartReading", e.target.value)}
              placeholder="自分はこのチャートをどう読んだか？ トレンドは？ 支持線は？ 出来高は？" style={{ ...inputStyle, minHeight: 50 }} />
            <div style={{ fontSize: F.label, color: C.dim, marginTop: 4 }}>💡 AIの判定を先に見るとアンカリングが起きる。自分の分析を先に書いてからSignal Engineを確認しよう</div>
          </div>

          {/* エグジット計画（エントリー時に事前記録） */}
          <div style={{ background: `${C.orange}06`, borderRadius: 8, padding: 14, marginBottom: 12, borderLeft: `3px solid ${C.orange}` }}>
            <div style={{ fontSize: F.xs, color: C.orange, fontWeight: 700, marginBottom: 8 }}>📋 エグジット計画（エントリー前に決める）</div>
            <div style={{ display: "flex", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 120 }}>
                <label style={{ fontSize: F.label, color: C.dim, display: "block", marginBottom: 4 }}>利確ライン</label>
                <input value={form.plannedTakeProfit} onChange={(e) => updateForm("plannedTakeProfit", e.target.value)}
                  placeholder="例: +15% or 1500円" style={{ ...inputStyle, fontSize: F.sm }} />
              </div>
              <div style={{ flex: 1, minWidth: 120 }}>
                <label style={{ fontSize: F.label, color: C.dim, display: "block", marginBottom: 4 }}>損切りライン</label>
                <input value={form.plannedStopLoss} onChange={(e) => updateForm("plannedStopLoss", e.target.value)}
                  placeholder="例: -8% or 900円" style={{ ...inputStyle, fontSize: F.sm }} />
              </div>
            </div>
            <label style={{ fontSize: F.label, color: C.dim, display: "block", marginBottom: 4 }}>条件付きエグジット</label>
            <input value={form.plannedExitCondition} onChange={(e) => updateForm("plannedExitCondition", e.target.value)}
              placeholder="例: モート崩壊したら即売却 / 仮説が崩れたら撤退" style={{ ...inputStyle, fontSize: F.sm }} />
          </div>

          {/* 情報の出所 */}
          <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 120 }}>
              <label style={{ fontSize: F.xs, color: C.dim, display: "block", marginBottom: 4 }}>情報の出所</label>
              <select value={form.infoSource} onChange={(e) => updateForm("infoSource", e.target.value)} style={{ ...inputStyle, appearance: "auto" }}>
                <option value="">選択...</option>
                <option value="AI検索">AI検索（Screener/Research Lab）</option>
                <option value="自分で発見">自分で発見（ニュース・IR等）</option>
                <option value="両方">両方</option>
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 120 }}>
              <label style={{ fontSize: F.xs, color: C.dim, display: "block", marginBottom: 4 }}>計画通りに売れたか</label>
              <select value={form.followedExitPlan} onChange={(e) => updateForm("followedExitPlan", e.target.value)} style={{ ...inputStyle, appearance: "auto" }}>
                <option value="">選択...</option>
                <option value="はい">はい（計画通り）</option>
                <option value="いいえ">いいえ（逸脱した）</option>
                <option value="未決済">未決済</option>
              </select>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={{ fontSize: F.xs, color: C.dim, display: "block", marginBottom: 4 }}>エントリー理由</label>
              <textarea value={form.entryReason} onChange={(e) => updateForm("entryReason", e.target.value)}
                placeholder="なぜこの銘柄をこのタイミングで？" style={{ ...inputStyle, minHeight: 50 }} />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={{ fontSize: F.xs, color: C.dim, display: "block", marginBottom: 4 }}>決済理由</label>
              <textarea value={form.exitReason} onChange={(e) => updateForm("exitReason", e.target.value)}
                placeholder="なぜ決済した？" style={{ ...inputStyle, minHeight: 50 }} />
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 120 }}>
              <label style={{ fontSize: F.xs, color: C.dim, display: "block", marginBottom: 4 }}>エントリー時の感情</label>
              <select value={form.emotionAtEntry} onChange={(e) => updateForm("emotionAtEntry", e.target.value)} style={{ ...inputStyle, appearance: "auto" }}>
                <option value="">選択...</option>
                {emotions.map((em) => <option key={em} value={em}>{em}</option>)}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 120 }}>
              <label style={{ fontSize: F.xs, color: C.dim, display: "block", marginBottom: 4 }}>決済時の感情</label>
              <select value={form.emotionAtExit} onChange={(e) => updateForm("emotionAtExit", e.target.value)} style={{ ...inputStyle, appearance: "auto" }}>
                <option value="">選択...</option>
                {emotions.map((em) => <option key={em} value={em}>{em}</option>)}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 120 }}>
              <label style={{ fontSize: F.xs, color: C.dim, display: "block", marginBottom: 4 }}>IPS遵守</label>
              <select value={form.followedIPS} onChange={(e) => updateForm("followedIPS", e.target.value)} style={{ ...inputStyle, appearance: "auto" }}>
                <option value="">選択...</option>
                <option value="はい">はい</option>
                <option value="いいえ">いいえ</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: F.xs, color: C.dim, display: "block", marginBottom: 4 }}>振り返りメモ</label>
            <textarea value={form.review} onChange={(e) => updateForm("review", e.target.value)}
              placeholder="次に活かすべき教訓は？" style={{ ...inputStyle, minHeight: 50 }} />
          </div>

          {/* Preview */}
          {form.entryPrice && form.exitPrice && form.quantity && (() => {
            const preview = calcTrade(form);
            return (
              <div style={{
                background: preview.netPnl >= 0 ? `${C.green}08` : `${C.red}08`, borderRadius: 8, padding: 14, marginBottom: 12,
                border: `1px solid ${preview.netPnl >= 0 ? C.green : C.red}20`,
              }}>
                <div style={{ fontSize: F.sm, color: C.dim, marginBottom: 4 }}>自動計算プレビュー</div>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: F.sm }}>
                  <span style={{ color: preview.pnl >= 0 ? C.green : C.red }}>損益: ¥{preview.pnl.toLocaleString()} ({preview.pnlPercent}%)</span>
                  <span style={{ color: C.dim }}>税: ¥{preview.tax.toLocaleString()}</span>
                  <span style={{ color: preview.netPnl >= 0 ? C.green : C.red, fontWeight: 700 }}>純損益: ¥{preview.netPnl.toLocaleString()}</span>
                </div>
              </div>
            );
          })()}

          <button onClick={submitTrade} style={btnStyle(C.green, true)}>{editId ? "更新" : "記録"}</button>
        </div>
      )}

      {/* 取引一覧 */}
      {tab === "list" && (
        <div>
          {trades.length === 0 && (
            <div style={{ ...cardStyle, textAlign: "center", padding: 40, color: C.dim, fontSize: F.base }}>
              まだ取引記録がありません。「+ 新しい取引」ボタンから記録を始めましょう。
            </div>
          )}
          {trades.map((t) => {
            const isClosed = t.exitPrice && parseFloat(t.exitPrice) > 0;
            return (
              <div key={t.id} style={{
                ...cardStyle,
                borderColor: isClosed ? (t.netPnl >= 0 ? `${C.green}30` : `${C.red}30`) : `${C.accent}30`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <span style={{ fontSize: F.base, fontWeight: 700, color: C.text }}>{t.stockName}</span>
                    <span style={{ fontSize: F.xs, color: C.dim, marginLeft: 8 }}>{t.stockCode}</span>
                    <span style={{
                      fontSize: F.label, marginLeft: 8, padding: "2px 8px", borderRadius: 4,
                      background: t.direction === "売り" ? `${C.red}15` : `${C.green}15`,
                      color: t.direction === "売り" ? C.red : C.green,
                    }}>{t.direction}</span>
                    <span style={{
                      fontSize: F.label, marginLeft: 4, padding: "2px 8px", borderRadius: 4,
                      background: t.market === "US" ? `${C.cyan}15` : `${C.orange}15`,
                      color: t.market === "US" ? C.cyan : C.orange,
                    }}>{t.market === "US" ? "米国" : "日本"}</span>
                  </div>
                  {isClosed ? (
                    <span style={{
                      fontSize: F.base, fontWeight: 700,
                      color: t.netPnl >= 0 ? C.green : C.red,
                    }}>
                      {t.netPnl >= 0 ? "+" : ""}¥{t.netPnl.toLocaleString()} ({t.pnlPercent}%)
                    </span>
                  ) : (
                    <span style={{ fontSize: F.sm, color: C.accent, fontWeight: 600 }}>保有中</span>
                  )}
                </div>

                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: F.xs, color: C.dim, marginBottom: 8 }}>
                  <span>Entry: {t.entryDate} @ ¥{parseFloat(t.entryPrice).toLocaleString()}</span>
                  {isClosed && <span>Exit: {t.exitDate} @ ¥{parseFloat(t.exitPrice).toLocaleString()}</span>}
                  <span>数量: {t.quantity}</span>
                  {isClosed && <span>手数料: ¥{parseFloat(t.commission).toLocaleString()} / 税: ¥{t.tax.toLocaleString()}</span>}
                </div>

                {t.entryReason && <div style={{ fontSize: F.sm, color: "#7090a8", lineHeight: 1.8, marginBottom: 4 }}>📥 {t.entryReason}</div>}
                {t.exitReason && <div style={{ fontSize: F.sm, color: "#7090a8", lineHeight: 1.8, marginBottom: 4 }}>📤 {t.exitReason}</div>}
                {t.review && <div style={{ fontSize: F.sm, color: C.orange, lineHeight: 1.8, marginBottom: 4 }}>📝 {t.review}</div>}

                <div style={{ display: "flex", gap: 8, fontSize: F.xs, flexWrap: "wrap", marginBottom: 6 }}>
                  {t.emotionAtEntry && <span style={{ padding: "2px 8px", borderRadius: 4, background: `${C.purple}15`, color: C.purple }}>Entry: {t.emotionAtEntry}</span>}
                  {t.emotionAtExit && <span style={{ padding: "2px 8px", borderRadius: 4, background: `${C.purple}15`, color: C.purple }}>Exit: {t.emotionAtExit}</span>}
                  {t.followedIPS && <span style={{ padding: "2px 8px", borderRadius: 4, background: t.followedIPS === "はい" ? `${C.green}15` : `${C.red}15`, color: t.followedIPS === "はい" ? C.green : C.red }}>IPS: {t.followedIPS}</span>}
                </div>

                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  <button onClick={() => editTrade(t)} style={{ ...btnStyle(C.accent, false), padding: "6px 14px", fontSize: F.xs }}>編集</button>
                  <button onClick={() => deleteTrade(t.id)} style={{ ...btnStyle("#78909c", false), padding: "6px 14px", fontSize: F.xs }}>削除</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 成績タブ */}
      {tab === "stats" && (
        <div>
          {!stats ? (
            <div style={{ ...cardStyle, textAlign: "center", padding: 40, color: C.dim, fontSize: F.base }}>
              決済済みの取引がまだありません。取引を記録して決済価格を入力すると成績が表示されます。
            </div>
          ) : (
            <>
              {/* サマリー */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginBottom: 16 }}>
                {[
                  { l: "決済済み", v: stats.total, c: C.accent },
                  { l: "保有中", v: stats.openTrades, c: C.cyan },
                  { l: "勝ち", v: stats.wins, c: C.green },
                  { l: "負け", v: stats.losses, c: C.red },
                  { l: "勝率", v: `${stats.winRate}%`, c: parseFloat(stats.winRate) >= 50 ? C.green : C.red },
                  { l: "総純損益", v: `¥${stats.totalPnl.toLocaleString()}`, c: stats.totalPnl >= 0 ? C.green : C.red },
                ].map((c, i) => (
                  <div key={i} style={{ ...cardStyle, textAlign: "center", padding: "16px 10px" }}>
                    <div style={{ fontSize: F.xs, color: C.dim, marginBottom: 6 }}>{c.l}</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: c.c }}>{c.v}</div>
                  </div>
                ))}
              </div>

              {/* 詳細 */}
              <div style={cardStyle}>
                <div style={{ fontSize: F.h3, fontWeight: 700, color: C.accent, marginBottom: 12 }}>📈 パフォーマンス詳細</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[
                    { l: "平均利益率", v: `+${stats.avgProfit}%`, c: C.green },
                    { l: "平均損失率", v: `-${stats.avgLoss}%`, c: C.red },
                    { l: "リスクリワード比", v: stats.rrRatio, c: parseFloat(stats.rrRatio) >= 1 ? C.green : C.red },
                    { l: "IPS遵守率", v: stats.ipsRate === "—" ? "—" : `${stats.ipsRate}%`, c: stats.ipsRate !== "—" && parseFloat(stats.ipsRate) >= 80 ? C.green : C.orange },
                    { l: "総手数料", v: `¥${stats.totalCommission.toLocaleString()}`, c: C.dim },
                    { l: "総税金", v: `¥${stats.totalTax.toLocaleString()}`, c: C.dim },
                  ].map((c, i) => (
                    <div key={i} style={{ padding: "12px 14px", background: "#0e1a30", borderRadius: 8 }}>
                      <div style={{ fontSize: F.xs, color: C.dim, marginBottom: 4 }}>{c.l}</div>
                      <div style={{ fontSize: F.h2, fontWeight: 700, color: c.c }}>{c.v}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 感情分析 */}
              {Object.keys(stats.emotions).length > 0 && (
                <div style={cardStyle}>
                  <div style={{ fontSize: F.h3, fontWeight: 700, color: C.purple, marginBottom: 12 }}>🧠 感情と勝率の関係</div>
                  <div style={{ fontSize: F.xs, color: C.dim, marginBottom: 10, lineHeight: 1.8 }}>
                    エントリー時の感情別に勝率を分析。どの感情のときにパフォーマンスが良い/悪いかが見えてきます。
                  </div>
                  {Object.entries(stats.emotions).sort((a, b) => b[1].entry - a[1].entry).map(([emotion, data]) => {
                    const rate = data.entry > 0 ? Math.round(data.winEntry / data.entry * 100) : 0;
                    const rateCol = rate >= 60 ? C.green : rate >= 40 ? C.orange : C.red;
                    return (
                      <div key={emotion} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                        <span style={{ fontSize: F.sm, fontWeight: 600, color: C.purple, minWidth: 80 }}>{emotion}</span>
                        <span style={{ fontSize: F.xs, color: C.dim }}>{data.entry}回</span>
                        <div style={{ flex: 1 }} />
                        <span style={{ fontSize: F.h3, fontWeight: 700, color: rateCol }}>{rate}%</span>
                        <div style={{ width: 60, height: 6, background: "#0e1a30", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ width: `${rate}%`, height: "100%", background: rateCol, borderRadius: 3 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* アドバイス */}
              <div style={{ ...cardStyle, background: `${C.cyan}06`, borderColor: `${C.cyan}20` }}>
                <div style={{ fontSize: F.h3, fontWeight: 700, color: C.cyan, marginBottom: 8 }}>💡 取引記録から学ぶ</div>
                <div style={{ fontSize: F.sm, color: "#80b8c8", lineHeight: 2 }}>
                  取引記録の目的は「自分のパターン」を見つけることです。<br />
                  ・勝率50%以上 + リスクリワード比1.0以上 → 手法にエッジあり<br />
                  ・IPS遵守率が低い → 感情的な取引が多い可能性。規律ツールを活用<br />
                  ・特定の感情で勝率が低い → その感情のときはトレードを控える<br />
                  <br />
                  <strong>記録の蓄積が、あなた固有のトレード戦略を形作ります。</strong>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <div style={{ padding: 10, background: `${C.orange}05`, borderRadius: 8, border: `1px solid ${C.orange}12`, marginTop: 8 }}>
        <p style={{ fontSize: F.xs, color: "#7a6a4a", lineHeight: 1.8 }}>⚠️ 投資は自己責任です。このツールは取引記録・分析の補助であり、投資助言ではありません。</p>
      </div>
    </div>
  );
}
