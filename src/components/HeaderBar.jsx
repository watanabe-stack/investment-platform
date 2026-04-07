import { C } from "../constants/colors";
import { F } from "../constants/fonts";

/**
 * ヘッダーバー: 選択中銘柄 + Signal Engineスコア + アクションボタン
 */
export default function HeaderBar({ selected, score, verdict, onOpenScreener, onOpenRoadmap, onOpenDiscipline }) {
  const name = selected?.name || "銘柄を選択してください";
  const symbol = selected?.symbol || "";
  const isReal = selected?.type === "real";

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 16,
      padding: "10px 0", minHeight: 52,
    }}>
      {/* 銘柄情報 */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 12 }}>
        <div>
          <div style={{ fontSize: F.h2, fontWeight: 700, color: C.text }}>{name}</div>
          {symbol && (
            <div style={{ fontSize: F.xs, color: C.dim }}>
              {symbol} {!isReal && <span style={{ color: C.orange }}>（シミュレーション）</span>}
            </div>
          )}
        </div>
      </div>

      {/* Signal Engineスコア（常時表示） */}
      {verdict && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "6px 16px", borderRadius: 8,
          background: `${verdict.color}10`,
          border: `1.5px solid ${verdict.color}30`,
        }}>
          <span style={{ fontSize: F.h2, fontWeight: 800, color: verdict.color }}>
            {score > 0 ? "+" : ""}{score}
          </span>
          <span style={{ fontSize: F.sm, fontWeight: 700, color: verdict.color }}>
            {verdict.label}
          </span>
        </div>
      )}

      {/* アクションボタン */}
      <div style={{ display: "flex", gap: 6 }}>
        <HeaderBtn icon="☀️" label="銘柄発見" onClick={onOpenScreener} />
        <HeaderBtn icon="🛡️" label="規律" onClick={onOpenDiscipline} />
        <HeaderBtn icon="🗺️" label="ガイド" onClick={onOpenRoadmap} />
      </div>
    </div>
  );
}

function HeaderBtn({ icon, label, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 4,
      padding: "6px 12px", borderRadius: 6,
      border: `1px solid ${C.border}`, background: "transparent",
      color: C.dim, cursor: "pointer", fontSize: F.label,
      fontFamily: "inherit", transition: "all 0.15s",
    }}>
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}
