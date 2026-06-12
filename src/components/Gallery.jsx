/* ------------------------------------------------------------------ */
/*  Gallery.jsx — canvas, gestures, pan/zoom, spiral, music, overlays  */
/*                                                                     */
/*  Hot paths (pan, zoom, spiral rotation, parallax, inertia) run in   */
/*  a single RAF loop that writes straight to the DOM — zero React     */
/*  re-renders on any continuous motion. React owns discrete state     */
/*  only: items, reveal, modes, highlight, lightbox.                   */
/* ------------------------------------------------------------------ */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CanvasItem from "./CanvasItem.jsx";
import Decorations from "./Decorations.jsx";
import Lightbox from "./Lightbox.jsx";
import Sidebar from "./Sidebar.jsx";
import SkeletonVideo from "./SkeletonVideo.jsx";
import HintBadge from "./HintBadge.jsx";
import { useHandGestures } from "../hooks/useHandGestures.js";
import { useAmbientMusic } from "../hooks/useAmbientMusic.js";
import { COLORS, makeDemo, makePhoto, makeSticky, makeSticker, clamp, lerp } from "../lib/constants.js";

/* ---------------- tuning ------------------------------------------ */
const BASE = 0.022;          // spiral auto-rotation, degrees/frame (≈1.3°/s)
const SPIRAL_DECAY = 0.96;   // user spin velocity decay — ↓ stops faster
const PAN_DECAY = 0.91;      // mouse-release inertia decay
const SPIN_GAIN = 0.014;     // two-finger px-delta → angular velocity
const ZOOM_GAIN = 9;         // pinch gap delta → zoom multiplier
const PAN_GAIN = 1.35;       // open-palm screen-delta → canvas pan
const ZOOM_MIN = 0.3;
const ZOOM_MAX = 3.2;
const HOLD_MS = 2000;        // point-hold duration to open lightbox
const HIT_RADIUS = 150;      // world units — point hit-test radius
const FIST_COOLDOWN = 1600;  // ms between fist recenters
const GRAB_WINDOW = 450;     // ms after highlight in which a pinch = grab
const PARALLAX_3D = { x: 9, y: 6 };  // max degrees at depth 1
const PARALLAX_FLAT = { x: 7, y: 5 }; // max px at depth 1
const PARALLAX_LERP = 0.08;
const CYL_MAX_DEG = 38;      // 3D cylinder curvature at spiral edge
const CYL_RADIUS = 780;      // world x at which curvature maxes out

