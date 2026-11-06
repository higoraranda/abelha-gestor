import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
export function useRemote<T>(path: string | null) {
  const [revision, setRevision] = useState(0)
  const [result, setResult] = useState<{ key: string | null; revision: number; data: T | null; error: string | null }>({ key: null, revision: -1, data: null, error: null })
  useEffect(() => { const refresh=()=>setRevision(value=>value+1); window.addEventListener('abelha:updated',refresh); return ()=>window.removeEventListener('abelha:updated',refresh) }, [])
  useEffect(() => {
    if (!path) return
    const controller = new AbortController()
    api.get<T>(path, controller.signal).then(data => { if(!controller.signal.aborted) setResult({ key: path, revision, data, error: null }) }).catch(error => {
      if (!controller.signal.aborted) setResult({ key: path, revision, data: null, error: error instanceof Error ? error.message : 'Falha ao consultar a API.' })
    })
    return () => controller.abort()
  }, [path, revision])
  const current = result.key === path && result.revision === revision
  return { data: result.key === path ? result.data : null, error: current ? result.error : null, loading: Boolean(path) && !current, reload: useCallback(() => setRevision(value => value + 1), []) }
}
