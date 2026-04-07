import { useState } from "react";
import { C } from "../constants/colors";
import { F } from "../constants/fonts";

/**
 * 左サイドバー: ウォッチリスト＋銘柄一覧
 * 銘柄をクリックすると右のメインエリアに詳細が表示される
 */
export default function LeftSidebar({ watchlist, simDatasets, selected, onSelect, onRemove, onSearch }) {
  const [tab, setTab] = useState("watch"); // "watch" | "sim"
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* 検索バー */}
      <div style={{ padding: "12px 12px 8px" }}>
        <div style={{ display: "flex", gap: 4 }}>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 銘柄検索..."
            style={{
              flex: 1, background: "#f0f2f5", border: `1px solid ${C.border}`,
              borderRadius: 6, padding: "8px 10px", fontSize: F.xs,
              color: C.text, outline: "none", fontFamily: "inherit",
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && searchQuery.trim()) {
                onSearch?.(searchQuery.trim());
                setSearchQuery("");
              }
            }}
          />
        </div>
      </div>

      {/* タブ */}
      <div style={{ display: "flex", borderBottom: `1px solid ${C.border}` }}>
        {[
          { key: "watch", label: `ウォッチ(${watchlist.length})` },
          { key: "sim", label: "サンプル" },
        ].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flex: 1, padding: "8px 4px", border: "none", cursor: "pointer",
            background: tab === t.key ? C.bg : "transparent",
            color: tab === t.key ? C.accent : C.dim,
            fontSize: F.label, fontWeight: 600, fontFamily: "inherit",
            borderBottom: tab === t.key ? `2px solid ${C.accent}` : "2px solid transparent",
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* 銘柄リスト */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {tab === "watch" && (
          <>
            {watchlist.length === 0 && (
              <div style={{ padding: 16, fontSize: F.xs, color: C.dim, textAlign: "center", lineHeight: 2 }}>
                銘柄がありません。<br />検索して追加してください。
              </div>
            )}
            {watchlist.map((w) => (
              <StockItem
                key={w.symbol}
                symbol={w.symbol}
                name={w.name}
                isSelected={selected?.symbol === w.symbol && selected?.type === "real"}
                onClick={() => onSelect({ type: "real", symbol: w.symbol, name: w.name })}
                onRemove={() => onRemove?.(w.symbol)}
              />
            ))}
          </>
        )}

        {tab === "sim" && simDatasets.map((d, i) => (
          <StockItem
            key={`sim-${i}`}
            symbol={`SIM${i}`}
            name={d.label}
            isSim
            isSelected={selected?.type === "sim" && selected?.index === i}
            onClick={() => onSelect({ type: "sim", index: i, name: d.label })}
          />
        ))}
      </div>

      {/* 追加ボタン */}
      <div style={{ padding: "8px 12px", borderTop: `1px solid ${C.border}` }}>
        <button onClick={() => onSearch?.("")} style={{
          width: "100%", padding: "10px", border: `1px dashed ${C.border}`,
          borderRadius: 6, background: "transparent", color: C.accent,
          cursor: "pointer", fontSize: F.xs, fontFamily: "inherit", fontWeight: 600,
        }}>
          + 銘柄を追加
        </button>
      </div>
    </div>
  );
}

function StockItem({ symbol, name, isSelected, isSim, onClick, onRemove }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "10px 12px", cursor: "pointer",
        background: isSelected ? `${C.accent}10` : "transparent",
        borderLeft: isSelected ? `3px solid ${C.accent}` : "3px solid transparent",
        borderBottom: `1px solid ${C.border}40`,
        transition: "all 0.1s",
      }}
    >
      <div style={{
        width: 28, height: 28, borderRadius: 6,
        background: isSim ? `${C.purple}15` : `${C.accent}15`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, fontWeight: 700, color: isSim ? C.purple : C.accent,
      }}>
        {isSim ? "S" : name?.[0] || "?"}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: F.xs, fontWeight: 600, color: C.text,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {name}
        </div>
        <div style={{ fontSize: 10, color: C.dim }}>
          {isSim ? "シミュレーション" : symbol}
        </div>
      </div>
      {onRemove && (
        <button onClick={(e) => { e.stopPropagation(); onRemove(); }} style={{
          background: "none", border: "none", color: C.dim,
          cursor: "pointer", fontSize: 10, padding: "2px 4px",
          opacity: 0.5,
        }}>✕</button>
      )}
    </div>
  );
}
