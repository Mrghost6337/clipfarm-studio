import { ArrowUpRight, Music2, Play, Tv } from 'lucide-react'

import type { Creator } from '../content'
import { cx } from '../lib/cx'

/** YouTube / Twitch / TikTok mark, drawn as a monochrome icon. */
export function PlatformIcon({ platform, className }: { platform: Creator['platform']; className?: string }) {
  const Icon = platform === 'TikTok' ? Music2 : platform === 'Twitch' ? Tv : Play
  return <Icon aria-hidden className={className} />
}

/** The animated “Clipping for” strip: profile picture first, then the channel name. */
export function CreatorChip({ creator, className }: { creator: Creator; className?: string }) {
  return (
    <a
      href={creator.url}
      target="_blank"
      rel="noreferrer noopener"
      className={cx(
        'group/chip inline-flex shrink-0 items-center gap-2.5 rounded-full border border-line-strong bg-paper/85 py-1.5 pr-4 pl-1.5 shadow-[var(--shadow-card)] transition-[transform,border-color,box-shadow] duration-[var(--duration-base)] ease-[var(--ease-out-soft)] hover:-translate-y-0.5 hover:border-ink hover:shadow-[var(--shadow-raise)]',
        className,
      )}
    >
      <span className="relative shrink-0">
        <img
          src={creator.avatar}
          alt=""
          width={36}
          height={36}
          loading="lazy"
          className="round size-9 rounded-full object-cover ring-2 ring-white"
        />
        <span className="absolute -right-0.5 -bottom-0.5 grid size-4.5 place-items-center rounded-full bg-paper text-ink ring-1 ring-line">
          <PlatformIcon platform={creator.platform} className="size-2.5" />
        </span>
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-[0.875rem] font-semibold whitespace-nowrap text-ink">{creator.name}</span>
        <span className="mt-0.5 text-[0.68rem] font-medium whitespace-nowrap text-muted">{creator.platform}</span>
      </span>
    </a>
  )
}

/** A real channel as a card: avatar, name, description and its clip tags. */
export function CreatorCard({ creator, className }: { creator: Creator; className?: string }) {
  return (
    <a
      href={creator.url}
      target="_blank"
      rel="noreferrer noopener"
      className={cx(
        'group relative flex h-full flex-col gap-4 overflow-hidden rounded-[var(--radius-lg)] border border-line bg-paper p-5 shadow-[var(--shadow-card)] transition-[transform,box-shadow,border-color] duration-[var(--duration-base)] ease-[var(--ease-out-soft)] hover:-translate-y-1 hover:border-ink/35 hover:shadow-[var(--shadow-raise)]',
        className,
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-24 h-44 bg-gradient-to-b from-peach/80 via-peach/25 to-transparent opacity-0 transition-opacity duration-[var(--duration-base)] group-hover:opacity-100"
      />
      <div className="relative flex items-start gap-3">
        <span className="relative shrink-0">
          <img
            src={creator.avatar}
            alt={`${creator.name} channel picture`}
            width={112}
            height={112}
            loading="lazy"
            className="round size-14 rounded-full object-cover ring-2 ring-white transition-transform duration-[var(--duration-base)] ease-[var(--ease-spring)] group-hover:scale-[1.06]"
          />
          <span className="absolute -right-1 -bottom-1 grid size-6 place-items-center rounded-full bg-ink text-white ring-2 ring-paper">
            <PlatformIcon platform={creator.platform} className="size-3" />
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[1.02rem] leading-tight font-semibold tracking-[-0.02em]">{creator.name}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[0.78rem] text-muted">
            <span className="truncate">{creator.handle}</span>
            <span aria-hidden>·</span>
            <span>{creator.platform}</span>
          </p>
        </div>
        <ArrowUpRight
          aria-hidden
          className="size-4.5 shrink-0 text-muted transition-transform duration-[var(--duration-base)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink"
        />
      </div>
      <p className="relative text-[0.875rem] leading-relaxed text-body">{creator.bio}</p>
      <div className="relative mt-auto flex flex-wrap items-center gap-1.5 pt-1">
        {creator.tags.map((tag) => (
          <span key={tag} className="inline-flex h-6 items-center rounded-full bg-sand px-2.5 text-[0.7rem] font-semibold text-ink-2">
            {tag}
          </span>
        ))}
        <span className="ml-auto text-[0.72rem] font-semibold text-muted transition-colors group-hover:text-accent-ink">Watch channel</span>
      </div>
    </a>
  )
}
