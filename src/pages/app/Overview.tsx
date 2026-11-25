import {
  ArrowUpRight,
  BarChart3,
  Clock3,
  Download,
  Eye,
  FolderOpen,
  Plus,
  Scissors,
  ShieldCheck,
  Trash2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router'

import { AnalyzeForm } from '../../components/AnalyzeForm'
import { AppLoading, useRequireAuth } from '../../components/AuthGate'
import { ButtonLink } from '../../components/Button'
import { Card } from '../../components/Card'
import { Notice } from '../../components/Field'
import { Tag } from '../../components/Pill'
import { Segmented } from '../../components/Segmented'
import { useToast } from '../../components/Toast'
import { deleteClip, exportHref } from '../../lib/clipData'
import { cx } from '../../lib/cx'
import { formatAgo, formatDayShort, formatNumber } from '../../lib/format'
import { usePageTitle } from '../../lib/title'
import { useDashboard } from '../../lib/useDashboard'
import { planById } from '../../shared/account'
import type { DashboardClip, TrendPoint } from '../../shared/dashboard'

type Range = '7' | '30' | '90'

const RANGES: Array<{ value: Range; label: string }> = [
  { value: '7', label: '7d' },
  { value: '30', label: '30d' },
  { value: '90', label: '90d' },
]

const CLIP_STATUS: Record<string, { label: string; className: string }> = {
  ready: { label: 'Ready', className: 'bg-success-soft text-success' },
  posted: { label: 'Published', className: 'bg-peach text-accent-ink' },
  archived: { label: 'Archived', className: 'bg-ink/8 text-ink-2' },
  processing: { label: 'Processing', className: 'bg-sand text-accent-ink' },
}

function delta(current: number, previous: number) {
  if (!previous) return current > 0 ? 'First activity this week' : 'Nothing yet'
  const change = Math.round(((current - previous) / previous) * 100)
  return `${change >= 0 ? '+' : ''}${change}% vs last week`
}

function Stat({ label, value, unit, sub, icon, tone = 'sand' }: { label: string; value: string; unit?: string; sub: string; icon: ReactNode; tone?: 'sand' | 'success' }) {
  return (
    <Card className="group flex flex-col gap-4 p-5 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[var(--shadow-raise)] sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[0.8rem] font-semibold text-muted">{label}</span>
        <span aria-hidden className={cx('grid size-8 place-items-center rounded-full', tone === 'success' ? 'bg-success-soft text-success' : 'bg-sand text-accent-ink')}>
          {icon}
        </span>
      </div>
      <p className="flex items-baseline gap-1.5">
        <span className="text-[2rem] leading-none font-semibold tracking-[-0.045em] tabular-nums whitespace-nowrap">{value}</span>
        {unit && <span className="text-[0.85rem] font-semibold text-muted">{unit}</span>}
      </p>
      <p className="text-[0.8rem] leading-snug text-muted">{sub}</p>
    </Card>
  )
}

function ViewsChart({ series, range }: { series: TrendPoint[]; range: number }) {
  const W = 800
  const H = 220
  const PAD = 8
  const values = series.map((point) => point.views)
  const max = Math.max(1, ...values)
  const empty = values.every((value) => value === 0)
  const step = series.length > 1 ? (W - PAD * 2) / (series.length - 1) : 0
  const points = series.map((point, index) => ({
    x: PAD + index * step,
    y: H - PAD - (point.views / max) * (H - PAD * 2),
  }))
  const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ')
  const area = points.length ? `${line} L ${points[points.length - 1].x.toFixed(1)} ${H - PAD} L ${points[0].x.toFixed(1)} ${H - PAD} Z` : ''
  const ticks = Array.from(new Set([0, 0.2, 0.4, 0.6, 0.8, 1].map((fraction) => Math.round((series.length - 1) * fraction)).filter((index) => index >= 0)))

  return (
    <div>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-[220px] w-full" role="img" aria-label={`Clip-page views per day for the last ${range} days`}>
          <defs>
            <linearGradient id="dashboard-view-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.38" />
              <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75, 1].map((fraction) => (
            <line key={fraction} x1="0" x2={W} y1={H * fraction} y2={H * fraction} stroke="var(--color-line)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          ))}
          {area && <path d={area} fill="url(#dashboard-view-fill)" />}
          {line && <path d={line} fill="none" stroke="var(--color-ink)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
          {points.length > 0 && <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="4" fill="var(--color-accent)" stroke="var(--color-paper)" strokeWidth="2" vectorEffect="non-scaling-stroke" />}
        </svg>
        {empty && (
          <p className="absolute inset-0 grid place-items-center px-4 text-center text-[0.9rem] font-medium text-muted">
            No clip-page views in this range yet — publish a clip to start the graph.
          </p>
        )}
      </div>
      <div className="mt-3 flex justify-between text-[0.72rem] font-medium text-muted">
        {ticks.map((index) => (
          <span key={series[index]?.date ?? index}>{series[index] ? formatDayShort(series[index].date) : ''}</span>
        ))}
      </div>
      <table className="sr-only">
        <caption>Clip-page views per day for the last {range} days</caption>
        <tbody>
          {series.map((point) => (
            <tr key={point.date}>
              <th scope="row">{point.date}</th>
              <td>{point.views}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ClipCard({ clip, onChanged }: { clip: DashboardClip; onChanged: () => void }) {
  const toast = useToast()
  const [deleting, setDeleting] = useState(false)
  const status = CLIP_STATUS[clip.status] ?? CLIP_STATUS.processing

  async function remove() {
    if (!window.confirm(`Delete “${clip.title}”? This cannot be undone.`)) return
    setDeleting(true)
    const res = await deleteClip(clip.id)
    setDeleting(false)
    if (!res.ok) {
      toast(res.error)
      return
    }
    toast('Clip deleted')
    onChanged()
  }

  return (
    <article className="group flex min-w-0 flex-col overflow-hidden rounded-[var(--radius-lg)] border border-line bg-paper shadow-[var(--shadow-card)] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[var(--shadow-raise)]">
      <Link to={`/clip/${clip.id}`} className="relative block aspect-video overflow-hidden bg-ink/8" aria-label={`Open ${clip.title}`}>
        {clip.sourceThumbnail ? (
          <img src={clip.sourceThumbnail} alt="" loading="lazy" className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
        ) : (
          <span className="grid size-full place-items-center text-muted">
            <Scissors aria-hidden className="size-6" />
          </span>
        )}
        <span className="absolute inset-0 bg-gradient-to-t from-ink/35 via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
        <span className={cx('absolute top-2.5 left-2.5 inline-flex h-6 items-center rounded-full px-2 text-[0.7rem] font-semibold shadow-sm', status.className)}>{status.label}</span>
        <span className="absolute right-2.5 bottom-2.5 rounded-full bg-ink/85 px-2 py-0.5 text-[0.68rem] font-semibold text-white tabular-nums">
          {Math.round(clip.end - clip.start)}s
        </span>
        <span className="absolute inset-x-3 bottom-3 hidden items-center gap-1 text-[0.8rem] font-semibold text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 sm:flex">
          Open clip <ArrowUpRight aria-hidden className="size-3.5" />
        </span>
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <Link to={`/clip/${clip.id}`} className="line-clamp-2 text-[0.95rem] leading-snug font-semibold underline-offset-4 hover:underline">
            {clip.title}
          </Link>
          <span className="inline-flex h-6 shrink-0 items-center rounded-full bg-sand px-2 text-[0.7rem] font-semibold text-accent-ink tabular-nums" title={`Hook score ${clip.score}/100`}>
            {clip.score}
          </span>
        </div>
        <p className="text-[0.76rem] text-muted">
          {clip.platform} · {formatDayShort(clip.createdAt.slice(0, 10))} · {formatAgo(clip.createdAt)}
        </p>
        <div className="mt-auto flex items-center gap-1 border-t border-line pt-2.5">
          <Link to={`/clip/${clip.id}`} className="inline-flex h-8 items-center gap-1 rounded-full bg-ink px-3 text-[0.76rem] font-semibold text-white hover:bg-ink-2">
            Open
            <ArrowUpRight aria-hidden className="size-3.5" />
          </Link>
          <a
            href={exportHref(clip.id, 'srt')}
            aria-label={`Download SRT captions for ${clip.title}`}
            title="Download SRT captions"
            className="round inline-grid size-8 place-items-center rounded-full bg-ink/5 text-ink transition-colors hover:bg-ink/10"
          >
            <Download aria-hidden className="size-4" />
          </a>
          <button
            type="button"
            aria-label={`Delete ${clip.title}`}
            title="Delete clip"
            disabled={deleting}
            onClick={() => void remove()}
            className="round ml-auto inline-grid size-8 place-items-center rounded-full text-muted transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-40"
          >
            <Trash2 aria-hidden className="size-4" />
          </button>
        </div>
      </div>
    </article>
  )
}

function Skeleton() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-busy="true" aria-label="Loading dashboard">
      <div className="flex flex-col gap-2">
        <span className="h-4 w-24 animate-pulse rounded-full bg-ink/6" />
        <span className="h-10 w-72 animate-pulse rounded-full bg-ink/6" />
        <span className="h-4 w-96 max-w-full animate-pulse rounded-full bg-ink/6" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <span key={index} className="h-36 animate-pulse rounded-[var(--radius-lg)] bg-ink/6" />
        ))}
      </div>
      <span className="h-[340px] animate-pulse rounded-[var(--radius-lg)] bg-ink/6" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <span key={index} className="h-72 animate-pulse rounded-[var(--radius-lg)] bg-ink/6" />
        ))}
      </div>
    </div>
  )
}

