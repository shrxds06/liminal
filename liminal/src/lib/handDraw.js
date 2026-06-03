// ───────────────────────────────────────────────────────────────
// Hand skeleton drawing
//
// Wraps MediaPipe's drawing_utils to paint the 21 landmarks and their
// connections onto a <canvas> overlaid on the video. Loads the CDN
// script once and reuses window.drawConnectors / window.drawLandmarks
// (plus window.HAND_CONNECTIONS from the hands script).
// ───────────────────────────────────────────────────────────────

const DRAWING_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js"

let drawingReady = false
let drawingPromise = null

export function loadDrawingUtils() {
  if (drawingReady) return Promise.resolve()
  if (drawingPromise) return drawingPromise

  drawingPromise = new Promise((resolve) => {
    const existing = document.querySelector(`script[src="${DRAWING_URL}"]`)
    if (existing) {
      if (existing.dataset.loaded === "true") {
        drawingReady = true
        return resolve()
      }
      existing.addEventListener("load", () => {
        drawingReady = true
        resolve()
      })
      existing.addEventListener("error", () => resolve()) // fail soft
      return
    }
    const s = document.createElement("script")
    s.src = DRAWING_URL
    s.crossOrigin = "anonymous"
    s.onload = () => {
      s.dataset.loaded = "true"
      drawingReady = true
      resolve()
    }
    s.onerror = () => resolve() // fail soft — overlay just won't draw
    document.head.appendChild(s)
  })
  return drawingPromise
}

// Palette: thin white bones, purple-filled joints.
const CONNECTION_STYLE = { color: "#FFFFFF", lineWidth: 1.5 }
const LANDMARK_STYLE = { color: "#FFFFFF", fillColor: "#a04bca", lineWidth: 1, radius: 2 }

// Per-landmark smoothing so the drawn skeleton glides instead of buzzing.
let smoothedLm = null
const DRAW_SMOOTH = 0.5
function smoothLandmarks(landmarks) {
  if (!smoothedLm || smoothedLm.length !== landmarks.length) {
    smoothedLm = landmarks.map((p) => ({ x: p.x, y: p.y, z: p.z }))
    return smoothedLm
  }
  for (let i = 0; i < landmarks.length; i++) {
    const s = smoothedLm[i]
    const n = landmarks[i]
    s.x += DRAW_SMOOTH * (n.x - s.x)
    s.y += DRAW_SMOOTH * (n.y - s.y)
    s.z += DRAW_SMOOTH * (n.z - s.z)
  }
  return smoothedLm
}

// Draws one hand's landmarks onto ctx. The video is mirrored via CSS
// (scaleX(-1)), so we mirror the canvas context to match.
export function drawHand(ctx, canvas, landmarks) {
  if (!ctx || !canvas) return

  ctx.save()
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  if (!landmarks || !drawingReady) {
    smoothedLm = null
    ctx.restore()
    return
  }

  const lm = smoothLandmarks(landmarks)

  // Mirror horizontally to align with the flipped video preview
  ctx.translate(canvas.width, 0)
  ctx.scale(-1, 1)

  const connections = window.HAND_CONNECTIONS
  if (window.drawConnectors && connections) {
    window.drawConnectors(ctx, lm, connections, CONNECTION_STYLE)
  }
  if (window.drawLandmarks) {
    window.drawLandmarks(ctx, lm, LANDMARK_STYLE)
  }

  ctx.restore()
}

export function clearHand(ctx, canvas) {
  if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height)
}
