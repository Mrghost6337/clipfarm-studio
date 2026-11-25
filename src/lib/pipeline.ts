/**
 * Shared client for the local Clipfarm pipeline service.
 *
 * Two ways to reach it:
 *
 * - Proxy mode. `VITE_PIPELINE_API` is a same-origin path such as
 *   `/pipeline-api` (the Vite dev server, and the desktop app's app:// origin).
 *   The proxy adds the service's launch token, so this page never holds a
 *   credential and the CSP only needs `connect-src 'self'`.
 * - Direct mode (the hosted website). The page finds the service on
 *   127.0.0.1 by probing PIPELINE_PORTS, then pairs once: the service shows a
 *   code that the user approves on the computer. The pairing token is kept in
 *   localStorage under `clipfarm.pipeline.pairing`. It only opens the local
 *   pipeline, survives restarts and can be revoked from the computer at any
 *   time. It is not the account session and never leaves this browser.
 *
 * `<video>`, `<img>` and EventSource cannot send headers, so in direct mode
 * media and progress URLs carry a short-lived signed `?ticket=`.
 */

/** Must match pipeline/config.py (PIPELINE_PORT and PIPELINE_PORT_RANGE). */
export const PIPELINE_PORTS = [8787, 8788, 8789, 8790, 8791] as const

const configured = (import.meta.env.VITE_PIPELINE_API as string | undefined)?.replace(/\/$/, '') || ''
const PROXY_BASE = configured.startsWith('/') ? configured : !configured && import.meta.env.DEV ? '/pipeline-api' : null
const FIXED_BASE = configured && !configured.startsWith('/') ? configured : null

const PAIRING_KEY = 'clipfarm.pipeline.pairing'
const PROBE_MS = 1500
const POLL_MS = 2000

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

// ---------------------------------------------------------------------------
// Connection state
// ---------------------------------------------------------------------------

export type PipelineStatus =
  | { state: 'checking' }
  | { state: 'offline' }
  /** The browser refused access to this computer (local network permission). */
  | { state: 'blocked' }
  | { state: 'unpaired'; base: string; error?: string }
  | { state: 'pairing'; base: string; code: string; expiresAt: string }
  | { state: 'ready'; base: string; mode: 'proxy' | 'paired' }

type Pairing = { instanceId: string; token: string; pairingId: string }
type Active = { base: string; token: string | null; ticket: string | null; ticketExpires: number }

let status: PipelineStatus = { state: 'checking' }
let active: Active | null = null
let connecting: Promise<PipelineStatus> | null = null
let pairingRun = 0
const listeners = new Set<() => void>()

function setStatus(next: PipelineStatus) {
  status = next
  listeners.forEach((listener) => listener())
}

