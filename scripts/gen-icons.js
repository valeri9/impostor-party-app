#!/usr/bin/env node
/**
 * Generates every app icon from a pixel grid, so the launcher artwork is the
 * same dot-matrix design as the game and no binary is hand-edited.
 *
 *   node scripts/gen-icons.js
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const LCD_LIGHTEST = [0x9b, 0xbc, 0x0f];
const INK = [0x0f, 0x38, 0x0f];
const WHITE = [0xff, 0xff, 0xff];

/** 16x16 source art: a framed question mark — the secret nobody may see yet. */
const ICON = [
  '################',
  '#..............#',
  '#..............#',
  '#...########...#',
  '#...##....##...#',
  '#...##....##...#',
  '#.........##...#',
  '#........##....#',
  '#.......##.....#',
  '#......##......#',
  '#......##......#',
  '#..............#',
  '#......##......#',
  '#......##......#',
  '#..............#',
  '################',
];

/**
 * Drops the empty margin around a grid so it can be centred. Only the outside
 * is trimmed — the blank row above the question mark's dot has to survive.
 */
function trim(rows) {
  const litRows = rows.map((row, y) => (row.includes('#') ? y : -1)).filter((y) => y >= 0);
  const litCols = [...Array(rows[0].length).keys()].filter((x) => rows.some((row) => row[x] === '#'));
  return rows
    .slice(Math.min(...litRows), Math.max(...litRows) + 1)
    .map((row) => row.slice(Math.min(...litCols), Math.max(...litCols) + 1));
}

/** The same mark without its frame, for the adaptive icon's foreground layer. */
const GLYPH = trim(ICON.map((row) => row.slice(1, -1)).slice(1, -1));

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

/**
 * Renders a pixel grid at `size`, nearest-neighbour so the pixels stay hard.
 * `inset` is the fraction of the canvas left empty around the art.
 */
function render(file, size, rows, { on, off, inset = 0 }) {
  const cols = rows[0].length;
  const pixels = Buffer.alloc(size * size * 4);
  if (off) {
    for (let i = 0; i < size * size; i++) {
      pixels[i * 4] = off[0];
      pixels[i * 4 + 1] = off[1];
      pixels[i * 4 + 2] = off[2];
      pixels[i * 4 + 3] = 255;
    }
  }
  // One square cell per source pixel, so a non-square grid is never stretched.
  const box = Math.round(size * (1 - inset * 2));
  const cell = Math.floor(box / Math.max(cols, rows.length));
  const artW = cell * cols;
  const artH = cell * rows.length;
  const originX = Math.round((size - artW) / 2);
  const originY = Math.round((size - artH) / 2);

  for (let y = 0; y < artH; y++) {
    const gy = Math.floor(y / cell);
    for (let x = 0; x < artW; x++) {
      const gx = Math.floor(x / cell);
      if (rows[gy][gx] !== '#') continue;
      const i = ((originY + y) * size + originX + x) * 4;
      pixels[i] = on[0];
      pixels[i + 1] = on[1];
      pixels[i + 2] = on[2];
      pixels[i + 3] = 255;
    }
  }
  writePng(file, size, size, pixels);
}

const assets = path.join(__dirname, '..', 'assets');
render(path.join(assets, 'icon.png'), 1024, ICON, { on: INK, off: LCD_LIGHTEST });
render(path.join(assets, 'splash-icon.png'), 512, ICON, { on: INK, off: LCD_LIGHTEST });
render(path.join(assets, 'favicon.png'), 64, ICON, { on: INK, off: LCD_LIGHTEST });
render(path.join(assets, 'android-icon-background.png'), 1024, ['#'], { on: LCD_LIGHTEST });
// Adaptive foreground and monochrome layers keep Android's safe zone clear.
render(path.join(assets, 'android-icon-foreground.png'), 1024, GLYPH, { on: INK, inset: 0.18 });
render(path.join(assets, 'android-icon-monochrome.png'), 1024, GLYPH, { on: WHITE, inset: 0.18 });
