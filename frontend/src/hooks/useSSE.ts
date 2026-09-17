import { useEffect, useRef } from 'react'
import { API_BASE_URL } from '@/lib/apiBase'

export function useSSE(onEvent: (event: string, data: unknown) => void) {
  const callbackRef = useRef(onEvent)

  useEffect(() => {
    callbackRef.current = onEvent
  }, [onEvent])

  useEffect(() => {
    const es = new EventSource(`${API_BASE_URL}/api/events`, { withCredentials: true })

    const handle = (eventName: string) => (e: MessageEvent) => {
      try {
        callbackRef.current(eventName, JSON.parse(e.data as string))
      } catch {
        // ignora erros de parse
      }
    }

    es.addEventListener('new_message', handle('new_message'))
    es.addEventListener('conversation_updated', handle('conversation_updated'))

    return () => es.close()
  }, [])
}
