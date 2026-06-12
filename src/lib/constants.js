/* ------------------------------------------------------------------ */
/*  constants.js — palette, layout math, demo content                  */
/* ------------------------------------------------------------------ */

/* ---------------- tuning ------------------------------------------ */
export const SPIRAL_SPACING = 150;      // distance between items (↑ = sparser spiral)
export const GOLDEN_ANGLE = 137.5;      // phyllotaxis angle, degrees
export const DEMO_COUNT = 15;           // ~20 max before perf degrades
export const DECOR_COUNT = 30;          // scrapbook ephemera count

/* ---------------- palette ------------------------------------------ */
export const COLORS = {
  canvas: "#fff3d1",
  text: "#1A1A1A",
  muted: "#BCB0A0",
  joints: "#a04bca",
  bones: "#FFFFFF",
};

export const DECOR_COLORS = ["#E8CFAE", "#D4BEB0", "#BED0C8", "#D0C4B8", "#C8C0D0"];

export const STICKY_COLORS = ["#FFF6A9", "#FFD9C4", "#CDEAD9", "#D9E2FF", "#F4CFE4"];

export const STICKERS = ["✶", "❀", "☻", "♡", "✉", "☼", "✿", "★"];

/* ---------------- phyllotaxis -------------------------------------- */

// Golden-angle spiral position for index i. Density stays even as n grows;
// the same pattern found in sunflowers and pinecones.
export function phyllotaxis(i, spacing = SPIRAL_SPACING) {
  const angle = i * GOLDEN_ANGLE * (Math.PI / 180);
  const radius = spacing * Math.sqrt(i + 0.6);
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
    radius,
  };
}

// Parallax depth grows with spiral radius — edge items drift more (0.25–1.0).
export function depthForIndex(i, total) {
  const t = total <= 1 ? 1 : i / (total - 1);
  return 0.25 + t * 0.75;
}

let uid = 0;
export const nextId = () => `item-${++uid}-${Date.now().toString(36)}`;

/* ---------------- demo content ------------------------------------- */

const FRAMES = ["bare", "polaroid", "gingham"];

export function makeDemo(count = DEMO_COUNT) {
  const items = [];
  for (let i = 0; i < count; i++) {
    const pos = phyllotaxis(i);
    items.push({
      id: nextId(),
      kind: "photo",
      src: `https://picsum.photos/seed/liminal-${i + 7}/420/${i % 3 === 0 ? 520 : 420}`,
      frame: FRAMES[i % FRAMES.length],
      x: pos.x,
      y: pos.y,
      rotation: (Math.random() * 12 - 6) || 3, // 2–8° organic scatter
      depth: depthForIndex(i, count),
      w: 168 + (i % 4) * 14,
      index: i,
    });
  }
  return items;
}

export function makeSticky(index) {
  const pos = phyllotaxis(index);
  return {
    id: nextId(),
    kind: "sticky",
    color: STICKY_COLORS[index % STICKY_COLORS.length],
    text: "a small\nthought",
    x: pos.x,
    y: pos.y,
    rotation: Math.random() * 10 - 5,
    depth: depthForIndex(index, index + 1),
    w: 132,
    index,
  };
}

export function makeSticker(index) {
  const pos = phyllotaxis(index);
  return {
    id: nextId(),
    kind: "sticker",
    glyph: STICKERS[Math.floor(Math.random() * STICKERS.length)],
    x: pos.x,
    y: pos.y,
    rotation: Math.random() * 24 - 12,
    depth: depthForIndex(index, index + 1),
    w: 64,
    index,
  };
}

export function makePhoto(index) {
  const pos = phyllotaxis(index);
  return {
    id: nextId(),
    kind: "photo",
    src: `https://picsum.photos/seed/liminal-${index + Math.floor(Math.random() * 900)}/420/440`,
    frame: FRAMES[index % FRAMES.length],
    x: pos.x,
    y: pos.y,
    rotation: Math.random() * 12 - 6,
    depth: depthForIndex(index, index + 1),
    w: 176,
    index,
  };
}

/* ---------------- scrapbook decorations ----------------------------- */

const DECOR_TYPES = ["tape", "tapeWide", "star", "cross", "asterisk", "dots", "bracket"];

export function makeDecorations(count = DECOR_COUNT) {
  const decs = [];
  for (let i = 0; i < count; i++) {
    // offset phyllotaxis so ephemera interleaves between photos
    const pos = phyllotaxis(i * 1.7 + 0.9, SPIRAL_SPACING * 1.18);
    decs.push({
      id: `dec-${i}`,
      type: DECOR_TYPES[i % DECOR_TYPES.length],
      color: DECOR_COLORS[i % DECOR_COLORS.length],
      x: pos.x,
      y: pos.y,
      rotation: Math.random() * 60 - 30,
      opacity: 0.18 + Math.random() * 0.28, // 0.18–0.46
      scale: 0.8 + Math.random() * 0.7,
    });
  }
  return decs;
}

/* ---------------- misc helpers -------------------------------------- */

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
