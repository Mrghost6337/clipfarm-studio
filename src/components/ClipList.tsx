import { Archive, CheckCircle2, Copy, Download, RotateCcw, Scissors, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'

import { copyText, deleteClip, exportHref, setClipStatus } from '../lib/clipData'
import { cx } from '../lib/cx'
import { formatAgo } from '../lib/format'
import { formatStamp, type Clip } from '../shared/clips'
import { IconButton } from './Button'
import { Tag } from './Pill'
import { useToast } from './Toast'

export function ScorePill({ score }: { score: number }) {
  return (
    <span
      title={`Hook score ${score}/100`}
      className={cx('inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-[0.78rem] font-semibold tabular-nums', score >= 80 ? 'bg-peach text-accent-ink' : score >= 55 ? 'bg-success-soft text-success' : 'bg-ink/8 text-ink-2')}
    >
      {score}
    </span>
  )
}

export function ClipThumb({ clip }: { clip: Clip }) {
  return (
    <span className="relative block aspect-video w-24 shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-ink/8">
      {clip.sourceThumbnail ? (
        <img src={clip.sourceThumbnail} alt="" loading="lazy" className="size-full object-cover" />
      ) : (
        <span className="grid size-full place-items-center text-muted">
          <Scissors aria-hidden className="size-5" />
        </span>
      )}
      <span className="absolute right-1 bottom-1 rounded-full bg-ink/85 px-1.5 py-0.5 text-[0.65rem] font-semibold text-white tabular-nums">{Math.round(clip.end - clip.start)}s</span>
    </span>
  )
}

export function ClipListItem({ clip, showActions = false, onChanged }: { clip: Clip; showActions?: boolean; onChanged?: () => void }) {
  const toast = useToast()
  const [busy, setBusy] = useState('')

  async function update(status: string) {
    setBusy(status)
    const res = await setClipStatus(clip.id, status)
    setBusy('')
    if (!res.ok) {
      toast(res.error)
      return
    }
    toast(status === 'posted' ? 'Marked as posted' : status === 'archived' ? 'Clip archived' : 'Clip restored')
    onChanged?.()
  }

  async function remove() {
    if (!window.confirm('Delete this clip? This cannot be undone.')) return
    setBusy('delete')
    const res = await deleteClip(clip.id)
    setBusy('')
    if (!res.ok) {
      toast(res.error)
      return
    }
    toast('Clip deleted')
    onChanged?.()
  }

  async function copy() {
    const copied = await copyText(clip.excerpt)
    toast(copied ? 'Caption copied' : 'Could not copy the caption')
  }

  return (
    <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <ClipThumb clip={clip} />
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link to={`/clip/${clip.id}`} className="text-[0.98rem] leading-snug font-semibold underline-offset-4 hover:underline">
              {clip.title}
            </Link>
            <ScorePill score={clip.score} />
            {clip.status !== 'ready' && <Tag tone={clip.status === 'posted' ? 'peach' : 'line'}>{clip.status === 'posted' ? 'Posted' : 'Archived'}</Tag>}
          </div>
          <p className="text-[0.8rem] text-muted">
            <span className="tabular-nums">
              {formatStamp(clip.start)}–{formatStamp(clip.end)}
            </span>{' '}
            · {clip.platform} · {clip.sourceAuthor ?? clip.sourceTitle} · {formatAgo(clip.createdAt)}
          </p>
          <p className="line-clamp-2 max-w-2xl text-[0.85rem] leading-snug text-body">{clip.excerpt}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 pl-[108px] sm:pl-0">
        <span className="mr-1 text-[0.78rem] text-muted tabular-nums">{clip.views} views</span>
        {showActions ? (
          <>
            <IconButton aria-label="Copy caption" title="Copy caption" className="size-9" onClick={copy}>
              <Copy className="size-4" />
            </IconButton>
            <a
              href={exportHref(clip.id, 'srt')}
              aria-label="Download SRT captions"
              title="Download SRT captions"
              className="round inline-grid size-9 place-items-center rounded-full bg-ink/5 text-ink transition-colors hover:bg-ink/10"
            >
              <Download className="size-4" />
            </a>
            {clip.status === 'posted' ? (
              <IconButton aria-label="Move back to ready" title="Move back to ready" className="size-9" onClick={() => update('ready')}>
                <RotateCcw className="size-4" />
              </IconButton>
            ) : (
              <IconButton aria-label="Mark as posted" title="Mark as posted" className="size-9" onClick={() => update('posted')}>
                <CheckCircle2 className="size-4" />
              </IconButton>
            )}
            {clip.status !== 'archived' && (
              <IconButton aria-label="Archive clip" title="Archive clip" className="size-9" onClick={() => update('archived')}>
                <Archive className="size-4" />
              </IconButton>
            )}
            <IconButton aria-label="Delete clip" title="Delete clip" className="size-9 text-danger" disabled={busy === 'delete'} onClick={remove}>
              <Trash2 className="size-4" />
            </IconButton>
          </>
        ) : (
          <Link to={`/clip/${clip.id}`} className="inline-flex h-9 items-center rounded-full border border-line-strong px-3 text-[0.8rem] font-semibold hover:border-ink">
            Open
          </Link>
        )}
      </div>
    </li>
  )
}
