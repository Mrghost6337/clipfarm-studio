import { net, shell } from 'electron'
import { createHash, randomBytes } from 'node:crypto'
import { EventEmitter } from 'node:events'
import { createServer, type Server } from 'node:http'
import { hostname } from 'node:os'

import type { AuthStatus, AuthUser } from '../shared/ipc'
import { log } from './log'
import type { Vault } from './vault'

const TOKEN_KEY = 'session'
const PROFILE_KEY = 'profile'
const PENDING_MS = 10 * 60 * 1000

type Pending = { state: string; verifier: string; startedAt: number; url: string; server: Server | null; timer: NodeJS.Timeout }

const b64url = (buffer: Buffer) => buffer.toString('base64url')

export type PublicUserLike = AuthUser & Record<string, unknown>

function toAuthUser(user: Record<string, unknown>): AuthUser {
  return {
    id: String(user.id),
    name: String(user.name ?? ''),
    email: String(user.email ?? ''),
    avatarUrl: typeof user.avatarUrl === 'string' ? user.avatarUrl : null,
    planId: typeof user.planId === 'string' ? user.planId : null,
    onboardedAt: typeof user.onboardedAt === 'string' ? user.onboardedAt : null,
    workMode: typeof user.workMode === 'string' ? user.workMode : null,
    termsVersion: typeof user.termsVersion === 'string' ? user.termsVersion : null,
  }
}

