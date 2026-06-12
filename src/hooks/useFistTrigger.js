/* ------------------------------------------------------------------ */
/*  useFistTrigger.js — startup screen: fist → open palm detection     */
/* ------------------------------------------------------------------ */

import { useEffect, useRef, useState } from "react";
import { detectGesture } from "../lib/gestures.js";
import { createSkeletonRenderer } from "../lib/handDraw.js";

/* ---------------- tuning ------------------------------------------ */
const FIST_FRAMES = 4; // consecutive fist frames to arm
const OPEN_FRAMES = 3; // consecutive open frames to fire (jitter guard)

/**
 * Owns its own MediaPipe Hands + Camera instance for the startup screen.
 *
 * @param videoRef   <video> element ref (webcam feed)
 * @param canvasRef  <canvas> element ref (skeleton overlay)
 * @param onTrigger  called once when fist → open palm completes
 *
 * Returns { armed, cameraError, handVisible }
 */
export function useFistTrigger(videoRef, canvasRef, onTrigger) {
  const [armed, setArmed] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [handVisible, setHandVisible] = useState(false);

  const firedRef = useRef(false);
  const fistCountRef = useRef(0);
  const openCountRef = useRef(0);
  const armedRef = useRef(false);
  const triggerRef = useRef(onTrigger);
  triggerRef.current = onTrigger;

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    if (!window.Hands || !window.Camera) {
      setCameraError(true); // CDN blocked (ad-blocker) — fall back to click
      return;
    }

    let disposed = false;
    const drawSkeleton = createSkeletonRenderer();
    const ctx = canvas.getContext("2d");

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
      setHandVisible(!!lm);
      drawSkeleton(ctx, lm, canvas.width, canvas.height);
      if (!lm || firedRef.current) return;

      const g = detectGesture(lm);

      if (!armedRef.current) {
        // phase 1 — hold a fist to arm
        fistCountRef.current = g.type === "fist" ? fistCountRef.current + 1 : 0;
        if (fistCountRef.current >= FIST_FRAMES) {
          armedRef.current = true;
          setArmed(true);
          openCountRef.current = 0;
        }
      } else {
        // phase 2 — open the palm to fire
        openCountRef.current = g.type === "open" ? openCountRef.current + 1 : 0;
        if (openCountRef.current >= OPEN_FRAMES) {
          firedRef.current = true;
          triggerRef.current?.();
        }
      }
    });

    const camera = new window.Camera(video, {
      onFrame: async () => {
        if (!disposed) await hands.send({ image: video });
      },
      width: 640,
      height: 480,
    });

    camera
      .start()
      .catch(() => !disposed && setCameraError(true));

    return () => {
      disposed = true;
      try { camera.stop(); } catch { /* already stopped */ }
      try { hands.close(); } catch { /* already closed */ }
    };
  }, [videoRef, canvasRef]);

  return { armed, cameraError, handVisible };
}
