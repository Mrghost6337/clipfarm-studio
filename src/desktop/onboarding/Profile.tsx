import { motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { Button } from '../../components/Button'
import { Notice } from '../../components/Field'
import { requestJson } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useAuthStatus } from '../hooks'
import { Avatar } from './Avatar'

/**
 * Step 5 and every returning launch: picture and name from the account, with
 * three loading dots while the real account data loads (profile, then the
 * dashboard: clips, sources and plan). Continues as soon as it has loaded.
 */
const MIN_SHOWN_MS = 1600

export function Profile({ onDone }: { onDone: () => void }) {
  const { user: account, refresh } = useAuth()
  const status = useAuthStatus()
  // The main process already knows who is signed in: show the name and picture at once.
  const user = account ?? (status?.state === 'signed-in' ? { name: status.user.name, email: status.user.email, avatarUrl: status.user.avatarUrl } : null)
  const [error, setError] = useState('')
  const [offline, setOffline] = useState(false)
  // The parent passes a new callback on every render: keep the latest, and finish only once.
  const done = useRef(onDone)
  done.current = onDone
  const finished = useRef(false)
  const shownAt = useRef(Date.now())
  // Show the profile long enough to be seen (returning launches: intro → profile → app).
  const finish = useCallback(() => {
    if (finished.current) return
    finished.current = true
    window.setTimeout(() => done.current(), Math.max(0, MIN_SHOWN_MS - (Date.now() - shownAt.current)))
  }, [])

  const load = useCallback(async () => {
    setError('')
    await refresh()
    const me = await requestJson<{ user: unknown; offline?: boolean }>('/api/auth/me')
    if (me.ok && me.offline) {
      setOffline(true)
      finish()
      return
    }
    const dashboard = await requestJson<{ summary: unknown }>('/api/dashboard')
    if (!dashboard.ok && dashboard.status !== 0) {
      setError(dashboard.error)
      return
    }
    if (!dashboard.ok) setOffline(true)
    finish()
  }, [refresh, finish])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="relative grid min-h-svh place-items-center overflow-hidden bg-ink text-white">
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-[55%] bg-[radial-gradient(60%_70%_at_50%_100%,rgb(245_183_101/0.35),transparent_70%)]" />
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className="relative flex flex-col items-center gap-5 text-center">
        {user ? <Avatar name={user.name} email={user.email} url={user.avatarUrl} size={112} className="ring-4 ring-white/15" /> : <span className="size-28 rounded-full bg-white/10" />}
        <h1 className="text-[2rem] font-semibold tracking-[-0.035em]">{user?.name ?? 'Loading your account'}</h1>
        {error ? (
          <div className="flex flex-col items-center gap-3">
            <Notice className="max-w-sm">{error}</Notice>
            <Button variant="light" onClick={() => void load()}>
              Try again
            </Button>
          </div>
        ) : (
          <div className="flex gap-2" role="status" aria-label={offline ? 'Opening offline' : 'Loading your account'}>
            {[0, 1, 2].map((dot) => (
              <motion.span
                key={dot}
                className="round size-2.5 rounded-full bg-apricot"
                animate={{ opacity: [0.25, 1, 0.25], y: [0, -4, 0] }}
                transition={{ duration: 1.1, repeat: Infinity, delay: dot * 0.18, ease: 'easeInOut' }}
              />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}
