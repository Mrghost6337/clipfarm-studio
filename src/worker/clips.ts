import { Hono } from 'hono'

import { allowanceFor, priceFor, PLANS, type PlanId, type PublicUser } from '../shared/account'
import {
  detectFromChapters,
  detectFromTranscript,
  parseChapters,
  parseTranscript,
  type Clip,
  type ClipMethod,
  type ClipSource,
  type ClipStatus,
  type Cue,
  type Detection,
  type Platform,
  type SourceStatus,
} from '../shared/clips'
import type { AdminUser, DashboardData, TrendPoint } from '../shared/dashboard'
import { buildExport, EXPORT_FORMATS, exportFilename } from '../shared/exports'
import { currentUser, ensureSchema, type AuthBindings, type D1Like } from './auth'

// The clip pipeline. A submitted link is resolved against YouTube or Twitch for
// real title, channel, duration, description and (when the platform allows it)
// captions. Detection then ranks the real timed text, or falls back to the
// creator's chapter markers. Rows land in D1 and every dashboard number is read
// back from those rows.

type Env = { Bindings: AuthBindings }
export type ClipBindings = AuthBindings

const app = new Hono<Env>()

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
const MAX_URL = 600
const MAX_CLIPS_PER_RUN = 6

const schemas = new WeakMap<object, Promise<void>>()

async function migrate(db: D1Like) {
  await db.prepare('CREATE TABLE IF NOT EXISTS sources (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, url TEXT NOT NULL, platform TEXT NOT NULL, external_id TEXT, title TEXT NOT NULL, author TEXT, thumbnail TEXT, duration INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL, method TEXT, error TEXT, created_at TEXT NOT NULL, analyzed_at TEXT)').run()
  await db.prepare('CREATE TABLE IF NOT EXISTS clips (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, source_id TEXT NOT NULL, title TEXT NOT NULL, start_sec REAL NOT NULL, end_sec REAL NOT NULL, score INTEGER NOT NULL, excerpt TEXT NOT NULL, cues TEXT, status TEXT NOT NULL DEFAULT \'ready\', created_at TEXT NOT NULL)').run()
  await db.prepare('CREATE TABLE IF NOT EXISTS clip_events (id INTEGER PRIMARY KEY AUTOINCREMENT, clip_id TEXT NOT NULL, user_id TEXT, kind TEXT NOT NULL, created_at TEXT NOT NULL)').run()
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_clips_user ON clips (user_id, created_at)').run()
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_sources_user ON sources (user_id, created_at)').run()
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_events_clip ON clip_events (clip_id, kind)').run()
}

export function ensureClipsSchema(db: D1Like) {
  let ready = schemas.get(db)
  if (!ready) {
    ready = migrate(db).catch((error) => {
      schemas.delete(db)
      throw error
    })
    schemas.set(db, ready)
  }
  return ready
}

// ---------------------------------------------------------------------------
// Link parsing and source lookup
// ---------------------------------------------------------------------------

type SourceRef = { platform: Platform; url: string; id: string; kind: 'video' | 'clip' }

const YT_ID = /[A-Za-z0-9_-]{6,}/

/** Cleans what people actually paste: share sheets, quotes and trailing punctuation. */
function cleanLink(input: string) {
  let value = input.trim().replace(/^[<("'[]+/, '').replace(/[>)"'\].,;]+$/, '')
  // Some share sheets paste an encoded address.
  if (/^https?%3a/i.test(value)) {
    try {
      value = decodeURIComponent(value)
    } catch {
      /* keep the original */
    }
  }
  return value
}

export function parseSourceUrl(input: string): SourceRef | { error: string } {
  const raw = cleanLink(input)
  if (!raw) return { error: 'Paste a YouTube or Twitch link first.' }
  if (raw.length > MAX_URL) return { error: 'That link is too long.' }
  let url: URL
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)
  } catch {
    return { error: 'That does not look like a link. Try https://www.youtube.com/watch?v=…' }
  }
  const host = url.hostname.toLowerCase().replace(/^(www|m|music|gaming)\./, '')
  const path = url.pathname

  if (host === 'youtu.be') {
    const id = path.split('/').filter(Boolean)[0]
    if (id && YT_ID.test(id)) return { platform: 'YouTube', id, kind: 'video', url: `https://www.youtube.com/watch?v=${id}` }
    return { error: 'That youtu.be link has no video id. Copy the address of the video itself.' }
  }
  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const fromQuery = url.searchParams.get('v')
    // /shorts/…, /live/…, /embed/…, /v/… and /@channel/shorts/… all work.
    const fromPath = new RegExp(`/(?:shorts|live|embed|v)/(${YT_ID.source})`).exec(path)?.[1]
    const id = fromQuery && YT_ID.test(fromQuery) ? fromQuery : fromPath
    if (id) return { platform: 'YouTube', id, kind: 'video', url: `https://www.youtube.com/watch?v=${id}` }
    if (/^\/playlist/.test(path) || url.searchParams.has('list')) {
      return { error: 'That is a playlist. Open one video in it and paste that video link.' }
    }
    if (/^\/(?:@|c\/|channel\/|user\/)/.test(path)) {
      return { error: 'That is a channel, not a video. Open a video and paste its link.' }
    }
    return { error: 'That YouTube link has no video id. Copy the address of the video itself.' }
  }
  if (host === 'twitch.tv' || host === 'clips.twitch.tv') {
    const clip = host === 'clips.twitch.tv' ? path.split('/').filter(Boolean)[0] : /^\/(?:[\w-]+)\/clip\/([\w-]+)/.exec(path)?.[1]
    if (clip) return { platform: 'Twitch', id: clip, kind: 'clip', url: `https://clips.twitch.tv/${clip}` }
    const vod = /^\/videos\/(\d+)/.exec(path)?.[1]
    if (vod) return { platform: 'Twitch', id: vod, kind: 'video', url: `https://www.twitch.tv/videos/${vod}` }
    return { error: 'Paste a Twitch VOD (/videos/…) or a Twitch clip link.' }
  }
  return { error: `Clipfarm reads YouTube and Twitch links. “${host}” is not one of them.` }
}

