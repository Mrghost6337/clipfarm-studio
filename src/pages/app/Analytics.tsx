import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { AppLoading, useRequireAuth } from '../../components/AuthGate'
import { Card } from '../../components/Card'
import { Notice } from '../../components/Field'
import { ScorePill } from '../../components/ClipList'
import { Segmented } from '../../components/Segmented'
import { Tag } from '../../components/Pill'
import { loadClips } from '../../lib/clipData'
import { formatAgo, formatDayShort, formatNumber } from '../../lib/format'
import { usePageTitle } from '../../lib/title'
import { useDashboard } from '../../lib/useDashboard'
import { formatStamp, type Clip } from '../../shared/clips'

type Range = '7' | '14' | '30'

export function Analytics() {
  usePageTitle('Analytics')
  const { ready } = useRequireAuth({ onboarded: true, plan: true })
  const { data, error } = useDashboard(ready)
  const [clips, setClips] = useState<Clip[]>([])
  const [range, setRange] = useState<Range>('30')

  const load = useCallback(async () => {
    const res = await loadClips()
    if (res.ok) setClips(res.clips)
  }, [])

  useEffect(() => {
    if (ready) void load()
  }, [ready, load])

  const series = useMemo(() => data?.series.slice(-Number(range)) ?? [], [data, range])
  const inRange = useMemo(() => clips.filter((clip) => series.some((point) => point.date === clip.createdAt.slice(0, 10))), [clips, series])
  const viewsInRange = series.reduce((total, point) => total + point.views, 0)
  const maxClips = Math.max(1, ...series.map((point) => point.clips))
  const top = useMemo(() => [...clips].sort((a, b) => b.views - a.views || b.score - a.score).slice(0, 8), [clips])
  const counts = useMemo(() => ({ ready: clips.filter((clip) => clip.status === 'ready').length, posted: clips.filter((clip) => clip.status === 'posted').length, archived: clips.filter((clip) => clip.status === 'archived').length }), [clips])
  const bands = useMemo(
    () => [
      { label: '85–100', value: clips.filter((clip) => clip.score >= 85).length },
      { label: '70–84', value: clips.filter((clip) => clip.score >= 70 && clip.score < 85).length },
      { label: '50–69', value: clips.filter((clip) => clip.score >= 50 && clip.score < 70).length },
      { label: 'Under 50', value: clips.filter((clip) => clip.score < 50).length },
    ],
    [clips],
  )

  if (!ready) return <AppLoading label="Loading analytics" rows={4} />
  if (!data) return error ? <Notice>{error}</Notice> : <AppLoading label="Loading analytics" rows={4} />

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[0.75rem] font-semibold tracking-[0.08em] text-muted uppercase">Analytics</p>
          <h1 className="text-[2rem] leading-[1.05] font-semibold tracking-[-0.04em] sm:text-[2.5rem]">What the pipeline produced</h1>
          <p className="mt-1 text-[0.95rem] text-body">Counts of clips actually cut, and views recorded when someone opens a clip page.</p>
        </div>
        <Segmented<Range>
          label="Date range"
          value={range}
          onChange={setRange}
          options={[
            { value: '7', label: '7 days' },
            { value: '14', label: '14 days' },
            { value: '30', label: '30 days' },
          ]}
        />
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Clips cut', formatNumber(inRange.length), `in the last ${range} days`],
          ['Clip-page views', formatNumber(viewsInRange), `${data.summary.downloads} caption downloads`],
          ['Average hook score', data.summary.avgScore === null ? '—' : `${data.summary.avgScore}/100`, 'across all clips'],
          ['Minutes clipped', formatNumber(data.summary.minutes), `${data.summary.clips} clips total`],
        ].map(([label, value, sub]) => (
          <Card key={label} className="flex flex-col gap-2 p-5 sm:p-6">
            <span className="text-[0.82rem] font-semibold text-muted">{label}</span>
            <span className="text-[2rem] leading-none font-semibold tracking-[-0.045em] tabular-nums">{value}</span>
            <span className="text-[0.8rem] text-muted">{sub}</span>
          </Card>
        ))}
      </div>

      <Card className="flex flex-col gap-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[1.2rem] font-semibold tracking-[-0.025em]">Clips per day</h2>
          <span className="text-[0.8rem] text-muted">Peak {maxClips}/day</span>
        </div>
        <div>
          <svg viewBox="0 0 720 170" preserveAspectRatio="none" className="h-[170px] w-full" role="img" aria-label={`Clips per day for the last ${range} days`}>
            {[0.25, 0.5, 0.75].map((line) => (
              <line key={line} x1="0" x2="720" y1={170 * line} y2={170 * line} stroke="var(--color-line)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            ))}
            {series.map((point, index) => {
              const width = 720 / Math.max(1, series.length)
              const height = point.clips === 0 ? 0 : Math.max(4, (point.clips / maxClips) * 150)
              return <rect key={point.date} x={index * width + width * 0.2} y={170 - height} width={width * 0.6} height={height} rx={3} fill={point.clips ? 'var(--color-accent)' : 'transparent'} />
            })}
          </svg>
          <div className="mt-2 flex justify-between text-[0.72rem] text-muted">
            {series
              .filter((_, index) => index % Math.ceil(series.length / 6) === 0)
              .map((point) => (
                <span key={point.date}>{formatDayShort(point.date)}</span>
              ))}
          </div>
        </div>
        {clips.length === 0 && <p className="text-[0.88rem] text-muted">No clips yet — the graph fills in as you analyze VODs.</p>}
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="flex flex-col gap-4">
          <h2 className="text-[1.2rem] font-semibold tracking-[-0.025em]">Where clips came from</h2>
          <ul className="flex flex-col gap-4">
            {data.platforms.map((platform) => {
              const share = clips.length ? Math.round((platform.clips / clips.length) * 100) : 0
              return (
                <li key={platform.name} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between text-[0.9rem]">
                    <span className="font-semibold">{platform.name}</span>
                    <span className="text-muted tabular-nums">
                      {platform.clips} clip{platform.clips === 1 ? '' : 's'} · {platform.sources} source{platform.sources === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-ink/8">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${share}%` }} />
                  </div>
                </li>
              )
            })}
          </ul>
          <div className="mt-auto grid grid-cols-3 gap-2 border-t border-line pt-4">
            {[
              ['Ready', counts.ready],
              ['Posted', counts.posted],
              ['Archived', counts.archived],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[var(--radius-md)] bg-sand p-3">
                <p className="text-[0.72rem] font-semibold text-muted uppercase">{label}</p>
                <p className="text-[1.05rem] font-semibold tabular-nums">{value}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="flex flex-col gap-4">
          <h2 className="text-[1.2rem] font-semibold tracking-[-0.025em]">Hook score bands</h2>
          <p className="text-[0.85rem] text-muted">How the transcript scorer rated the moments it cut.</p>
          <ul className="flex flex-col gap-3">
            {bands.map((band) => {
              const share = clips.length ? Math.round((band.value / clips.length) * 100) : 0
              return (
                <li key={band.label} className="flex items-center gap-3">
                  <span className="w-20 shrink-0 text-[0.82rem] font-semibold tabular-nums">{band.label}</span>
                  <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-ink/8">
                    <span className="block h-full rounded-full bg-ink" style={{ width: `${share}%` }} />
                  </span>
                  <span className="w-8 text-right text-[0.82rem] text-muted tabular-nums">{band.value}</span>
                </li>
              )
            })}
          </ul>
        </Card>
      </div>

      <Card className="p-0">
        <div className="flex flex-wrap items-center justify-between gap-2 p-5 pb-0 sm:p-6 sm:pb-0">
          <h2 className="text-[1.2rem] font-semibold tracking-[-0.025em]">Top clips</h2>
          <Tag>By clip-page views</Tag>
        </div>
        {top.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-[0.9rem]">
              <thead>
                <tr className="border-y border-line text-[0.74rem] font-semibold text-muted uppercase">
                  <th scope="col" className="px-5 py-3 sm:px-6">Clip</th>
                  <th scope="col" className="px-3 py-3">Source</th>
                  <th scope="col" className="px-3 py-3">Cut</th>
                  <th scope="col" className="px-3 py-3 text-right">Score</th>
                  <th scope="col" className="px-3 py-3 text-right">Views</th>
                  <th scope="col" className="px-5 py-3 text-right sm:px-6">Added</th>
                </tr>
              </thead>
              <tbody>
                {top.map((clip) => (
                  <tr key={clip.id} className="border-b border-line last:border-0">
                    <td className="max-w-[260px] px-5 py-3 sm:px-6">
                      <Link to={`/clip/${clip.id}`} className="line-clamp-1 font-semibold underline-offset-4 hover:underline">
                        {clip.title}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-muted">
                      <span className="line-clamp-1">{clip.sourceAuthor ?? clip.sourceTitle}</span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-muted tabular-nums">
                      {formatStamp(clip.start)}–{formatStamp(clip.end)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <ScorePill score={clip.score} />
                    </td>
                    <td className="px-3 py-3 text-right font-semibold tabular-nums">{clip.views}</td>
                    <td className="px-5 py-3 text-right whitespace-nowrap text-muted sm:px-6">{formatAgo(clip.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-5 text-[0.9rem] text-muted sm:p-6">Analyze a VOD to see which clips people open most.</p>
        )}
      </Card>
    </div>
  )
}
