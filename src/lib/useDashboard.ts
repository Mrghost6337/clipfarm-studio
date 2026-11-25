import { useCallback, useEffect, useState } from 'react'

import type { DashboardData } from '../shared/dashboard'
import { loadDashboard } from './clipData'

/** Loads /api/dashboard once the account is ready, with a manual reload. */
export function useDashboard(ready: boolean) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const res = await loadDashboard()
    if (res.ok) {
      setData(res)
      setError('')
    } else {
      setError(res.error)
    }
  }, [])

  useEffect(() => {
    if (ready) void load()
  }, [ready, load])

  return { data, error, load }
}
