// Real in-browser clipping with MediaBunny (one of the 22 tools in the stack).
// The file is trimmed with WebCodecs locally: nothing is uploaded, and the
// output is a normal MP4 the user can post or hand to an editor.
//
// The vertical renderer is a real TikTok-style export: a face-aware crop sized
// for the chosen frame, with the clip's captions burned into every frame in one
// of three broadcast-ready styles. No YouTube embed, no sidecar file — the
// downloaded MP4 already contains the subtitles.

import { ALL_FORMATS, BlobSource, BufferTarget, Conversion, Input, Mp4OutputFormat, Output, Quality, type ConversionVideoOptions } from 'mediabunny'

import type { Cue } from '../shared/clips'
import type { FaceReading } from './faceTrack'

export type CaptionStyle = 'bold' | 'highlight' | 'clean'
export type FrameFormat = 'tiktok' | 'square' | 'wide' | 'source'
export type CaptionPosition = 'top' | 'bottom'

export type FrameSpec = { label: string; short: string; width: number; height: number }

export const FRAME_FORMATS: Record<FrameFormat, FrameSpec> = {
  tiktok: { label: 'TikTok / Reels / Shorts · 9:16', short: '9:16', width: 1080, height: 1920 },
  square: { label: 'Feed post · 1:1', short: '1:1', width: 1080, height: 1080 },
  wide: { label: 'YouTube · 16:9', short: '16:9', width: 1920, height: 1080 },
  source: { label: 'Keep the original frame', short: 'Source', width: 0, height: 0 },
}

export const CAPTION_STYLES: Array<{ id: CaptionStyle; label: string; blurb: string }> = [
  { id: 'bold', label: 'Bold block', blurb: 'Dark rounded block, white text, lime accent' },
  { id: 'highlight', label: 'Lime highlight', blurb: 'Lime marker behind dark, punchy text' },
  { id: 'clean', label: 'Clean outline', blurb: 'White text with a soft shadow, no block' },
]

export type RenderOptions = {
  start: number
  end: number
  /** Output frame. `source` trims without re-framing. */
  format?: FrameFormat
  /** Legacy shorthand for `format: 'tiktok'`. */
  vertical?: boolean
  /** Absolute source-time captions for this clip. */
  cues?: Cue[]
  /** Burn the active caption into the frame. */
  captions?: boolean
  captionStyle?: CaptionStyle
  captionPosition?: CaptionPosition
  /** A soft gradient behind clean/highlight captions. Defaults to on. */
  scrim?: boolean
  /** Face centre from `trackFace`; null/undefined centre-crops. */
  face?: FaceReading | null
}
export type RenderResult = {
  blob: Blob
  duration: number
  width: number
  height: number
  /** First rendered frame as a JPEG, for queue thumbnails. */
  poster: Blob | null
}

const CAPTION_WIDTH = 980
const CAPTION_FONT = 68
const ASPECT_SAFE = 0.86

export const canRenderInBrowser = () => typeof VideoEncoder !== 'undefined' && typeof VideoDecoder !== 'undefined'

/** Reads the real duration of a local file before anything is cut. */
export async function readVideoDuration(file: Blob) {
  const input = new Input({ formats: ALL_FORMATS, source: new BlobSource(file) })
  return input.computeDuration()
}

type AnyCanvas = OffscreenCanvas | HTMLCanvasElement
type Context2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

function makeCanvas(width: number, height: number): AnyCanvas {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(width, height)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

function canvasToJpeg(canvas: AnyCanvas, quality = 0.72): Promise<Blob | null> {
  try {
    if ('convertToBlob' in canvas) return canvas.convertToBlob({ type: 'image/jpeg', quality })
    return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality))
  } catch {
    return Promise.resolve(null)
  }
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

function roundRect(context: Context2D, x: number, y: number, width: number, height: number, radius: number) {
  if (typeof context.roundRect === 'function') {
    context.beginPath()
    context.roundRect(x, y, width, height, radius)
    return
  }
  const r = Math.min(radius, width / 2, height / 2)
  context.beginPath()
  context.moveTo(x + r, y)
  context.arcTo(x + width, y, x + width, y + height, r)
  context.arcTo(x + width, y + height, x, y + height, r)
  context.arcTo(x, y + height, x, y, r)
  context.arcTo(x, y, x + width, y, r)
  context.closePath()
}

