// The contract between the renderer and the main process. Every channel is
// listed here with the type of its argument and result. The main process
// validates every argument with the validators below before acting on it;
// the renderer never gets Node, the file system or tokens.

export type WorkMode = 'local' | 'cloud' | 'both'

export type FirstRunStep = 'welcome' | 'usage' | 'preparing' | 'signin' | 'profile' | 'pccheck' | 'models' | 'terms' | 'ready' | 'done'

export const FIRST_RUN_STEPS: readonly FirstRunStep[] = ['welcome', 'usage', 'preparing', 'signin', 'profile', 'pccheck', 'models', 'terms', 'ready', 'done']

export type SoundSettings = { enabled: boolean; volume: number }

/** Saved after every first-run step, so closing the app resumes there. */
export type AppState = {
  step: FirstRunStep
  usage: WorkMode | null
  workMode: WorkMode | null
  pcCheck: { allowed: boolean | null; completedAt: string | null; recommendedModel: string | null }
  selectedModel: string | null
  sound: SoundSettings
  termsAccepted: { terms: string; privacy: string; at: string } | null
}

export type PipelineState = 'stopped' | 'starting' | 'ready' | 'restarting' | 'failed'
export type PipelineStatus = { state: PipelineState; port: number | null; restarts: number; error: string | null; logFile: string }

export type PrepareLine = { id: string; label: string; state: 'pending' | 'running' | 'done' | 'failed'; detail?: string; progress?: number }

export type AuthUser = {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  planId: string | null
  onboardedAt: string | null
  workMode?: string | null
  termsVersion?: string | null
}

export type AuthStatus =
  | { state: 'signed-out' }
  | { state: 'waiting'; url: string; startedAt: string }
  | { state: 'exchanging' }
  | { state: 'signed-in'; user: AuthUser; offline: boolean }
  | { state: 'expired' }
  | { state: 'error'; message: string }

export type ModelProgress = {
  id: string
  state: 'idle' | 'downloading' | 'paused' | 'verifying' | 'installed' | 'error'
  received: number
  total: number
  /** Bytes per second over the last few seconds. */
  speed: number
  /** Seconds left, null when unknown. */
  eta: number | null
  error: string | null
}

export type ModelInfo = { id: string; name: string; label: string; bytes: number; license: string; source: string; installed: boolean; progress: ModelProgress | null }

export type ModelTest = { ok: boolean; model: string; device: string; language: string; languageProbability: number; text: string; seconds: number; loadSeconds: number; transcribeSeconds: number; realtimeFactor: number; faces: number }

export type PcItemId = 'windows' | 'cpu' | 'memory' | 'gpu' | 'disk' | 'ffmpeg' | 'benchmark'
export type PcItem = { id: PcItemId; label: string; state: 'pending' | 'running' | 'done' | 'failed'; progress: number; detail: string | null }
export type PcFacts = {
  os: string
  cpu: string
  cores: number
  memoryGb: number
  gpu: string | null
  vramGb: number | null
  freeDiskGb: number
  ffmpeg: boolean
  encodeFps: number | null
  gflops: number | null
}
export type Recommendation = { model: 'whisper-tiny' | 'whisper-base' | 'whisper-small'; reason: string }
export type PcCheckResult = { ok: boolean; items: PcItem[]; facts: PcFacts; recommendation: Recommendation }

export type UpdateStatus = { state: 'idle' | 'checking' | 'downloading' | 'ready' | 'none' | 'error' | 'unavailable'; version: string | null; progress: number | null; error: string | null; checkedAt: string | null }

export type Pairing = { id: string; origin: string; name: string; created_at: string; last_used_at: string | null }

export type AppInfo = { version: string; platform: string; packaged: boolean; siteOrigin: string; dataDir: string }

export type Api = {
  'app:info': { arg: void; result: AppInfo }
  'state:get': { arg: void; result: AppState }
  'state:update': { arg: Partial<AppState>; result: AppState }
  'pipeline:status': { arg: void; result: PipelineStatus }
  'pipeline:restart': { arg: void; result: PipelineStatus }
  'prepare:run': { arg: void; result: { ok: boolean; lines: PrepareLine[] } }
  'shell:open-external': { arg: string; result: boolean }
  'shell:open-path': { arg: 'logs' | 'data' | 'clips'; result: boolean }
  'shell:show-file': { arg: string; result: boolean }
  'auth:status': { arg: void; result: AuthStatus }
  'auth:start': { arg: void; result: AuthStatus }
  'auth:cancel': { arg: void; result: AuthStatus }
  'auth:sign-out': { arg: void; result: AuthStatus }
  /** Records accepted legal versions locally once the account confirms them. */
  'terms:record': { arg: { terms: string; privacy: string }; result: AppState }
  'pccheck:run': { arg: void; result: PcCheckResult }
  /** Without running the check: the lightest safe setup. */
  'pccheck:skip': { arg: void; result: Recommendation }
  'models:list': { arg: void; result: ModelInfo[] }
  'models:download': { arg: string; result: ModelProgress }
  'models:pause': { arg: string; result: boolean }
  'models:remove': { arg: string; result: ModelInfo[] }
  /** Transcribes the bundled sample with the model and finds a face, then makes it the active model. */
  'models:test': { arg: string; result: ModelTest }
  'pairing:list': { arg: void; result: Pairing[] }
  'pairing:revoke': { arg: string; result: Pairing[] }
  'update:status': { arg: void; result: UpdateStatus }
  'update:check': { arg: void; result: UpdateStatus }
  'update:install': { arg: void; result: boolean }
  /** Shows a native confirmation, then deletes clips, downloads, models and the job database on this PC. */
  'data:delete-local': { arg: void; result: boolean }
  'jobs:keep-awake': { arg: void; result: boolean }
}

