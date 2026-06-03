import { CYL } from "../lib/constants.js"

// ───────────────────────────────────────────────────────────────
// CanvasItem (geometric cylinder ⇄ spread)
//
// rv  = reveal     (0 collapsed at center → 1 placed)
// m   = morph      (0 cylinder → 1 flat spread)
//
// Cylinder placement is real 3D: rotateY(θ) translateZ(R) on a
// preserve-3d stage, so the parent <stage> can rotateY to TURN the whole
// cylinder and photos flow around it. The burst lerps θ→0, R→0 and slides
// each photo to its spread grid position, flattening the cylinder.
//
// rv / m are driven per-frame by the Gallery (no CSS transition on the
// transform, so panning the parent stage stays instant and the tweens
// stay smooth).
// ───────────────────────────────────────────────────────────────

const lr = (a, b, t) => a + (b - a) * t

export default function CanvasItem({ item, m, rv, spreadW = 1100, spreadH = 600, delay = 0 }) {
  const flat = m > 0.5

  // target (cylinder→spread by m), then collapse toward center by rv
  const ry = lr(item.theta, 0, m)
  const tz = lr(CYL.radius, 0, m) * rv
  const tx = lr(0, item.sx * spreadW, m) * rv
  const ty = lr(item.hy, item.sy * spreadH, m) * rv
  const rz = lr(item.tilt, item.frot, m)
  const s = lr(0.16, 1, rv) * lr(1, CYL.spreadScale, m)

  const transform =
    `translate(-50%, -50%) rotateY(${ry}deg) translateZ(${tz}px) ` +
    `translateX(${tx}px) translateY(${ty}px) rotateZ(${rz}deg) scale(${s})`

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        transformStyle: "preserve-3d",
        backfaceVisibility: flat ? "visible" : "hidden",
        transform,
        opacity: rv,
        transition: `opacity 0.4s ease ${delay}ms`,
      }}
    >
      {item.type === "photo" && <PhotoCard item={item} />}
      {item.type === "sticky" && <StickyCard item={item} />}
      {item.type === "sticker" && <StickerCard item={item} />}
    </div>
  )
}

function PhotoCard({ item }) {
  const { src, width: w = 160, height: h = 120, frame } = item
  const img = <img src={src} alt="" style={{ display: "block", width: w, height: h, objectFit: "cover" }} />
  if (frame === "polaroid") return <div style={{ background: "#FEFEFE", padding: "7px 7px 28px", boxShadow: "0 6px 22px rgba(0,0,0,0.12)" }}>{img}</div>
  if (frame === "gingham") return <div style={{ padding: 9, backgroundImage: "repeating-conic-gradient(#B2C8DA 0% 25%, #D4E8F2 0% 50%)", backgroundSize: "13px 13px", boxShadow: "0 6px 22px rgba(0,0,0,0.1)" }}><div style={{ padding: 5, background: "#FFF" }}>{img}</div></div>
  return <div style={{ boxShadow: "0 3px 16px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06)" }}>{img}</div>
}
function StickyCard({ item }) {
  return <div style={{ width: 130, minHeight: 118, background: item.color || "#FFF", padding: "13px 13px 9px", boxShadow: "0 4px 18px rgba(0,0,0,0.08)", fontFamily: "system-ui, sans-serif", fontSize: 13, color: "#444", lineHeight: 1.5 }}>{item.text || "…"}</div>
}
function StickerCard({ item }) {
  return <div style={{ fontSize: 60, lineHeight: 1, userSelect: "none" }}>{item.emoji}</div>
}
