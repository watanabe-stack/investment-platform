import { C } from "../constants/colors";
import { F } from "../constants/fonts";

/**
 * ナビゲーション — 8モジュールを横スクロール可能なタブで表示
 */
export default function Navigation({ page, setPage, activeHypoCount }) {
  const tabs = [
    { key: "roadmap", icon: "🗺️", label: "使い方" },
    { key: "screen", icon: "☀️", label: "銘柄発見" },
    { key: "signal", icon: "📊", label: "分析" },
    { key: "research", icon: "🔬", label: "調査" },
    { key: "hypo", icon: "💡", label: `仮説(${activeHypoCount})` },
    { key: "trade", icon: "💰", label: "売買記録" },
    { key: "disc", icon: "🛡️", label: "規律" },
    { key: "cost", icon: "🧮", label: "費用計算" },
  ];

  return (
    <div style={{
      display: "flex", gap: 0, marginBottom: 20,
      borderRadius: 12, overflow: "hidden",
      border: `2px solid ${C.border}`,
      background: C.card,
      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    }}>
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => setPage(t.key)}
          style={{
            flex: 1, minWidth: 0,
            padding: "14px 4px",
            cursor: "pointer",
            fontFamily: "inherit",
            border: "none",
            borderBottom: page === t.key ? `3px solid ${C.accent}` : "3px solid transparent",
            background: page === t.key ? `${C.accent}10` : "transparent",
            color: page === t.key ? C.accent : C.dim,
            transition: "all 0.15s",
          }}
        >
          <div style={{ fontSize: 18 }}>{t.icon}</div>
          <div style={{
            fontSize: F.label, fontWeight: page === t.key ? 700 : 500,
            marginTop: 3,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{t.label}</div>
        </button>
      ))}
    </div>
  );
}
