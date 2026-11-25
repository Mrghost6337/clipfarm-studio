import { Hono, type Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'

import { CHECKOUT_AVAILABLE, EMAIL_RE, isBilling, isPlanId, isWorkMode, validateProfile, type PublicUser } from '../shared/account'
import { PRIVACY_VERSION, TERMS_VERSION } from '../shared/legal'

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
  avatar_url: string | null
  work_mode: string | null
  terms_version: string | null
  privacy_version: string | null
  terms_accepted_at: string | null
}

export type { PublicUser } from '../shared/account'

const SESSION_COOKIE = 'clipfarm_session'
const OAUTH_STATE_COOKIE = 'clipfarm_oauth_state'
const OAUTH_NEXT_COOKIE = 'clipfarm_oauth_next'
const SESSION_SECONDS = 60 * 60 * 24 * 30
/** Desktop sessions slide: used within the last 15 days of their life, they get 30 more. */
const RENEW_WITHIN_SECONDS = 60 * 60 * 24 * 15
const DEVICE_ID_RE = /^[a-f0-9]{16}$/
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
  ['avatar_url', 'TEXT'],
  ['work_mode', 'TEXT'],
  ['terms_version', 'TEXT'],
  ['privacy_version', 'TEXT'],
  ['terms_accepted_at', 'TEXT'],
] as const

const SESSION_COLUMNS = [
  ['kind', "TEXT NOT NULL DEFAULT 'web'"],
  ['device_name', 'TEXT'],
  ['created_at', 'TEXT'],
  ['last_used_at', 'TEXT'],
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
  const sessionInfo = await db.prepare('PRAGMA table_info(sessions)').all<{ name: string }>()
  const sessionColumns = new Set((sessionInfo.results ?? []).map((row) => row.name))
  for (const [name, type] of SESSION_COLUMNS) {
    if (!sessionColumns.has(name)) await db.prepare(`ALTER TABLE sessions ADD COLUMN ${name} ${type}`).run()
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
  avatarUrl: safeAvatar(row.avatar_url),
  workMode: isWorkMode(row.work_mode) ? row.work_mode : null,
  termsVersion: row.terms_version,
  privacyVersion: row.privacy_version,
  termsAcceptedAt: row.terms_accepted_at,
})

/** Only https pictures from Google's avatar host are kept. */
function safeAvatar(value: string | null | undefined) {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.hostname.endsWith('.googleusercontent.com') ? url.toString() : null
  } catch {
    return null
  }
}