type SourceMeta = { title: string; author: string | null; thumbnail: string | null; duration: number; description: string; cues: Cue[] }

async function getText(url: string, headers: Record<string, string> = {}) {
  const res = await fetch(url, { headers: { 'user-agent': UA, 'accept-language': 'en-US,en;q=0.9', ...headers }, signal: AbortSignal.timeout(15_000) })
  return res.ok ? await res.text() : ''
}

function jsonField(html: string, key: string) {
  const match = new RegExp(`"${key}":"((?:[^"\\\\]|\\\\.)*)"`).exec(html)
  if (!match) return ''
  try {
    return JSON.parse(`"${match[1]}"`) as string
  } catch {
    return ''
  }
}

function metaTag(html: string, property: string) {
  const match = new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i').exec(html)
  return match ? match[1].replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim() : ''
}

// Public Piped APIs expose the captions URL YouTube signs for playback, which
// keeps working when youtube.com blocks a datacenter IP. Try a couple in order.
const PIPED_INSTANCES = ['https://api.piped.private.coffee', 'https://pipedapi.ducks.party']
const PIPED_TIMEOUT = 9_000

const decodeText = (value: string) => value.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')

/** Timed TTML captions, the format Piped serves when JSON3 is unavailable. */
export function parseTtml(xml: string): Cue[] {
  const cues: Cue[] = []
  const pattern = /<p\b[^>]*\bbegin="([^"]+)"[^>]*\bend="([^"]+)"[^>]*>([\s\S]*?)<\/p>/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(xml))) {
    const start = parseTranscriptStamp(match[1])
    const end = parseTranscriptStamp(match[2])
    const text = decodeText(match[3].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
    if (!Number.isFinite(start) || !text) continue
    cues.push({ start, end: Number.isFinite(end) && end > start ? end : start + 3, text })
  }
  return cues
}

function parseTranscriptStamp(value: string) {
  const clean = value.trim().replace(/s$/, '')
  const parts = clean.split(':').map(Number)
  if (!parts.length || parts.some((part) => !Number.isFinite(part))) return Number.NaN
  return parts.reduce((total, part) => total * 60 + part, 0)
}

type PipedMeta = { title?: string; author?: string; thumbnail?: string; duration?: number; description?: string; cues?: Cue[] }

async function fetchPiped(id: string): Promise<PipedMeta | null> {
  for (const base of PIPED_INSTANCES) {
    try {
      const res = await fetch(`${base}/streams/${id}`, {
        headers: { 'user-agent': UA, accept: 'application/json' },
        signal: AbortSignal.timeout(PIPED_TIMEOUT),
      })
      if (!res.ok) continue
      const data = (await res.json()) as {
        title?: string
        uploader?: string
        thumbnailUrl?: string
        duration?: number
        description?: string
        subtitles?: Array<{ url?: string; code?: string; autoGenerated?: boolean }>
      }
      const subtitles = Array.isArray(data.subtitles) ? data.subtitles : []
      const track =
        subtitles.find((item) => item.code?.startsWith('en') && item.autoGenerated === false) ??
        subtitles.find((item) => item.code?.startsWith('en')) ??
        subtitles[0]
      let cues: Cue[] = []
      if (track?.url) {
        const signed = track.url.replace(/fmt=[^&]+/, 'fmt=json3')
        const captionRes = await fetch(signed, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(PIPED_TIMEOUT) }).catch(() => null)
        if (captionRes?.ok) {
          const body = await captionRes.text()
          cues = parseTranscript(body)
          if (cues.length < 4) cues = parseTtml(body)
        }
      }
      return {
        title: data.title,
        author: data.uploader,
        thumbnail: data.thumbnailUrl,
        duration: Number(data.duration) || 0,
        description: data.description ?? '',
        cues,
      }
    } catch {
      continue
    }
  }
  return null
}