export const getPipelineStatus = () => status
export function subscribePipeline(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const pipelineMode = () => (PROXY_BASE ? 'proxy' : 'direct')
export const pipelineBase = () => active?.base ?? PROXY_BASE ?? FIXED_BASE ?? `http://127.0.0.1:${PIPELINE_PORTS[0]}`

function readPairing(): Pairing | null {
  try {
    const raw = localStorage.getItem(PAIRING_KEY)
    const value = raw ? (JSON.parse(raw) as Partial<Pairing>) : null
    return value && typeof value.token === 'string' && typeof value.instanceId === 'string' ? (value as Pairing) : null
  } catch {
    return null
  }
}

function writePairing(value: Pairing | null) {
  try {
    if (value) localStorage.setItem(PAIRING_KEY, JSON.stringify(value))
    else localStorage.removeItem(PAIRING_KEY)
  } catch {
    /* storage blocked: pairing lasts for this visit only */
  }
}

async function probe(base: string): Promise<{ base: string; instanceId: string } | null> {
  try {
    const response = await fetch(`${base}/health`, { cache: 'no-store', signal: AbortSignal.timeout(PROBE_MS) })
    const data = (await response.json()) as { service?: string; instanceId?: string }
    return response.ok && data.service === 'clipfarm-pipeline' ? { base, instanceId: data.instanceId ?? '' } : null
  } catch {
    return null
  }
}

/** Chrome's permission for pages to reach this computer, when the browser exposes it. */
async function localNetworkPermission(): Promise<PermissionState | null> {
  for (const name of ['local-network-access', 'loopback-network']) {
    try {
      const result = await navigator.permissions.query({ name } as unknown as PermissionDescriptor)
      return result.state
    } catch {
      /* unknown permission name in this browser */
    }
  }
  return null
}

async function refreshTicket(): Promise<boolean> {
  if (!active?.token) return true
  try {
    const response = await fetch(`${active.base}/auth/ticket`, { method: 'POST', headers: { authorization: `Bearer ${active.token}` } })
    if (response.status === 401) return false
    if (!response.ok) return true
    const data = (await response.json()) as { ticket: string; expiresAt: number }
    active.ticket = data.ticket
    active.ticketExpires = data.expiresAt * 1000
    return true
  } catch {
    return true
  }
}

async function runConnect(): Promise<PipelineStatus> {
  if (PROXY_BASE) {
    const found = await probe(PROXY_BASE)
    active = found ? { base: PROXY_BASE, token: null, ticket: null, ticketExpires: 0 } : null
    setStatus(found ? { state: 'ready', base: PROXY_BASE, mode: 'proxy' } : { state: 'offline' })
    return status
  }

  const candidates = FIXED_BASE ? [FIXED_BASE] : PIPELINE_PORTS.map((port) => `http://127.0.0.1:${port}`)
  const found = (await Promise.all(candidates.map(probe))).filter((item): item is NonNullable<typeof item> => item !== null)
  if (!found.length) {
    active = null
    setStatus((await localNetworkPermission()) === 'denied' ? { state: 'blocked' } : { state: 'offline' })
    return status
  }

  const saved = readPairing()
  const match = saved ? found.find((item) => item.instanceId === saved.instanceId) : undefined
  if (saved && match) {
    active = { base: match.base, token: saved.token, ticket: null, ticketExpires: 0 }
    if (await refreshTicket()) {
      setStatus({ state: 'ready', base: match.base, mode: 'paired' })
      return status
    }
    // Revoked on the computer.
    writePairing(null)
    active = null
    setStatus({ state: 'unpaired', base: match.base, error: 'This browser was disconnected from the pipeline. Connect it again.' })
    return status
  }
  active = null
  setStatus({ state: 'unpaired', base: found[0].base })
  return status
}

/** Finds the service and checks the saved pairing. Safe to call repeatedly. */
export function connectPipeline(): Promise<PipelineStatus> {
  if (!connecting) {
    if (status.state !== 'pairing') setStatus({ state: 'checking' })
    connecting = runConnect().finally(() => {
      connecting = null
    })
  }
  return connecting
}

const browserName = () => {
  const ua = navigator.userAgent
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser'
  const os = /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'this computer'
  return `${browser} on ${os}`
}

/** Asks the service for a pairing code and waits for the user to approve it on the computer. */
export async function startPairing(): Promise<void> {
  const base = status.state === 'unpaired' ? status.base : active?.base
  if (!base) return
  const run = ++pairingRun
  let request: { id: string; secret: string; code: string; expiresAt: string; instanceId: string }
  try {
    const response = await fetch(`${base}/pair/request`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: browserName() }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      setStatus({ state: 'unpaired', base, error: (data as { detail?: string }).detail || `The pipeline answered ${response.status}.` })
      return
    }
    request = data as typeof request
  } catch {
    setStatus({ state: 'unpaired', base, error: 'The pipeline stopped answering. Check that it is still running.' })
    return
  }
  setStatus({ state: 'pairing', base, code: request.code, expiresAt: request.expiresAt })

  while (run === pairingRun) {
    await new Promise((resolve) => setTimeout(resolve, POLL_MS))
    if (run !== pairingRun) return
    try {
      const response = await fetch(`${base}/pair/request/${request.id}`, { headers: { 'x-pair-secret': request.secret }, cache: 'no-store' })
      const data = (await response.json().catch(() => ({}))) as { status?: string; token?: string; pairingId?: string; instanceId?: string }
      if (data.status === 'approved' && data.token) {
        writePairing({ instanceId: data.instanceId ?? request.instanceId, token: data.token, pairingId: data.pairingId ?? '' })
        await connectPipeline()
        return
      }
      if (data.status === 'denied') return setStatus({ state: 'unpaired', base, error: 'The request was denied on this computer.' })
      if (data.status === 'expired' || !response.ok) return setStatus({ state: 'unpaired', base, error: 'The code expired. Start again to get a new one.' })
    } catch {
      return setStatus({ state: 'unpaired', base, error: 'The pipeline stopped answering. Check that it is still running.' })
    }
  }
}

