import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AreaContent from '@/components/ui/AreaContent'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import ProtectedRoute from './components/ui/ProtectedRoute'
import { personalAccess } from './lib/personalAccess'
import BeeLoader from './components/ui/BeeLoader'
import { lazy, useCallback, useEffect, useState } from 'react'
import { getSession } from './lib/auth'
import type { StartupSession } from './lib/auth'
import { useAuthStore } from './store/auth'

const AppPage = lazy(() => import('./pages/AppPage'))
const MemberHome = lazy(() => import('./pages/personal/MemberHome'))

function AccountWorkspace() {
  const user=useAuthStore(state=>state.user)
  return <AreaContent key={user?.role} fullscreen>{user?.role==='member'?<MemberHome/>:<AppPage/>}</AreaContent>
}

export default function App() {
  const [initialSession, setInitialSession] = useState<StartupSession | null>(null)
  const setAuth = useAuthStore(state => state.setAuth)
  const clearAuth = useAuthStore(state => state.clearAuth)
  const prepareAccess = useCallback(async (signal: AbortSignal) => {
    const pathname = window.location.pathname
    if (personalAccess || (pathname === '/login' || pathname === '/cadastro' || pathname === '/redefinir-senha')) return
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
          <Route path="/redefinir-senha" element={personalAccess ? <Navigate to="/" replace /> : <ResetPasswordPage />} />
          <Route path="/login" element={personalAccess ? <Navigate to="/" replace /> : <LoginPage />} />
          <Route path="/*" element={personalAccess ? <AreaContent fullscreen><AppPage /></AreaContent> : <ProtectedRoute initialSession={initialSession} onInitialSessionUsed={consumeInitialSession}><AccountWorkspace /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </BeeLoader>
  )
}
