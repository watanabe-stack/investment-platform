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
        {/* 左サイドバー（リサイズ可能） */}
        <div style={{
          width: 240, minWidth: 180, maxWidth: 400, flexShrink: 0,
          borderRight: `1px solid ${C.border}`,
          background: C.card,
          overflowY: "auto", overflow: "auto",
          display: "flex", flexDirection: "column",
          resize: "horizontal",
        }}>
          {left}
        </div>

        {/* メインエリア */}
        <div style={{
          flex: 1, overflowY: "auto",
          padding: "20px 24px",
          background: C.bg,
          minWidth: 400,
        }}>
          {main}
        </div>

        {/* 右サイドバー（リサイズ可能） */}
        <div style={{
          width: 280, minWidth: 200, maxWidth: 400, flexShrink: 0,
          borderLeft: `1px solid ${C.border}`,
          background: C.card,
          overflowY: "auto", overflow: "auto",
          padding: "16px",
          resize: "horizontal",
          direction: "rtl",
        }}>
          <div style={{ direction: "ltr" }}>
            {right}
          </div>
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
