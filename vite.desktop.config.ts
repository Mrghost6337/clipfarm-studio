import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

// The renderer of the Windows app: the same React code and styles.css as the
// website, served from app://clipfarm. No Cloudflare plugin, no CDN.
// Vendor files (fonts, MediaPipe, ONNX Runtime) are copied in by
// desktop/scripts/vendor.mjs after this build.

function dropBundledOrt(): Plugin {
  // transformers.js emits its own copy of the 26 MB ONNX Runtime wasm; the app
  // serves the matching files from /vendor/ort/ instead, so keep one copy.
  return {
    name: 'drop-bundled-ort',
    apply: 'build',
    generateBundle(_options, bundle) {
      for (const key of Object.keys(bundle)) if (/^assets\/ort-wasm-.*\.wasm$/.test(key)) delete bundle[key]
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), dropBundledOrt()],
  define: {
    'import.meta.env.VITE_DESKTOP': JSON.stringify('1'),
    'import.meta.env.VITE_PIPELINE_API': JSON.stringify('/pipeline-api'),
  },
  build: {
    outDir: 'desktop/dist/renderer',
    emptyOutDir: true,
    sourcemap: false,
    chunkSizeWarningLimit: 4000,
    rollupOptions: { input: 'desktop.html' },
  },
})
