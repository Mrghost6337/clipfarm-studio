import { Hono, type Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'

import { CHECKOUT_AVAILABLE, EMAIL_RE, isBilling, isPlanId, validateProfile, type PublicUser } from '../shared/account'

// Accounts for Clipfarm Studio. Users and sessions live in D1 (binding DB);
// passwords are PBKDF2-SHA256 hashes with a per-user salt and sessions are
// opaque tokens stored as SHA-256 hashes. Google sign-in turns on as soon as
// GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set on the Worker.
//
// Every account can save an onboarding profile and choose a plan. The email in
// ADMIN_EMAIL always gets the admin role.

const ADMIN_EMAIL = 'snelle.edward@gmail.com'

type D1PreparedStatement = {
  bind: (...values: unknown[]) => D1PreparedStatement
  first: <T = Record<string, unknown>>() => Promise<T | null>
  all: <T = Record<string, unknown>>() => Promise<{ results?: T[] }>
  run: () => Promise<unknown>
}

export type D1Like = { prepare: (sql: string) => D1PreparedStatement }

export type AuthBindings = {
  DB: D1Like
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
}

type UserRow = {
  id: string
  email: string
  name: string
  password_hash: string | null
  google_id: string | null
  created_at: string
  role: string | null
  channel: string | null
  platform: string | null
  audience: string | null
  clip_areas: string | null
  caption_style: string | null
  cadence: string | null
  onboarded_at: string | null
  plan_id: string | null
  billing: string | null
  plan_started_at: string | null
  plan_verified_at: string | null
  payment_provider: string | null
  payment_ref: string | null
}

export type { PublicUser } from '../shared/account'

const SESSION_COOKIE = 'clipfarm_session'
const OAUTH_STATE_COOKIE = 'clipfarm_oauth_state'
const SESSION_SECONDS = 60 * 60 * 24 * 30
const PBKDF2_ITERATIONS = 100_000
const MIN_PASSWORD = 8

// Desktop-app sign-in: the browser page mints a one-time code that the app
// exchanges for a bearer token, proving it holds the PKCE verifier.
const APP_CODE_SECONDS = 5 * 60
const APP_CODE_RE = /^[a-f0-9]{64}$/
const APP_CHALLENGE_RE = /^[A-Za-z0-9_-]{43}$/
const APP_STATE_RE = /^[A-Za-z0-9_-]{8,128}$/

const encoder = new TextEncoder()

const toB64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes))
const fromB64 = (value: string) => Uint8Array.from(atob(value), (c) => c.charCodeAt(0)) as Uint8Array<ArrayBuffer>

