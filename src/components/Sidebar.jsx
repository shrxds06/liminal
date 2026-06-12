/* ------------------------------------------------------------------ */
/*  Sidebar.jsx — add memory panel                                     */
/* ------------------------------------------------------------------ */

import React from "react";
import { COLORS, STICKY_COLORS } from "../lib/constants.js";

const rowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  width: "100%",
  padding: "14px 0",
  borderBottom: "1px solid rgba(26,26,26,0.08)",
  fontSize: 15,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  fontWeight: 300,
  color: COLORS.text,
};

export default function Sidebar({ open, onClose, onAddPhoto, onAddSticky, onAddSticker }) {
  return (
    <aside
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: 280,
        padding: "84px 30px 30px",
        background: "rgba(255,248,226,0.88)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        borderLeft: "1px solid rgba(26,26,26,0.07)",
        transform: open ? "translateX(0)" : "translateX(102%)",
        transition: "transform 0.45s cubic-bezier(0.3, 1, 0.4, 1)",
        zIndex: 70,
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <button
        onClick={onClose}
        aria-label="Close panel"
        style={{ position: "absolute", top: 24, right: 26, fontSize: 22, fontWeight: 300, color: COLORS.text }}
      >
        ×
      </button>

      <h2 style={{ fontStyle: "italic", fontWeight: 300, fontSize: 30, marginBottom: 18 }}>
        add a memory
      </h2>

      <button style={rowStyle} onClick={onAddPhoto}>
        <span>Photo</span>
        <span style={{ color: COLORS.muted }}>+</span>
      </button>

      <button style={rowStyle} onClick={onAddSticky}>
        <span>Sticky note</span>
        <span style={{ display: "flex", gap: 4 }}>
          {STICKY_COLORS.slice(0, 3).map((c) => (
            <span key={c} style={{ width: 12, height: 12, background: c, borderRadius: 3 }} />
          ))}
        </span>
      </button>

      <button style={rowStyle} onClick={onAddSticker}>
        <span>Sticker</span>
        <span style={{ fontSize: 17 }}>✶</span>
      </button>

      <p style={{ marginTop: "auto", fontSize: 14, fontStyle: "italic", color: COLORS.muted, lineHeight: 1.5 }}>
        New memories join the spiral at its growing edge. Around 20 items keeps
        everything moving smoothly.
      </p>
    </aside>
  );
}
