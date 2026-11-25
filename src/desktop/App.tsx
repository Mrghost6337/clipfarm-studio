import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router'

import { ToastProvider } from '../components/Toast'
import { postJson, requestJson } from '../lib/api'
import { AuthProvider, useAuth } from '../lib/auth'
import { connectPipeline } from '../lib/pipeline'
import { RegionProvider } from '../lib/region'
import { Analytics } from '../pages/app/Analytics'
import { ClipPage } from '../pages/app/ClipPage'
import { ClipsPage } from '../pages/app/ClipsPage'
import { SourcesPage } from '../pages/app/SourcesPage'
import { Studio } from '../pages/Studio'
import { PRIVACY_VERSION, TERMS_VERSION } from '../shared/legal'
import { invoke, type AppState, type FirstRunStep, type SoundSettings } from './bridge'
import { useAppState, useAuthStatus, usePipelineStatus } from './hooks'
import { Intro } from './onboarding/Intro'
import { Models } from './onboarding/Models'
import { PcCheck } from './onboarding/PcCheck'
import { Preparing } from './onboarding/Preparing'
import { Profile } from './onboarding/Profile'
import { Ready } from './onboarding/Ready'
import { SignIn } from './onboarding/SignIn'
import { Terms } from './onboarding/Terms'
import { Usage } from './onboarding/Usage'
import { Welcome } from './onboarding/Welcome'
import { DesktopHome } from './Home'
import { DesktopSettings } from './Settings'
import { DesktopShell } from './Shell'
import { configureSound } from './sound'
import { on } from './bridge'

type Screen = 'intro' | 'welcome' | 'usage' | 'preparing' | 'signin' | 'profile' | 'pccheck' | 'models' | 'terms' | 'ready' | 'app'

const termsCurrent = (state: AppState) => state.termsAccepted?.terms === TERMS_VERSION && state.termsAccepted?.privacy === PRIVACY_VERSION

/** Where a saved step resumes after the intro. Every step is saved, so closing the app resumes here. */
function resume(state: AppState, signedIn: boolean): Screen {
  switch (state.step) {
    case 'welcome':
      return 'welcome'
    case 'usage':
      return 'usage'
    case 'preparing':
      return 'preparing'
    case 'signin':
      return signedIn ? 'profile' : 'signin'
    default:
      // profile, pccheck, models, terms, ready and done all need a signed-in account.
      return signedIn ? 'profile' : 'signin'
  }
}

