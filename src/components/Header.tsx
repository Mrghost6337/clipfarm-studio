import { ChevronDown, Menu } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useId, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router'

import { NAV, NAV_CTA, type NavItem } from '../content'
import { cx } from '../lib/cx'
import { ArrowLink, IconButton } from './Button'
import { Logo } from './Logo'
import { Drawer } from './Overlay'

const linkClass = 'inline-flex h-10 items-center gap-1 rounded-full px-3 text-[1rem] font-medium tracking-[-0.015em] text-ink-2 transition-colors hover:text-ink hover:bg-ink/[0.04]'

function Dropdown({ item }: { item: NavItem }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const id = useId()
  const { pathname } = useLocation()
  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        button.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])
  return (
    <div
      ref={ref}
      className="relative"
      onBlur={(e) => {
        if (!ref.current?.contains(e.relatedTarget as Node)) setOpen(false)
      }}
    >
      <button ref={button} type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)} className={cx(linkClass, pathname.startsWith(item.to) && 'text-ink')}>
        {item.label}
        <ChevronDown aria-hidden className={cx('size-4 transition-transform duration-[var(--duration-base)]', open && 'rotate-180')} strokeWidth={2.2} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div id={id} initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }} className="absolute top-full left-1/2 z-50 mt-4 w-[380px] -translate-x-1/2 rounded-[var(--radius-lg)] bg-paper p-2 shadow-[var(--shadow-raise)]">
            <ul>
              {item.children!.map((c) => (
                <li key={c.to}>
                  <Link to={c.to} className="flex flex-col gap-0.5 rounded-[var(--radius-md)] px-4 py-3 transition-colors hover:bg-sand focus-visible:bg-sand">
                    <span className="font-semibold text-ink">{c.label}</span>
                    <span className="text-[0.875rem] text-muted">{c.text}</span>
                  </Link>
                </li>
              ))}
              <li className="mt-1 border-t border-line pt-1">
                <Link to={item.to} className="flex items-center justify-between rounded-[var(--radius-md)] px-4 py-3 text-[0.9rem] font-semibold text-ink transition-colors hover:bg-sand focus-visible:bg-sand">
                  All services
                </Link>
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function Header() {
  const [menu, setMenu] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => setMenu(false), [pathname])
  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-5 sm:pt-6 pb-1">
      <div className="mx-auto flex h-[68px] max-w-[1324px] items-center justify-between rounded-full bg-paper/95 pr-2 pl-5 shadow-[var(--shadow-nav)] backdrop-blur sm:h-[76px] sm:pr-3 sm:pl-8">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) =>
            item.children ? (
              <Dropdown key={item.label} item={item} />
            ) : (
              <NavLink key={item.label} to={item.to} className={({ isActive }) => cx(linkClass, isActive && 'text-ink underline decoration-accent decoration-2 underline-offset-8')}>
                {item.label}
              </NavLink>
            ),
          )}
        </nav>
        <div className="flex items-center gap-2">
          <span className="hidden sm:contents">
            <ArrowLink to={NAV_CTA.to}>{NAV_CTA.label}</ArrowLink>
          </span>
          <IconButton aria-label="Open menu" aria-expanded={menu} className="lg:hidden" onClick={() => setMenu(true)}>
            <Menu className="size-5" />
          </IconButton>
        </div>
      </div>
      <Drawer open={menu} onClose={() => setMenu(false)} title="Menu">
        <nav aria-label="Mobile" className="flex flex-1 flex-col">
          <ul className="flex flex-col">
            {NAV.map((item) => (
              <li key={item.label}>
                <NavLink to={item.to} className={({ isActive }) => cx('flex h-13 items-center rounded-[var(--radius-md)] px-3 text-[1.25rem] font-semibold tracking-[-0.02em] hover:bg-sand', isActive && 'bg-sand')}>
                  {item.label}
                </NavLink>
                {item.children && (
                  <ul className="mb-2 ml-3 border-l border-line pl-3">
                    {item.children.map((c) => (
                      <li key={c.to}>
                        <Link to={c.to} className="flex min-h-11 items-center rounded-[var(--radius-sm)] px-3 text-[0.95rem] text-body hover:bg-sand">
                          {c.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
          <ArrowLink to={NAV_CTA.to} className="mt-auto justify-between self-stretch">
            {NAV_CTA.label}
          </ArrowLink>
        </nav>
      </Drawer>
    </header>
  )
}
