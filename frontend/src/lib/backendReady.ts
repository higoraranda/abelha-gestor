interface BackendReadyOptions {
  signal: AbortSignal
  retryDelayMs?: number
  requestTimeoutMs?: number
  fetcher?: typeof fetch
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
}: BackendReadyOptions): Promise<void> {
  while (true) {
    signal.throwIfAborted()
    const attempt = new AbortController()
    const timeout = setTimeout(() => attempt.abort(), requestTimeoutMs)
    try {
      const response = await fetcher(url, {
        method: 'GET',
        cache: 'no-store',
        credentials: 'omit',
        signal: AbortSignal.any([signal, attempt.signal]),
      })
      if (response.ok && !response.redirected && response.headers.get('content-type')?.includes('application/json')) {
        const body: unknown = await response.json()
        signal.throwIfAborted()
        if (!attempt.signal.aborted && body && typeof body === 'object' && 'status' in body && body.status === 'ok') return
      }
    } catch {
      // Network errors, invalid JSON and request deadlines all keep the loader waiting.
      signal.throwIfAborted()
    } finally {
      clearTimeout(timeout)
    }
    await pause(retryDelayMs, signal)
  }
}
