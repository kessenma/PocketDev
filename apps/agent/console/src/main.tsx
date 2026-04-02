import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './styles.css'
import { SetupPage } from './pages/SetupPage'
import { LoginPage } from './pages/LoginPage'
import { ConsolePage } from './pages/ConsolePage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename="/PocketDev">
      <Routes>
        <Route path="/setup" element={<SetupPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/console" element={<ConsolePage />} />
        <Route path="*" element={<Navigate to="/setup" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
