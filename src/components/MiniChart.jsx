import { C } from "../constants/colors";

/**
 * ローソク足ミニチャート（SVG）
 */
export default function MiniChart({ data, count = 60 }) {
  const sl = data.slice(-count);
  const W = 700, H = 140;
  const P = { t: 8, r: 48, b: 14, l: 8 };
  const iw = W - P.l - P.r;
  const ih = H - P.t - P.b;
  const prices = sl.flatMap((d) => [d.h, d.l]);
  const mn = Math.min(...prices) * 0.998;
  const mx = Math.max(...prices) * 1.002;
  const x = (i) => P.l + (i / (sl.length - 1)) * iw;
  const y = (v) => P.t + (1 - (v - mn) / (mx - mn)) * ih;
  const cw = Math.max(2, (iw / sl.length) * 0.5);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxHeight: 140 }}>
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
    </svg>
  );
}
