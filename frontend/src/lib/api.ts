import { API_BASE_URL } from '@/lib/apiBase'
import { requestTimeout } from './requestTimeout'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'X-Abelha-Client': 'web',
    ...options.headers,
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
    cache: 'no-store',
    signal: options.signal ? AbortSignal.any([options.signal,AbortSignal.timeout(requestTimeout(path))]) : AbortSignal.timeout(requestTimeout(path)),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Erro desconhecido' }))
    const body = error as { error?: string; message?: string }
    throw new Error(body.error ?? body.message ?? `HTTP ${response.status}`)
  }

  if (response.status === 204) {
    window.dispatchEvent(new Event('abelha:updated'))
    return undefined as T
  }

  const result = await response.json() as T
  if (options.method && options.method !== 'GET') window.dispatchEvent(new Event('abelha:updated'))
  return result
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>(path, { signal }),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string, body?: unknown) => request<T>(path, { method: 'DELETE', ...(body===undefined?{}:{body:JSON.stringify(body)}) }),
}
