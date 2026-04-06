import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'

// CRC32 table for PNG chunks
const crcTable = (() => {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[i] = c
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const crcInput = Buffer.concat([typeBytes, data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(crcInput))
  return Buffer.concat([len, typeBytes, data, crc])
}

function makePNG(size) {
  const pixels = Buffer.alloc(size * size * 4)
  const cx = size / 2, cy = size / 2
  const outerR = size * 0.42
  const innerR = size * 0.22

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx, dy = y - cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      const idx = (y * size + x) * 4
      // Black background
      pixels[idx] = 0; pixels[idx + 1] = 0; pixels[idx + 2] = 0; pixels[idx + 3] = 255
      // Cyan ring
      if (dist <= outerR && dist >= innerR) {
        const alpha = Math.min(1, (outerR - dist) / 3) * Math.min(1, (dist - innerR) / 3)
        const a = Math.round(alpha * 255)
        pixels[idx] = 0; pixels[idx + 1] = 255; pixels[idx + 2] = 200; pixels[idx + 3] = Math.max(200, a === 0 ? 255 : a)
      }
    }
  }

  // Build raw PNG row data (filter byte 0 per row)
  const rows = []
  for (let y = 0; y < size; y++) {
    rows.push(Buffer.from([0]))
    rows.push(pixels.slice(y * size * 4, (y + 1) * size * 4))
  }
  const compressed = deflateSync(Buffer.concat(rows))

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8   // bit depth
  ihdr[9] = 6   // RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

mkdirSync('assets', { recursive: true })
writeFileSync('assets/icon-192.png', makePNG(192))
writeFileSync('assets/icon-512.png', makePNG(512))
console.log('✓ assets/icon-192.png')
console.log('✓ assets/icon-512.png')