function randomHex(bytes: number) {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (b) => b.toString(16).padStart(2, '0')).join('')
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Base64url SHA-256, the PKCE S256 challenge format. */
async function sha256B64Url(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value))
  return toB64(new Uint8Array(digest)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/** Desktop clients send `Authorization: Bearer <session token>`. */
function bearerToken(c: Context<{ Bindings: AuthBindings }>) {
  const header = c.req.header('authorization') ?? ''
  const match = /^Bearer\s+([a-f0-9]{64})$/i.exec(header)
  return match?.[1]?.toLowerCase() ?? null
}

async function derive(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, key, 256)
  return new Uint8Array(bits)
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const hash = await derive(password, salt, PBKDF2_ITERATIONS)
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toB64(salt)}$${toB64(hash)}`
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, iterations, salt, hash] = stored.split('$')
  if (scheme !== 'pbkdf2' || !iterations || !salt || !hash) return false
  const expected = fromB64(hash)
  const actual = await derive(password, fromB64(salt), Number(iterations))
  if (actual.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i]
  return diff === 0
}

const COLUMNS = [
  ['role', "TEXT NOT NULL DEFAULT 'member'"],
  ['channel', 'TEXT'],
  ['platform', 'TEXT'],
  ['audience', 'TEXT'],
  ['clip_areas', 'TEXT'],
  ['caption_style', 'TEXT'],
  ['cadence', 'TEXT'],
  ['onboarded_at', 'TEXT'],
  ['plan_id', 'TEXT'],
  ['billing', 'TEXT'],
  ['plan_started_at', 'TEXT'],
  // A paid plan counts only when a payment provider confirmed it server-side.
  // Nothing writes these yet: checkout is not built (CHECKOUT_AVAILABLE).
  ['plan_verified_at', 'TEXT'],
  ['payment_provider', 'TEXT'],
  ['payment_ref', 'TEXT'],
] as const

const schemas = new WeakMap<object, Promise<void>>()

async function migrate(db: D1Like) {
  await db.prepare('CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, password_hash TEXT, google_id TEXT UNIQUE, created_at TEXT NOT NULL)').run()
  await db.prepare('CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at TEXT NOT NULL)').run()
  await db.prepare('CREATE TABLE IF NOT EXISTS app_codes (code_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, challenge TEXT NOT NULL, state TEXT, created_at TEXT NOT NULL, expires_at TEXT NOT NULL, used_at TEXT)').run()
  const info = await db.prepare('PRAGMA table_info(users)').all<{ name: string }>()
  const existing = new Set((info.results ?? []).map((row) => row.name))
  for (const [name, type] of COLUMNS) {
    if (!existing.has(name)) await db.prepare(`ALTER TABLE users ADD COLUMN ${name} ${type}`).run()
  }
}

export function ensureSchema(db: D1Like) {
  let ready = schemas.get(db)
  if (!ready) {
    ready = migrate(db).catch((error) => {
      schemas.delete(db)
      throw error
    })
    schemas.set(db, ready)
  }
  return ready
}

const parseAreas = (value: string | null) => {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []
  } catch {
    return []
  }
}

const publicUser = (row: UserRow): PublicUser => ({
  id: row.id,
  name: row.name,
  email: row.email,
  createdAt: row.created_at,
  role: row.email.toLowerCase() === ADMIN_EMAIL ? 'admin' : row.role === 'admin' ? 'admin' : 'member',
  channel: row.channel,
  platform: row.platform,
  audience: row.audience,
  clipAreas: parseAreas(row.clip_areas),
  captionStyle: row.caption_style,
  cadence: row.cadence,
  onboardedAt: row.onboarded_at,
  planId: isPlanId(row.plan_id) && row.plan_verified_at ? row.plan_id : null,
  requestedPlanId: isPlanId(row.plan_id) && !row.plan_verified_at ? row.plan_id : null,
  billing: isBilling(row.billing) && row.plan_verified_at ? row.billing : null,
  planStartedAt: row.plan_verified_at ? row.plan_started_at : null,
  planVerifiedAt: row.plan_verified_at,
})

async function startSession(db: D1Like, userId: string) {
  const token = randomHex(32)
  const expires = new Date(Date.now() + SESSION_SECONDS * 1000).toISOString()
  await db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').bind(await sha256Hex(token), userId, expires).run()
  return token
}

const auth = new Hono<{ Bindings: AuthBindings }>()

const secureCookie = (url: string) => new URL(url).protocol === 'https:'

function setSessionCookie(c: Context<{ Bindings: AuthBindings }>, token: string, url: string) {
  setCookie(c, SESSION_COOKIE, token, { httpOnly: true, sameSite: 'Lax', secure: secureCookie(url), path: '/', maxAge: SESSION_SECONDS })
}

async function readJson<T>(request: Request): Promise<T> {
  try {
    const json = await request.json()
    return (json && typeof json === 'object' && !Array.isArray(json) ? json : {}) as T
  } catch {
    return {} as T
  }
}

const str = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

/** The signed-in account, or null. Used by the dashboard routes too. */
export async function currentUser(c: Context<{ Bindings: AuthBindings }>): Promise<PublicUser | null> {
  const token = bearerToken(c) ?? getCookie(c, SESSION_COOKIE)
  if (!token) return null
  const row = await c.env.DB.prepare('SELECT * FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?')
    .bind(await sha256Hex(token), new Date().toISOString())
    .first<UserRow>()
  if (!row) return null
  if (row.email.toLowerCase() === ADMIN_EMAIL && row.role !== 'admin') {
    await c.env.DB.prepare("UPDATE users SET role = 'admin' WHERE id = ?").bind(row.id).run()
    row.role = 'admin'
  }
  return publicUser(row)
}

auth.use('*', async (c, next) => {
  await ensureSchema(c.env.DB)
  await next()
})

auth.get('/me', async (c) => {
  const user = await currentUser(c)
  return c.json({ user })
})

auth.post('/signup', async (c) => {
  const input = await readJson<{ name?: unknown; email?: unknown; password?: unknown }>(c.req.raw)
  const name = str(input.name)
  const email = str(input.email).toLowerCase()
  const password = typeof input.password === 'string' ? input.password : ''

  const fields: Record<string, string> = {}
  if (name.length < 2) fields.name = 'Enter your name.'
  if (!EMAIL_RE.test(email)) fields.email = 'Enter a valid email.'
  if (password.length < MIN_PASSWORD) fields.password = `Use at least ${MIN_PASSWORD} characters.`
  if (Object.keys(fields).length) return c.json({ error: 'Check the highlighted fields.', fields }, 400)

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first<{ id: string }>()
  if (existing) return c.json({ error: 'That email already has an account. Log in instead.', fields: { email: 'This email is already registered.' } }, 409)

  const row: UserRow = {
    id: crypto.randomUUID(),
    email,
    name,
    password_hash: await hashPassword(password),
    google_id: null,
    created_at: new Date().toISOString(),
    role: email === ADMIN_EMAIL ? 'admin' : 'member',
    channel: null,
    platform: null,
    audience: null,
    clip_areas: null,
    caption_style: null,
    cadence: null,
    onboarded_at: null,
    plan_id: null,
    billing: null,
    plan_started_at: null,
    plan_verified_at: null,
    payment_provider: null,
    payment_ref: null,
  }
  await c.env.DB.prepare('INSERT INTO users (id, email, name, password_hash, google_id, created_at, role) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(row.id, row.email, row.name, row.password_hash, null, row.created_at, row.role)
    .run()

  setSessionCookie(c, await startSession(c.env.DB, row.id), c.req.url)
  return c.json({ user: publicUser(row) }, 201)
})

auth.post('/login', async (c) => {
  const input = await readJson<{ email?: unknown; password?: unknown }>(c.req.raw)
  const email = str(input.email).toLowerCase()
  const password = typeof input.password === 'string' ? input.password : ''

  if (!EMAIL_RE.test(email) || !password) return c.json({ error: 'Enter your email and password.' }, 400)

  const row = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first<UserRow>()
  if (!row || !row.password_hash || !(await verifyPassword(password, row.password_hash))) {
    return c.json({ error: 'That email and password do not match.' }, 401)
  }

  if (row.email.toLowerCase() === ADMIN_EMAIL && row.role !== 'admin') {
    await c.env.DB.prepare("UPDATE users SET role = 'admin' WHERE id = ?").bind(row.id).run()
    row.role = 'admin'
  }

  setSessionCookie(c, await startSession(c.env.DB, row.id), c.req.url)
  return c.json({ user: publicUser(row) })
})

auth.post('/logout', async (c) => {
  const token = getCookie(c, SESSION_COOKIE)
  if (token) await c.env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256Hex(token)).run()
  deleteCookie(c, SESSION_COOKIE, { path: '/' })
  deleteCookie(c, OAUTH_STATE_COOKIE, { path: '/' })
  return c.json({ ok: true })
})

// Save the onboarding profile. `{ skip: true }` marks the account as set up
// without asking for the fields.
auth.post('/profile', async (c) => {
  const user = await currentUser(c)
  if (!user) return c.json({ error: 'Log in to edit your channel.' }, 401)
  const input = await readJson<Record<string, unknown>>(c.req.raw)

  if (input.skip === true) {
    await c.env.DB.prepare('UPDATE users SET onboarded_at = ? WHERE id = ?').bind(new Date().toISOString(), user.id).run()
    return c.json({ user: await currentUser(c) })
  }

  const fields = validateProfile(input)
  if (Object.keys(fields).length) return c.json({ error: 'Check the highlighted fields.', fields }, 400)

  const areas = (input.clipAreas as unknown[]).filter((v): v is string => typeof v === 'string')
  await c.env.DB.prepare('UPDATE users SET channel = ?, platform = ?, audience = ?, clip_areas = ?, caption_style = ?, cadence = ?, onboarded_at = ? WHERE id = ?')
    .bind(str(input.channel), str(input.platform), str(input.audience), JSON.stringify(areas.slice(0, 5)), str(input.captionStyle), str(input.cadence), new Date().toISOString(), user.id)
    .run()
  return c.json({ user: await currentUser(c) })
})

// Paid plans are granted only by a verified payment (a provider webhook that
// sets plan_verified_at). This route never upgrades an account by itself.
auth.post('/plan', async (c) => {
  const user = await currentUser(c)
  if (!user) return c.json({ error: 'Log in to choose a plan.' }, 401)
  const input = await readJson<{ planId?: unknown; billing?: unknown }>(c.req.raw)
  if (!isPlanId(input.planId)) return c.json({ error: 'Choose one of the three plans.' }, 400)
  if (!CHECKOUT_AVAILABLE) {
    return c.json({ error: 'Paid plans open when checkout launches. Your account stays on the Free plan until then.', code: 'checkout_unavailable' }, 402)
  }
  return c.json({ error: 'Start checkout to upgrade. Your plan changes after the payment is confirmed.', code: 'checkout_required' }, 402)
})

// The signed-in browser page asks for a one-time code. The code is returned to
// the page and written into the app's deep link; only its hash is stored.
auth.post('/app/authorize', async (c) => {
  const user = await currentUser(c)
  if (!user) return c.json({ error: 'Log in to connect the app.' }, 401)

  const input = await readJson<{ challenge?: unknown; state?: unknown }>(c.req.raw)
  const challenge = str(input.challenge)
  const state = str(input.state)
  if (!APP_CHALLENGE_RE.test(challenge) || (state && !APP_STATE_RE.test(state))) {
    return c.json({ error: 'This sign-in link is not valid. Start again from the app.' }, 400)
  }

  const now = new Date()
  const expires = new Date(now.getTime() + APP_CODE_SECONDS * 1000)
  await c.env.DB.prepare('DELETE FROM app_codes WHERE expires_at < ?').bind(now.toISOString()).run()

  const code = randomHex(32)
  await c.env.DB.prepare('INSERT INTO app_codes (code_hash, user_id, challenge, state, created_at, expires_at, used_at) VALUES (?, ?, ?, ?, ?, ?, NULL)')
    .bind(await sha256Hex(code), user.id, challenge, state || null, now.toISOString(), expires.toISOString())
    .run()

  return c.json({ code, expiresAt: expires.toISOString() }, 201, { 'cache-control': 'no-store' })
})

// The desktop app exchanges the code with its private PKCE verifier. No cookie
// is involved, so the app never needs the browser session.
auth.post('/app/token', async (c) => {
  const input = await readJson<{ code?: unknown; verifier?: unknown }>(c.req.raw)
  const code = str(input.code).toLowerCase()
  const verifier = typeof input.verifier === 'string' ? input.verifier : ''
  if (!APP_CODE_RE.test(code) || verifier.length < 43 || verifier.length > 128) {
    return c.json({ error: 'That sign-in link is not valid.' }, 400)
  }

  const row = await c.env.DB.prepare('SELECT code_hash, user_id, challenge, expires_at, used_at FROM app_codes WHERE code_hash = ?')
    .bind(await sha256Hex(code))
    .first<{ code_hash: string; user_id: string; challenge: string; expires_at: string; used_at: string | null }>()
  if (!row || row.expires_at <= new Date().toISOString()) {
    return c.json({ error: 'This sign-in link has expired. Open Clipfarm Studio and try again.' }, 401)
  }
  if (row.used_at) return c.json({ error: 'This sign-in link was already used. Open Clipfarm Studio and try again.' }, 409)
  if (!constantTimeEqual(await sha256B64Url(verifier), row.challenge)) {
    return c.json({ error: 'This sign-in link cannot be verified.' }, 401)
  }

  // Burn the code before issuing anything, so it works exactly once.
  const claim = (await c.env.DB.prepare('UPDATE app_codes SET used_at = ? WHERE code_hash = ? AND used_at IS NULL')
    .bind(new Date().toISOString(), row.code_hash)
    .run()) as { meta?: { changes?: number } }
  if (claim?.meta?.changes === 0) return c.json({ error: 'This sign-in link was already used.' }, 409)

  const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(row.user_id).first<UserRow>()
  if (!user) return c.json({ error: 'That account no longer exists.' }, 401)

  return c.json({ token: await startSession(c.env.DB, user.id), user: publicUser(user) }, 200, { 'cache-control': 'no-store' })
})

auth.get('/google', (c) => {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = c.env
  const url = new URL(c.req.url)
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) return c.redirect('/login?error=google')

  const state = randomHex(16)
  setCookie(c, OAUTH_STATE_COOKIE, state, { httpOnly: true, sameSite: 'Lax', secure: secureCookie(c.req.url), path: '/', maxAge: 600 })

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: `${url.origin}/api/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  })
  return c.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`)
})

auth.get('/google/callback', async (c) => {
  const url = new URL(c.req.url)
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = c.env
  const code = c.req.query('code')
  const state = c.req.query('state')
  const expected = getCookie(c, OAUTH_STATE_COOKIE)
  deleteCookie(c, OAUTH_STATE_COOKIE, { path: '/' })
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !code || !state || !expected || state !== expected) return c.redirect('/login?error=google')

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: `${url.origin}/api/auth/google/callback`,
      grant_type: 'authorization_code',
    }),
  })
  if (!tokenRes.ok) return c.redirect('/login?error=google')
  const tokens = (await tokenRes.json()) as { access_token?: string }
  if (!tokens.access_token) return c.redirect('/login?error=google')

  const infoRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { authorization: `Bearer ${tokens.access_token}` } })
  if (!infoRes.ok) return c.redirect('/login?error=google')
  const info = (await infoRes.json()) as { sub?: string; email?: string; email_verified?: boolean; name?: string }
  const email = (info.email ?? '').toLowerCase()
  if (!info.sub || !info.email || !email) return c.redirect('/login?error=google')

  const existing = await c.env.DB.prepare('SELECT * FROM users WHERE google_id = ? OR email = ?').bind(info.sub, email).first<UserRow>()
  let userId: string
  if (existing) {
    userId = existing.id
    if (!existing.google_id) await c.env.DB.prepare('UPDATE users SET google_id = ? WHERE id = ?').bind(info.sub, existing.id).run()
    if (email === ADMIN_EMAIL && existing.role !== 'admin') await c.env.DB.prepare("UPDATE users SET role = 'admin' WHERE id = ?").bind(existing.id).run()
  } else {
    userId = crypto.randomUUID()
    await c.env.DB.prepare('INSERT INTO users (id, email, name, password_hash, google_id, created_at, role) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(userId, email, str(info.name) || email.split('@')[0], null, info.sub, new Date().toISOString(), email === ADMIN_EMAIL ? 'admin' : 'member')
      .run()
  }

  setSessionCookie(c, await startSession(c.env.DB, userId), c.req.url)
  return c.redirect('/dashboard')
})

export default auth
