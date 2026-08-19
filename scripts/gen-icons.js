#!/usr/bin/env node
/**
 * Generates every app icon from pixel grids, so the launcher artwork is the
 * same dot-matrix design as the game and no binary is ever hand-edited.
 *
 *   node scripts/gen-icons.js
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

/** Kept in step with SHELL and LCD in src/theme/tokens.ts. */
const PALETTE = {
  '.': '#c9cbc4', // shell plastic
  B: '#5c5670', // screen bezel
  G: '#9bbc0f', // the lit LCD
  '#': '#0f380f', // ink on the LCD
  N: '#2b3087', // printed navy
  M: '#b5185a', // A/B button crimson
  D: '#2b2b2b', // the d-pad
  W: '#ffffff', // monochrome layer
  ' ': null, // transparent
};

/** The question mark on the screen: the secret nobody may see yet. */
const MARK = [
  '.####.',
  '##..##',
  '....##',
  '...##.',
  '..##..',
  '..##..',
  '......',
  '..##..',
  '..##..',
];

function grid(width, height, fill) {
  return Array.from({ length: height }, () => fill.repeat(width).split(''));
}

function rect(g, x0, y0, x1, y1, ch) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g[y][x] = ch;
}

/** Stamps a pattern, treating '.' in the pattern as "leave what is there". */
function stamp(g, x0, y0, rows, ch) {
  rows.forEach((row, y) =>
    row.split('').forEach((cell, x) => {
      if (cell === '#') g[y0 + y][x0 + x] = ch;
    }),
  );
}

/** The whole handheld: grey body, bezel, lit screen, wordmark, two buttons. */
function handheld() {
  const g = grid(24, 24, '.');
  rect(g, 2, 2, 21, 16, 'B');
  rect(g, 3, 3, 8, 3, 'M');
  rect(g, 15, 3, 20, 3, 'M');
  rect(g, 3, 4, 8, 4, 'N');
  rect(g, 15, 4, 20, 4, 'N');
  rect(g, 4, 6, 19, 15, 'G');
  stamp(g, 9, 7, MARK, '#');
  rect(g, 7, 18, 16, 19, 'N');
  // The d-pad on the left, the two buttons on the right.
  rect(g, 4, 20, 4, 22, 'D');
  rect(g, 3, 21, 5, 21, 'D');
  rect(g, 14, 21, 16, 22, 'M');
  rect(g, 18, 21, 20, 22, 'M');
  return g.map((row) => row.join(''));
}

/** Just the screen module, which survives Android's circular icon crop. */
function screenModule() {
  const g = grid(18, 14, 'B');
  rect(g, 1, 2, 16, 12, 'G');
  stamp(g, 6, 3, MARK, '#');
  return g.map((row) => row.join(''));
}

/** The bare mark, for the monochrome layer Android tints itself. */
const SILHOUETTE = MARK.map((row) => row.replace(/#/g, 'W'));

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = -1;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, crc]);
}

/** Writes an RGBA PNG. `pixels` is a width*height*4 byte buffer. */
function writePng(file, width, height, pixels) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  fs.writeFileSync(
    file,
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk('IHDR', ihdr),
      chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
      chunk('IEND', Buffer.alloc(0)),
    ]),
  );
  console.log(`wrote ${path.relative(process.cwd(), file)} (${width}x${height})`);
}

function rgb(hex) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

/**
 * Renders a character grid at `size`. One square cell per source pixel, so a
 * non-square grid is never stretched. `inset` is the fraction of the canvas
 * left empty around the art; `bleed` fills the whole canvas with one colour
 * first, for icons that are not meant to be transparent.
 */
function render(file, size, rows, { inset = 0, bleed = null } = {}) {
  const cols = rows[0].length;
  const pixels = Buffer.alloc(size * size * 4);
  if (bleed) {
    const [r, g, b] = rgb(bleed);
    for (let i = 0; i < size * size; i++) {
      pixels[i * 4] = r;
      pixels[i * 4 + 1] = g;
      pixels[i * 4 + 2] = b;
      pixels[i * 4 + 3] = 255;
    }
  }
  const box = Math.round(size * (1 - inset * 2));
  const cell = Math.floor(box / Math.max(cols, rows.length));
  const artW = cell * cols;
  const artH = cell * rows.length;
  const originX = Math.round((size - artW) / 2);
  const originY = Math.round((size - artH) / 2);

  for (let y = 0; y < artH; y++) {
    const row = rows[Math.floor(y / cell)];
    for (let x = 0; x < artW; x++) {
      const hex = PALETTE[row[Math.floor(x / cell)]];
      if (!hex) continue;
      const [r, g, b] = rgb(hex);
      const i = ((originY + y) * size + originX + x) * 4;
      pixels[i] = r;
      pixels[i + 1] = g;
      pixels[i + 2] = b;
      pixels[i + 3] = 255;
    }
  }
  writePng(file, size, size, pixels);
}

const assets = path.join(__dirname, '..', 'assets');
const HANDHELD = handheld();
const SCREEN = screenModule();

render(path.join(assets, 'icon.png'), 1024, HANDHELD, { bleed: PALETTE['.'] });
render(path.join(assets, 'splash-icon.png'), 512, HANDHELD, { bleed: PALETTE['.'] });
render(path.join(assets, 'favicon.png'), 64, HANDHELD, { bleed: PALETTE['.'] });
render(path.join(assets, 'android-icon-background.png'), 1024, ['.'], { bleed: PALETTE['.'] });
// Android crops the adaptive icon, so its foreground is the screen module
// alone, kept well inside the safe zone.
render(path.join(assets, 'android-icon-foreground.png'), 1024, SCREEN, { inset: 0.2 });
render(path.join(assets, 'android-icon-monochrome.png'), 1024, SILHOUETTE, { inset: 0.28 });
