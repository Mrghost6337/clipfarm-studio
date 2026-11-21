import { CircleCheck } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

type Toast = { id: number; message: ReactNode }
const ToastContext = createContext<(message: ReactNode) => void>(() => {})

/** Status pill at the bottom, announced politely to screen readers. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const next = useRef(1)
  const push = useCallback((message: ReactNode) => {
    const id = next.current++
    setToasts((t) => [...t.slice(-2), { id, message }])
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3400)
  }, [])
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-[90] flex flex-col items-center gap-2 px-4">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div key={t.id} layout initial={{ opacity: 0, y: 14, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }} className="inline-flex items-center gap-2.5 rounded-full bg-ink py-2.5 pr-5 pl-3 text-sm font-medium text-white shadow-[var(--shadow-raise)]">
              <CircleCheck aria-hidden className="size-4.5 text-accent" />
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

/** A static toast for the style guide. */
export function ToastPreview({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2.5 rounded-full bg-ink py-2.5 pr-5 pl-3 text-sm font-medium text-white shadow-[var(--shadow-raise)]">
      <CircleCheck aria-hidden className="size-4.5 text-accent" />
      {children}
    </div>
  )
}

export const useToast = () => useContext(ToastContext)
