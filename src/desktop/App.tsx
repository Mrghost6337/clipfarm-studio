import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { useEffect, useState, type ReactNode } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'

import { ToastProvider } from '../components/Toast'
import { AuthProvider } from '../lib/auth'
import { RegionProvider } from '../lib/region'
import { Studio } from '../pages/Studio'
import type { FirstRunStep } from './bridge'
import { Boot } from './Boot'
import { connectPipeline } from '../lib/pipeline'
import { useAppState, useAuthStatus, usePipelineStatus } from './hooks'
import { Profile } from './onboarding/Profile'
import { SignIn } from './onboarding/SignIn'

type Screen = 'loading' | 'preparing' | 'signin' | 'profile' | 'app'

/** Which screen a saved step and the sign-in status lead to. Every step is saved, so a restart resumes. */
function screenFor(step: FirstRunStep, signedIn: boolean): Screen {
  if (step === 'welcome' || step === 'usage' || step === 'preparing') return 'preparing'
  if (!signedIn) return 'signin'
  if (step === 'signin') return 'signin'
  return 'profile'
}

function Fade({ id, children }: { id: string; children: ReactNode }) {
  return (
    <motion.div key={id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  )
}

function Flow() {
  const [state, update] = useAppState()
  const auth = useAuthStatus()
  const pipeline = usePipelineStatus()
  const [screen, setScreen] = useState<Screen>('loading')

  // Whenever the main process reports the pipeline (re)started, reconnect the page to it.
  useEffect(() => {
    if (pipeline?.state === 'ready') void connectPipeline()
  }, [pipeline?.state, pipeline?.port])

  // Pick the first screen once the saved state and the sign-in status are known.
  useEffect(() => {
    if (!state || !auth || screen !== 'loading') return
    setScreen(screenFor(state.step, auth.state === 'signed-in'))
  }, [state, auth, screen])

  // A session that expires while the app is open goes back to sign-in.
  useEffect(() => {
    if (screen === 'app' && (auth?.state === 'expired' || auth?.state === 'signed-out')) setScreen('signin')
  }, [auth?.state, screen])

  if (!state || !auth || screen === 'loading') return <div className="min-h-svh bg-ink" aria-busy="true" />

  const go = async (next: Screen, step?: FirstRunStep) => {
    if (step) await update({ step })
    setScreen(next)
  }

  return (
    <AnimatePresence mode="wait">
      {screen === 'preparing' && (
        <Fade id="preparing">
          <Boot onReady={() => void go(auth.state === 'signed-in' ? 'profile' : 'signin', 'signin')} />
        </Fade>
      )}
      {screen === 'signin' && (
        <Fade id="signin">
          <SignIn onDone={() => void go('profile', state.step === 'done' ? 'done' : 'profile')} />
        </Fade>
      )}
      {screen === 'profile' && (
        <Fade id="profile">
          <Profile onDone={() => void go('app', 'done')} />
        </Fade>
      )}
      {screen === 'app' && (
        <Fade id="app">
          <Routes>
            <Route path="*" element={<Studio />} />
          </Routes>
        </Fade>
      )}
    </AnimatePresence>
  )
}

export function DesktopApp() {
  return (
    <BrowserRouter>
      <MotionConfig reducedMotion="user">
        <RegionProvider>
          <AuthProvider>
            <ToastProvider>
              <Flow />
            </ToastProvider>
          </AuthProvider>
        </RegionProvider>
      </MotionConfig>
    </BrowserRouter>
  )
}
