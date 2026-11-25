import { useEffect, useState } from 'react'

import { invoke, on, type AppState, type PipelineStatus } from './bridge'

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
