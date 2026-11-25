import { ArrowRight, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'

import { GTA, IMAGES } from '../content'
import { readJson, writeJson } from '../lib/storage'
import { getConsent } from './CookieConsent'
import { Tag } from './Pill'

const KEY = 'clipfarm.promo'
const SEEN = 'clipfarm.promo.seen'
// Not the GTA VI hub itself: the card would cover the page it promotes.
const ALLOWED = ['/', '/services', '/toolkit']
const DELAY = 12_000

const seenThisSession = () => {
  try {
    return window.sessionStorage.getItem(SEEN) === '1'
  } catch {
    return false
  }
}

/**
 * One tasteful launch card, once the visitor has made a cookie choice. It only
 * appears on marketing pages, closes on Escape, and can be silenced for good.
 */
export function LaunchPopup() {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(false)
    if (!ALLOWED.includes(pathname)) return
    if (readJson(KEY, false) || seenThisSession()) return
    if (getConsent()?.choice !== 'all') return

    const timer = window.setTimeout(() => setOpen(true), DELAY)
    return () => window.clearTimeout(timer)
  }, [pathname])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  function close(forever = false) {
    setOpen(false)
    try {
      window.sessionStorage.setItem(SEEN, '1')
    } catch {
      /* storage unavailable */
    }
    if (forever) writeJson(KEY, true)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          aria-label="GTA VI launch"
          className="fixed right-3 bottom-3 z-[60] w-[min(92vw,350px)] sm:right-6 sm:bottom-6"
        >
          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-line bg-paper shadow-[var(--shadow-raise)]">
            <div className="relative h-28 bg-ink">
              <img src={IMAGES.gtaTrailer2.src} alt="" width={1280} height={720} loading="lazy" className="size-full object-cover opacity-80" />
              <button
                type="button"
                onClick={() => close()}
                aria-label="Close launch card"
                className="absolute top-2 right-2 grid size-8 place-items-center rounded-full bg-ink/70 text-white backdrop-blur transition-colors hover:bg-ink"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="flex flex-col gap-2.5 p-4">
              <div className="flex items-center gap-2">
                <Tag tone="peach">Launch week</Tag>
                <span className="text-[0.7rem] font-semibold tracking-[0.06em] text-muted uppercase">{GTA.launched}</span>
              </div>
              <h2 className="text-[1.1rem] leading-snug font-semibold tracking-[-0.02em]">GTA VI is out. Clip Leonida first.</h2>
              <p className="text-[0.82rem] leading-relaxed text-body">Paste a GTA VI VOD and get chases, heist fails and reactions cut vertical with captions.</p>
              <Link to="/gta-6" onClick={() => close()} className="inline-flex h-9 items-center gap-1.5 self-start rounded-full bg-ink px-4 text-[0.82rem] font-semibold text-white hover:bg-ink-2">
                Open the GTA VI hub
                <ArrowRight aria-hidden className="size-3.5" />
              </Link>
              <button type="button" onClick={() => close(true)} className="self-start text-[0.72rem] font-medium text-muted underline underline-offset-2 hover:text-ink">
                Don’t show this again
              </button>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
