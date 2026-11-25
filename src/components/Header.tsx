import { BookOpen, ChevronDown, Clapperboard, Download, FileText, HelpCircle, History, Menu, Sparkles, Workflow } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useId, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router'

import { useAuth } from '../lib/auth'
import { cx } from '../lib/cx'
import { ButtonLink, IconButton } from './Button'
import { Logo } from './Logo'
import { Drawer } from './Overlay'

type Item = { label: string; to: string; text?: string; icon?: typeof Clapperboard }
type Group = { label: string; to?: string; icon?: typeof Clapperboard; children?: Item[] }

const PRODUCT: Item[] = [
  { label: 'Studio', to: '/studio', text: 'Sources, editor and inspector in one workspace', icon: Clapperboard },
  { label: 'How it works', to: '/product', text: 'From a link to three vertical clips', icon: Workflow },
  { label: 'Features', to: '/product#features', text: 'Captions, face tracking, layouts and exports', icon: Sparkles },
]
const RESOURCES: Item[] = [
  { label: 'Guides', to: '/resources/guides', text: 'Practical clipping workflows', icon: BookOpen },
  { label: 'FAQ', to: '/resources/faq', text: 'Limits, rights and supported platforms', icon: HelpCircle },
  { label: 'Changelog', to: '/resources/changelog', text: 'What shipped, newest first', icon: History },
]
const NAV: Group[] = [
  { label: 'Product', to: '/product', children: PRODUCT },
  { label: 'Pricing', to: '/pricing' },
  { label: 'Download', to: '/download', icon: Download },
  { label: 'Resources', to: '/resources', children: RESOURCES },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
]

const link = 'inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-[0.95rem] font-medium text-ink-2 transition-colors hover:bg-ink/[0.04] hover:text-ink'
const activeLink = 'bg-ink/[0.06] text-ink'

