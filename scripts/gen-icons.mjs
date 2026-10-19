// Generates the water-drop PNGs (app icon + in-app drop) with no dependencies.
// Run: npm run icons
import { writeFileSync, mkdirSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function encodePng(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h)
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr.set([8, 6, 0, 0, 0], 8)
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// Drop = circle at the bottom + a tapering point on top.
function inDrop(x, y, d) {
  const dx = x - d.cx
  if (dx * dx + (y - d.cy) ** 2 <= d.r * d.r) return true
  if (y < d.tip || y > d.cy) return false
  const t = (y - d.tip) / (d.cy - d.tip)
  return Math.abs(dx) <= d.r * Math.pow(t, 0.75)
}

function inCircle(x, y, c) {
  return (x - c.cx) ** 2 + (y - c.cy) ** 2 <= c.r * c.r
}

// Renders with 4x4 supersampling; `shade(x, y)` returns [r, g, b, a] or null.
function render(w, h, shade) {
  const out = Buffer.alloc(w * h * 4)
  const S = 4
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0, a = 0
      for (let sy = 0; sy < S; sy++) {
        for (let sx = 0; sx < S; sx++) {
          const c = shade(x + (sx + 0.5) / S, y + (sy + 0.5) / S)
          if (!c) continue
          const ca = c[3] / 255
          r += c[0] * ca; g += c[1] * ca; b += c[2] * ca; a += ca
        }
      }
      const i = (y * w + x) * 4
      if (a > 0) {
        out[i] = Math.round(r / a)
        out[i + 1] = Math.round(g / a)
        out[i + 2] = Math.round(b / a)
        out[i + 3] = Math.round((a / (S * S)) * 255)
      }
    }
  }
  return out
}

function mix(c1, c2, t) {
  return c1.map((v, i) => Math.round(v + (c2[i] - v) * t))
}

const WHITE = [255, 255, 255, 255]
const LIGHT = [205, 232, 255, 255]
const BLUE_TOP = [72, 168, 255, 255]
const BLUE_BOTTOM = [16, 96, 214, 255]

// App icon: blue gradient disc with a white drop.
function appIcon(size) {
  const bg = { cx: size / 2, cy: size / 2, r: size / 2 }
  const drop = { cx: size / 2, cy: size * 0.6, r: size * 0.22, tip: size * 0.18 }
  const shine = { cx: size * 0.43, cy: size * 0.62, r: size * 0.06 }
  return render(size, size, (x, y) => {
    if (!inCircle(x, y, bg)) return null
    if (inDrop(x, y, drop)) return inCircle(x, y, shine) ? LIGHT : WHITE
    return mix(BLUE_TOP, BLUE_BOTTOM, y / size)
  })
}

// In-app drop: white drop with a soft highlight, sits on top of the water.
function inAppDrop(w, h) {
  const drop = { cx: w / 2, cy: h * 0.64, r: w * 0.4, tip: h * 0.04 }
  const shine = { cx: w * 0.38, cy: h * 0.68, r: w * 0.1 }
  return render(w, h, (x, y) => {
    if (!inDrop(x, y, drop)) return null
    return inCircle(x, y, shine) ? LIGHT : [255, 255, 255, 235]
  })
}

const ICON = 248
const DROP_W = 96
const DROP_H = 120

for (const target of ['assets/gt.s', 'assets/gt.r']) {
  mkdirSync(target, { recursive: true })
  writeFileSync(`${target}/icon.png`, encodePng(ICON, ICON, appIcon(ICON)))
  writeFileSync(`${target}/drop.png`, encodePng(DROP_W, DROP_H, inAppDrop(DROP_W, DROP_H)))
}
console.log('Icons written to assets/gt.s and assets/gt.r')
