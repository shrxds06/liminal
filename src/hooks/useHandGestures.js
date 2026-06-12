/* ------------------------------------------------------------------ */
/*  useHandGestures.js — gallery gesture engine                        */
/*                                                                     */
/*  Owns its own MediaPipe instance (separate from the startup         */
/*  screen's). Smooths palm / pinch on the MOTION layer and emits one  */
/*  classified, smoothed frame per camera frame via onFrame.           */
/*  Interaction semantics live in Gallery.jsx — this hook stays        */
/*  generic.                                                           */
/* ------------------------------------------------------------------ */

import { useEffect, useRef, useState } from "react";
import { detectGesture } from "../lib/gestures.js";
import { createSkeletonRenderer } from "../lib/handDraw.js";

/* ---------------- tuning ------------------------------------------ */
const SMOOTH = 0.4;        // motion-layer EMA α — ↓ smoother/laggier, ↑ snappier
const CAMERA_RETRIES = 4;  // camera.start() attempts surviving startup→gallery handoff
const RETRY_DELAY = 500;   // ms between retries

const ema = (prev, next, a) => (prev == null ? next : prev + (next - prev) * a);

/**
 * @param videoRef    hidden <video> for the gallery's camera feed
 * @param canvasRef   small skeleton preview canvas (optional)
 * @param enabled     gesture toggle
 * @param onFrame     ({ type, palm, pinchGap, pinchMid, indexTip }) per frame,
 *                    all coordinates mirrored + smoothed, or { type:"none" }
 *                    when the hand leaves the frame
 */
export function useHandGestures(videoRef, canvasRef, enabled, onFrame) {
  const [cameraError, setCameraError] = useState(false);
  const [tracking, setTracking] = useState(false);
  const frameRef = useRef(onFrame);
  frameRef.current = onFrame;

  useEffect(() => {
    if (!enabled) return;
    const video = videoRef.current;
    if (!video) return;

    if (!window.Hands || !window.Camera) {
      setCameraError(true);
      return;
    }

    let disposed = false;
    const canvas = canvasRef?.current || null;
    const ctx = canvas ? canvas.getContext("2d") : null;
    const drawSkeleton = createSkeletonRenderer();

    // motion-layer EMA state
    const s = { px: null, py: null, gap: null, mx: null, my: null, ix: null, iy: null };

    const hands = new window.Hands({
      locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`,
    });
    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.6,
    });

    hands.onResults((results) => {
      if (disposed) return;
      const lm = results.multiHandLandmarks?.[0] || null;

      if (ctx) drawSkeleton(ctx, lm, canvas.width, canvas.height);

      if (!lm) {
        setTracking(false);
        Object.keys(s).forEach((k) => (s[k] = null)); // reset EMA on hand loss
        frameRef.current?.({ type: "none" });
        return;
      }
      setTracking(true);

      const raw = detectGesture(lm);

      // mirror x — the on-screen feed is mirrored, motion must match intuition
      const mirror = (p) => ({ x: 1 - p.x, y: p.y });
      const palm = mirror(raw.palm);
      const mid = mirror(raw.pinchMid);
      const tip = mirror(raw.indexTip);

      s.px = ema(s.px, palm.x, SMOOTH);
      s.py = ema(s.py, palm.y, SMOOTH);
      s.gap = ema(s.gap, raw.pinchGap, SMOOTH);
      s.mx = ema(s.mx, mid.x, SMOOTH);
      s.my = ema(s.my, mid.y, SMOOTH);
      s.ix = ema(s.ix, tip.x, SMOOTH);
      s.iy = ema(s.iy, tip.y, SMOOTH);

      frameRef.current?.({
        type: raw.type,
        palm: { x: s.px, y: s.py },
        pinchGap: s.gap,
        pinchMid: { x: s.mx, y: s.my },
        indexTip: { x: s.ix, y: s.iy },
      });
    });

    const camera = new window.Camera(video, {
      onFrame: async () => {
        if (!disposed) await hands.send({ image: video });
      },
      width: 640,
      height: 480,
    });

    // Camera handoff from the startup screen can race the previous
    // instance's teardown — retry start() up to CAMERA_RETRIES times.
    let attempt = 0;
    const tryStart = () => {
      if (disposed) return;
      camera.start().then(
        () => setCameraError(false),
        () => {
          attempt += 1;
          if (attempt < CAMERA_RETRIES) {
            setTimeout(tryStart, RETRY_DELAY);
          } else {
            // soft failure — gestures stay enabled so a permission grant
            // can recover without re-toggling
            setCameraError(true);
          }
        }
      );
    };
    tryStart();

    return () => {
      disposed = true;
      try { camera.stop(); } catch { /* already stopped */ }
      try { hands.close(); } catch { /* already closed */ }
    };
  }, [enabled, videoRef, canvasRef]);

  return { cameraError, tracking };
}
