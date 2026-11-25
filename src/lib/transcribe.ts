// Local, free transcription: audio is decoded from the user's file with
// MediaBunny, resampled to 16 kHz mono, sent in 30-second pieces to the Whisper
// worker, and returned as timestamped segments. No upload, no API key.

import { ALL_FORMATS, AudioBufferSink, BlobSource, Input } from 'mediabunny'

export type TranscriptSegment = { start: number; end: number; text: string }
export type TranscribePhase = 'model' | 'decode' | 'transcribe'
export type TranscribeUpdate = { phase: TranscribePhase; ratio: number; detail: string }

export const WHISPER_MODEL = 'onnx-community/whisper-tiny'
export const WHISPER_SIZE = '~75 MB'
export const TRANSCRIBE_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'pt', label: 'Português' },
  { code: 'it', label: 'Italiano' },
  { code: 'pl', label: 'Polski' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'ru', label: 'Русский' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'zh', label: '中文' },
  { code: 'ar', label: 'العربية' },
  { code: 'id', label: 'Bahasa Indonesia' },
] as const

const RATE = 16000
const WINDOW_SECONDS = 60
const SLICE_SECONDS = 30
const MIN_SECONDS = 0.8

type WorkerMessage =
  | { type: 'model-progress'; ratio: number; file: string }
  | { type: 'ready' }
  | { type: 'result'; id: number; segments: TranscriptSegment[] }
  | { type: 'error'; id: number; message: string }

class WhisperWorker {
  private worker: Worker
  private sequence = 0
  private pending = new Map<number, { resolve: (segments: TranscriptSegment[]) => void; reject: (error: Error) => void }>()
  private progress?: (ratio: number, file: string) => void
  private ready = false
  private failed: Error | null = null

  constructor() {
    this.worker = new Worker(new URL('../workers/whisper.worker.ts', import.meta.url), { type: 'module' })
    this.worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const message = event.data
      if (message.type === 'model-progress') {
        this.progress?.(message.ratio, message.file)
        return
      }
      if (message.type === 'ready') {
        this.ready = true
        return
      }
      if (message.type === 'error') {
        if (message.id === -1) {
          this.failed = new Error(message.message)
          return
        }
        const pending = this.pending.get(message.id)
        this.pending.delete(message.id)
        pending?.reject(new Error(message.message))
        return
      }
      const pending = this.pending.get(message.id)
      this.pending.delete(message.id)
      pending?.resolve(message.segments)
    }
    this.worker.onerror = (event) => {
      const error = new Error(event.message || 'The transcription worker crashed.')
      this.failed = error
      for (const pending of this.pending.values()) pending.reject(error)
      this.pending.clear()
    }
  }

  onModelProgress(callback: (ratio: number, file: string) => void) {
    this.progress = callback
  }

  warmup() {
    this.worker.postMessage({ type: 'warmup' })
  }

  get isReady() {
    return this.ready
  }

  transcribe(audio: Float32Array, language: string): Promise<TranscriptSegment[]> {
    if (this.failed) return Promise.reject(this.failed)
    const id = ++this.sequence
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.worker.postMessage({ type: 'transcribe', id, audio, language }, [audio.buffer])
    })
  }

  terminate() {
    for (const pending of this.pending.values()) pending.reject(new Error('Transcription stopped.'))
    this.pending.clear()
    this.worker.terminate()
  }
}

function resampleToMono(buffer: AudioBuffer): Float32Array {
  const channels = buffer.numberOfChannels
  const ratio = buffer.sampleRate / RATE
  const length = Math.max(1, Math.floor(buffer.length / ratio))
  const output = new Float32Array(length)
  const data = Array.from({ length: channels }, (_, channel) => buffer.getChannelData(channel))
  for (let index = 0; index < length; index++) {
    const position = index * ratio
    const left = Math.floor(position)
    const right = Math.min(left + 1, buffer.length - 1)
    const mix = position - left
    let value = 0
    for (let channel = 0; channel < channels; channel++) {
      value += data[channel][left] * (1 - mix) + data[channel][right] * mix
    }
    output[index] = value / channels
  }
  return output
}

const abortError = () => new DOMException('Transcription stopped.', 'AbortError')

/**
 * Transcribes an audio or video file entirely on this device.
 * Returns timestamped segments relative to the start of the file.
 */
