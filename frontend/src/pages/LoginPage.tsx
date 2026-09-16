import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '@/lib/auth'
import { useAuthStore } from '@/store/auth'

// OpenType features que definem a identidade tipográfica do design system
const ff: React.CSSProperties = { fontFeatureSettings: '"cv01", "ss03"' }

const inputStyle: React.CSSProperties = {
  backgroundColor: 'rgba(255,255,255,0.02)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '6px',
  padding: '12px 14px',
  fontSize: '15px',
  fontWeight: 400,
  lineHeight: 1.5,
  color: '#d0d6e0',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  letterSpacing: '-0.165px',
  fontFamily: 'inherit',
  ...ff,
}

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = await login(email, password)
      setAuth(result.user)
      navigate('/inbox')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        .ml-input::placeholder { color: rgba(255,255,255,0.2); }
        .ml-input:focus {
          border-color: rgba(255,255,255,0.22) !important;
          box-shadow: rgba(0,0,0,0.1) 0px 4px 12px;
        }
        .ml-btn:hover:not(:disabled) { filter: brightness(0.9); }
        .ml-btn:disabled { opacity: 0.55; cursor: not-allowed; }
      `}</style>

      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          fontFamily: 'Inter Variable, Inter, -apple-system, system-ui, sans-serif',
          ...ff,
        }}
      >
        {/* ── Painel esquerdo — formulário ── */}
        <div
          style={{
            flex: 1,
            backgroundColor: '#0f1011',
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
          }}
        >
          {/* Marca */}
          <header style={{ padding: '32px 40px' }}>
            <span
              style={{
                fontSize: '18px',
                fontWeight: 510,
                color: '#f7f8f8',
                letterSpacing: '-0.165px',
                ...ff,
              }}
            >
              Abelha
            </span>
          </header>

          {/* Formulário centralizado verticalmente */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 32px 64px',
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '360px',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px',
              }}
            >
              <h1
                style={{
                  fontSize: '28px',
                  fontWeight: 300,
                  lineHeight: 1.2,
                  letterSpacing: '-0.288px',
                  color: '#f7f8f8',
                  margin: 0,
                  ...ff,
                }}
              >
                Entrar na sua conta
              </h1>

              <form
                onSubmit={handleSubmit}
                style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
              >
                {/* Email */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label
                    htmlFor="email"
                    style={{
                      fontSize: '13px',
                      fontWeight: 510,
                      color: '#8a8f98',
                      letterSpacing: '-0.13px',
                      ...ff,
                    }}
                  >
                    Endereço de email
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="ml-input"
                    style={inputStyle}
                  />
                </div>

                {/* Senha */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label
                    htmlFor="password"
                    style={{
                      fontSize: '13px',
                      fontWeight: 510,
                      color: '#8a8f98',
                      letterSpacing: '-0.13px',
                      ...ff,
                    }}
                  >
                    Senha
                  </label>
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="ml-input"
                    style={inputStyle}
                  />
                </div>

                {/* Erro */}
                {error && (
                  <p
                    style={{
                      fontSize: '13px',
                      color: '#ef4444',
                      backgroundColor: 'rgba(239,68,68,0.08)',
                      border: '1px solid rgba(239,68,68,0.18)',
                      borderRadius: '6px',
                      padding: '10px 14px',
                      margin: 0,
                      lineHeight: 1.5,
                      ...ff,
                    }}
                  >
                    {error}
                  </p>
                )}

                {/* Botão principal — accent #F2E600 via inline style */}
                <button
                  type="submit"
                  disabled={loading}
                  className="ml-btn"
                  style={{
                    backgroundColor: '#F2E600',
                    color: '#08090a',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '13px 16px',
                    fontSize: '15px',
                    fontWeight: 590,
                    letterSpacing: '-0.165px',
                    width: '100%',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    ...ff,
                  }}
                >
                  {loading ? 'Entrando...' : 'Entrar'}
                </button>
              </form>
            </div>
          </div>
        </div>

      </div>
    </>
  )
}
