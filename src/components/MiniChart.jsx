import { useMemo } from "react";
import { C } from "../constants/colors";
import { detectCandlePatterns } from "../indicators/candlePatterns";
import { findLocalMaxima, findLocalMinima } from "../indicators/chartPatterns";

/**
 * ローソク足ミニチャート（SVG）
 * - 支持線/抵抗線の自動描画
 * - ローソク足パターンのマーカー表示
 */
export default function MiniChart({ data, count = 60, showPatterns = true }) {
  const sl = data.slice(-count);
  const W = 700, H = showPatterns ? 170 : 140;
  const P = { t: 8, r: 48, b: showPatterns ? 28 : 14, l: 8 };
  const iw = W - P.l - P.r;
  const ih = H - P.t - P.b;
  const prices = sl.flatMap((d) => [d.h, d.l]);
  const mn = Math.min(...prices) * 0.998;
  const mx = Math.max(...prices) * 1.002;
  const x = (i) => P.l + (i / (sl.length - 1)) * iw;
  const y = (v) => P.t + (1 - (v - mn) / (mx - mn)) * ih;
  const cw = Math.max(2, (iw / sl.length) * 0.5);

  // 支持線/抵抗線を検出
  const levels = useMemo(() => {
    if (sl.length < 10) return [];
    const maxima = findLocalMaxima(sl, 5);
    const minima = findLocalMinima(sl, 5);

    // 同じ水準（±1.5%）で2回以上反発/反落したポイントを支持線/抵抗線とする
    const allLevels = [];
    const tolerance = 0.015;

    // 抵抗線（高値が止まるポイント）
    const resistGroups = [];
    maxima.forEach(({ value }) => {
      const group = resistGroups.find((g) => Math.abs(g.level - value) / g.level < tolerance);
      if (group) { group.count++; group.level = (group.level + value) / 2; }
      else resistGroups.push({ level: value, count: 1, type: "resist" });
    });

    // 支持線（安値が止まるポイント）
    const supportGroups = [];
    minima.forEach(({ value }) => {
      const group = supportGroups.find((g) => Math.abs(g.level - value) / g.level < tolerance);
      if (group) { group.count++; group.level = (group.level + value) / 2; }
      else supportGroups.push({ level: value, count: 1, type: "support" });
    });

    return [
      ...resistGroups.filter((g) => g.count >= 2),
      ...supportGroups.filter((g) => g.count >= 2),
    ].slice(0, 4); // 最大4本
  }, [sl]);

  // ローソク足パターン検出（直近10本のみ）
  const patterns = useMemo(() => {
    if (!showPatterns || sl.length < 10) return [];
    const detected = [];
    const startIdx = Math.max(0, sl.length - 10);
    for (let i = startIdx; i < sl.length; i++) {
      const p = detectCandlePatterns(sl, i);
      if (p.length > 0) {
        detected.push({ index: i, patterns: p });
      }
    }
    return detected;
  }, [sl, showPatterns]);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxHeight: H }}>
      {/* グリッドライン */}
      {[0, 0.5, 1].map((f) => {
        const v = mn + (mx - mn) * f;
        return (
          <g key={f}>
            <line x1={P.l} y1={y(v)} x2={W - P.r} y2={y(v)} stroke="#152035" strokeWidth="0.5" />
            <text x={W - P.r + 4} y={y(v) + 4} fill={C.dim} fontSize="9" fontFamily="monospace">
              {v.toFixed(v > 1000 ? 0 : 1)}
            </text>
          </g>
        );
      })}

      {/* 支持線/抵抗線 */}
      {levels.map((lv, i) => {
        const lineY = y(lv.level);
        if (lineY < P.t || lineY > H - P.b) return null;
        const col = lv.type === "resist" ? "#ff525280" : "#00e67680";
        return (
          <g key={`level-${i}`}>
            <line x1={P.l} y1={lineY} x2={W - P.r} y2={lineY}
              stroke={col} strokeWidth="1" strokeDasharray="4,3" />
            <text x={P.l + 4} y={lineY - 3} fill={col} fontSize="7" fontFamily="monospace">
              {lv.type === "resist" ? "抵抗" : "支持"} {lv.level.toFixed(lv.level > 1000 ? 0 : 1)}
            </text>
          </g>
        );
      })}

      {/* ローソク足 */}
      {sl.map((d, i) => {
        const bull = d.c >= d.o;
        const col = bull ? "#00c853" : "#ff1744";
        return (
          <g key={i}>
            <line x1={x(i)} y1={y(d.h)} x2={x(i)} y2={y(d.l)} stroke={col} strokeWidth="0.8" />
            <rect
              x={x(i) - cw / 2}
              y={y(Math.max(d.o, d.c))}
              width={cw}
              height={Math.max(0.5, Math.abs(y(d.o) - y(d.c)))}
              fill={bull ? "none" : col}
              stroke={col}
              strokeWidth="0.8"
            />
          </g>
        );
      })}

      {/* パターンマーカー */}
      {patterns.map(({ index, patterns: ps }) => {
        const bestPattern = ps.reduce((a, b) => b.strength > a.strength ? b : a, ps[0]);
        const markerCol = bestPattern.signal === "buy" ? "#00e676" : bestPattern.signal === "sell" ? "#ff5252" : "#ffab40";
        const markerY = bestPattern.signal === "buy" ? y(sl[index].l) + 10 : y(sl[index].h) - 10;
        const arrow = bestPattern.signal === "buy" ? "▲" : bestPattern.signal === "sell" ? "▼" : "◆";
        return (
          <g key={`pat-${index}`}>
            <text x={x(index)} y={markerY} fill={markerCol} fontSize="10" textAnchor="middle" fontWeight="bold">
              {arrow}
            </text>
            <text x={x(index)} y={markerY + (bestPattern.signal === "buy" ? 10 : -4)} fill={markerCol} fontSize="6" textAnchor="middle">
              {bestPattern.nameJa}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
