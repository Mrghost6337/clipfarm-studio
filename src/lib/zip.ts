// A tiny, dependency-free ZIP writer (STORE, no compression). The clips are
// already-compressed MP4s, so storing them is smaller than re-deflating and it
// keeps the bundle honest: one file that opens everywhere, built in the tab.

type Entry = { name: Uint8Array; crc: number; size: number; offset: number }

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let index = 0; index < 256; index++) {
    let value = index
    for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
    table[index] = value >>> 0
  }
  return table
})()

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff
  for (let index = 0; index < bytes.length; index++) crc = CRC_TABLE[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

/** Packs files into a single .zip Blob. */
export async function zipFiles(files: Array<{ name: string; blob: Blob }>): Promise<Blob> {
  const encoder = new TextEncoder()
  const parts: Uint8Array[] = []
  const entries: Entry[] = []
  let offset = 0

  for (const file of files) {
    const name = encoder.encode(file.name)
    const data = new Uint8Array(await file.blob.arrayBuffer())
    const crc = crc32(data)

    const local = new Uint8Array(30 + name.length)
    const view = new DataView(local.buffer)
    view.setUint32(0, 0x04034b50, true)
    view.setUint16(4, 20, true)
    view.setUint16(6, 0, true)
    view.setUint16(8, 0, true)
    view.setUint16(10, 0x21, true)
    view.setUint32(14, crc, true)
    view.setUint32(18, data.length, true)
    view.setUint32(22, data.length, true)
    view.setUint16(26, name.length, true)
    view.setUint16(28, 0, true)
    local.set(name, 30)

    parts.push(local, data)
    entries.push({ name, crc, size: data.length, offset })
    offset += local.length + data.length
  }

  const directory: Uint8Array[] = []
  let directorySize = 0
  for (const entry of entries) {
    const record = new Uint8Array(46 + entry.name.length)
    const view = new DataView(record.buffer)
    view.setUint32(0, 0x02014b50, true)
    view.setUint16(4, 20, true)
    view.setUint16(6, 20, true)
    view.setUint16(8, 0, true)
    view.setUint16(10, 0, true)
    view.setUint16(12, 0, true)
    view.setUint16(14, 0x21, true)
    view.setUint32(16, entry.crc, true)
    view.setUint32(20, entry.size, true)
    view.setUint32(24, entry.size, true)
    view.setUint16(28, entry.name.length, true)
    view.setUint16(30, 0, true)
    view.setUint16(32, 0, true)
    view.setUint16(34, 0, true)
    view.setUint16(36, 0, true)
    view.setUint32(38, 0, true)
    view.setUint32(42, entry.offset, true)
    record.set(entry.name, 46)
    directory.push(record)
    directorySize += record.length
  }

  const end = new Uint8Array(22)
  const endView = new DataView(end.buffer)
  endView.setUint32(0, 0x06054b50, true)
  endView.setUint16(8, entries.length, true)
  endView.setUint16(10, entries.length, true)
  endView.setUint32(12, directorySize, true)
  endView.setUint32(16, offset, true)

  const all = [...parts, ...directory, end]
  const bytes = new Uint8Array(all.reduce((total, part) => total + part.length, 0))
  let cursor = 0
  for (const part of all) {
    bytes.set(part, cursor)
    cursor += part.length
  }
  return new Blob([bytes], { type: 'application/zip' })
}
