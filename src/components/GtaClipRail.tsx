import { ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight, Play } from 'lucide-react'
import { motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'

import { GTA } from '../content'
import { cx } from '../lib/cx'
import { Container } from './Container'

type Clip = (typeof GTA.clips)[number]

function ClipCard({ clip, index }: { clip: Clip; index: number }) {
  return (
    <motion.a
      href={`https://www.youtube.com/watch?v=${clip.id}`}
      target="_blank"
      rel="noreferrer noopener"
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -40px 0px' }}
      transition={{ duration: 0.55, delay: Math.min(index * 0.06, 0.3), ease: [0.22, 1, 0.36, 1] }}
      aria-label={`Watch ${clip.title} by ${clip.creator} on YouTube`}
      className="group relative aspect-[9/16] w-[72vw] max-w-[286px] min-w-[228px] shrink-0 snap-start overflow-hidden rounded-[var(--radius-lg)] border border-white/15 bg-white/5 text-left shadow-[0_24px_60px_-30px_rgb(0_0_0/0.9)] transition-[transform,border-color,box-shadow] duration-[var(--duration-base)] ease-[var(--ease-out-soft)] hover:-translate-y-1.5 hover:border-white/35 hover:shadow-[0_32px_70px_-28px_rgb(0_0_0/0.95)] focus-visible:outline-[2.5px] focus-visible:outline-offset-4 focus-visible:outline-apricot"
    >
      <img
        src={clip.thumbnail}
        alt=""
        width={1280}
        height={720}
        loading="lazy"
        className={cx(
          'absolute inset-0 size-full object-cover opacity-85 transition-[transform,opacity] duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.05] group-hover:opacity-100',
          clip.focus === 'left' ? 'object-left' : 'object-center',
        )}
      />
      <span aria-hidden className="absolute inset-0 bg-gradient-to-b from-ink/45 via-transparent to-transparent" />
      <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-transparent" />

      <span className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3.5">
        <span className="rounded-full border border-white/20 bg-black/45 px-2.5 py-1 text-[0.66rem] font-bold tracking-[0.14em] text-white/85 uppercase backdrop-blur-sm">
          {String(index + 1).padStart(2, '0')}
        </span>
        <span className="rounded-full border border-white/20 bg-black/40 px-2.5 py-1 text-[0.65rem] font-semibold text-white/80 backdrop-blur-sm">
          {clip.format}
        </span>
      </span>

      <span
        aria-hidden
        className="round absolute top-1/2 left-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/45 bg-white/20 text-white shadow-[0_10px_30px_rgb(0_0_0/0.35)] backdrop-blur-md transition-[transform,background-color,color] duration-[var(--duration-base)] ease-[var(--ease-spring)] group-hover:scale-110 group-hover:bg-white group-hover:text-ink"
      >
        <Play className="ml-0.5 size-6" fill="currentColor" />
      </span>

      <span className="absolute inset-x-0 bottom-0 flex flex-col p-4">
        <span className="flex items-center gap-2">
          <img src={clip.avatar} alt="" width={28} height={28} loading="lazy" className="round size-7 rounded-full object-cover ring-1 ring-white/50" />
          <span className="min-w-0">
            <span className="block truncate text-[0.8rem] font-semibold text-white">{clip.creator}</span>
            <span className="block truncate text-[0.62rem] font-medium text-white/55">{clip.channel}</span>
          </span>
        </span>
        <span className="mt-3 line-clamp-3 text-[0.9rem] leading-snug font-medium text-white/95">{clip.title}</span>
        <span className="mt-3 flex items-center justify-between gap-2">
          <span className="rounded-full bg-white/10 px-2 py-1 text-[0.64rem] font-semibold text-white/65">{clip.tag}</span>
          <span className="inline-flex items-center gap-1 text-[0.68rem] font-semibold text-white/75 transition-colors group-hover:text-white">
            Watch on YouTube <ArrowUpRight aria-hidden className="size-3" />
          </span>
        </span>
      </span>
    </motion.a>
  )
}

export function GtaClipRail() {
  const rail = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)
  const [edges, setEdges] = useState({ start: true, end: false })

  const measure = useCallback(() => {
    const node = rail.current
    if (!node) return
    const max = node.scrollWidth - node.clientWidth
    setProgress(max > 0 ? Math.min(1, Math.max(0, node.scrollLeft / max)) : 0)
    setEdges({ start: node.scrollLeft < 24, end: max - node.scrollLeft < 24 })
  }, [])

  useEffect(() => {
    measure()
    const node = rail.current
    if (!node) return
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [measure])

  const scroll = (direction: -1 | 1) => {
    const node = rail.current
    if (!node) return
    node.scrollBy({ left: direction * node.clientWidth * 0.85, behavior: 'smooth' })
  }

  const current = Math.min(GTA.clips.length, Math.max(1, Math.round(progress * (GTA.clips.length - 1)) + 1))

  return (
    <section id="gta-clips" className="relative scroll-mt-24 overflow-hidden bg-ink py-20 text-white sm:py-28">
      <div
        aria-hidden
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgb(255 255 255 / 0.045) 1px, transparent 1px), linear-gradient(to bottom, rgb(255 255 255 / 0.03) 1px, transparent 1px)',
          backgroundSize: 'calc(100% / 8) 100%, 100% 132px',
        }}
      />
      <div aria-hidden className="absolute -top-32 right-[8%] size-[460px] rounded-full bg-[#ff8a3d]/15 blur-[130px]" />
      <div aria-hidden className="absolute bottom-[-12rem] left-[-8rem] size-[440px] rounded-full bg-[#ff2d8a]/10 blur-[130px]" />

      <Container wide className="relative">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '0px 0px -80px 0px' }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-[850px]"
          >
            <span className="inline-flex h-9 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 text-[0.72rem] font-bold tracking-[0.12em] text-white/80 uppercase backdrop-blur-sm">
              <span aria-hidden className="round size-1.5 animate-pulse rounded-full bg-[#ff9a5a]" />
              {GTA.clipDrop.eyebrow}
            </span>
            <h2 className="mt-5 text-[2.35rem] leading-[1.04] font-semibold tracking-[-0.045em] text-balance sm:text-[3.4rem]">
              {GTA.clipDrop.title[0]}{' '}
              <span className="bg-gradient-to-r from-[#ff9a5a] via-[#ffd08a] to-[#ff7ab2] bg-clip-text text-transparent">{GTA.clipDrop.title[1]}</span>
            </h2>
            <p className="mt-5 max-w-[650px] text-[1rem] leading-[1.65] text-pretty text-white/70 sm:text-[1.0625rem]">{GTA.clipDrop.text}</p>
            <div className="mt-6 flex flex-wrap items-center gap-2 text-[0.72rem] font-semibold text-white/60">
              <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5">6 real clips</span>
              <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5">6 creators</span>
              <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5">18–21 Nov 2026</span>
            </div>
          </motion.div>

          <div className="flex items-center gap-3 lg:flex-col lg:items-end">
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Previous clips"
                onClick={() => scroll(-1)}
                disabled={edges.start}
                className="round grid size-11 place-items-center rounded-full border border-white/20 bg-white/5 text-white transition-colors hover:border-white/40 hover:bg-white/15 disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronLeft aria-hidden className="size-5" />
              </button>
              <button
                type="button"
                aria-label="More clips"
                onClick={() => scroll(1)}
                disabled={edges.end}
                className="round grid size-11 place-items-center rounded-full border border-white/20 bg-white/5 text-white transition-colors hover:border-white/40 hover:bg-white/15 disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronRight aria-hidden className="size-5" />
              </button>
            </div>
            <span className="text-[0.7rem] font-medium text-white/45">{GTA.clipDrop.hint}</span>
          </div>
        </div>

        <div
          ref={rail}
          role="region"
          aria-label="Real GTA VI clips from creators"
          onScroll={measure}
          className="-mx-5 mt-10 flex snap-x snap-mandatory scroll-pl-5 gap-4 overflow-x-auto px-5 pb-5 [scrollbar-width:none] sm:-mx-8 sm:scroll-pl-8 sm:px-8 lg:mx-0 lg:scroll-pl-0 lg:px-0 [&::-webkit-scrollbar]:hidden"
        >
          {GTA.clips.map((clip, index) => (
            <ClipCard key={clip.id} clip={clip} index={index} />
          ))}
        </div>

        <div className="mt-1 flex items-center gap-4">
          <div aria-hidden className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#ff9a5a] to-[#ff7ab2] transition-[width] duration-200 ease-out"
              style={{ width: `${Math.max(12, progress * 100)}%` }}
            />
          </div>
          <span className="shrink-0 text-[0.7rem] font-semibold tracking-[0.12em] text-white/55 tabular-nums">
            {String(current).padStart(2, '0')} / {String(GTA.clips.length).padStart(2, '0')}
          </span>
        </div>

        <div className="mt-8 flex flex-col gap-5 border-t border-white/15 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-[820px] text-[0.76rem] leading-relaxed text-white/45">{GTA.clipDrop.note}</p>
          <Link
            to="/gta-6"
            className="inline-flex h-12 shrink-0 items-center gap-2 self-start rounded-full bg-white px-5 text-[0.88rem] font-semibold text-ink transition-transform duration-[var(--duration-base)] ease-[var(--ease-spring)] hover:translate-x-0.5 sm:self-auto"
          >
            {GTA.clipDrop.cta} <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>
      </Container>
    </section>
  )
}
