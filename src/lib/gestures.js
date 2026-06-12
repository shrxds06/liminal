/* ------------------------------------------------------------------ */
/*  gestures.js — 21-landmark → gesture classifier                     */
/*                                                                     */
/*  Landmark map (MediaPipe Hands):                                    */
/*    0 wrist · 4 thumb tip · 8 index tip · 12 middle tip              */
/*    16 ring tip · 20 pinky tip · pip joints at tip-2                 */
/* ------------------------------------------------------------------ */

/* ---------------- tuning ------------------------------------------ */
export const PINCH_THRESHOLD = 0.12; // ↓ = tighter pinch required to engage zoom

const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// A finger is "extended" when its tip sits further from the wrist than
// its pip joint by a margin. Rotation-tolerant — no y-axis assumption.
function extended(landmarks, tip, pip, margin = 1.12) {
  const wrist = landmarks[0];
  return d(landmarks[tip], wrist) > d(landmarks[pip], wrist) * margin;
}

function thumbExtended(landmarks) {
  // thumb measured against index mcp — splayed thumbs read as extended
  return d(landmarks[4], landmarks[17]) > d(landmarks[3], landmarks[17]) * 1.05;
}

/**
 * Classify a single frame of landmarks.
 *
 * Priority order is deliberate (PRD §6.2):
 *   1. pinch  — thumb+index gap < 0.12 is ALWAYS zoom, regardless of
 *               other finger states. Prevents false positives.
 *   2. two    — index + middle up, ring + pinky curled
 *   3. point  — index up, others curled
 *   4. open   — all four fingers extended
 *   5. fist   — all four fingers curled
 *
 * Returns { type, pinchGap, pinchMid, palm, indexTip }
 */
export function detectGesture(landmarks) {
  if (!landmarks || landmarks.length < 21) return { type: "none" };

  const pinchGap = d(landmarks[4], landmarks[8]);
  const pinchMid = {
    x: (landmarks[4].x + landmarks[8].x) / 2,
    y: (landmarks[4].y + landmarks[8].y) / 2,
  };
  // palm centre — wrist + middle mcp midpoint, stabler than wrist alone
  const palm = {
    x: (landmarks[0].x + landmarks[9].x) / 2,
    y: (landmarks[0].y + landmarks[9].y) / 2,
  };
  const indexTip = { x: landmarks[8].x, y: landmarks[8].y };

  const base = { pinchGap, pinchMid, palm, indexTip };

  // 1 — pinch wins over everything
  if (pinchGap < PINCH_THRESHOLD) return { type: "pinch", ...base };

  const idx = extended(landmarks, 8, 6);
  const mid = extended(landmarks, 12, 10);
  const ring = extended(landmarks, 16, 14);
  const pinky = extended(landmarks, 20, 18);
  const up = [idx, mid, ring, pinky].filter(Boolean).length;

  // 2 — two-finger (before open palm)
  if (idx && mid && !ring && !pinky) return { type: "two", ...base };

  // 3 — point
  if (idx && !mid && !ring && !pinky) return { type: "point", ...base };

  // 4 — open palm (allow one missed finger for tracking noise)
  if (up >= 3 && thumbExtended(landmarks)) return { type: "open", ...base };

  // 5 — fist
  if (up === 0) return { type: "fist", ...base };

  return { type: "none", ...base };
}
