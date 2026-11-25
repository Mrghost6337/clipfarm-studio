// Face-aware framing for vertical clips. MediaPipe's BlazeFace model is loaded
// lazily from public CDNs (the wasm binary is ~15 MB, cached by the browser),
// then a handful of frames from the clip are sampled to find where the person
// actually is. Nothing leaves the device: frames are drawn to a canvas locally.
//
// If the model cannot load, or no face is found, the caller gets the centre of
// the frame so rendering always continues.

// The desktop app bundles the same files (desktop/scripts/vendor.mjs) and never
// reaches a CDN.
const DESKTOP = import.meta.env.VITE_DESKTOP === '1'
const CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3'
const MODULE_URL = DESKTOP ? '/vendor/mediapipe/vision_bundle.mjs' : `${CDN}/+esm`
const WASM_URL = DESKTOP ? '/vendor/mediapipe/wasm' : `${CDN}/wasm`
const MODEL = DESKTOP
  ? '/vendor/mediapipe/blaze_face_short_range.tflite'
  : 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite'

type Box = { originX: number; originY: number; width: number; height: number }
type Detection = { boundingBox?: Box; categories?: Array<{ score?: number }> }
type Detector = { detect(source: CanvasImageSource): { detections: Detection[] } }
type VisionModule = {
  FilesetResolver: { forVisionTasks(path: string): Promise<unknown> }
  FaceDetector: { createFromOptions(fileset: unknown, options: unknown): Promise<Detector> }
}

export type FaceReading = {
  /** Horizontal centre of the face, 0 = left edge, 1 = right edge. */
  x: number
  /** Vertical centre of the face, 0 = top edge, 1 = bottom edge. */
  y: number
  /** Frames where a face was found. 0 means the caller should centre-crop. */
  samples: number
  /** Average detector confidence across the frames that had a face. */
  confidence: number
  /** How many frames were sampled in total. */
  checked: number
  source: 'mediapipe' | 'centre'
}

let detectorPromise: Promise<Detector> | null = null

function loadDetector() {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      const vision = (await import(/* @vite-ignore */ MODULE_URL)) as VisionModule
      const fileset = await vision.FilesetResolver.forVisionTasks(WASM_URL)
      return vision.FaceDetector.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL },
        runningMode: 'IMAGE',
        minDetectionConfidence: 0.35,
      })
    })().catch((cause) => {
      detectorPromise = null
      throw cause
    })
  }
  return detectorPromise
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), ms)
    promise.then(
      (value) => {
        window.clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        window.clearTimeout(timer)
        reject(error)
      },
    )
  })
}

const centre = (checked = 0): FaceReading => ({ x: 0.5, y: 0.5, samples: 0, confidence: 0, checked, source: 'centre' })

/** Loads a local video and finds one representative face position for the cut. */
export async function trackFace(file: Blob, start: number, end: number, signal?: AbortSignal): Promise<FaceReading> {
  if (signal?.aborted) throw new DOMException('Face tracking stopped.', 'AbortError')

  const url = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'
  video.src = url

  try {
    await withTimeout(
      new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve()
        video.onerror = () => reject(new Error('Could not read this video for face tracking.'))
      }),
      10000,
      'Reading the video timed out.',
    )

    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : end
    const from = Math.max(0, Math.min(start, duration - 0.2))
    const to = Math.max(from + 0.2, Math.min(end, duration))
    const points = [0.1, 0.24, 0.38, 0.52, 0.66, 0.8, 0.92].map((ratio) => from + (to - from) * ratio)

    const detector = await withTimeout(loadDetector(), 45000, 'The face model could not load. Using a centre crop.')
    const canvas = document.createElement('canvas')
    const width = 320
    const height = Math.max(180, Math.round((width * video.videoHeight) / Math.max(1, video.videoWidth)))
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d', { alpha: false })
    if (!context) return centre(points.length)

    // Every sample that contains a face, with its detector weight. A cutaway
    // shot of a second person can otherwise drag the crop to the wrong side of
    // the frame, so the median + MAD filter below drops those outliers.
    const readings: Array<{ x: number; y: number; weight: number; score: number }> = []

    for (const point of points) {
      if (signal?.aborted) throw new DOMException('Face tracking stopped.', 'AbortError')
      await new Promise<void>((resolve) => {
        const done = () => {
          window.clearTimeout(timer)
          video.removeEventListener('seeked', done)
          resolve()
        }
        const timer = window.setTimeout(done, 2500)
        video.addEventListener('seeked', done)
        const target = Math.min(duration - 0.05, Math.max(0, point))
        // A seek to the current timestamp may not fire `seeked`; nudge it.
        video.currentTime = Math.abs(video.currentTime - target) < 0.001 ? target + 0.002 : target
      })
      if (signal?.aborted) throw new DOMException('Face tracking stopped.', 'AbortError')

      context.drawImage(video, 0, 0, width, height)
      const result = detector.detect(canvas)
      let best: Detection | null = null
      let bestArea = 0
      for (const detection of result.detections) {
        const box = detection.boundingBox
        if (!box) continue
        const area = box.width * box.height
        if (area > bestArea) {
          best = detection
          bestArea = area
        }
      }
      if (!best?.boundingBox) continue
      const box = best.boundingBox
      const score = Math.max(0.35, Math.min(1, best.categories?.[0]?.score ?? 0.5))
      const centreX = (box.originX + box.width / 2) / width
      const centreY = (box.originY + box.height / 2) / height
      readings.push({ x: centreX, y: centreY, weight: bestArea * score, score })
    }

    if (!readings.length) return centre(points.length)

    const sortedX = [...readings.map((reading) => reading.x)].sort((a, b) => a - b)
    const medianX = sortedX[Math.floor(sortedX.length / 2)]
    const deviations = sortedX.map((value) => Math.abs(value - medianX)).sort((a, b) => a - b)
    const mad = deviations[Math.floor(deviations.length / 2)]
    // At least a fifth of the frame of tolerance, so a deliberate pan is kept.
    const tolerance = Math.max(0.2, mad * 3)
    const stable = readings.filter((reading) => Math.abs(reading.x - medianX) <= tolerance)
    const kept = stable.length ? stable : readings

    let weight = 0
    let weightedX = 0
    let weightedY = 0
    let confidence = 0
    for (const reading of kept) {
      weight += reading.weight
      weightedX += reading.x * reading.weight
      weightedY += reading.y * reading.weight
      confidence += reading.score
    }
    if (weight <= 0) return centre(points.length)

    return {
      x: Math.max(0, Math.min(1, weightedX / weight)),
      y: Math.max(0, Math.min(1, weightedY / weight)),
      samples: kept.length,
      confidence: confidence / kept.length,
      checked: points.length,
      source: 'mediapipe',
    }
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause
    return centre()
  } finally {
    video.pause()
    video.removeAttribute('src')
    video.load()
    URL.revokeObjectURL(url)
  }
}
