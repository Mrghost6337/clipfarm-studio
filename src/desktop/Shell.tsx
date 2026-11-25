import { BarChart3, Clapperboard, Home, LogOut, Plus, Scissors, Settings, Video } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router'

import { IconButton } from '../components/Button'
import { LogoMark } from '../components/Logo'
import { useAuth } from '../lib/auth'
import { cx } from '../lib/cx'
import { allowanceFor } from '../shared/account'
import { useAuthStatus, usePipelineStatus } from './hooks'
import { Avatar } from './onboarding/Avatar'

const NAV = [
  { to: '/dashboard', label: 'Home', icon: Home, end: true },
  { to: '/studio', label: 'Studio', icon: Clapperboard },
  { to: '/dashboard/clips', label: 'Clips', icon: Scissors },
  { to: '/dashboard/sources', label: 'Sources', icon: Video },
  { to: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/dashboard/settings', label: 'Settings', icon: Settings },
]

const itemClass = (active: boolean) =>
  cx(
    'flex min-h-11 items-center gap-3 rounded-[var(--radius-md)] px-3 text-[0.95rem] font-semibold transition-colors duration-[var(--duration-fast)]',
    active ? 'bg-ink text-white' : 'text-ink-2 hover:bg-ink/[0.05] hover:text-ink',
  )

/** The desktop app frame: the same 248 px sidebar as the website dashboard, plus the pipeline status. */
export function DesktopShell() {
  const { user, signOut } = useAuth()
  const status = useAuthStatus()
  const pipeline = usePipelineStatus()
  const navigate = useNavigate()
  const allowance = allowanceFor(user?.planId)
  const profile = user ?? (status?.state === 'signed-in' ? status.user : null)
  const offline = status?.state === 'signed-in' && status.offline

  return (
    <div className="flex min-h-svh bg-sand">
      <aside className="sticky top-0 flex h-svh w-[248px] shrink-0 flex-col border-r border-line bg-paper p-5" aria-label="App">
        <span className="inline-flex items-center gap-2.5 px-1 text-ink">
          <LogoMark className="size-8" />
          <span className="text-[1.35rem] leading-none font-bold tracking-[-0.045em]">Clipfarm</span>
        </span>
        <button
          type="button"
          onClick={() => navigate('/dashboard?new=1')}
          className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ink text-[0.9rem] font-semibold text-white transition-colors hover:bg-ink-2"
        >
          <Plus aria-hidden className="size-4" strokeWidth={2.6} />
          New clip
        </button>
        <nav aria-label="App" className="mt-7">
          <ul className="flex flex-col gap-1">
            {NAV.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} end={item.end} className={({ isActive }) => itemClass(isActive)}>
                  <item.icon aria-hidden className="size-4.5" strokeWidth={2.2} />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-auto flex flex-col gap-3">
          <p className="flex items-center gap-2 px-1 text-[0.78rem] font-semibold text-muted" role="status">
            <span aria-hidden className={cx('round size-2 rounded-full', pipeline?.state === 'ready' ? 'bg-success' : pipeline?.state === 'failed' ? 'bg-danger' : 'bg-accent')} />
            {pipeline?.state === 'ready' ? 'Pipeline running' : pipeline?.state === 'failed' ? 'Pipeline stopped' : 'Pipeline starting'}
            {offline && <span className="ml-auto rounded-full bg-sand px-2 py-0.5 text-[0.7rem]">Offline</span>}
          </p>
          <div className="rounded-[var(--radius-md)] border border-line bg-sand p-3.5">
            <p className="text-[0.72rem] font-semibold tracking-[0.08em] text-muted uppercase">Plan</p>
            <p className="mt-1 text-[0.95rem] font-semibold">{allowance.name}</p>
            <p className="text-[0.75rem] text-muted">{allowance.limit} cloud clips a month · local clips unlimited</p>
          </div>
          {profile && (
            <div className="flex items-center gap-2.5 rounded-[var(--radius-md)] px-1 py-1">
              <Avatar name={profile.name} email={profile.email} url={profile.avatarUrl} size={36} />
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-[0.88rem] font-semibold">{profile.name}</span>
                <span className="truncate text-[0.75rem] text-muted">{profile.email}</span>
              </span>
              <IconButton aria-label="Sign out" tone="ghost" className="ml-auto size-9" onClick={() => void signOut()}>
                <LogOut className="size-4" />
              </IconButton>
            </div>
          )}
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-8">
        <Outlet />
      </main>
    </div>
  )
}
