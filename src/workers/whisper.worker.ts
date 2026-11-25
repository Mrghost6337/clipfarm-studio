// Free, local speech-to-text. Whisper tiny (MIT) runs with transformers.js in
// this Web Worker; the audio and the result never leave the browser.

import { env, pipeline } from '@huggingface/transformers'

const MODEL = 'onnx-community/whisper-tiny'
const DESKTOP = import.meta.env.VITE_DESKTOP === '1'
const ORT_VERSION = '1.31.0-dev.20260914-8d85527a0'
if (DESKTOP) {
  // The desktop app serves the runtime from /vendor/ort/ and the weights from
  // /models/web/, installed by its model manager. Nothing is fetched remotely.
  env.allowLocalModels = true
  env.allowRemoteModels = false
  env.localModelPath = '/models/web/'
  if (env.backends.onnx.wasm) env.backends.onnx.wasm.wasmPaths = '/vendor/ort/'
} else {
  env.allowLocalModels = false
  // The bundled onnxruntime WebAssembly file is 26 MB, above the site upload
  // limit. Keep the JS local and load the exact matching runtime build from the
  // CDN instead; it is cached by the browser like the model.
  if (env.backends.onnx.wasm) {
    env.backends.onnx.wasm.wasmPaths = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/`
  }
}

type Incoming =
  | { type: 'warmup' }
  | { type: 'transcribe'; id: number; audio: Float32Array; language: string }

type Segment = { start: number; end: number; text: string }

type Outgoing =
  | { type: 'model-progress'; ratio: number; file: string }
  | { type: 'ready' }
  | { type: 'result'; id: number; segments: Segment[] }
  | { type: 'error'; id: number; message: string }

const scope = self as unknown as {
  postMessage: (message: Outgoing) => void
  onmessage: ((event: MessageEvent<Incoming>) => void) | null
}

const post = (message: Outgoing) => scope.postMessage(message)

let transcriberPromise: Promise<any> | null = null

function loadTranscriber(): Promise<any> {
  if (!transcriberPromise) {
    transcriberPromise = pipeline('automatic-speech-recognition', MODEL, {
      dtype: 'q8',
      progress_callback: (event: any) => {
        if (event?.status === 'progress' && typeof event.progress === 'number' && typeof event.file === 'string' && event.file.endsWith('.onnx')) {
          post({ type: 'model-progress', ratio: Math.min(1, event.progress / 100), file: event.file.split('/').pop() ?? '' })
        }
      },
    } as any)
      .then((model: any) => {
        post({ type: 'ready' })
        return model
      })
      .catch((error: unknown) => {
        transcriberPromise = null
        throw error
      })
  }
  return transcriberPromise
}

async function transcribe(audio: Float32Array, language: string): Promise<Segment[]> {
  const transcriber: any = await loadTranscriber()
  const result: any = await transcriber(audio, {
    language,
    task: 'transcribe',
    return_timestamps: true,
    chunk_length_s: 30,
    stride_length_s: 5,
  })
  const fallbackEnd = audio.length / 16000
  const chunks: any[] = Array.isArray(result?.chunks) && result.chunks.length ? result.chunks : [{ timestamp: [0, fallbackEnd], text: result?.text ?? '' }]
  return chunks
    .map((chunk) => {
      const start = Number.isFinite(chunk?.timestamp?.[0]) ? Math.max(0, chunk.timestamp[0]) : 0
      const end = Number.isFinite(chunk?.timestamp?.[1]) ? Math.max(start, chunk.timestamp[1]) : fallbackEnd
      return { start, end, text: String(chunk?.text ?? '').trim() }
    })
    .filter((segment) => segment.text.length > 0)
}

scope.onmessage = (event) => {
  const message = event.data
  if (message.type === 'warmup') {
    void loadTranscriber().catch((error: unknown) => {
      post({ type: 'error', id: -1, message: error instanceof Error ? error.message : String(error) })
    })
    return
  }
  if (message.type !== 'transcribe') return
  void transcribe(message.audio, message.language)
    .then((segments) => post({ type: 'result', id: message.id, segments }))
    .catch((error: unknown) => post({ type: 'error', id: message.id, message: error instanceof Error ? error.message : String(error) }))
}
