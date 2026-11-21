import { X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

import { cx } from '../lib/cx'
import { IconButton } from './Button'

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

/** Traps Tab inside `ref`, closes on Escape, locks scroll and restores focus on close. */
export function useFocusTrap(open: boolean, ref: React.RefObject<HTMLElement | null>, onClose: () => void) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    const el = ref.current
    const first = el?.querySelector<HTMLElement>('[data-autofocus]') ?? el?.querySelector<HTMLElement>(FOCUSABLE)
    ;(first ?? el)?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab' || !el) return
      const items = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.offsetParent !== null)
      if (!items.length) return
      const head = items[0]
      const tail = items[items.length - 1]
      if (!el.contains(document.activeElement)) {
        e.preventDefault()
        head.focus()
      } else if (e.shiftKey && document.activeElement === head) {
        e.preventDefault()
        tail.focus()
      } else if (!e.shiftKey && document.activeElement === tail) {
        e.preventDefault()
        head.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      previous?.focus?.()
    }
  }, [open, ref])
}

type OverlayProps = { open: boolean; onClose: () => void; title: string; description?: string; children: ReactNode; className?: string }

export function Modal(props: OverlayProps) {
  return createPortal(<AnimatePresence>{props.open && <ModalPanel {...props} />}</AnimatePresence>, document.body)
}

function ModalPanel({ onClose, title, description, children, className }: OverlayProps) {
  const ref = useRef<HTMLDivElement>(null)
  const id = useId()
  useFocusTrap(true, ref, onClose)
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6">
      <motion.div className="absolute inset-0 bg-ink/45 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-t`}
        aria-describedby={description ? `${id}-d` : undefined}
        tabIndex={-1}
        initial={{ opacity: 0, y: 28, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className={cx('relative max-h-[92svh] w-full overflow-y-auto rounded-t-[var(--radius-xl)] bg-paper p-6 shadow-[var(--shadow-raise)] focus:outline-none sm:max-w-lg sm:rounded-[var(--radius-xl)] sm:p-8', className)}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id={`${id}-t`} className="text-[1.5rem] font-semibold tracking-[-0.03em]">
              {title}
            </h2>
            {description && (
              <p id={`${id}-d`} className="mt-1.5 text-[0.95rem] text-body">
                {description}
              </p>
            )}
          </div>
          <IconButton aria-label="Close" onClick={onClose}>
            <X className="size-5" />
          </IconButton>
        </div>
        {children}
      </motion.div>
    </div>
  )
}

export function Drawer(props: OverlayProps) {
  return createPortal(<AnimatePresence>{props.open && <DrawerPanel {...props} />}</AnimatePresence>, document.body)
}

function DrawerPanel({ onClose, title, children, className }: OverlayProps) {
  const ref = useRef<HTMLDivElement>(null)
  const id = useId()
  useFocusTrap(true, ref, onClose)
  return (
    <div className="fixed inset-0 z-[80]">
      <motion.div className="absolute inset-0 bg-ink/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-t`}
        tabIndex={-1}
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className={cx('absolute inset-y-0 right-0 flex w-full max-w-sm flex-col overflow-y-auto bg-paper p-5 shadow-[var(--shadow-raise)] focus:outline-none', className)}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id={`${id}-t`} className="text-lg font-semibold">
            {title}
          </h2>
          <IconButton aria-label="Close menu" onClick={onClose}>
            <X className="size-5" />
          </IconButton>
        </div>
        {children}
      </motion.div>
    </div>
  )
}
