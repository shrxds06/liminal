/* ------------------------------------------------------------------ */
/*  Lightbox.jsx — fullscreen item preview                             */
/* ------------------------------------------------------------------ */

import React, { useEffect } from "react";

export default function Lightbox({ item, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!item) return null;

  const body =
    item.kind === "photo" ? (
      item.frame === "polaroid" ? (
        <div style={{ background: "#fff", padding: "18px 18px 64px" }}>
          <img src={item.src} alt="" style={{ maxWidth: "76vw", maxHeight: "66vh" }} />
        </div>
      ) : item.frame === "gingham" ? (
        <div
          style={{
            padding: 16,
            background:
              "repeating-conic-gradient(#9db8d9 0% 25%, #ffffff 0% 50%) 0 0 / 18px 18px",
          }}
        >
          <img src={item.src} alt="" style={{ maxWidth: "78vw", maxHeight: "72vh" }} />
        </div>
      ) : (
        <img src={item.src} alt="" style={{ maxWidth: "82vw", maxHeight: "78vh" }} />
      )
    ) : item.kind === "sticky" ? (
      <div
        style={{
          background: item.color,
          padding: "56px 48px",
          fontSize: 34,
          fontStyle: "italic",
          whiteSpace: "pre-line",
          lineHeight: 1.45,
          maxWidth: "70vw",
        }}
      >
        {item.text}
      </div>
    ) : (
      <div style={{ fontSize: 180 }}>{item.glyph}</div>
    );

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(40,30,12,0.42)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        animation: "lightbox-fade 0.28s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          animation: "lightbox-spring 0.34s cubic-bezier(0.34, 1.4, 0.64, 1)",
          filter: "drop-shadow(0 32px 80px rgba(0,0,0,0.35))",
        }}
      >
        {body}
      </div>

      <button
        onClick={onClose}
        aria-label="Close preview"
        style={{
          position: "fixed",
          top: 26,
          right: 30,
          width: 46,
          height: 46,
          borderRadius: "50%",
          background: "rgba(255,243,209,0.92)",
          color: "#1a1a1a",
          fontSize: 22,
          fontWeight: 300,
        }}
      >
        ×
      </button>
    </div>
  );
}
