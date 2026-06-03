// ───────────────────────────────────────────────────────────────
// Shared constants & data
// ───────────────────────────────────────────────────────────────

export const NOTE_COLORS = [
  { id: "white", hex: "#FFFFFF" },
  { id: "cream", hex: "#F7F2E0" },
  { id: "warm",  hex: "#EDE5D4" },
  { id: "sand",  hex: "#D8CFBC" },
  { id: "mocha", hex: "#BFB09E" },
]

export const STICKER_SET = [
  { id: "disco",   e: "🪩" },
  { id: "bear",    e: "🧸" },
  { id: "star_s",  e: "⭐" },
  { id: "star_b",  e: "💙" },
  { id: "flower",  e: "🌸" },
  { id: "flower2", e: "💠" },
  { id: "bow",     e: "🎀" },
  { id: "gem",     e: "💎" },
  { id: "sparkle", e: "✨" },
]

export const PHOTO_FRAMES = [
  { id: "bare",     label: "Bare",     w: 200, h: 150, aspect: "4 / 3" },
  { id: "polaroid", label: "Polaroid", w: 160, h: 200, aspect: "3 / 4" },
  { id: "gingham",  label: "Gingham",  w: 200, h: 150, aspect: "4 / 3" },
]

const PHOTO_SEEDS = [
  ["room", 165, 120], ["cafe", 150, 125], ["street", 160, 110], ["window", 160, 110], ["coast", 165, 125],
  ["table", 160, 125], ["portrait", 150, 115], ["books", 150, 115], ["city", 170, 120], ["food", 160, 125],
  ["flowers", 160, 110], ["arch", 160, 125], ["interior", 160, 115], ["travel", 150, 110], ["texture", 160, 115],
  ["garden", 160, 115], ["night", 165, 120], ["shore", 160, 115], ["market", 160, 115], ["desk", 170, 120],
  ["forest", 150, 120], ["bridge", 170, 115], ["rooftop", 160, 120], ["dinner", 150, 120], ["mountain", 165, 110],
  ["studio", 165, 110], ["alley", 165, 120], ["harbor", 165, 125], ["field", 165, 115], ["stairs", 170, 125],
  ["mirror", 160, 110], ["lamp", 165, 110], ["train", 165, 125], ["beach", 150, 125], ["snow", 165, 125],
  ["dusk", 150, 125], ["river", 150, 115], ["park", 160, 110], ["tower", 160, 125], ["gate", 165, 120],
  ["lake", 165, 125], ["cliff", 150, 120], ["dawn", 165, 110], ["valley", 170, 110], ["port", 160, 120],
  ["attic", 165, 115], ["hall", 165, 120], ["court", 150, 120],
]

// ───────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
export const rand = (a, b) => a + Math.random() * (b - a)

let _uid = 0
export const uid = () => `item-${++_uid}`

// Golden angle (137.5°) in radians — the spacing between successive
// points in a phyllotaxis (sunflower) spiral.
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

// ───────────────────────────────────────────────────────────────
// Cylinder layout
//
// Photos wrap onto a real cylinder: each gets an angle θ around the
// vertical axis and a height. We spread them as a gentle multi-turn
// helix so the front-facing band always shows a varied mix and the
// density stays even top-to-bottom.
//
//   theta  → rotateY around the cylinder axis (deg)
//   hy     → vertical offset along the axis (px)
//   tilt   → small rotateZ lean, for an organic scrapbook feel
//
// CanvasItem places each item with:
//   rotateY(theta) translateZ(radius) translateY(hy) rotateZ(tilt)
// and the Gallery rotates the whole stage to pan. (See CYL below for
// the tunable radius / turns / height.)
// ───────────────────────────────────────────────────────────────

export const CYL = {
  radius: 360,   // cylinder radius (px) — front photos sit this far toward the viewer
  turns: 3,      // helix wraps this many times top-to-bottom (density around the ring)
  height: 1000,  // total vertical span of the band (px)
  spreadScale: 0.62, // photo scale in the flat spread
  fillW: 0.86,   // fraction of viewport width the spread fills
  fillH: 0.80,   // fraction of viewport height the spread fills
}

const SPREAD_COLS = 8

// Each item carries a CYLINDER placement (two inward-curling columns:
// cx / cy) and a flat SPREAD placement (normalized sx / sy in [-0.5,0.5],
// scaled to the live viewport). The Gallery morphs positions between the
// two and fades the rotateY curl as it spreads. Fist → cylinder, open
// palm → spread (and pans it).
export function makeCylinder() {
  const n = PHOTO_SEEDS.length
  const angleStep = (360 * CYL.turns) / n
  const cols = SPREAD_COLS
  const srows = Math.ceil(n / cols)

  return PHOTO_SEEDS.map(([seed, w, h], i) => {
    // cylinder — photos wrapped around a vertical axis (a gentle helix)
    const theta = i * angleStep
    const hy = (i / (n - 1) - 0.5) * CYL.height
    const tilt = Math.sin(i * 1.7) * 3

    // spread — jittered grid (normalized), the wide scatter from the clip
    const scol = i % cols
    const srow = Math.floor(i / cols)
    const sx = (scol + 0.5) / cols - 0.5 + (rand(-1, 1) * 0.5) / cols
    const sy = (srow + 0.5) / srows - 0.5 + (rand(-1, 1) * 0.5) / srows
    const frot = rand(-9, 9)

    return {
      id: uid(),
      type: "photo",
      src: `https://picsum.photos/seed/${seed}/${w}/${h}`,
      theta, hy, tilt, sx, sy, frot,
      width: w,
      height: h,
      frame: "bare",
    }
  })
}

// Legacy flat phyllotaxis layout — kept for reference / the old FLAT board.
export function makeDemo() {
  const n = PHOTO_SEEDS.length
  const spacing = 150

  return PHOTO_SEEDS.map(([seed, w, h], i) => {
    const angle = i * GOLDEN_ANGLE
    const radius = spacing * Math.sqrt(i)
    return {
      id: uid(),
      type: "photo",
      src: `https://picsum.photos/seed/${seed}/${w}/${h}`,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      rotation: Math.sin(angle) * 8,
      width: w,
      height: h,
      frame: "bare",
    }
  })
}
