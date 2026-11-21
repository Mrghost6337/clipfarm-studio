import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router'

import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { ToastProvider } from './components/Toast'
import { About } from './pages/About'
import { Audit } from './pages/Audit'
import { CaseStudies, CaseStudyPage } from './pages/CaseStudies'
import { Home } from './pages/Home'
import { NotFound } from './pages/NotFound'
import { PlanPage } from './pages/Plan'
import { Services } from './pages/Services'
import { Styleguide } from './pages/Styleguide'

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
          <Route path="90-day-plan" element={<PlanPage />} />
          <Route path="case-studies" element={<CaseStudies />} />
          <Route path="case-studies/:slug" element={<CaseStudyPage />} />
          <Route path="audit" element={<Audit />} />
          <Route path="about" element={<About />} />
          <Route path="styleguide" element={<Styleguide />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </motion.main>
    </AnimatePresence>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <MotionConfig reducedMotion="user">
        <ToastProvider>
          <ScrollManager />
          <a href="#main" className="sr-only z-[100] rounded-full bg-ink px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
            Skip to content
          </a>
          <div className="flex min-h-svh flex-col">
            <Header />
            <Pages />
            <Footer />
          </div>
        </ToastProvider>
      </MotionConfig>
    </BrowserRouter>
  )
}
