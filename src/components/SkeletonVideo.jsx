import { useEffect, useRef, forwardRef, useImperativeHandle } from "react"
import { loadDrawingUtils, drawHand, clearHand } from "../lib/handDraw.js"

// ───────────────────────────────────────────────────────────────
// SkeletonVideo
//
// A mirrored <video> with a <canvas> overlaid on top that paints the
// MediaPipe hand skeleton (21 landmarks + connections). The parent passes
// landmarks in via the imperative `draw(lm)` handle, called from the
// hook's onLandmarks. The video element is exposed through the forwarded
// ref so the gesture/fist hooks can attach the camera stream to it.
// ───────────────────────────────────────────────────────────────

const SkeletonVideo = forwardRef(function SkeletonVideo(
  { width, height, style, videoStyle, showSkeleton = true },
  ref
) {
  const videoRef = useRef()
  const canvasRef = useRef()
  const ctxRef = useRef(null)

  // Expose the video element to the parent (hooks attach the camera here)
  useImperativeHandle(ref, () => videoRef.current, [])

  useEffect(() => {
    loadDrawingUtils()
    const canvas = canvasRef.current
    if (canvas) ctxRef.current = canvas.getContext("2d")
  }, [])

  // Keep the canvas pixel size synced to its displayed size
  useEffect(() => {
    const sync = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      if (rect.width && rect.height) {
        canvas.width = rect.width
        canvas.height = rect.height
      }
    }
    sync()
    window.addEventListener("resize", sync)
    return () => window.removeEventListener("resize", sync)
  }, [])

  // Imperative draw: parent calls videoRef.current.__draw(lm)
  // We attach it to the video node so parents holding the forwarded ref
  // can reach it without a second ref.
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.__draw = (lm) => {
      if (!showSkeleton) return clearHand(ctxRef.current, canvasRef.current)
      drawHand(ctxRef.current, canvasRef.current, lm)
    }
    return () => {
      if (v) delete v.__draw
    }
  }, [showSkeleton])

  return (
    <div style={{ position: "relative", width, height, ...style }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: "scaleX(-1)",
          display: "block",
          ...videoStyle,
        }}
      />
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      />
    </div>
  )
})

export default SkeletonVideo
