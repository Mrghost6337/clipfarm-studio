import { CheckCircle2, ExternalLink, ShieldCheck } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router'

import { ArrowButton, ButtonLink } from '../components/Button'
import { Notice, TextField } from '../components/Field'
import { LogoMark } from '../components/Logo'
import { Segmented } from '../components/Segmented'
import { postJson } from '../lib/api'
import { nextRoute, useAuth } from '../lib/auth'
import { usePageTitle } from '../lib/title'

// The desktop app opens this page in the system browser. The browser keeps the
// HttpOnly web session; the app only receives a one-time code that it exchanges
// for its own token with a PKCE verifier that never leaves the app.

type Mode = 'login' | 'signup'

const STATE_RE = /^[A-Za-z0-9_-]{8,128}$/
const CHALLENGE_RE = /^[A-Za-z0-9_-]{43}$/

type AppLink =
  | { kind: 'app'; state: string; challenge: string; redirect: string }
  | { kind: 'browser' }
  | { kind: 'invalid'; reason: string }

/** Only the Clipfarm app scheme and an explicit loopback callback are allowed. */
function isAllowedRedirect(value: string) {
  try {
    const url = new URL(value)
    if (url.protocol === 'clipfarm:') return url.host === 'auth' && !url.username && !url.password
    const loopback = url.hostname === '127.0.0.1' || url.hostname === 'localhost'
    return url.protocol === 'http:' && loopback && url.port !== '' && !url.username && !url.password
  } catch {
    return false
  }
}

function readLink(search: string): AppLink {
  const params = new URLSearchParams(search)
  if (!params.has('state') && !params.has('challenge') && !params.has('redirect')) return { kind: 'browser' }

  const state = params.get('state') ?? ''
  const challenge = params.get('challenge') ?? ''
  const redirect = params.get('redirect') ?? 'clipfarm://auth'
  if (!STATE_RE.test(state) || !CHALLENGE_RE.test(challenge)) {
    return { kind: 'invalid', reason: 'This sign-in link is incomplete. Open Clipfarm Studio and choose “Log in with browser” again.' }
  }
  if (!isAllowedRedirect(redirect)) {
    return { kind: 'invalid', reason: 'This sign-in link points to an app Clipfarm does not recognise. Open Clipfarm Studio and try again.' }
  }
  return { kind: 'app', state, challenge, redirect }
}

