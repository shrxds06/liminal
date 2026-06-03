import { useEffect, useRef } from "react"
import { detectGesture } from "../lib/gestures.js"
import { clamp } from "../lib/constants.js"

// ───────────────────────────────────────────────────────────────
// useHandGestures (cylinder ⇄ spread)
//
// Continuous pan deltas (px), emitted while the pose is held:
//   • two fingers → onTwo(dx, dy)    turn the cylinder
//   • open palm   → onOpen(dx, dy)   pan the spread
// One-shot mode switches (debounced, fire once per hold):
//   • open palm   → onOpenStart()    burst cylinder → spread
//   • fist        → onFist()         re-form the cylinder
// Pinch → onZoom(Δpx).
//
// MediaPipe loads as classic CDN scripts; motion is EMA-smoothed.
// ───────────────────────────────────────────────────────────────

const HANDS_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js"
const CAMERA_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js"
const ASSET_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/hands"

const SMOOTH = 0.4
const ema = (prev, next, a = SMOOTH) => (prev == null ? next : prev + a * (next - prev))

const PAN_GAIN = 1.6  // × viewport → px of pan per unit of normalized hand motion
const ZOOM_GAIN = 9   // pinch-gap delta → zoom factor
const ONESHOT_FRAMES = 3

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`)
    if (existing) {
      if (existing.dataset.loaded === "true") return resolve()
      existing.addEventListener("load", () => resolve())
      existing.addEventListener("error", reject)
      return
    }
    const s = document.createElement("script")
    s.src = src
    s.crossOrigin = "anonymous"
    s.onload = () => { s.dataset.loaded = "true"; resolve() }
    s.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.head.appendChild(s)
  })
}

export function useHandGestures({
  enabled, videoRef,
  onTwo, onOpen, onOpenStart, onFist, onZoom,
  onGesture, onLandmarks, onReady, onError,
}) {
  const handsRef = useRef(null)
  const cameraRef = useRef(null)
  const smPalm = useRef(null)
  const smGap = useRef(null)
  const held = useRef({ type: null, count: 0, fired: false })

  const cbs = useRef({})
  useEffect(() => {
    cbs.current = { onTwo, onOpen, onOpenStart, onFist, onZoom, onGesture, onLandmarks, onReady, onError }
  })

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    const vw = window.innerWidth
    const vh = window.innerHeight

    const panDelta = (g) => {
      const sx = ema(smPalm.current?.x, g.cx)
      const sy = ema(smPalm.current?.y, g.cy)
      let dx = 0, dy = 0
      if (smPalm.current) {
        dx = (smPalm.current.x - sx) * vw * PAN_GAIN
        dy = (smPalm.current.y - sy) * vh * PAN_GAIN
      }
      smPalm.current = { x: sx, y: sy }
      return [dx, dy]
    }

    const init = async () => {
      try {
        if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
          throw new Error("Camera requires a secure context — open at http://localhost:5173 or serve over HTTPS.")
        }
        await loadScript(HANDS_URL)
        await loadScript(CAMERA_URL)
        if (cancelled) return
        const Hands = window.Hands, Camera = window.Camera
        if (!Hands || !Camera) throw new Error("MediaPipe scripts loaded but window.Hands/Camera missing.")

        const hands = new Hands({ locateFile: (f) => `${ASSET_BASE}/${f}` })
        hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.65, minTrackingConfidence: 0.65 })

        hands.onResults(({ multiHandLandmarks }) => {
          if (cancelled) return
          const lm = multiHandLandmarks?.[0] || null
          cbs.current.onLandmarks?.(lm)
          const g = detectGesture(lm)

          // one-shot machine (open palm / fist)
          const oneShot = g && (g.type === "open" ? "open" : g.type === "fist" ? "fist" : null)
          if (held.current.type !== oneShot) held.current = { type: oneShot, count: 0, fired: false }
          if (oneShot) {
            held.current.count += 1
            if (!held.current.fired && held.current.count >= ONESHOT_FRAMES) {
              held.current.fired = true
              if (oneShot === "open") cbs.current.onOpenStart?.()
              else cbs.current.onFist?.()
            }
          }

          if (!g || g.type === "idle") {
            cbs.current.onGesture?.(null); smPalm.current = null; smGap.current = null; return
          }

          if (g.type === "two") {
            cbs.current.onGesture?.("turning")
            const [dx, dy] = panDelta(g)
            cbs.current.onTwo?.(dx, dy)
            smGap.current = null
          } else if (g.type === "open") {
            cbs.current.onGesture?.("spread")
            const [dx, dy] = panDelta(g)
            cbs.current.onOpen?.(dx, dy)
            smGap.current = null
          } else if (g.type === "zoom") {
            cbs.current.onGesture?.("zooming")
            const gap = ema(smGap.current, g.pinch)
            if (smGap.current !== null) {
              let d = clamp(gap - smGap.current, -0.05, 0.05)
              if (Math.abs(d) > 0.0008) cbs.current.onZoom?.(1 + d * ZOOM_GAIN)
            }
            smGap.current = gap; smPalm.current = null
          } else if (g.type === "fist") {
            cbs.current.onGesture?.("cylinder"); smPalm.current = null; smGap.current = null
          } else if (g.type === "point") {
            cbs.current.onGesture?.("pointing"); smPalm.current = null; smGap.current = null
          }
        })

        handsRef.current = hands
        const video = videoRef.current
        if (!video) return
        const camera = new Camera(video, {
          onFrame: async () => { if (handsRef.current && video) await handsRef.current.send({ image: video }) },
          width: 320, height: 240,
        })
        let started = false
        for (let attempt = 0; attempt < 4 && !cancelled; attempt++) {
          try { if (attempt > 0) await new Promise((r) => setTimeout(r, 500)); await camera.start(); started = true; break }
          catch (e) { if (attempt === 3) throw e }
        }
        if (started && !cancelled) { cameraRef.current = camera; cbs.current.onReady?.() }
      } catch (err) {
        console.error("[useHandGestures] init failed:", err)
        if (!cancelled) cbs.current.onError?.(err?.message || "init failed")
      }
    }
    init()

    return () => {
      cancelled = true
      try { cameraRef.current?.stop?.() } catch (_) {}
      try { handsRef.current?.close?.() } catch (_) {}
      cameraRef.current = null; handsRef.current = null; smPalm.current = null; smGap.current = null
    }
  }, [enabled, videoRef])
}

export { clamp }
