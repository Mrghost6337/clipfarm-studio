// Copies everything the website loads from CDNs into the app, so the desktop
// app never fetches code or models from a third party at runtime:
//   /vendor/fonts      Inter Tight + Caveat (SIL OFL 1.1)
//   /vendor/mediapipe  MediaPipe Tasks Vision 1.2.3 bundle + wasm (Apache-2.0)
//                      and the BlazeFace short-range model (Apache-2.0)
//   /vendor/ort        the ONNX Runtime Web build transformers.js loads (MIT)
// Run after the renderer build: bun run build.
import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const desktop = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repo = path.resolve(desktop, '..')
const out = path.join(desktop, 'dist', 'renderer', 'vendor')
const nm = (...parts) => path.join(desktop, 'node_modules', ...parts)

const BLAZE_FACE_SHA256 = 'b4578f35940bf5a1a655214a1cce5cab13eba73c1297cd78e1a04c2380b0152f'

function copy(from, to) {
  if (!existsSync(from)) throw new Error(`vendor: missing ${from}. Run bun install in desktop/.`)
  mkdirSync(path.dirname(to), { recursive: true })
  copyFileSync(from, to)
}

// Fonts: latin + latin-ext cover English UI copy and most creator names.
const fonts = path.join(out, 'fonts')
for (const subset of ['latin', 'latin-ext']) {
  for (const style of ['normal', 'italic']) copy(nm('@fontsource-variable', 'inter-tight', 'files', `inter-tight-${subset}-wght-${style}.woff2`), path.join(fonts, `inter-tight-${subset}-wght-${style}.woff2`))
  copy(nm('@fontsource', 'caveat', 'files', `caveat-${subset}-600-normal.woff2`), path.join(fonts, `caveat-${subset}-600-normal.woff2`))
}
copy(nm('@fontsource-variable', 'inter-tight', 'LICENSE'), path.join(fonts, 'LICENSE-inter-tight.txt'))
copy(nm('@fontsource', 'caveat', 'LICENSE'), path.join(fonts, 'LICENSE-caveat.txt'))

// MediaPipe
const mp = path.join(out, 'mediapipe')
copy(nm('@mediapipe', 'tasks-vision', 'vision_bundle.mjs'), path.join(mp, 'vision_bundle.mjs'))
for (const file of readdirSync(nm('@mediapipe', 'tasks-vision', 'wasm'))) copy(nm('@mediapipe', 'tasks-vision', 'wasm', file), path.join(mp, 'wasm', file))
const model = path.join(desktop, 'assets', 'vendor', 'blaze_face_short_range.tflite')
const hash = createHash('sha256').update(readFileSync(model)).digest('hex')
if (hash !== BLAZE_FACE_SHA256) throw new Error('vendor: BlazeFace model hash mismatch')
copy(model, path.join(mp, 'blaze_face_short_range.tflite'))

// ONNX Runtime Web: only the files the bundled worker asks for.
const ortDist = path.join(repo, 'node_modules', 'onnxruntime-web', 'dist')
const assets = path.join(desktop, 'dist', 'renderer', 'assets')
const referenced = new Set()
for (const file of readdirSync(assets).filter((name) => name.endsWith('.js'))) {
  for (const match of readFileSync(path.join(assets, file), 'utf8').matchAll(/ort-wasm-simd-threaded[a-z.]*\.(?:mjs|wasm)/g)) referenced.add(match[0])
}
const ort = path.join(out, 'ort')
const copied = []
for (const name of referenced) {
  const source = path.join(ortDist, name)
  if (existsSync(source)) {
    copy(source, path.join(ort, name))
    copied.push(name)
  }
}
// Each .mjs loader needs its .wasm.
for (const name of [...copied]) {
  const wasm = name.replace(/\.mjs$/, '.wasm')
  if (name.endsWith('.mjs') && !copied.includes(wasm) && existsSync(path.join(ortDist, wasm))) {
    copy(path.join(ortDist, wasm), path.join(ort, wasm))
    copied.push(wasm)
  }
}
const ortLicense = JSON.parse(readFileSync(path.join(repo, 'node_modules', 'onnxruntime-web', 'package.json'), 'utf8')).license
if (ortLicense !== 'MIT') throw new Error(`vendor: onnxruntime-web licence changed to ${ortLicense}`)

writeFileSync(path.join(out, 'VENDOR.txt'), `Bundled third-party files\n\nfonts/: Inter Tight, Caveat — SIL Open Font License 1.1 (see LICENSE-*.txt)\nmediapipe/: @mediapipe/tasks-vision 1.2.3 and BlazeFace short range — Apache License 2.0\nort/: onnxruntime-web — MIT, Copyright (c) Microsoft Corporation, https://github.com/microsoft/onnxruntime/blob/main/LICENSE (${copied.join(', ')})\n`)
console.log(`vendor: fonts, mediapipe, ort (${copied.join(', ') || 'none referenced'})`)
