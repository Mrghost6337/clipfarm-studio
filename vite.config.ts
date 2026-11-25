import { cloudflare } from '@cloudflare/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

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
    // the dev page same-origin, so SSE and video files need no CORS.
    proxy: {
      '/pipeline-api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: false,
        rewrite: (path) => path.replace(/^\/pipeline-api/, ''),
      },
    },
  },
})
