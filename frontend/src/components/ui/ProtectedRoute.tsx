import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { getSession } from '@/lib/auth'
import { useAuthStore } from '@/store/auth'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user)
  const setAuth = useAuthStore((state) => state.setAuth)
  const clearAuth = useAuthStore((state) => state.clearAuth)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let active = true

    async function verifySession() {
      const sessionUser = await getSession().catch(() => null)
      if (!active) return
      if (sessionUser) setAuth(sessionUser)
      else clearAuth()
      setChecking(false)
    }

    void verifySession()
    return () => { active = false }
  }, [clearAuth, setAuth])

  if (checking) {
    return (
      <div className="auth-loading" aria-busy="true" aria-label="Verificando acesso">
        <span className="brand-mark">a</span>
        <div className="skeleton auth-loading-bar" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}
