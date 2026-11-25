import { Hono } from 'hono'

import { EMAIL_RE } from '../shared/account'
import auth, { type D1Like } from './auth'
import clips from './clips'
import dashboard from './dashboard'

// The Worker in front of the static site. Accounts, onboarding profiles, plans
// and the dashboard live in D1 (./auth.ts, ./dashboard.ts). The newsletter is
// validated and not stored, so wire it to your email tool to go live.
type Env = { ASSETS: Fetcher; DB: D1Like; GOOGLE_CLIENT_ID?: string; GOOGLE_CLIENT_SECRET?: string }

const app = new Hono<{ Bindings: Env }>()

async function body<T>(req: Request): Promise<T> {
  try {
    const json = await req.json()
    return (json && typeof json === 'object' && !Array.isArray(json) ? json : {}) as T
  } catch {
    return {} as T
  }
}

app.route('/api/auth', auth)
app.route('/api/dashboard', dashboard)
app.route('/api/clips', clips)

app.get('/api/health', (c) => c.json({ ok: true }))

app.post('/api/subscribe', async (c) => {
  const { email } = await body<{ email?: unknown }>(c.req.raw)
  if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) return c.json({ error: 'Enter a valid email address.' }, 400)
  return c.json({ ok: true }, 201)
})

app.all('/api/*', (c) => c.json({ error: 'Not found.' }, 404))

app.all('*', (c) => c.env.ASSETS.fetch(c.req.raw))

export default app
