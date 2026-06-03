import { useState, useRef, useCallback } from "react"
import { useFistTrigger } from "../hooks/useFistTrigger.js"
import SkeletonVideo from "./SkeletonVideo.jsx"

// ───────────────────────────────────────────────────────────────
// StartupScreen
//
// Full-screen cream entry. A centered framed camera window (with live
// hand-skeleton overlay) watches for a closed fist; holding a fist fires
// onOpen(), kicking off the fly-out reveal in the Gallery. A click
// fallback covers the camera-unavailable case.
// ───────────────────────────────────────────────────────────────

export default function StartupScreen({ onOpen }) {
  const videoRef = useRef()
  const [camReady, setCamReady] = useState(false)
  const [handSeen, setHandSeen] = useState(false)
  const [error, setError] = useState(null)
  const [opening, setOpening] = useState(false)

  const fire = useCallback(() => {
    if (opening) return
    setOpening(true)
    setTimeout(() => onOpen(), 260)
  }, [opening, onOpen])

  useFistTrigger({
    active: true,
    videoRef,
    onFist: fire,
    onReady: () => setCamReady(true),
    onError: (msg) => setError(msg),
    onHandSeen: setHandSeen,
    onLandmarks: (lm) => videoRef.current?.__draw?.(lm),
  })

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#fff3d1",
        gap: 36,
        transition: "opacity 0.26s ease",
        opacity: opening ? 0 : 1,
      }}
    >
      {/* Wordmark */}
      <h1
        style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: "clamp(40px, 6vw, 64px)",
          fontWeight: 300,
          fontStyle: "italic",
          letterSpacing: "-0.03em",
          color: "#1A1A1A",
          lineHeight: 1,
        }}
      >
        liminal
      </h1>

      {/* Centered framed camera window with skeleton overlay */}
      <div
        style={{
          position: "relative",
          width: 360,
          maxWidth: "82vw",
          aspectRatio: "4 / 3",
          background: "#111",
          borderRadius: 10,
          overflow: "hidden",
          border: "1px solid rgba(0,0,0,0.08)",
          boxShadow: "0 18px 60px rgba(0,0,0,0.14), 0 2px 10px rgba(0,0,0,0.08)",
        }}
      >
        <SkeletonVideo
          ref={videoRef}
          width="100%"
          height="100%"
          videoStyle={{
            opacity: camReady ? 1 : 0,
            transition: "opacity 0.4s ease",
          }}
        />

        {/* Loading / error overlay */}
        {!camReady && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              padding: 20,
              fontFamily: "system-ui, sans-serif",
              fontSize: 12,
              lineHeight: 1.5,
              color: "#8A8A8A",
              whiteSpace: "pre-line",
            }}
          >
            {error ? "Camera unavailable.\nClick below to enter." : "Waking the camera…"}
          </div>
        )}

        {/* Hand-detected hint ring */}
        {camReady && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              border: `2px solid ${handSeen ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0)"}`,
              transition: "border-color 0.18s ease",
              pointerEvents: "none",
              borderRadius: 10,
            }}
          />
        )}
      </div>

      {/* Instruction */}
      <div style={{ textAlign: "center", height: 44 }}>
        <p
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: "clamp(22px, 3vw, 32px)",
            fontWeight: 300,
            letterSpacing: "0.02em",
            color: "#1A1A1A",
          }}
        >
          {opening
            ? "opening…"
            : camReady
            ? handSeen
              ? "Make a fist, then open your hand"
              : "Raise your hand to the camera"
            : "Make a fist, then open your hand"}
        </p>
        {camReady && !opening && (
          <p
            style={{
              marginTop: 6,
              fontFamily: "system-ui, sans-serif",
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#BCB0A0",
            }}
          >
            close fist · then spread your fingers
          </p>
        )}
      </div>

      {/* Fallback entry */}
      <button
        onClick={fire}
        style={{
          background: error ? "#1A1A1A" : "transparent",
          color: error ? "#F2EBE3" : "#B0A494",
          border: error ? "none" : "1px solid #D9CEBF",
          padding: error ? "14px 48px" : "10px 28px",
          borderRadius: 100,
          cursor: "pointer",
          fontFamily: "system-ui, sans-serif",
          fontSize: 11,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          transition: "opacity 0.2s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = 0.75)}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = 1)}
      >
        {error ? "Enter Your World" : "or click to enter"}
      </button>
    </div>
  )
}
