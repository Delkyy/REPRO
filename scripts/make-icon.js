#!/usr/bin/env node
/**
 * make-icon.js
 *
 * Creates assets/icon.png (256×256) with no external dependencies.
 *
 * Strategy A (preferred): copy the existing branded 256px PNG from
 *   assets/brand/ico/icon-256.png  →  assets/icon.png
 *
 * Strategy B (fallback): synthesise a minimal valid PNG from scratch
 *   using only Node's built-in `zlib` module — a dark (#1a1a2e) square
 *   with a white 'R' pixel-lettermark drawn by hand.
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT      = path.resolve(__dirname, '..');
const BRAND_PNG = path.join(ROOT, 'assets', 'brand', 'ico', 'icon-256.png');
const OUT_PNG   = path.join(ROOT, 'assets', 'icon.png');

// ── Strategy A ──────────────────────────────────────────────────────────────
if (fs.existsSync(BRAND_PNG)) {
  fs.copyFileSync(BRAND_PNG, OUT_PNG);
  console.log(`✓ Copied branded icon → ${OUT_PNG}`);
  process.exit(0);
}

// ── Strategy B: hand-crafted 256×256 PNG ────────────────────────────────────
console.log('Brand PNG not found — generating minimal lettermark icon…');

const W = 256, H = 256;

// Background colour: #1a1a2e  (dark navy)
const BG  = [0x1a, 0x1a, 0x2e];
// Foreground: white
const FG  = [0xff, 0xff, 0xff];

// Very simple bitmap 'R' at ~72px, centred.
// Each row is a bitmask for a 9-wide glyph; 1 = white pixel.
// The glyph is scaled 8× to fill nicely inside a 256-px canvas.
const GLYPH_ROWS = [
  0b111110000,
  0b100011000,
  0b100011000,
  0b100011000,
  0b111110000,
  0b100100000,
  0b100010000,
  0b100001000,
  0b100000100,
];
const SCALE   = 8;                            // each glyph pixel → 8 canvas px
const G_W     = 9  * SCALE;                  // 72
const G_H     = GLYPH_ROWS.length * SCALE;   // 72
const OFF_X   = Math.round((W - G_W) / 2);   // 92
const OFF_Y   = Math.round((H - G_H) / 2);   // 92

// Build raw RGB pixel buffer (no alpha — PNG will use RGB colour type 2)
const pixels = new Uint8Array(W * H * 3).fill(0);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const idx = (y * W + x) * 3;
    // Default: background
    pixels[idx]     = BG[0];
    pixels[idx + 1] = BG[1];
    pixels[idx + 2] = BG[2];
    // Lettermark
    const gy = Math.floor((y - OFF_Y) / SCALE);
    const gx = Math.floor((x - OFF_X) / SCALE);
    if (gy >= 0 && gy < GLYPH_ROWS.length && gx >= 0 && gx < 9) {
      const bit = (GLYPH_ROWS[gy] >> (8 - gx)) & 1;
      if (bit) {
        pixels[idx]     = FG[0];
        pixels[idx + 1] = FG[1];
        pixels[idx + 2] = FG[2];
      }
    }
  }
}

// ── PNG encoder (pure Node, no deps) ────────────────────────────────────────

function u32be(n) {
  const b = Buffer.allocUnsafe(4);
  b.writeUInt32BE(n, 0);
  return b;
}

function chunk(type, data) {
  const typeB = Buffer.from(type, 'ascii');
  const crc   = crc32(Buffer.concat([typeB, data]));
  return Buffer.concat([u32be(data.length), typeB, data, u32be(crc)]);
}

// CRC-32 table
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return ((c ^ 0xffffffff) >>> 0);
}

// IHDR
const ihdr = Buffer.concat([
  u32be(W), u32be(H),
  Buffer.from([8, 2, 0, 0, 0]),  // bit depth=8, colour type=2 (RGB), ...
]);

// IDAT: scanlines — each starts with filter byte 0 (None)
const scanlines = Buffer.allocUnsafe(H * (1 + W * 3));
for (let y = 0; y < H; y++) {
  scanlines[y * (1 + W * 3)] = 0; // filter None
  pixels.copy
    ? pixels.copy(scanlines, y * (1 + W * 3) + 1, y * W * 3, (y + 1) * W * 3)
    : scanlines.set(pixels.slice(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
}

// Node's zlib.deflateRawSync produces raw deflate; PNG wraps in zlib envelope
const compressed = zlib.deflateSync(scanlines, { level: 6 });

const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const pngBuf  = Buffer.concat([
  PNG_SIG,
  chunk('IHDR', ihdr),
  chunk('IDAT', compressed),
  chunk('IEND', Buffer.alloc(0)),
]);

fs.writeFileSync(OUT_PNG, pngBuf);
console.log(`✓ Generated lettermark icon → ${OUT_PNG}`);