export function cancelPairing() {
  pairingRun++
  if (status.state === 'pairing') setStatus({ state: 'unpaired', base: status.base })
}

/** Disconnects this browser: revokes the pairing on the computer and forgets it here. */
export async function forgetPairing() {
  const current = active
  if (current?.token) {
    await fetch(`${current.base}/pairing`, { method: 'DELETE', headers: { authorization: `Bearer ${current.token}` } }).catch(() => undefined)
  }
  writePairing(null)
  active = null
  await connectPipeline()
}

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------

export class PipelineUnavailable extends Error {
  constructor(public readonly status: PipelineStatus) {
    super(status.state === 'offline' ? 'The pipeline is not running.' : 'Connect this browser to the pipeline first.')
  }
}

async function ready(): Promise<Active> {
  if (!active) await connectPipeline()
  if (!active) throw new PipelineUnavailable(status)
  if (active.token && active.ticketExpires - Date.now() < 30 * 60 * 1000) void refreshTicket()
  return active
}

export async function pipelineApi<T>(path: string, init?: RequestInit): Promise<T> {
  const conn = await ready()
  const headers = new Headers(init?.headers)
  if (!(init?.body instanceof FormData) && !headers.has('content-type')) headers.set('content-type', 'application/json')
  if (conn.token) headers.set('authorization', `Bearer ${conn.token}`)
  let response: Response
  try {
    response = await fetch(`${conn.base}${path}`, { ...init, headers })
  } catch {
    active = null
    void connectPipeline()
    throw new Error('The pipeline stopped answering. Check that it is still running.')
  }
  const data = await response.json().catch(() => ({}))
  if (response.status === 401 && conn.token) {
    writePairing(null)
    active = null
    setStatus({ state: 'unpaired', base: conn.base, error: 'This browser was disconnected from the pipeline. Connect it again.' })
  }
  if (!response.ok) throw new Error((data as { detail?: string }).detail || `The pipeline answered ${response.status}.`)
  return data as T
}

const withTicket = (url: string) => {
  const ticket = active?.ticket
  return ticket ? `${url}${url.includes('?') ? '&' : '?'}ticket=${encodeURIComponent(ticket)}` : url
}

/** URL for a file the pipeline serves (`/files/...`), usable in <video>, <img> and links. */
export const fileUrl = (path: string) => withTicket(`${pipelineBase()}${path}`)

/** URL for a job's server-sent progress events. */
export const eventsUrl = (jobId: string) => withTicket(`${pipelineBase()}/jobs/${encodeURIComponent(jobId)}/events`)

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export const stamp = (seconds: number | null | undefined, withMs = false) => {
  if (seconds === null || seconds === undefined || Number.isNaN(seconds)) return '—'
  const safe = Math.max(0, seconds)
  const minutes = Math.floor(safe / 60)
  const rest = safe % 60
  return `${minutes}:${withMs ? rest.toFixed(1).padStart(4, '0') : String(Math.round(rest)).padStart(2, '0')}`
}

export const statusLabel = (job: PipelineJob) => {
  if (job.status === 'done') return 'Ready'
  if (job.status === 'failed') return 'Failed'
  if (job.status === 'cancelled') return 'Cancelled'
  return job.stage.charAt(0).toUpperCase() + job.stage.slice(1)
}
