import { Download, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useId, useState } from 'react'

import { Button } from '../components/Button'
import { invoke, on, type UpdateStatus } from './bridge'

/**
 * Shown when a new version has finished downloading in the background.
 * "Install now" restarts into the new version; "Later" hides it, and the
 * update then installs by itself the next time the app is closed.
 */
export function UpdatePrompt() {
  const [status, setStatus] = useState<UpdateStatus | null>(null)
  const [dismissed, setDismissed] = useState<string | null>(null)
  const [jobRunning, setJobRunning] = useState(false)
  const [installing, setInstalling] = useState(false)
  const titleId = useId()
  const textId = useId()

  useEffect(() => {
    void invoke('update:status').then(setStatus)
    return on('update:status', setStatus)
  }, [])

  const version = status?.state === 'ready' ? status.version : null
  const open = !!version && dismissed !== version

  useEffect(() => {
    if (open) void invoke('jobs:keep-awake').then(setJobRunning, () => setJobRunning(false))
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <motion.section
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          aria-describedby={textId}
          initial={{ opacity: 0, y: 28, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="fixed right-6 bottom-6 z-50 w-[380px] rounded-[var(--radius-lg)] border border-line bg-paper p-5 shadow-[var(--shadow-raise)]"
        >
          <div className="flex items-start gap-3">
            <span className="round grid size-10 shrink-0 place-items-center rounded-full bg-peach text-accent-ink">
              <Download aria-hidden className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="text-[1.05rem] font-semibold tracking-[-0.02em]">
                Update ready
              </h2>
              <p id={textId} className="mt-0.5 text-[0.88rem] text-body">
                Clipfarm Studio {version} is downloaded. Install it now, or later: it then installs when you close the app.
              </p>
            </div>
            <button type="button" aria-label="Hide for now" onClick={() => setDismissed(version)} className="round -mt-1 -mr-1 grid size-11 shrink-0 place-items-center rounded-full text-muted hover:bg-ink/5 hover:text-ink">
              <X aria-hidden className="size-4" />
            </button>
          </div>
          {status?.notes && (
            <details className="mt-3 rounded-[var(--radius-sm)] bg-sand px-3 py-2 text-[0.82rem] text-body">
              <summary className="min-h-8 cursor-pointer py-1 font-semibold text-ink">What’s new</summary>
              <p className="mt-1 max-h-40 overflow-auto whitespace-pre-line">{status.notes}</p>
            </details>
          )}
          {jobRunning && <p className="mt-3 text-[0.82rem] font-semibold text-danger">A clip job is running. Installing now stops it; you can retry it after the update.</p>}
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setDismissed(version)}>
              Later
            </Button>
            <Button
              size="sm"
              loading={installing}
              onClick={async () => {
                setInstalling(true)
                if (!(await invoke('update:install'))) setInstalling(false)
              }}
            >
              Install now
            </Button>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  )
}