function wrap(context: Context2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (line && context.measureText(next).width > maxWidth) {
      lines.push(line)
      line = word
    } else {
      line = next
    }
  }
  if (line) lines.push(line)
  return lines
}

const font = (weight: number, size: number) => `${weight} ${size}px "Inter Tight", "Arial Black", Arial, sans-serif`

/**
 * Draws one caption in the chosen style. Everything is measured from the frame
 * size, so 1080x1920, 1080x1080 and 1920x1080 all get the same optical size.
 * `age` is seconds since the caption cue started; it drives a short, tasteful
 * pop-in that never invents word timings.
 */
function drawCaption(
  context: Context2D,
  text: string,
  style: CaptionStyle,
  position: CaptionPosition,
  frameWidth: number,
  frameHeight: number,
  age: number,
) {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean) return

  const scale = frameWidth / 1080
  const maxWidth = Math.min(frameWidth * ASPECT_SAFE, CAPTION_WIDTH * scale)
  let size = Math.round(CAPTION_FONT * scale * (style === 'highlight' ? 0.96 : 1))
  const minSize = Math.round(42 * scale)
  let lines: string[] = []

  for (; size >= minSize; size -= Math.max(2, Math.round(4 * scale))) {
    context.font = font(800, size)
    lines = wrap(context, clean, maxWidth)
    const widest = Math.max(...lines.map((line) => context.measureText(line).width), 0)
    if (lines.length <= 3 && widest <= maxWidth) break
  }
  if (lines.length > 3) {
    lines = lines.slice(0, 3)
    lines[2] = `${lines[2].replace(/\s+\S*$/, '')}…`
  }

  const lineHeight = Math.round(size * (style === 'clean' ? 1.22 : 1.18))
  const blockHeight = lines.length * lineHeight
  const anchorY = position === 'top' ? Math.round(frameHeight * 0.17) : Math.round(frameHeight * 0.82)
  const centerY = position === 'top' ? anchorY + blockHeight / 2 : anchorY - blockHeight / 2
  const pop = age < 0.22 ? 0.94 + 0.06 * Math.min(1, age / 0.22) : 1
  const alpha = age < 0.12 ? Math.max(0.3, age / 0.12) : 1

  context.save()
  context.globalAlpha = alpha
  context.translate(frameWidth / 2, centerY)
  context.scale(pop, pop)
  context.translate(-frameWidth / 2, -centerY)
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.lineJoin = 'round'
  context.font = font(800, size)

  if (style === 'bold') {
    const textWidth = Math.max(...lines.map((line) => context.measureText(line).width), 0)
    const boxWidth = Math.min(frameWidth - 48 * scale, textWidth + 64 * scale)
    const boxHeight = blockHeight + 36 * scale
    const boxX = (frameWidth - boxWidth) / 2
    const boxY = centerY - boxHeight / 2

    context.fillStyle = 'rgba(8, 9, 12, 0.72)'
    roundRect(context, boxX, boxY, boxWidth, boxHeight, 26 * scale)
    context.fill()
    context.strokeStyle = 'rgba(255, 255, 255, 0.14)'
    context.lineWidth = 2 * scale
    context.stroke()

    context.strokeStyle = 'rgba(0, 0, 0, 0.85)'
    context.lineWidth = Math.max(4, size * 0.11)
    context.fillStyle = '#ffffff'
    const firstCenter = boxY + 18 * scale + lineHeight / 2
    lines.forEach((line, index) => {
      const y = firstCenter + index * lineHeight
      context.strokeText(line, frameWidth / 2, y)
      context.fillText(line, frameWidth / 2, y)
    })

    // A thin lime accent keeps the block recognisably Clipfarm.
    const accent = Math.min(140 * scale, boxWidth * 0.18)
    context.fillStyle = '#d7ff3e'
    roundRect(context, (frameWidth - accent) / 2, boxY + boxHeight + 10 * scale, accent, 6 * scale, 3 * scale)
    context.fill()
  } else if (style === 'highlight') {
    const firstCenter = centerY - blockHeight / 2 + lineHeight / 2
    lines.forEach((line, index) => {
      const width = context.measureText(line).width
      const padX = 20 * scale
      const y = firstCenter + index * lineHeight
      context.fillStyle = 'rgba(215, 255, 62, 0.94)'
      roundRect(context, frameWidth / 2 - width / 2 - padX, y - lineHeight / 2 + 2 * scale, width + padX * 2, lineHeight - 4 * scale, 10 * scale)
      context.fill()
      context.fillStyle = '#101208'
      context.fillText(line, frameWidth / 2, y)
    })
  } else {
    const firstCenter = centerY - blockHeight / 2 + lineHeight / 2
    context.shadowColor = 'rgba(0, 0, 0, 0.75)'
    context.shadowBlur = 14 * scale
    context.shadowOffsetY = 3 * scale
    context.strokeStyle = 'rgba(0, 0, 0, 0.55)'
    context.lineWidth = Math.max(3, size * 0.07)
    context.fillStyle = '#ffffff'
    lines.forEach((line, index) => {
      const y = firstCenter + index * lineHeight
      context.strokeText(line, frameWidth / 2, y)
      context.fillText(line, frameWidth / 2, y)
    })
  }

  context.restore()
}

