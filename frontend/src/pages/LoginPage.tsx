import { useState } from 'react'
import { ArrowRight, CheckCircle2, LockKeyhole } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { login } from '@/lib/auth'
import { useAuthStore } from '@/store/auth'

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
    <main className="login-page">
      <section className="login-intro" aria-label="Apresentação do Abelha">
        <div className="login-brand"><img className="brand-mark" src="/bee-logo.png" alt="" /><strong>abelha</strong></div>
        <div className="login-intro-copy">
          <p className="eyebrow">Seu CRM pessoal</p>
          <h1>Clientes, conversas e financeiro sob o seu controle.</h1>
          <p>Um espaço privado para organizar sua carteira e acompanhar cada oportunidade sem informações desnecessárias.</p>
        </div>
        <ul className="login-benefits">
          <li><CheckCircle2 size={16} aria-hidden="true" /> Acesso exclusivo aos seus dados</li>
          <li><CheckCircle2 size={16} aria-hidden="true" /> Clientes cadastrados diretamente</li>
          <li><CheckCircle2 size={16} aria-hidden="true" /> Sessão protegida no navegador</li>
        </ul>
      </section>

      <section className="login-form-side">
        <form className="login-form" onSubmit={handleSubmit}>
          <span className="login-lock"><LockKeyhole size={19} strokeWidth={1.8} aria-hidden="true" /></span>
          <div>
            <p className="eyebrow">Área privada</p>
            <h2>Entre no Abelha</h2>
            <p className="login-helper">Use seu email e senha cadastrados no CRM.</p>
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

          <label className="login-field">
            <span>Senha</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Digite sua senha"
              required
            />
          </label>

          {error ? <p className="login-error" role="alert">{error}</p> : null}

          <button type="submit" className="button button-primary login-submit" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
            {!loading ? <ArrowRight size={17} aria-hidden="true" /> : null}
          </button>
        </form>
      </section>
    </main>
  )
}