export async function transcribeMedia(
  file: Blob,
  options: { language?: string; signal?: AbortSignal; onUpdate?: (update: TranscribeUpdate) => void } = {},
): Promise<{ segments: TranscriptSegment[]; duration: number }> {
  const language = options.language ?? 'en'
  const signal = options.signal
  if (signal?.aborted) throw abortError()

  const input = new Input({ formats: ALL_FORMATS, source: new BlobSource(file) })
  const track = await input.getPrimaryAudioTrack()
  if (!track) throw new Error('This file has no audio track. Use the video or its extracted audio.')
  if (!(await track.canDecode())) throw new Error('The browser cannot decode this audio codec. Try MP4/AAC, WebM/Opus or a WAV file.')

  const duration = await input.computeDuration([track])
  if (!Number.isFinite(duration) || duration <= 0) throw new Error('Could not read the duration of this file.')
  const total = Math.min(duration, 6 * 60 * 60)

  const client = new WhisperWorker()
  let modelRatio = 0
  client.onModelProgress((ratio, name) => {
    modelRatio = Math.max(modelRatio, ratio)
    options.onUpdate?.({ phase: 'model', ratio: modelRatio, detail: name || 'Whisper tiny' })
  })
  client.warmup()

  const window = new Float32Array(RATE * WINDOW_SECONDS)
  let windowStart = 0
  let filled = 0
  let processed = 0
  const segments: TranscriptSegment[] = []

  const flush = async () => {
    const limit = Math.min(window.length, filled)
    if (limit < RATE * MIN_SECONDS) return
    for (let offset = 0; offset < limit; offset += RATE * SLICE_SECONDS) {
      if (signal?.aborted) throw abortError()
      const length = Math.min(RATE * SLICE_SECONDS, limit - offset)
      if (length < RATE * MIN_SECONDS) continue
      const audio = window.slice(offset, offset + length)
      const base = windowStart + offset / RATE
      const found = await client.transcribe(audio, language)
      for (const segment of found) {
        const text = segment.text.replace(/\s+/g, ' ').trim()
        if (!text) continue
        segments.push({ start: base + segment.start, end: base + Math.min(segment.end, length / RATE), text })
      }
      options.onUpdate?.({
        phase: client.isReady ? 'transcribe' : 'model',
        ratio: Math.min(1, (base + length / RATE) / total),
        detail: formatClock(base + length / RATE),
      })
    }
  }

  try {
    const sink = new AudioBufferSink(track)
    for await (const entry of sink.buffers(0, total)) {
      if (signal?.aborted) throw abortError()
      const resampled = resampleToMono(entry.buffer)
      let read = 0
      let position = Math.max(0, entry.timestamp)
      while (read < resampled.length) {
        if (position >= windowStart + WINDOW_SECONDS - 1 / RATE) {
          await flush()
          window.fill(0)
          windowStart += WINDOW_SECONDS
          filled = 0
        }
        const offset = Math.max(0, Math.round((position - windowStart) * RATE))
        if (offset >= window.length) {
          await flush()
          window.fill(0)
          windowStart += WINDOW_SECONDS
          filled = 0
          continue
        }
        const take = Math.min(resampled.length - read, window.length - offset)
        window.set(resampled.subarray(read, read + take), offset)
        filled = Math.max(filled, offset + take)
        read += take
        position += take / RATE
      }
      processed = Math.min(total, Math.max(processed, entry.timestamp + entry.duration))
      options.onUpdate?.({ phase: client.isReady ? 'transcribe' : 'decode', ratio: processed / total, detail: `${formatClock(processed)} / ${formatClock(total)}` })
    }
    await flush()
  } finally {
    client.terminate()
  }

  if (signal?.aborted) throw abortError()
  return { segments, duration: total }
}

const pad = (value: number, size = 2) => String(Math.floor(value)).padStart(size, '0')

/** `3723.4` -> `1:02:03`. */
export function formatClock(seconds: number) {
  const total = Math.max(0, Math.round(seconds))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60
  return hours ? `${hours}:${pad(minutes)}:${pad(secs)}` : `${minutes}:${pad(secs)}`
}

/** `3723.4` -> `01:02:03,400`. */
function srtStamp(seconds: number) {
  const ms = Math.max(0, Math.round(seconds * 1000))
  return `${pad(Math.floor(ms / 3600000))}:${pad(Math.floor(ms / 60000) % 60)}:${pad(Math.floor(ms / 1000) % 60)},${pad(ms % 1000, 3)}`
}

export function toSrt(segments: TranscriptSegment[]) {
  return segments
    .map((segment, index) => `${index + 1}\n${srtStamp(segment.start)} --> ${srtStamp(segment.end)}\n${segment.text}\n`)
    .join('\n')
}

/** `0:12 text` lines, the format the analyzer accepts when a VOD has no captions. */
export function toTimedText(segments: TranscriptSegment[]) {
  return segments.map((segment) => `${formatClock(segment.start)} ${segment.text}`).join('\n')
}
