import { Activity, ArrowUpRight, AudioLines, Bot, Captions, Clapperboard, Download, ScanFace, Scissors, Sparkles, Video } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { AgentConsole } from '../../components/AgentConsole'
import { AnalyzeForm } from '../../components/AnalyzeForm'
import { AppLoading, useRequireAuth } from '../../components/AuthGate'
import { Card } from '../../components/Card'
import { AutoClipper } from '../../components/AutoClipper'
import { ClipCutter } from '../../components/ClipCutter'
import { ClipExports } from '../../components/ClipExports'
import { controlBase, Notice } from '../../components/Field'
import { Tag } from '../../components/Pill'
import { cx } from '../../lib/cx'
import { loadClips } from '../../lib/clipData'
import { formatNumber } from '../../lib/format'
import { usePageTitle } from '../../lib/title'
import { useDashboard } from '../../lib/useDashboard'
import { formatStamp, type Clip } from '../../shared/clips'
import { EXPORT_FORMATS } from '../../shared/exports'
import { TOOLS } from '../../content'

type ToolGroup = 'Source' | 'Cut' | 'Track' | 'Words' | 'Sound' | 'Ship'

/** Which stage each tool in TOOLS belongs to on this bench. */
const STAGE_OF: Record<string, ToolGroup> = {
  'yt-dlp': 'Source',
  Mediabunny: 'Cut',
  Editly: 'Cut',
  'OpenCV (YuNet)': 'Track',
  'faster-whisper': 'Words',
  'whisper.cpp': 'Words',
  'Transformers.js': 'Words',
  libass: 'Words',
  FFmpeg: 'Sound',
  Shotcut: 'Ship',
  Kdenlive: 'Ship',
}

type Stage = {
  group: ToolGroup
  title: string
  blurb: string
  icon: typeof Video
  live: boolean
  status: string
}

