import { useEffect, useState } from 'react'

import { invoke, on, type AppState, type AuthStatus, type PipelineStatus } from './bridge'

/** Live pipeline status from the main process. */
export function usePipelineStatus() {
  const [status, setStatus] = useState<PipelineStatus | null>(null)
  useEffect(() => {
    let live = true
    void invoke('pipeline:status').then((value) => live && setStatus(value))
    const off = on('pipeline:status', setStatus)
    return () => {
      live = false
      off()
    }
  }, [])
  return status
}

/** The saved first-run state and a way to update it (persisted before resolving). */
export function useAppState() {
  const [state, setState] = useState<AppState | null>(null)
  useEffect(() => {
    void invoke('state:get').then(setState)
  }, [])
  const update = async (patch: Partial<AppState>) => {
    const next = await invoke('state:update', patch)
    setState(next)
    return next
  }
  return [state, update] as const
}

/** Sign-in status from the main process (token never leaves it). */
export function useAuthStatus() {
  const [status, setStatus] = useState<AuthStatus | null>(null)
  useEffect(() => {
    let live = true
    void invoke('auth:status').then((value) => live && setStatus(value))
    const off = on('auth:status', setStatus)
    return () => {
      live = false
      off()
    }
  }, [])
  return status
}
