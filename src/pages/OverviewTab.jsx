import { useMemo } from "react";
import { C } from "../constants/colors";
import { F } from "../constants/fonts";
import MiniChart from "../components/MiniChart";
import { VERDICT_PRINCIPLES, REGIME_PRINCIPLES } from "../constants/principles";

const card = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, marginBottom: 12 };
const stat = (label, value, color) => (
  <div style={{ padding: "8px 0", borderBottom: `1px solid ${C.border}40` }}>
    <div style={{ fontSize: F.label, color: C.dim }}>{label}</div>
    <div style={{ fontSize: F.sm, fontWeight: 600, color: color || C.text }}>{value}</div>
  </div>
);

/**
 * Overview タブ: チャート + Key Statistics + 原則警告
 */
export default function OverviewTab({ daily, intra, tf, result, verdict }) {
  const data = tf === "day" ? intra : daily;
  const latest = data?.[data.length - 1];
  const prev = data?.[data.length - 2];
  const principles = verdict ? VERDICT_PRINCIPLES[verdict.label] : null;
  const regimePrinciple = result?.regime ? REGIME_PRINCIPLES[result.regime.regime] : null;

  const change = latest && prev ? latest.c - prev.c : 0;
  const changePct = prev ? ((change / prev.c) * 100).toFixed(2) : "0.00";
  const changeCol = change >= 0 ? C.green : C.red;

  // 52週高値/安値（手持ちデータから近似）
  const high52 = daily ? Math.max(...daily.slice(-252).map((d) => d.h)) : 0;
  const low52 = daily ? Math.min(...daily.slice(-252).map((d) => d.l)) : 0;
  const avgVol = daily ? Math.round(daily.slice(-20).reduce((s, d) => s + d.v, 0) / 20) : 0;

  return (
    <div>
      {/* 価格ヘッダー */}
      {latest && (
        <div style={{ ...card, display: "flex", alignItems: "baseline", gap: 16, flexWrap: "wrap" }}>
          <span style={{ fontSize: F.h1 + 4, fontWeight: 700, color: C.text, fontFamily: "'JetBrains Mono'" }}>
            {latest.c.toLocaleString()}
          </span>
          <span style={{ fontSize: F.base, fontWeight: 600, color: changeCol }}>
            {change >= 0 ? "+" : ""}{change.toFixed(2)} ({changePct}%)
          </span>
          <span style={{ fontSize: F.xs, color: C.dim }}>
            {latest.date}
          </span>
        </div>
      )}

      {/* チャート */}
      <div style={card}>
        <div style={{ fontSize: F.xs, color: C.dim, marginBottom: 6 }}>
          {tf === "day" ? "📈 本日の5分足" : "📈 日足チャート"}
        </div>
        <MiniChart data={data || []} count={tf === "day" ? 78 : 60} showPatterns />
      </div>

      {/* チャートパターン検出結果 */}
      {result?.chartPatterns?.length > 0 && (
        <div style={{ ...card, borderLeft: `3px solid ${C.purple}` }}>
          <div style={{ fontSize: F.sm, fontWeight: 700, color: C.purple, marginBottom: 8 }}>📐 チャートパターン検出</div>
          {result.chartPatterns.map((p, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 0", fontSize: F.xs }}>
              <span style={{
                padding: "2px 8px", borderRadius: 4, fontWeight: 600,
                background: p.signal === "buy" ? `${C.green}15` : `${C.red}15`,
                color: p.signal === "buy" ? C.green : C.red,
              }}>{p.signal === "buy" ? "買い" : "売り"}</span>
              <span style={{ fontWeight: 600, color: C.text }}>{p.nameJa}</span>
              <span style={{ color: C.dim, flex: 1 }}>{p.description}</span>
            </div>
          ))}
        </div>
      )}

      {/* 原則に基づく行動指針 */}
      {principles && (
        <div style={{ ...card, borderLeft: `3px solid ${verdict.color}`, background: `${verdict.color}04` }}>
          <div style={{ fontSize: F.sm, fontWeight: 700, color: verdict.color, marginBottom: 6 }}>
            📖 {principles.action}
          </div>
          {principles.warnings.map((w, i) => (
            <div key={i} style={{ fontSize: F.xs, color: C.dim, lineHeight: 2 }}>{w}</div>
          ))}
          <div style={{ fontSize: 11, color: C.dim, marginTop: 6, fontStyle: "italic", borderTop: `1px solid ${C.border}`, paddingTop: 6 }}>
            原則: {principles.principle}
          </div>
        </div>
      )}

      {/* レジーム原則 */}
      {regimePrinciple && (
        <div style={{ ...card, fontSize: F.xs, color: C.dim, lineHeight: 1.8, background: "#f8f9fb" }}>
          💡 {regimePrinciple.warning}
        </div>
      )}

      {/* Key Statistics */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={card}>
          <div style={{ fontSize: F.xs, fontWeight: 700, color: C.dim, marginBottom: 8 }}>📊 値動き</div>
          {latest && stat("始値", latest.o.toLocaleString())}
          {latest && stat("高値", latest.h.toLocaleString(), latest.h >= (prev?.h || 0) ? C.green : undefined)}
          {latest && stat("安値", latest.l.toLocaleString(), latest.l <= (prev?.l || Infinity) ? C.red : undefined)}
          {stat("52週高値", high52.toLocaleString())}
          {stat("52週安値", low52.toLocaleString())}
        </div>
        <div style={card}>
          <div style={{ fontSize: F.xs, fontWeight: 700, color: C.dim, marginBottom: 8 }}>📈 出来高</div>
          {latest && stat("本日出来高", latest.v.toLocaleString())}
          {stat("平均出来高(20日)", avgVol.toLocaleString())}
          {latest && stat("出来高比率", avgVol > 0 ? `${(latest.v / avgVol).toFixed(1)}x` : "—",
            latest.v > avgVol * 1.5 ? C.green : undefined
          )}
        </div>
      </div>
    </div>
  );
}
