const BASE_URL = import.meta.env.VITE_API_URL as string

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
  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`, { credentials: 'include' })
  if (!csrfRes.ok) throw new Error('Falha ao iniciar autenticação')
  const { csrfToken } = await csrfRes.json() as { csrfToken: string }

  const body = new URLSearchParams({ csrfToken, email, password, redirect: 'false' })
  await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    credentials: 'include',
  })

  const sessionRes = await fetch(`${BASE_URL}/api/auth/session`, { credentials: 'include' })
  const session = await sessionRes.json() as { user?: LoginResult['user'] }

  if (!session?.user?.id) throw new Error('Email ou senha inválidos')

  return { user: session.user }
}

export async function logout(): Promise<void> {
  await fetch(`${BASE_URL}/api/auth/signout`, {
    method: 'POST',
    credentials: 'include',
  })
}
