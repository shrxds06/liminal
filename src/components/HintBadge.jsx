/* ------------------------------------------------------------------ */
/*  HintBadge.jsx — fading instruction badge                           */
/* ------------------------------------------------------------------ */

import React from "react";
import { COLORS } from "../lib/constants.js";

export default function HintBadge({ children, duration = 7, bottom = 92 }) {
  return (
    <div
      style={{
        position: "fixed",
        bottom,
        left: "50%",
        transform: "translateX(-50%)",
        padding: "10px 22px",
        borderRadius: 999,
        background: "rgba(255,255,255,0.55)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        color: COLORS.text,
        fontSize: 15,
        fontWeight: 400,
        letterSpacing: "0.06em",
        whiteSpace: "nowrap",
        animation: `hint-fade ${duration}s ease forwards`,
        pointerEvents: "none",
        zIndex: 60,
      }}
    >
      {children}
    </div>
  );
}
