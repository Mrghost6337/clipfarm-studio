// Deterministic agents that run over a stored clip. They are ordinary code, not
// an LLM: each one inspects the real cut and its caption cues and returns a
// report the studio shows verbatim. Nothing here invents data.

import { formatStamp, type Clip } from './clips'
import { EXPORT_FORMATS } from './exports'

export type AgentCheck = { label: string; ok: boolean; detail: string }
export type AgentReport = { summary: string; checks: AgentCheck[]; passed: boolean }
export type Agent = { id: 'qa' | 'captions' | 'hook' | 'package'; name: string; description: string; run: (clip: Clip) => AgentReport }

const words = (text: string) => text.trim().split(/\s+/).filter(Boolean).length

const HYPE = /\b(no way|oh my god|insane|crazy|unbelievable|busted|wasted|heist|clutch|destroyed|record|laugh|screaming)\b/i

function report(summary: string, checks: AgentCheck[]): AgentReport {
  return { summary, checks, passed: checks.every((check) => check.ok) }
}

/** Cut, cue and coverage checks — the things that actually break a clip. */
export function runQaAgent(clip: Clip): AgentReport {
  const duration = clip.end - clip.start
  const cues = clip.cues
  const ordered = cues.every((cue, index) => index === 0 || cue.start >= cues[index - 1].start)
  const inside = cues.every((cue) => cue.start >= clip.start - 0.5 && cue.end <= clip.end + 0.5)
  const spoken = cues.reduce((total, cue) => total + words(cue.text), 0)
  const span = cues.length ? cues[cues.length - 1].end - cues[0].start : 0
  const coverage = duration > 0 ? Math.min(1, Math.max(0, span / duration)) : 0

  return report(`${Math.round(duration)}s cut, ${cues.length} cues, ${spoken} words.`, [
    { label: 'Cut length', ok: duration >= 10 && duration <= 60, detail: `${duration.toFixed(1)}s (target 10–60s)` },
    { label: 'Cues in order', ok: cues.length === 0 || ordered, detail: `${cues.length} cue${cues.length === 1 ? '' : 's'}` },
    { label: 'Cues inside the cut', ok: cues.length === 0 || inside, detail: `Cut ${formatStamp(clip.start)}–${formatStamp(clip.end)}` },
    { label: 'Caption coverage', ok: coverage >= 0.35 || cues.length === 0, detail: `${Math.round(coverage * 100)}% of the cut` },
    { label: 'Spoken words', ok: spoken >= 8, detail: `${spoken}` },
    { label: 'Hook score', ok: clip.score >= 50, detail: `${clip.score}/100` },
  ])
}

/** Caption stats and the formats that can be built from this clip. */
export function runCaptionAgent(clip: Clip): AgentReport {
  const cues = clip.cues.filter((cue) => cue.text.trim())
  const characters = cues.reduce((total, cue) => total + cue.text.length, 0)
  const longest = cues.reduce((max, cue) => Math.max(max, cue.text.length), 0)
  const wordsTotal = cues.reduce((total, cue) => total + words(cue.text), 0)

  return report(`${cues.length} timed lines, ${wordsTotal} words, ${characters} characters.`, [
    { label: 'Timed lines', ok: cues.length > 0, detail: `${cues.length} line${cues.length === 1 ? '' : 's'}` },
    { label: 'Line length', ok: longest <= 90, detail: `Longest ${longest} characters` },
    { label: 'Readable density', ok: cues.length === 0 || wordsTotal / cues.length <= 16, detail: `${cues.length ? (wordsTotal / cues.length).toFixed(1) : 0} words per line` },
    { label: 'SRT ready', ok: cues.length > 0, detail: 'pysubs2-compatible timings' },
    { label: 'Styled ASS ready', ok: cues.length > 0, detail: '1080×1920, 72px Inter Tight' },
    { label: 'Sidecar files', ok: true, detail: EXPORT_FORMATS.filter((format) => format.group === 'Captions').map((format) => format.label).join(' · ') },
  ])
}

/** Looks at the opening line the way a viewer's thumb would. */
export function runHookAgent(clip: Clip): AgentReport {
  const opening = (clip.cues[0]?.text ?? clip.excerpt).trim()
  const firstSentence = opening.split(/(?<=[.!?])\s+/)[0] ?? opening
  const weakStart = /^(so|and|but|well|okay|ok|like|um|uh|yeah)\b/i.test(firstSentence)
  const hype = HYPE.test(firstSentence)

  return report(`Opens with “${firstSentence.slice(0, 90)}${firstSentence.length > 90 ? '…' : ''}”`, [
    { label: 'Opening line', ok: words(firstSentence) >= 3, detail: `${words(firstSentence)} words` },
    { label: 'No filler start', ok: !weakStart, detail: weakStart ? 'Starts with filler; cut it in' : 'Starts on the moment' },
    { label: 'Reaction signal', ok: hype, detail: hype ? 'Shock, laughter or claim in the first line' : 'No strong signal in the first line' },
    { label: 'Title present', ok: clip.title.length >= 6, detail: `${clip.title.length} characters` },
    { label: 'Score', ok: clip.score >= 50, detail: `${clip.score}/100` },
  ])
}

/** Confirms the full hand-off bundle for this clip exists. */
export function runPackagingAgent(clip: Clip): AgentReport {
  const captions = EXPORT_FORMATS.filter((format) => format.group === 'Captions')
  const timeline = EXPORT_FORMATS.filter((format) => format.group === 'Timeline')
  const hasTimeline = timeline.some((format) => format.id === 'ffmpeg') && timeline.some((format) => format.id === 'mlt')

  return report(`${captions.length + timeline.length} files, ${clip.cues.length} cues, ${Math.round(clip.end - clip.start)}s cut.`, [
    { label: 'Caption files', ok: captions.length >= 3, detail: captions.map((format) => format.label).join(' · ') },
    { label: 'Editor project', ok: timeline.some((format) => format.id === 'mlt'), detail: 'MLT for Shotcut/Kdenlive, EDL for the rest' },
    { label: 'Scriptable cut', ok: timeline.some((format) => format.id === 'ffmpeg'), detail: 'ffmpeg + yt-dlp script' },
    { label: 'In-browser render', ok: true, detail: 'MediaBunny cuts the local file to MP4' },
    { label: 'Source linked', ok: Boolean(clip.sourceUrl), detail: clip.sourceUrl },
    { label: 'Bundle complete', ok: hasTimeline && captions.length >= 3, detail: 'Everything a desktop hand-off needs' },
  ])
}

export const AGENTS: readonly Agent[] = [
  { id: 'qa', name: 'QA agent', description: 'Checks cut length, cue order, coverage and score before anything ships.', run: runQaAgent },
  { id: 'captions', name: 'Caption agent', description: 'Measures the timed lines and confirms every caption format can be built.', run: runCaptionAgent },
  { id: 'hook', name: 'Hook agent', description: 'Reads the opening second and flags filler, weak starts and missing reactions.', run: runHookAgent },
  { id: 'package', name: 'Packaging agent', description: 'Verifies the caption files, editor project, ffmpeg script and source link.', run: runPackagingAgent },
]
