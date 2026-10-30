/**
 * generate-icons.mjs
 * Creates minimal valid placeholder PNG icons for PWA development.
 * Replace with properly designed icons before publishing.
 * Usage: node scripts/generate-icons.mjs
 */
import { writeFileSync, mkdirSync } from 'fs';
import { deflateSync } from 'zlib';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, '..', 'public', 'icons');

function crc32(buf) {
  const table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = (table[(crc ^ b) & 0xff] ^ (crc >>> 8)) >>> 0;
  return (~crc) >>> 0;
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crcInput = Buffer.concat([typeBytes, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput));
  return Buffer.concat([len, typeBytes, data, crcBuf]);
}

function createPng(size, bgR, bgG, bgB) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  // Raw image data: filter byte + RGB per pixel per row
  const raw = Buffer.alloc(size * (1 + size * 3));
  for (let y = 0; y < size; y++) {
    const rowOffset = y * (1 + size * 3);
    raw[rowOffset] = 0; // None filter
    for (let x = 0; x < size; x++) {
      const px = rowOffset + 1 + x * 3;
      raw[px] = bgR;
      raw[px + 1] = bgG;
      raw[px + 2] = bgB;
    }
  }

  const idat = deflateSync(raw);

  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(iconsDir, { recursive: true });
writeFileSync(join(iconsDir, 'icon-192.png'), createPng(192, 15, 23, 42));
writeFileSync(join(iconsDir, 'icon-512.png'), createPng(512, 15, 23, 42));
console.log('✅ Placeholder icons generated in public/icons/');
console.log('   Replace with properly designed icons before publishing.');
