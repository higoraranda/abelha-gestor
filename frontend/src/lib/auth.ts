import { API_BASE_URL } from '@/lib/apiBase'

export interface LoginResult {
  user: {
    id: string
    name: string | null
    email: string
    role: 'owner' | 'member'
    organizationId: string
  }
}

export interface StartupSession { user: LoginResult['user'] | null }

export async function login(email: string, password: string): Promise<LoginResult> {
  const unavailable = () => new Error('O servidor não conseguiu autenticar agora. Tente novamente em instantes.')
  const invalid = () => new Error('Email ou senha inválidos')
  const missingSession = () => new Error('Não foi possível confirmar a sessão. Se o erro continuar, fale com o suporte.')
  try {
    const request = (path: string, options?: RequestInit) => fetch(API_BASE_URL + path, {
      credentials: 'include', cache: 'no-store', signal: AbortSignal.timeout(25000), ...options,
    })
    const csrfRes = await request('/api/auth/csrf')
    const csrf = await csrfRes.json().catch(() => null) as { csrfToken?: string } | null
    if (!csrfRes.ok || !csrf?.csrfToken) throw unavailable()
    const body = new URLSearchParams({ csrfToken: csrf.csrfToken, email, password, redirect: 'false' })
    const callbackRes = await request('/api/auth/callback/credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Auth-Return-Redirect': '1' },
      body: body.toString(),
    })
    const callback = await callbackRes.json().catch(() => null) as { url?: string } | null
    if (!callback?.url || callbackRes.status >= 500) throw unavailable()
    const authError = new URL(callback.url, window.location.origin).searchParams.get('error')
    if (authError === 'CredentialsSignin') throw invalid()
    if (!callbackRes.ok || authError) throw unavailable()

    const sessionRes = await request('/api/auth/session')
    const session = await sessionRes.json().catch(() => null) as { user?: LoginResult['user'] } | null
    if (!sessionRes.ok || !session?.user?.id) throw missingSession()
    if (session.user.email?.trim().toLowerCase() !== email.trim().toLowerCase()) throw invalid()
    if (!session.user.organizationId || !['owner','member'].includes(session.user.role)) throw missingSession()
    return { user: session.user }
  } catch (error) {
    if (error instanceof TypeError || error instanceof DOMException) throw unavailable()
    throw error
  }
}

export async function getSession(signal?: AbortSignal): Promise<LoginResult['user'] | null> {
  const deadline = AbortSignal.timeout(20000)
  const response = await fetch(`${API_BASE_URL}/api/auth/session`, { credentials: 'include',cache:'no-store',signal:signal ? AbortSignal.any([signal, deadline]) : deadline })
  if ([401,403].includes(response.status)) return null
  if (!response.ok) throw new Error('Não foi possível verificar a sessão. Tente novamente quando o servidor estiver disponível.')
  const session = await response.json() as { user?: LoginResult['user'] } | null
  return session?.user?.id ? session.user : null
}

export async function logout(): Promise<void> {
  const csrfRes = await fetch(`${API_BASE_URL}/api/auth/csrf`, { credentials: 'include' })
  const { csrfToken } = await csrfRes.json() as { csrfToken: string }
  const response = await fetch(`${API_BASE_URL}/api/auth/signout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Auth-Return-Redirect': '1',
    },
    body: new URLSearchParams({ csrfToken, redirect: 'false' }).toString(),
    credentials: 'include',
  })
  if (!response.ok) throw new Error('Não foi possível sair da conta.')
}
