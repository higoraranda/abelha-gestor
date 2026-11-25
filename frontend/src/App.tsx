import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppPage from './pages/AppPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import MemberHome from './pages/personal/MemberHome'
import ProtectedRoute from './components/ui/ProtectedRoute'
import { personalAccess } from './lib/personalAccess'
import BeeLoader from './components/ui/BeeLoader'
import { useCallback, useEffect, useState } from 'react'
import { getSession } from './lib/auth'
import type { StartupSession } from './lib/auth'
import { useAuthStore } from './store/auth'

function AccountWorkspace() {
  const user=useAuthStore(state=>state.user)
  return user?.role==='member'?<MemberHome/>:<AppPage/>
}

export default function App() {
  const [initialSession, setInitialSession] = useState<StartupSession | null>(null)
  const setAuth = useAuthStore(state => state.setAuth)
  const clearAuth = useAuthStore(state => state.clearAuth)
  const prepareAccess = useCallback(async (signal: AbortSignal) => {
    const pathname = window.location.pathname
    if (personalAccess || (pathname === '/login' || pathname === '/cadastro')) return
    const user = await getSession(signal)
    signal.throwIfAborted()
    if (user) setAuth(user)
    else clearAuth()
    if (window.location.pathname === pathname) setInitialSession({ user })
  }, [setAuth, clearAuth])
  const consumeInitialSession = useCallback(() => setInitialSession(null), [])
  useEffect(() => {
    const discardSnapshot = () => setInitialSession(null)
    window.addEventListener('popstate', discardSnapshot)
    return () => window.removeEventListener('popstate', discardSnapshot)
  }, [])
  return (
    <BeeLoader prepare={prepareAccess}>
      <BrowserRouter>
        <Routes>
          <Route path="/cadastro" element={<RegisterPage />} />
          <Route path="/login" element={personalAccess ? <Navigate to="/" replace /> : <LoginPage />} />
          <Route path="/*" element={personalAccess ? <AppPage /> : <ProtectedRoute initialSession={initialSession} onInitialSessionUsed={consumeInitialSession}><AccountWorkspace /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </BeeLoader>
  )
}
