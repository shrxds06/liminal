import { useEffect, useRef } from "react"
import { isFist, isOpenHand } from "../lib/gestures.js"

// ───────────────────────────────────────────────────────────────
// useFistTrigger
//
// Runs MediaPipe on the startup screen purely to watch for a closed
// fist. Loads the same CDN scripts as useHandGestures. Calls onFist()
// once the fist is held for a few consecutive frames (debounced).
// Emits raw landmarks via onLandmarks for the skeleton overlay.
// ───────────────────────────────────────────────────────────────

const HANDS_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js"
const CAMERA_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js"
const ASSET_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/hands"
const FIST_FRAMES = 4 // consecutive fist frames needed to "arm" the open
const OPEN_FRAMES = 3 // consecutive clearly-open frames needed to fire

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
    s.onload = () => {
      s.dataset.loaded = "true"
      resolve()
    }
    s.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.head.appendChild(s)
  })
}

export function useFistTrigger({ active, videoRef, onFist, onReady, onError, onHandSeen, onLandmarks }) {
  const handsRef = useRef(null)
  const cameraRef = useRef(null)
  const fistCount = useRef(0)
  const openCount = useRef(0)
  const armed = useRef(false) // true once a fist has been held long enough
  const fired = useRef(false)

  const cbs = useRef({ onFist, onReady, onError, onHandSeen, onLandmarks })
  useEffect(() => {
    cbs.current = { onFist, onReady, onError, onHandSeen, onLandmarks }
  })

  useEffect(() => {
    if (!active) return
    let cancelled = false
    fired.current = false
    armed.current = false
    fistCount.current = 0
    openCount.current = 0

    const init = async () => {
      try {
        if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
          throw new Error(
            "Camera requires a secure context — open the app at http://localhost:5173 (not the LAN IP) or serve over HTTPS."
          )
        }

        await loadScript(HANDS_URL)
        await loadScript(CAMERA_URL)
        if (cancelled) return

        const Hands = window.Hands
        const Camera = window.Camera
        if (!Hands || !Camera) {
          throw new Error("MediaPipe scripts loaded but window.Hands/Camera missing (CDN blocked?).")
        }

        const hands = new Hands({ locateFile: (f) => `${ASSET_BASE}/${f}` })
        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.6,
          minTrackingConfidence: 0.6,
        })

        hands.onResults(({ multiHandLandmarks }) => {
          if (cancelled) return
          const lm = multiHandLandmarks?.[0] || null

          cbs.current.onLandmarks?.(lm)
          cbs.current.onHandSeen?.(!!lm)

          if (fired.current) return

          const fistNow = lm && isFist(lm)
          const openNow = lm && isOpenHand(lm)

          if (fistNow) {
            // Building / holding a fist → arm the trigger, reset open run
            fistCount.current += 1
            openCount.current = 0
            if (fistCount.current >= FIST_FRAMES) armed.current = true
          } else if (armed.current && openNow) {
            // Armed, and the hand is now clearly open. Require a few
            // consecutive open frames so a mid-hold jitter can't fire it.
            openCount.current += 1
            if (openCount.current >= OPEN_FRAMES) {
              fired.current = true
              cbs.current.onFist?.()
            }
          } else {
            // In-between / ambiguous pose (still curling, partial, or lost) —
            // don't fire, don't count it as an open run.
            openCount.current = 0
          }
        })

        handsRef.current = hands

        const video = videoRef.current
        if (!video) return

        const camera = new Camera(video, {
          onFrame: async () => {
            if (handsRef.current && video) await handsRef.current.send({ image: video })
          },
          width: 320,
          height: 240,
        })

        await camera.start()
        if (!cancelled) {
          cameraRef.current = camera
          cbs.current.onReady?.()
        }
      } catch (err) {
        console.error("[useFistTrigger] init failed:", err)
        if (!cancelled) cbs.current.onError?.(err?.message || "init failed")
      }
    }

    init()

    return () => {
      cancelled = true
      try { cameraRef.current?.stop?.() } catch (_) {}
      try { handsRef.current?.close?.() } catch (_) {}
      cameraRef.current = null
      handsRef.current = null
    }
  }, [active, videoRef])
}
