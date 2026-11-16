import { useCallback, useEffect, useState } from 'react'
import { waitForBackend } from '@/lib/backendReady'

export function useBackendReady(url: string) {
  const [ready, setReady] = useState(false)
  const [slow, setSlow] = useState(false)
  const [offline, setOffline] = useState(!navigator.onLine)
  const [revision, setRevision] = useState(0)
  const retry = useCallback(() => {
    setSlow(false)
    setRevision(value => value + 1)
  }, [])

  useEffect(() => {
    if (ready) return
    const controller = new AbortController()
    const slowTimer = window.setTimeout(() => setSlow(true), 45000)
    void waitForBackend(url, { signal: controller.signal }).then(() => {
      window.clearTimeout(slowTimer)
      if (!controller.signal.aborted) setReady(true)
    }, () => { /* Cleanup cancels the pending initialization. */ })
    return () => {
      controller.abort()
      window.clearTimeout(slowTimer)
    }
  }, [ready, revision, url])

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

  return { ready, slow, offline, retry }
}
