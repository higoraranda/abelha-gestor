import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'

// Rota protegida: redireciona para /login se não houver token
export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
