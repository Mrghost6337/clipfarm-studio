// Strips files the Sites uploader refuses (hidden files, source maps and the
// 26 MB onnxruntime WebAssembly build, which is served from the CDN instead)
// from the build output, so `deploy.json` can point straight at dist/.
import { readdirSync, rmSync, statSync } from 'node:fs'
import { join } from 'node:path'

function clean(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (name.startsWith('.') || name.endsWith('.map') || (name.startsWith('ort-wasm-') && name.endsWith('.wasm'))) {
      rmSync(path, { recursive: true, force: true })
      continue
    }
    if (statSync(path).isDirectory()) clean(path)
  }
}

clean(new URL('../dist', import.meta.url).pathname)
