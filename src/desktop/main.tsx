import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import './fonts.css'
import '../styles.css'
import { DesktopApp } from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DesktopApp />
  </StrictMode>,
)
