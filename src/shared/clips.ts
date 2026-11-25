// Clip detection shared by the Worker and the dashboard.
//
// Everything here works on real data: the timestamps that came with the VOD
// (a transcript with timings, or the chapter list from the description). The
// scorer ranks moments by the language people actually used — laughter, shock,
// claims, questions — plus how dense the speech is. Nothing is generated.

export type Cue = { start: number; end: number; text: string }
export type Chapter = { start: number; title: string }
export type ClipMethod = 'transcript' | 'chapters'

export type DetectedClip = {
  title: string
  start: number
  end: number
  score: number
  excerpt: string
  cues: Cue[]
}

export type Detection = { method: ClipMethod; clips: DetectedClip[] }

export type ClipStatus = 'ready' | 'posted' | 'archived'
export type SourceStatus = 'ready' | 'needs_transcript' | 'failed'
export type Platform = 'YouTube' | 'Twitch'

/** A VOD or Twitch clip that has been submitted. */
export type ClipSource = {
  id: string
  url: string
  platform: Platform
  externalId: string | null
  title: string
  author: string | null
  thumbnail: string | null
  duration: number
  status: SourceStatus
  method: ClipMethod | null
  error: string | null
  clips: number
  createdAt: string
  analyzedAt: string | null
}

/** A moment cut out of a source, with its caption cues. */
export type Clip = {
  id: string
  sourceId: string
  title: string
  start: number
  end: number
  duration: number
  score: number
  excerpt: string
  cues: Cue[]
  status: ClipStatus
  platform: Platform
  views: number
  downloads: number
  createdAt: string
  sourceTitle: string
  sourceUrl: string
  sourceThumbnail: string | null
  sourceAuthor: string | null
  externalId: string | null
}

