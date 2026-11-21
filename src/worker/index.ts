import { Hono } from 'hono'

import { availableDays, DATE_RE, EMAIL_RE, isTaken, slotsFor, validateAudit, type AuditInput } from '../shared/audit'

// The Worker in front of the static site. Forms post here and are validated
// with the same rules the browser uses (src/shared/audit.ts). Nothing is
// stored: wire the handlers to your calendar, CRM or email tool to go live.
type Env = { ASSETS: Fetcher }

const app = new Hono<{ Bindings: Env }>()

async function body<T>(req: Request): Promise<T> {
  try {
    const json = await req.json()
    return (json && typeof json === 'object' && !Array.isArray(json) ? json : {}) as T
  } catch {
    return {} as T
  }
}

app.get('/api/health', (c) => c.json({ ok: true }))

// Bookable days in the window, and the free times on one day: ?date=YYYY-MM-DD
app.get('/api/slots', (c) => {
  const date = c.req.query('date')
  if (!date) return c.json({ days: availableDays() })
  if (!DATE_RE.test(date) || Number.isNaN(Date.parse(date))) return c.json({ error: 'Use a date like 2026-11-16.' }, 400)
  if (!availableDays().includes(date)) return c.json({ error: 'That day is outside the booking window.' }, 400)
  return c.json({ date, slots: slotsFor(date).map((s) => s.start) })
})

// Book the free HR audit. 201 with a reference, 400 with field errors, 409 if the time was taken.
app.post('/api/audit', async (c) => {
  const input = await body<AuditInput>(c.req.raw)
  if (typeof input.slot === 'string' && isTaken(input.slot)) return c.json({ error: 'Someone just booked that time. Pick another.', fields: { slot: 'That time was just taken.' } }, 409)
  const fields = validateAudit(input)
  if (Object.keys(fields).length) return c.json({ error: 'Check the highlighted fields.', fields }, 400)
  const ref = 'PFP-' + crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase()
  return c.json({ ok: true, ref, slot: input.slot }, 201)
})

app.post('/api/subscribe', async (c) => {
  const { email } = await body<{ email?: unknown }>(c.req.raw)
  if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) return c.json({ error: 'Enter a valid email address.' }, 400)
  return c.json({ ok: true }, 201)
})

app.all('/api/*', (c) => c.json({ error: 'Not found.' }, 404))

app.all('*', (c) => c.env.ASSETS.fetch(c.req.raw))

export default app
