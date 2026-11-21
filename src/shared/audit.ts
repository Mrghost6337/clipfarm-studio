// Booking rules shared by the browser and the Worker: the audit form's
// validation and the demo availability calendar. Swap `slotsFor` for your
// calendar provider's free/busy API when you go live.

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export const HEADCOUNTS = ['1–10', '11–30', '31–60', '61–120', '121–300', '300+'] as const
export const STAGES = ['Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C+', 'Bootstrapped'] as const
export const FOCUS_AREAS = ['Hiring', 'Onboarding', 'Performance reviews', 'Compensation', 'Career levels', 'Policies and handbook', 'Compliance', 'Culture', 'Manager training', 'Multi-country hiring', 'People team hiring', 'Restructuring'] as const
export const MAX_FOCUS = 5
export const MAX_NOTES = 800
export const BOOKING_WINDOW_DAYS = 21

/** Audit start times, in UTC. */
const TIMES_UTC = ['08:00', '09:00', '10:30', '12:00', '13:30', '15:00', '16:30', '18:00']

export type AuditInput = {
  name?: unknown
  email?: unknown
  company?: unknown
  role?: unknown
  headcount?: unknown
  stage?: unknown
  focus?: unknown
  notes?: unknown
  slot?: unknown
}

export type Fields = Partial<Record<'name' | 'email' | 'company' | 'role' | 'headcount' | 'stage' | 'focus' | 'notes' | 'slot', string>>

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

export function validateCompany(input: AuditInput): Fields {
  const f: Fields = {}
  if (str(input.name).length < 2) f.name = 'Enter your name.'
  if (!EMAIL_RE.test(str(input.email))) f.email = 'Enter a valid work email.'
  if (str(input.company).length < 2) f.company = 'Enter your company name.'
  if (!HEADCOUNTS.includes(str(input.headcount) as (typeof HEADCOUNTS)[number])) f.headcount = 'Choose your team size.'
  if (!STAGES.includes(str(input.stage) as (typeof STAGES)[number])) f.stage = 'Choose your stage.'
  return f
}

export function validateFocus(input: AuditInput): Fields {
  const f: Fields = {}
  const focus = Array.isArray(input.focus) ? input.focus : []
  if (!focus.length) f.focus = 'Pick at least one area.'
  else if (focus.length > MAX_FOCUS) f.focus = `Pick up to ${MAX_FOCUS} areas.`
  else if (focus.some((x) => !FOCUS_AREAS.includes(x as (typeof FOCUS_AREAS)[number]))) f.focus = 'Pick areas from the list.'
  if (str(input.notes).length > MAX_NOTES) f.notes = `Keep it under ${MAX_NOTES} characters.`
  return f
}

/** A slot is an ISO instant on the hour or half hour, e.g. 2026-11-16T09:00:00.000Z. */
export function validateSlot(input: AuditInput, now = new Date()): Fields {
  const slot = str(input.slot)
  if (!slot) return { slot: 'Pick a time.' }
  const date = slot.slice(0, 10)
  const days = availableDays(now)
  if (!days.includes(date) || !slotsFor(date, now).some((s) => s.start === slot)) return { slot: 'That time is not available. Pick another.' }
  return {}
}

export function validateAudit(input: AuditInput, now = new Date()): Fields {
  return { ...validateCompany(input), ...validateFocus(input), ...validateSlot(input, now) }
}

const iso = (d: Date) => d.toISOString().slice(0, 10)

/** Weekdays from tomorrow for the booking window, as YYYY-MM-DD (UTC). */
export function availableDays(now = new Date()): string[] {
  const out: string[] = []
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  for (let i = 1; i <= BOOKING_WINDOW_DAYS; i++) {
    d.setUTCDate(d.getUTCDate() + 1)
    const day = d.getUTCDay()
    if (day !== 0 && day !== 6) out.push(iso(d))
  }
  return out
}

function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

export type Slot = { start: string; taken: boolean }

/** Every slot on a day, with a deterministic share already taken (demo data). */
export function allSlotsFor(date: string): Slot[] {
  const busyDay = hash(date) % 7 === 0
  return TIMES_UTC.map((t) => {
    const start = `${date}T${t}:00.000Z`
    return { start, taken: busyDay || hash(start) % 3 === 0 }
  })
}

/** Free slots on a day inside the booking window. */
export function slotsFor(date: string, now = new Date()): Slot[] {
  if (!availableDays(now).includes(date)) return []
  return allSlotsFor(date).filter((s) => !s.taken)
}

export function isTaken(slot: string) {
  return allSlotsFor(slot.slice(0, 10)).some((s) => s.start === slot && s.taken)
}

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