export type Channel = keyof Api

export type Events = {
  'pipeline:status': PipelineStatus
  'prepare:line': PrepareLine
  'auth:status': AuthStatus
  'pccheck:item': PcItem
  'models:progress': ModelProgress
  'update:status': UpdateStatus
  'navigate': string
}

// ---------------------------------------------------------------------------
// Validators: each returns the clean value or throws.
// ---------------------------------------------------------------------------

const WORK_MODES: readonly WorkMode[] = ['local', 'cloud', 'both']

export class IpcValidationError extends Error {}

const fail = (message: string): never => {
  throw new IpcValidationError(message)
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

export function validateStatePatch(value: unknown): Partial<AppState> {
  if (!isObject(value)) return fail('state patch must be an object')
  const out: Partial<AppState> = {}
  for (const [key, raw] of Object.entries(value)) {
    switch (key) {
      case 'step':
        if (!FIRST_RUN_STEPS.includes(raw as FirstRunStep)) fail('unknown step')
        out.step = raw as FirstRunStep
        break
      case 'usage':
      case 'workMode':
        if (raw !== null && !WORK_MODES.includes(raw as WorkMode)) fail(`bad ${key}`)
        out[key] = raw as WorkMode | null
        break
      case 'selectedModel':
        if (raw !== null && (typeof raw !== 'string' || !/^[a-z0-9.-]{1,40}$/.test(raw))) fail('bad model id')
        out.selectedModel = raw as string | null
        break
      case 'sound': {
        if (!isObject(raw) || typeof raw.enabled !== 'boolean' || typeof raw.volume !== 'number' || raw.volume < 0 || raw.volume > 1) fail('bad sound settings')
        const sound = raw as { enabled: boolean; volume: number }
        out.sound = { enabled: sound.enabled, volume: Math.round(sound.volume * 100) / 100 }
        break
      }
      case 'pcCheck': {
        if (!isObject(raw)) fail('bad pcCheck')
        const check = raw as Record<string, unknown>
        const allowed = check.allowed
        if (allowed !== null && typeof allowed !== 'boolean') fail('bad pcCheck.allowed')
        const completedAt = check.completedAt
        if (completedAt !== null && typeof completedAt !== 'string') fail('bad pcCheck.completedAt')
        const recommendedModel = check.recommendedModel
        if (recommendedModel !== null && (typeof recommendedModel !== 'string' || recommendedModel.length > 40)) fail('bad pcCheck.recommendedModel')
        out.pcCheck = { allowed: allowed as boolean | null, completedAt: completedAt as string | null, recommendedModel: recommendedModel as string | null }
        break
      }
      default:
        // termsAccepted is written by the main process only, after the server confirmed it.
        fail(`field ${key} cannot be set from the window`)
    }
  }
  return out
}

export function validateLegalVersions(value: unknown): { terms: string; privacy: string } {
  if (!isObject(value)) return fail('bad legal versions')
  const { terms, privacy } = value as Record<string, unknown>
  const version = /^\d{4}-\d{2}-\d{2}$/
  if (typeof terms !== 'string' || typeof privacy !== 'string' || !version.test(terms) || !version.test(privacy)) fail('bad legal versions')
  return { terms: terms as string, privacy: privacy as string }
}

export function validatePairingId(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-f0-9]{16}$/.test(value)) fail('bad pairing id')
  return value as string
}

export const MODEL_IDS = ['whisper-tiny', 'whisper-base', 'whisper-small'] as const

export function validateModelId(value: unknown): string {
  if (!MODEL_IDS.includes(value as (typeof MODEL_IDS)[number])) fail('unknown model')
  return value as string
}

/** Only http(s) links leave the app, and never to file: or custom schemes. */
export function validateExternalUrl(value: unknown): string {
  if (typeof value !== 'string' || value.length > 2048) return fail('bad url')
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return fail('bad url')
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') fail('only http and https links can be opened')
  if (url.username || url.password) fail('credentials in url')
  return url.toString()
}

export function validateOpenPath(value: unknown): 'logs' | 'data' | 'clips' {
  if (value !== 'logs' && value !== 'data' && value !== 'clips') fail('unknown folder')
  return value as 'logs' | 'data' | 'clips'
}

/** A pipeline file path as the API returns it: /files/<job>/clips/<n>/<name>. */
export function validatePipelineFile(value: unknown): string {
  if (typeof value !== 'string' || !/^\/files\/[A-Za-z0-9]+\/clips\/[A-Za-z0-9_-]+\/[A-Za-z0-9._-]+$/.test(value) || value.includes('..')) fail('bad file path')
  return value as string
}
