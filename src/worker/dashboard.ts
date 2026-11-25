import { Hono } from 'hono'

import { currentUser, ensureSchema, type AuthBindings } from './auth'
import { buildDashboard, ensureClipsSchema } from './clips'

// /api/dashboard returns the signed-in account's real numbers, read from the
// sources, clips and clip_events tables the pipeline writes to.

const app = new Hono<{ Bindings: AuthBindings }>()

app.get('/', async (c) => {
  const user = await currentUser(c)
  if (!user) return c.json({ error: 'Log in to see your dashboard.' }, 401)
  await ensureSchema(c.env.DB)
  await ensureClipsSchema(c.env.DB)
  return c.json(await buildDashboard(c.env.DB, user))
})

export default app