export async function fetchYouTube(ref: SourceRef): Promise<SourceMeta> {
  const watchUrl = `https://www.youtube.com/watch?v=${ref.id}&bpctr=9999999999&has_verified=1`
  const [watch, oembed] = await Promise.all([
    fetch(watchUrl, { headers: { 'user-agent': UA, 'accept-language': 'en-US,en;q=0.9' }, signal: AbortSignal.timeout(12_000) }).catch(() => null),
    fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${ref.id}`)}&format=json`, { signal: AbortSignal.timeout(8_000) })
      .then((res) => (res.ok ? (res.json() as Promise<{ title?: string; author_name?: string; thumbnail_url?: string }>) : null))
      .catch(() => null),
  ])
  const html = watch?.ok ? await watch.text().catch(() => '') : ''
  if (!html && !oembed?.title) {
    throw new Error('YouTube is not answering this server for that video. Use the free on-device transcriber in Studio with your download, or paste a transcript.')
  }

  // Prefer the exact videoDetails block; a bare "title" can match an overlay.
  const titleMatch = /"videoDetails":\{"videoId":"[^"]+","title":"((?:[^"\\]|\\.)*)"/.exec(html)
  let title = oembed?.title ?? ''
  if (!title && titleMatch) {
    try {
      title = JSON.parse(`"${titleMatch[1]}"`) as string
    } catch {
      title = ''
    }
  }
  const duration = Number(/"lengthSeconds":"(\d+)"/.exec(html)?.[1] ?? 0)
  const description = jsonField(html, 'shortDescription')

  let cues: Cue[] = []
  const tracksRaw = /"captionTracks":(\[.*?\])/.exec(html)?.[1]
  if (tracksRaw) {
    try {
      const tracks = JSON.parse(tracksRaw) as Array<{ baseUrl?: string; languageCode?: string }>
      const track = tracks.find((item) => item.languageCode?.startsWith('en')) ?? tracks[0]
      if (track?.baseUrl) cues = parseTranscript(await getText(`${track.baseUrl}&fmt=json3`).catch(() => ''))
    } catch {
      cues = []
    }
  }

  const meta: SourceMeta = {
    title: title || `YouTube video ${ref.id}`,
    author: oembed?.author_name || jsonField(html, 'author') || null,
    thumbnail: oembed?.thumbnail_url || `https://i.ytimg.com/vi/${ref.id}/hqdefault.jpg`,
    duration,
    description,
    cues,
  }

  // YouTube often withholds captions from servers; Piped returns signed ones.
  if (meta.cues.length < 4) {
    const piped = await fetchPiped(ref.id)
    if (piped) {
      if (!meta.title || meta.title === `YouTube video ${ref.id}`) meta.title = piped.title || meta.title
      if (!meta.author) meta.author = piped.author || null
      if (!meta.thumbnail) meta.thumbnail = piped.thumbnail || null
      if (!meta.duration) meta.duration = piped.duration ?? 0
      if (!meta.description) meta.description = piped.description ?? ''
      if (meta.cues.length < 4) meta.cues = piped.cues ?? []
    }
  }

  return meta
}

async function fetchTwitch(ref: SourceRef): Promise<SourceMeta> {
  const html = await getText(ref.kind === 'clip' ? `https://clips.twitch.tv/${ref.id}` : ref.url).catch(() => '')
  if (!html) throw new Error('Twitch did not answer for this link. Check that the clip is public and try again.')
  const title = metaTag(html, 'og:title') || `Twitch ${ref.kind} ${ref.id}`
  const duration = ref.kind === 'clip' ? Number(/"duration":(\d+(?:\.\d+)?)/.exec(html)?.[1] ?? 0) : 0
  return {
    title: title.replace(/\s*-\s*Twitch$/, ''),
    author: metaTag(html, 'og:site_name') === 'Twitch' ? (/^\/([\w-]+)\/clip/.exec(new URL(ref.url).pathname)?.[1] ?? null) : null,
    thumbnail: metaTag(html, 'og:image') || null,
    duration: Math.round(duration),
    description: metaTag(html, 'og:description'),
    cues: [],
  }
}

function detect(meta: SourceMeta, cap: number): Detection | null {
  if (meta.cues.length >= 4) {
    const clips = detectFromTranscript(meta.cues, Math.min(cap, MAX_CLIPS_PER_RUN))
    if (clips.length) return { method: 'transcript', clips }
  }
  const chapters = parseChapters(meta.description)
  if (chapters.length >= 3) {
    const clips = detectFromChapters(chapters, meta.duration, Math.min(cap, MAX_CLIPS_PER_RUN))
    if (clips.length) return { method: 'chapters', clips }
  }
  return null
}

// ---------------------------------------------------------------------------
// Row mapping and queries
// ---------------------------------------------------------------------------

type SourceRow = {
  id: string
  url: string
  platform: string
  external_id: string | null
  title: string
  author: string | null
  thumbnail: string | null
  duration: number
  status: string
  method: string | null
  error: string | null
  created_at: string
  analyzed_at: string | null
  clips: number
}

type ClipRow = {
  id: string
  source_id: string
  title: string
  start_sec: number
  end_sec: number
  score: number
  excerpt: string
  cues: string | null
  status: string
  created_at: string
  source_title: string
  source_url: string
  source_thumbnail: string | null
  source_author: string | null
  source_platform: string
  external_id: string | null
  views: number
  downloads: number
}

const mapSource = (row: SourceRow): ClipSource => ({
  id: row.id,
  url: row.url,
  platform: row.platform as Platform,
  externalId: row.external_id,
  title: row.title,
  author: row.author,
  thumbnail: row.thumbnail,
  duration: row.duration,
  status: row.status as SourceStatus,
  method: row.method as ClipMethod | null,
  error: row.error,
  clips: row.clips,
  createdAt: row.created_at,
  analyzedAt: row.analyzed_at,
})

const parseCues = (raw: string | null): Cue[] => {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as Cue[]) : []
  } catch {
    return []
  }
}

