import { useState } from "react";
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
  background: "#0e1a30", border: `1.5px solid ${C.border}`, color: C.text,
  padding: "10px 14px", borderRadius: 8, fontSize: F.base, fontFamily: "inherit", width: "100%", outline: "none",
};

export default function ResearchPage({ onAddHypo }) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [newsR, setNewsR] = useState("");
  const [ddQ, setDdQ] = useState(""); const [ddR, setDdR] = useState("");
  const [secR, setSecR] = useState(""); const [secReasonR, setSecReasonR] = useState("");
  const [stockQ, setStockQ] = useState(""); const [stockR, setStockR] = useState("");
  const [compQ, setCompQ] = useState(""); const [compR, setCompR] = useState("");
  const [showNewH, setShowNewH] = useState(false);
  const [newH, setNewH] = useState({ thesis: "", sector: "", timeframe: "3ヶ月", basis: "" });
  const [bullR, setBullR] = useState(""); const [bearR, setBearR] = useState("");

  const run = async (fn) => { setLoading(true); await fn(); setLoading(false); };

  const fetchNews = () => run(async () => {
    const r = await askClaude("本日のニュースで今後の株式市場に影響しそうな重要ニュースを5つ。各ニュースの概要(2行)、影響度(高/中/低)、時間軸(短/中/長)を整理して。", "投資リサーチアシスタント。最新ニュースをウェブ検索し客観的に分析。投資推奨はしない。");
    setNewsR(r); setStep(1);
  });
  const fetchDD = () => run(async () => {
    const r = await askClaude(`「${ddQ}」について深掘り。1)背景 2)なぜ今重要か 3)シナリオ(楽観/中立/悲観) 4)注目ポイント`);
    setDdR(r); setStep(2);
  });
  const fetchSec = () => run(async () => {
    const r = await askClaude(`「${ddQ || newsR.slice(0, 200)}」から恩恵セクター3つと逆風セクター3つ。各セクター名、影響度、一行理由。日米両市場の視点で。`);
    setSecR(r); setStep(3);
  });
  const fetchSecReason = () => run(async () => {
    const r = await askClaude(`セクター分析の根拠を深掘り:${secR.slice(0, 400)}\n各セクターの因果関係、過去類似ケース、想定時間軸、リスク要因を分析。`);
    setSecReasonR(r); setStep(4);
  });
  const fetchStocks = () => run(async () => {
    const r = await askClaude(`「${stockQ}」セクターの注目企業5社。企業名/証券コード、事業概要、テーマとの関連性、競争優位性、リスク（ダイレクトに銘柄含む）。`, "投資リサーチアシスタント。ウェブ検索で正確な情報提供。購入推奨は絶対にしない。");
    setStockR(r); setStep(5);
  });
  const fetchComp = () => run(async () => {
    const r = await askClaude(`「${compQ}」を詳細リサーチ。1)会社概要 2)業績トレンド 3)競合比較の強み弱み 4)事業環境要因 5)財務注意点。株価予測不要、事実のみ。`);
    setCompR(r); setStep(6);
  });

  const addHypo = () => {
    if (!newH.thesis.trim()) return;
    onAddHypo?.(newH);
    setNewH({ thesis: "", sector: "", timeframe: "3ヶ月", basis: "" });
    setShowNewH(false);
  };

  const steps = [
    { n: 0, icon: "📰", title: "Step 1: ニュース収集", desc: "市場に影響する最新ニュースをAIが収集・整理", action: fetchNews, actionLabel: "最新ニュースを分析", result: newsR, color: C.accent },
    { n: 1, icon: "🔍", title: "Step 2: 深掘り", desc: "気になるトピックを入力して背景・シナリオを分析", hasInput: true, inputVal: ddQ, setInput: setDdQ, placeholder: "例: 半導体輸出規制の強化", action: fetchDD, actionLabel: "深掘り", result: ddR, color: C.cyan },
    { n: 2, icon: "🏭", title: "Step 3: セクター分析", desc: "恩恵セクターと逆風セクターを特定", action: fetchSec, actionLabel: "セクターを分析", result: secR, color: C.green },
    { n: 3, icon: "🧪", title: "Step 4: 根拠の検証", desc: "各セクターが影響を受ける因果関係と過去事例を分析", action: fetchSecReason, actionLabel: "根拠を検証", result: secReasonR, color: C.orange, needsPrev: !!secR },
    { n: 4, icon: "🏢", title: "Step 5: 銘柄候補", desc: "興味あるセクターの企業をリサーチ（ダイレクトに銘柄含む）", hasInput: true, inputVal: stockQ, setInput: setStockQ, placeholder: "例: 半導体製造装置", action: fetchStocks, actionLabel: "企業を検索", result: stockR, color: C.purple },
    { n: 5, icon: "📋", title: "Step 6: 企業深掘り", desc: "1社を選んで業績・競合・リスクを徹底調査", hasInput: true, inputVal: compQ, setInput: setCompQ, placeholder: "例: 東京エレクトロン", action: fetchComp, actionLabel: "徹底調査", result: compR, color: "#ef5350" },
  ];

  return (
    <div>
      {steps.filter((s) => s.n === 0 || s.n <= step || s.needsPrev).map((s) => (
        <div key={s.n} style={{ ...cardStyle, animation: s.n > 0 ? "fadeIn 0.3s" : "none" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontSize: F.h3, fontWeight: 700, color: s.color }}>{s.icon} {s.title}</div>
            <button onClick={s.action} disabled={loading} style={{ ...btnStyle(s.color, true), opacity: loading ? 0.5 : 1 }}>
              {loading ? <span className="loader">分析中...</span> : s.actionLabel}
            </button>
          </div>
          <div style={{ fontSize: F.sm, color: C.dim, marginBottom: s.hasInput ? 10 : 0 }}>{s.desc}</div>
          {s.hasInput && (
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <input value={s.inputVal} onChange={(e) => s.setInput(e.target.value)} placeholder={s.placeholder}
                style={{ ...inputStyle, flex: 1 }} onKeyDown={(e) => e.key === "Enter" && s.action()} />
            </div>
          )}
          <ResultBox text={s.result} />
        </div>
      ))}

      {/* Step 7: 敵対的分析（Bull vs Bear） */}
      {step >= 6 && (
        <div style={{ ...cardStyle, borderColor: `${C.purple}30`, animation: "fadeIn 0.3s" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontSize: F.h3, fontWeight: 700, color: C.purple }}>⚔️ Step 7: 敵対的分析（Bull vs Bear）</div>
            <button onClick={async () => {
              if (!compQ) return;
              setLoading(true);
              const [bull, bear] = await Promise.all([
                askClaude(`「${compQ}」を今買うべき最も強い理由を3つ挙げてください。直近1週間のニュース・業績・競合状況から根拠を示してください。弱い理由は不要。最も説得力のある理由だけ。`, "投資リサーチアシスタント。買い側の論拠のみを客観的に提示。投資推奨はしない。"),
                askClaude(`「${compQ}」を今買うべきでない最も強い理由を3つ挙げてください。直近1週間のニュース・リスク要因・競合の脅威から根拠を示してください。楽観的な見方は不要。最も深刻な懸念だけ。`, "投資リサーチアシスタント。売り側の論拠のみを客観的に提示。投資推奨はしない。"),
              ]);
              setBullR(bull); setBearR(bear); setStep(7);
              setLoading(false);
            }} disabled={loading || !compQ} style={{ ...btnStyle(C.purple, true), opacity: (loading || !compQ) ? 0.5 : 1 }}>
              {loading ? <span className="loader">分析中...</span> : "⚔️ Bull vs Bear分析"}
            </button>
          </div>
          <div style={{ fontSize: F.sm, color: C.dim, lineHeight: 2, marginBottom: 10 }}>
            確証バイアス対策: 「買うべき理由」と「買うべきでない理由」を独立して分析し、両方を見た上で自分で判断する。
          </div>
          {(bullR || bearR) && (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 250, background: `${C.green}06`, borderRadius: 8, padding: 14, borderLeft: `3px solid ${C.green}` }}>
                <div style={{ fontSize: F.h3, fontWeight: 700, color: C.green, marginBottom: 8 }}>🟢 Bull（買う理由）</div>
                <div style={{ fontSize: F.sm, color: "#80c0a0", lineHeight: 2, whiteSpace: "pre-wrap" }}>{bullR || "—"}</div>
              </div>
              <div style={{ flex: 1, minWidth: 250, background: `${C.red}06`, borderRadius: 8, padding: 14, borderLeft: `3px solid ${C.red}` }}>
                <div style={{ fontSize: F.h3, fontWeight: 700, color: C.red, marginBottom: 8 }}>🔴 Bear（買わない理由）</div>
                <div style={{ fontSize: F.sm, color: "#c08080", lineHeight: 2, whiteSpace: "pre-wrap" }}>{bearR || "—"}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 8: 仮説を記録 */}
      {step >= 5 && (
        <div style={{ ...cardStyle, borderColor: `${C.orange}30` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: F.h3, fontWeight: 700, color: C.orange }}>💡 Step 8: 仮説を記録</div>
            <button onClick={() => { setShowNewH(!showNewH); setStep(Math.max(step, 6)); }} style={btnStyle(C.orange, true)}>仮説を記録</button>
          </div>
          <div style={{ fontSize: F.sm, color: C.dim }}>分析を元に仮説を言語化。後で検証して精度を磨く。</div>
          {showNewH && (
            <div style={{ background: "#0e1a30", borderRadius: 10, padding: 18, marginTop: 12 }}>
              <label style={{ fontSize: F.xs, color: C.dim, display: "block", marginBottom: 4 }}>仮説</label>
              <textarea value={newH.thesis} onChange={(e) => setNewH({ ...newH, thesis: e.target.value })} style={{ ...inputStyle, minHeight: 60, marginBottom: 12 }} />
              <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: F.xs, color: C.dim, display: "block", marginBottom: 4 }}>セクター</label>
                  <input value={newH.sector} onChange={(e) => setNewH({ ...newH, sector: e.target.value })} style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: F.xs, color: C.dim, display: "block", marginBottom: 4 }}>期間</label>
                  <select value={newH.timeframe} onChange={(e) => setNewH({ ...newH, timeframe: e.target.value })} style={{ ...inputStyle, appearance: "auto" }}>
                    {["1ヶ月", "3ヶ月", "6ヶ月", "1年", "2年以上"].map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <label style={{ fontSize: F.xs, color: C.dim, display: "block", marginBottom: 4 }}>根拠</label>
              <textarea value={newH.basis} onChange={(e) => setNewH({ ...newH, basis: e.target.value })} style={{ ...inputStyle, minHeight: 60, marginBottom: 12 }} />
              <button onClick={addHypo} style={btnStyle(C.orange, true)}>保存</button>
            </div>
          )}
        </div>
      )}

      <div style={{ padding: 10, background: `${C.orange}05`, borderRadius: 8, border: `1px solid ${C.orange}12`, marginTop: 8 }}>
        <p style={{ fontSize: F.xs, color: "#7a6a4a", lineHeight: 1.8 }}>⚠️ リサーチ補助ツールです。AIの分析は調査の出発点であり、投資助言ではありません。</p>
      </div>
    </div>
  );
}
