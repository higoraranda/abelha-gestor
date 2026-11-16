export interface BackendFailure {
  reason: 'network' | 'timeout' | 'http' | 'invalid'
  status?: number
  nextRetryMs: number
}

interface BackendReadyOptions {
  signal: AbortSignal
  retryDelayMs?: number
  requestTimeoutMs?: number
  fetcher?: typeof fetch
  onFailure?: (failure: BackendFailure) => void
}

function pause(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    signal.throwIfAborted()
    const abort = () => {
      clearTimeout(timer)
      reject(signal.reason)
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', abort)
      resolve()
    }, ms)
    signal.addEventListener('abort', abort, { once: true })
  })
}

/** Resolves once, only after the configured backend returns its health contract. */
export async function waitForBackend(url: string, {
  signal,
  retryDelayMs = 2500,
  requestTimeoutMs = 12000,
  fetcher = fetch,
  onFailure,
}: BackendReadyOptions): Promise<void> {
  let failures = 0
  while (true) {
    signal.throwIfAborted()
    const attempt = new AbortController()
    const timeout = setTimeout(() => attempt.abort(), requestTimeoutMs)
    let reason: BackendFailure['reason'] = 'invalid'
    let status: number | undefined
    try {
      const response = await fetcher(url, {
        method: 'GET',
        cache: 'no-store',
        credentials: 'same-origin',
        redirect: 'error',
        signal: AbortSignal.any([signal, attempt.signal]),
      })
      status = response.status
      if (!response.ok) reason = 'http'
      if (response.ok && !response.redirected && response.headers.get('content-type')?.toLowerCase().includes('application/json')) {
        const body: unknown = await response.json()
        signal.throwIfAborted()
        if (!attempt.signal.aborted && body && typeof body === 'object' && 'status' in body && body.status === 'ok') return
      } else await response.body?.cancel()
    } catch {
      // Network errors, invalid JSON and request deadlines all keep the loader waiting.
      signal.throwIfAborted()
      reason = attempt.signal.aborted ? 'timeout' : status === undefined ? 'network' : 'invalid'
    } finally {
      clearTimeout(timeout)
    }
    const nextRetryMs = Math.min(retryDelayMs * 1.5 ** failures++, 10000)
    onFailure?.({ reason, status, nextRetryMs })
    await pause(nextRetryMs, signal)
  }
}
