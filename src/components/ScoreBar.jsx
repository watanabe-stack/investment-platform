import { C } from "../constants/colors";
import { F } from "../constants/fonts";

/**
 * 個別指標のスコアバー
 * タップで展開 → 解説・判定根拠・用語辞書を表示
 */
export default function ScoreBar({ item, expanded, onToggle }) {
  const pct = ((item.score + 100) / 200) * 100;
  const col = item.score > 15 ? C.green : item.score < -15 ? C.red : "#607d8b";

  return (
    <div style={{ marginBottom: 2, borderBottom: `1px solid ${C.border}` }}>
      {/* ヘッダー行 */}
      <div
        onClick={onToggle}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          cursor: "pointer", padding: "12px 0",
        }}
      >
        <div style={{ width: 140, fontSize: F.sm, color: "#4a6070", flexShrink: 0, fontWeight: 500 }}>
          {item.name}
        </div>
        <div style={{
          flex: 1, height: 8, background: "#f0f2f5",
          borderRadius: 4, position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", left: "50%", top: 0, width: 1, height: "100%", background: C.border }} />
          <div style={{
            position: "absolute", top: 0, height: "100%", borderRadius: 4,
            left: item.score >= 0 ? "50%" : `${pct}%`,
            width: `${Math.abs(item.score) / 2}%`,
            background: col, opacity: 0.75, transition: "all 0.4s",
          }} />
        </div>
        <div style={{ width: 55, textAlign: "right", fontSize: F.h3, fontWeight: 700, color: col }}>
          {item.score > 0 ? "+" : ""}{item.score}
        </div>
        <div style={{
          width: 16, fontSize: F.label, color: C.dim,
          transition: "transform 0.2s",
          transform: expanded ? "rotate(180deg)" : "",
        }}>▼</div>
      </div>

      {/* 展開パネル */}
      {expanded && (
        <div style={{ padding: "0 0 16px", animation: "fadeIn 0.2s" }}>
          {/* この指標とは？ */}
          <div style={{
            background: `${C.accent}08`, borderRadius: 8, padding: "12px 16px",
            marginBottom: 10, borderLeft: `3px solid ${C.accent}`,
          }}>
            <div style={{ fontSize: F.xs, color: C.accent, fontWeight: 700, marginBottom: 4 }}>
              📖 この指標とは？
            </div>
            <div style={{ fontSize: F.sm, color: "#3a6a8a", lineHeight: 1.9 }}>{item.what}</div>
          </div>

          {/* 判定根拠 */}
          <div style={{ padding: "0 16px", marginBottom: 10 }}>
            <div style={{ fontSize: F.xs, color: C.orange, fontWeight: 700, marginBottom: 6 }}>
              ⚡ 判定根拠
            </div>
            {item.reasons.map((r, i) => (
              <div key={i} style={{ fontSize: F.sm, color: "#4a6070", lineHeight: 2 }}>• {r}</div>
            ))}
            <div style={{ color: C.dim, fontSize: F.xs, marginTop: 4 }}>
              ウェイト: {item.weight}%
            </div>
          </div>

          {/* 用語辞書 */}
          {item.terms?.length > 0 && (
            <div style={{
              background: `${C.purple}08`, borderRadius: 8, padding: "12px 16px",
              borderLeft: `3px solid ${C.purple}`,
            }}>
              <div style={{ fontSize: F.xs, color: C.purple, fontWeight: 700, marginBottom: 8 }}>
                📚 用語辞書
              </div>
              {item.terms.map((t, i) => (
                <div key={i} style={{ marginBottom: i < item.terms.length - 1 ? 8 : 0 }}>
                  <span style={{ fontSize: F.sm, color: "#7030a0", fontWeight: 600 }}>{t.w}</span>
                  <div style={{ fontSize: F.xs, color: "#5a7080", lineHeight: 1.8, paddingLeft: 10 }}>{t.d}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
