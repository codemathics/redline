// rasterize the figma crop-mark (axis-aligned rects) into chrome icon pngs.
import { writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs'
import { deflateSync, crc32 } from 'node:zlib'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const iconsDir = resolve(root, 'extension/icons')
mkdirSync(iconsDir, { recursive: true })

const markSrc = existsSync(resolve(root, '.tmp-figma/mark.svg'))
  ? resolve(root, '.tmp-figma/mark.svg')
  : resolve(iconsDir, 'mark.svg')
if (markSrc !== resolve(iconsDir, 'mark.svg')) {
  copyFileSync(markSrc, resolve(iconsDir, 'mark.svg'))
}

// source viewBox from the figma mark
const VB_W = 1040
const VB_H = 1051

function makeCanvas(w, h) {
  return { w, h, data: Buffer.alloc(w * h * 4) }
}

function setPx(c, x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= c.w || y >= c.h) return
  const i = (y * c.w + x) * 4
  c.data[i] = r
  c.data[i + 1] = g
  c.data[i + 2] = b
  c.data[i + 3] = a
}

function fillRect(c, x, y, w, h, r, g, b, a = 255) {
  const x0 = Math.max(0, Math.floor(x))
  const y0 = Math.max(0, Math.floor(y))
  const x1 = Math.min(c.w, Math.ceil(x + w))
  const y1 = Math.min(c.h, Math.ceil(y + h))
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) setPx(c, xx, yy, r, g, b, a)
  }
}

// 16/32 get a heavier stroke of the same crop-mark so the toolbar still reads.
// 48/128 keep the figma bar and corner sizes, with chrome's 16px pad on 128.
function drawMark(c, { pad, bar, corner }) {
  const art = Math.min(c.w, c.h) - pad * 2
  const sx = art / VB_W
  const sy = art / VB_H
  const ox = pad
  const oy = pad
  const red = [255, 0, 0]
  const rects = [
    [31.8359, 150, bar, 751],
    [1008 - bar, 150, bar, 751],
    [143, 32, 751, bar],
    [143, 979, 751, bar],
    [VB_W - corner, 0, corner, corner],
    [0, 0, corner, corner],
    [0, VB_H - corner, corner, corner],
    [VB_W - corner, VB_H - corner, corner, corner],
  ]
  for (const [x, y, w, h] of rects) {
    fillRect(c, ox + x * sx, oy + y * sy, w * sx, h * sy, ...red)
  }
}

function u32(n) {
  const b = Buffer.alloc(4)
  b.writeUInt32BE(n >>> 0)
  return b
}

function chunk(type, data) {
  const t = Buffer.from(type)
  const body = Buffer.concat([t, data])
  return Buffer.concat([u32(data.length), body, u32(crc32(body))])
}

function encodePng(c) {
  const raw = Buffer.alloc((c.w * 4 + 1) * c.h)
  for (let y = 0; y < c.h; y++) {
    raw[y * (c.w * 4 + 1)] = 0
    c.data.copy(raw, y * (c.w * 4 + 1) + 1, y * c.w * 4, (y + 1) * c.w * 4)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(c.w, 0)
  ihdr.writeUInt32BE(c.h, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
  return png
}

function writeIcon(name, size, opts) {
  const c = makeCanvas(size, size)
  drawMark(c, opts)
  const dest = resolve(iconsDir, name)
  writeFileSync(dest, encodePng(c))
  console.log(dest, size)
}

writeIcon('icon16.png', 16, { pad: 1, bar: 120, corner: 160 })
writeIcon('icon32.png', 32, { pad: 2, bar: 88, corner: 120 })
writeIcon('icon48.png', 48, { pad: 4, bar: 56, corner: 88 })
writeIcon('icon128.png', 128, { pad: 16, bar: 40, corner: 72 })

console.log('icons written. promo tile is store/promo-small.html (lockup on dark paper).')
