// Shape of /api/dashboard. Every number comes from the account's own rows in
// D1 (sources, clips and real clip-page events) — there is no generated data.

import type { Clip, ClipSource } from './clips'

export type TrendPoint = { date: string; clips: number; views: number }

export type DashboardClip = Pick<Clip, 'id' | 'title' | 'score' | 'start' | 'end' | 'status' | 'platform' | 'views' | 'createdAt' | 'sourceTitle' | 'sourceThumbnail'>

export type DashboardSource = Pick<ClipSource, 'id' | 'title' | 'platform' | 'status' | 'clips' | 'duration' | 'createdAt' | 'thumbnail' | 'method'>

export type AdminUser = { id: string; name: string; email: string; plan: string | null; requestedPlan: string | null; role: string; createdAt: string }

/** An account that picked a paid plan before checkout existed. Not revenue. */
export type UnverifiedPlan = { id: string; name: string; email: string; plan: string; billing: 'monthly' | 'quarterly'; selectedAt: string | null; monthly: number }

export type DashboardData = {
  generatedAt: string
  summary: {
    clips: number
    sources: number
    minutes: number
    views: number
    downloads: number
    avgScore: number | null
    weekClips: number
    prevWeekClips: number
    weekViews: number
    prevWeekViews: number
  }
  series: TrendPoint[]
  platforms: Array<{ name: string; sources: number; clips: number }>
  clips: DashboardClip[]
  sources: DashboardSource[]
  usage: { used: number; limit: number; planName: string | null; renewsAt: string | null }
  activity: Array<{ id: string; text: string; at: string }>
  admin?: { accounts: number; paidAccounts: number; mrr: number; unverifiedPlans: UnverifiedPlan[]; clips: number; sources: number; recent: AdminUser[] }
}
