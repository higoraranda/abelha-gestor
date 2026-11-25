import { useState } from 'react'
import { ArrowRight, LockKeyhole } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { login } from '@/lib/auth'
import { useAuthStore } from '@/store/auth'
import AuthLayout from './AuthLayout'
import PasswordField from './PasswordField'

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((state) => state.setAuth)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const result = await login(email.trim(), password)
      setAuth(result.user)
      navigate('/', { replace: true })
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Não foi possível entrar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <form className="login-form" onSubmit={handleSubmit}>
        <span className="login-lock"><LockKeyhole size={19} strokeWidth={1.8} aria-hidden="true" /></span>
        <div>
          <p className="eyebrow">Área privada</p>
          <h2>Entre no Abelha</h2>
          <p className="login-helper">Use o email e a senha da sua conta.</p>
        </div>

        <label className="login-field">
          <span>Email</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="seu@email.com"
            required
            autoFocus
          />
        </label>

        <div className="login-password-group">
          <PasswordField
            label="Senha"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Digite sua senha"
            required
          />
          <Link to="/redefinir-senha" className="login-text-link">Esqueci minha senha</Link>
        </div>

        {error ? <p className="login-error" role="alert">{error}</p> : null}

        <button type="submit" className="button button-primary login-submit" disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
          {!loading ? <ArrowRight size={17} aria-hidden="true" /> : null}
        </button>
      </form>
    </AuthLayout>
  )
}
