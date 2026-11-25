// Plan and onboarding rules shared by the Worker and the browser. One source of
// truth for prices, clip limits, option lists and profile validation.

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export type PlanId = 'starter' | 'creator' | 'network'

export type Plan = {
  id: PlanId
  name: string
  price: number
  limit: number
  days: string
  text: string
  features: readonly string[]
  featured?: boolean
}

export const planById = (id: string | null | undefined): Plan | null => PLANS.find((p) => p.id === id) ?? null

export const PLANS: readonly Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 19,
    limit: 20,
    days: '20 clips a month',
    text: 'For solo streamers posting a few VODs a week who want a feed that never goes quiet.',
    features: ['20 clips a month', 'Highlight finding, captions and face tracking', '1080×1920 exports with SRT, VTT and ASS files'],
  },
  {
    id: 'creator',
    name: 'Creator',
    price: 49,
    limit: 60,
    days: '60 clips a month',
    text: 'For growing channels posting daily across TikTok, Shorts and Reels.',
    features: ['60 clips a month', 'Everything in Starter'],
    featured: true,
  },
  {
    id: 'network',
    name: 'Network',
    price: 129,
    limit: 200,
    days: '200 clips a month',
    text: 'For multi-channel networks and agencies clipping a whole roster.',
    features: ['200 clips a month', 'Everything in Starter'],
  },
]

export const isPlanId = (value: unknown): value is PlanId => PLANS.some((p) => p.id === value)

/**
 * Paid plans only unlock after the server has verified a payment. There is no
 * payment provider wired up yet, so checkout is closed: every account is on
 * the Free allowance below, and `POST /api/auth/plan` refuses paid plans.
 * Flip this only together with a verified-payment webhook.
 */
export const CHECKOUT_AVAILABLE = false

/** What an account without a verified paid plan gets (matches /pricing). */
export const FREE_PLAN = { name: 'Free', limit: 3, maxSourceMinutes: 15 } as const

/** Clip allowance for an account: its verified paid plan, or Free. */
export function allowanceFor(planId: PlanId | null | undefined): { name: string; limit: number; paid: boolean } {
  const plan = planById(planId)
  return plan ? { name: plan.name, limit: plan.limit, paid: true } : { name: FREE_PLAN.name, limit: FREE_PLAN.limit, paid: false }
}


export type Role = 'admin' | 'member'

/** The account shape returned by /api/auth and used across the app. */
export type PublicUser = {
  id: string
  name: string
  email: string
  createdAt: string
  role: Role
  channel: string | null
  platform: string | null
  audience: string | null
  clipAreas: string[]
  captionStyle: string | null
  cadence: string | null
  onboardedAt: string | null
  /** Set only when a payment for this plan was verified on the server. Null means Free. */
  planId: PlanId | null
  /** A paid plan the account picked before checkout existed. Not paid, unlocks nothing. */
  requestedPlanId: PlanId | null
  billing: Billing | null
  planStartedAt: string | null
  planVerifiedAt: string | null
  /** Google profile picture (https, googleusercontent.com) or null: show initials. */
  avatarUrl: string | null
  /** How the account runs Clipfarm. Only 'local' can be saved while cloud is not built. */
  workMode: WorkMode | null
  termsVersion: string | null
  privacyVersion: string | null
  termsAcceptedAt: string | null
}

export const WORK_MODES = ['local', 'cloud', 'both'] as const
export type WorkMode = (typeof WORK_MODES)[number]
export const isWorkMode = (value: unknown): value is WorkMode => WORK_MODES.includes(value as WorkMode)

export const BILLINGS = ['monthly', 'quarterly'] as const
export type Billing = (typeof BILLINGS)[number]

export const isBilling = (value: unknown): value is Billing => BILLINGS.includes(value as Billing)

/** Quarterly billing is 20% cheaper per month (four months for the price of three, roughly). */
export function priceFor(plan: Plan, billing: Billing) {
  return billing === 'monthly' ? plan.price : Math.round(plan.price * 0.8)
}

export const AUDIENCES = ['Under 1K', '1K–10K', '10K–50K', '50K–250K', '250K–1M', '1M+'] as const
export const PLATFORMS = ['Twitch', 'YouTube', 'TikTok', 'Multi-platform'] as const
export const CLIP_AREAS = ['Highlights', 'Face tracking', 'Punch-ins', 'Captions', 'Audio cleanup', 'Vertical export', 'Hooks and thumbnails', 'Posting schedule', 'Revenue share', 'Multi-language', 'Backlog rescue', 'Shorts and Reels'] as const
export const CAPTION_STYLES = ['Bold pop', 'Clean minimal', 'Karaoke', 'Branded'] as const
export const CADENCES = ['A few clips a week', 'One a day', 'Two or more a day'] as const
export const MAX_FOCUS = 5
export const MAX_CHANNEL = 60

export type ProfileInput = {
  channel?: unknown
  platform?: unknown
  audience?: unknown
  clipAreas?: unknown
  captionStyle?: unknown
  cadence?: unknown
}

export type ProfileFields = Partial<Record<'channel' | 'platform' | 'audience' | 'clipAreas' | 'captionStyle' | 'cadence', string>>

const str = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

export function validateProfile(input: ProfileInput): ProfileFields {
  const f: ProfileFields = {}
  const channel = str(input.channel)
  if (channel.length < 2) f.channel = 'Enter your channel name.'
  else if (channel.length > MAX_CHANNEL) f.channel = `Keep it under ${MAX_CHANNEL} characters.`
  if (!PLATFORMS.includes(str(input.platform) as (typeof PLATFORMS)[number])) f.platform = 'Choose your platform.'
  if (!AUDIENCES.includes(str(input.audience) as (typeof AUDIENCES)[number])) f.audience = 'Choose your audience size.'
  const areas = Array.isArray(input.clipAreas) ? input.clipAreas : []
  if (!areas.length) f.clipAreas = 'Pick at least one area.'
  else if (areas.length > MAX_FOCUS) f.clipAreas = `Pick up to ${MAX_FOCUS} areas.`
  else if (areas.some((a) => !CLIP_AREAS.includes(a as (typeof CLIP_AREAS)[number]))) f.clipAreas = 'Pick areas from the list.'
  if (!CAPTION_STYLES.includes(str(input.captionStyle) as (typeof CAPTION_STYLES)[number])) f.captionStyle = 'Choose a caption style.'
  if (!CADENCES.includes(str(input.cadence) as (typeof CADENCES)[number])) f.cadence = 'Choose a posting cadence.'
  return f
}
