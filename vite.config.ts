import { cloudflare } from '@cloudflare/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'

// The pipeline writes a fresh launch token on every start. The dev proxy reads
// it per request, so the dev page is authorized without pairing and the token
// never reaches the browser.
const PIPELINE_DATA = process.env.PIPELINE_DATA || resolve(import.meta.dirname, 'pipeline/data')
function launchToken() {
  try {
    return process.env.PIPELINE_LAUNCH_TOKEN || readFileSync(resolve(PIPELINE_DATA, 'launch-token'), 'utf8').trim()
  } catch {
    return ''
  }
}

// The onnxruntime WASM build is 26 MB, above the Sites upload limit. The
// transcriber loads it from a pinned CDN URL at runtime, so keep it out of the
// bundle no matter which build command the Publish button uses.
function stripOrtWasm(): Plugin {
  return {
    name: 'strip-ort-wasm',
    apply: 'build',
    generateBundle(_options, bundle) {
      for (const key of Object.keys(bundle)) {
        if (/^assets\/ort-wasm-.*\.wasm$/.test(key)) delete bundle[key]
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), cloudflare(), stripOrtWasm()],
  server: {
    port: 5357,
    strictPort: false,
    // The local pipeline (python -m pipeline.cli serve) on 8787. Proxying keeps
    // the dev page same-origin, so SSE and video files need no CORS or tickets.
    proxy: {
      '/pipeline-api': {
        target: `http://127.0.0.1:${process.env.PIPELINE_PORT || 8787}`,
        // The service only answers Host 127.0.0.1:<port> (DNS-rebinding guard).
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/pipeline-api/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.removeHeader('origin')
            const token = launchToken()
            if (token) proxyReq.setHeader('authorization', `Bearer ${token}`)
          })
        },
      },
    },
  },
})
