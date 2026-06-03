import { useState, useRef, useEffect, useCallback } from "react"
import { clamp, CYL } from "../lib/constants.js"
import { useHandGestures } from "../hooks/useHandGestures.js"
import CanvasItem from "./CanvasItem.jsx"
import HintBadge from "./HintBadge.jsx"
import SkeletonVideo from "./SkeletonVideo.jsx"

const SCROLL_LIMIT = CYL.height / 2 + 160
const ZOOM_MIN = -520
const ZOOM_MAX = 420
const IDLE_MS = 2600
const TURN_GAIN = 0.22 // px of hand pan → degrees of cylinder rotation

export default function Gallery({ seedItems }) {
  const [items] = useState(seedItems)
  const [rv, setRv] = useState(0)        // reveal 0→1
  const [m, setM] = useState(0)          // 0 cylinder → 1 spread
  const [mode, setMode] = useState("cylinder")
  const [gesturesOn, setGesturesOn] = useState(true)
  const [gestureLabel, setGestureLabel] = useState(null)
  const [camReady, setCamReady] = useState(false)
  const [mpError, setMpError] = useState(false)
  const [vp, setVp] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))

  const containerRef = useRef()
  const videoRef = useRef()
  const zoomerRef = useRef()
  const scrollerRef = useRef()
  const stageRef = useRef()

  // turn / pan / zoom → refs, written to the DOM each frame (no item re-render)
  const angle = useRef(0)
  const scroll = useRef(0)
  const panX = useRef(0)
  const zoom = useRef(0)
  const angleAnim = useRef(null)
  const lastInput = useRef(0)
  const modeRef = useRef("cylinder")
  useEffect(() => { modeRef.current = mode }, [mode])

  // reveal / morph → state, tweened per-frame only while animating
  const rvRef = useRef(0)
  const mRef = useRef(0)
  const tw = useRef(null)
  const twRaf = useRef(null)

  const spreadW = vp.w * CYL.fillW
  const spreadH = vp.h * CYL.fillH
  const markInput = () => { lastInput.current = performance.now() }

  useEffect(() => {
    const onResize = () => setVp({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  // ── DOM loop: turn / scroll / pan / zoom ──
  useEffect(() => {
    let raf
    const loop = () => {
      const now = performance.now()
      const a = angleAnim.current
      if (a) {
        const k = Math.min(1, (now - a.t0) / a.dur)
        angle.current = a.from + (a.to - a.from) * (1 - Math.pow(1 - k, 3))
        if (k >= 1) angleAnim.current = null
      } else if (modeRef.current === "cylinder" && now - lastInput.current > IDLE_MS) {
        angle.current += 0.08 // gentle idle spin
      }
      if (stageRef.current) stageRef.current.style.transform = `rotateY(${angle.current}deg)`
      if (scrollerRef.current) scrollerRef.current.style.transform = `translateX(${panX.current}px) translateY(${scroll.current}px)`
      if (zoomerRef.current) zoomerRef.current.style.transform = `translateZ(${zoom.current}px)`
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  // ── reveal / morph tween ──
  const tween = useCallback((target, dur = 880) => {
    tw.current = {
      fromRv: rvRef.current, fromM: mRef.current,
      toRv: target.rv ?? rvRef.current, toM: target.m ?? mRef.current,
      t0: performance.now(), dur,
    }
    if (!twRaf.current) {
      const step = (now) => {
        const t = tw.current
        const k = Math.min(1, (now - t.t0) / t.dur)
        const e = 1 - Math.pow(1 - k, 3)
        rvRef.current = t.fromRv + (t.toRv - t.fromRv) * e
        mRef.current = t.fromM + (t.toM - t.fromM) * e
        setRv(rvRef.current); setM(mRef.current)
        if (k < 1) twRaf.current = requestAnimationFrame(step)
        else { twRaf.current = null; tw.current = null }
      }
      twRaf.current = requestAnimationFrame(step)
    }
  }, [])

  const animAngle = (to, dur = 880) => { angleAnim.current = { from: angle.current, to, t0: performance.now(), dur } }

  useEffect(() => { tween({ rv: 1 }, 950); markInput() }, [tween]) // reveal

  // ── mode switches ──
  const toSpread = useCallback(() => {
    setMode("spread"); modeRef.current = "spread"
    tween({ m: 1 }); animAngle(0); scroll.current = 0; panX.current = 0; markInput()
  }, [tween])
  const toCylinder = useCallback(() => {
    setMode("cylinder"); modeRef.current = "cylinder"
    tween({ m: 0 }); animAngle(0); scroll.current = 0; panX.current = 0; zoom.current = 0; markInput()
  }, [tween])

  // ── gestures ──
  useHandGestures({
    enabled: gesturesOn,
    videoRef,
    onTwo: (dx, dy) => {                         // two fingers → TURN the cylinder
      if (modeRef.current !== "cylinder") return
      angle.current += dx * TURN_GAIN
      scroll.current = clamp(scroll.current - dy, -SCROLL_LIMIT, SCROLL_LIMIT)
      markInput()
    },
    onOpenStart: () => { if (modeRef.current === "cylinder") toSpread() }, // burst
    onOpen: (dx, dy) => {                        // open palm → PAN the spread
      if (modeRef.current !== "spread") return
      panX.current -= dx
      scroll.current = clamp(scroll.current - dy, -SCROLL_LIMIT, SCROLL_LIMIT)
      markInput()
    },
    onFist: () => { if (modeRef.current !== "cylinder") toCylinder() },    // re-form
    onZoom: (factor) => { zoom.current = clamp(zoom.current + (factor - 1) * 900, ZOOM_MIN, ZOOM_MAX); markInput() },
    onGesture: setGestureLabel,
    onLandmarks: (lm) => videoRef.current?.__draw?.(lm),
    onReady: () => setCamReady(true),
    onError: () => setMpError(true),
  })

  useEffect(() => {
    if (!gesturesOn) { setCamReady(false); setMpError(false); setGestureLabel(null) }
  }, [gesturesOn])

  // ── mouse / wheel ──
  const dragging = useRef(false)
  const lastMouse = useRef({ x: 0, y: 0 })
  const onMouseDown = useCallback((e) => {
    if (e.target.closest("[data-ui]")) return
    dragging.current = true; lastMouse.current = { x: e.clientX, y: e.clientY }
  }, [])
  const onMouseMove = useCallback((e) => {
    if (!dragging.current) return
    const dx = e.clientX - lastMouse.current.x
    const dy = e.clientY - lastMouse.current.y
    if (modeRef.current === "cylinder") {
      angle.current += dx * 0.3
      scroll.current = clamp(scroll.current + dy, -SCROLL_LIMIT, SCROLL_LIMIT)
    } else {
      panX.current += dx
      scroll.current = clamp(scroll.current + dy, -SCROLL_LIMIT, SCROLL_LIMIT)
    }
    lastMouse.current = { x: e.clientX, y: e.clientY }; markInput()
  }, [])
  const onMouseUp = useCallback(() => { dragging.current = false }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e) => { e.preventDefault(); zoom.current = clamp(zoom.current + (e.deltaY > 0 ? -40 : 40), ZOOM_MIN, ZOOM_MAX); markInput() }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  }, [])

  // ── keyboard ──
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowLeft") modeRef.current === "cylinder" ? (angle.current -= 8) : (panX.current += 60)
      else if (e.key === "ArrowRight") modeRef.current === "cylinder" ? (angle.current += 8) : (panX.current -= 60)
      else if (e.key === "ArrowUp") scroll.current = clamp(scroll.current - 50, -SCROLL_LIMIT, SCROLL_LIMIT)
      else if (e.key === "ArrowDown") scroll.current = clamp(scroll.current + 50, -SCROLL_LIMIT, SCROLL_LIMIT)
      else if (e.key === " ") mode === "cylinder" ? toSpread() : toCylinder()
      else if (e.key === "0") toCylinder()
      else return
      markInput()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [mode, toSpread, toCylinder])

  return (
    <div
      ref={containerRef}
      onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
      style={{ position: "fixed", inset: 0, background: "#fff3d1", overflow: "hidden", cursor: dragging.current ? "grabbing" : "grab", userSelect: "none", perspective: "1200px", perspectiveOrigin: "50% 48%" }}
    >
      <div ref={zoomerRef} style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d" }}>
        <div ref={scrollerRef} style={{ position: "absolute", left: "50%", top: "50%", transformStyle: "preserve-3d" }}>
          <div ref={stageRef} style={{ position: "absolute", transformStyle: "preserve-3d" }}>
            {items.map((item, i) => (
              <CanvasItem key={item.id} item={item} m={m} rv={rv} spreadW={spreadW} spreadH={spreadH} delay={(i % 8) * 18} />
            ))}
          </div>
        </div>
      </div>

      <button data-ui onClick={() => (mode === "cylinder" ? toSpread() : toCylinder())} style={toggleStyle}>
        {mode === "cylinder" ? <><Strong>3D</Strong> / FLAT</> : <>3D / <Strong>FLAT</Strong></>}
      </button>
      <button data-ui onClick={() => setGesturesOn((v) => !v)} style={{ ...toggleStyle, left: "auto", right: 28 }}>
        GESTURES&nbsp;{gesturesOn ? <><Strong>ON</Strong> / OFF</> : <>ON / <Strong>OFF</Strong></>}
      </button>

      {gesturesOn && (
        <div data-ui style={{ position: "fixed", bottom: 24, right: 24, width: 160, height: 110, borderRadius: 6, overflow: "hidden", border: "1.5px solid rgba(255,255,255,0.35)", background: "#111", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
          <SkeletonVideo ref={videoRef} width="100%" height="100%" />
          {!camReady && <div style={camHintStyle}>{mpError ? "Camera unavailable —\ndrag to turn, scroll to zoom" : "Loading…"}</div>}
          {gestureLabel && <div style={badgeStyle}>{gestureLabel}…</div>}
        </div>
      )}

      <HintBadge />
    </div>
  )
}

function Strong({ children }) { return <span style={{ fontWeight: 500 }}>{children}</span> }
const toggleStyle = { position: "fixed", left: 28, top: 22, zIndex: 10, fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "clamp(22px, 2.8vw, 36px)", fontWeight: 300, letterSpacing: "0.03em", textTransform: "uppercase", color: "#1A1A1A", background: "transparent", border: "none", cursor: "pointer", padding: 0, lineHeight: 1, pointerEvents: "all" }
const camHintStyle = { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontFamily: "system-ui", color: "#999", textAlign: "center", padding: 8, whiteSpace: "pre-line" }
const badgeStyle = { position: "absolute", top: 6, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.72)", color: "#FFF", fontFamily: "system-ui", fontSize: 9, letterSpacing: "0.06em", padding: "3px 8px", borderRadius: 20, whiteSpace: "nowrap" }