function Dropdown({ group }: { group: Group }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const id = useId()
  const { pathname } = useLocation()
  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    if (!open) return
    const down = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    const key = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      trigger.current?.focus()
    }
    document.addEventListener('pointerdown', down)
    document.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('pointerdown', down)
      document.removeEventListener('keydown', key)
    }
  }, [open])
  const active = group.children?.some((child) => pathname === child.to || pathname.startsWith(`${child.to}/`))
  return (
    <div ref={ref} className="relative" onBlur={(event) => !ref.current?.contains(event.relatedTarget as Node) && setOpen(false)}>
      <button ref={trigger} type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((value) => !value)} className={cx(link, active && activeLink)}>
        {group.label}
        <ChevronDown aria-hidden className={cx('size-3.5 transition-transform', open && 'rotate-180')} strokeWidth={2.4} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            id={id}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute top-full left-0 z-50 mt-3 w-[340px] rounded-[var(--radius-lg)] border border-line bg-paper p-2 shadow-[var(--shadow-raise)]"
          >
            <ul>
              {group.children!.map((child) => (
                <li key={child.to}>
                  <Link to={child.to} className="flex items-start gap-3 rounded-[var(--radius-md)] px-3 py-2.5 hover:bg-sand focus-visible:bg-sand">
                    {child.icon && (
                      <span aria-hidden className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-[10px] bg-sand text-accent-ink">
                        <child.icon className="size-4" />
                      </span>
                    )}
                    <span className="flex flex-col">
                      <span className="text-[0.92rem] font-semibold text-ink">{child.label}</span>
                      {child.text && <span className="text-[0.8rem] leading-snug text-muted">{child.text}</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link to={group.to ?? group.children![0].to} className="mt-1 flex items-center justify-between border-t border-line px-3 py-2.5 text-[0.82rem] font-semibold text-ink-2 hover:text-ink">
              {group.label === 'Product' ? 'Explore the product' : 'Browse resources'}
              <FileText aria-hidden className="size-3.5" />
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function AccountMenu({ initials }: { initials: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    if (!open) return
    const down = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', down)
    return () => document.removeEventListener('pointerdown', down)
  }, [open])
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Account menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="round grid size-10 place-items-center rounded-full bg-ink text-[0.72rem] font-bold tracking-wide text-white ring-2 ring-transparent transition hover:ring-line-strong"
      >
        {initials}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute top-full right-0 z-50 mt-3 w-52 rounded-[var(--radius-md)] border border-line bg-paper p-1.5 shadow-[var(--shadow-raise)]">
            <Link to="/dashboard/settings" className="flex h-10 items-center rounded-[10px] px-3 text-[0.88rem] font-medium hover:bg-sand">
              Account
            </Link>
            <Link to="/plans" className="flex h-10 items-center rounded-[10px] px-3 text-[0.88rem] font-medium hover:bg-sand">
              Billing
            </Link>
            <button
              type="button"
              onClick={async () => {
                await signOut()
                navigate('/')
              }}
              className="flex h-10 w-full items-center rounded-[10px] px-3 text-left text-[0.88rem] font-medium text-danger hover:bg-danger-soft"
            >
              Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function Header() {
  const [menu, setMenu] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { pathname } = useLocation()
  const { user } = useAuth()
  const initials = user ? user.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase() : ''
  useEffect(() => setMenu(false), [pathname])
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <header className="sticky top-0 z-40 px-3 pt-3 pb-1 sm:px-5 sm:pt-5">
      <div
        className={cx(
          'mx-auto flex h-[64px] max-w-[1280px] items-center justify-between rounded-full border border-transparent bg-paper/95 pr-2 pl-4 backdrop-blur transition-[box-shadow,border-color] duration-200 sm:h-[72px] sm:pr-2.5 sm:pl-7',
          scrolled ? 'border-line shadow-[var(--shadow-nav)]' : 'shadow-none',
        )}
      >
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-0.5 lg:flex">
          {NAV.map((group) =>
            group.children ? (
              <Dropdown key={group.label} group={group} />
            ) : (
              <NavLink key={group.label} to={group.to!} className={({ isActive }) => cx(link, isActive && activeLink)}>
                {group.icon && <group.icon aria-hidden className="size-4" strokeWidth={2.2} />}
                {group.label}
              </NavLink>
            ),
          )}
        </nav>
        <div className="flex items-center gap-1.5">
          {user ? (
            <>
              <ButtonLink to="/studio" size="sm" className="hidden sm:inline-flex">
                Open Studio
              </ButtonLink>
              <AccountMenu initials={initials} />
            </>
          ) : (
            <>
              <Link to="/login" className="hidden h-10 items-center rounded-full px-3 text-[0.9rem] font-semibold text-ink-2 hover:bg-ink/5 sm:inline-flex">
                Log in
              </Link>
              <ButtonLink to="/signup" size="sm" className="hidden sm:inline-flex">
                Start free
              </ButtonLink>
            </>
          )}
          <IconButton aria-label="Open menu" aria-expanded={menu} className="lg:hidden" onClick={() => setMenu(true)}>
            <Menu className="size-5" />
          </IconButton>
        </div>
      </div>

      <Drawer open={menu} onClose={() => setMenu(false)} title="Menu">
        <nav aria-label="Mobile" className="flex flex-1 flex-col gap-1">
          {NAV.map((group) => (
            <div key={group.label} className="border-b border-line/70 py-1 last:border-0">
              {group.children ? (
                <>
                  <p className="px-3 pt-3 pb-1 text-[0.72rem] font-semibold tracking-[0.08em] text-muted uppercase">{group.label}</p>
                  {group.children.map((child) => (
                    <Link key={child.to} to={child.to} className="flex min-h-11 items-center gap-2.5 rounded-[var(--radius-sm)] px-3 text-[1rem] font-semibold hover:bg-sand">
                      {child.icon && <child.icon aria-hidden className="size-4 text-accent-ink" />}
                      {child.label}
                    </Link>
                  ))}
                </>
              ) : (
                <NavLink to={group.to!} className={({ isActive }) => cx('flex min-h-12 items-center gap-2.5 rounded-[var(--radius-sm)] px-3 text-[1.1rem] font-semibold hover:bg-sand', isActive && 'bg-sand')}>
                  {group.icon && <group.icon aria-hidden className="size-4.5 text-accent-ink" />}
                  {group.label}
                </NavLink>
              )}
            </div>
          ))}
          <div className="mt-auto flex flex-col gap-2 pt-6">
            {user ? (
              <>
                <Link to="/studio" className="flex h-12 items-center justify-center rounded-full bg-ink text-[0.95rem] font-semibold text-white">
                  Open Studio
                </Link>
                <Link to="/dashboard/settings" className="flex h-11 items-center justify-center rounded-full border border-line-strong text-[0.9rem] font-semibold">
                  Account
                </Link>
              </>
            ) : (
              <>
                <Link to="/signup" className="flex h-12 items-center justify-center rounded-full bg-ink text-[0.95rem] font-semibold text-white">
                  Start free
                </Link>
                <Link to="/login" className="flex h-11 items-center justify-center rounded-full border border-line-strong text-[0.9rem] font-semibold">
                  Log in
                </Link>
              </>
            )}
          </div>
        </nav>
      </Drawer>
    </header>
  )
}
