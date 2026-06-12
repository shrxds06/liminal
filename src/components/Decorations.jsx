/* ------------------------------------------------------------------ */
/*  Decorations.jsx — SVG scrapbook ephemera, phyllotaxis-scattered    */
/*                                                                     */
/*  Lives inside the pan/zoom viewport but OUTSIDE the spiral rotor —  */
/*  ephemera reads as tape on the table while the memories turn        */
/*  above it.                                                          */
/* ------------------------------------------------------------------ */

import React, { useMemo } from "react";
import { makeDecorations } from "../lib/constants.js";

function Glyph({ type, color }) {
  switch (type) {
    case "tape":
      return (
        <rect x="0" y="0" width="120" height="30" fill={color} rx="1"
          style={{ mixBlendMode: "multiply" }} />
      );
    case "tapeWide":
      return (
        <rect x="0" y="0" width="170" height="44" fill={color} rx="1"
          style={{ mixBlendMode: "multiply" }} />
      );
    case "star":
      return (
        <path
          d="M30 2 L37 22 L58 22 L41 35 L47 56 L30 43 L13 56 L19 35 L2 22 L23 22 Z"
          fill={color}
        />
      );
    case "cross":
      return (
        <g stroke={color} strokeWidth="5" strokeLinecap="round">
          <line x1="6" y1="6" x2="34" y2="34" />
          <line x1="34" y1="6" x2="6" y2="34" />
        </g>
      );
    case "asterisk":
      return (
        <g stroke={color} strokeWidth="4.5" strokeLinecap="round">
          <line x1="24" y1="2" x2="24" y2="46" />
          <line x1="5" y1="13" x2="43" y2="35" />
          <line x1="43" y1="13" x2="5" y2="35" />
        </g>
      );
    case "dots":
      return (
        <g fill={color}>
          <circle cx="8" cy="8" r="5" />
          <circle cx="30" cy="14" r="4" />
          <circle cx="16" cy="32" r="6" />
          <circle cx="40" cy="36" r="3.5" />
        </g>
      );
    case "bracket":
      return (
        <path
          d="M4 44 L4 4 L44 4"
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
        />
      );
    default:
      return null;
  }
}

const SIZES = {
  tape: [120, 30],
  tapeWide: [170, 44],
  star: [60, 58],
  cross: [40, 40],
  asterisk: [48, 48],
  dots: [48, 44],
  bracket: [48, 48],
};

export default function Decorations() {
  const decs = useMemo(() => makeDecorations(), []);

  return (
    <>
      {decs.map((d) => {
        const [w, h] = SIZES[d.type];
        return (
          <svg
            key={d.id}
            width={w}
            height={h}
            viewBox={`0 0 ${w} ${h}`}
            style={{
              position: "absolute",
              left: d.x,
              top: d.y,
              transform: `translate(-50%, -50%) rotate(${d.rotation}deg) scale(${d.scale})`,
              opacity: d.opacity,
              pointerEvents: "none",
            }}
          >
            <Glyph type={d.type} color={d.color} />
          </svg>
        );
      })}
    </>
  );
}
