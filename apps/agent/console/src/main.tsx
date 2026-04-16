import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { webFontStacks } from '@pocketdev/shared/theme'
import './styles.css'
import { SetupPage } from './pages/SetupPage'
import { LoginPage } from './pages/LoginPage'
import { ConsoleDataProvider } from './context/ConsoleDataContext'
import { LockStatusProvider } from './context/LockStatusContext'
import { ThemeProvider } from './context/ThemeContext'
import { ConsoleLayout } from './components/layout/ConsoleLayout'

document.documentElement.style.setProperty('--font-sans', webFontStacks.body)
document.documentElement.style.setProperty('--font-display', webFontStacks.display)
document.documentElement.style.setProperty('--font-heading', webFontStacks.display)
document.documentElement.style.setProperty('--font-mono', webFontStacks.mono)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter basename="/PocketDev">
        <Routes>
          <Route path="/setup" element={<SetupPage />} />
          <Route path="/login" element={<LoginPage />} />
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
          {/* Legacy /console route — redirect handled inside ConsoleLayout via display:none logic */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        <Toaster position="bottom-center" richColors />
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
)