/** Soft gradient under clean/highlight text so bright footage cannot wash it out. */
function drawScrim(context: Context2D, frameWidth: number, frameHeight: number) {
  const gradient = context.createLinearGradient(0, frameHeight * 0.52, 0, frameHeight)
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0.6)')
  context.fillStyle = gradient
  context.fillRect(0, frameHeight * 0.52, frameWidth, frameHeight * 0.48)
}

function activeCue(cues: Cue[], time: number) {
  let found: Cue | null = null
  for (const cue of cues) {
    if (time >= cue.start - 0.15 && time <= cue.end + 0.35) {
      if (!found || cue.text.length > found.text.length) found = cue
    }
  }
  return found
}

/**
 * Whisper can return one 11-second cue. TikTok captions read better in short
 * phrases, so long cues are split into ~7-word chunks and progressed by time;
 * short cues stay intact. No word timestamps are invented.
 */
export function chunkCaption(cue: Cue, time: number) {
  const words = cue.text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean)
  if (words.length <= 8) return cue.text
  const maxWords = cue.end - cue.start > 6 ? 7 : 12
  const chunks: string[] = []
  for (let index = 0; index < words.length; index += maxWords) chunks.push(words.slice(index, index + maxWords).join(' '))
  const span = Math.max(0.1, cue.end - cue.start)
  const ratio = Math.max(0, Math.min(1, (time - cue.start) / span))
  return chunks[Math.min(chunks.length - 1, Math.floor(ratio * chunks.length))]
}

/** The caption visible at `time`, already chunked — shared by the live preview. */
export function captionAt(cues: Cue[], time: number) {
  const cue = activeCue(cues, time)
  if (!cue) return null
  const text = chunkCaption(cue, time)
  return text ? { text, start: cue.start } : null
}

/**
 * Trims `file` between `start` and `end`. A framed format re-encodes to the
 * target size with a face-aware crop and burns in the clip's captions; `source`
 * keeps the original frame.
 */
