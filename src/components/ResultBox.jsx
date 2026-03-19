import { F } from "../constants/fonts";
import { C } from "../constants/colors";

/**
 * AI分析結果の表示ボックス
 */
export default function ResultBox({ text }) {
  if (!text) return null;

  return (
    <div style={{
      background: "#0e1a30",
      borderRadius: 8,
      padding: 16,
      fontSize: F.sm,
      color: C.text,
      lineHeight: 2,
      whiteSpace: "pre-wrap",
      marginTop: 10,
      animation: "fadeIn 0.3s",
    }}>
      {text}
    </div>
  );
}
