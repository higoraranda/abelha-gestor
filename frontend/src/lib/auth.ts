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

export async function getSession(): Promise<LoginResult['user'] | null> {
  const response = await fetch(`${API_BASE_URL}/api/auth/session`, { credentials: 'include' })
  if (!response.ok) return null
  const session = await response.json() as { user?: LoginResult['user'] }
  return session.user?.id ? session.user : null
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
