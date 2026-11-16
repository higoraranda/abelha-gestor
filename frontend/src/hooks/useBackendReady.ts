import { useCallback, useEffect, useState } from 'react'
import { waitForBackend } from '@/lib/backendReady'
import type { BackendFailure } from '@/lib/backendReady'

export function useBackendReady(url: string, prepare?: (signal: AbortSignal) => Promise<void>) {
  const [ready, setReady] = useState(false)
  const [slow, setSlow] = useState(false)
  const [offline, setOffline] = useState(!navigator.onLine)
  const [revision, setRevision] = useState(0)
  const [phase, setPhase] = useState<'backend' | 'access'>('backend')
  const [failure, setFailure] = useState<BackendFailure | null>(null)
  const [error, setError] = useState<string | null>(null)
  const retry = useCallback(() => {
    setSlow(false)
    setError(null)
    setFailure(null)
    setPhase('backend')
    setRevision(value => value + 1)
  }, [])

  useEffect(() => {
    if (ready) return
    const controller = new AbortController()
    const slowTimer = window.setTimeout(() => setSlow(true), 45000)
    async function initialize() {
      try {
        await waitForBackend(url, { signal: controller.signal, onFailure: setFailure })
        if (prepare) {
          setPhase('access')
          await prepare(controller.signal)
        }
        if (!controller.signal.aborted) setReady(true)
      } catch {
        if (!controller.signal.aborted) setError('Não foi possível verificar seu acesso. Tente novamente para entrar com segurança.')
      } finally {
        window.clearTimeout(slowTimer)
      }
    }
    void initialize()
    return () => {
      controller.abort()
      window.clearTimeout(slowTimer)
    }
  }, [ready, revision, url, prepare])

  useEffect(() => {
    if (ready) return
    const online = () => { setOffline(false); retry() }
    const offline = () => setOffline(true)
    window.addEventListener('online', online)
    window.addEventListener('offline', offline)
    return () => {
      window.removeEventListener('online', online)
      window.removeEventListener('offline', offline)
    }
  }, [ready, retry])

  return { ready, slow, offline, retry, phase, failure, error }
}