/** The pipeline, with the real rows each stage produced for this workspace. */
export function StudioPage() {
  usePageTitle('Studio')
  const { ready } = useRequireAuth({ onboarded: true })
  const { data, error, load } = useDashboard(ready)
  const [clips, setClips] = useState<Clip[]>([])
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState('')

  const refresh = useCallback(async () => {
    const res = await loadClips()
    setLoading(false)
    if (res.ok) {
      setClips(res.clips)
      setActiveId((current) => current || res.clips[0]?.id || '')
    }
  }, [])

  useEffect(() => {
    if (!ready) return
    void refresh()
  }, [ready, refresh])

  const cues = useMemo(() => clips.reduce((total, clip) => total + clip.cues.length, 0), [clips])
  const active = clips.find((clip) => clip.id === activeId) ?? clips[0] ?? null

  if (!ready) return <AppLoading label="Loading your studio" rows={5} />

  const stages: Stage[] = [
    {
      group: 'Source',
      title: 'Source',
      blurb: 'Resolve the link and read its real title, duration, thumbnail and description.',
      icon: Video,
      live: true,
      status: data ? `${data.summary.sources} VOD${data.summary.sources === 1 ? '' : 's'} resolved` : 'Reading your workspace',
    },
    {
      group: 'Cut',
      title: 'Cut',
      blurb: 'Rank transcript windows or chapter markers and keep the strongest, non-overlapping moments.',
      icon: Scissors,
      live: true,
      status: data ? `${data.summary.clips} clip${data.summary.clips === 1 ? '' : 's'} cut${data.summary.avgScore === null ? '' : ` · avg ${data.summary.avgScore}/100`}` : 'Reading your workspace',
    },
    {
      group: 'Track',
      title: 'Track',
      blurb: 'Face tracking, punch-ins and frame interpolation for the vertical crop.',
      icon: ScanFace,
      live: false,
      status: 'Crop paths for the desktop worker',
    },
    {
      group: 'Words',
      title: 'Words',
      blurb: 'Transcribe a local VOD with Whisper tiny, turn the timed text into caption cues, then export SRT, WebVTT and styled ASS.',
      icon: Captions,
      live: true,
      status: `${formatNumber(cues)} caption cue${cues === 1 ? '' : 's'} parsed`,
    },
    {
      group: 'Sound',
      title: 'Sound',
      blurb: 'Noise removal, loudness matching and vocal/music stems.',
      icon: AudioLines,
      live: false,
      status: 'Source audio preserved for the desktop worker',
    },
    {
      group: 'Ship',
      title: 'Ship',
      blurb: 'Render the MP4 in the browser, or download caption files, an EDL or MLT project, an Editly spec or an ffmpeg script.',
      icon: Download,
      live: true,
      status: `${formatNumber(data?.summary.downloads ?? 0)} export${data?.summary.downloads === 1 ? '' : 's'} downloaded`,
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-[0.75rem] font-semibold tracking-[0.08em] text-muted uppercase">Studio</p>
          <h1 className="text-[2rem] leading-[1.05] font-semibold tracking-[-0.04em] sm:text-[2.5rem]">The pipeline behind every clip</h1>
          <p className="max-w-2xl text-[0.95rem] leading-relaxed text-body">
            Six stages, the open-source tool each one uses, and the rows it actually produced. Everything marked <b>Live</b> runs on this workspace right now, including the real MP4 cut in your browser; the desktop stages produce files you hand to an editor.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 self-start">
          <Link to="/local" className="inline-flex h-10 items-center gap-1.5 rounded-full bg-ink px-4 text-[0.85rem] font-semibold text-white hover:bg-ink-2">
            Local pipeline
            <ArrowUpRight aria-hidden className="size-4" />
          </Link>
          <Link to="/toolkit" className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line-strong bg-paper px-4 text-[0.85rem] font-semibold hover:border-ink">
            All 22 tools
            <ArrowUpRight aria-hidden className="size-4" />
          </Link>
        </div>
      </header>

      {error && <Notice>{error}</Notice>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stages.map((stage) => {
          const tools = TOOLS.filter((tool) => STAGE_OF[tool.name] === stage.group)
          return (
            <Card key={stage.group} className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span aria-hidden className="grid size-9 place-items-center rounded-full bg-sand text-accent-ink">
                    <stage.icon className="size-4.5" />
                  </span>
                  <h2 className="text-[1.1rem] font-semibold tracking-[-0.02em]">{stage.title}</h2>
                </div>
                <Tag tone={stage.live ? 'peach' : 'line'}>{stage.live ? 'Live' : 'Desktop'}</Tag>
              </div>
              <p className="text-[0.86rem] leading-relaxed text-body">{stage.blurb}</p>
              <p className={cx('rounded-[var(--radius-md)] px-3 py-2 text-[0.82rem] font-semibold', stage.live ? 'bg-success-soft text-success' : 'bg-sand text-ink-2')}>{stage.status}</p>
              <ul className="mt-auto flex flex-wrap gap-1.5">
                {tools.map((tool) => (
                  <li key={tool.name}>
                    <a
                      href={tool.href}
                      target="_blank"
                      rel="noreferrer noopener"
                      title={`${tool.name} — ${tool.does}`}
                      className="inline-flex h-7 items-center rounded-full border border-line px-2.5 text-[0.75rem] font-medium text-ink-2 hover:border-ink hover:text-ink"
                    >
                      {tool.name}
                    </a>
                  </li>
                ))}
              </ul>
            </Card>
          )
        })}
      </div>

      <Card className="flex flex-col gap-5">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-ink px-3 text-[0.7rem] font-bold tracking-[0.09em] text-white uppercase">
              <Sparkles aria-hidden className="size-3" /> Clipping desk
            </span>
            <span className="text-[0.76rem] font-medium text-muted">Whisper · scorer · MediaPipe BlazeFace · WebCodecs</span>
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="text-[1.35rem] leading-tight font-semibold tracking-[-0.03em] sm:text-[1.5rem]">From a VOD to post-ready vertical clips</h2>
            <p className="max-w-3xl text-[0.9rem] leading-relaxed text-muted">
              Drop a downloaded stream. The desk transcribes it on this device, ranks the strongest spoken moments, previews each cut with a live caption overlay,
              and renders real MP4s — face-aware framing, burned-in subtitles, one download or a zip.
            </p>
          </div>
          <ol className="grid gap-2 sm:grid-cols-3">
            {[
              ['Transcribe', 'Whisper tiny reads the audio in 30-second slices'],
              ['Rank', 'The scorer picks up to eight non-overlapping moments'],
              ['Render', '9:16, 1:1 or 16:9 MP4 with captions burned in'],
            ].map(([title, blurb], index) => (
              <li key={title} className="flex items-start gap-2.5 rounded-[var(--radius-md)] bg-sand px-3 py-2.5">
                <span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-full bg-ink text-[0.72rem] font-bold text-white tabular-nums">
                  {index + 1}
                </span>
                <span className="flex flex-col">
                  <span className="text-[0.82rem] font-semibold">{title}</span>
                  <span className="text-[0.74rem] leading-snug text-muted">{blurb}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
        <AutoClipper />
      </Card>

      <Card className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-[1.25rem] font-semibold tracking-[-0.025em]">Export bench</h2>
          <p className="text-[0.88rem] leading-relaxed text-muted">
            Every file is generated from this clip’s real start and end and its caption cues — no placeholders. The desktop tools open the project files; the ffmpeg script cuts and crops the source.
          </p>
        </div>

        {loading ? (
          <p className="text-[0.9rem] text-muted">Loading clips…</p>
        ) : active ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] bg-sand p-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <label htmlFor="export-clip" className="text-[0.8rem] font-semibold text-ink-2">
                  Clip
                </label>
                <select id="export-clip" value={active.id} onChange={(event) => setActiveId(event.target.value)} className={cx(controlBase, 'h-11 border-line-strong')}>
                  {clips.map((clip) => (
                    <option key={clip.id} value={clip.id}>
                      {clip.title} · {formatStamp(clip.start)}–{formatStamp(clip.end)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap gap-2 text-[0.78rem] text-muted">
                <span className="inline-flex h-8 items-center rounded-full bg-paper px-3 font-semibold text-ink-2">{active.platform}</span>
                <span className="inline-flex h-8 items-center rounded-full bg-paper px-3 font-semibold text-ink-2 tabular-nums">{Math.round(active.end - active.start)}s</span>
                <span className="inline-flex h-8 items-center rounded-full bg-paper px-3 font-semibold text-ink-2">Score {active.score}</span>
                <span className="inline-flex h-8 items-center rounded-full bg-paper px-3 font-semibold text-ink-2">{active.cues.length} cues</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {(['Captions', 'Timeline'] as const).map((group) => (
                <div key={group} className="flex flex-col gap-2">
                  <p className="text-[0.72rem] font-semibold tracking-[0.1em] text-muted uppercase">{group}</p>
                  <ClipExports clipId={active.id} captionOnly={group === 'Captions'} />
                </div>
              ))}
            </div>

            <p className="text-[0.8rem] leading-relaxed text-muted">
              {EXPORT_FORMATS.length} formats per clip. Caption files land in the same folder as the ffmpeg script; the EDL and MLT open the source at the cut in your editor of choice.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 rounded-[var(--radius-lg)] bg-sand p-5">
            <div className="flex items-start gap-3">
              <span aria-hidden className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-full bg-white/70 text-accent-ink">
                <Clapperboard className="size-5" />
              </span>
              <div>
                <h3 className="text-[1.05rem] font-semibold">No clips to export yet</h3>
                <p className="mt-1 max-w-xl text-[0.88rem] text-body">Paste a YouTube or Twitch link. The detector writes the clips, then this bench hands them to your editor.</p>
              </div>
            </div>
            <AnalyzeForm
              compact
              onAnalyzed={() => {
                void refresh()
                void load()
              }}
            />
          </div>
        )}
      </Card>

      {active ? (
        <>
          <Card className="flex flex-col gap-5">
            <div className="flex items-start gap-3">
              <span aria-hidden className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-sand text-accent-ink">
                <Bot className="size-4.5" />
              </span>
              <div>
                <h2 className="text-[1.25rem] font-semibold tracking-[-0.025em]">Agent console</h2>
                <p className="text-[0.88rem] leading-relaxed text-muted">
                  Four agents run on <b>{active.title}</b> right now. They read the stored cut, the cues and the export bundle — plain code, no model, no invented numbers.
                </p>
              </div>
            </div>
            <AgentConsole clip={active} />
          </Card>

          <Card className="flex flex-col gap-5">
            <div className="flex items-start gap-3">
              <span aria-hidden className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-sand text-accent-ink">
                <Scissors className="size-4.5" />
              </span>
              <div>
                <h2 className="text-[1.25rem] font-semibold tracking-[-0.025em]">Cut the real file</h2>
                <p className="text-[0.88rem] leading-relaxed text-muted">
                  Already have the VOD (for example from the ffmpeg script)? Pick it here and MediaBunny trims {formatStamp(active.start)}–{formatStamp(active.end)} into an MP4 on this device. Nothing is uploaded.
                </p>
              </div>
            </div>
            <ClipCutter clip={active} />
          </Card>
        </>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 text-[0.78rem] text-muted">
        <Activity aria-hidden className="size-3.5" />
        Transcription, ranking, previews, face framing, burned captions and every MP4 render run in this tab (MediaBunny + WebCodecs + Whisper tiny + MediaPipe
        BlazeFace). Audio stems still need the desktop worker; the ffmpeg script and editor projects cover that hand-off.
      </div>
    </div>
  )
}
