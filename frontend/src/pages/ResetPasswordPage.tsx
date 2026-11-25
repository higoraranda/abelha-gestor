import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Check, KeyRound } from 'lucide-react'
import { API_BASE_URL } from '@/lib/apiBase'
import { useAuthStore } from '@/store/auth'
import AuthLayout from './AuthLayout'
import PasswordField from './PasswordField'

const path = '/api/v1/account/password/reset/'
type Outcome = 'requested' | 'changed'

async function post(action: 'request' | 'confirm', body: object) {
  let response: Response
  try {
    response = await fetch(API_BASE_URL + path + action, {
      method: 'POST', credentials: 'include', cache: 'no-store',
      headers: {'Content-Type': 'application/json', 'X-Abelha-Client': 'web'},
      body: JSON.stringify(body), signal: AbortSignal.timeout(25000),
    })
  } catch {
    throw new Error('Não foi possível acessar o servidor. Confira sua conexão e tente novamente.')
  }
  const result = await response.json().catch(() => null)
  if (response.status >= 500 || response.status === 404) {
    throw new Error('A recuperação de senha está indisponível no momento. Tente novamente mais tarde.')
  }
  if (!response.ok) {
    throw new Error(typeof result?.error === 'string' ? result.error : 'Não foi possível concluir a recuperação.')
  }
  if (action === 'request' ? result?.accepted !== true : result?.changed !== true) {
    throw new Error('O servidor não confirmou a operação. Tente novamente.')
  }
}

export default function ResetPasswordPage() {
  const [link, setLink] = useState(() => ({ hash: window.location.hash, revision: 0 }))
  useEffect(() => {
    function readLink() {
      const hash = window.location.hash
      setLink(previous => ({ hash, revision: previous.revision + 1 }))
    }
    window.addEventListener('hashchange', readLink)
    return () => window.removeEventListener('hashchange', readLink)
  }, [])
  return <ResetPasswordForm key={link.revision} hash={link.hash} />
}

function ResetPasswordForm({ hash }: { hash: string }) {
  const value = new URLSearchParams(hash.slice(1)).get('token')
  const token = value && /^[\w-]{43}$/.test(value) ? value : ''
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const outcomesHeading = useRef<HTMLHeadingElement>(null)
  const clearAuth = useAuthStore(s => s.clearAuth)

  useLayoutEffect(() => {
    if (window.location.hash) window.history.replaceState(window.history.state, '', window.location.pathname)
  }, [])
  useLayoutEffect(() => { if (outcome) outcomesHeading.current?.focus() }, [outcome])

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || outcome) return
    setError('')
    if (token && (password.length < 12 || new TextEncoder().encode(password).length > 72)) {
      setError('Use pelo menos 12 caracteres e no máximo 72 bytes na nova senha.')
      return
    }
    if (token && password !== confirmation) {
      setError('As duas senhas precisam ser iguais.')
      return
    }
    setBusy(true)
    try {
      if (token) {
        await post('confirm', { token, password })
        clearAuth()
        setPassword('')
        setConfirmation('')
        setOutcome('changed')
      } else {
        await post('request', { email: email.trim() })
        setOutcome('requested')
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível concluir. Tente novamente.')
    } finally { setBusy(false) }
  }

  const Icon = outcome === 'changed' ? Check : KeyRound
  return <AuthLayout>
    <form className="login-form" onSubmit={submit} aria-busy={busy}>
      <span className="login-lock"><Icon size={19} aria-hidden="true" /></span>
      <div>
        <p className="eyebrow">Acesso à conta</p>
        <h2 ref={outcomesHeading} tabIndex={-1}>{outcome === 'changed' ? 'Senha redefinida' : outcome === 'requested' ? 'Confira seu e-mail' : token ? 'Crie uma nova senha' : 'Esqueceu sua senha?'}</h2>
        <p className="login-helper">{outcome === 'changed'
          ? 'As sessões anteriores foram encerradas. Entre com a nova senha.'
          : outcome === 'requested'
            ? 'Se a conta estiver apta para recuperação, você receberá um link de uso único. Confira também o spam.'
            : token ? 'Escolha uma senha que você não use em outros sites.' : 'Informe o e-mail cadastrado para receber um link de redefinição.'}</p>
      </div>
      {!outcome && (token ? <>
        <PasswordField label="Nova senha" name="new-password" autoComplete="new-password" aria-describedby="reset-password-hint" required minLength={12} maxLength={72} value={password} onChange={e => setPassword(e.target.value)} />
        <p className="login-helper" id="reset-password-hint">Pelo menos 12 caracteres. Letras com acento e emojis usam mais de um byte.</p>
        <PasswordField label="Confirme a nova senha" name="confirm-password" autoComplete="new-password" required minLength={12} maxLength={72} value={confirmation} onChange={e => setConfirmation(e.target.value)} />
      </> : <label className="login-field">
        <span>E-mail</span>
        <input name="email" type="email" autoComplete="email" maxLength={255} required value={email} onChange={e => setEmail(e.target.value)} />
      </label>)}
      {error && <p className="login-error" role="alert">{error}</p>}
      {!outcome && <button type="submit" className="button button-primary login-submit" disabled={busy}>
        {busy ? 'Aguarde...' : token ? 'Salvar nova senha' : 'Enviar link de redefinição'}
      </button>}
      {(token || outcome === 'requested') && outcome !== 'changed' && <a href="/redefinir-senha" className="login-text-link">Solicitar outro link</a>}
      <Link className="login-text-link" to="/login"><ArrowLeft size={16} aria-hidden="true" /> Voltar ao login</Link>
    </form>
  </AuthLayout>
}