const CALLBACK_PAGE = (ok: boolean, message: string) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Clipfarm Studio</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f7f3ec;color:#1c1a14;font:16px/1.5 system-ui,'Segoe UI',sans-serif}
main{max-width:420px;padding:32px;border-radius:26px;background:#fff;box-shadow:0 18px 50px -22px rgb(28 26 20/.4);text-align:center}
h1{font-size:22px;letter-spacing:-.02em;margin:0 0 8px}p{margin:0;color:#4a463e}</style></head>
<body><main><h1>${ok ? 'You are signed in' : 'Sign-in did not finish'}</h1><p>${message}</p></main></body></html>`

/**
 * Browser sign-in for the desktop app: OAuth-style authorization code with
 * PKCE (S256) and state. The browser page sends the one-time code back on the
 * clipfarm:// link, or on a loopback address if the link does not open the app.
 * The long-lived token goes into the OS-encrypted vault and is only ever used
 * by the main process; the page never sees it.
 */
export class Auth extends EventEmitter {
  private status: AuthStatus = { state: 'signed-out' }
  private pending: Pending | null = null

  constructor(
    private readonly vault: Vault,
    private readonly siteOrigin: () => string,
    private readonly focusWindow: () => void,
  ) {
    super()
  }

  getStatus(): AuthStatus {
    return this.status
  }

  token() {
    return this.vault.get(TOKEN_KEY)
  }

  cachedUser(): Record<string, unknown> | null {
    const raw = this.vault.get(PROFILE_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw) as Record<string, unknown>
    } catch {
      return null
    }
  }

  /** Remember the latest profile so the app can open offline. */
  cacheUser(user: Record<string, unknown>) {
    this.vault.set(PROFILE_KEY, JSON.stringify(user))
    if (this.status.state === 'signed-in') this.set({ state: 'signed-in', user: toAuthUser(user), offline: false })
  }

  private set(status: AuthStatus) {
    this.status = status
    this.emit('status', status)
  }

  /** On launch: validate the saved token; open offline with the cached profile if the site is unreachable. */
  async restore(): Promise<AuthStatus> {
    const token = this.token()
    if (!token) {
      this.set({ state: 'signed-out' })
      return this.status
    }
    try {
      const response = await net.fetch(`${this.siteOrigin()}/api/auth/me`, { headers: { authorization: `Bearer ${token}` }, bypassCustomProtocolHandlers: true } as RequestInit)
      const data = (await response.json()) as { user?: Record<string, unknown> | null }
      if (response.ok && data.user) {
        this.vault.set(PROFILE_KEY, JSON.stringify(data.user))
        this.set({ state: 'signed-in', user: toAuthUser(data.user), offline: false })
      } else if (response.ok || response.status === 401) {
        this.expire()
      } else {
        this.offlineOrError(`The account service answered ${response.status}.`)
      }
    } catch (error) {
      log('auth: restore offline', String(error))
      this.offlineOrError('You appear to be offline.')
    }
    return this.status
  }

  private offlineOrError(message: string) {
    const cached = this.cachedUser()
    if (cached) this.set({ state: 'signed-in', user: toAuthUser(cached), offline: true })
    else this.set({ state: 'error', message })
  }

  /** The current account straight from the site (null when signed out or offline). */
  async fetchMe(): Promise<Record<string, unknown> | null> {
    const token = this.token()
    if (!token) return null
    const response = await net.fetch(`${this.siteOrigin()}/api/auth/me`, { headers: { authorization: `Bearer ${token}` }, bypassCustomProtocolHandlers: true } as RequestInit)
    const data = (await response.json()) as { user?: Record<string, unknown> | null }
    return data.user ?? null
  }

  /** The site said the token is not valid any more: forget it, ask to sign in again. */
  expire() {
    if (this.status.state === 'expired') return
    this.vault.delete(TOKEN_KEY)
    this.set({ state: 'expired' })
  }

  setOnline(reachable: boolean) {
    if (this.status.state === 'signed-in' && this.status.offline === reachable) this.set({ ...this.status, offline: !reachable })
  }

  async start(): Promise<AuthStatus> {
    this.cancel()
    const verifier = b64url(randomBytes(48))
    const challenge = b64url(createHash('sha256').update(verifier).digest())
    const state = b64url(randomBytes(24))
    const server = await this.listen(state)
    const port = (server.address() as { port: number }).port
    const url = new URL('/desktop/authorize', this.siteOrigin())
    url.searchParams.set('state', state)
    url.searchParams.set('challenge', challenge)
    url.searchParams.set('redirect', 'clipfarm://auth')
    url.searchParams.set('fallback', `http://127.0.0.1:${port}/callback`)
    const timer = setTimeout(() => {
      if (this.pending?.state !== state) return
      this.cancel()
      this.set({ state: 'error', message: 'The sign-in link expired. Start again.' })
    }, PENDING_MS)
    this.pending = { state, verifier, startedAt: Date.now(), url: url.toString(), server, timer }
    this.set({ state: 'waiting', url: url.toString(), startedAt: new Date().toISOString() })
    try {
      await shell.openExternal(url.toString())
    } catch (error) {
      // No default browser: the screen still offers "Copy link".
      log('auth: could not open the browser', String(error))
    }
    return this.status
  }

  cancel() {
    if (!this.pending) return
    clearTimeout(this.pending.timer)
    this.pending.server?.close()
    this.pending = null
    if (this.status.state === 'waiting') this.set({ state: 'signed-out' })
  }

  private listen(state: string): Promise<Server> {
    return new Promise((resolve, reject) => {
      const server = createServer((req, res) => {
        const url = new URL(req.url ?? '/', 'http://127.0.0.1')
        if (url.pathname !== '/callback') {
          res.writeHead(404).end()
          return
        }
        void this.complete(url.searchParams.get('code'), url.searchParams.get('state')).then((ok) => {
          res.writeHead(ok ? 200 : 400, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' })
          res.end(CALLBACK_PAGE(ok, ok ? 'Go back to Clipfarm Studio. You can close this tab.' : 'Go back to Clipfarm Studio and start the sign-in again.'))
        })
      })
      server.on('error', reject)
      // Loopback only, random port.
      server.listen(0, '127.0.0.1', () => resolve(server))
      void state
    })
  }

  /** A clipfarm://auth?code=…&state=… link from the OS (second instance or first launch). */
  async handleDeepLink(link: string) {
    try {
      const url = new URL(link)
      if (url.protocol !== 'clipfarm:' || url.host !== 'auth') return
      await this.complete(url.searchParams.get('code'), url.searchParams.get('state'))
    } catch {
      /* not a sign-in link */
    }
  }

  private async complete(code: string | null, state: string | null): Promise<boolean> {
    const pending = this.pending
    if (!pending || !code || !state || state !== pending.state) {
      if (this.status.state === 'waiting' || this.status.state === 'exchanging') return false
      // A late or foreign link: ignore it, but say why if nothing is pending.
      if (!pending) this.set({ state: 'error', message: 'That sign-in link does not belong to this app session. Start the sign-in again.' })
      return false
    }
    if (!/^[a-f0-9]{64}$/.test(code)) return false
    clearTimeout(pending.timer)
    pending.server?.close()
    this.pending = null
    this.set({ state: 'exchanging' })
    try {
      const response = await net.fetch(`${this.siteOrigin()}/api/auth/app/token`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code, verifier: pending.verifier, deviceName: `Clipfarm Studio on ${hostname()}`.slice(0, 60) }),
        bypassCustomProtocolHandlers: true,
      } as RequestInit)
      const data = (await response.json().catch(() => ({}))) as { token?: string; user?: Record<string, unknown>; error?: string }
      if (!response.ok || !data.token || !data.user) {
        this.set({ state: 'error', message: data.error ?? `Sign-in failed (${response.status}). Start again.` })
        return false
      }
      this.vault.set(TOKEN_KEY, data.token)
      this.vault.set(PROFILE_KEY, JSON.stringify(data.user))
      this.set({ state: 'signed-in', user: toAuthUser(data.user), offline: false })
      log('auth: signed in')
      this.focusWindow()
      return true
    } catch (error) {
      log('auth: exchange failed', String(error))
      this.set({ state: 'error', message: 'Could not reach Clipfarm to finish signing in. Check your connection and try again.' })
      return false
    }
  }

  async signOut() {
    const token = this.token()
    if (token) {
      try {
        await net.fetch(`${this.siteOrigin()}/api/auth/logout`, { method: 'POST', headers: { authorization: `Bearer ${token}` }, bypassCustomProtocolHandlers: true } as RequestInit)
      } catch {
        /* offline: the token is still forgotten locally, and expires on the server */
      }
    }
    this.vault.delete(TOKEN_KEY)
    this.vault.delete(PROFILE_KEY)
    this.set({ state: 'signed-out' })
  }
}
