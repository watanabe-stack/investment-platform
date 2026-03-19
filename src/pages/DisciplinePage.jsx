import { useState, useMemo } from "react";
import { C } from "../constants/colors";
import { F } from "../constants/fonts";
import { BIAS_SECTIONS, BIAS_TOTAL } from "../constants/biasChecklist";

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

export default function DisciplinePage({ reframes, saveRF, biasChecks, saveBC, ips, saveIPS }) {
  const [discTab, setDiscTab] = useState("reframe");
  const [rfName, setRfName] = useState(""); const [rfBuyPrice, setRfBuyPrice] = useState("");
  const [rfNowPrice, setRfNowPrice] = useState(""); const [rfAnswer, setRfAnswer] = useState("");
  const [rfReason, setRfReason] = useState("");
  const [kellyWinRate, setKellyWinRate] = useState("55"); const [kellyWinAvg, setKellyWinAvg] = useState("10");
  const [kellyLossAvg, setKellyLossAvg] = useState("5"); const [kellyCapital, setKellyCapital] = useState("1000000");

  const addReframe = async () => {
    if (!rfName.trim()) return;
    const r = { id: Date.now(), name: rfName, buyPrice: parseFloat(rfBuyPrice) || 0, nowPrice: parseFloat(rfNowPrice) || 0, answer: rfAnswer, reason: rfReason, date: new Date().toISOString() };
    await saveRF([r, ...reframes]);
    setRfName(""); setRfBuyPrice(""); setRfNowPrice(""); setRfAnswer(""); setRfReason("");
  };

  const kellyResult = useMemo(() => {
    const p = parseFloat(kellyWinRate) / 100, w = parseFloat(kellyWinAvg) / 100, l = parseFloat(kellyLossAvg) / 100;
    if (isNaN(p) || isNaN(w) || isNaN(l) || l === 0) return null;
    const b = w / l, k = (p * (b + 1) - 1) / b, halfK = k / 2, cap = parseFloat(kellyCapital) || 0;
    return { kelly: Math.max(0, k * 100), halfKelly: Math.max(0, halfK * 100), optimalAmount: Math.max(0, halfK * cap), expectation: (p * w - (1 - p) * l) * 100, b };
  }, [kellyWinRate, kellyWinAvg, kellyLossAvg, kellyCapital]);

  const rfBp = parseFloat(rfBuyPrice), rfNp = parseFloat(rfNowPrice);
  const rfValid = rfBuyPrice && rfNowPrice && !isNaN(rfBp) && !isNaN(rfNp) && rfBp > 0;
  const rfPct = rfValid ? ((rfNp - rfBp) / rfBp * 100).toFixed(1) : null;
  const rfIsLoss = rfValid && rfNp < rfBp;

  const biasChecked = Object.values(biasChecks).filter(Boolean).length;
  const biasPct = Math.round(biasChecked / BIAS_TOTAL * 100);
  const biasLevel = biasPct >= 60 ? "危険" : biasPct >= 30 ? "注意" : "良好";
  const biasCol = biasPct >= 60 ? C.red : biasPct >= 30 ? C.orange : C.green;

  return (
    <div>
      {/* サブタブ */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap" }}>
        {[["reframe", "💪 リフレーミング"], ["bias", "🧠 バイアス診断"], ["kelly", "📊 ケリー基準"], ["ips", "📜 投資方針書"]].map(([k, l]) => (
          <button key={k} onClick={() => setDiscTab(k)}
            style={{ ...btnStyle(discTab === k ? C.cyan : C.dim, discTab === k), padding: "10px 16px" }}>{l}</button>
        ))}
      </div>

      {/* ── リフレーミング ── */}
      {discTab === "reframe" && (
        <div>
          <div style={cardStyle}>
            <div style={{ fontSize: F.h2, fontWeight: 700, color: C.cyan, marginBottom: 8 }}>💪 リフレーミング回診</div>
            <div style={{ fontSize: F.sm, color: C.dim, lineHeight: 2, marginBottom: 16 }}>
              保有銘柄に対して「もし今この株を持っていなかったら、今の価格で新たに買うか？」と問う。
              答えが「No」なら、持ち続ける理由は損失を認めたくない感情（アンカリング）に過ぎない可能性がある。
            </div>
            <div style={{ background: "#0e1a30", borderRadius: 10, padding: 18 }}>
              <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 2, minWidth: 150 }}><label style={{ fontSize: F.xs, color: C.dim, display: "block", marginBottom: 4 }}>銘柄名</label><input value={rfName} onChange={(e) => setRfName(e.target.value)} placeholder="例: トヨタ自動車" style={inputStyle} /></div>
                <div style={{ flex: 1, minWidth: 100 }}><label style={{ fontSize: F.xs, color: C.dim, display: "block", marginBottom: 4 }}>買値</label><input type="number" value={rfBuyPrice} onChange={(e) => setRfBuyPrice(e.target.value)} placeholder="1000" style={inputStyle} /></div>
                <div style={{ flex: 1, minWidth: 100 }}><label style={{ fontSize: F.xs, color: C.dim, display: "block", marginBottom: 4 }}>現在値</label><input type="number" value={rfNowPrice} onChange={(e) => setRfNowPrice(e.target.value)} placeholder="800" style={inputStyle} /></div>
              </div>

              {rfValid && (
                <div style={{ background: rfIsLoss ? `${C.red}08` : `${C.green}08`, borderRadius: 8, padding: 14, marginBottom: 12, border: `1px solid ${rfIsLoss ? C.red : C.green}20` }}>
                  <div style={{ fontSize: F.h3, fontWeight: 700, color: rfIsLoss ? C.red : C.green, marginBottom: 6 }}>
                    {rfIsLoss ? "📉" : "📈"} 含み{rfIsLoss ? "損" : "益"}: {rfPct}%（{rfIsLoss ? "" : "+"}¥{(rfNp - rfBp).toLocaleString()}）
                  </div>
                  {rfIsLoss && <div style={{ fontSize: F.sm, color: C.orange, lineHeight: 1.9 }}>⚠️ 含み損の状態です。プロスペクト理論によると、リスク追求モードに入っている可能性があります。冷静に以下の問いに答えてください。</div>}
                </div>
              )}

              <div style={{ background: `${C.cyan}08`, borderRadius: 8, padding: 16, marginBottom: 14, borderLeft: `3px solid ${C.cyan}` }}>
                <div style={{ fontSize: F.h3, fontWeight: 700, color: C.cyan, marginBottom: 8 }}>核心の問い</div>
                <div style={{ fontSize: F.base, color: C.text, lineHeight: 2 }}>
                  「もし今日、手元に現金があり、この銘柄を持っていなかったとして——<br />
                  <strong style={{ color: "#fff" }}>今の価格（{rfNowPrice || "???"}円）で、新たにこの株を買いますか？</strong>」
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                {[{ v: "Yes", label: "買う", color: C.green }, { v: "No", label: "買わない", color: C.red }, { v: "Maybe", label: "迷う", color: C.orange }].map((o) => (
                  <button key={o.v} onClick={() => setRfAnswer(o.v)}
                    style={{ ...btnStyle(o.color, rfAnswer === o.v), flex: 1, padding: "14px", fontSize: F.base, fontWeight: 700 }}>{o.label}</button>
                ))}
              </div>

              {rfAnswer === "No" && <div style={{ background: `${C.red}08`, borderRadius: 8, padding: 16, marginBottom: 12, borderLeft: `3px solid ${C.red}` }}><div style={{ fontSize: F.h3, fontWeight: 700, color: C.red, marginBottom: 6 }}>⚠️ 売却を検討すべきです</div><div style={{ fontSize: F.sm, color: "#c08080", lineHeight: 2 }}>「買わない」と答えたなら、持ち続ける理由はアンカリングです。買値はもう関係ありません。</div></div>}
              {rfAnswer === "Yes" && <div style={{ background: `${C.green}08`, borderRadius: 8, padding: 16, marginBottom: 12, borderLeft: `3px solid ${C.green}` }}><div style={{ fontSize: F.h3, fontWeight: 700, color: C.green, marginBottom: 6 }}>✅ 保有継続に合理的根拠あり</div><div style={{ fontSize: F.sm, color: "#80c0a0", lineHeight: 2 }}>今の価格でも買う価値があるなら合理的です。「買う理由」を記録しましょう。</div></div>}
              {rfAnswer === "Maybe" && <div style={{ background: `${C.orange}08`, borderRadius: 8, padding: 16, marginBottom: 12, borderLeft: `3px solid ${C.orange}` }}><div style={{ fontSize: F.h3, fontWeight: 700, color: C.orange, marginBottom: 6 }}>💡 判断保留 → 追加リサーチが必要</div><div style={{ fontSize: F.sm, color: "#c0a060", lineHeight: 2 }}>迷うなら、何が足りないか書き出しましょう。ポジションサイズを半分に減らすことも選択肢です。</div></div>}

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: F.xs, color: C.dim, display: "block", marginBottom: 4 }}>判断の理由メモ</label>
                <textarea value={rfReason} onChange={(e) => setRfReason(e.target.value)} placeholder="なぜその判断をしたか、根拠を記録" style={{ ...inputStyle, minHeight: 60 }} />
              </div>
              <button onClick={addReframe} style={btnStyle(C.cyan, true)}>記録を保存</button>
            </div>
          </div>

          {reframes.length > 0 && <div style={cardStyle}>
            <div style={{ fontSize: F.h3, fontWeight: 700, color: C.dim, marginBottom: 10 }}>📋 過去の回診記録</div>
            {reframes.slice(0, 10).map((r) => (
              <div key={r.id} style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: F.base, fontWeight: 600, color: C.text, minWidth: 100 }}>{r.name}</span>
                <span style={{ fontSize: F.sm, color: C.dim }}>買値{r.buyPrice}→現在{r.nowPrice}</span>
                <span style={{ fontSize: F.sm, fontWeight: 700, color: r.answer === "Yes" ? C.green : r.answer === "No" ? C.red : C.orange, padding: "2px 10px", borderRadius: 4, background: r.answer === "Yes" ? `${C.green}15` : r.answer === "No" ? `${C.red}15` : `${C.orange}15` }}>{r.answer === "Yes" ? "買う" : r.answer === "No" ? "買わない" : "迷う"}</span>
                <span style={{ fontSize: F.xs, color: C.dim, marginLeft: "auto" }}>{new Date(r.date).toLocaleDateString("ja-JP")}</span>
              </div>
            ))}
          </div>}
        </div>
      )}

      {/* ── バイアス診断 ── */}
      {discTab === "bias" && (
        <div style={cardStyle}>
          <div style={{ fontSize: F.h2, fontWeight: 700, color: C.purple, marginBottom: 8 }}>🧠 バイアス自己診断</div>
          <div style={{ fontSize: F.sm, color: C.dim, lineHeight: 2, marginBottom: 16 }}>正直に答えてください。チェックが多いほど心理バイアスに支配されている危険性が高い。月1回推奨。</div>
          {BIAS_SECTIONS.map((section) => (
            <div key={section.cat} style={{ ...cardStyle, borderColor: `${section.color}20` }}>
              <div style={{ fontSize: F.h3, fontWeight: 700, color: section.color, marginBottom: 12 }}>{section.cat}</div>
              {section.items.map((item) => (
                <label key={item.id} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 0", borderBottom: `1px solid ${C.border}`, cursor: "pointer" }}>
                  <input type="checkbox" checked={!!biasChecks[item.id]} onChange={(e) => saveBC({ ...biasChecks, [item.id]: e.target.checked })}
                    style={{ marginTop: 4, width: 20, height: 20, flexShrink: 0, accentColor: section.color }} />
                  <span style={{ fontSize: F.base, color: biasChecks[item.id] ? section.color : C.text, lineHeight: 1.8 }}>{item.text}</span>
                </label>
              ))}
            </div>
          ))}
          <div style={{ ...cardStyle, textAlign: "center", borderColor: `${biasCol}30` }}>
            <div style={{ fontSize: F.h3, color: C.dim, marginBottom: 8 }}>診断結果</div>
            <div style={{ fontSize: 42, fontWeight: 700, color: biasCol }}>{biasChecked}/{BIAS_TOTAL}</div>
            <div style={{ fontSize: F.h2, fontWeight: 700, color: biasCol, marginBottom: 8 }}>バイアスリスク: {biasLevel}</div>
            <div style={{ fontSize: F.sm, color: C.dim, lineHeight: 2 }}>
              {biasPct >= 60 ? "⚠️ 複数のバイアスが判断を歪めている可能性が高い。投資方針書の見直しと全保有銘柄のリフレーミングを強く推奨。" :
                biasPct >= 30 ? "💡 一部のバイアスが活性化しています。ルールベース運用を徹底してください。" :
                  "✅ 現時点ではバイアスのコントロールができています。定期的な自己診断を続けてください。"}
            </div>
          </div>
        </div>
      )}

      {/* ── ケリー基準 ── */}
      {discTab === "kelly" && (
        <div style={cardStyle}>
          <div style={{ fontSize: F.h2, fontWeight: 700, color: C.green, marginBottom: 8 }}>📊 ケリー基準計算機</div>
          <div style={{ fontSize: F.sm, color: C.dim, lineHeight: 2, marginBottom: 6 }}>勝率とリスクリワード比から、1回の取引で資産の何%を賭けるべきかを数学的に算出。</div>
          <div style={{ fontSize: F.xs, color: C.orange, lineHeight: 2, marginBottom: 16, padding: "10px 14px", background: `${C.orange}08`, borderRadius: 8 }}>⚠️ 実運用では「ハーフケリー」を推奨。フルケリーは推定誤差によるリスクが大きい。</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div><label style={{ fontSize: F.xs, color: C.dim, display: "block", marginBottom: 4 }}>勝率 %</label><input type="number" value={kellyWinRate} onChange={(e) => setKellyWinRate(e.target.value)} style={inputStyle} /></div>
            <div><label style={{ fontSize: F.xs, color: C.dim, display: "block", marginBottom: 4 }}>平均利益率 %</label><input type="number" value={kellyWinAvg} onChange={(e) => setKellyWinAvg(e.target.value)} style={inputStyle} /></div>
            <div><label style={{ fontSize: F.xs, color: C.dim, display: "block", marginBottom: 4 }}>平均損失率 %</label><input type="number" value={kellyLossAvg} onChange={(e) => setKellyLossAvg(e.target.value)} style={inputStyle} /></div>
            <div><label style={{ fontSize: F.xs, color: C.dim, display: "block", marginBottom: 4 }}>総資産額 ¥</label><input type="number" value={kellyCapital} onChange={(e) => setKellyCapital(e.target.value)} style={inputStyle} /></div>
          </div>
          {kellyResult && (<div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 16 }}>
              {[
                { l: "期待値", v: `${kellyResult.expectation.toFixed(2)}%`, c: kellyResult.expectation > 0 ? C.green : C.red, sub: "1取引あたりの期待リターン" },
                { l: "ケリー基準", v: `${kellyResult.kelly.toFixed(1)}%`, c: C.accent, sub: "理論上の最適投入率" },
                { l: "ハーフケリー（推奨）", v: `${kellyResult.halfKelly.toFixed(1)}%`, c: C.green, sub: "安全マージン込みの推奨値" },
                { l: "推奨投入額", v: `¥${Math.round(kellyResult.optimalAmount).toLocaleString()}`, c: C.cyan, sub: `総資産の ${kellyResult.halfKelly.toFixed(1)}%` },
              ].map((c, i) => (
                <div key={i} style={{ ...cardStyle, textAlign: "center", padding: "16px 12px" }}>
                  <div style={{ fontSize: F.xs, color: C.dim, marginBottom: 6 }}>{c.l}</div>
                  <div style={{ fontSize: F.h2, fontWeight: 700, color: c.c }}>{c.v}</div>
                  <div style={{ fontSize: F.label, color: C.dim, marginTop: 4 }}>{c.sub}</div>
                </div>
              ))}
            </div>
            {kellyResult.expectation <= 0 && (
              <div style={{ ...cardStyle, borderColor: `${C.red}30`, background: `${C.red}08` }}>
                <div style={{ fontSize: F.h3, fontWeight: 700, color: C.red, marginBottom: 6 }}>🚫 期待値がマイナスです</div>
                <div style={{ fontSize: F.sm, color: "#c08080", lineHeight: 2 }}>この勝率とリスクリワード比では資産が減少します。手法を見直してください。</div>
              </div>
            )}
            <div style={cardStyle}>
              <div style={{ fontSize: F.h3, fontWeight: 700, color: C.dim, marginBottom: 10 }}>📐 ケリー基準の公式</div>
              <div style={{ background: "#0e1a30", borderRadius: 8, padding: 16, fontSize: F.base, color: C.text, lineHeight: 2.2, fontFamily: "'JetBrains Mono',monospace" }}>
                K = (p × (B + 1) - 1) / B<br /><br />
                <span style={{ color: C.dim }}>p = 勝率 = {(parseFloat(kellyWinRate) / 100).toFixed(2)}</span><br />
                <span style={{ color: C.dim }}>B = オッズ = {kellyResult.b.toFixed(2)}</span><br />
                <span style={{ color: C.accent }}>K = <strong>{kellyResult.kelly.toFixed(1)}%</strong></span>
              </div>
            </div>
          </div>)}
        </div>
      )}

      {/* ── IPS ── */}
      {discTab === "ips" && (
        <div style={cardStyle}>
          <div style={{ fontSize: F.h2, fontWeight: 700, color: C.orange, marginBottom: 8 }}>📜 投資方針書（IPS）</div>
          <div style={{ fontSize: F.sm, color: C.dim, lineHeight: 2, marginBottom: 16 }}>パニック時の自分を縛る「自分との契約書」。冷静な今のうちに書き、相場が荒れた時はこれだけを見る。</div>

          {[
            { color: C.orange, title: "📌 Clause 1: 損切りルール（絶対遵守）", desc: "私は買値から____% 下落したら機械的に売却する", field: "stopLoss", unit: "%下落で売却", note: "推奨: 短期5〜8% / スイング8〜15% / 長期15〜20%" },
            { color: C.accent, title: "📌 Clause 2: ポジションサイズ上限", desc: "1銘柄に対する投資額は、総資産の____%を超えない", field: "maxPosition", unit: "%" },
          ].map((clause) => (
            <div key={clause.field} style={{ background: `${clause.color}08`, borderRadius: 10, padding: 18, marginBottom: 16, borderLeft: `3px solid ${clause.color}` }}>
              <div style={{ fontSize: F.h3, fontWeight: 700, color: clause.color, marginBottom: 12 }}>{clause.title}</div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input type="number" value={ips[clause.field]} onChange={(e) => { const v = { ...ips, [clause.field]: e.target.value }; saveIPS(v); }} style={{ ...inputStyle, width: 80, textAlign: "center" }} />
                <span style={{ fontSize: F.base, color: C.text }}>{clause.unit}</span>
              </div>
              {clause.note && <div style={{ fontSize: F.xs, color: C.dim, marginTop: 8, lineHeight: 1.8 }}>{clause.note}</div>}
            </div>
          ))}

          <div style={{ background: `${C.green}08`, borderRadius: 10, padding: 18, marginBottom: 16, borderLeft: `3px solid ${C.green}` }}>
            <div style={{ fontSize: F.h3, fontWeight: 700, color: C.green, marginBottom: 12 }}>📌 Clause 3: リバランス規則</div>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: F.base, color: C.text }}>リバランス頻度:</span>
              <select value={ips.rebalancePeriod} onChange={(e) => saveIPS({ ...ips, rebalancePeriod: e.target.value })}
                style={{ ...inputStyle, width: 150, appearance: "auto" }}>
                {["毎月", "四半期", "半年", "年1回"].map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ fontSize: F.xs, color: C.dim, lineHeight: 1.8 }}>資産配分が目標から±5%以上乖離した場合、機械的にリバランスを実行する。</div>
          </div>

          <div style={{ background: `${C.purple}08`, borderRadius: 10, padding: 18, marginBottom: 16, borderLeft: `3px solid ${C.purple}` }}>
            <div style={{ fontSize: F.h3, fontWeight: 700, color: C.purple, marginBottom: 12 }}>📌 Clause 4: エコノミックモート崩壊ルール</div>
            <div style={{ fontSize: F.sm, color: C.dim, marginBottom: 8, lineHeight: 2 }}>企業の競争優位性が構造的に崩壊したと判断した場合、損益に関わらず即座に全ポジション解消。</div>
            <textarea value={ips.moatRule} onChange={(e) => saveIPS({ ...ips, moatRule: e.target.value })}
              placeholder="例: 主力製品の市場シェアが20%以上低下した場合" style={{ ...inputStyle, minHeight: 60 }} />
          </div>

          <div style={{ background: "#0e1a30", borderRadius: 10, padding: 18, marginBottom: 16 }}>
            <div style={{ fontSize: F.h3, fontWeight: 700, color: C.text, marginBottom: 12 }}>📌 Clause 5: 自分ルール（自由記述）</div>
            <div style={{ fontSize: F.sm, color: C.dim, marginBottom: 8, lineHeight: 2 }}>暴落時にやること・やらないこと。冷静な今の自分がパニック時の自分に残す遺言。</div>
            <textarea value={ips.customRules} onChange={(e) => saveIPS({ ...ips, customRules: e.target.value })}
              placeholder={"例:\n・暴落時にTwitter(X)を見ない\n・ナンピンは絶対にしない\n・月1回リフレーミング回診を全銘柄に実施する"} style={{ ...inputStyle, minHeight: 120 }} />
          </div>

          <div style={{ ...cardStyle, background: `${C.cyan}06`, borderColor: `${C.cyan}20` }}>
            <div style={{ fontSize: F.h3, fontWeight: 700, color: C.cyan, marginBottom: 10 }}>🔄 定次リフレーミング・リマインダー</div>
            <div style={{ fontSize: F.sm, color: "#80b8c8", lineHeight: 2 }}>
              毎月、全保有銘柄に「💪 リフレーミング回診」を実行してください。<br />
              1. 「今この株を持っていなかったら、今の価格で買うか？」に答える<br />
              2. 「No」の銘柄は損益に関わらず売却を検討<br />
              3. バイアス自己診断を実施し、前月と比較<br />
              この習慣こそが、あなたの最大のエッジになります。
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
