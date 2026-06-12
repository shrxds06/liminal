/* ------------------------------------------------------------------ */
/*  CanvasItem.jsx — 4-layer photo / sticky / sticker renderer         */
/*                                                                     */
/*  Layer 1  position   left/top + burst scale (transition ONLY        */
/*                      during reveal — pan must be instant)           */
/*  Layer 2  scatter    rotate(item.rotation), no transition           */
/*  Layer 3  flat       translate via --ptx/--pty × depth, instant     */
/*  Layer 4  3D/hover   perspective rotate via --px/--py × depth,      */
/*                      hover/highlight/drag scale + shadow,           */
/*                      0.30–0.42s ease-out                            */
/*                                                                     */
/*  Collapsing these layers breaks something every time: a transition  */
/*  on layer 1 makes panning laggy; parallax on a transitioned layer   */
/*  feels sticky. Keep them separate.                                  */
/* ------------------------------------------------------------------ */

import React, { memo, useState } from "react";

/* ---------------- tuning ------------------------------------------ */
export const BURST_EASE = "cubic-bezier(0.34, 1.56, 0.64, 1)"; // spring overshoot
export const BURST_DUR = 0.84;   // seconds per item
export const STAGGER_MAX = 300;  // ms — index-proportional, spiral draws itself

const SHADOWS = {
  rest: "drop-shadow(0 4px 18px rgba(0,0,0,0.10))",
  hover: "drop-shadow(0 16px 32px rgba(0,0,0,0.22))",
  highlight: "drop-shadow(0 20px 40px rgba(0,0,0,0.26))",
  drag: "drop-shadow(0 26px 48px rgba(0,0,0,0.30))",
};

function PhotoBody({ item }) {
  if (item.frame === "polaroid") {
    return (
      <div style={{ background: "#fff", padding: "10px 10px 38px" }}>
        <img src={item.src} alt="" style={{ width: item.w, height: "auto" }} />
      </div>
    );
  }
  if (item.frame === "gingham") {
    return (
      <div
        style={{
          padding: 9,
          background:
            "repeating-conic-gradient(#9db8d9 0% 25%, #ffffff 0% 50%) 0 0 / 14px 14px",
        }}
      >
        <img src={item.src} alt="" style={{ width: item.w, height: "auto" }} />
      </div>
    );
  }
  return <img src={item.src} alt="" style={{ width: item.w, height: "auto" }} />;
}

function StickyBody({ item }) {
  return (
    <div
      style={{
        width: item.w,
        minHeight: item.w * 0.92,
        background: item.color,
        padding: "16px 14px",
        fontSize: 17,
        fontStyle: "italic",
        lineHeight: 1.4,
        whiteSpace: "pre-line",
        color: "rgba(26,26,26,0.78)",
        boxShadow: "inset 0 -22px 28px rgba(0,0,0,0.04)",
      }}
    >
      {item.text}
    </div>
  );
}

function StickerBody({ item }) {
  return (
    <div style={{ fontSize: item.w, lineHeight: 1, color: "rgba(26,26,26,0.72)" }}>
      {item.glyph}
    </div>
  );
}

function CanvasItem({ item, revealed, highlighted, dragged, mode3d, onPointerDown }) {
  const [hover, setHover] = useState(false);

  const scale = dragged ? 1.08 : highlighted ? 1.12 : hover ? 1.04 : 1;
  const filter = dragged
    ? SHADOWS.drag
    : highlighted
      ? SHADOWS.highlight
      : hover
        ? SHADOWS.hover
        : SHADOWS.rest;

  const stagger = Math.min(item.index * 24, STAGGER_MAX);

  return (
    /* ---- layer 1 · position + burst -------------------------------- */
    <div
      onMouseDown={(e) => onPointerDown?.(e, item)}
      style={{
        position: "absolute",
        left: revealed ? item.x : 0,
        top: revealed ? item.y : 0,
        transform: `translate(-50%, -50%) scale(${revealed ? 1 : 0})`,
        opacity: revealed ? 1 : 0,
        transition: revealed
          ? `left ${BURST_DUR}s ${BURST_EASE} ${stagger}ms,
             top ${BURST_DUR}s ${BURST_EASE} ${stagger}ms,
             transform ${BURST_DUR}s ${BURST_EASE} ${stagger}ms,
             opacity ${BURST_DUR * 0.7}s ease ${stagger}ms`
          : "none",
        cursor: dragged ? "grabbing" : "grab",
        willChange: "transform",
        zIndex: dragged ? 30 : highlighted ? 20 : 1,
      }}
    >
      {/* ---- layer 2 · organic scatter, instant ---------------------- */}
      <div style={{ transform: `rotate(${item.rotation}deg)` }}>
        {/* ---- layer 3 · flat parallax, instant ----------------------- */}
        <div
          style={{
            transform: `translate(
              calc(var(--ptx, 0px) * ${item.depth}),
              calc(var(--pty, 0px) * ${item.depth})
            )`,
          }}
        >
          {/* ---- layer 4 · 3D mode + hover, eased ---------------------- */}
          <div
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
              transform: mode3d
                ? `perspective(600px)
                   rotateY(calc((var(--px, 0deg) + ${item.cylY || 0}deg) * ${item.depth}))
                   rotateX(calc(var(--py, 0deg) * ${item.depth}))
                   scale(${scale})`
                : `scale(${scale})`,
              filter,
              transition: "transform 0.42s ease-out, filter 0.30s ease-out",
            }}
          >
            {item.kind === "photo" && <PhotoBody item={item} />}
            {item.kind === "sticky" && <StickyBody item={item} />}
            {item.kind === "sticker" && <StickerBody item={item} />}
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(CanvasItem);