export function Overview() {
  usePageTitle('Overview')
  const { user, ready } = useRequireAuth({ onboarded: true })
  const { data, error, load } = useDashboard(ready)
  const [range, setRange] = useState<Range>('30')

  const series = useMemo(() => (data ? data.series.slice(-Number(range)) : []), [data, range])
  const rangeViews = useMemo(() => series.reduce((total, point) => total + point.views, 0), [series])
  const rangeClips = useMemo(() => series.reduce((total, point) => total + point.clips, 0), [series])

  if (!ready || !user) return <AppLoading label="Loading your dashboard" rows={4} />
  if (!data) {
    return error ? <Notice>{error}</Notice> : <Skeleton />
  }

  const plan = planById(user.planId)
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const first = user.name.split(' ')[0]
  const pct = data.usage.limit ? Math.min(100, Math.round((data.usage.used / data.usage.limit) * 100)) : 0
  const renews = data.usage.renewsAt ? new Date(data.usage.renewsAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : null
  const growth = data.summary.prevWeekViews ? Math.round(((data.summary.weekViews - data.summary.prevWeekViews) / data.summary.prevWeekViews) * 100) : null
  const growthValue = growth === null ? (data.summary.weekViews > 0 ? 'New' : '—') : `${growth > 0 ? '+' : ''}${growth}%`
  const rangeLabel = `${range} days`

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-[0.75rem] font-semibold tracking-[0.08em] text-muted uppercase">Dashboard</p>
          <h1 className="text-[2rem] leading-[1.05] font-semibold tracking-[-0.04em] sm:text-[2.6rem]">
            {greeting}, {first}.
          </h1>
          <p className="text-[0.95rem] text-body">
            {user.channel ?? 'Your channel'} · {plan?.name ?? 'No plan'} · {data.summary.clips} clip{data.summary.clips === 1 ? '' : 's'} from {data.summary.sources} VOD{data.summary.sources === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {user.role === 'admin' && <Tag tone="ink">Admin</Tag>}
          <ButtonLink to="/dashboard/sources" icon={<Plus aria-hidden className="size-4" strokeWidth={2.6} />}>
            Analyze a VOD
          </ButtonLink>
        </div>
      </header>

      {error && <Notice>{error}</Notice>}

      <section aria-labelledby="analytics-heading" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="analytics-heading" className="text-[1.2rem] font-semibold tracking-[-0.025em]">Analytics overview</h2>
            <p className="text-[0.85rem] text-muted">Your workspace at a glance, read from real clip and view rows.</p>
          </div>
          <Segmented<Range> label="Chart time range" value={range} onChange={setRange} options={RANGES} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Total views" value={formatNumber(data.summary.views)} sub={`${formatNumber(data.summary.weekViews)} views in the last 7 days`} icon={<Eye className="size-4" />} />
          <Stat label="Total clips" value={formatNumber(data.summary.clips)} sub={`${formatNumber(data.summary.weekClips)} clipped this week`} icon={<Scissors className="size-4" />} />
          <Stat
            label="Watch time"
            value={formatNumber(data.summary.minutes)}
            unit="min"
            sub={`Across ${data.summary.clips} clip${data.summary.clips === 1 ? '' : 's'} · avg score ${data.summary.avgScore ?? '—'}`}
            icon={<Clock3 className="size-4" />}
          />
          <Stat
            label="Growth"
            value={growthValue}
            sub={growth === null ? (data.summary.weekViews > 0 ? 'First tracked views this week' : 'Not enough view history yet') : delta(data.summary.weekViews, data.summary.prevWeekViews)}
            icon={growth !== null && growth < 0 ? <TrendingDown className="size-4" /> : <TrendingUp className="size-4" />}
            tone={growth !== null && growth >= 0 ? 'success' : 'sand'}
          />
        </div>

        <Card className="flex flex-col gap-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 aria-hidden className="size-4 text-accent-ink" />
                <h3 className="text-[1.05rem] font-semibold tracking-[-0.02em]">Views over time</h3>
              </div>
              <p className="mt-1 text-[0.84rem] text-muted">
                {formatNumber(rangeViews)} clip-page view{rangeViews === 1 ? '' : 's'} in the last {rangeLabel} · {rangeClips} clip{rangeClips === 1 ? '' : 's'} cut
              </p>
            </div>
            <span className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-full bg-sand px-2.5 py-1 text-[0.72rem] font-semibold text-muted">
              <Eye aria-hidden className="size-3" /> Daily views
            </span>
          </div>
          <ViewsChart series={series} range={Number(range)} />
          <p className="text-[0.78rem] text-muted">The chart updates from clip-page events. Published clips start recording views after their first visit.</p>
        </Card>
      </section>

      <section aria-labelledby="clips-heading" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="clips-heading" className="text-[1.2rem] font-semibold tracking-[-0.025em]">Your clips</h2>
            <p className="text-[0.85rem] text-muted">The latest cuts in your workspace.</p>
          </div>
          <Link to="/dashboard/clips" className="inline-flex h-9 items-center gap-1 rounded-full px-3 text-[0.85rem] font-semibold text-ink hover:bg-ink/5">
            View all
            <ArrowUpRight aria-hidden className="size-4" />
          </Link>
        </div>

        {data.clips.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.clips.map((clip) => (
              <ClipCard key={clip.id} clip={clip} onChanged={load} />
            ))}
          </div>
        ) : (
          <Card className="flex flex-col items-center gap-3 border-dashed px-6 py-12 text-center">
            <span aria-hidden className="grid size-12 place-items-center rounded-full bg-peach text-accent-ink">
              <FolderOpen className="size-5" />
            </span>
            <h3 className="text-[1.15rem] font-semibold">No clips yet</h3>
            <p className="max-w-md text-[0.9rem] leading-relaxed text-body">Paste a YouTube or Twitch link and Clipfarm will find the moments worth posting. Your first clip will appear here with its score, source and quick actions.</p>
            <ButtonLink to="/dashboard/sources" className="mt-1" icon={<Plus aria-hidden className="size-4" strokeWidth={2.6} />}>
              Analyze your first VOD
            </ButtonLink>
          </Card>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="flex flex-col gap-5">
          <Card className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-[1.15rem] font-semibold tracking-[-0.02em]">Activity</h2>
                <p className="text-[0.82rem] text-muted">What the pipeline has done recently.</p>
              </div>
              <Clock3 aria-hidden className="size-4 text-muted" />
            </div>
            {data.activity.length ? (
              <ol className="flex flex-col gap-3.5">
                {data.activity.map((item) => (
                  <li key={item.id} className="flex items-start gap-2.5">
                    <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" />
                    <div className="flex flex-col">
                      <span className="text-[0.88rem] leading-snug">{item.text}</span>
                      <span className="text-[0.75rem] text-muted">{formatAgo(item.at)}</span>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-[0.88rem] text-muted">Activity shows up after your first analysis.</p>
            )}
          </Card>

          <Card className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-[1.15rem] font-semibold tracking-[-0.02em]">Sources</h2>
                <p className="text-[0.82rem] text-muted">The VODs behind your clips.</p>
              </div>
              <Link to="/dashboard/sources" className="text-[0.85rem] font-semibold text-accent-ink underline decoration-2 underline-offset-4">
                Manage
              </Link>
            </div>
            {data.sources.length ? (
              <ul className="flex flex-col divide-y divide-line">
                {data.sources.map((source) => (
                  <li key={source.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <span className="aspect-video w-16 shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-ink/8">
                      {source.thumbnail && <img src={source.thumbnail} alt="" loading="lazy" className="size-full object-cover" />}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[0.9rem] font-semibold">{source.title}</span>
                      <span className="text-[0.78rem] text-muted">
                        {source.platform} · {source.method === 'chapters' ? 'chapter markers' : source.method === 'transcript' ? 'transcript' : 'no signal yet'}
                      </span>
                    </span>
                    <span className={cx('inline-flex h-7 shrink-0 items-center rounded-full px-2.5 text-[0.75rem] font-semibold', source.status === 'ready' ? 'bg-success-soft text-success' : source.status === 'failed' ? 'bg-danger-soft text-danger' : 'bg-peach text-accent-ink')}>
                      {source.status === 'ready' ? `${source.clips} clips` : source.status === 'failed' ? 'Failed' : 'Needs transcript'}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[0.88rem] text-muted">No VODs analyzed yet. Start with a link above.</p>
            )}
          </Card>

          <Card className="flex flex-col gap-4">
            <div>
              <h2 className="text-[1.15rem] font-semibold tracking-[-0.02em]">New analysis</h2>
              <p className="text-[0.85rem] text-muted">Paste a link, get clips.</p>
            </div>
            <AnalyzeForm compact onAnalyzed={load} />
          </Card>
        </div>

        <div className="flex flex-col gap-5">
          <Card tone="ink" className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[0.78rem] font-semibold text-white/60">Clips this month</p>
                <h2 className="text-[1.4rem] font-semibold tracking-[-0.03em]">{data.usage.planName ?? 'Free'}</h2>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-[0.78rem] font-semibold">
                {data.usage.used} / {data.usage.limit || '—'}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Clips used this month">
              <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-[0.82rem] text-white/65">
              {`${renews ? `Renews ${renews}. ` : ''}${data.usage.limit} clips a month${plan ? '.' : ' on the Free plan.'}`}
            </p>
            <div className="mt-auto flex flex-col gap-2">
              <ButtonLink to="/plans" variant="light" className="w-full">
                {plan ? 'Change plan' : 'See plans'}
              </ButtonLink>
              <Link to="/dashboard/settings" className="inline-flex h-10 items-center justify-center rounded-full text-[0.88rem] font-semibold text-white/80 hover:text-white">
                Clip settings
              </Link>
            </div>
          </Card>

          <Card className="flex flex-col gap-3">
            <h2 className="text-[1.05rem] font-semibold tracking-[-0.02em]">Your setup</h2>
            <dl className="grid gap-2 text-[0.88rem]">
              {[
                ['Channel', user.channel ?? 'Not set'],
                ['Platform', user.platform ?? 'Not set'],
                ['Caption style', user.captionStyle ?? 'Not set'],
                ['Cadence', user.cadence ?? 'Not set'],
                ['Avg hook score', data.summary.avgScore === null ? '—' : `${data.summary.avgScore}/100`],
              ].map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted">{label}</dt>
                  <dd className="text-right font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
            <Link to="/onboarding" className="inline-flex items-center gap-1 text-[0.85rem] font-semibold text-accent-ink underline decoration-2 underline-offset-4">
              Edit clip settings
              <ArrowUpRight aria-hidden className="size-3.5" />
            </Link>
          </Card>

          <Card tone="peach" className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span aria-hidden className="grid size-9 place-items-center rounded-[10px] bg-ink text-[0.7rem] font-black tracking-[-0.04em] text-white">VI</span>
              <div>
                <p className="text-[0.72rem] font-semibold tracking-[0.1em] text-accent-ink uppercase">Launch week</p>
                <h2 className="text-[1.05rem] font-semibold tracking-[-0.02em]">GTA VI is out</h2>
              </div>
            </div>
            <p className="text-[0.88rem] leading-relaxed text-accent-ink/90">Leonida is live. Paste a GTA VI VOD and the detector picks up chases, heists and reactions first.</p>
            <Link to="/gta-6" className="inline-flex items-center gap-1 self-start text-[0.85rem] font-semibold text-accent-ink underline decoration-2 underline-offset-4">
              Open the GTA VI hub
              <ArrowUpRight aria-hidden className="size-3.5" />
            </Link>
          </Card>
        </div>
      </div>

      {data.admin && (
        <Card className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span aria-hidden className="grid size-9 place-items-center rounded-full bg-peach text-accent-ink">
                <ShieldCheck className="size-4.5" />
              </span>
              <h2 className="text-[1.1rem] font-semibold tracking-[-0.02em]">Studio overview</h2>
            </div>
            <Tag tone="ink">Admin</Tag>
          </div>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ['Accounts', formatNumber(data.admin.accounts)],
              ['Paid (verified)', formatNumber(data.admin.paidAccounts)],
              ['Clips', formatNumber(data.admin.clips)],
              ['VODs', formatNumber(data.admin.sources)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[var(--radius-md)] bg-sand p-3">
                <dt className="text-[0.72rem] font-semibold text-muted uppercase">{label}</dt>
                <dd className="text-[1.1rem] font-semibold tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="text-[0.82rem] text-muted">
            MRR from verified payments <b className="font-semibold text-ink tabular-nums">${formatNumber(data.admin.mrr)}</b>
          </p>
          {data.admin.unverifiedPlans.length > 0 && (
            <div className="rounded-[var(--radius-md)] border border-line bg-sand p-3.5">
              <h3 className="text-[0.9rem] font-semibold">Plans picked without payment ({data.admin.unverifiedPlans.length})</h3>
              <p className="mt-1 text-[0.78rem] leading-relaxed text-muted">
                These accounts chose a paid plan before checkout existed. They are treated as Free and are not revenue. At list price they would be $
                {formatNumber(data.admin.unverifiedPlans.reduce((total, row) => total + row.monthly, 0))} a month.
              </p>
              <ul className="mt-2 flex flex-col divide-y divide-line">
                {data.admin.unverifiedPlans.map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-[0.85rem] font-semibold">{row.name}</span>
                      <span className="truncate text-[0.72rem] text-muted">
                        {row.email}
                        {row.selectedAt ? ` · picked ${new Date(row.selectedAt).toLocaleDateString()}` : ''}
                      </span>
                    </span>
                    <Tag>{`${row.plan} · ${row.billing} · not paid`}</Tag>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <ul className="flex flex-col divide-y divide-line">
            {data.admin.recent.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 py-2">
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-[0.85rem] font-semibold">{row.name}</span>
                  <span className="truncate text-[0.72rem] text-muted">{row.email}</span>
                </span>
                <Tag>{row.plan ?? (row.requestedPlan ? `Free (picked ${row.requestedPlan})` : 'Free')}</Tag>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <p className="flex items-center gap-2 text-[0.78rem] text-muted">
        <Download aria-hidden className="size-3.5" />
        Every number above is read from your D1 rows: sources you submitted, clips the detector cut, and views recorded on clip pages.
      </p>
    </div>
  )
}
