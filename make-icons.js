// Generates icon-192.png and icon-512.png — a single bone "through line"
// across a dark field. On-brand and dependency-free (raw PNG encoder).
const zlib = require("zlib");
const fs = require("fs");

const BG = [0x00, 0x00, 0x00];
const LINE = [0xd6, 0xcf, 0xbf];

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, "ascii");
  const body = Buffer.concat([t, data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function png(size) {
  const bpp = 3;
  const raw = Buffer.alloc((size * bpp + 1) * size);
  const lineThickness = Math.max(2, Math.round(size * 0.012));
  const yMid = Math.floor(size / 2);
  const xPad = Math.round(size * 0.18); // safe-zone margin for maskable
  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * bpp + 1);
    raw[rowStart] = 0; // filter: none
    const onLine = Math.abs(y - yMid) < lineThickness / 2;
    for (let x = 0; x < size; x++) {
      const px = rowStart + 1 + x * bpp;
      const col = onLine && x >= xPad && x < size - xPad ? LINE : BG;
      raw[px] = col[0]; raw[px + 1] = col[1]; raw[px + 2] = col[2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const idat = zlib.deflateSync(raw);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
for (const s of [192, 512]) {
  fs.writeFileSync(`${__dirname}/icon-${s}.png`, png(s));
  console.log(`wrote icon-${s}.png`);
}
