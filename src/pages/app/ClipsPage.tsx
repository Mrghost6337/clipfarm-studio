import { Plus, Search, SlidersHorizontal } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { AppLoading, useRequireAuth } from '../../components/AuthGate'
import { ButtonLink } from '../../components/Button'
import { Card } from '../../components/Card'
import { ClipListItem } from '../../components/ClipList'
import { Notice, controlBase } from '../../components/Field'
import { Chip } from '../../components/Pill'
import { cx } from '../../lib/cx'
import { loadClips } from '../../lib/clipData'
import { usePageTitle } from '../../lib/title'
import type { Clip } from '../../shared/clips'

const STATUSES = [
  { value: 'all', label: 'All' },
  { value: 'ready', label: 'Ready' },
  { value: 'posted', label: 'Posted' },
  { value: 'archived', label: 'Archived' },
] as const

type Filter = (typeof STATUSES)[number]['value']

export function ClipsPage() {
  usePageTitle('Clips')
  const { ready } = useRequireAuth({ onboarded: true, plan: true })
  const [clips, setClips] = useState<Clip[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<Filter>('all')
  const [platform, setPlatform] = useState<'all' | 'YouTube' | 'Twitch'>('all')

  const load = useCallback(async () => {
    const res = await loadClips()
    setLoading(false)
    if (res.ok) {
      setClips(res.clips)
      setError('')
    } else {
      setError(res.error)
    }
  }, [])

  useEffect(() => {
    if (ready) void load()
  }, [ready, load])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return clips.filter((clip) => {
      if (status !== 'all' && clip.status !== status) return false
      if (platform !== 'all' && clip.platform !== platform) return false
      if (needle && !`${clip.title} ${clip.excerpt} ${clip.sourceTitle}`.toLowerCase().includes(needle)) return false
      return true
    })
  }, [clips, query, status, platform])

  if (!ready) return <AppLoading label="Loading your clips" rows={4} />

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[0.75rem] font-semibold tracking-[0.08em] text-muted uppercase">Clips</p>
          <h1 className="text-[2rem] leading-[1.05] font-semibold tracking-[-0.04em] sm:text-[2.5rem]">Every clip in your workspace</h1>
          <p className="mt-1 text-[0.95rem] text-body">
            {clips.length} clip{clips.length === 1 ? '' : 's'} cut from {new Set(clips.map((clip) => clip.sourceId)).size} source{new Set(clips.map((clip) => clip.sourceId)).size === 1 ? '' : 's'}.
          </p>
        </div>
        <ButtonLink to="/dashboard/sources" icon={<Plus aria-hidden className="size-4" strokeWidth={2.6} />}>
          New clip
        </ButtonLink>
      </header>

      {error && <Notice>{error}</Notice>}

      <Card className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
            <label htmlFor="clip-search" className="sr-only">
              Search clips
            </label>
            <input id="clip-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search titles, captions or sources" className={cx(controlBase, 'h-11 border-line-strong pl-10')} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[0.8rem] font-semibold text-muted">
              <SlidersHorizontal aria-hidden className="size-3.5" />
              Status
            </span>
            {STATUSES.map((option) => (
              <Chip key={option.value} selected={status === option.value} onClick={() => setStatus(option.value)}>
                {option.label}
              </Chip>
            ))}
            <label htmlFor="clip-platform" className="sr-only">
              Platform
            </label>
            <select id="clip-platform" value={platform} onChange={(event) => setPlatform(event.target.value as typeof platform)} className={cx(controlBase, 'h-10 w-auto border-line-strong pr-8')}>
              <option value="all">All platforms</option>
              <option value="YouTube">YouTube</option>
              <option value="Twitch">Twitch</option>
            </select>
          </div>
        </div>
      </Card>

      <Card className="p-0">
        {loading ? (
          <p className="p-6 text-[0.9rem] text-muted">Loading clips…</p>
        ) : filtered.length ? (
          <ul className="flex flex-col divide-y divide-line px-5 sm:px-6">
            {filtered.map((clip) => (
              <ClipListItem key={clip.id} clip={clip} showActions onChanged={load} />
            ))}
          </ul>
        ) : clips.length ? (
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <h2 className="text-[1.1rem] font-semibold">No clips match those filters</h2>
            <p className="max-w-md text-[0.9rem] text-muted">Clear the search or pick a different status to see the rest of your workspace.</p>
            <button
              type="button"
              onClick={() => {
                setQuery('')
                setStatus('all')
                setPlatform('all')
              }}
              className="mt-1 inline-flex h-10 items-center rounded-full border border-line-strong px-4 text-[0.85rem] font-semibold hover:border-ink"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <span aria-hidden className="grid size-12 place-items-center rounded-full bg-peach text-accent-ink">
              <Plus className="size-5" />
            </span>
            <h2 className="text-[1.2rem] font-semibold">No clips yet</h2>
            <p className="max-w-md text-[0.9rem] text-body">Paste a YouTube or Twitch link and Clipfarm will cut the moments worth posting. Captions and chapter markers are read from the real video.</p>
            <ButtonLink to="/dashboard/sources" className="mt-2">
              Analyze your first VOD
            </ButtonLink>
          </div>
        )}
      </Card>
    </div>
  )
}