const mapClip = (row: ClipRow): Clip => ({
  id: row.id,
  sourceId: row.source_id,
  title: row.title,
  start: row.start_sec,
  end: row.end_sec,
  duration: Math.max(0, Math.round((row.end_sec - row.start_sec) * 10) / 10),
  score: row.score,
  excerpt: row.excerpt,
  cues: parseCues(row.cues),
  status: row.status as ClipStatus,
  platform: row.source_platform as Platform,
  views: Number(row.views ?? 0),
  downloads: Number(row.downloads ?? 0),
  createdAt: row.created_at,
  sourceTitle: row.source_title,
  sourceUrl: row.source_url,
  sourceThumbnail: row.source_thumbnail,
  sourceAuthor: row.source_author,
  externalId: row.external_id,
})

const CLIP_SELECT = `SELECT c.id, c.source_id, c.title, c.start_sec, c.end_sec, c.score, c.excerpt, c.cues, c.status, c.created_at,
    s.title AS source_title, s.url AS source_url, s.thumbnail AS source_thumbnail, s.author AS source_author,
    s.platform AS source_platform, s.external_id AS external_id,
    (SELECT COUNT(*) FROM clip_events e WHERE e.clip_id = c.id AND e.kind = 'view') AS views,
    (SELECT COUNT(*) FROM clip_events e WHERE e.clip_id = c.id AND e.kind = 'download') AS downloads
  FROM clips c JOIN sources s ON s.id = c.source_id`

export async function listClips(db: D1Like, userId: string, limit = 300) {
  const rows = await db.prepare(`${CLIP_SELECT} WHERE c.user_id = ? ORDER BY c.created_at DESC LIMIT ${Math.max(1, Math.min(500, limit))}`).bind(userId).all<ClipRow>()
  return (rows.results ?? []).map(mapClip)
}

export async function listSources(db: D1Like, userId: string, limit = 100) {
  const rows = await db
    .prepare(`SELECT s.*, (SELECT COUNT(*) FROM clips c WHERE c.source_id = s.id) AS clips FROM sources s WHERE s.user_id = ? ORDER BY s.created_at DESC LIMIT ${Math.max(1, Math.min(200, limit))}`)
    .bind(userId)
    .all<SourceRow>()
  return (rows.results ?? []).map(mapSource)
}

const monthStart = () => {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
}

async function clipsThisMonth(db: D1Like, userId: string) {
  const row = await db.prepare('SELECT COUNT(*) AS n FROM clips WHERE user_id = ? AND created_at >= ?').bind(userId, monthStart()).first<{ n: number }>()
  return Number(row?.n ?? 0)
}

/** Verified paid plan or the Free allowance. Unpaid plan picks unlock nothing. */
async function remainingFor(db: D1Like, user: PublicUser) {
  const plan = allowanceFor(user.planId)
  const used = await clipsThisMonth(db, user.id)
  return { plan, used, remaining: Math.max(0, plan.limit - used) }
}

const limitMessage = (plan: { name: string; limit: number; paid: boolean }) =>
  `You have used all ${plan.limit} clips on the ${plan.name} plan this month. The allowance resets on the 1st.`

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

