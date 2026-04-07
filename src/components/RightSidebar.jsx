import { C } from "../constants/colors";
import { F } from "../constants/fonts";

/**
 * 右サイドバー: Signal Engineサマリー + 規律ステータス
 */
export default function RightSidebar({ result, verdict, tf, onChangeTf, biasLevel, ipsCompliance }) {
  const tfOptions = [
    { key: "day", label: "デイ", icon: "⚡" },
    { key: "swing", label: "スイング", icon: "🌊" },
    { key: "long", label: "中長期", icon: "🏔️" },
  ];

  return (
    <div>
      {/* Signal Engineスコア */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: F.xs, color: C.dim, fontWeight: 600, marginBottom: 8 }}>📊 Signal Engine</div>

        {verdict ? (
          <div style={{
            textAlign: "center", padding: "16px 8px",
            background: `${verdict.color}06`, borderRadius: 10,
            border: `1px solid ${verdict.color}20`,
            marginBottom: 12,
          }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: verdict.color }}>
              {result?.composite > 0 ? "+" : ""}{result?.composite || 0}
            </div>
            <div style={{ fontSize: F.base, fontWeight: 700, color: verdict.color, marginTop: 4 }}>
              {verdict.label}
            </div>
            <div style={{ fontSize: F.label, color: C.dim, marginTop: 4 }}>
              信頼度: {result?.scores ? (() => {
                const agree = Math.max(
                  result.scores.filter((s) => s.score > 10).length,
                  result.scores.filter((s) => s.score < -10).length
                );
                const total = result.scores.length;
                return agree >= Math.ceil(total * 0.7) ? "高" : agree >= Math.ceil(total * 0.4) ? "中" : "低";
              })() : "—"}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: 16, color: C.dim, fontSize: F.xs }}>
            銘柄を選択してください
          </div>
        )}

        {/* タイムフレーム切替 */}
        <div style={{ display: "flex", gap: 4 }}>
          {tfOptions.map((t) => (
            <button key={t.key} onClick={() => onChangeTf?.(t.key)} style={{
              flex: 1, padding: "6px 4px", border: `1px solid ${tf === t.key ? C.accent : C.border}`,
              borderRadius: 6, background: tf === t.key ? `${C.accent}10` : "transparent",
              color: tf === t.key ? C.accent : C.dim,
              cursor: "pointer", fontSize: 10, fontFamily: "inherit", fontWeight: 600,
            }}>
              {t.icon}<br />{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* レジーム */}
      {result?.regime && (
        <div style={{
          padding: "8px 10px", borderRadius: 6, marginBottom: 16,
          background: result.regime.regime.includes("up") ? `${C.green}06` :
            result.regime.regime.includes("down") ? `${C.red}06` : `${C.orange}06`,
          border: `1px solid ${result.regime.regime.includes("up") ? C.green :
            result.regime.regime.includes("down") ? C.red : C.orange}20`,
          fontSize: F.label, color: C.dim, lineHeight: 1.6,
        }}>
          🔍 {result.regime.desc}
        </div>
      )}

      {/* 指標スコア一覧（コンパクト） */}
      {result?.scores && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: F.label, color: C.dim, fontWeight: 600, marginBottom: 6 }}>指標スコア</div>
          {result.scores.map((s) => {
            const col = s.score > 15 ? C.green : s.score < -15 ? C.red : C.dim;
            return (
              <div key={s.key} style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "4px 0", borderBottom: `1px solid ${C.border}40`,
              }}>
                <span style={{ flex: 1, fontSize: 11, color: C.dim }}>{s.name}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: col, minWidth: 36, textAlign: "right" }}>
                  {s.score > 0 ? "+" : ""}{s.score}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* 未検証警告 */}
      <div style={{
        padding: "8px 10px", borderRadius: 6, marginBottom: 16,
        background: `${C.orange}06`, border: `1px solid ${C.orange}20`,
        fontSize: 10, color: C.orange, lineHeight: 1.6,
      }}>
        ⚠️ スコアは未検証です。参考値としてご利用ください。
      </div>

      {/* 規律ステータス */}
      <div>
        <div style={{ fontSize: F.label, color: C.dim, fontWeight: 600, marginBottom: 8 }}>🛡️ 規律ステータス</div>
        <div style={{
          padding: "10px", borderRadius: 6, background: "#f0f2f5",
          fontSize: F.xs, color: C.dim, lineHeight: 1.8,
        }}>
          <div>バイアスリスク: <strong style={{ color: biasLevel === "良好" ? C.green : biasLevel === "注意" ? C.orange : C.red }}>{biasLevel || "未診断"}</strong></div>
          <div>IPS遵守率: <strong>{ipsCompliance || "—"}</strong></div>
        </div>
      </div>
    </div>
  );
}
