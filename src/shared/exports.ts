// Real files generated from a stored clip: caption tracks and edit-project
// hand-offs for the tools in the toolkit. Nothing is templated with placeholder
// text — every timestamp and line comes from the clip's own cut and cues.

import { toSrt, type Clip } from './clips'

export type ExportId = 'srt' | 'vtt' | 'ass' | 'edl' | 'mlt' | 'editly' | 'ffmpeg' | 'json'

export type ExportFormat = {
  id: ExportId
  label: string
  ext: string
  mime: string
  group: 'Captions' | 'Timeline'
  tool: string
}

export const EXPORT_FORMATS: readonly ExportFormat[] = [
  { id: 'srt', label: 'SRT', ext: 'srt', mime: 'text/plain; charset=utf-8', group: 'Captions', tool: 'pysubs2 · libass' },
  { id: 'vtt', label: 'WebVTT', ext: 'vtt', mime: 'text/vtt; charset=utf-8', group: 'Captions', tool: 'HTML5 players · YouTube' },
  { id: 'ass', label: 'Styled ASS', ext: 'ass', mime: 'text/x-ssa; charset=utf-8', group: 'Captions', tool: 'libass · Kdenlive' },
  { id: 'edl', label: 'EDL', ext: 'edl', mime: 'text/plain; charset=utf-8', group: 'Timeline', tool: 'Kdenlive · Shotcut · Resolve' },
  { id: 'mlt', label: 'MLT project', ext: 'mlt', mime: 'application/xml; charset=utf-8', group: 'Timeline', tool: 'Shotcut · Kdenlive' },
  { id: 'editly', label: 'Editly JSON', ext: 'json', mime: 'application/json; charset=utf-8', group: 'Timeline', tool: 'Editly' },
  { id: 'ffmpeg', label: 'ffmpeg script', ext: 'sh', mime: 'text/x-shellscript; charset=utf-8', group: 'Timeline', tool: 'yt-dlp · ffmpeg' },
  { id: 'json', label: 'Clip JSON', ext: 'json', mime: 'application/json; charset=utf-8', group: 'Timeline', tool: 'OpenCut · your own app' },
]

const pad = (value: number, size = 2) => String(value).padStart(size, '0')

const clean = (value: string) => value.replace(/\s+/g, ' ').trim()

/** `3723.4` -> `01:02:03.400` (WebVTT). */
function vttStamp(seconds: number) {
  const ms = Math.max(0, Math.round(seconds * 1000))
  return `${pad(Math.floor(ms / 3600000))}:${pad(Math.floor(ms / 60000) % 60)}:${pad(Math.floor(ms / 1000) % 60)}.${pad(ms % 1000, 3)}`
}

/** `3723.4` -> `1:02:03.40` (ASS/SSA). */
function assStamp(seconds: number) {
  const cs = Math.max(0, Math.round(seconds * 100))
  return `${Math.floor(cs / 360000)}:${pad(Math.floor((cs % 360000) / 6000))}:${pad(Math.floor((cs % 6000) / 100))}.${pad(cs % 100)}`
}

/** Frames at 30 fps, the profile every export below declares. */
function timecode(seconds: number, fps = 30) {
  const total = Math.round(Math.max(0, seconds) * fps)
  const frames = total % fps
  const whole = Math.floor(total / fps)
  return `${pad(Math.floor(whole / 3600))}:${pad(Math.floor((whole % 3600) / 60))}:${pad(whole % 60)}:${pad(frames)}`
}

const xml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')

const shell = (value: string) => `'${value.replace(/'/g, `'\\''`)}'`

const assText = (value: string) => clean(value).replace(/[{}]/g, '').replace(/\\/g, '')

export function clipSlug(clip: Clip) {
  const slug = clip.title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/, '')
  return slug || 'clip'
}

export function exportFilename(clip: Clip, format: ExportId) {
  const meta = EXPORT_FORMATS.find((item) => item.id === format)
  // Editly and the clip JSON both end in .json; keep the two downloads apart.
  const suffix = format === 'editly' ? '-editly' : ''
  return `clipfarm-${clipSlug(clip)}-${clip.id.slice(0, 8)}${suffix}.${meta?.ext ?? 'txt'}`
}

function buildVtt(clip: Clip) {
  const lines = clip.cues.filter((cue) => clean(cue.text))
  const rows = lines.length ? lines : [{ start: clip.start, end: clip.start + 4, text: 'Clip from Clipfarm Studio' }]
  return ['WEBVTT', '', ...rows.map((cue) => `${vttStamp(cue.start - clip.start)} --> ${vttStamp(cue.end - clip.start)}\n${clean(cue.text)}`), ''].join('\n')
}

function buildAss(clip: Clip) {
  const header = [
    '[Script Info]',
    `Title: ${clean(clip.title)}`,
    'ScriptType: v4.00+',
    'WrapStyle: 0',
    'PlayResX: 1080',
    'PlayResY: 1920',
    'ScaledBorderAndShadow: yes',
    '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    'Style: Default,Inter Tight,72,&H00FFFFFF,&H000000FF,&H00120A06,&H80000000,-1,0,0,0,100,100,0,0,1,4,2,2,80,80,220,1',
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
  ]
  const cues = clip.cues.filter((cue) => clean(cue.text))
  const rows = cues.length ? cues : [{ start: clip.start, end: clip.start + 4, text: 'Clip from Clipfarm Studio' }]
  const events = rows.map((cue) => `Dialogue: 0,${assStamp(cue.start - clip.start)},${assStamp(cue.end - clip.start)},Default,,0,0,0,,${assText(cue.text)}`)
  return [...header, ...events, ''].join('\n')
}

function buildEdl(clip: Clip) {
  const duration = Math.max(0.1, clip.end - clip.start)
  return [
    `TITLE: ${clean(clip.title)}`,
    'FCM: NON-DROP FRAME',
    '',
    `001  AX       V     C        ${timecode(clip.start)} ${timecode(clip.end)} ${timecode(0)} ${timecode(duration)}`,
    `* FROM CLIP NAME: ${clean(clip.sourceTitle)}`,
    `* SOURCE FILE: ${clip.sourceUrl}`,
    `* CLIPFARM SCORE: ${clip.score}/100`,
    '',
  ].join('\n')
}

function buildMlt(clip: Clip) {
  const duration = Math.max(0.1, clip.end - clip.start)
  const out = Math.max(1, Math.round(duration * 30) - 1)
  return `<?xml version="1.0" standalone="no"?>
