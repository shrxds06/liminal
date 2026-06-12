/* ------------------------------------------------------------------ */
/*  handDraw.js — skeleton rendering + overlay smoothing               */
/*                                                                     */
/*  The drawn skeleton uses its OWN EMA (separate from the motion      */
/*  layer in useHandGestures). Visuals can be smoother than gesture    */
/*  response without making interactions feel laggy.                   */
/* ------------------------------------------------------------------ */

import { COLORS } from "./constants.js";

/* ---------------- tuning ------------------------------------------ */
export const DRAW_SMOOTH = 0.5; // EMA α for skeleton — ↓ smoother, laggier

const CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],          // thumb
  [0, 5], [5, 6], [6, 7], [7, 8],          // index
  [5, 9], [9, 10], [10, 11], [11, 12],     // middle
  [9, 13], [13, 14], [14, 15], [15, 16],   // ring
  [13, 17], [17, 18], [18, 19], [19, 20],  // pinky
  [0, 17],                                  // palm edge
];

export function createSkeletonRenderer() {
  let smoothed = null; // persistent EMA state across frames

  return function draw(ctx, landmarks, width, height) {
    ctx.clearRect(0, 0, width, height);
    if (!landmarks) {
      smoothed = null;
      return;
    }

    if (!smoothed) {
      smoothed = landmarks.map((p) => ({ x: p.x, y: p.y }));
    } else {
      for (let i = 0; i < landmarks.length; i++) {
        smoothed[i].x += (landmarks[i].x - smoothed[i].x) * DRAW_SMOOTH;
        smoothed[i].y += (landmarks[i].y - smoothed[i].y) * DRAW_SMOOTH;
      }
    }

    // bones
    ctx.strokeStyle = COLORS.bones;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.globalAlpha = 0.9;
    for (const [a, b] of CONNECTIONS) {
      ctx.beginPath();
      ctx.moveTo(smoothed[a].x * width, smoothed[a].y * height);
      ctx.lineTo(smoothed[b].x * width, smoothed[b].y * height);
      ctx.stroke();
    }

    // joints
    ctx.globalAlpha = 1;
    ctx.fillStyle = COLORS.joints;
    for (const p of smoothed) {
      ctx.beginPath();
      ctx.arc(p.x * width, p.y * height, 3.4, 0, Math.PI * 2);
      ctx.fill();
    }
  };
}
