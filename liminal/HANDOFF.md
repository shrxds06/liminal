# Liminal — Project Handoff

A browser-based **memory world you control with your hands**. The app opens on a camera screen; you make a fist and open your hand, and your photos burst out from the center into a phyllotaxis spiral on an infinite canvas. From there you navigate with hand gestures (via webcam + MediaPipe) or mouse/keyboard: pan, zoom, point-to-highlight, toggle a 3D cylinder view, and add memories (photos, sticky notes, stickers).

Built with Vite + React. All hand tracking runs client-side with MediaPipe Hands. No backend, no persistence (intentional MVP scope).

---

## 1. Quick start

```bash
cd liminal          # the folder containing package.json
npm install
npm run dev
```

Open the **Local** URL it prints (e.g. `http://localhost:5173`) in **Chrome or Edge**.
Allow camera access → make a fist → open your hand → the world appears.

> The camera only works on a **secure context**: `localhost` (dev) or `https` (production). It will NOT work over the LAN IP that Vite also prints. Use the Local URL.

---

## 2. The experience, start to finish

1. **Startup screen** (`StartupScreen.jsx`) — cream background, "liminal" wordmark, a centered framed camera window with a live purple/white hand skeleton overlay. A white ring lights up when a hand is detected. Instruction: *"Make a fist, then open your hand."*
2. **Trigger** — the app "arms" when it sees a held fist (4 frames), then fires when the hand opens clearly (3 frames of a full open palm). This two-stage logic prevents tracking jitter from firing it early. There is also a click-to-enter fallback, and if the camera fails entirely it becomes a plain Enter button.
3. **Reveal** — the gallery mounts with all photos collapsed at the center, then they burst outward to their phyllotaxis-spiral positions with a fast snappy ease and a small per-item stagger.
4. **Gallery** (`Gallery.jsx`) — gestures are **on by default**. The webcam preview (bottom-right) shows the skeleton and the current gesture label.

---

## 3. Gestures

| Gesture | Hand pose | Action |
| --- | --- | --- |
| Open the world | fist ✊ then open ✋ | startup screen only |
| Pan | open palm, move hand | drag the canvas |
| Zoom | pinch 🤏 (thumb + index close), spread/close | zoom in / out |
| Pinch **and** move | pinch, then move hand while pinched | zoom + pan together |
| Point | index up ☝️, others curled | highlights nearest photo |
| Fist (in gallery) | ✊ | detected but **not yet bound to an action** |

**Mouse/keyboard fallback** (always available): drag = pan, scroll = zoom, arrow keys = pan, `+`/`-` = zoom.

### How gestures are classified
`src/lib/gestures.js` reads MediaPipe's 21 hand landmarks and decides the pose by which fingers are extended (tip above knuckle) plus the thumb-index distance:
- Pinch is checked **first** and is pose-agnostic — if thumb and index tips are within `0.12` (normalized), it's a zoom, regardless of other fingers. This is what makes pinch feel natural.
- Zoom is driven by the *change* in the thumb-index gap frame to frame, not its absolute value, so there's no jump when you first pinch.
- The pinch **midpoint** is emitted so the gallery can pan while pinched.

### Smoothing (important)
Raw MediaPipe data is jittery. We apply an **exponential moving average (EMA)** in two layers:
- **Motion** (`useHandGestures.js`): palm position, pinch gap, and pinch midpoint are each smoothed before driving pan/zoom. Constant `SMOOTH = 0.4`.
- **Overlay** (`handDraw.js`): the drawn skeleton landmarks are smoothed separately so the dots/bones glide. Constant `DRAW_SMOOTH = 0.5`.

EMA tradeoff: lower alpha = smoother but laggier; higher = snappier but jumpier.

---

## 4. Architecture

