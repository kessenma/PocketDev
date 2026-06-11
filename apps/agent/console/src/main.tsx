import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { generateFontFaceCSS, webFontStacks } from '@pocketdev/shared/theme'
import './styles.css'
import { SetupPage } from './pages/SetupPage'
import { LoginPage } from './pages/LoginPage'
import { ConsoleDataProvider } from './context/ConsoleDataContext'
import { LockStatusProvider } from './context/LockStatusContext'
import { ThemeProvider } from './context/ThemeContext'
import { ConsoleLayout } from './components/layout/ConsoleLayout'
import { installDemoBackend } from './demo'

// Demo mode (set by the console-demo build): mock the network layer so the full
// console is interactive with no agent behind it. Uses HashRouter so the static
// build works at any host sub-path, and lands straight on the dashboard.
const DEMO = import.meta.env.VITE_DEMO === '1'
if (DEMO) installDemoBackend()

const _fontStyle = document.createElement('style')
// In demo mode the build is served under a sub-path, so resolve fonts relative to it.
_fontStyle.textContent = generateFontFaceCSS(DEMO ? import.meta.env.BASE_URL + 'fonts' : '/fonts')
document.head.prepend(_fontStyle)

document.documentElement.style.setProperty('--font-sans', webFontStacks.body)
document.documentElement.style.setProperty('--font-display', webFontStacks.display)
document.documentElement.style.setProperty('--font-heading', webFontStacks.display)
document.documentElement.style.setProperty('--font-mono', webFontStacks.mono)

const Router = DEMO ? HashRouter : BrowserRouter
const routerProps = DEMO ? {} : { basename: '/PocketDev' }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <Router {...routerProps}>
        <Routes>
          {!DEMO && <Route path="/setup" element={<SetupPage />} />}
          {!DEMO && <Route path="/login" element={<LoginPage />} />}
          <Route
            path="/console/*"
            element={
              <ConsoleDataProvider>
                <LockStatusProvider>
                  <ConsoleLayout />
                </LockStatusProvider>
              </ConsoleDataProvider>
            }
          />
          {/* In demo mode there's no auth, so land straight on the dashboard. */}
          <Route path="*" element={<Navigate to={DEMO ? '/console' : '/login'} replace />} />
        </Routes>
        <Toaster position="bottom-center" richColors />
      </Router>
    </ThemeProvider>
  </StrictMode>,
)
