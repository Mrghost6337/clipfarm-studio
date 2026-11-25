import { useEffect } from 'react'
import { useNavigate } from 'react-router'

import { useAuth } from '../lib/auth'

/**
 * Keeps app pages behind the right step of the flow:
 * signed out -> /login, no profile -> /onboarding. Every account has a plan:
 * a verified paid plan or Free, so there is no plan step.
 */
export function useRequireAuth({ onboarded = false }: { onboarded?: boolean } = {}) {
  const auth = useAuth()
  const navigate = useNavigate()
  const { user, loading } = auth

  useEffect(() => {
    if (loading) return
    if (!user) {
      navigate('/login', { replace: true })
      return
    }
    if (onboarded && !user.onboardedAt) {
      navigate('/onboarding', { replace: true })
    }
  }, [loading, user, navigate, onboarded])

  return { ...auth, ready: !loading && !!user }
}

export function AppLoading({ label = 'Loading your account', rows = 3 }: { label?: string; rows?: number }) {
  return (
    <div role="status" aria-label={label} className="mx-auto flex w-full max-w-[1324px] flex-col gap-4 px-5 py-40">
      <span className="h-8 w-52 animate-pulse rounded-full bg-ink/6" />
      {Array.from({ length: rows }, (_, i) => (
        <span key={i} className="h-24 w-full animate-pulse rounded-[var(--radius-lg)] bg-ink/6" />
      ))}
    </div>
  )
}
