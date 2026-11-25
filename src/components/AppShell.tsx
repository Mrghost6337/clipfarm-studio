import { BarChart3, Clapperboard, LayoutDashboard, LogOut, Menu, Plus, Scissors, Settings, Video } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'

import { useAuth } from '../lib/auth'
import { cx } from '../lib/cx'
import { useRegion } from '../lib/region'
import { planById, priceFor } from '../shared/account'
import { IconButton } from './Button'
import { Logo } from './Logo'
import { Drawer } from './Overlay'

const NAV = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/studio', label: 'Studio', icon: Clapperboard },
  { to: '/dashboard/clips', label: 'Library', icon: Scissors },
  { to: '/dashboard/sources', label: 'Channels', icon: Video },
  { to: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/dashboard/settings', label: 'Settings', icon: Settings },
]

const itemClass = (active: boolean) =>
  cx(
    'group flex min-h-11 items-center gap-3 rounded-[var(--radius-md)] px-3 text-[0.95rem] font-semibold transition-colors duration-[var(--duration-fast)]',
    active ? 'bg-ink text-white' : 'text-ink-2 hover:bg-ink/[0.05] hover:text-ink',
  )

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <ul className="flex flex-col gap-1">
      {NAV.map((item) => (
        <li key={item.to}>
          <NavLink to={item.to} end={item.end} onClick={onNavigate} className={({ isActive }) => itemClass(isActive)}>
            <item.icon aria-hidden className="size-4.5" strokeWidth={2.2} />
            {item.label}
          </NavLink>
        </li>
      ))}
    </ul>
  )
}

/** The signed-in app frame: its own sidebar navigation, account menu and logout. */
export function AppShell() {
  const { user, signOut } = useAuth()
  const [menu, setMenu] = useState(false)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const plan = planById(user?.planId)
  const { format } = useRegion()
  const initials = user?.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase() ?? ''

  useEffect(() => setMenu(false), [pathname])

  async function leave() {
    await signOut()
    navigate('/')
  }

  return (
    <div className="min-h-svh bg-sand">
      <div className="mx-auto flex w-full max-w-[1480px] gap-8 px-0 lg:px-6 lg:py-6">
        <aside className="sticky top-6 hidden h-[calc(100svh-3rem)] w-[248px] shrink-0 flex-col rounded-[var(--radius-xl)] bg-paper p-5 shadow-[var(--shadow-card)] lg:flex" aria-label="Dashboard">
          <Logo className="px-1" />
          <Link to="/studio" className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ink text-[0.9rem] font-semibold text-white transition-colors hover:bg-ink-2">
            <Plus aria-hidden className="size-4" strokeWidth={2.6} />
            New clip
          </Link>

          <nav aria-label="Dashboard" className="mt-7">
            <p className="mb-2 px-3 text-[0.72rem] font-semibold tracking-[0.08em] text-muted uppercase">Workspace</p>
            <NavItems />
          </nav>

          <div className="mt-auto flex flex-col gap-3">
            <div className="rounded-[var(--radius-md)] border border-line bg-sand p-3.5">
              <p className="text-[0.72rem] font-semibold tracking-[0.08em] text-muted uppercase">Plan</p>
              <p className="mt-1 text-[0.95rem] font-semibold">{plan ? `${plan.name} · ${format(priceFor(plan, user?.billing ?? 'monthly'))}/mo` : 'No plan yet'}</p>
              <p className="text-[0.75rem] text-muted">{plan ? `${plan.limit} clips a month` : '20 to 200 clips a month'}</p>
              <Link to="/plans" className="mt-1 inline-flex items-center gap-1 text-[0.82rem] font-semibold text-accent-ink underline decoration-2 underline-offset-4">
                {plan ? 'Manage plan' : 'Choose a plan'}
              </Link>
            </div>
            <div className="flex items-center gap-2.5 rounded-[var(--radius-md)] px-1 py-1">
              <span aria-hidden className="round grid size-9 shrink-0 place-items-center rounded-full bg-ink text-[0.75rem] font-bold text-white">{initials}</span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-[0.88rem] font-semibold">{user?.name}</span>
                <span className="truncate text-[0.75rem] text-muted">{user?.email}</span>
              </span>
              <IconButton aria-label="Log out" tone="ghost" className="ml-auto size-9" onClick={leave}>
                <LogOut className="size-4" />
              </IconButton>
            </div>
            <Link to="/" className="px-1 text-[0.78rem] text-muted hover:text-ink">
              ← Back to clipfarm.studio
            </Link>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line/80 bg-sand/95 px-4 py-3 backdrop-blur lg:hidden">
            <Logo />
            <div className="flex items-center gap-2">
              <Link to="/studio" aria-label="Open Studio" className="round grid size-10 place-items-center rounded-full bg-ink text-white">
                <Plus className="size-4.5" strokeWidth={2.6} />
              </Link>
              <IconButton aria-label="Open dashboard menu" aria-expanded={menu} onClick={() => setMenu(true)}>
                <Menu className="size-5" />
              </IconButton>
            </div>
          </header>
          <div className="px-4 pt-6 pb-24 sm:px-6 lg:px-0 lg:pt-0">
            <Outlet />
          </div>
        </div>
      </div>

      <Drawer open={menu} onClose={() => setMenu(false)} title="Dashboard">
        <nav aria-label="Dashboard mobile" className="flex flex-1 flex-col">
          <NavItems onNavigate={() => setMenu(false)} />
          <div className="mt-6 flex flex-col gap-3 rounded-[var(--radius-md)] border border-line bg-sand p-4">
            <p className="text-[0.78rem] font-semibold text-muted uppercase">{plan ? `${plan.name} plan` : 'No plan yet'}</p>
            <Link to="/plans" onClick={() => setMenu(false)} className="text-[0.9rem] font-semibold text-accent-ink underline decoration-2 underline-offset-4">
              {plan ? 'Manage plan' : 'Choose a plan'}
            </Link>
          </div>
          <button type="button" onClick={leave} className="mt-auto flex min-h-12 items-center gap-2 rounded-[var(--radius-md)] px-3 text-[0.95rem] font-semibold text-ink-2 hover:bg-ink/5">
            <LogOut aria-hidden className="size-4.5" />
            Log out
          </button>
        </nav>
      </Drawer>
    </div>
  )
}