<mlt LC_NUMERIC="C" version="7.0.0" title="Clipfarm Studio" producer="tractor0">
  <profile description="Vertical 1080x1920 30 fps" width="1080" height="1920" progressive="1" sample_aspect_num="1" sample_aspect_den="1" display_aspect_num="9" display_aspect_den="16" frame_rate_num="30" frame_rate_den="1" colorspace="709"/>
  <producer id="producer0" in="${timecode(clip.start)}" out="${timecode(clip.end)}">
    <property name="resource">${xml(clip.sourceUrl)}</property>
    <property name="mlt_service">avformat</property>
    <property name="seekable">1</property>
    <property name="shotcut:caption">${xml(clip.title)}</property>
  </producer>
  <playlist id="playlist0">
    <property name="shotcut:video">1</property>
    <entry producer="producer0" in="${timecode(clip.start)}" out="${timecode(clip.end)}"/>
  </playlist>
  <tractor id="tractor0" in="00:00:00:00" out="${timecode(out / 30)}">
    <property name="shotcut:projectAudioChannels">2</property>
    <property name="shotcut:projectFolder">0</property>
    <track producer="playlist0"/>
  </tractor>
</mlt>
`
}

function buildEditly(clip: Clip) {
  const spec = {
    width: 1080,
    height: 1920,
    fps: 30,
    clips: [
      {
        duration: Math.max(0.1, Math.round((clip.end - clip.start) * 10) / 10),
        layers: [
          { type: 'video', path: clip.sourceUrl, cutFrom: clip.start, cutTo: clip.end },
          {
            type: 'title',
            text: clip.title,
            fontFamily: 'Inter Tight',
            fontSize: 56,
            color: '#ffffff',
            position: { x: 0.5, y: 0.86 },
          },
        ],
      },
    ],
  }
  return `${JSON.stringify(spec, null, 2)}\n`
}

function buildFfmpeg(clip: Clip) {
  const srt = exportFilename(clip, 'srt')
  const out = `clipfarm-${clipSlug(clip)}-${clip.id.slice(0, 8)}-vertical.mp4`
  const start = Math.max(0, Math.round(clip.start * 10) / 10)
  const end = Math.round(clip.end * 10) / 10
  return `#!/usr/bin/env bash
# Clipfarm Studio export — ${clean(clip.title)}
# Source: ${clip.sourceUrl}
# Cut: ${start}s to ${end}s (${Math.round(clip.end - clip.start)}s), score ${clip.score}/100.
# Needs: yt-dlp and ffmpeg (with libass) on your PATH, plus "${srt}" in this folder.
set -euo pipefail

SRC="clipfarm-source.mp4"
OUT="${out}"

if [ ! -f "$SRC" ]; then
  yt-dlp -f "bv*[height<=1080]+ba/b" --merge-output-format mp4 -o "$SRC" ${shell(clip.sourceUrl)}
fi

ffmpeg -y -ss ${start} -to ${end} -i "$SRC" \\
  -vf "crop=ih*9/16:ih,scale=1080:1920:flags=lanczos,subtitles=${srt}" \\
  -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart "$OUT"

echo "Wrote $OUT"
`
}

function buildJson(clip: Clip) {
  return `${JSON.stringify(
    {
      generator: 'Clipfarm Studio',
      clip: {
        id: clip.id,
        title: clip.title,
        source: { title: clip.sourceTitle, url: clip.sourceUrl, platform: clip.platform, externalId: clip.externalId, author: clip.sourceAuthor, thumbnail: clip.sourceThumbnail },
        cut: { start: clip.start, end: clip.end, duration: clip.duration },
        score: clip.score,
        excerpt: clip.excerpt,
        status: clip.status,
        cues: clip.cues,
      },
      exports: EXPORT_FORMATS.map((format) => ({ format: format.id, label: format.label, tool: format.tool, file: exportFilename(clip, format.id) })),
    },
    null,
    2,
  )}\n`
}

export function buildExport(clip: Clip, format: ExportId): string {
  switch (format) {
    case 'srt':
      return toSrt(clip.cues, clip.start)
    case 'vtt':
      return buildVtt(clip)
    case 'ass':
      return buildAss(clip)
    case 'edl':
      return buildEdl(clip)
    case 'mlt':
      return buildMlt(clip)
    case 'editly':
      return buildEditly(clip)
    case 'ffmpeg':
      return buildFfmpeg(clip)
    case 'json':
      return buildJson(clip)
  }
}
