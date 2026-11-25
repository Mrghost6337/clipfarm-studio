import type { Clip, ClipMethod, ClipSource } from '../shared/clips'
import type { DashboardData } from '../shared/dashboard'
import { postJson, requestJson } from './api'

export type AnalyzeSuccess = { ok: true; source: ClipSource; clips: Clip[]; detection: ClipMethod | null }
export type AnalyzeFailure = { ok: false; status: number; error: string; source?: ClipSource; needsTranscript?: boolean }
export type AnalyzeResult = AnalyzeSuccess | AnalyzeFailure

/** POSTs a link and keeps the payload of a 422 so the UI can ask for a transcript. */
export async function analyzeUrl(url: string, transcript?: string): Promise<AnalyzeResult> {
  try {
    const res = await fetch('/api/clips', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url, transcript }),
    })
    const data = (await res.json().catch(() => ({}))) as {
      error?: string
      source?: ClipSource
      clips?: Clip[]
      detection?: ClipMethod | null
      needsTranscript?: boolean
    }
    if (!res.ok) {
      const needsTranscript = Boolean(data.needsTranscript)
      return {
        ok: false,
        status: res.status,
        // A saved source that only needs a transcript is not an error; the form
        // shows the transcriber/paste panel instead of a red notice.
        error: needsTranscript ? '' : typeof data.error === 'string' ? data.error : 'That link could not be analyzed.',
        source: data.source,
        needsTranscript,
      }
    }
    return { ok: true, source: data.source as ClipSource, clips: data.clips ?? [], detection: data.detection ?? null }
  } catch {
    return { ok: false, status: 0, error: 'You appear to be offline. Check your connection and try again.' }
  }
}

export const loadDashboard = () => requestJson<DashboardData>('/api/dashboard')
export const loadClips = (query = '') => requestJson<{ clips: Clip[] }>(`/api/clips${query}`)
export const loadSources = () => requestJson<{ sources: ClipSource[] }>('/api/clips/sources')
export const loadClip = (id: string) => requestJson<{ clip: Clip }>(`/api/clips/${id}`)
/** Real generated file: srt, vtt, ass, edl, mlt, editly, ffmpeg or json. */
export const exportHref = (clipId: string, format: string) => `/api/clips/${clipId}/export/${format}`

export const addTranscript = (sourceId: string, transcript: string) => postJson<{ ok: true; created: number }>(`/api/clips/sources/${sourceId}/transcript`, { transcript })
export const retrySource = (sourceId: string) => postJson<{ ok: true; created: number }>(`/api/clips/sources/${sourceId}/retry`, {})
export const setClipStatus = (clipId: string, status: string) => requestJson<{ ok: true }>(`/api/clips/${clipId}`, { method: 'PATCH', body: JSON.stringify({ status }) })
export const deleteClip = (clipId: string) => requestJson<{ ok: true }>(`/api/clips/${clipId}`, { method: 'DELETE' })

export async function deleteSource(sourceId: string) {
  try {
    const res = await fetch(`/api/clips/sources/${sourceId}`, { method: 'DELETE' })
    return res.ok
  } catch {
    return false
  }
}

/** Copies text with the clipboard API, falling back to a hidden textarea. */
export async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    const area = document.createElement('textarea')
    area.value = value
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const copied = document.execCommand('copy')
    document.body.removeChild(area)
    return copied
  }
}
