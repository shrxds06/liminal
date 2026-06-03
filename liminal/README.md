# liminal

A memory world you control with your hands. Open the app, raise your hand to the camera, and **close your fist to open your world** — your memories burst out from the center across an infinite canvas you then pan, zoom, point at, and rotate with hand gestures (powered by MediaPipe Hands).

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:5173 (use the **Local** URL, not the LAN IP — the camera only works on a secure context). Allow camera access, make a fist, and the world opens.

## The flow

1. **Startup screen** — a centered camera window watches your hand. A white ring appears when a hand is detected.
2. **Close your fist** (hold briefly) — triggers the reveal. There's also an "or click to enter" fallback, and if the camera can't start it switches to a plain Enter button.
3. **The burst** — all memories start collapsed at the center and snap outward to their scattered positions with a staggered, snappy ease.
4. **Explore** — pan, zoom, point, toggle 3D, and add memories.

## Controls

| Action | Mouse / keyboard | Hand gesture |
| --- | --- | --- |
| Open the world | click "enter" | close fist ✊ |
| Pan | drag canvas · arrow keys | open palm ✋, move hand |
| Zoom | scroll wheel · `+` / `-` | pinch pose 🤏 (curl middle/ring/pinky), spread = in, close = out |
| Highlight | hover | point ☝️ (index up, others curled) at a photo |
| 3D / Flat | top-left toggle | — |
| Add memory | bottom-left **CREATE** | — |

## Swapping in your own images

Right now the canvas loads placeholder photos from `picsum.photos`. To use your own set, edit `makeDemo()` in `src/lib/constants.js`. Drop your files in `public/photos/` and point the `src` values at them:

```js
const MY_PHOTOS = [
  { file: "beach.jpg",  w: 220, h: 165 },
  { file: "dinner.jpg", w: 180, h: 240 },
  // …
]

export function makeDemo() {
  return MY_PHOTOS.map(({ file, w, h }) => ({
    id: uid(),
    type: "photo",
    src: `/photos/${file}`,
    x: rand(-680, 680),
    y: rand(-380, 380),
    rotation: rand(-16, 16),
    width: w,
    height: h,
    frame: "bare",
  }))
}
```

Files in `public/` are served from the site root, so `public/photos/beach.jpg` → `/photos/beach.jpg`.

## How it works

- **Gesture detection** — `@mediapipe/hands` returns 21 landmarks per hand each frame. `src/lib/gestures.js` classifies them by which fingers are extended: fist → open-world / recenter, open palm → pan, index-only → point, middle/ring/pinky curled → zoom (thumb–index distance sets the amount).
- **Two gesture hooks** — `useFistTrigger.js` runs on the startup screen watching only for a debounced fist; `useHandGestures.js` runs in the gallery for pan/zoom/point. Both load MediaPipe from the CDN (the npm builds aren't clean ES modules) and emit raw landmarks via `onLandmarks`.
- **Hand skeleton overlay** — `SkeletonVideo.jsx` lays a `<canvas>` over the mirrored video and paints the 21 landmarks + connections each frame using MediaPipe's `drawing_utils` (wrapped in `src/lib/handDraw.js`). Shown on both the startup camera and the in-gallery preview.
- **The fly-out** — `CanvasItem` renders collapsed at the center (`left/top: 0`, scaled down, transparent) until `revealed` flips true, then transitions to each item's target `x/y` with a per-item stagger delay for the burst feel.
- **3D cylinder** — each item gets a `rotateY` proportional to its on-screen X position, so panning rotates photos into and out of view like the inside of a cylinder.

## Project structure

```
src/
├── App.jsx                  startup → gallery, holds the memory set
├── styles.css               reset + font import + background
├── components/
│   ├── StartupScreen.jsx     centered camera + fist trigger
│   ├── Gallery.jsx           canvas, pan/zoom/point, reveal, controls
│   ├── CanvasItem.jsx        photo / sticky / sticker + fly-out + highlight
│   ├── SkeletonVideo.jsx     mirrored video + hand-skeleton canvas overlay
│   ├── Sidebar.jsx           add-a-memory panel
│   └── HintBadge.jsx         fading instruction badge
├── hooks/
│   ├── useFistTrigger.js     startup fist detection
│   └── useHandGestures.js    gallery pan/zoom/point
└── lib/
    ├── constants.js          colors, stickers, frames, helpers, demo data
    ├── gestures.js           21-landmark → gesture classifier
    └── handDraw.js           skeleton drawing via MediaPipe drawing_utils
```

## Requirements & caveats

- **Browser**: Chrome or Edge. MediaPipe's hand model is unreliable on Safari.
- **Secure origin**: webcam access requires `localhost` (dev) or HTTPS (production). Use the Local URL.
- **No persistence**: refreshing resets the board (intentional MVP scope).
- **Internet on first load**: placeholder photos + MediaPipe assets load from CDNs.
- **No camera? No problem**: the startup screen offers a click-to-enter fallback, and the gallery works fully with mouse + keyboard.

## Build & deploy

```bash
npm run build
npm run preview
```

Deploy `dist/` to any static host. On Vercel: import the repo, framework preset **Vite** — you get HTTPS automatically, so the camera works.

## Next steps worth considering

- Point-and-pinch to **grab and drag** items (the "drag stickies anywhere" behavior).
- Fist-in-gallery to **recenter** the canvas (the `fist` gesture is already detected).
- Editable sticky note text; persist boards (IndexedDB or a backend).
- Gesture smoothing to steady a jittery camera feed.