```
src/
├── App.jsx                  startup → gallery; holds the memory set (stable across reveal)
├── main.jsx                 React entry
├── styles.css               reset, font import (Cormorant Garamond), background
├── components/
│   ├── StartupScreen.jsx     centered camera + fist→open trigger + fallback
│   ├── Gallery.jsx           canvas, pan/zoom/point, reveal, controls, webcam preview
│   ├── CanvasItem.jsx        photo / sticky / sticker renderers + fly-out + highlight
│   ├── SkeletonVideo.jsx     mirrored <video> + <canvas> skeleton overlay (shared)
│   ├── Sidebar.jsx           "add a memory" panel (notes / photos / stickers)
│   └── HintBadge.jsx         fading instruction badge
├── hooks/
│   ├── useFistTrigger.js     startup-only: watches for fist→open, debounced
│   └── useHandGestures.js    gallery: pan/zoom/point + smoothing + camera retry
└── lib/
    ├── constants.js          colors, stickers, frames, helpers, makeDemo() (phyllotaxis)
    ├── gestures.js           21-landmark → gesture classifier (isFist, isOpenHand, detectGesture)
    └── handDraw.js           skeleton drawing via MediaPipe drawing_utils + overlay smoothing
```

### Key technical decisions & gotchas

- **MediaPipe is loaded from the CDN as classic `<script>` tags**, not npm imports. The `@mediapipe/hands` / `camera_utils` / `drawing_utils` npm packages do NOT ship clean ES modules — importing them under Vite yields `undefined`. We read `window.Hands`, `window.Camera`, `window.drawConnectors`, etc. The npm packages are still listed in `package.json` (harmless; only used as a self-hosting path — see below).
- **Two separate camera hooks.** The startup screen and gallery each manage their own MediaPipe + camera lifecycle. When transitioning, the startup camera must release before the gallery grabs it — so `useHandGestures` **retries `camera.start()` up to 4× with a 500ms delay** to survive the handoff (otherwise the first grab throws `NotReadableError` and gestures appear to "turn off").
- **Camera errors do NOT auto-disable gestures.** A transient failure just shows a message; gestures stay "on" so the user can grant permission / retry without re-toggling.
- **Three-layer transforms in `CanvasItem`.** Position (and reveal animation) / scatter-rotation / 3D-rotation+highlight are nested in separate divs. Only the inner layers carry CSS transitions, so panning stays instant while rotation/highlight animate. Putting a transition on the combined transform would make panning laggy.
- **3D cylinder** = each item gets a `rotateY` proportional to its on-screen X position, so panning rotates photos into/out of view like the inside of a cylinder.
- **Phyllotaxis layout** (`makeDemo`): angle = `i × 137.5°` (golden angle), radius = `spacing × √i`. Even, organic spiral from center outward; scales automatically to any number of photos.

---

## 5. Visual design

- **Background**: `#fff3d1` (warm golden cream). Set in `styles.css`, `Gallery.jsx`, `StartupScreen.jsx`.
- **Type**: Cormorant Garamond (italic wordmark, condensed serif controls), imported in `styles.css`.
- **Controls**: large stark uppercase serif — `3D / FLAT` (top-left), `GESTURES ON / OFF` (top-right), `CREATE` (bottom-left).
- **Hand skeleton**: white bones (`lineWidth 1.5`), purple-filled joints (`#a04bca`, `radius 2`). Styles in `handDraw.js`.
- Photo frames: `bare` (soft shadow), `polaroid` (white border), `gingham` (blue check border).

---

## 6. Tuning knobs (where to change what)

| Want to change | File | What |
| --- | --- | --- |
| Gesture smoothness | `useHandGestures.js` | `SMOOTH` (0.4) — lower = smoother/laggier |
| Skeleton smoothness | `handDraw.js` | `DRAW_SMOOTH` (0.5) |
| Zoom speed | `useHandGestures.js` | the `* 9` in the zoom branch |
| Pinch sensitivity | `gestures.js` | `pinch < 0.12` threshold — smaller = pinch tighter to engage |
| Spiral spacing | `constants.js` | `spacing` (150) in `makeDemo` |
| Skeleton dot size | `handDraw.js` | `radius` (2) in `LANDMARK_STYLE` |
| Skeleton colors | `handDraw.js` | `CONNECTION_STYLE` / `LANDMARK_STYLE` |
| Fist trigger feel | `useFistTrigger.js` | `FIST_FRAMES` (4) to arm, `OPEN_FRAMES` (3) to fire |
| Gestures on/off at start | `Gallery.jsx` | `useState(true)` for `gesturesOn` |
| Background color | `styles.css` + `Gallery.jsx` + `StartupScreen.jsx` | `#fff3d1` |

