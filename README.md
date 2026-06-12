# liminal

A browser-based memory world you control with your hands.

Photos float in a phyllotaxis spiral on an infinite canvas, rotating gently in
space. MediaPipe hand tracking turns your webcam into the controller — pan with
an open palm, zoom with a pinch, point to choose, spin with two fingers, fist
to recenter. Mouse and keyboard always work as a fallback.

## Run it

```bash
npm install
npm run dev
```

Open the printed `localhost` URL in **Chrome or Edge** and allow camera access.
Camera requires a secure context — `localhost` in dev, `https://` in
production. It will not work over a LAN IP.

## Entry

Hold a **fist** at the startup screen until the system arms, then **open your
palm** — the spiral bursts into existence. Click "Enter without gestures" to
skip.

## Gestures

| Gesture | Action |
|---|---|
| Open palm, move | Pan the canvas |
| Pinch, spread / close | Zoom |
| Pinch + move | Zoom and pan together |
| Point (index up) | Highlight nearest memory |
| Point + hold 2s | Open fullscreen preview |
| Point, then pinch | Grab and drag that memory |
| Two fingers, move left/right | Spin the spiral (vinyl-flick feel) |
| Fist | Recenter and replay the burst |

Mouse: drag to pan (with inertia), scroll to zoom, drag items directly.
Keyboard: arrows pan, `+` / `−` zoom, `Esc` closes the preview.

## Architecture notes

- **MediaPipe loads via CDN `<script>` tags** (`window.Hands`, `window.Camera`)
  in `index.html`. The npm package fails silently under Vite — do not convert
  to imports.
- All continuous motion (pan, zoom, spiral rotation, parallax, inertia) runs in
  a single RAF loop in `Gallery.jsx` writing directly to the DOM. React owns
  discrete state only.
- Each item renders through a strict 4-layer transform stack
  (`CanvasItem.jsx`) — position/burst, scatter rotation, flat parallax,
  3D/hover. See the file header for why collapsing layers breaks things.
- Two separate EMA layers: gesture motion (`useHandGestures.js`, α 0.4) and
  skeleton drawing (`handDraw.js`, α 0.5).

## Tuning reference

All knobs sit at the top of their files.

| Parameter | File | Constant | Default |
|---|---|---|---|
| Gesture smoothness | `hooks/useHandGestures.js` | `SMOOTH` | 0.4 |
| Skeleton smoothness | `lib/handDraw.js` | `DRAW_SMOOTH` | 0.5 |
| Pinch sensitivity | `lib/gestures.js` | `PINCH_THRESHOLD` | 0.12 |
| Zoom speed | `components/Gallery.jsx` | `ZOOM_GAIN` | 9 |
| Pan speed | `components/Gallery.jsx` | `PAN_GAIN` | 1.35 |
| Auto-rotation | `components/Gallery.jsx` | `BASE` | 0.022 °/frame |
| Spin inertia decay | `components/Gallery.jsx` | `SPIRAL_DECAY` | 0.96 |
| Pan inertia decay | `components/Gallery.jsx` | `PAN_DECAY` | 0.91 |
| Spiral spacing | `lib/constants.js` | `SPIRAL_SPACING` | 150 |
| Burst ease / duration | `components/CanvasItem.jsx` | `BURST_EASE` / `BURST_DUR` | spring / 0.84s |
| Fist / open thresholds | `hooks/useFistTrigger.js` | `FIST_FRAMES` / `OPEN_FRAMES` | 4 / 3 |
| Music volume | `hooks/useAmbientMusic.js` | `MASTER_LEVEL` | 0.22 |

## Known limitations

- Ad-blockers may block the jsDelivr CDN, silently disabling hand tracking.
  The app stays usable via mouse/keyboard.
- Point hit-test accuracy drifts slightly as the spiral rotates away from base
  positions (mitigated with a rotation-aware screen→world transform, but the
  nearest-item search is still approximate at high spin).
- ~20 items max before frame drops on average hardware. Demo ships with 15.
- Chrome/Edge only. MediaPipe is unreliable on Safari.

## Deploy

```bash
npm run build && npm run preview
```

Deploy `dist/` to any static host. Vercel (framework preset: Vite) gives you
the required HTTPS automatically.
