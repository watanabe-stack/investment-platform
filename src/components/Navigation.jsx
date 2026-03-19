import { C } from "../constants/colors";
import { F } from "../constants/fonts";

/**
 * 上部ナビゲーション（4タブ）
 */
export default function Navigation({ page, setPage, activeHypoCount }) {
  const tabs = [
    ["signal", "📊 Signal", "テクニカル"],
    ["research", "🔬 Research", "ファンダ"],
    ["hypo", `💡 仮説(${activeHypoCount})`, "ジャーナル"],
    ["disc", "🛡️ 規律", "心理・資金管理"],
  ];

  return (
    <div style={{
      display: "flex", gap: 0, marginBottom: 18,
      borderRadius: 10, overflow: "hidden",
      border: `1.5px solid ${C.border}`,
    }}>
      {tabs.map(([k, label, sub]) => (
        <button
          key={k}
          onClick={() => setPage(k)}
          style={{
            flex: 1, padding: "14px 10px", cursor: "pointer",
            fontFamily: "inherit", border: "none",
            background: page === k ? `${C.accent}18` : C.card,
            color: page === k ? C.accent : C.dim,
            borderRight: `1px solid ${C.border}`,
            transition: "all 0.15s",
          }}
        >
          <div style={{ fontSize: F.sm, fontWeight: 700 }}>{label}</div>
          <div style={{ fontSize: F.label, opacity: 0.6, marginTop: 2 }}>{sub}</div>
        </button>
      ))}
    </div>
  );
}