---

## 7. Swapping in real photos

Currently photos are placeholders from `picsum.photos`. To use a real set:

1. Drop image files in `public/photos/` (files in `public/` serve from the site root).
2. Edit `makeDemo()` in `src/lib/constants.js` — replace the `PHOTO_SEEDS` source list with your filenames and point `src` at `/photos/<filename>`. Keep the phyllotaxis position math as-is; it scales to any count.

Example:
```js
const MY_PHOTOS = [
  { file: "beach.jpg",  w: 220, h: 165 },
  { file: "dinner.jpg", w: 180, h: 240 },
  // …
]
// in makeDemo: src: `/photos/${file}` instead of the picsum URL
```

---

## 8. Build & deploy

```bash
npm run build      # → dist/
npm run preview    # serve the production build locally
```

Deploy `dist/` to any static host. **Vercel**: import repo, framework preset **Vite**. You get HTTPS automatically, so the camera works in production. (Netlify / Cloudflare Pages work the same way.)

---

## 9. Requirements & known limitations

- **Browser**: Chrome or Edge. MediaPipe's hand model is unreliable on Safari.
- **Secure origin** required for camera (localhost or https).
- **Internet on first load**: placeholder photos + MediaPipe assets load from CDNs (jsDelivr). If an ad-blocker blocks jsDelivr, gestures + skeleton silently won't load (fails soft — app still runs on mouse/keyboard).
- **No persistence**: refreshing resets the board. Uploaded/added items use in-memory state only.
- **Camera tearing/banding** seen on some webcams is a hardware/driver issue, not the app; smoothing mitigates the tracking effect but can't fix the raw feed.

---

## 10. Open next steps (suggested priority)

1. **Pinch-to-grab-and-drag** individual items — the "drag stickies anywhere" behavior from the original concept. (Point + pinch to pick up, move, release.) Most impactful remaining feature.
2. **Fist-to-recenter** in the gallery — the `fist` gesture is already detected, just needs binding to reset pan/zoom to origin.
3. **Persistence** — IndexedDB for local boards, or a backend (Supabase) for sharing/saving.
4. **Editable sticky-note text.**
5. **One Euro filter** instead of EMA — smooths hard when the hand is still but stays responsive on fast motion, removing the smoothness/lag tradeoff. Gold standard for gesture input.
6. **Self-host MediaPipe assets** — copy `node_modules/@mediapipe/*/{*.js,*.wasm,*.data,*.tflite,*.binarypb}` into `public/mediapipe/` and repoint the CDN URLs in `useHandGestures.js` / `useFistTrigger.js` / `handDraw.js`. Removes the CDN dependency (works offline, immune to ad-blockers).

---

## 11. Change log (build history)

- Single-file artifact → modular Vite project.
- Fixed MediaPipe ESM import failure → CDN script loading.
- Fixed one-directional zoom → pose-based, then true thumb-index pinch.
- Removed file-upload screen → fist-to-open startup screen with centered camera.
- Added center-outward fly-out reveal (snappy burst).
- Added live hand-skeleton overlay (both camera views).
- Changed fist trigger to fire on **open** (with jitter guard).
- Gestures default **on**; fixed camera-handoff race with retry.
- Background → `#fff3d1`; skeleton → white bones + purple dots.
- Added pinch-and-move; EMA smoothing on motion + overlay.
- Layout → phyllotaxis spiral from center.
