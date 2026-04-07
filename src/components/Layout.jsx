import { C } from "../constants/colors";

/**
 * 3カラムレイアウト（Opus Stocks参考）
 * 左: ウォッチリスト（220px）
 * 中央: メインコンテンツ（6タブ）
 * 右: Signalスコア＋規律（260px）
 */
export default function Layout({ left, header, main, right, footer }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      minHeight: "100vh", background: C.bg,
      fontFamily: "'Noto Sans JP','JetBrains Mono',sans-serif",
    }}>
      {/* ヘッダー（全幅） */}
      {header && (
        <div style={{
          borderBottom: `1px solid ${C.border}`,
          background: C.card,
          padding: "0 16px",
          flexShrink: 0,
        }}>
          {header}
        </div>
      )}

      {/* 3カラム本体 */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* 左サイドバー */}
        <div style={{
          width: 220, flexShrink: 0,
          borderRight: `1px solid ${C.border}`,
          background: C.card,
          overflowY: "auto",
          display: "flex", flexDirection: "column",
        }}>
          {left}
        </div>

        {/* メインエリア */}
        <div style={{
          flex: 1, overflowY: "auto",
          padding: "16px 20px",
          background: C.bg,
        }}>
          {main}
        </div>

        {/* 右サイドバー */}
        <div style={{
          width: 260, flexShrink: 0,
          borderLeft: `1px solid ${C.border}`,
          background: C.card,
          overflowY: "auto",
          padding: "16px",
        }}>
          {right}
        </div>
      </div>

      {/* フッター */}
      {footer && (
        <div style={{
          borderTop: `1px solid ${C.border}`,
          padding: "8px 16px",
          fontSize: 11, color: C.dim,
          textAlign: "center", lineHeight: 1.8,
          background: C.card, flexShrink: 0,
        }}>
          {footer}
        </div>
      )}
    </div>
  );
}
