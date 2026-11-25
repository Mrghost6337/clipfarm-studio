import { MotionConfig } from 'motion/react'
import { useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'

import { ToastProvider } from '../components/Toast'
import { AuthProvider } from '../lib/auth'
import { RegionProvider } from '../lib/region'
import { Studio } from '../pages/Studio'
import { Boot } from './Boot'

export function DesktopApp() {
  const [ready, setReady] = useState(false)
  return (
    <BrowserRouter>
      <MotionConfig reducedMotion="user">
        <RegionProvider>
          <AuthProvider>
            <ToastProvider>
              {ready ? (
                <Routes>
                  <Route path="*" element={<Studio />} />
                </Routes>
              ) : (
                <Boot onReady={() => setReady(true)} />
              )}
            </ToastProvider>
          </AuthProvider>
        </RegionProvider>
      </MotionConfig>
    </BrowserRouter>
  )
}
