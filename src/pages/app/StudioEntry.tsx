import { ArrowLeft, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { Button, ButtonLink } from '../../components/Button'
import { Logo } from '../../components/Logo'
import { StudioOnboarding, type StudioRuntime } from '../../components/StudioOnboarding'
import { useAuth } from '../../lib/auth'
import { usePageTitle } from '../../lib/title'
import { Studio } from '../Studio'

type SavedSetup = { done: boolean; runtime?: StudioRuntime; completedAt?: string }

const readSetup = (key: string): SavedSetup => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as SavedSetup) : { done: false }
  } catch {
    return { done: false }
  }
}

const saveSetup = (key: string, value: SavedSetup) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* the setup still completes for this visit */
  }
}

/**
 * The Studio route entry. First visit shows the two-step setup; after it is
 * finished the route renders the full Studio.
 */
export function StudioEntry() {
  usePageTitle('Studio')
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const storageKey = `clipfarm.studio.onboarding.${user?.id ?? 'guest'}`
  const [done, setDone] = useState(() => readSetup(storageKey).done)
  const [open, setOpen] = useState(() => !readSetup(storageKey).done)

  useEffect(() => {
    if (loading) return
    // A choice already made in the desktop app (saved on the account) counts as done.
    const setup = readSetup(storageKey)
    const done = setup.done || Boolean(user?.workMode)
    setDone(done)
    setOpen(!done)
  }, [storageKey, loading, user?.workMode])


  if (loading) {
    return (
      <div className="grid min-h-svh place-items-center bg-sand" role="status" aria-label="Loading Studio">
        <div className="flex flex-col items-center gap-4">
          <Logo />
          <span className="size-6 animate-spin rounded-full border-2 border-line-strong border-t-ink" aria-hidden />
        </div>
      </div>
    )
  }

  if (done) return <Studio />

  function complete(runtime: StudioRuntime) {
    saveSetup(storageKey, { done: true, runtime, completedAt: new Date().toISOString() })
    setDone(true)
    setOpen(false)
  }

  function close() {
    if (done) {
      setOpen(false)
      return
    }
    navigate(user ? '/dashboard' : '/')
  }

  return (
    <>
      <div className="min-h-svh bg-sand">
        <div className="mx-auto flex w-full max-w-[1180px] items-center justify-between gap-4 px-5 py-5">
          <Logo />
          <Link to={user ? '/dashboard' : '/'} className="inline-flex items-center gap-1.5 text-[0.85rem] font-semibold text-muted hover:text-ink">
            <ArrowLeft aria-hidden className="size-4" />
            {user ? 'Back to dashboard' : 'Back home'}
          </Link>
        </div>

        <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-5 py-16 text-center sm:py-24">
          <span aria-hidden className="grid size-14 place-items-center rounded-full bg-paper text-accent-ink shadow-[var(--shadow-card)]">
            <Sparkles className="size-6" />
          </span>
          <p className="text-[0.75rem] font-semibold tracking-[0.08em] text-muted uppercase">Studio setup</p>
          <h1 className="text-[2rem] leading-[1.05] font-semibold tracking-[-0.04em] text-balance">
            One step before the Studio
          </h1>
          <p className="max-w-md text-[0.95rem] leading-relaxed text-body">
            Choose how Clipfarm runs before you enter the Studio.
          </p>
          <Button onClick={() => setOpen(true)}>Choose how Clipfarm runs</Button>
          <ButtonLink to={user ? '/dashboard' : '/'} variant="secondary">
            {user ? 'Back to dashboard' : 'Back home'}
          </ButtonLink>
          <p className="mt-2 text-[0.76rem] text-muted">This setup is shown once. It takes less than a minute.</p>
        </div>
      </div>

      <StudioOnboarding
        open={open}
        storageKey={storageKey}
        onClose={close}
        onComplete={complete}
      />
    </>
  )
}
