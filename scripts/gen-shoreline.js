#!/usr/bin/env node
/**
 * Generates the "Shoreline" skin's animated beach banner — pixel-art layers
 * (sky, a tiling cloud strip, three tide frames, two palms, and a static
 * layer of umbrellas/towels on the sand) composed from small procedural
 * functions rather than hand-placed pixels, so the three tide frames are
 * just the same shoreline function called with a different baseline.
 *
 *   node scripts/gen-shoreline.js
 *
 * Writes src/theme/scenes/shoreline.ts. Nothing here runs in the app; the
 * app only ever imports the SVG strings this script produces.
 */
const fs = require('fs');
const path = require('path');

const PX = 5;

function createSurface(cols, rows) {
  const W = cols * PX, H = rows * PX;
  const grid = Array.from({ length: rows }, () => new Array(cols).fill(null));

  function set(x, y, color) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || x >= cols || y < 0 || y >= rows) return;
    grid[y][x] = color;
  }
  function rect(x0, y0, x1, y1, color) {
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) set(x, y, color);
  }
  // A 4x4 ordered (Bayer) dither between two colours, for a soft pixel-art
  // gradient made only of flat fills — no colour that isn't in the palette.
  function ditherBand(x0, x1, y0, y1, colorTop, colorBottom) {
    const bayer = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
    const rows = y1 - y0;
    for (let y = y0; y < y1; y++) {
      const t = (y - y0) / rows;
      for (let x = x0; x < x1; x++) {
        set(x, y, t > bayer[y % 4][x % 4] / 16 ? colorBottom : colorTop);
      }
    }
  }
  function blob(cx, cy, rx, ry, color) {
    for (let y = -ry; y <= ry; y++) {
      for (let x = -rx; x <= rx; x++) {
        if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1) set(cx + x, cy + y, color);
      }
    }
  }
  function toSVGString() {
    let rects = '';
    for (let y = 0; y < rows; y++) {
      let x = 0;
      while (x < cols) {
        const c = grid[y][x];
        if (!c) { x++; continue; }
        let x2 = x;
        while (x2 < cols && grid[y][x2] === c) x2++;
        rects += `<rect x="${x * PX}" y="${y * PX}" width="${(x2 - x) * PX}" height="${PX}" fill="${c}"/>`;
        x = x2;
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" shape-rendering="crispEdges">${rects}</svg>`;
  }

  return { COLS: cols, ROWS: rows, set, rect, ditherBand, blob, toSVGString };
}

// ---- scene pieces --------------------------------------------------------

// Flat bands with a short dithered seam between them: reads as the same
// soft gradient as dithering the whole sky, at a fraction of the rect count.
function sky(s) {
  s.rect(0, 0, s.COLS, 21, '#4fa8dd');
  s.ditherBand(0, s.COLS, 21, 25, '#4fa8dd', '#7fc6ec');
  s.rect(0, 25, s.COLS, 30, '#7fc6ec');
  s.ditherBand(0, s.COLS, 30, 34, '#7fc6ec', '#bfe4f4');
}

function cloud(s, cx, cy, sc, color = '#ffffff', shade = '#dff0fa') {
  s.blob(cx - 6 * sc, cy + 1 * sc, 4 * sc, 3 * sc, color);
  s.blob(cx - 2 * sc, cy - 2 * sc, 5 * sc, 4 * sc, color);
  s.blob(cx + 3 * sc, cy - 1 * sc, 5 * sc, 4 * sc, color);
  s.blob(cx + 8 * sc, cy + 1 * sc, 3.5 * sc, 3 * sc, color);
  s.blob(cx + 1 * sc, cy + 2 * sc, 8 * sc, 2.5 * sc, color);
  s.blob(cx + 1 * sc, cy + 3 * sc, 7.5 * sc, 1.4 * sc, shade);
}

// The coastline's y-boundary per column: a gentle wavy line, not a straight
// edge. baseY shifts the whole shoreline up or down for the tide frames.
function shoreY(x, baseY, amp = 1.6) {
  return baseY + Math.sin(x / 6) * amp + Math.sin(x / 2.3) * (amp * 0.35);
}

function sea(s, baseY) {
  for (let x = 0; x < s.COLS; x++) {
    const sY = shoreY(x, baseY);
    for (let y = 34; y < s.ROWS; y++) {
      if (y >= sY) continue;
      const depth = (sY - y) / (sY - 34);
      const c = depth > 0.75 ? '#0f5f86' : depth > 0.45 ? '#1c7fa8' : depth > 0.18 ? '#3aa8c4' : '#5ec6cf';
      s.set(x, y, c);
    }
  }
}

// The dry-sand fill used by most of the beach — exported below so anything
// that needs to blend with the scene's edge (a "cover" sizing fallback, a
// loading placeholder) can match it exactly instead of guessing a nearby
// tan and creating a visible seam.
const SAND_COLOR = '#f2dca0';

function sandAndFoam(s, baseY) {
  for (let x = 0; x < s.COLS; x++) {
    const sY = Math.round(shoreY(x, baseY));
    for (let y = sY; y < sY + 2; y++) s.set(x, y, '#c9a86a');
    for (let y = sY + 2; y < s.ROWS; y++) {
      s.set(x, y, ((x * 13 + y * 7) % 11) === 0 ? '#e6c68a' : SAND_COLOR);
    }
    s.set(x, sY - 1, '#ffffff');
    if (((x * 7) % 5) === 0) s.set(x, sY - 2, '#ffffff');
  }
  const flecks = [4, 5, 6, 18, 19, 33, 34, 35, 48, 49, 62, 63, 64, 72, 73];
  flecks.forEach((x) => {
    const sY = Math.round(shoreY(x, baseY));
    s.set(x, sY + 2, '#ffffff');
    s.set(x + 1, sY + 3, '#ffffff');
  });
  const caps = [10, 22, 38, 44, 58, 70];
  caps.forEach((x) => {
    const sY = Math.round(shoreY(x, baseY));
    s.set(x, sY - 4, '#ffffff');
    s.set(x + 2, sY - 3, '#ffffff');
  });
}

// A single tapering, gently curved frond, walked step by step from the
// crown outward so it can bend and thin toward the tip.
function frond(s, cx, cy, angleDeg, length, curveDeg, colorBase, colorTip) {
  let ang = (angleDeg * Math.PI) / 180;
  const curve = (curveDeg * Math.PI) / 180 / length;
  let x = cx, y = cy;
  for (let i = 0; i < length; i++) {
    const t = i / length;
    const w = Math.max(1, 3.2 * (1 - t * 0.9));
    const color = t < 0.5 ? colorBase : colorTip;
    const perp = ang + Math.PI / 2;
    const px = Math.cos(perp), py = Math.sin(perp);
    for (let o = -w / 2; o <= w / 2; o += 0.6) {
      s.set(x + px * o, y + py * o * 0.6, color);
    }
    x += Math.cos(ang) * 0.9;
    y += Math.sin(ang) * 0.7;
    ang += curve;
  }
}

function palm(s, baseX, baseY, h, lean) {
  let x = baseX;
  const bark = '#8a5a34', barkDark = '#6b4426';
  for (let i = 0; i < h; i++) {
    const t = i / h;
    const drift = Math.sin(t * 2.1) * 1.6 * lean + t * 2.2 * lean;
    const px = Math.round(baseX + drift);
    const y = baseY - i;
    s.set(px, y, bark);
    s.set(px - 1, y, barkDark);
    if (i % 4 === 0) s.set(px + 1, y, barkDark);
    x = px;
  }
  const crownX = x, crownY = baseY - h + 1;
  const dark = '#2f7a3f', light = '#4fae5e';
  const angles = [-160, -140, -120, -100, -80, -60, -40, -20, 0, 20];
  angles.forEach((a, i) => {
    const len = 12 + (i % 3) * 2;
    const curve = a < -90 ? 26 : a < -30 ? 10 : -18;
    frond(s, crownX, crownY, a, len, curve, dark, light);
  });
  s.set(crownX, crownY + 1, '#6b4426');
  s.set(crownX + 1, crownY + 2, '#6b4426');
}

// A striped beach umbrella: half-dome canopy, scalloped rim, pole, and a
// grounding shadow — dropped straight onto the sand.
function umbrella(s, cx, cy, r, colorA, colorB, poleColor) {
  for (let y = -r; y <= 0; y++) {
    const w = Math.sqrt(Math.max(0, 1 - (y * y) / (r * r))) * r;
    const x0 = Math.round(-w), x1 = Math.round(w);
    const span = x1 - x0 || 1;
    for (let x = x0; x <= x1; x++) {
      const band = Math.floor(((x - x0) / span) * 6);
      s.set(cx + x, cy + y, band % 2 === 0 ? colorA : colorB);
    }
  }
  for (let x = -Math.round(r); x <= Math.round(r); x += 2) s.set(cx + x, cy + 1, colorA);
  for (let i = 1; i <= r + 3; i++) s.set(cx, cy + i, poleColor);
  const shR = Math.max(2, Math.round(r * 0.5));
  for (let x = -shR; x <= shR; x++) s.set(cx + x, cy + Math.round(r) + 3, '#d9b87a');
}

// A folded beach towel lying flat on the sand, striped like the umbrellas.
function towel(s, cx, cy, w, h, colorA, colorB) {
  const x0 = Math.round(cx - w / 2), y0 = Math.round(cy - h / 2);
  for (let y = 0; y < h; y++) {
    const color = y % 2 === 0 ? colorA : colorB;
    for (let x = 0; x < w; x++) s.set(x0 + x, y0 + y, color);
  }
}

// ---- compose the seven layers --------------------------------------------

// ROWS grew from 64 to 90 (COLS held at 80, so the scene got taller/less
// wide — sky and sea keep their own fixed row boundaries below, so all the
// extra rows become new dry sand) — real foreground room for a second row
// of beach props instead of leaving it to the infinite SandFill tile beyond
// the scene's own box.
const COLS = 80, ROWS = 90;
const CLOUD_POSITIONS = [[16, 9, 1.1], [50, 8, 0.9], [67, 11, 0.65]];
// Shoreline sits higher up (was [46, 44.3, 42.6]) so more of the canvas is
// dry sand — more of a wide beach, less a close-up crop of the shoreline —
// and there's real room for umbrellas and towels between the tide line and
// the players' hands.
const TIDE_BASE_Y = [40, 38.3, 36.6];
// Repositioned toward the new bottom edge (was y:60/58 when ROWS was 64) so
// the palms keep framing the very front of the scene, not the mid-beach.
const PALMS = [
  { x: 6, y: 85, h: 15, lean: -1 },
  { x: 70, y: 83, h: 18, lean: 1 },
];
// Two rows — a smaller, further-back pair near the tide line, and a
// bigger, closer pair nearer the bottom edge — so the sand reads as
// populated all the way down, not just in a thin strip up top. The
// near-row pair is staggered (left lower than right), not a rigid grid.
const UMBRELLAS = [
  { x: 24, y: 50, r: 5, colorA: '#ff6b4a', colorB: '#fff5e6', pole: '#6b4426' },
  { x: 58, y: 52, r: 4.5, colorA: '#2a9d8f', colorB: '#eaf6fb', pole: '#6b4426' },
  { x: 26, y: 78, r: 6.5, colorA: '#2a9d8f', colorB: '#fff5e6', pole: '#6b4426' },
  { x: 60, y: 73, r: 6, colorA: '#ff6b4a', colorB: '#eaf6fb', pole: '#6b4426' },
];
const TOWELS = [
  { x: 33, y: 60, w: 10, h: 3, colorA: '#ff7a5c', colorB: '#eaf6fb' },
  { x: 49, y: 61, w: 9, h: 3, colorA: '#2a9d8f', colorB: '#fff5e6' },
  { x: 38, y: 88, w: 13, h: 4, colorA: '#ff7a5c', colorB: '#fff5e6' },
  { x: 53, y: 82, w: 12, h: 4, colorA: '#2a9d8f', colorB: '#eaf6fb' },
];

// A seamlessly-tileable swatch of the same dry-sand speckle sandAndFoam
// paints, for anything that needs sand behind/beyond the scene itself (a
// "cover" sizing shortfall, a loading placeholder) to match exactly rather
// than fall back to a flat, visibly-seamed color. It tiles with zero seam
// because 11 — the formula's own modulus — evenly divides both of its
// strides (13*11 and 7*11), so the pattern repeats exactly every 11 cells
// in x and in y.
const SAND_FLECK_COLOR = '#e6c68a';
const SAND_TILE_CELLS = 11;
const SAND_TILE_SIZE = SAND_TILE_CELLS * PX;
const SAND_FLECK_RECTS = [];
for (let y = 0; y < SAND_TILE_CELLS; y++) {
  for (let x = 0; x < SAND_TILE_CELLS; x++) {
    if (((x * 13 + y * 7) % 11) === 0) SAND_FLECK_RECTS.push({ x: x * PX, y: y * PX, size: PX });
  }
}

const skySurface = createSurface(COLS, ROWS);
sky(skySurface);

const cloudSurface = createSurface(COLS * 2, ROWS);
CLOUD_POSITIONS.forEach(([x, y, sc]) => cloud(cloudSurface, x, y, sc));
CLOUD_POSITIONS.forEach(([x, y, sc]) => cloud(cloudSurface, x + COLS, y, sc));

const tideSurfaces = TIDE_BASE_Y.map((baseY) => {
  const s = createSurface(COLS, ROWS);
  sea(s, baseY);
  sandAndFoam(s, baseY);
  return s;
});

const palmSurfaces = PALMS.map((p) => {
  const s = createSurface(COLS, ROWS);
  palm(s, p.x, p.y, p.h, p.lean);
  return s;
});

const propsSurface = createSurface(COLS, ROWS);
UMBRELLAS.forEach((u) => umbrella(propsSurface, u.x, u.y, u.r, u.colorA, u.colorB, u.pole));
TOWELS.forEach((t) => towel(propsSurface, t.x, t.y, t.w, t.h, t.colorA, t.colorB));

const esc = (svg) => svg.replace(/`/g, '\\`');

const ts = `/**
 * The "Shoreline" skin's animated beach banner — generated by
 * scripts/gen-shoreline.js, exported here as static SVG strings so
 * BeachScene.tsx can render them via SvgXml without doing any of this work
 * at runtime. Regenerate with \`node scripts/gen-shoreline.js\`.
 *
 * All layers share one 400x320 coordinate space (viewBox), so they
 * composite directly on top of one another with no offset math needed.
 * SCENE_ASPECT_RATIO is that space's width/height, for sizing the container.
 */

export const SCENE_ASPECT_RATIO = ${COLS} / ${ROWS};

/** The dry-sand fill most of the beach is painted in — for anything that
 *  needs to blend seamlessly with the scene's edge rather than guess a
 *  nearby tan. */
export const SAND_COLOR = '${SAND_COLOR}';

/** A seamlessly-tileable sand swatch: fleck positions (in px, within one
 *  \`SAND_TILE_SIZE\` square) using the exact rule sandAndFoam paints the
 *  beach's own dry sand with, so a tiled fill of these matches the scene's
 *  texture exactly rather than reading as a different, flatter patch. */
export const SAND_TILE_SIZE = ${SAND_TILE_SIZE};
export const SAND_FLECK_COLOR = '${SAND_FLECK_COLOR}';
export const SAND_FLECK_RECTS: { x: number; y: number; size: number }[] = ${JSON.stringify(SAND_FLECK_RECTS)};

/** Static base: sky gradient. Never animates. */
export const SKY_SVG = \`${esc(skySurface.toSVGString())}\`;

/** Two copies of the same clouds, side by side — sliding this left by
 *  exactly one visible-frame-width loops seamlessly. */
export const CLOUDS_SVG = \`${esc(cloudSurface.toSVGString())}\`;

/** Three shoreline positions to cross-fade through for the tide. */
export const TIDE_FRAMES: string[] = [
${tideSurfaces.map((s) => `  \`${esc(s.toSVGString())}\`,`).join('\n')}
];

/** Umbrellas and towels on the sand — static, drawn once above the tide. */
export const PROPS_SVG = \`${esc(propsSurface.toSVGString())}\`;

/** Each palm on its own full-scene transparent canvas, so it can be swayed
 *  by rotating around its own base without touching anything else. */
export const PALM_LEFT_SVG = \`${esc(palmSurfaces[0].toSVGString())}\`;
export const PALM_RIGHT_SVG = \`${esc(palmSurfaces[1].toSVGString())}\`;

/** Each palm's trunk base, as a fraction of the scene's width/height —
 *  the pivot point its sway rotation is anchored to. */
export const PALM_PIVOTS: { xPct: number; yPct: number }[] = [
${PALMS.map((p) => `  { xPct: ${p.x} / ${COLS}, yPct: ${p.y} / ${ROWS} },`).join('\n')}
];
`;

const outPath = path.join(__dirname, '..', 'src', 'theme', 'scenes', 'shoreline.ts');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, ts);
console.log(`wrote ${ts.length} bytes to ${path.relative(process.cwd(), outPath)}`);
