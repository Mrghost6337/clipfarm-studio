import { Cookie } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'

import { readJson, writeJson } from '../lib/storage'
import { Button } from './Button'

export const CONSENT_KEY = 'clipfarm.consent'
export type ConsentChoice = 'all' | 'essential'
export type ConsentRecord = { choice: ConsentChoice; at: string }

export const getConsent = () => readJson<ConsentRecord | null>(CONSENT_KEY, null)

/** Reopens the banner from Settings. */
export function openCookieSettings() {
  window.dispatchEvent(new Event('clipfarm:cookies'))
}

/**
 * A working consent banner: the choice is stored on this device, the banner
 * stays closed afterwards, and Settings can reopen it. Accepting all is what
 * enables the optional launch popup; "essential only" keeps just the sign-in
 * cookie and your own saved preferences.
 */
export function CookieConsent() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const reopen = () => setOpen(true)
    window.addEventListener('clipfarm:cookies', reopen)
    const timer = window.setTimeout(() => {
      if (!getConsent()) setOpen(true)
    }, 900)
    return () => {
      window.removeEventListener('clipfarm:cookies', reopen)
      window.clearTimeout(timer)
    }
  }, [])

  function choose(choice: ConsentChoice) {
    writeJson(CONSENT_KEY, { choice, at: new Date().toISOString() } satisfies ConsentRecord)
    setOpen(false)
    window.dispatchEvent(new Event('clipfarm:consent'))
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          role="dialog"
          aria-labelledby="cookie-title"
          aria-describedby="cookie-text"
          className="fixed inset-x-3 bottom-3 z-[75] sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[420px]"
        >
          <div className="rounded-[var(--radius-lg)] border border-line bg-paper p-5 shadow-[var(--shadow-raise)]">
            <div className="flex items-start gap-3">
              <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-peach text-accent-ink">
                <Cookie className="size-4.5" />
              </span>
              <div className="flex flex-col gap-1">
                <h2 id="cookie-title" className="text-[1.05rem] font-semibold tracking-[-0.02em]">
                  Cookies, briefly
                </h2>
                <p id="cookie-text" className="text-[0.85rem] leading-relaxed text-body">
                  One essential cookie keeps you signed in. Country, currency and other preferences stay in this browser. No ad trackers, no third-party analytics.
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={() => choose('all')}>
                Accept all
              </Button>
              <Button size="sm" variant="secondary" onClick={() => choose('essential')}>
                Essential only
              </Button>
              <button type="button" onClick={() => setOpen(false)} className="ml-auto inline-flex h-9 items-center px-2 text-[0.8rem] font-semibold text-muted hover:text-ink">
                Later
              </button>
            </div>
            <p className="mt-2 text-[0.72rem] text-muted">Change this any time in Settings → Privacy.</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
