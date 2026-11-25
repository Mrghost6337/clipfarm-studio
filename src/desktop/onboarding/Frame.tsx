import { ArrowLeft } from 'lucide-react'
import { motion } from 'motion/react'
import type { ReactNode } from 'react'

import { LogoMark } from '../../components/Logo'
import { cx } from '../../lib/cx'

/** The shared frame for the light first-run screens: logo, optional back, centred content over the apricot glow. */
export function Frame({ children, onBack, backLabel = 'Back', wide = false }: { children: ReactNode; onBack?: () => void; backLabel?: string; wide?: boolean }) {
  return (
    <div className="relative flex min-h-svh flex-col overflow-hidden bg-sand">
      <div aria-hidden className="page-grid absolute inset-0 opacity-70" />
      <div aria-hidden className="hero-glow absolute inset-x-0 bottom-0 h-[45%] opacity-45" />
      <header className="relative flex h-20 items-center justify-between px-8">
        <span className="inline-flex items-center gap-2.5 text-ink">
          <LogoMark className="size-8" />
          <span className="text-[1.35rem] leading-none font-bold tracking-[-0.045em]">Clipfarm</span>
        </span>
        {onBack && (
          <button type="button" onClick={onBack} className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-[0.9rem] font-semibold text-muted transition-colors hover:text-ink">
            <ArrowLeft aria-hidden className="size-4" /> {backLabel}
          </button>
        )}
      </header>
      <main className="relative grid flex-1 place-items-center px-8 pb-16">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }} className={cx('w-full', wide ? 'max-w-4xl' : 'max-w-xl')}>
          {children}
        </motion.div>
      </main>
    </div>
  )
}