const SIGNALS = /\b(oh my god|no way|what the|holy|laugh(?:s|ed|ing)?|insane|crazy|unbelievable|clutch|destroy(?:ed|ing)?|rage|raging|first try|world record|let'?s go|bruh|exposed|secret|never|best|worst|wins?|winning|won|beat|record|can'?t believe|didn'?t expect|finally|chat|clip that|huge|massive|disaster|fail(?:ed|ure)?|perfect|actually|literally|serious(?:ly)?|backstab|betray|caught|plot twist)\b/gi

/** GTA VI vocabulary: chases, crime and Leonida lore. Scored on top of the generic signals. */
const GTA_SIGNALS = /\b(gta(?: vi| 6)?|wanted level|busted|wasted|heist|cop chase|police chase|cops|police|getaway|carjack(?:ed|ing)?|rampage|vice city|leonida|shark card|five stars|six stars|mission passed|stunt|shootout|explosion|rammed|helicopter|tank)\b/gi

const INTRO = /^(intro|outro|start(ing)?|beginning|end(ing)?|credits|thanks for watching|subscribe|sponsor)\b/i

const clean = (value: string) => value.replace(/\s+/g, ' ').trim()

/** `1:02:03.4` / `01:02:03,400` / `2:03` -> seconds. */
export function parseStamp(value: string): number {
  const parts = value.replace(',', '.').split(':').map(Number)
  if (!parts.length || parts.some((part) => !Number.isFinite(part))) return Number.NaN
  return parts.reduce((total, part) => total * 60 + part, 0)
}

/** 83.4 -> `1:23`. */
export function formatStamp(seconds: number) {
  const total = Math.max(0, Math.round(seconds))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}` : `${minutes}:${String(secs).padStart(2, '0')}`
}

/**
 * Reads YouTube's json3 captions, WebVTT, SRT, or plain lines that start with a
 * timestamp. Returns [] when nothing timed can be found.
 */
export function parseTranscript(raw: string): Cue[] {
  const text = raw.replace(/\r\n?/g, '\n').trim()
  if (!text) return []

  if (text.startsWith('{')) {
    try {
      const data = JSON.parse(text) as { events?: Array<{ tStartMs?: number; dDurationMs?: number; segs?: Array<{ utf8?: string }> }> }
      return (data.events ?? [])
        .map((event) => {
          const start = (event.tStartMs ?? 0) / 1000
          const held = (event.dDurationMs ?? 0) / 1000
          return { start, end: start + (held || 2.5), text: clean((event.segs ?? []).map((seg) => seg.utf8 ?? '').join(' ')) }
        })
        .filter((cue) => cue.text)
    } catch {
      return []
    }
  }

  const blocks = text.split(/\n{2,}/)
  const timed: Cue[] = []
  for (const block of blocks) {
    const lines = block.split('\n').map((line) => line.trim()).filter(Boolean)
    const stampLine = lines.find((line) => line.includes('-->'))
    if (!stampLine) continue
    const [from, to] = stampLine.split('-->').map((part) => part.trim().split(/\s+/)[0])
    const start = parseStamp(from)
    const end = parseStamp(to)
    const body = clean(lines.slice(lines.indexOf(stampLine) + 1).join(' ').replace(/<[^>]+>/g, ''))
    if (!body || !Number.isFinite(start)) continue
    timed.push({ start, end: Number.isFinite(end) && end > start ? end : start + 3, text: body })
  }
  if (timed.length) return timed

  // Plain text with a timestamp at the start of each line.
  const plain: Cue[] = []
  for (const line of text.split('\n')) {
    const match = /^\[?(\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d{1,3})?)\]?\s+(.+)$/.exec(line.trim())
    if (!match) continue
    const start = parseStamp(match[1])
    const body = clean(match[2])
    if (!Number.isFinite(start) || !body) continue
    plain.push({ start, end: start + 3, text: body })
  }
  return plain
}

/** Chapter stamps written in the description, e.g. `12:40 The clutch`. */
export function parseChapters(description: string): Chapter[] {
  const found: Chapter[] = []
  const seen = new Set<number>()
  for (const line of description.replace(/\r/g, '').split('\n')) {
    const match = /^\(?(\d{1,2}:\d{2}(?::\d{2})?)\)?\s*[-–—:|]?\s*(.+)$/.exec(line.trim())
    if (!match) continue
    const start = parseStamp(match[1])
    const title = clean(match[2]).replace(/^[-–—:|]\s*/, '')
    if (!Number.isFinite(start) || title.length < 2 || seen.has(start)) continue
    seen.add(start)
    found.push({ start, title })
  }
  return found.sort((a, b) => a.start - b.start)
}

function scoreText(text: string) {
  const words = text.split(/\s+/).filter(Boolean).length
  if (!words) return 0
  const signals = (text.match(SIGNALS) ?? []).length
  const bangs = (text.match(/!/g) ?? []).length
  const questions = (text.match(/\?/g) ?? []).length
  const laughs = (text.match(/\[(laughter|applause|cheering)\]/gi) ?? []).length
  const gta = (text.match(GTA_SIGNALS) ?? []).length
  return signals * 3 + laughs * 4 + Math.min(3, bangs) * 1.5 + Math.min(3, questions) + Math.min(4, words / 14) + Math.min(3, gta) * 2.5
}

function tidyTitle(value: string, fallback: string) {
  const text = clean(value.replace(/^\[[^\]]+\]\s*/, ''))
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.replace(/^[-–—\s]+/, '').trim())
    .filter((part) => part.length >= 12)
  const best = sentences.length > 1 ? [...sentences].sort((a, b) => scoreText(b) - scoreText(a))[0] : text
  const pick = best.replace(/^(so|and|but|well|okay|ok|like|um|uh|yeah)\s+/i, '')
  const words = pick.split(/\s+/).filter(Boolean)
  let title = words.slice(0, 9).join(' ')
  if (words.length > 9) title = `${title}…`
  title = title.replace(/[.,;:!?-]+$/, '').replace(/…$/, '…')
  if (title.length > 68) title = `${title.slice(0, 65).replace(/\s+\S*$/, '')}…`
  if (title.length < 6) return fallback
  return title.charAt(0).toUpperCase() + title.slice(1)
}

const TARGET_SECONDS = 28
const MIN_SECONDS = 14
const MAX_SECONDS = 52
const MAX_CLIPS = 6

/** Ranks transcript windows and returns the strongest, non-overlapping moments. */
export function detectFromTranscript(cues: Cue[], max = MAX_CLIPS): DetectedClip[] {
  const usable = cues.filter((cue) => cue.text && Number.isFinite(cue.start)).sort((a, b) => a.start - b.start)
  if (usable.length < 4) return []

  const candidates: Array<{ from: number; to: number; start: number; end: number; score: number; text: string }> = []
  for (let i = 0; i < usable.length; i++) {
    let j = i
    let end = usable[i].start
    let text = ''
    while (j < usable.length && usable[j].end - usable[i].start <= TARGET_SECONDS) {
      end = usable[j].end
      text += ` ${usable[j].text}`
      j++
    }
    const duration = end - usable[i].start
    if (duration < MIN_SECONDS) continue
    const spoken = clean(text)
    if (spoken.split(/\s+/).length < 18) continue
    const sweet = duration >= 18 && duration <= 42 ? 2 : 0
    candidates.push({ from: i, to: j, start: usable[i].start, end: Math.min(end, usable[i].start + MAX_SECONDS), score: scoreText(spoken) + sweet, text: spoken })
  }
  if (!candidates.length) return []

  const best = Math.max(...candidates.map((candidate) => candidate.score))
  const chosen: typeof candidates = []
  for (const candidate of [...candidates].sort((a, b) => b.score - a.score)) {
    if (chosen.length >= max) break
    if (chosen.some((taken) => candidate.start < taken.end + 4 && candidate.end > taken.start - 4)) continue
    chosen.push(candidate)
  }

  return chosen
    .sort((a, b) => a.start - b.start)
    .map((candidate) => {
      const window = usable.filter((cue) => cue.end > candidate.start && cue.start < candidate.end).slice(0, 80)
      const score = Math.max(1, Math.min(100, Math.round((candidate.score / Math.max(1, best)) * 92) + 8))
      return {
        title: tidyTitle(candidate.text, `${formatStamp(candidate.start)} highlight`),
        start: Math.round(candidate.start * 10) / 10,
        end: Math.round(candidate.end * 10) / 10,
        score,
        excerpt: candidate.text.length > 320 ? `${candidate.text.slice(0, 317).replace(/\s+\S*$/, '')}…` : candidate.text,
        cues: window,
      }
    })
}

/** Falls back to the creator's own chapter markers. */
export function detectFromChapters(chapters: Chapter[], duration: number, max = 5): DetectedClip[] {
  if (chapters.length < 3) return []
  const scored = chapters.map((chapter, index) => {
    const next = chapters[index + 1]?.start
    const end = next ?? (duration > chapter.start ? duration : chapter.start + 90)
    const length = end - chapter.start
    return { ...chapter, end, length }
  })

  const candidates = scored.filter((chapter) => chapter.length >= 15)
  if (!candidates.length) return []
  const ranked = candidates
    .filter((chapter) => !INTRO.test(chapter.title))
    .map((chapter) => ({ chapter, weight: scoreText(chapter.title) + (chapter.length >= 45 && chapter.length <= 600 ? 3 : 0) }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, max)
  if (!ranked.length) return []
  const best = Math.max(...ranked.map((entry) => entry.weight), 1)

  return ranked
    .map(({ chapter, weight }) => ({
      title: chapter.title.slice(0, 68),
      start: Math.round(chapter.start * 10) / 10,
      end: Math.round(Math.min(chapter.end, chapter.start + MAX_SECONDS) * 10) / 10,
      score: Math.max(1, Math.min(100, Math.round((weight / best) * 82) + 14)),
      excerpt: `Chapter from the description: “${chapter.title}”.`,
      cues: [{ start: chapter.start, end: Math.min(chapter.end, chapter.start + MAX_SECONDS), text: chapter.title }],
    }))
    .sort((a, b) => a.start - b.start)
}

/** SRT captions for a clip, offset so the file starts at 0:00. */
export function toSrt(cues: Cue[], start: number): string {
  const stamp = (seconds: number) => {
    const ms = Math.max(0, Math.round(seconds * 1000))
    const pad = (value: number, size = 2) => String(value).padStart(size, '0')
    return `${pad(Math.floor(ms / 3600000))}:${pad(Math.floor(ms / 60000) % 60)}:${pad(Math.floor(ms / 1000) % 60)},${pad(ms % 1000, 3)}`
  }
  const usable = cues.filter((cue) => cue.text.trim())
  const rows = usable.length ? usable : [{ start, end: start + 4, text: 'Clip from Clipfarm Studio' }]
  return rows
    .map((cue, index) => `${index + 1}\n${stamp(cue.start - start)} --> ${stamp(cue.end - start)}\n${cue.text}\n`)
    .join('\n')
}

export const clipStats = (clips: DetectedClip[]) => {
  const total = clips.reduce((sum, clip) => sum + (clip.end - clip.start), 0)
  const average = clips.length ? Math.round(clips.reduce((sum, clip) => sum + clip.score, 0) / clips.length) : 0
  return { total, average }
}
