/** Shared client for the local Clipfarm pipeline service. */

export const PIPELINE_API =
  (import.meta.env.VITE_PIPELINE_API as string | undefined)?.replace(/\/$/, '') || (import.meta.env.DEV ? '/pipeline-api' : 'http://127.0.0.1:8787')

export type PipelineWord = { start: number; end: number; text: string; probability: number }
export type PipelineSegment = { start: number; end: number; text: string }
export type PipelineFileSet = { mp4: string; srt: string; vtt: string; ass: string; poster: string | null }

export type PipelineClip = {
  id: string
  title: string
  start: number
  end: number
  duration: number
  layout: string
  score: number
  reason: string
  hashtags: string[]
  caption: string
  files: PipelineFileSet
  preset?: string
  hook?: boolean
}

export type PipelineVideo = {
  id: string
  title: string
  thumbnail: string | null
  duration: number | null
  url: string
  platform: string
  uploadDate?: string | null
  channel?: string | null
  sourcePath?: string
}

export type PipelineJob = {
  id: string
  url: string
  status: string
  stage: string
  progress: number
  message: string | null
  error: string | null
  title: string | null
  thumbnail: string | null
  duration: number | null
  platform: string | null
  created_at: string
  preset?: string | null
  max_clips?: number | null
  result: {
    video: PipelineVideo
    language: string | null
    languageProbability: number
    transcript: { segments: PipelineSegment[]; words: PipelineWord[] }
    clips: PipelineClip[]
  } | null
}

export type PipelineListing = {
  kind: 'channel' | 'video'
  platform: string
  title?: string
  items: PipelineVideo[]
  hasMore?: boolean
  offset?: number
}

export async function pipelineApi<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${PIPELINE_API}${path}`, {
    ...init,
    headers: init?.body instanceof FormData ? init.headers : { 'content-type': 'application/json', ...(init?.headers || {}) },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error((data as { detail?: string }).detail || `The pipeline answered ${response.status}.`)
  return data as T
}

export const stamp = (seconds: number | null | undefined, withMs = false) => {
  if (seconds === null || seconds === undefined || Number.isNaN(seconds)) return '—'
  const safe = Math.max(0, seconds)
  const minutes = Math.floor(safe / 60)
  const rest = safe % 60
  return `${minutes}:${withMs ? rest.toFixed(1).padStart(4, '0') : String(Math.round(rest)).padStart(2, '0')}`
}

export const fileUrl = (path: string) => `${PIPELINE_API}${path}`

export const statusLabel = (job: PipelineJob) => {
  if (job.status === 'done') return 'Ready'
  if (job.status === 'failed') return 'Failed'
  if (job.status === 'cancelled') return 'Cancelled'
  return job.stage.charAt(0).toUpperCase() + job.stage.slice(1)
}