const readJson = async (req: Request) => {
  try {
    const value = await req.json()
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

async function insertClips(db: D1Like, userId: string, sourceId: string, detection: Detection, cap: number) {
  const now = new Date().toISOString()
  const rows = detection.clips.slice(0, Math.max(0, cap))
  for (const clip of rows) {
    await db
      .prepare('INSERT INTO clips (id, user_id, source_id, title, start_sec, end_sec, score, excerpt, cues, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), userId, sourceId, clip.title, clip.start, clip.end, clip.score, clip.excerpt, JSON.stringify(clip.cues), 'ready', now)
      .run()
  }
  return rows.length
}

app.use('*', async (c, next) => {
  await ensureSchema(c.env.DB)
  await ensureClipsSchema(c.env.DB)
  await next()
})

/** Submits a link, optionally with a pasted transcript, and runs detection. */
app.post('/', async (c) => {
  const user = await currentUser(c)
  if (!user) return c.json({ error: 'Log in to analyze a VOD.' }, 401)

  const input = await readJson(c.req.raw)
  if (typeof input.url !== 'string') return c.json({ error: 'Paste a video link.' }, 400)
  const ref = parseSourceUrl(input.url)
  if ('error' in ref) return c.json({ error: ref.error }, 400)

  const allowance = await remainingFor(c.env.DB, user)
  if (allowance.remaining <= 0) {
    return c.json({ error: limitMessage(allowance.plan), used: allowance.used, limit: allowance.plan.limit }, 409)
  }

  const sourceId = crypto.randomUUID()
  const createdAt = new Date().toISOString()
  let meta: SourceMeta
  try {
    meta = ref.platform === 'YouTube' ? await fetchYouTube(ref) : await fetchTwitch(ref)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'That link could not be read.'
    await c.env.DB.prepare('INSERT INTO sources (id, user_id, url, platform, external_id, title, author, thumbnail, duration, status, method, error, created_at, analyzed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(sourceId, user.id, ref.url, ref.platform, ref.id, `Unreadable ${ref.platform} link`, null, null, 0, 'failed', null, message, createdAt, createdAt)
      .run()
    return c.json({ error: message, source: (await listSources(c.env.DB, user.id, 1))[0] ?? null }, 502)
  }

  const pasted = typeof input.transcript === 'string' ? parseTranscript(input.transcript) : []
  if (pasted.length >= 4) meta.cues = pasted

  const detection = detect(meta, allowance.remaining)
  const status: SourceStatus = detection ? 'ready' : 'needs_transcript'
  const missing = 'YouTube did not provide captions to this server for that video. Use the free on-device transcriber in Studio with your download, or paste a transcript.'
  await c.env.DB.prepare('INSERT INTO sources (id, user_id, url, platform, external_id, title, author, thumbnail, duration, status, method, error, created_at, analyzed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(sourceId, user.id, ref.url, ref.platform, ref.id, meta.title, meta.author, meta.thumbnail, meta.duration, status, detection?.method ?? null, detection ? null : missing, createdAt, new Date().toISOString())
    .run()

  let created = 0
  if (detection) {
    created = await insertClips(c.env.DB, user.id, sourceId, detection, allowance.remaining)
    if (!created) {
      await c.env.DB.prepare("UPDATE sources SET status = 'needs_transcript', method = NULL WHERE id = ?").bind(sourceId).run()
    }
  }

  const source = (await listSources(c.env.DB, user.id, 1))[0]
  const clips = created ? (await listClips(c.env.DB, user.id, 500)).filter((clip) => clip.sourceId === sourceId) : []

  return c.json(
    {
      source,
      clips,
      detection: detection?.method ?? null,
      needsTranscript: !created,
      transcriptTracks: meta.cues.length,
    },
    created ? 201 : 422,
  )
})

/** Adds a transcript for a source that had no captions, then detects. */
app.post('/sources/:id/transcript', async (c) => {
  const user = await currentUser(c)
  if (!user) return c.json({ error: 'Log in first.' }, 401)
  const sourceId = c.req.param('id')
  const owned = await c.env.DB.prepare('SELECT * FROM sources WHERE id = ? AND user_id = ?').bind(sourceId, user.id).first<SourceRow>()
  if (!owned) return c.json({ error: 'That VOD does not exist.' }, 404)

  const input = await readJson(c.req.raw)
  const cues = parseTranscript(typeof input.transcript === 'string' ? input.transcript : '')
  if (cues.length < 4) return c.json({ error: 'Paste a transcript with at least four timed lines (VTT, SRT or “0:12 text” lines).' }, 400)

  const allowance = await remainingFor(c.env.DB, user)
  if (allowance.remaining <= 0) return c.json({ error: limitMessage(allowance.plan), used: allowance.used, limit: allowance.plan.limit }, 409)

  const detection: Detection = { method: 'transcript', clips: detectFromTranscript(cues, Math.min(allowance.remaining, MAX_CLIPS_PER_RUN)) }
  if (!detection.clips.length) return c.json({ error: 'Those timings did not produce a clip. Check the transcript has timestamps.' }, 422)

  await c.env.DB.prepare("DELETE FROM clips WHERE source_id = ? AND user_id = ? AND status = 'ready'").bind(sourceId, user.id).run()
  const created = await insertClips(c.env.DB, user.id, sourceId, detection, allowance.remaining)
  await c.env.DB.prepare("UPDATE sources SET status = 'ready', method = 'transcript', error = NULL, analyzed_at = ? WHERE id = ?").bind(new Date().toISOString(), sourceId).run()

  return c.json({ ok: true, created, clips: (await listClips(c.env.DB, user.id, 500)).filter((clip) => clip.sourceId === sourceId) })
})

/** Re-reads the link and detects again, replacing ready clips. */
app.post('/sources/:id/retry', async (c) => {
  const user = await currentUser(c)
  if (!user) return c.json({ error: 'Log in first.' }, 401)
  const sourceId = c.req.param('id')
  const owned = await c.env.DB.prepare('SELECT * FROM sources WHERE id = ? AND user_id = ?').bind(sourceId, user.id).first<SourceRow>()
  if (!owned) return c.json({ error: 'That VOD does not exist.' }, 404)

  const allowance = await remainingFor(c.env.DB, user)
  if (!allowance.plan) return c.json({ error: 'Choose a plan first.' }, 403)

  const ref = parseSourceUrl(owned.url)
  if ('error' in ref) return c.json({ error: ref.error }, 400)

  let meta: SourceMeta
  try {
    meta = ref.platform === 'YouTube' ? await fetchYouTube(ref) : await fetchTwitch(ref)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'That link could not be read.'
    await c.env.DB.prepare("UPDATE sources SET status = 'failed', error = ?, analyzed_at = ? WHERE id = ?").bind(message, new Date().toISOString(), sourceId).run()
    return c.json({ error: message }, 502)
  }

  const detection = detect(meta, Math.max(allowance.remaining, 1))
  if (!detection) {
    await c.env.DB.prepare("UPDATE sources SET status = 'needs_transcript', error = ?, analyzed_at = ? WHERE id = ?")
      .bind('No captions or chapters were available for this link.', new Date().toISOString(), sourceId)
      .run()
    return c.json({ error: 'Still no captions or chapters for this link. Paste a transcript instead.', needsTranscript: true }, 422)
  }

  await c.env.DB.prepare("DELETE FROM clips WHERE source_id = ? AND user_id = ? AND status = 'ready'").bind(sourceId, user.id).run()
  const created = await insertClips(c.env.DB, user.id, sourceId, detection, Math.max(allowance.remaining, 1))
  await c.env.DB.prepare("UPDATE sources SET status = 'ready', method = ?, error = NULL, title = ?, duration = ?, thumbnail = ?, analyzed_at = ? WHERE id = ?")
    .bind(detection.method, meta.title, meta.duration, meta.thumbnail, new Date().toISOString(), sourceId)
    .run()
  return c.json({ ok: true, created })
})

app.delete('/sources/:id', async (c) => {
  const user = await currentUser(c)
  if (!user) return c.json({ error: 'Log in first.' }, 401)
  const sourceId = c.req.param('id')
  const owned = await c.env.DB.prepare('SELECT id FROM sources WHERE id = ? AND user_id = ?').bind(sourceId, user.id).first<{ id: string }>()
  if (!owned) return c.json({ error: 'That VOD does not exist.' }, 404)
  await c.env.DB.prepare('DELETE FROM clip_events WHERE clip_id IN (SELECT id FROM clips WHERE source_id = ?)').bind(sourceId).run()
  await c.env.DB.prepare('DELETE FROM clips WHERE source_id = ? AND user_id = ?').bind(sourceId, user.id).run()
  await c.env.DB.prepare('DELETE FROM sources WHERE id = ? AND user_id = ?').bind(sourceId, user.id).run()
  return c.json({ ok: true })
})

app.get('/sources', async (c) => {
  const user = await currentUser(c)
  if (!user) return c.json({ error: 'Log in first.' }, 401)
  return c.json({ sources: await listSources(c.env.DB, user.id) })
})

app.get('/', async (c) => {
  const user = await currentUser(c)
  if (!user) return c.json({ error: 'Log in first.' }, 401)
  const query = (c.req.query('q') ?? '').trim().toLowerCase()
  const status = c.req.query('status') ?? ''
  const platform = c.req.query('platform') ?? ''

  let clips = await listClips(c.env.DB, user.id)
  if (query) clips = clips.filter((clip) => `${clip.title} ${clip.excerpt} ${clip.sourceTitle}`.toLowerCase().includes(query))
  if (status === 'ready' || status === 'posted' || status === 'archived') clips = clips.filter((clip) => clip.status === status)
  if (platform === 'YouTube' || platform === 'Twitch') clips = clips.filter((clip) => clip.platform === platform)
  return c.json({ clips })
})

/** Public clip payload for the share page. */
app.get('/:id', async (c) => {
  const row = await c.env.DB.prepare(`${CLIP_SELECT} WHERE c.id = ?`).bind(c.req.param('id')).first<ClipRow>()
  if (!row) return c.json({ error: 'That clip does not exist.' }, 404)
  return c.json({ clip: mapClip(row) })
})

app.post('/:id/view', async (c) => {
  const clipId = c.req.param('id')
  const row = await c.env.DB.prepare('SELECT c.user_id FROM clips c WHERE c.id = ?').bind(clipId).first<{ user_id: string }>()
  if (!row) return c.json({ error: 'That clip does not exist.' }, 404)
  await c.env.DB.prepare("INSERT INTO clip_events (clip_id, user_id, kind, created_at) VALUES (?, ?, 'view', ?)").bind(clipId, row.user_id, new Date().toISOString()).run()
  const count = await c.env.DB.prepare("SELECT COUNT(*) AS n FROM clip_events WHERE clip_id = ? AND kind = 'view'").bind(clipId).first<{ n: number }>()
  return c.json({ ok: true, views: Number(count?.n ?? 0) })
})

app.get('/:id/export/:format', async (c) => {
  const format = EXPORT_FORMATS.find((item) => item.id === c.req.param('format'))
  if (!format) return c.json({ error: 'Unknown export format.' }, 404)
  const row = await c.env.DB.prepare(`${CLIP_SELECT} WHERE c.id = ?`).bind(c.req.param('id')).first<ClipRow>()
  if (!row) return c.text('Clip not found.', 404)
  const clip = mapClip(row)
  await c.env.DB.prepare("INSERT INTO clip_events (clip_id, user_id, kind, created_at) VALUES (?, NULL, 'download', ?)").bind(clip.id, new Date().toISOString()).run()
  c.header('content-type', format.mime)
  c.header('content-disposition', `attachment; filename="${exportFilename(clip, format.id)}"`)
  c.header('cache-control', 'no-store')
  return c.body(buildExport(clip, format.id))
})

/** Kept for old links: the SRT is one of the generated exports now. */
app.get('/:id/captions.srt', (c) => c.redirect(`/api/clips/${c.req.param('id')}/export/srt`, 302))

app.patch('/:id', async (c) => {
  const user = await currentUser(c)
  if (!user) return c.json({ error: 'Log in first.' }, 401)
  const input = await readJson(c.req.raw)
  const status = input.status
  if (status !== 'ready' && status !== 'posted' && status !== 'archived') return c.json({ error: 'Unknown clip status.' }, 400)
  const clipId = c.req.param('id')
  const owned = await c.env.DB.prepare('SELECT id FROM clips WHERE id = ? AND user_id = ?').bind(clipId, user.id).first<{ id: string }>()
  if (!owned) return c.json({ error: 'That clip does not exist.' }, 404)
  await c.env.DB.prepare('UPDATE clips SET status = ? WHERE id = ? AND user_id = ?').bind(status, clipId, user.id).run()
  return c.json({ ok: true, status })
})

app.delete('/:id', async (c) => {
  const user = await currentUser(c)
  if (!user) return c.json({ error: 'Log in first.' }, 401)
  const clipId = c.req.param('id')
  const owned = await c.env.DB.prepare('SELECT id FROM clips WHERE id = ? AND user_id = ?').bind(clipId, user.id).first<{ id: string }>()
  if (!owned) return c.json({ error: 'That clip does not exist.' }, 404)
  await c.env.DB.prepare('DELETE FROM clip_events WHERE clip_id = ?').bind(clipId).run()
  await c.env.DB.prepare('DELETE FROM clips WHERE id = ? AND user_id = ?').bind(clipId, user.id).run()
  return c.json({ ok: true })
})

// ---------------------------------------------------------------------------
// Dashboard payload
// ---------------------------------------------------------------------------

const dayKey = (iso: string) => iso.slice(0, 10)

const SERIES_DAYS = 90

function buildSeries(clips: Clip[], events: Array<{ day: string; views: number }>): TrendPoint[] {
  const viewsByDay = new Map(events.map((event) => [event.day, event.views]))
  const clipsByDay = new Map<string, number>()
  for (const clip of clips) clipsByDay.set(dayKey(clip.createdAt), (clipsByDay.get(dayKey(clip.createdAt)) ?? 0) + 1)

  // The dashboard can switch between 7, 30 and 90 days without another request.
  return Array.from({ length: SERIES_DAYS }, (_, index) => {
    const date = new Date()
    date.setUTCDate(date.getUTCDate() - (SERIES_DAYS - 1 - index))
    const key = date.toISOString().slice(0, 10)
    return { date: key, clips: clipsByDay.get(key) ?? 0, views: viewsByDay.get(key) ?? 0 }
  })
}

export async function buildDashboard(db: D1Like, user: PublicUser, now = new Date()): Promise<DashboardData> {
  const clips = await listClips(db, user.id, 500)
  const sources = await listSources(db, user.id)
  const plan = allowanceFor(user.planId)

  const viewRows = await db
    .prepare(`SELECT substr(e.created_at, 1, 10) AS day, COUNT(*) AS views FROM clip_events e JOIN clips c ON c.id = e.clip_id WHERE c.user_id = ? AND e.kind = 'view' GROUP BY day`)
    .bind(user.id)
    .all<{ day: string; views: number }>()
  const viewSeries = (viewRows.results ?? []).map((row) => ({ day: row.day, views: Number(row.views) }))

  const downloadRow = await db
    .prepare(`SELECT COUNT(*) AS n FROM clip_events e JOIN clips c ON c.id = e.clip_id WHERE c.user_id = ? AND e.kind = 'download'`)
    .bind(user.id)
    .first<{ n: number }>()

  const series = buildSeries(clips, viewSeries)
  const views = viewSeries.reduce((sum, row) => sum + row.views, 0)
  const week = series.slice(-7)
  const prevWeek = series.slice(-14, -7)
  const sum = (rows: TrendPoint[], key: keyof Omit<TrendPoint, 'date'>) => rows.reduce((total, row) => total + row[key], 0)

  const used = clips.filter((clip) => clip.createdAt >= monthStart()).length
  const platforms = (['YouTube', 'Twitch'] as const).map((name) => ({
    name,
    sources: sources.filter((source) => source.platform === name).length,
    clips: clips.filter((clip) => clip.platform === name).length,
  }))

  const renewsAt = user.planId && user.planStartedAt ? new Date(new Date(user.planStartedAt).getTime() + 30 * 24 * 3600 * 1000).toISOString() : null

  const activity: DashboardData['activity'] = [
    ...sources.slice(0, 6).map((source) => ({
      id: `source-${source.id}`,
      at: source.analyzedAt ?? source.createdAt,
      text:
        source.status === 'ready'
          ? `${source.clips} clip${source.clips === 1 ? '' : 's'} detected in “${source.title}”`
          : source.status === 'needs_transcript'
            ? `“${source.title}” is waiting for a transcript`
            : `“${source.title}” could not be read`,
    })),
    ...clips.slice(0, 4).map((clip) => ({ id: `clip-${clip.id}`, at: clip.createdAt, text: `New clip: “${clip.title}” (${Math.round(clip.end - clip.start)}s)` })),
    ...(viewSeries.length ? [{ id: 'views', at: now.toISOString(), text: `${views} clip-page view${views === 1 ? '' : 's'} recorded` }] : []),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 7)

  const data: DashboardData = {
    generatedAt: now.toISOString(),
    summary: {
      clips: clips.length,
      sources: sources.length,
      minutes: Math.round(clips.reduce((total, clip) => total + clip.duration, 0) / 60),
      views,
      downloads: Number(downloadRow?.n ?? 0),
      avgScore: clips.length ? Math.round(clips.reduce((total, clip) => total + clip.score, 0) / clips.length) : null,
      weekClips: sum(week, 'clips'),
      prevWeekClips: sum(prevWeek, 'clips'),
      weekViews: sum(week, 'views'),
      prevWeekViews: sum(prevWeek, 'views'),
    },
    series,
    platforms,
    clips: clips.slice(0, 6).map(({ id, title, score, start, end, status, platform, views: clipViews, createdAt, sourceTitle, sourceThumbnail }) => ({
      id,
      title,
      score,
      start,
      end,
      status,
      platform,
      views: clipViews,
      createdAt,
      sourceTitle,
      sourceThumbnail,
    })),
    sources: sources.slice(0, 5).map(({ id, title, platform, status, clips: count, duration, createdAt, thumbnail, method }) => ({ id, title, platform, status, clips: count, duration, createdAt, thumbnail, method })),
    usage: { used, limit: plan.limit, planName: plan.name, renewsAt },
    activity,
  }

  if (user.role === 'admin') {
    type AccountRow = { id: string; name: string; email: string; plan_id: string | null; billing: string | null; plan_started_at: string | null; plan_verified_at: string | null; role: string; created_at: string }
    const rows = await db
      .prepare('SELECT id, name, email, plan_id, billing, plan_started_at, plan_verified_at, role, created_at FROM users ORDER BY created_at DESC')
      .all<AccountRow>()
    const accounts = rows.results ?? []
    const totals = await db.prepare('SELECT (SELECT COUNT(*) FROM clips) AS clips, (SELECT COUNT(*) FROM sources) AS sources').first<{ clips: number; sources: number }>()
    const planOf = (row: AccountRow) => PLANS.find((item) => item.id === (row.plan_id as PlanId | null)) ?? null
    const verified = accounts.filter((row) => row.plan_verified_at && planOf(row))
    const unverified = accounts.filter((row) => !row.plan_verified_at && planOf(row))
    const monthly = (row: AccountRow) => {
      const rowPlan = planOf(row)
      return rowPlan ? priceFor(rowPlan, row.billing === 'quarterly' ? 'quarterly' : 'monthly') : 0
    }
    const recent: AdminUser[] = accounts.slice(0, 5).map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      plan: row.plan_verified_at ? planOf(row)?.name ?? null : null,
      requestedPlan: row.plan_verified_at ? null : planOf(row)?.name ?? null,
      role: row.role,
      createdAt: row.created_at,
    }))
    data.admin = {
      accounts: accounts.length,
      // Revenue counts verified payments only. Nothing verifies payments yet.
      paidAccounts: verified.length,
      mrr: verified.reduce((total, row) => total + monthly(row), 0),
      unverifiedPlans: unverified.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        plan: planOf(row)!.name,
        billing: row.billing === 'quarterly' ? 'quarterly' : 'monthly',
        selectedAt: row.plan_started_at,
        monthly: monthly(row),
      })),
      clips: Number(totals?.clips ?? 0),
      sources: Number(totals?.sources ?? 0),
      recent,
    }
  }

  return data
}

export default app
