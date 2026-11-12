import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { getSession } from '@/lib/auth'
import { useAuthStore } from '@/store/auth'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user)
  const setAuth = useAuthStore((state) => state.setAuth)
  const clearAuth = useAuthStore((state) => state.clearAuth)
  const [checking, setChecking] = useState(true)
  const [failure,setFailure]=useState('')
  const [revision,setRevision]=useState(0)

  useEffect(() => {
    let active = true

    async function verifySession() {
      try {
        const sessionUser = await getSession()
        if (!active) return
        if (sessionUser) setAuth(sessionUser)
        else clearAuth()
        setFailure('');setChecking(false)
      } catch {
        if(active){setFailure(navigator.onLine?'A sessão não pôde ser verificada. Tente novamente.':'Conecte-se à internet para verificar sua sessão e acessar seus dados.');setChecking(false)}
      }
    }

    void verifySession()
    return () => { active = false }
  }, [clearAuth, setAuth,revision])
  useEffect(()=>{const retry=()=>{setChecking(true);setRevision(value=>value+1)};window.addEventListener('online',retry);return()=>window.removeEventListener('online',retry)},[])

  if (checking) {
    return (
      <div className="auth-loading" aria-busy="true" aria-label="Verificando acesso">
        <img className="brand-mark auth-bee" src="/bee-mark.png" alt="" />
        <div className="skeleton auth-loading-bar" />
      </div>
    )
  }

  if(failure)return <main className="auth-loading"><img className="brand-mark auth-bee" src="/bee-mark.png" alt=""/><h1>Vamos reconectar.</h1><p role="status">{failure}</p><button className="button button-primary" onClick={()=>{setChecking(true);setRevision(value=>value+1)}}>Tentar novamente</button></main>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}