function Fade({ id, children }: { id: string; children: ReactNode }) {
  return (
    <motion.div key={id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  )
}

function Flow() {
  const [state, update] = useAppState()
  const status = useAuthStatus()
  const pipeline = usePipelineStatus()
  const { refresh } = useAuth()
  const [screen, setScreen] = useState<Screen>('intro')
  const introDone = useRef(false)
  const navigate = useNavigate()

  // The main process can send the app to a page (e.g. a "Clips ready" notification opens the Studio).
  useEffect(() => on('navigate', (to) => navigate(to)), [navigate])

  useEffect(() => {
    if (state) configureSound(state.sound)
  }, [state?.sound.enabled, state?.sound.volume]) // eslint-disable-line react-hooks/exhaustive-deps

  // Whenever the main process reports the pipeline (re)started, reconnect the page to it.
  useEffect(() => {
    if (pipeline?.state === 'ready') void connectPipeline()
  }, [pipeline?.state, pipeline?.port])

  // A session that expires while the app is open goes back to sign-in.
  useEffect(() => {
    if ((screen === 'app' || screen === 'profile') && (status?.state === 'expired' || status?.state === 'signed-out')) setScreen('signin')
  }, [status?.state, screen])

  const go = useCallback(
    async (next: Screen, step?: FirstRunStep) => {
      if (step) await update({ step })
      setScreen(next)
    },
    [update],
  )

  const afterIntro = useCallback(() => {
    if (introDone.current || !state || !status) return
    introDone.current = true
    setScreen(resume(state, status.state === 'signed-in'))
  }, [state, status])

  // The intro may end before the saved state has loaded; continue once it has.
  const [introEnded, setIntroEnded] = useState(false)
  useEffect(() => {
    if (introEnded) afterIntro()
  }, [introEnded, afterIntro])

  /** Terms, unless this account already accepted the current versions (then record it and move on). */
  const toTerms = useCallback(async (then: Screen, thenStep?: FirstRunStep) => {
    if (!state) return
    if (!termsCurrent(state)) {
      // Already accepted on this account (another PC, or before a reinstall)? Record it from the server.
      const me = await requestJson<{ user: { termsVersion: string | null; privacyVersion: string | null } | null }>('/api/auth/me')
      const accepted = me.ok && me.user?.termsVersion === TERMS_VERSION && me.user?.privacyVersion === PRIVACY_VERSION
      if (!accepted || !(await invoke('terms:record', { terms: TERMS_VERSION, privacy: PRIVACY_VERSION }).then(() => true, () => false))) return go('terms', state.step === 'done' ? undefined : 'terms')
    }
    return go(then, thenStep)
  }, [state, go])

  /** After the profile: the first-run steps still open, in order, else the app. */
  const afterProfile = useCallback(async () => {
    if (!state) return
    await refresh()
    // The website's channel questionnaire is optional; the app marks it as skipped so app pages open.
    const me = await requestJson<{ user: { onboardedAt: string | null } | null }>('/api/auth/me')
    if (me.ok && me.user && !me.user.onboardedAt) await postJson('/api/auth/profile', { skip: true })
    switch (state.step) {
      case 'done':
        return toTerms('app')
      case 'models':
        return go('models')
      case 'terms':
        return toTerms('ready', 'ready')
      case 'ready':
        return go('ready')
      default:
        return go('pccheck', 'pccheck')
    }
  }, [state, refresh, go, toTerms])

  if (!state || !status) {
    return screen === 'intro' ? <Intro onDone={() => setIntroEnded(true)} /> : <div className="min-h-svh bg-ink" aria-busy="true" />
  }

  const setSound = (sound: SoundSettings) => {
    configureSound(sound)
    void update({ sound })
  }

  return (
    <AnimatePresence mode="wait">
      {screen === 'intro' && (
        <Fade id="intro">
          <Intro onDone={() => setIntroEnded(true)} />
        </Fade>
      )}
      {screen === 'welcome' && (
        <Fade id="welcome">
          <Welcome sound={state.sound} onSound={setSound} onStart={() => void go('usage', 'usage')} />
        </Fade>
      )}
      {screen === 'usage' && (
        <Fade id="usage">
          <Usage
            value={state.usage}
            onBack={() => void go('welcome', 'welcome')}
            onChoose={async (mode) => {
              await update({ usage: mode })
              await go('preparing', 'preparing')
            }}
          />
        </Fade>
      )}
      {screen === 'preparing' && (
        <Fade id="preparing">
          <Preparing onBack={() => void go('usage', 'usage')} onDone={() => void go(status.state === 'signed-in' ? 'profile' : 'signin', 'signin')} />
        </Fade>
      )}
      {screen === 'signin' && (
        <Fade id="signin">
          <SignIn onDone={() => void go('profile', state.step === 'done' ? 'done' : state.step === 'signin' ? 'profile' : undefined)} onBack={state.step === 'signin' ? () => void go('usage', 'usage') : undefined} />
        </Fade>
      )}
      {screen === 'profile' && (
        <Fade id="profile">
          <Profile onDone={() => void afterProfile()} />
        </Fade>
      )}
      {screen === 'pccheck' && (
        <Fade id="pccheck">
          <PcCheck preferred={state.usage} onDone={() => void go('models', 'models')} />
        </Fade>
      )}
      {screen === 'models' && (
        <Fade id="models">
          <Models recommended={state.pcCheck.recommendedModel ?? 'whisper-tiny'} onBack={() => void go('pccheck', 'pccheck')} onDone={() => void toTerms('ready', 'ready')} />
        </Fade>
      )}
      {screen === 'terms' && (
        <Fade id="terms">
          <Terms onDone={() => void (state.step === 'done' ? go('app') : go('ready', 'ready'))} />
        </Fade>
      )}
      {screen === 'ready' && (
        <Fade id="ready">
          <Ready onStart={() => void go('app', 'done')} />
        </Fade>
      )}
      {screen === 'app' && (
        <Fade id="app">
          <Routes>
            <Route path="dashboard" element={<DesktopShell />}>
              <Route index element={<DesktopHome />} />
              <Route path="clips" element={<ClipsPage />} />
              <Route path="sources" element={<SourcesPage />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="settings" element={<DesktopSettings />} />
            </Route>
            <Route path="studio" element={<Studio />} />
            <Route path="clip/:id" element={<ClipPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
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
