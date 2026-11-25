import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router'

import { CookieConsent } from './components/CookieConsent'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { ToastProvider } from './components/Toast'
import { AuthProvider } from './lib/auth'
import { RegionProvider } from './lib/region'
import { AppShell } from './components/AppShell'
import { About } from './pages/About'
import { AppLogin } from './pages/AppLogin'
import { Analytics } from './pages/app/Analytics'
import { ClipPage } from './pages/app/ClipPage'
import { ClipsPage } from './pages/app/ClipsPage'
import { Overview } from './pages/app/Overview'
import { SettingsPage } from './pages/app/SettingsPage'
import { SourcesPage } from './pages/app/SourcesPage'
import { StudioPage } from './pages/app/StudioPage'
import { CaseStudies, CaseStudyPage } from './pages/CaseStudies'
import { Gta6 } from './pages/Gta6'
import { Home } from './pages/Home'
import { Local } from './pages/Local'
import { Contact } from './pages/Contact'
import { DownloadPage } from './pages/Download'
import { Privacy, Terms } from './pages/Legal'
import { Pricing } from './pages/Pricing'
import { Product } from './pages/Product'
import { ChangelogPage, FaqPage, GuidesPage, ResourcesHub } from './pages/Resources'
import { Login } from './pages/Login'
import { NotFound } from './pages/NotFound'
import { StudioEntry } from './pages/app/StudioEntry'
import { Onboarding } from './pages/Onboarding'
import { PlanPage } from './pages/Plan'
import { Plans } from './pages/Plans'
import { Services } from './pages/Services'
import { Styleguide } from './pages/Styleguide'
import { Toolkit } from './pages/Toolkit'

const APP_ROUTES = ['/dashboard', '/plans', '/onboarding']
/** Routes that replace the marketing chrome with the dashboard's own shell. */
const SHELL_ROUTES = ['/dashboard', '/clip', '/studio', '/app-login']

function ScrollManager() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      const t = window.setTimeout(() => document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView(), 80)
      return () => window.clearTimeout(t)
    }
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname, hash])
  return null
}

function Pages() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.main id="main" key={location.pathname} tabIndex={-1} className="flex-1 focus:outline-none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}>
        <Routes location={location}>
          <Route index element={<Home />} />
          <Route path="services" element={<Services />} />
          <Route path="pricing" element={<Pricing />} />
          <Route path="product" element={<Product />} />
          <Route path="resources" element={<ResourcesHub />} />
          <Route path="resources/guides" element={<GuidesPage />} />
          <Route path="resources/faq" element={<FaqPage />} />
          <Route path="resources/changelog" element={<ChangelogPage />} />
          <Route path="contact" element={<Contact />} />
          <Route path="download" element={<DownloadPage />} />
          <Route path="privacy" element={<Privacy />} />
          <Route path="terms" element={<Terms />} />
          <Route path="studio" element={<StudioEntry />} />
          <Route path="pipeline" element={<PlanPage />} />
          <Route path="90-day-plan" element={<PlanPage />} />
          <Route path="case-studies" element={<CaseStudies />} />
          <Route path="case-studies/:slug" element={<CaseStudyPage />} />
          <Route path="about" element={<About />} />
          <Route path="toolkit" element={<Toolkit />} />
          <Route path="gta-6" element={<Gta6 />} />
          <Route path="local" element={<Local />} />
          <Route path="login" element={<Login />} />
          <Route path="app-login" element={<AppLogin />} />
          <Route path="signup" element={<Login />} />
          <Route path="onboarding" element={<Onboarding />} />
          <Route path="plans" element={<Plans />} />
          <Route path="dashboard" element={<AppShell />}>
            <Route index element={<Overview />} />
            <Route path="clips" element={<ClipsPage />} />
            <Route path="sources" element={<SourcesPage />} />
            <Route path="studio" element={<StudioPage />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="clip/:id" element={<ClipPage />} />
          <Route path="account" element={<Navigate to="/dashboard" replace />} />
          <Route path="audit" element={<Navigate to="/signup" replace />} />
          <Route path="styleguide" element={<Styleguide />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </motion.main>
    </AnimatePresence>
  )
}

function Layout() {
  const { pathname } = useLocation()
  const isApp = APP_ROUTES.some((path) => pathname.startsWith(path))
  const isShell = SHELL_ROUTES.some((path) => pathname.startsWith(path))
  return (
    <div className="flex min-h-svh flex-col">
      {!isShell && <Header />}
      <Pages />
      {!isApp && !isShell && <Footer />}
    </div>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <MotionConfig reducedMotion="user">
        <RegionProvider>
          <AuthProvider>
            <ToastProvider>
              <ScrollManager />
              <a href="#main" className="sr-only z-[100] rounded-full bg-ink px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
                Skip to content
              </a>
              <Layout />
              <CookieConsent />
            </ToastProvider>
          </AuthProvider>
        </RegionProvider>
      </MotionConfig>
    </BrowserRouter>
  )
}