async function startSession(db: D1Like, userId: string, kind: 'web' | 'desktop' = 'web', deviceName: string | null = null) {
  const token = randomHex(32)
  const now = new Date()
  const expires = new Date(now.getTime() + SESSION_SECONDS * 1000).toISOString()
  await db
    .prepare('INSERT INTO sessions (token_hash, user_id, expires_at, kind, device_name, created_at, last_used_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(await sha256Hex(token), userId, expires, kind, deviceName, now.toISOString(), now.toISOString())
    .run()
  return token
}

/** A device name the app sends, shown in the account's device list. */
function cleanDeviceName(value: unknown) {
  const name = typeof value === 'string' ? value.replace(/[^\p{L}\p{N} ._()'-]/gu, '').trim().slice(0, 60) : ''
  return name || 'Clipfarm Studio'
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
  const bearer = bearerToken(c)
  const token = bearer ?? getCookie(c, SESSION_COOKIE)
  if (!token) return null
  const tokenHash = await sha256Hex(token)
  const now = new Date()
  const row = await c.env.DB.prepare('SELECT u.*, s.kind AS session_kind, s.expires_at AS session_expires FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?')
    .bind(tokenHash, now.toISOString())
    .first<UserRow & { session_kind: string | null; session_expires: string }>()
  if (!row) return null
  if (bearer) {
    // Desktop tokens stay valid while the app is used: renew in the last 15 days.
    const renew = row.session_kind === 'desktop' && new Date(row.session_expires).getTime() - now.getTime() < RENEW_WITHIN_SECONDS * 1000
    const expires = renew ? new Date(now.getTime() + SESSION_SECONDS * 1000).toISOString() : row.session_expires
    await c.env.DB.prepare('UPDATE sessions SET last_used_at = ?, expires_at = ? WHERE token_hash = ?').bind(now.toISOString(), expires, tokenHash).run()
  }
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
    avatar_url: null,
    work_mode: null,
    terms_version: null,
    privacy_version: null,
    terms_accepted_at: null,
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
  // Revokes whichever credential made the call: the web cookie or a desktop token.
  for (const token of [getCookie(c, SESSION_COOKIE), bearerToken(c)]) {
    if (token) await c.env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256Hex(token)).run()
  }
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
  const input = await readJson<{ code?: unknown; verifier?: unknown; deviceName?: unknown }>(c.req.raw)
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

  const token = await startSession(c.env.DB, user.id, 'desktop', cleanDeviceName(input.deviceName))
  return c.json({ token, user: publicUser(user) }, 200, { 'cache-control': 'no-store' })
})

// Signed-in desktop apps for this account, newest first. The id is a prefix of
// the token's hash: enough to revoke it, useless as a credential.
auth.get('/devices', async (c) => {
  const user = await currentUser(c)
  if (!user) return c.json({ error: 'Log in first.' }, 401)
  const current = bearerToken(c)
  const currentHash = current ? await sha256Hex(current) : null
  const rows = await c.env.DB.prepare("SELECT token_hash, device_name, created_at, last_used_at, expires_at FROM sessions WHERE user_id = ? AND kind = 'desktop' AND expires_at > ? ORDER BY last_used_at DESC")
    .bind(user.id, new Date().toISOString())
    .all<{ token_hash: string; device_name: string | null; created_at: string | null; last_used_at: string | null; expires_at: string }>()
  return c.json({
    devices: (rows.results ?? []).map((row) => ({
      id: row.token_hash.slice(0, 16),
      name: row.device_name ?? 'Clipfarm Studio',
      createdAt: row.created_at,
      lastUsedAt: row.last_used_at,
      expiresAt: row.expires_at,
      current: row.token_hash === currentHash,
    })),
  })
})

auth.delete('/devices/:id', async (c) => {
  const user = await currentUser(c)
  if (!user) return c.json({ error: 'Log in first.' }, 401)
  const id = c.req.param('id')
  if (!DEVICE_ID_RE.test(id)) return c.json({ error: 'Unknown device.' }, 400)
  const result = (await c.env.DB.prepare("DELETE FROM sessions WHERE user_id = ? AND kind = 'desktop' AND substr(token_hash, 1, 16) = ?").bind(user.id, id).run()) as { meta?: { changes?: number } }
  if (result?.meta?.changes === 0) return c.json({ error: 'That device is already signed out.' }, 404)
  return c.json({ ok: true })
})

// Records that the account accepted the current Terms and Privacy Policy.
auth.post('/terms', async (c) => {
  const user = await currentUser(c)
  if (!user) return c.json({ error: 'Log in first.' }, 401)
  const input = await readJson<{ terms?: unknown; privacy?: unknown }>(c.req.raw)
  if (input.terms !== TERMS_VERSION || input.privacy !== PRIVACY_VERSION) {
    return c.json({ error: 'These are not the current Terms and Privacy Policy. Reload and read them again.', terms: TERMS_VERSION, privacy: PRIVACY_VERSION }, 409)
  }
  await c.env.DB.prepare('UPDATE users SET terms_version = ?, privacy_version = ?, terms_accepted_at = ? WHERE id = ?')
    .bind(TERMS_VERSION, PRIVACY_VERSION, new Date().toISOString(), user.id)
    .run()
  return c.json({ user: await currentUser(c) })
})

// How the account wants to run Clipfarm. Only Local exists today.
auth.patch('/preferences', async (c) => {
  const user = await currentUser(c)
  if (!user) return c.json({ error: 'Log in first.' }, 401)
  const input = await readJson<{ workMode?: unknown }>(c.req.raw)
  if (!isWorkMode(input.workMode)) return c.json({ error: 'Choose Local, Cloud or Both.' }, 400)
  if (input.workMode !== 'local') return c.json({ error: 'Cloud processing is not available yet. Choose Local.', code: 'cloud_unavailable' }, 409)
  await c.env.DB.prepare('UPDATE users SET work_mode = ? WHERE id = ?').bind(input.workMode, user.id).run()
  return c.json({ user: await currentUser(c) })
})

auth.get('/google', (c) => {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = c.env
  const url = new URL(c.req.url)
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) return c.redirect('/login?error=google')

  const state = randomHex(16)
  setCookie(c, OAUTH_STATE_COOKIE, state, { httpOnly: true, sameSite: 'Lax', secure: secureCookie(c.req.url), path: '/', maxAge: 600 })
  const next = safeNext(c.req.query('next'))
  if (next) setCookie(c, OAUTH_NEXT_COOKIE, next, { httpOnly: true, sameSite: 'Lax', secure: secureCookie(c.req.url), path: '/', maxAge: 600 })
  else deleteCookie(c, OAUTH_NEXT_COOKIE, { path: '/' })

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
  const info = (await infoRes.json()) as { sub?: string; email?: string; email_verified?: boolean; name?: string; picture?: string }
  const picture = safeAvatar(info.picture)
  const email = (info.email ?? '').toLowerCase()
  if (!info.sub || !info.email || !email) return c.redirect('/login?error=google')

  const existing = await c.env.DB.prepare('SELECT * FROM users WHERE google_id = ? OR email = ?').bind(info.sub, email).first<UserRow>()
  let userId: string
  if (existing) {
    userId = existing.id
    if (!existing.google_id) await c.env.DB.prepare('UPDATE users SET google_id = ? WHERE id = ?').bind(info.sub, existing.id).run()
    if (picture && picture !== existing.avatar_url) await c.env.DB.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').bind(picture, existing.id).run()
    if (email === ADMIN_EMAIL && existing.role !== 'admin') await c.env.DB.prepare("UPDATE users SET role = 'admin' WHERE id = ?").bind(existing.id).run()
  } else {
    userId = crypto.randomUUID()
    await c.env.DB.prepare('INSERT INTO users (id, email, name, password_hash, google_id, created_at, role, avatar_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(userId, email, str(info.name) || email.split('@')[0], null, info.sub, new Date().toISOString(), email === ADMIN_EMAIL ? 'admin' : 'member', picture)
      .run()
  }

  setSessionCookie(c, await startSession(c.env.DB, userId), c.req.url)
  const next = safeNext(getCookie(c, OAUTH_NEXT_COOKIE))
  deleteCookie(c, OAUTH_NEXT_COOKIE, { path: '/' })
  return c.redirect(next ?? '/dashboard')
})

/** Where Google sign-in may return to: only our own desktop sign-in page or the dashboard. */
function safeNext(value: string | undefined | null) {
  if (!value || value.length > 1500) return null
  if (!value.startsWith('/desktop/authorize') && !value.startsWith('/dashboard')) return null
  if (value.startsWith('//') || value.includes('\\') || /[\r\n]/.test(value)) return null
  return value
}

export default auth
