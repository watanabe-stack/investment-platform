import { useState, useEffect } from "react";
import { C } from "../constants/colors";
import { F } from "../constants/fonts";
import { askClaude } from "../api/claude";
import { loadAutoHypos, calcAutoHypoStats } from "../data/autoHypothesis";

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

export default function HypoPage({ hypos, saveH }) {
  const [hypoTab, setHypoTab] = useState("list");
  const [showNewH, setShowNewH] = useState(false);
  const [newH, setNewH] = useState({ thesis: "", sector: "", timeframe: "3ヶ月", basis: "" });
  const [loading, setLoading] = useState(false);

  // 自動仮説データ
  const [autoHypos, setAutoHypos] = useState([]);
  useEffect(() => { setAutoHypos(loadAutoHypos()); }, [hypoTab]);

  const stats = {
    total: hypos.length,
    active: hypos.filter((h) => h.status === "検証中").length,
    hit: hypos.filter((h) => h.status === "的中").length,
    miss: hypos.filter((h) => h.status === "外れ").length,
    partial: hypos.filter((h) => h.status === "一部的中").length,
  };
  const hitRate = stats.hit + stats.miss + stats.partial > 0
    ? ((stats.hit + stats.partial * 0.5) / (stats.hit + stats.miss + stats.partial) * 100).toFixed(0)
    : "—";

  const addHypo = async () => {
    if (!newH.thesis.trim()) return;
    const h = { ...newH, id: Date.now(), createdAt: new Date().toISOString(), status: "検証中", review: "" };
    await saveH([h, ...hypos]);
    setNewH({ thesis: "", sector: "", timeframe: "3ヶ月", basis: "" });
    setShowNewH(false);
  };

  const verifyHypo = async (h) => {
    setLoading(true);
    const r = await askClaude(
      `仮説の検証:「${h.thesis}」(${h.sector},${new Date(h.createdAt).toLocaleDateString("ja-JP")}設定,${h.timeframe})\n根拠:${h.basis}\n→最新状況、支持材料、否定材料、当初との乖離を分析`
    );
    await saveH(hypos.map((x) => x.id === h.id ? { ...x, lastVerification: r, lastVerifiedAt: new Date().toISOString() } : x));
    setLoading(false);
  };

  return (
    <div>
      {/* サブタブ */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {[["list", "仮説一覧"], ["daily", "📊 日次学習"], ["stats", "成績"]].map(([k, l]) => (
          <button key={k} onClick={() => setHypoTab(k)}
            style={{ ...btnStyle(hypoTab === k ? C.orange : C.dim, hypoTab === k), padding: "8px 20px" }}>{l}</button>
        ))}
        <button onClick={() => setShowNewH(!showNewH)}
          style={{ ...btnStyle(C.orange, true), marginLeft: "auto" }}>+ 新しい仮説</button>
      </div>

      {/* 新規仮説フォーム */}
      {showNewH && (
        <div style={{ ...cardStyle, borderColor: `${C.orange}30` }}>
          <label style={{ fontSize: F.xs, color: C.dim, display: "block", marginBottom: 4 }}>仮説</label>
          <textarea value={newH.thesis} onChange={(e) => setNewH({ ...newH, thesis: e.target.value })}
            style={{ ...inputStyle, minHeight: 60, marginBottom: 12 }} />
          <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: F.xs, color: C.dim, display: "block", marginBottom: 4 }}>セクター</label>
              <input value={newH.sector} onChange={(e) => setNewH({ ...newH, sector: e.target.value })} style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: F.xs, color: C.dim, display: "block", marginBottom: 4 }}>期間</label>
              <select value={newH.timeframe} onChange={(e) => setNewH({ ...newH, timeframe: e.target.value })}
                style={{ ...inputStyle, appearance: "auto" }}>
                {["1ヶ月", "3ヶ月", "6ヶ月", "1年", "2年以上"].map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <label style={{ fontSize: F.xs, color: C.dim, display: "block", marginBottom: 4 }}>根拠</label>
          <textarea value={newH.basis} onChange={(e) => setNewH({ ...newH, basis: e.target.value })}
            style={{ ...inputStyle, minHeight: 60, marginBottom: 12 }} />
          <button onClick={addHypo} style={btnStyle(C.orange, true)}>保存</button>
        </div>
      )}

      {/* 仮説一覧 */}
      {hypoTab === "list" && (
        <div>
          {hypos.length === 0 && (
            <div style={{ ...cardStyle, textAlign: "center", padding: 40, color: C.dim, fontSize: F.base }}>
              まだ仮説がありません。Research Labで分析して仮説を立てましょう。
            </div>
          )}
          {hypos.map((h) => (
            <div key={h.id} style={{
              ...cardStyle,
              borderColor: h.status === "的中" ? `${C.green}30` : h.status === "外れ" ? `${C.red}30` : h.status === "一部的中" ? `${C.orange}30` : C.border,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: F.base, fontWeight: 600, color: C.text, lineHeight: 1.7, marginBottom: 6 }}>{h.thesis}</div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: F.xs }}>
                    {h.sector && <span style={{ background: `${C.purple}15`, color: C.purple, padding: "3px 10px", borderRadius: 6 }}>{h.sector}</span>}
                    <span style={{ color: C.dim }}>{h.timeframe}</span>
                    <span style={{ color: C.dim }}>{new Date(h.createdAt).toLocaleDateString("ja-JP")}</span>
                  </div>
                </div>
                <span style={{
                  fontSize: F.sm, fontWeight: 700, padding: "4px 14px", borderRadius: 6, flexShrink: 0,
                  background: h.status === "的中" ? `${C.green}15` : h.status === "外れ" ? `${C.red}15` : h.status === "一部的中" ? `${C.orange}15` : `${C.accent}15`,
                  color: h.status === "的中" ? C.green : h.status === "外れ" ? C.red : h.status === "一部的中" ? C.orange : C.accent,
                }}>{h.status}</span>
              </div>

              {h.basis && (
                <div style={{ fontSize: F.sm, color: "#5a6a78", lineHeight: 1.8, padding: "10px 14px", background: "#f0f2f5", borderRadius: 8, marginBottom: 10 }}>
                  <strong style={{ color: C.dim }}>根拠：</strong>{h.basis}
                </div>
              )}

              {h.lastVerification && (
                <div style={{ fontSize: F.sm, color: "#4a6a88", lineHeight: 1.8, padding: "12px 14px", background: `${C.accent}06`, borderRadius: 8, borderLeft: `3px solid ${C.accent}`, marginBottom: 10 }}>
                  <div style={{ fontSize: F.xs, color: C.dim, marginBottom: 6 }}>🔍 最終検証: {h.lastVerifiedAt ? new Date(h.lastVerifiedAt).toLocaleDateString("ja-JP") : ""}</div>
                  <div style={{ whiteSpace: "pre-wrap" }}>{h.lastVerification}</div>
                </div>
              )}

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                <button onClick={() => verifyHypo(h)} disabled={loading}
                  style={{ ...btnStyle(C.accent, false), padding: "8px 14px" }}>{loading ? "検証中..." : "🔍 AI検証"}</button>
                {["的中", "一部的中", "外れ"].map((st) => (
                  <button key={st}
                    onClick={() => saveH(hypos.map((x) => x.id === h.id ? { ...x, status: st, reviewedAt: new Date().toISOString() } : x))}
                    style={{ ...btnStyle(st === "的中" ? C.green : st === "外れ" ? C.red : C.orange, h.status === st), padding: "8px 14px" }}>{st}</button>
                ))}
                <button onClick={() => saveH(hypos.filter((x) => x.id !== h.id))}
                  style={{ ...btnStyle("#78909c", false), padding: "8px 14px" }}>削除</button>
              </div>

              <input value={h.review || ""} onChange={(e) => saveH(hypos.map((x) => x.id === h.id ? { ...x, review: e.target.value } : x))}
                placeholder="振り返りメモ（何が想定と違った？）" style={{ ...inputStyle, fontSize: F.sm }} />
            </div>
          ))}
        </div>
      )}

      {/* 日次学習タブ */}
      {hypoTab === "daily" && (() => {
        const aStats = calcAutoHypoStats(autoHypos);
        return (
          <div>
            <div style={{ fontSize: F.sm, color: C.dim, lineHeight: 2, marginBottom: 14 }}>
              Signal Engineページの「🔄 全銘柄の日次仮説を生成・検証」ボタンを毎日押すと、
              全ウォッチリスト銘柄に対して自動的に「明日上がるか下がるか」の仮説を立て、翌日に検証します。
              蓄積されたデータからスコアリングの精度が見えてきます。
            </div>

            {/* サマリーカード */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 10, marginBottom: 16 }}>
              {[
                { l: "検証済み", v: aStats.total, c: C.accent },
                { l: "的中", v: aStats.hit, c: C.green },
                { l: "外れ", v: aStats.miss, c: C.red },
                { l: "的中率", v: aStats.hitRate === "—" ? "—" : `${aStats.hitRate}%`, c: aStats.hitRate !== "—" && parseFloat(aStats.hitRate) >= 50 ? C.green : C.red },
                { l: "未検証", v: aStats.pending, c: C.dim },
              ].map((c, i) => (
                <div key={i} style={{ ...cardStyle, textAlign: "center", padding: "14px 8px" }}>
                  <div style={{ fontSize: F.xs, color: C.dim, marginBottom: 4 }}>{c.l}</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: c.c }}>{c.v}</div>
                </div>
              ))}
            </div>

            {/* 直近7日の推移 */}
            {aStats.last7.some((d) => d.total > 0) && (
              <div style={cardStyle}>
                <div style={{ fontSize: F.h3, fontWeight: 700, color: C.cyan, marginBottom: 10 }}>📈 直近7日間の的中率推移</div>
                <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 100 }}>
                  {aStats.last7.map((d, i) => (
                    <div key={i} style={{ flex: 1, textAlign: "center" }}>
                      {d.total > 0 ? (
                        <div style={{ position: "relative", height: 80 }}>
                          <div style={{
                            position: "absolute", bottom: 0, left: "20%", width: "60%",
                            height: `${Math.max(4, (d.rate || 0) * 0.8)}%`,
                            background: d.rate >= 50 ? C.green : C.red,
                            borderRadius: "4px 4px 0 0", opacity: 0.7,
                          }} />
                          <div style={{ position: "absolute", bottom: `${Math.max(8, (d.rate || 0) * 0.8 + 4)}%`, width: "100%", fontSize: 9, color: d.rate >= 50 ? C.green : C.red, fontWeight: 700 }}>
                            {d.rate}%
                          </div>
                        </div>
                      ) : (
                        <div style={{ height: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: 9, color: C.dim }}>—</span>
                        </div>
                      )}
                      <div style={{ fontSize: 9, color: C.dim, marginTop: 4 }}>{d.date}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 銘柄別的中率 */}
            {Object.keys(aStats.bySymbol).length > 0 && (
              <div style={cardStyle}>
                <div style={{ fontSize: F.h3, fontWeight: 700, color: C.purple, marginBottom: 10 }}>🏆 銘柄別スコアリング精度</div>
                <div style={{ fontSize: F.xs, color: C.dim, marginBottom: 10, lineHeight: 1.8 }}>
                  どの銘柄のスコアリングが正確で、どの銘柄は不正確か。不正確な銘柄はスコアリングの判断を鵜呑みにせず、追加リサーチが必要です。
                </div>
                {Object.entries(aStats.bySymbol)
                  .sort((a, b) => b[1].total - a[1].total)
                  .map(([symbol, s]) => {
                    const rate = s.total > 0 ? Math.round((s.hit / s.total) * 100) : 0;
                    const rateCol = rate >= 60 ? C.green : rate >= 40 ? C.orange : C.red;
                    return (
                      <div key={symbol} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                        <span style={{ fontSize: F.sm, fontWeight: 600, color: C.text, minWidth: 90 }}>{s.name}</span>
                        <span style={{ fontSize: F.xs, color: C.dim }}>{symbol}</span>
                        <div style={{ flex: 1, display: "flex", gap: 6, fontSize: F.xs }}>
                          <span style={{ color: C.green }}>的中{s.hit}</span>
                          <span style={{ color: C.red }}>外れ{s.miss}</span>
                        </div>
                        <div style={{ fontSize: F.h3, fontWeight: 700, color: rateCol, minWidth: 50, textAlign: "right" }}>{rate}%</div>
                        <div style={{ width: 60, height: 6, background: "#f0f2f5", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ width: `${rate}%`, height: "100%", background: rateCol, borderRadius: 3 }} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            {/* 直近の仮説記録 */}
            <div style={cardStyle}>
              <div style={{ fontSize: F.h3, fontWeight: 700, color: C.dim, marginBottom: 10 }}>📋 直近の自動仮説（最新20件）</div>
              {autoHypos.length === 0 ? (
                <div style={{ fontSize: F.sm, color: C.dim, textAlign: "center", padding: 20 }}>
                  まだ自動仮説がありません。Signal Engineページの「🔄 全銘柄の日次仮説を生成・検証」を押してください。
                </div>
              ) : (
                autoHypos.slice(0, 20).map((h) => (
                  <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: `1px solid ${C.border}`, fontSize: F.xs }}>
                    <span style={{ color: C.dim, minWidth: 65 }}>{h.date}</span>
                    <span style={{ fontWeight: 600, color: C.text, minWidth: 70 }}>{h.name}</span>
                    <span style={{
                      padding: "2px 8px", borderRadius: 4, fontWeight: 600,
                      color: h.prediction === "上昇" ? C.green : h.prediction === "下落" ? C.red : C.dim,
                      background: h.prediction === "上昇" ? `${C.green}15` : h.prediction === "下落" ? `${C.red}15` : `${C.dim}15`,
                    }}>
                      予測:{h.prediction}
                    </span>
                    <span style={{ color: C.dim }}>({h.verdict}, {h.score > 0 ? "+" : ""}{h.score})</span>
                    <span style={{ marginLeft: "auto", fontWeight: 700, color: h.result === "的中" ? C.green : h.result === "外れ" ? C.red : C.dim }}>
                      {h.result || "未検証"}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* 学習の解説 */}
            <div style={{ ...cardStyle, background: `${C.cyan}06`, borderColor: `${C.cyan}20` }}>
              <div style={{ fontSize: F.h3, fontWeight: 700, color: C.cyan, marginBottom: 8 }}>🧠 日次学習の仕組み</div>
              <div style={{ fontSize: F.sm, color: "#3a7080", lineHeight: 2 }}>
                1. 毎日、Signal Engineページで「🔄 全銘柄の日次仮説を生成・検証」を押す<br />
                2. 全ウォッチリスト銘柄のスコアを計算し、「明日上がる/下がる/横ばい」の仮説を自動生成<br />
                3. 同時に、前日の仮説を実際の値動きと照合して自動検証<br />
                4. 蓄積されたデータから「スコアリングの精度」が数字で見える<br />
                <br />
                <strong>的中率が50%以上なら、スコアリングは市場に対してエッジがあるということ。</strong><br />
                50%以下なら、パラメータの調整や追加指標の検討が必要です。<br />
                銘柄別の精度差は、あなたが得意/不得意な市場を教えてくれます。
              </div>
            </div>
          </div>
        );
      })()}

      {/* 成績タブ */}
      {hypoTab === "stats" && (
        <div>
          {/* 全体サマリー */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginBottom: 16 }}>
            {[
              { l: "仮説総数", v: stats.total, c: C.accent },
              { l: "検証中", v: stats.active, c: C.accent },
              { l: "的中", v: stats.hit, c: C.green },
              { l: "一部的中", v: stats.partial, c: C.orange },
              { l: "外れ", v: stats.miss, c: C.red },
              { l: "的中率", v: `${hitRate}%`, c: hitRate !== "—" && parseInt(hitRate) >= 50 ? C.green : C.red },
            ].map((c, i) => (
              <div key={i} style={{ ...cardStyle, textAlign: "center", padding: "16px 10px" }}>
                <div style={{ fontSize: F.xs, color: C.dim, marginBottom: 6 }}>{c.l}</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: c.c }}>{c.v}</div>
              </div>
            ))}
          </div>

          {/* セクター別集計 */}
          {(() => {
            const sectors = {};
            hypos.forEach((h) => {
              const sec = h.sector?.trim() || "未分類";
              if (!sectors[sec]) sectors[sec] = { hit: 0, partial: 0, miss: 0, active: 0, total: 0 };
              sectors[sec].total++;
              if (h.status === "的中") sectors[sec].hit++;
              else if (h.status === "一部的中") sectors[sec].partial++;
              else if (h.status === "外れ") sectors[sec].miss++;
              else sectors[sec].active++;
            });

            const sectorEntries = Object.entries(sectors)
              .map(([name, s]) => {
                const resolved = s.hit + s.partial + s.miss;
                const rate = resolved > 0 ? ((s.hit + s.partial * 0.5) / resolved * 100).toFixed(0) : "—";
                return { name, ...s, resolved, rate };
              })
              .sort((a, b) => b.total - a.total);

            if (sectorEntries.length === 0) return null;

            return (
              <div style={cardStyle}>
                <div style={{ fontSize: F.h3, fontWeight: 700, color: C.purple, marginBottom: 12 }}>
                  📊 セクター別分析 — 得意/不得意を把握する
                </div>
                <div style={{ fontSize: F.xs, color: C.dim, marginBottom: 12, lineHeight: 1.8 }}>
                  仮説が50件、100件と溜まれば「自分はどのセクターの分析が得意か」がデータで見えてきます。
                  これがあなた固有のエッジ（優位性）になります。
                </div>
                {sectorEntries.map((s) => {
                  const rateNum = s.rate !== "—" ? parseInt(s.rate) : -1;
                  const rateCol = rateNum >= 60 ? C.green : rateNum >= 40 ? C.orange : rateNum >= 0 ? C.red : C.dim;
                  return (
                    <div key={s.name} style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "12px 0",
                      borderBottom: `1px solid ${C.border}`,
                    }}>
                      <span style={{ fontSize: F.sm, fontWeight: 600, color: C.purple, minWidth: 80 }}>{s.name}</span>
                      <div style={{ flex: 1, display: "flex", gap: 8, fontSize: F.xs, color: C.dim }}>
                        <span>計{s.total}</span>
                        {s.hit > 0 && <span style={{ color: C.green }}>的中{s.hit}</span>}
                        {s.partial > 0 && <span style={{ color: C.orange }}>一部{s.partial}</span>}
                        {s.miss > 0 && <span style={{ color: C.red }}>外れ{s.miss}</span>}
                        {s.active > 0 && <span>検証中{s.active}</span>}
                      </div>
                      <div style={{ fontSize: F.h3, fontWeight: 700, color: rateCol, minWidth: 50, textAlign: "right" }}>
                        {s.rate === "—" ? "—" : `${s.rate}%`}
                      </div>
                      <div style={{ width: 60, height: 6, background: "#f0f2f5", borderRadius: 3, overflow: "hidden" }}>
                        {rateNum >= 0 && <div style={{ width: `${rateNum}%`, height: "100%", background: rateCol, borderRadius: 3 }} />}
                      </div>
                    </div>
                  );
                })}
                {sectorEntries.length < 3 && (
                  <div style={{ fontSize: F.xs, color: C.dim, marginTop: 12, lineHeight: 1.8 }}>
                    💡 まだデータが少ないです。Research Labで仮説を立て続けると、パターンが見えてきます。
                  </div>
                )}
              </div>
            );
          })()}

          {/* パターン分析の案内 */}
          <div style={{ ...cardStyle, background: `${C.cyan}06`, borderColor: `${C.cyan}20` }}>
            <div style={{ fontSize: F.h3, fontWeight: 700, color: C.cyan, marginBottom: 8 }}>🔄 仮説→検証サイクルで成長する</div>
            <div style={{ fontSize: F.sm, color: "#3a7080", lineHeight: 2 }}>
              1. Research Labでニュース→セクター→銘柄を分析<br />
              2. 仮説を立てて記録する（「なぜそう思うか」も必ず書く）<br />
              3. 時間が経ったら結果を検証（AI検証ボタンで最新情報と照合）<br />
              4. 的中/外れを記録し、「なぜ当たったか」「何を見落としたか」を振り返りメモに<br />
              5. セクター別の的中率を見て、得意分野に集中する<br />
              <br />
              <strong>このサイクルの蓄積が、AIにはない「あなた自身の判断力」を鍛えます。</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