export async function renderClip(file: Blob, options: RenderOptions, onProgress?: (ratio: number) => void): Promise<RenderResult> {
  if (!canRenderInBrowser()) {
    throw new Error('This browser does not expose WebCodecs, so it cannot cut video locally. Try Chrome, Edge or a recent Safari.')
  }
  const start = Math.max(0, Math.min(options.start, options.end - 0.1))
  const end = Math.max(start + 0.1, options.end)
  const format: FrameFormat = options.format ?? (options.vertical ? 'tiktok' : 'source')
  const spec = FRAME_FORMATS[format] ?? FRAME_FORMATS.source
  const cues = options.cues ?? []
  const burnCaptions = Boolean(spec.width && options.captions && cues.length)
  const style = options.captionStyle ?? 'bold'
  const position = options.captionPosition ?? 'bottom'
  const face = options.face ?? null

  const input = new Input({ formats: ALL_FORMATS, source: new BlobSource(file) })
  const target = new BufferTarget()
  const output = new Output({ format: new Mp4OutputFormat(), target })

  let video: ConversionVideoOptions | undefined
  let posterPromise: Promise<Blob | null> | null = null

  if (spec.width && spec.height) {
    const width = spec.width
    const height = spec.height
    const aspect = width / height
    const canvas = makeCanvas(width, height)
    const context = canvas.getContext('2d', { alpha: false }) as Context2D | null
    if (!context) throw new Error('This browser cannot create the render canvas.')

    if (burnCaptions && typeof document !== 'undefined' && 'fonts' in document) {
      try {
        await document.fonts.load('800 64px "Inter Tight"')
        await document.fonts.ready
      } catch {
        // The Arial fallback is still readable.
      }
    }

    let first = true
    let absolute = false
    let captured = false
    const posterCanvas = makeCanvas(360, Math.max(1, Math.round((360 * height) / width)))
    const posterContext = posterCanvas.getContext('2d', { alpha: false }) as Context2D | null

    video = {
      process: (sample) => {
        if (first) {
          first = false
          absolute = sample.timestamp > 0.5 && Math.abs(sample.timestamp - start) < 2.5
        }
        const time = absolute ? sample.timestamp : sample.timestamp + start
        const displayW = Math.max(1, sample.displayWidth)
        const displayH = Math.max(1, sample.displayHeight)
        let cropW: number
        let cropH: number
        if (displayW / displayH > aspect) {
          cropH = displayH
          cropW = displayH * aspect
        } else {
          cropW = displayW
          cropH = displayW / aspect
        }
        // MediaBunny's crop rectangle must use integer pixels.
        const cropWidth = Math.max(1, Math.round(cropW))
        const cropHeight = Math.max(1, Math.round(cropH))
        const left = Math.round(clamp((face?.x ?? 0.5) * displayW - cropWidth / 2, 0, displayW - cropWidth))
        const top = Math.round(clamp((face?.y ?? 0.5) * displayH - cropHeight / 2, 0, displayH - cropHeight))
        sample.drawWithFit(context, { fit: 'fill', crop: { left, top, width: cropWidth, height: cropHeight } })

        if (burnCaptions) {
          if (options.scrim !== false && style !== 'bold') drawScrim(context, width, height)
          const cue = activeCue(cues, time)
          if (cue) {
            drawCaption(context, chunkCaption(cue, time), style, position, width, height, Math.max(0, time - cue.start))
          }
        }

        // Grab one frame for the queue thumbnail before the canvas is reused.
        if (!captured && posterContext) {
          captured = true
          posterContext.drawImage(canvas, 0, 0, posterCanvas.width, posterCanvas.height)
          posterPromise = canvasToJpeg(posterCanvas)
        }
        return canvas
      },
      processedWidth: width,
      processedHeight: height,
      quality: new Quality('high'),
      forceTranscode: true,
    }
  }

  const conversion = await Conversion.init({
    input,
    output,
    trim: { start, end },
    ...(video ? { video } : {}),
    showWarnings: false,
  })

  if (!conversion.isValid) {
    const reasons = conversion.discardedTracks.map((track) => track.reason).join(', ')
    throw new Error(`This file cannot be cut in the browser${reasons ? ` (${reasons})` : ''}. Try an MP4 with H.264 video.`)
  }

  conversion.onProgress = (ratio) => onProgress?.(Math.max(0, Math.min(1, ratio)))
  await conversion.execute()
  if (!target.buffer) throw new Error('The render finished without producing a file.')

  const poster = posterPromise ? await posterPromise : null

  return {
    blob: new Blob([target.buffer], { type: 'video/mp4' }),
    duration: Math.round((end - start) * 10) / 10,
    width: spec.width,
    height: spec.height,
    poster,
  }
}
