import { useState } from "react";
import { C } from "../constants/colors";
import { F } from "../constants/fonts";

/**
 * 上部ナビゲーション（8モジュール → 4カテゴリグループ）
 * CLAUDE.md: 8タブでは多すぎるため、カテゴリグループ化
 * 「分析する」「記録する」「規律する」「学習する」の4グループ
 */
const GROUPS = [
  {
    label: "🔍 分析",
    pages: [
      ["screen", "☀️ 銘柄発見", "スクリーナー"],
      ["signal", "📊 Signal", "テクニカル"],
      ["research", "🔬 Research", "ファンダ"],
    ],
  },
  {
    label: "📝 記録",
    pages: [
      ["hypo", "💡 仮説", "ジャーナル"],
      ["trade", "💰 売買", "トレード記録"],
    ],
  },
  {
    label: "🛡️ 規律",
    pages: [
      ["disc", "🛡️ 規律", "心理・資金"],
      ["cost", "🧮 コスト", "実質リターン"],
    ],
  },
  {
    label: "📚 学習",
    pages: [
      ["roadmap", "🗺️ ロードマップ", "初心者ガイド"],
    ],
  },
];

export default function Navigation({ page, setPage, activeHypoCount }) {
  const [openGroup, setOpenGroup] = useState(() => {
    for (const g of GROUPS) {
      if (g.pages.some(([k]) => k === page)) return g.label;
    }
    return GROUPS[0].label;
  });

  // 現在のページ名を取得
  const currentPageInfo = GROUPS.flatMap((g) => g.pages).find(([k]) => k === page);

  return (
    <div style={{ marginBottom: 18 }}>
      {/* カテゴリグループ */}
      <div style={{
        display: "flex", gap: 0, borderRadius: "10px 10px 0 0", overflow: "hidden",
        border: `1.5px solid ${C.border}`, borderBottom: "none",
      }}>
        {GROUPS.map((g) => {
          const isActive = g.pages.some(([k]) => k === page);
          const isOpen = openGroup === g.label;
          return (
            <button key={g.label} onClick={() => setOpenGroup(g.label)} style={{
              flex: 1, padding: "10px 6px", cursor: "pointer", fontFamily: "inherit", border: "none",
              background: isActive ? `${C.accent}18` : isOpen ? `${C.border}40` : C.card,
              color: isActive ? C.accent : isOpen ? C.text : C.dim,
              borderRight: `1px solid ${C.border}`, transition: "all 0.15s",
            }}>
              <div style={{ fontSize: F.sm, fontWeight: 700 }}>{g.label}</div>
            </button>
          );
        })}
      </div>

      {/* サブページ */}
      <div style={{
        display: "flex", gap: 0, borderRadius: "0 0 10px 10px", overflow: "hidden",
        border: `1.5px solid ${C.border}`, borderTop: `1px solid ${C.border}`,
      }}>
        {GROUPS.find((g) => g.label === openGroup)?.pages.map(([k, label, sub]) => {
          const displayLabel = k === "hypo" ? `💡 仮説(${activeHypoCount})` : label;
          return (
            <button key={k} onClick={() => setPage(k)} style={{
              flex: 1, padding: "12px 8px", cursor: "pointer", fontFamily: "inherit", border: "none",
              background: page === k ? `${C.accent}20` : C.card,
              color: page === k ? C.accent : C.dim,
              borderRight: `1px solid ${C.border}`, transition: "all 0.15s",
            }}>
              <div style={{ fontSize: F.sm, fontWeight: 700 }}>{displayLabel}</div>
              <div style={{ fontSize: F.label, opacity: 0.6, marginTop: 2 }}>{sub}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
