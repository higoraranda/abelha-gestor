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
  const csrfRes = await fetch(`${API_BASE_URL}/api/auth/csrf`, { credentials: 'include' })
  if (!csrfRes.ok) throw new Error('Falha ao iniciar autenticação')
  const { csrfToken } = await csrfRes.json() as { csrfToken: string }

  const body = new URLSearchParams({ csrfToken, email, password, redirect: 'false' })
  const callbackRes = await fetch(`${API_BASE_URL}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Auth-Return-Redirect': '1',
    },
    body: body.toString(),
    credentials: 'include',
  })
  if (!callbackRes.ok) throw new Error('Email ou senha inválidos')

  const sessionRes = await fetch(`${API_BASE_URL}/api/auth/session`, { credentials: 'include' })
  const session = await sessionRes.json() as { user?: LoginResult['user'] }

  if (!session?.user?.id) throw new Error('Email ou senha inválidos')

  return { user: session.user }
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
  await fetch(`${API_BASE_URL}/api/auth/signout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Auth-Return-Redirect': '1',
    },
    body: new URLSearchParams({ csrfToken, redirect: 'false' }).toString(),
    credentials: 'include',
  })
}
