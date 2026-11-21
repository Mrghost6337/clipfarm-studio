import { Plus } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useId, useState } from 'react'

import { cx } from '../lib/cx'

export function Accordion({ items, defaultOpen = 0, className }: { items: Array<{ q: string; a: string }>; defaultOpen?: number | null; className?: string }) {
  const [open, setOpen] = useState<number | null>(defaultOpen)
  const id = useId()
  return (
    <div className={cx('flex flex-col gap-3', className)}>
      {items.map((item, i) => {
        const isOpen = open === i
        return (
          <div key={item.q} className={cx('rounded-[var(--radius-lg)] bg-paper transition-shadow duration-[var(--duration-base)]', isOpen ? 'shadow-[var(--shadow-card)]' : 'shadow-[0_1px_2px_rgb(28_26_20/0.05)]')}>
            <h3>
              <button type="button" id={`${id}-b${i}`} aria-expanded={isOpen} aria-controls={`${id}-p${i}`} onClick={() => setOpen(isOpen ? null : i)} className="flex min-h-16 w-full items-center justify-between gap-4 rounded-[var(--radius-lg)] px-6 py-4 text-left text-[1.0625rem] font-semibold tracking-[-0.015em]">
                {item.q}
                <span aria-hidden className={cx('round grid size-9 shrink-0 place-items-center rounded-full transition-[transform,background-color] duration-[var(--duration-base)]', isOpen ? 'rotate-45 bg-ink text-white' : 'bg-ink/5')}>
                  <Plus className="size-4.5" />
                </span>
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div id={`${id}-p${i}`} role="region" aria-labelledby={`${id}-b${i}`} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
                  <p className="max-w-[640px] px-6 pb-6 text-[0.975rem] leading-[1.65] text-body">{item.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}