export default function Gallery() {
  /* ---------------- discrete state -------------------------------- */
  const [items, setItems] = useState(() => makeDemo());
  const [revealed, setRevealed] = useState(false);
  const [mode3d, setMode3d] = useState(false);
  const [gesturesOn, setGesturesOn] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [lightboxItem, setLightboxItem] = useState(null);
  const [highlightId, setHighlightId] = useState(null);
  const [draggedId, setDraggedId] = useState(null);

  const { playing, toggle: toggleMusic } = useAmbientMusic();

  /* ---------------- hot-path refs --------------------------------- */
  const worldRef = useRef(null);     // parallax CSS-var holder
  const viewportRef = useRef(null);  // pan + zoom transform target
  const spiralRef = useRef(null);    // rotation transform target

  const panRef = useRef({ x: 0, y: 0 });
  const panVelRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const spiralAngleRef = useRef(0);
  const spiralUserVelRef = useRef(0);

  const mouseDragRef = useRef(null);   // { lastX, lastY }
  const itemDragRef = useRef(null);    // { id, lastX, lastY }  (mouse)
  const parallaxTarget = useRef({ x: 0, y: 0 });
  const parallaxNow = useRef({ x: 0, y: 0 });

  // gesture session state
  const gRef = useRef({
    prevType: "none",
    prevPalm: null,
    prevMid: null,
    prevGap: null,
    holdId: null,
    holdSince: 0,
    grabbedId: null,
    lastHighlightAt: 0,
    lastFistAt: 0,
  });

  const itemsRef = useRef(items);
  itemsRef.current = items;
  const highlightRef = useRef(highlightId);
  highlightRef.current = highlightId;
  const mode3dRef = useRef(mode3d);
  mode3dRef.current = mode3d;
  const lightboxRef = useRef(lightboxItem);
  lightboxRef.current = lightboxItem;

  /* ---------------- reveal burst on mount -------------------------- */
  useEffect(() => {
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => setRevealed(true))
    );
    return () => cancelAnimationFrame(raf);
  }, []);

  /* ---------------- the RAF loop ----------------------------------- */
  useEffect(() => {
    let raf;
    const tick = () => {
      // spiral — always running, never pauses
      spiralUserVelRef.current *= SPIRAL_DECAY;
      spiralAngleRef.current += BASE + spiralUserVelRef.current;
      if (spiralRef.current) {
        spiralRef.current.style.transform = `rotate(${spiralAngleRef.current}deg)`;
      }

      // pan inertia (only when no active drag)
      if (!mouseDragRef.current) {
        const v = panVelRef.current;
        if (Math.abs(v.x) > 0.05 || Math.abs(v.y) > 0.05) {
          panRef.current.x += v.x;
          panRef.current.y += v.y;
          v.x *= PAN_DECAY;
          v.y *= PAN_DECAY;
        }
      }

      // viewport transform
      if (viewportRef.current) {
        viewportRef.current.style.transform =
          `translate(${panRef.current.x}px, ${panRef.current.y}px) scale(${zoomRef.current})`;
      }

      // parallax — lerp toward mouse target, write CSS vars
      const pn = parallaxNow.current;
      const pt = parallaxTarget.current;
      pn.x = lerp(pn.x, pt.x, PARALLAX_LERP);
      pn.y = lerp(pn.y, pt.y, PARALLAX_LERP);
      if (worldRef.current) {
        const w = worldRef.current;
        if (mode3dRef.current) {
          w.style.setProperty("--px", `${pn.x * PARALLAX_3D.x}deg`);
          w.style.setProperty("--py", `${-pn.y * PARALLAX_3D.y}deg`);
          w.style.setProperty("--ptx", "0px");
          w.style.setProperty("--pty", "0px");
        } else {
          w.style.setProperty("--ptx", `${pn.x * PARALLAX_FLAT.x}px`);
          w.style.setProperty("--pty", `${pn.y * PARALLAX_FLAT.y}px`);
          w.style.setProperty("--px", "0deg");
          w.style.setProperty("--py", "0deg");
        }
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  /* ---------------- coordinate helpers ----------------------------- */

  // screen px → pre-rotation world coords (the spiral's own frame)
  const screenToWorld = useCallback((sx, sy, rotationAware = false) => {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    let wx = (sx - cx - panRef.current.x) / zoomRef.current;
    let wy = (sy - cy - panRef.current.y) / zoomRef.current;
    if (rotationAware) {
      const a = (-spiralAngleRef.current * Math.PI) / 180;
      const rx = wx * Math.cos(a) - wy * Math.sin(a);
      const ry = wx * Math.sin(a) + wy * Math.cos(a);
      wx = rx; wy = ry;
    }
    return { x: wx, y: wy };
  }, []);

  // screen-space delta → spiral-frame delta (for dragging items)
  const deltaToSpiralFrame = useCallback((dx, dy) => {
    const a = (-spiralAngleRef.current * Math.PI) / 180;
    return {
      x: (dx * Math.cos(a) - dy * Math.sin(a)) / zoomRef.current,
      y: (dx * Math.sin(a) + dy * Math.cos(a)) / zoomRef.current,
    };
  }, []);

  // Known limitation (PRD §15): hit-test uses world coords pre-rotation,
  // so pointing accuracy drifts as the spiral turns. Kept rotation-aware
  // here only for screen→world; nearest-item search is straightforward.
  const hitTest = useCallback((sx, sy) => {
    const w = screenToWorld(sx, sy, true);
    let best = null;
    let bestD = HIT_RADIUS;
    for (const it of itemsRef.current) {
      const d = Math.hypot(it.x - w.x, it.y - w.y);
      if (d < bestD) {
        bestD = d;
        best = it;
      }
    }
    return best;
  }, [screenToWorld]);

  const moveItem = useCallback((id, dx, dy) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, x: it.x + dx, y: it.y + dy } : it))
    );
  }, []);

  /* ---------------- recenter / re-burst ----------------------------- */
  const recenter = useCallback(() => {
    spiralAngleRef.current = 0;
    spiralUserVelRef.current = 0;
    panRef.current = { x: 0, y: 0 };
    panVelRef.current = { x: 0, y: 0 };
    zoomRef.current = 1;
    setRevealed(false);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => setRevealed(true))
    );
  }, []);

  /* ---------------- gesture frame handler --------------------------- */
  const videoRef = useRef(null);
  const previewCanvasRef = useRef(null);

  const onGestureFrame = useCallback((frame) => {
    const g = gRef.current;
    const W = window.innerWidth;
    const H = window.innerHeight;
    const now = performance.now();

    const typeChanged = frame.type !== g.prevType;
    if (typeChanged) {
      g.prevPalm = null;
      g.prevMid = null;
      g.prevGap = null;
      // leaving point — clear hold + highlight (keep a grace window for grab)
      if (g.prevType === "point" && frame.type !== "pinch") {
        g.holdId = null;
        setHighlightId(null);
      }
      // leaving pinch — release grab
      if (g.prevType === "pinch") g.grabbedId = null;
    }

    switch (frame.type) {
      case "open": {
        // pan the canvas
        if (g.prevPalm) {
          const dx = (frame.palm.x - g.prevPalm.x) * W * PAN_GAIN;
          const dy = (frame.palm.y - g.prevPalm.y) * H * PAN_GAIN;
          panRef.current.x += dx;
          panRef.current.y += dy;
          panVelRef.current = { x: dx * 0.7, y: dy * 0.7 };
        }
        g.prevPalm = frame.palm;
        break;
      }

      case "pinch": {
        // point → pinch within the grace window = grab that item
        if (
          !g.grabbedId &&
          highlightRef.current &&
          now - g.lastHighlightAt < GRAB_WINDOW &&
          g.prevType !== "pinch"
        ) {
          g.grabbedId = highlightRef.current;
          setDraggedId(g.grabbedId);
        }

        if (g.grabbedId) {
          // drag the grabbed item by pinch-midpoint delta
          if (g.prevMid) {
            const dx = (frame.pinchMid.x - g.prevMid.x) * W;
            const dy = (frame.pinchMid.y - g.prevMid.y) * H;
            const d = deltaToSpiralFrame(dx, dy);
            moveItem(g.grabbedId, d.x, d.y);
          }
        } else {
          // zoom — pinch gap delta × gain
          if (g.prevGap != null) {
            const factor = 1 + (frame.pinchGap - g.prevGap) * ZOOM_GAIN;
            zoomRef.current = clamp(zoomRef.current * factor, ZOOM_MIN, ZOOM_MAX);
          }
          // pinch + move — pan with the midpoint at the same time
          if (g.prevMid) {
            panRef.current.x += (frame.pinchMid.x - g.prevMid.x) * W * PAN_GAIN;
            panRef.current.y += (frame.pinchMid.y - g.prevMid.y) * H * PAN_GAIN;
          }
        }
        g.prevGap = frame.pinchGap;
        g.prevMid = frame.pinchMid;
        break;
      }

      case "point": {
        if (lightboxRef.current) break; // already previewing
        const hit = hitTest(frame.indexTip.x * W, frame.indexTip.y * H);
        const id = hit?.id || null;
        if (id !== highlightRef.current) setHighlightId(id);
        if (id) g.lastHighlightAt = now;

        // hold 2s on the same item → lightbox
        if (id && id === g.holdId) {
          if (now - g.holdSince >= HOLD_MS) {
            setLightboxItem(itemsRef.current.find((i) => i.id === id) || null);
            g.holdId = null;
            setHighlightId(null);
          }
        } else {
          g.holdId = id;
          g.holdSince = now;
        }
        break;
      }

      case "two": {
        // inject angular velocity — like flicking a vinyl record
        if (g.prevPalm) {
          const dxPx = (frame.palm.x - g.prevPalm.x) * W;
          spiralUserVelRef.current = dxPx * SPIN_GAIN;
        }
        g.prevPalm = frame.palm;
        break;
      }

      case "fist": {
        if (now - g.lastFistAt > FIST_COOLDOWN) {
          g.lastFistAt = now;
          recenter();
        }
        break;
      }

      default:
        break;
    }

    if (typeChanged && g.prevType === "pinch") setDraggedId(null);
    g.prevType = frame.type;
  }, [deltaToSpiralFrame, hitTest, moveItem, recenter]);

  const { cameraError, tracking } = useHandGestures(
    videoRef,
    previewCanvasRef,
    gesturesOn,
    onGestureFrame
  );

  /* ---------------- mouse / keyboard fallback ----------------------- */

  const onStageMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    mouseDragRef.current = { lastX: e.clientX, lastY: e.clientY };
    panVelRef.current = { x: 0, y: 0 };
  }, []);

  const onItemMouseDown = useCallback((e, item) => {
    e.stopPropagation();
    itemDragRef.current = { id: item.id, lastX: e.clientX, lastY: e.clientY };
    setDraggedId(item.id);
  }, []);

  useEffect(() => {
    const onMove = (e) => {
      // parallax target — normalised mouse position, [-1, 1]
      parallaxTarget.current = {
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: (e.clientY / window.innerHeight) * 2 - 1,
      };

      if (itemDragRef.current) {
        const d = itemDragRef.current;
        const delta = deltaToSpiralFrame(e.clientX - d.lastX, e.clientY - d.lastY);
        moveItem(d.id, delta.x, delta.y);
        d.lastX = e.clientX;
        d.lastY = e.clientY;
        return;
      }
      if (mouseDragRef.current) {
        const d = mouseDragRef.current;
        const dx = e.clientX - d.lastX;
        const dy = e.clientY - d.lastY;
        panRef.current.x += dx;
        panRef.current.y += dy;
        panVelRef.current = { x: dx, y: dy }; // inertia carries the last delta
        d.lastX = e.clientX;
        d.lastY = e.clientY;
      }
    };
    const onUp = () => {
      mouseDragRef.current = null;
      if (itemDragRef.current) {
        itemDragRef.current = null;
        setDraggedId(null);
      }
    };
    const onWheel = (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.08 : 0.92;
      zoomRef.current = clamp(zoomRef.current * factor, ZOOM_MIN, ZOOM_MAX);
    };
    const onKey = (e) => {
      const step = 60;
      if (e.key === "ArrowLeft") panRef.current.x += step;
      else if (e.key === "ArrowRight") panRef.current.x -= step;
      else if (e.key === "ArrowUp") panRef.current.y += step;
      else if (e.key === "ArrowDown") panRef.current.y -= step;
      else if (e.key === "+" || e.key === "=")
        zoomRef.current = clamp(zoomRef.current * 1.1, ZOOM_MIN, ZOOM_MAX);
      else if (e.key === "-" || e.key === "_")
        zoomRef.current = clamp(zoomRef.current * 0.9, ZOOM_MIN, ZOOM_MAX);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
    };
  }, [deltaToSpiralFrame, moveItem]);

  /* ---------------- add memories ------------------------------------ */
  const addPhoto = () => setItems((p) => [...p, makePhoto(p.length)]);
  const addSticky = () => setItems((p) => [...p, makeSticky(p.length)]);
  const addSticker = () => setItems((p) => [...p, makeSticker(p.length)]);

  /* ---------------- 3D cylinder enrichment -------------------------- */
  // Approximate during rotation (PRD §15): curvature derives from the
  // item's base world x, not its rotated screen position.
  const renderItems = useMemo(() => {
    if (!mode3d) return items;
    return items.map((it) => ({
      ...it,
      cylY: clamp(it.x / CYL_RADIUS, -1, 1) * CYL_MAX_DEG,
    }));
  }, [items, mode3d]);

  /* ---------------- controls ----------------------------------------- */
  const ctrl = (active) => ({
    textTransform: "uppercase",
    fontWeight: 300,
    fontSize: 13,
    letterSpacing: "0.28em",
    padding: "10px 20px",
    borderRadius: 999,
    color: COLORS.text,
    background: active ? "rgba(255,255,255,0.72)" : "rgba(255,255,255,0.28)",
    border: "1px solid rgba(26,26,26,0.12)",
    backdropFilter: "blur(6px)",
    WebkitBackdropFilter: "blur(6px)",
    transition: "background 0.25s ease",
  });

  return (
    <div
      onMouseDown={onStageMouseDown}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background: COLORS.canvas,
        cursor: mouseDragRef.current ? "grabbing" : "default",
      }}
    >
      {/* world — parallax variables live here */}
      <div ref={worldRef} style={{ position: "absolute", inset: 0 }}>
        {/* viewport — pan + zoom anchor at screen centre */}
        <div
          ref={viewportRef}
          style={{ position: "absolute", left: "50%", top: "50%", width: 0, height: 0 }}
        >
          <Decorations />
          {/* spiral rotor — RAF writes rotation directly */}
          <div ref={spiralRef} style={{ position: "absolute", width: 0, height: 0 }}>
            {renderItems.map((item) => (
              <CanvasItem
                key={item.id}
                item={item}
                revealed={revealed}
                highlighted={item.id === highlightId}
                dragged={item.id === draggedId}
                mode3d={mode3d}
                onPointerDown={onItemMouseDown}
              />
            ))}
          </div>
        </div>
      </div>

      {/* grain — animated feTurbulence texture */}
      <div
        style={{
          position: "fixed",
          inset: "-50%",
          width: "200%",
          height: "200%",
          pointerEvents: "none",
          opacity: 0.048,
          animation: "grain 1.6s steps(6) infinite",
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          zIndex: 40,
        }}
      />

      {/* vignette */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse at center, transparent 52%, rgba(180,155,110,0.18) 100%)",
          zIndex: 41,
        }}
      />

      {/* wordmark */}
      <div
        style={{
          position: "fixed",
          top: 26,
          left: 34,
          fontStyle: "italic",
          fontWeight: 300,
          fontSize: 30,
          letterSpacing: "-0.03em",
          zIndex: 50,
          pointerEvents: "none",
        }}
      >
        liminal
      </div>

      {/* controls */}
      <div
        style={{
          position: "fixed",
          top: 24,
          right: 28,
          display: "flex",
          gap: 10,
          zIndex: 50,
          flexWrap: "wrap",
          justifyContent: "flex-end",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button style={ctrl(mode3d)} onClick={() => setMode3d((v) => !v)}>
          {mode3d ? "Flat" : "3D"}
        </button>
        <button style={ctrl(gesturesOn)} onClick={() => setGesturesOn((v) => !v)}>
          Gestures
        </button>
        <button style={ctrl(playing)} onClick={toggleMusic}>
          Music
        </button>
        <button style={ctrl(sidebarOpen)} onClick={() => setSidebarOpen((v) => !v)}>
          Create
        </button>
      </div>

      {/* camera preview — bottom left while gestures are on */}
      {gesturesOn && (
        <div
          style={{ position: "fixed", left: 26, bottom: 26, zIndex: 50 }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <SkeletonVideo
            ref={videoRef}
            canvasRef={previewCanvasRef}
            width={176}
            height={132}
            rounded={14}
          />
          <p
            style={{
              marginTop: 8,
              fontSize: 12,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              fontWeight: 300,
              color: cameraError ? "#b06a4a" : tracking ? COLORS.text : COLORS.muted,
            }}
          >
            {cameraError
              ? "camera unavailable — mouse works"
              : tracking
                ? "hand tracked"
                : "looking for your hand"}
          </p>
        </div>
      )}

      <HintBadge duration={8}>
        open palm pans · pinch zooms · point to choose · two fingers spin · fist recenters
      </HintBadge>

      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onAddPhoto={addPhoto}
        onAddSticky={addSticky}
        onAddSticker={addSticker}
      />

      <Lightbox item={lightboxItem} onClose={() => setLightboxItem(null)} />
    </div>
  );
}
