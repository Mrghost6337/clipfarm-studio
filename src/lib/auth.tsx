import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import type { Billing, PlanId, ProfileInput, PublicUser } from '../shared/account'
import { postJson, requestJson, type ApiResult } from './api'

export type AuthUser = PublicUser

type AuthValue = {
  user: AuthUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<ApiResult<{ user: AuthUser }>>
  signUp: (name: string, email: string, password: string) => Promise<ApiResult<{ user: AuthUser }>>
  signOut: () => Promise<void>
  saveProfile: (input: ProfileInput | { skip: true }) => Promise<ApiResult<{ user: AuthUser }>>
  choosePlan: (planId: PlanId, billing: Billing) => Promise<ApiResult<{ user: AuthUser }>>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

/** Where an account should land after log in, based on what it has finished. */
export function nextRoute(user: PublicUser | null) {
  if (!user) return '/login'
  if (!user.onboardedAt) return '/onboarding'
  if (!user.planId) return '/plans'
  return '/dashboard'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const res = await requestJson<{ user: AuthUser | null }>('/api/auth/me')
    if (res.ok) setUser(res.user)
  }, [])

  useEffect(() => {
    let live = true
    requestJson<{ user: AuthUser | null }>('/api/auth/me')
      .then((res) => {
        if (live && res.ok) setUser(res.user)
      })
      .finally(() => {
        if (live) setLoading(false)
      })
    return () => {
      live = false
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await postJson<{ user: AuthUser }>('/api/auth/login', { email, password })
    if (res.ok) setUser(res.user)
    return res
  }, [])

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    const res = await postJson<{ user: AuthUser }>('/api/auth/signup', { name, email, password })
    if (res.ok) setUser(res.user)
    return res
  }, [])

  const signOut = useCallback(async () => {
    await postJson<{ ok: true }>('/api/auth/logout', {})
    setUser(null)
  }, [])

  const saveProfile = useCallback(async (input: ProfileInput | { skip: true }) => {
    const res = await postJson<{ user: AuthUser }>('/api/auth/profile', input)
    if (res.ok) setUser(res.user)
    return res
  }, [])

  const choosePlan = useCallback(async (planId: PlanId, billing: Billing) => {
    const res = await postJson<{ user: AuthUser }>('/api/auth/plan', { planId, billing })
    if (res.ok) setUser(res.user)
    return res
  }, [])

  const value = useMemo(
    () => ({ user, loading, signIn, signUp, signOut, saveProfile, choosePlan, refresh }),
    [user, loading, signIn, signUp, signOut, saveProfile, choosePlan, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
