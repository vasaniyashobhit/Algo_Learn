import { crc32, deflateSync } from 'node:zlib';
import { glyphRows } from './font.js';

const SCALE = 3;
const MARGIN = 30;
const CHAR_W = 6 * SCALE;
const LINE_H = 11 * SCALE;

const chunk = (type, data) => {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'latin1');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])) >>> 0, 0);
  return Buffer.concat([head, data, crc]);
};

/** Encodes an 8-bit grayscale image as a PNG; `pixelAt(x, y)` gives 0 (black) … 255 (white). */
export const encodePng = (width, height, pixelAt) => {
  const raw = Buffer.alloc((width + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (width + 1)] = 0;
    for (let x = 0; x < width; x += 1) raw[y * (width + 1) + 1 + x] = pixelAt(x, y);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 0, 0, 0, 0], 8);
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([signature, chunk('IHDR', header), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
};

/** 1 where a glyph pixel is inked, else 0 (the 5×7 font scaled ×SCALE, 1 column of spacing). */
const inkAt = (text, x, y) => {
  const line = text[Math.floor((y - MARGIN) / LINE_H)];
  if (x < MARGIN || y < MARGIN || !line) return 0;
  const char = line[Math.floor((x - MARGIN) / CHAR_W)];
  const gx = Math.floor(((x - MARGIN) % CHAR_W) / SCALE);
  const gy = Math.floor(((y - MARGIN) % LINE_H) / SCALE);
  if (!char || gx > 4 || gy > 6) return 0;
  return glyphRows(char)[gy][gx] === '1' ? 1 : 0;
};

/**
 * Renders lines of text (upper-cased) in black on white. A 3×3 average softens the pixel edges,
 * which makes the bitmap font much easier for OCR to read.
 */
export const textPng = (lines) => {
  const text = lines.map((line) => line.toUpperCase());
  const width = MARGIN * 2 + Math.max(...text.map((line) => line.length)) * CHAR_W;
  const height = MARGIN * 2 + text.length * LINE_H;
  return encodePng(width, height, (x, y) => {
    let ink = 0;
    for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) ink += inkAt(text, x + dx, y + dy);
    return Math.round(255 * (1 - ink / 9));
  });
};