function initialsFor(name: string, email: string) {
  const source = name.trim() || email
  return source
    .split(/\s+/)
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function AppLogin() {
  usePageTitle('Sign in to the app')
  const { search } = useLocation()
  const link = useMemo(() => readLink(search), [search])
  const auth = useAuth()
  const heading = useRef<HTMLHeadingElement>(null)

  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fields, setFields] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [code, setCode] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [connectError, setConnectError] = useState('')
  const [opening, setOpening] = useState(false)

  const connect = useCallback(async () => {
    if (link.kind !== 'app') return
    setConnecting(true)
    setConnectError('')
    const res = await postJson<{ code: string; expiresAt: string }>('/api/auth/app/authorize', { state: link.state, challenge: link.challenge })
    setConnecting(false)
    if (res.ok) setCode(res.code)
    else setConnectError(res.error)
  }, [link])

  // Someone already signed in on this browser: mint the code straight away.
  useEffect(() => {
    if (link.kind !== 'app' || !auth.user || code || connecting || connectError) return
    void connect()
  }, [link.kind, auth.user, code, connecting, connectError, connect])

  useEffect(() => {
    heading.current?.focus()
  }, [mode, link.kind, Boolean(auth.user)])

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setFields({})
    setSending(true)
    const res = mode === 'login' ? await auth.signIn(email.trim(), password) : await auth.signUp(name.trim(), email.trim(), password)
    setSending(false)
    if (!res.ok) {
      setError(res.error)
      if (res.fields) setFields(res.fields)
    }
  }

  async function openApp() {
    if (link.kind !== 'app') return
    setOpening(true)
    setConnectError('')
    const res = await postJson<{ code: string; expiresAt: string }>('/api/auth/app/authorize', { state: link.state, challenge: link.challenge })
    setOpening(false)
    if (!res.ok) {
      setCode(null)
      setConnectError(res.error)
      return
    }
    setCode(res.code)
    const target = new URL(link.redirect)
    target.searchParams.set('code', res.code)
    target.searchParams.set('state', link.state)
    window.location.href = target.toString()
  }

  async function switchAccount() {
    await auth.signOut()
    setCode(null)
    setConnectError('')
    setMode('login')
    setPassword('')
    setFields({})
    setError('')
  }

  const app = link.kind === 'app'
  const signedIn = Boolean(auth.user)
  const headingText = app ? (signedIn ? "You're signed in" : mode === 'login' ? 'Log in to connect' : 'Create your account') : signedIn ? "You're signed in" : mode === 'login' ? 'Welcome back' : 'Create an account'

  return (
    <section className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-sand px-4 py-12">
      <meta name="referrer" content="no-referrer" />
      <meta name="robots" content="noindex" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[55%] bg-[radial-gradient(60%_60%_at_50%_0%,rgb(245_183_101/0.22),transparent_72%)]" />

      <div className="relative w-full max-w-[430px]">
        <div className="flex flex-col items-center gap-2 text-center">
          <LogoMark className="size-11 text-ink" />
          <span className="text-[1.35rem] leading-none font-bold tracking-[-0.045em] text-ink">Clipfarm Studio</span>
          <span className="mt-1 inline-flex items-center rounded-full border border-line-strong bg-paper px-3 py-1 text-[0.7rem] font-semibold tracking-[0.08em] text-muted uppercase">Desktop app</span>
        </div>

        <div className="mt-7 rounded-[var(--radius-xl)] border border-line bg-paper p-6 shadow-[var(--shadow-raise)] sm:p-8">
          {auth.loading ? (
            <p role="status" className="py-12 text-center text-[0.95rem] text-muted">
              Checking your session…
            </p>
          ) : link.kind === 'invalid' ? (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <h1 ref={heading} tabIndex={-1} className="text-[1.55rem] font-semibold tracking-[-0.03em] focus:outline-none">
                  This link cannot sign you in
                </h1>
                <p className="text-[0.95rem] leading-relaxed text-body">Nothing was sent to the app. Close this tab and start again from Clipfarm Studio.</p>
              </div>
              <Notice>{link.reason}</Notice>
              <Link to="/login" className="inline-flex min-h-10 items-center self-start text-[0.85rem] font-semibold text-ink underline decoration-accent decoration-2 underline-offset-4">
                Log in on the website instead
              </Link>
            </div>
          ) : app && signedIn ? (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col items-center gap-3 text-center">
                <span aria-hidden className="grid size-12 place-items-center rounded-full bg-success-soft text-success">
                  <CheckCircle2 className="size-6" />
                </span>
                <h1 ref={heading} tabIndex={-1} className="text-[1.55rem] font-semibold tracking-[-0.03em] focus:outline-none">
                  {headingText}
                </h1>
                <p className="max-w-[19rem] text-[0.95rem] leading-relaxed text-body">Open Clipfarm Studio to finish. Once the app opens, you can close this page.</p>
              </div>

              <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-line bg-sand px-4 py-3">
                <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-ink text-[0.78rem] font-bold text-white">
                  {initialsFor(auth.user!.name, auth.user!.email)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[0.9rem] font-semibold text-ink">{auth.user!.name}</p>
                  <p className="truncate text-[0.8rem] text-muted">{auth.user!.email}</p>
                </div>
              </div>

              {connectError ? (
                <Notice>{connectError}</Notice>
              ) : (
                <p role="status" className="text-center text-[0.8rem] leading-relaxed text-muted">
                  {code ? 'Your one-time code is ready. It works once and expires in 5 minutes.' : 'Preparing a secure one-time code…'}
                </p>
              )}

              <div className="flex flex-col gap-1">
                <ArrowButton type="button" size="lg" loading={opening || connecting} onClick={openApp} disabled={!code && !connectError} className="w-full justify-between">
                  Open Clipfarm Studio
                  <ExternalLink aria-hidden className="size-4" />
                </ArrowButton>
                <button
                  type="button"
                  onClick={switchAccount}
                  className="mt-1 min-h-11 rounded-full px-3 text-[0.85rem] font-semibold text-muted transition-colors hover:text-ink focus-visible:outline-[2.5px] focus-visible:outline-offset-3 focus-visible:outline-ink"
                >
                  Not you? Use a different account
                </button>
              </div>

              <p className="text-center text-[0.8rem] leading-relaxed text-muted">Nothing happened? Open Clipfarm Studio from the Start menu, then close this tab.</p>
            </div>
          ) : signedIn ? (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <h1 ref={heading} tabIndex={-1} className="text-[1.55rem] font-semibold tracking-[-0.03em] focus:outline-none">
                  You're signed in
                </h1>
                <p className="text-[0.95rem] leading-relaxed text-body">
                  This browser is signed in as <span className="font-semibold text-ink">{auth.user!.email}</span>. You can close this page.
                </p>
              </div>
              <ButtonLink to={nextRoute(auth.user)} className="w-full">
                Open the dashboard
              </ButtonLink>
              <button type="button" onClick={switchAccount} className="min-h-11 self-center rounded-full px-3 text-[0.85rem] font-semibold text-muted transition-colors hover:text-ink focus-visible:outline-[2.5px] focus-visible:outline-offset-3 focus-visible:outline-ink">
                Sign out
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <Segmented<Mode>
                label="Log in or create an account"
                value={mode}
                onChange={(next) => {
                  setMode(next)
                  setFields({})
                  setError('')
                }}
                options={[
                  { value: 'login', label: 'Log in' },
                  { value: 'signup', label: 'Create account' },
                ]}
              />

              <div className="flex flex-col gap-2">
                <h1 ref={heading} tabIndex={-1} className="text-[1.55rem] font-semibold tracking-[-0.03em] focus:outline-none">
                  {headingText}
                </h1>
                <p className="text-[0.95rem] leading-relaxed text-body">
                  {app ? 'Use your Clipfarm account. When you are done, the app gets a one-time code — never your password.' : 'Sign in to your Clipfarm account.'}
                </p>
              </div>

              {link.kind === 'browser' && <Notice tone="info">This page is opened by the Clipfarm Studio app. Open the app and choose “Log in with browser” to connect it to your account.</Notice>}
              {error && <Notice>{error}</Notice>}

              <form onSubmit={submit} noValidate className="flex flex-col gap-5">
                {mode === 'signup' && <TextField label="Your name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} error={fields.name} />}
                <TextField label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={fields.email} />
                <TextField
                  label="Password"
                  type="password"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={fields.password}
                  hint={mode === 'signup' ? 'At least 8 characters.' : undefined}
                />
                <ArrowButton type="submit" loading={sending} className="w-full justify-between">
                  {mode === 'login' ? (app ? 'Log in and connect' : 'Log in') : app ? 'Create account and connect' : 'Create account'}
                </ArrowButton>
              </form>

              <p className="text-[0.8125rem] leading-relaxed text-muted">
                {mode === 'login' ? (
                  <>
                    New here?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('signup')
                        setError('')
                        setFields({})
                      }}
                      className="font-semibold text-ink underline decoration-accent decoration-2 underline-offset-4"
                    >
                      Create an account
                    </button>
                  </>
                ) : (
                  <>
                    By creating an account you agree to clip only footage you have the rights to use. Already have one?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login')
                        setError('')
                        setFields({})
                      }}
                      className="font-semibold text-ink underline decoration-accent decoration-2 underline-offset-4"
                    >
                      Log in
                    </button>
                  </>
                )}
              </p>
            </div>
          )}
        </div>

        <p className="mt-5 flex items-start justify-center gap-2 px-2 text-center text-[0.78rem] leading-relaxed text-muted">
          <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
          <span>Your password is only sent to clipfarm.studio. The app receives a one-time code, never your password.</span>
        </p>
      </div>
    </section>
  )
}
