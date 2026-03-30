import { useState, useMemo } from "react";
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

const FREQ_MAP = { "月1回": 12, "週1回": 52, "日1回": 252 };

export default function CostCalcPage() {
  const [winRate, setWinRate] = useState("55");
  const [avgProfit, setAvgProfit] = useState("10");
  const [avgLoss, setAvgLoss] = useState("5");
  const [capital, setCapital] = useState("1000000");
  const [commissionRate, setCommissionRate] = useState("0.1");
  const [taxRate, setTaxRate] = useState("20.315");
  const [nisa, setNisa] = useState(false);
  const [frequency, setFrequency] = useState("月1回");

  const result = useMemo(() => {
    const p = parseFloat(winRate) / 100;
    const w = parseFloat(avgProfit) / 100;
    const l = parseFloat(avgLoss) / 100;
    const cap = parseFloat(capital) || 0;
    const comm = parseFloat(commissionRate) / 100;
    const tax = nisa ? 0 : parseFloat(taxRate) / 100;
    const freq = FREQ_MAP[frequency] || 12;

    if (isNaN(p) || isNaN(w) || isNaN(l) || l === 0 || p <= 0 || p >= 1) return null;

    const b = w / l; // odds ratio

    // Pre-tax expected value per trade
    const evPreTax = p * w - (1 - p) * l;

    // Commission cost per trade (round trip)
    const commPerTrade = comm * 2; // entry + exit

    // Post-fee expected value
    const evPostFee = evPreTax - commPerTrade;

    // Post-tax expected value (tax only on profits)
    // E[tax] = p * w * tax (only winning trades are taxed)
    const taxPerTrade = p * w * tax;
    const evPostTax = evPostFee - taxPerTrade;

    // Kelly criterion: pre-tax
    const kellyPreTax = (p * (b + 1) - 1) / b;

    // Kelly with costs: adjusted w and l for costs
    const wAdj = w - commPerTrade; // profit reduced by commission
    const wAfterTax = wAdj * (1 - tax); // profit after tax
    const lAdj = l + commPerTrade; // loss increased by commission
    const bAdj = lAdj > 0 ? wAfterTax / lAdj : 0;
    const kellyPostTax = bAdj > 0 ? (p * (bAdj + 1) - 1) / bAdj : 0;

    // Annual commission estimate
    const annualTrades = freq;
    const avgTradeSize = cap * Math.max(0, kellyPostTax > 0 ? kellyPostTax / 2 : 0.1); // estimated per-trade size
    const annualCommission = avgTradeSize * commPerTrade * annualTrades;
    const annualCommissionPct = cap > 0 ? (annualCommission / cap * 100) : 0;

    // Annual return estimate
    const annualReturnPreTax = evPreTax * annualTrades * 100;
    const annualReturnPostTax = evPostTax * annualTrades * 100;

    return {
      evPreTax: (evPreTax * 100).toFixed(3),
      evPostFee: (evPostFee * 100).toFixed(3),
      evPostTax: (evPostTax * 100).toFixed(3),
      kellyPreTax: Math.max(0, kellyPreTax * 100).toFixed(1),
      halfKellyPreTax: Math.max(0, kellyPreTax * 50).toFixed(1),
      kellyPostTax: Math.max(0, kellyPostTax * 100).toFixed(1),
      halfKellyPostTax: Math.max(0, kellyPostTax * 50).toFixed(1),
      annualCommission: Math.round(annualCommission),
      annualCommissionPct: annualCommissionPct.toFixed(2),
      annualTrades,
      annualReturnPreTax: annualReturnPreTax.toFixed(1),
      annualReturnPostTax: annualReturnPostTax.toFixed(1),
      commPerTrade: (commPerTrade * 100).toFixed(3),
      taxPerTrade: (taxPerTrade * 100).toFixed(3),
      isNisa: nisa,
      b: b.toFixed(2),
      bAdj: bAdj.toFixed(2),
    };
  }, [winRate, avgProfit, avgLoss, capital, commissionRate, taxRate, nisa, frequency]);

  return (
    <div>
      <div style={cardStyle}>
        <div style={{ fontSize: F.h2, fontWeight: 700, color: C.green, marginBottom: 8 }}>💹 コスト込みケリー計算機</div>
        <div style={{ fontSize: F.sm, color: C.dim, lineHeight: 2, marginBottom: 6 }}>
          手数料・税金を含めた「実際のリターン」を計算。理論上のケリー基準と、コスト控除後のケリー基準を比較できます。
        </div>
        <div style={{ fontSize: F.xs, color: C.orange, lineHeight: 2, marginBottom: 16, padding: "10px 14px", background: `${C.orange}08`, borderRadius: 8 }}>
          ⚠️ コスト込みでもハーフケリーを推奨。手数料と税金は確実に発生するコストであり、推定勝率の誤差も加味すべき。
        </div>

        {/* Inputs */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: F.xs, color: C.dim, display: "block", marginBottom: 4 }}>勝率 %</label>
            <input type="number" value={winRate} onChange={(e) => setWinRate(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: F.xs, color: C.dim, display: "block", marginBottom: 4 }}>平均利益率 %</label>
            <input type="number" value={avgProfit} onChange={(e) => setAvgProfit(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: F.xs, color: C.dim, display: "block", marginBottom: 4 }}>平均損失率 %</label>
            <input type="number" value={avgLoss} onChange={(e) => setAvgLoss(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: F.xs, color: C.dim, display: "block", marginBottom: 4 }}>資産額 ¥</label>
            <input type="number" value={capital} onChange={(e) => setCapital(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: F.xs, color: C.dim, display: "block", marginBottom: 4 }}>手数料率 %（片道）</label>
            <input type="number" value={commissionRate} onChange={(e) => setCommissionRate(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: F.xs, color: C.dim, display: "block", marginBottom: 4 }}>税率 %</label>
            <input type="number" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} style={inputStyle} disabled={nisa} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
          {/* NISA Toggle */}
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input type="checkbox" checked={nisa} onChange={(e) => setNisa(e.target.checked)}
              style={{ width: 20, height: 20, accentColor: C.green }} />
            <span style={{ fontSize: F.sm, color: nisa ? C.green : C.dim, fontWeight: 600 }}>NISA口座（非課税）</span>
          </label>

          {/* Frequency */}
          <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
            {Object.keys(FREQ_MAP).map((f) => (
              <button key={f} onClick={() => setFrequency(f)}
                style={btnStyle(C.accent, frequency === f)}>{f}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      {result && (
        <>
          {/* Expected Value Breakdown */}
          <div style={cardStyle}>
            <div style={{ fontSize: F.h3, fontWeight: 700, color: C.accent, marginBottom: 14 }}>📊 期待値の内訳（1取引あたり）</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 14 }}>
              {[
                { l: "税引前 期待値", v: `${result.evPreTax}%`, c: parseFloat(result.evPreTax) > 0 ? C.green : C.red, sub: "手数料・税なし" },
                { l: "手数料控除後", v: `${result.evPostFee}%`, c: parseFloat(result.evPostFee) > 0 ? C.green : C.red, sub: `手数料: -${result.commPerTrade}%` },
                { l: "税引後 期待値", v: `${result.evPostTax}%`, c: parseFloat(result.evPostTax) > 0 ? C.green : C.red, sub: result.isNisa ? "NISA: 非課税" : `税: -${result.taxPerTrade}%` },
              ].map((c, i) => (
                <div key={i} style={{ ...cardStyle, textAlign: "center", padding: "16px 12px", marginBottom: 0 }}>
                  <div style={{ fontSize: F.xs, color: C.dim, marginBottom: 6 }}>{c.l}</div>
                  <div style={{ fontSize: F.h2, fontWeight: 700, color: c.c }}>{c.v}</div>
                  <div style={{ fontSize: F.label, color: C.dim, marginTop: 4 }}>{c.sub}</div>
                </div>
              ))}
            </div>

            {parseFloat(result.evPostTax) <= 0 && (
              <div style={{ background: `${C.red}08`, borderRadius: 8, padding: 14, borderLeft: `3px solid ${C.red}` }}>
                <div style={{ fontSize: F.h3, fontWeight: 700, color: C.red, marginBottom: 4 }}>🚫 コスト込みで期待値がマイナスです</div>
                <div style={{ fontSize: F.sm, color: "#c08080", lineHeight: 1.8 }}>
                  手数料と税金を考慮すると、この戦略では資産が減少します。勝率を上げるか、手数料の安い証券会社に変更するか、取引頻度を減らしてください。
                </div>
              </div>
            )}
          </div>

          {/* Kelly Comparison */}
          <div style={cardStyle}>
            <div style={{ fontSize: F.h3, fontWeight: 700, color: C.cyan, marginBottom: 14 }}>⚖️ ケリー基準の比較: 税引前 vs 税引後</div>

            <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
              {/* Pre-tax Kelly */}
              <div style={{ flex: 1, textAlign: "center" }}>
                <div style={{ fontSize: F.xs, color: C.dim, marginBottom: 8 }}>税引前ケリー</div>
                <div style={{ position: "relative", width: "100%", height: 160, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                  <div style={{
                    width: "60%", background: `linear-gradient(to top, ${C.accent}, ${C.accent}60)`,
                    height: `${Math.min(100, Math.max(4, parseFloat(result.kellyPreTax) * 2))}%`,
                    borderRadius: "6px 6px 0 0", transition: "height 0.5s",
                  }} />
                </div>
                <div style={{ fontSize: F.h2, fontWeight: 700, color: C.accent, marginTop: 8 }}>{result.kellyPreTax}%</div>
                <div style={{ fontSize: F.xs, color: C.dim }}>ハーフ: {result.halfKellyPreTax}%</div>
              </div>

              {/* Post-tax Kelly */}
              <div style={{ flex: 1, textAlign: "center" }}>
                <div style={{ fontSize: F.xs, color: C.dim, marginBottom: 8 }}>税引後ケリー</div>
                <div style={{ position: "relative", width: "100%", height: 160, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                  <div style={{
                    width: "60%", background: `linear-gradient(to top, ${C.green}, ${C.green}60)`,
                    height: `${Math.min(100, Math.max(4, parseFloat(result.kellyPostTax) * 2))}%`,
                    borderRadius: "6px 6px 0 0", transition: "height 0.5s",
                  }} />
                </div>
                <div style={{ fontSize: F.h2, fontWeight: 700, color: C.green, marginTop: 8 }}>{result.kellyPostTax}%</div>
                <div style={{ fontSize: F.xs, color: C.dim }}>ハーフ: {result.halfKellyPostTax}%</div>
              </div>
            </div>

            {/* Difference */}
            {parseFloat(result.kellyPreTax) > 0 && (
              <div style={{ background: "#0e1a30", borderRadius: 8, padding: 14, textAlign: "center" }}>
                <div style={{ fontSize: F.sm, color: C.dim, marginBottom: 4 }}>コストによるケリー基準の低下</div>
                <div style={{ fontSize: F.h2, fontWeight: 700, color: C.orange }}>
                  -{(parseFloat(result.kellyPreTax) - parseFloat(result.kellyPostTax)).toFixed(1)}%ポイント
                </div>
                <div style={{ fontSize: F.xs, color: C.dim, marginTop: 4 }}>
                  (税引前 {result.kellyPreTax}% → 税引後 {result.kellyPostTax}%)
                </div>
              </div>
            )}
          </div>

          {/* Annual Commission Impact */}
          <div style={cardStyle}>
            <div style={{ fontSize: F.h3, fontWeight: 700, color: C.orange, marginBottom: 14 }}>📅 年間コスト試算（{frequency} × {result.annualTrades}回/年）</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 14 }}>
              {[
                { l: "年間取引回数", v: `${result.annualTrades}回`, c: C.accent },
                { l: "推定年間手数料", v: `¥${result.annualCommission.toLocaleString()}`, c: C.orange },
                { l: "手数料/資産比", v: `${result.annualCommissionPct}%`, c: parseFloat(result.annualCommissionPct) > 2 ? C.red : C.orange },
                { l: "税引前年間リターン", v: `${result.annualReturnPreTax}%`, c: parseFloat(result.annualReturnPreTax) > 0 ? C.green : C.red },
                { l: "税引後年間リターン", v: `${result.annualReturnPostTax}%`, c: parseFloat(result.annualReturnPostTax) > 0 ? C.green : C.red },
              ].map((c, i) => (
                <div key={i} style={{ ...cardStyle, textAlign: "center", padding: "14px 10px", marginBottom: 0 }}>
                  <div style={{ fontSize: F.xs, color: C.dim, marginBottom: 4 }}>{c.l}</div>
                  <div style={{ fontSize: F.h2, fontWeight: 700, color: c.c }}>{c.v}</div>
                </div>
              ))}
            </div>

            {parseFloat(result.annualCommissionPct) > 2 && (
              <div style={{ background: `${C.red}08`, borderRadius: 8, padding: 14, borderLeft: `3px solid ${C.red}` }}>
                <div style={{ fontSize: F.sm, color: C.red, fontWeight: 700, marginBottom: 4 }}>⚠️ 手数料が年間資産の2%以上を消費しています</div>
                <div style={{ fontSize: F.sm, color: "#c08080", lineHeight: 1.8 }}>
                  取引頻度を下げるか、手数料率の低い証券会社への切り替えを検討してください。
                </div>
              </div>
            )}
          </div>

          {/* Formula */}
          <div style={cardStyle}>
            <div style={{ fontSize: F.h3, fontWeight: 700, color: C.dim, marginBottom: 10 }}>📐 計算の仕組み</div>
            <div style={{ background: "#0e1a30", borderRadius: 8, padding: 16, fontSize: F.sm, color: C.text, lineHeight: 2.2, fontFamily: "'JetBrains Mono',monospace" }}>
              <span style={{ color: C.dim }}>// 1取引あたりの期待値</span><br />
              EV = p×w - (1-p)×l = {result.evPreTax}%<br /><br />
              <span style={{ color: C.dim }}>// 手数料控除（往復）</span><br />
              手数料 = {result.commPerTrade}% → EV = {result.evPostFee}%<br /><br />
              <span style={{ color: C.dim }}>// 税金（利益のみ課税{result.isNisa ? " → NISA非課税" : ""}）</span><br />
              税 = {result.taxPerTrade}% → EV = {result.evPostTax}%<br /><br />
              <span style={{ color: C.dim }}>// ケリー基準</span><br />
              税引前: K = (p(B+1)-1)/B, B={result.b} → <span style={{ color: C.accent }}>{result.kellyPreTax}%</span><br />
              税引後: K = (p(B'+1)-1)/B', B'={result.bAdj} → <span style={{ color: C.green }}>{result.kellyPostTax}%</span>
            </div>
          </div>

          {/* Advice */}
          <div style={{ ...cardStyle, background: `${C.cyan}06`, borderColor: `${C.cyan}20` }}>
            <div style={{ fontSize: F.h3, fontWeight: 700, color: C.cyan, marginBottom: 8 }}>💡 コスト意識のポイント</div>
            <div style={{ fontSize: F.sm, color: "#80b8c8", lineHeight: 2 }}>
              ・<strong>手数料</strong>は「確実に発生するマイナスリターン」。取引頻度が高いほど影響大<br />
              ・<strong>税金</strong>は利益の約20%を持っていく。NISA口座の活用で非課税にできる<br />
              ・<strong>日1回トレード</strong>だと年252回。手数料0.1%でも往復0.2%×252=年間50.4%が手数料に消える<br />
              ・<strong>コスト込みで期待値がプラス</strong>になって初めて、その戦略にエッジがある<br />
              ・ケリー基準は理論値。実運用では必ずハーフケリー以下で運用すること
            </div>
          </div>
        </>
      )}

      <div style={{ padding: 10, background: `${C.orange}05`, borderRadius: 8, border: `1px solid ${C.orange}12`, marginTop: 8 }}>
        <p style={{ fontSize: F.xs, color: "#7a6a4a", lineHeight: 1.8 }}>⚠️ 計算結果は理論上の数値です。実際のリターンは市場環境・銘柄選定・タイミング等で大きく変動します。投資助言ではありません。</p>
      </div>
    </div>
  );
}
