// ───────────────────────────────────────────────────────────────
// Gesture recognition
//
// MediaPipe Hands returns 21 normalized landmarks per hand:
//   0 wrist · 4 thumb tip · 8 index tip · 12 middle tip · 16 ring tip · 20 pinky tip
//   5/9/13/17 = the matching knuckles (MCP)
// Coordinates are 0..1, y growing DOWNWARD.
//
// Gallery gesture map:
//   • fist (all curled)              → FIST   re-form the cylinder
//   • two fingers (index+middle up)  → TWO    turn the cylinder
//   • open palm (all four up)        → OPEN   burst into the flat spread
//   • pinch (thumb+index close)      → ZOOM   dolly in / out
//   • index only                     → POINT  (parked)
// ───────────────────────────────────────────────────────────────

const EXTEND_MARGIN = 0.03

function fingerStates(lm) {
  return {
    iUp: lm[8].y < lm[5].y - EXTEND_MARGIN,
    mUp: lm[12].y < lm[9].y - EXTEND_MARGIN,
    rUp: lm[16].y < lm[13].y - EXTEND_MARGIN,
    pUp: lm[20].y < lm[17].y - EXTEND_MARGIN,
  }
}

// Standalone fist check — used by the startup screen.
export function isFist(lm) {
  if (!lm?.length) return false
  const { iUp, mUp, rUp, pUp } = fingerStates(lm)
  return !iUp && !mUp && !rUp && !pUp
}

// Clearly-open hand — used by the startup screen's fist→open trigger.
export function isOpenHand(lm) {
  if (!lm?.length) return false
  const { iUp, mUp, rUp, pUp } = fingerStates(lm)
  return iUp && mUp && rUp && pUp
}

export function detectGesture(lm) {
  if (!lm?.length) return null

  const thumbTip = lm[4]
  const indexTip = lm[8]

  // Palm centroid — drives turning/scroll
  const cx = lm.reduce((s, p) => s + p.x, 0) / lm.length
  const cy = lm.reduce((s, p) => s + p.y, 0) / lm.length

  const pinch = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y)
  const { iUp, mUp, rUp, pUp } = fingerStates(lm)

  // Fist → re-form cylinder
  if (!iUp && !mUp && !rUp && !pUp) return { type: "fist", cx, cy }

  // Pinch → zoom (checked before the finger poses; pose-agnostic)
  if (pinch < 0.12) {
    return { type: "zoom", pinch, cx, cy }
  }

  // Open palm (all four) → burst to flat spread
  if (iUp && mUp && rUp && pUp) return { type: "open", cx, cy }

  // Two fingers (index + middle up, ring + pinky curled) → turn cylinder
  if (iUp && mUp && !rUp && !pUp) return { type: "two", cx, cy }

  // Index only → point (parked)
  if (iUp && !mUp && !rUp && !pUp) {
    return { type: "point", x: 1 - indexTip.x, y: indexTip.y }
  }

  return { type: "idle" }
}
