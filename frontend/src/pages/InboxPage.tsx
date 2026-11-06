import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { useSSE } from '@/hooks/useSSE'
import ConversationList from '@/components/inbox/ConversationList'
import MessageThread from '@/components/inbox/MessageThread'
import type { Conversation, Message } from '@/types'
import { ErrorState } from '@/components/ui/DataState'

type ConversationDetail = Conversation & { messages: Message[] }

export default function InboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedId,    setSelectedId]    = useState<string | null>(null)
  const [messages,      setMessages]      = useState<Message[]>([])
  const [loadingConvs,  setLoadingConvs]  = useState(true)
  const [loadingMsgs,   setLoadingMsgs]   = useState(false)
  const [sending,       setSending]       = useState(false)
  const [error,setError] = useState<string|null>(null)

  useEffect(() => {
    api.get<Conversation[]>('/api/v1/conversations')
      .then(setConversations)
      .catch(error=>setError(error instanceof Error?error.message:'Não foi possível carregar as conversas.'))
      .finally(() => setLoadingConvs(false))
  }, [])

  useEffect(() => {
    if (!selectedId) return
    let cancelled = false

    async function loadConversation() {
      setLoadingMsgs(true)
      try {
        const [data] = await Promise.all([
          api.get<ConversationDetail>(`/api/v1/conversations/${selectedId}`),
          api.post(`/api/v1/conversations/${selectedId}/read`, {}),
        ])
        if (cancelled) return
        setMessages(data.messages)
        setConversations((prev) => prev.map((conversation) =>
          conversation.id === selectedId ? { ...conversation, unreadCount: 0 } : conversation
        ))
      } catch (error) {
        setError(error instanceof Error?error.message:'Não foi possível abrir a conversa.')
        console.error(error)
      } finally {
        if (!cancelled) setLoadingMsgs(false)
      }
    }

    void loadConversation()
    return () => { cancelled = true }
  }, [selectedId])

  function selectConversation(id: string) {
    setMessages([])
    setSelectedId(id)
  }

  useSSE((event, data) => {
    if (event !== 'new_message') return
    const { conversation_id, message } = data as { conversation_id: string; message: Message }

    setConversations((prev) => {
      const updated = prev.map((c) =>
        c.id === conversation_id
          ? { ...c, lastMessageAt: message.createdAt, unreadCount: c.id === selectedId ? 0 : c.unreadCount + 1 }
          : c
      )
      return [...updated].sort((a, b) => {
        if (!a.lastMessageAt) return 1
        if (!b.lastMessageAt) return -1
        return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
      })
    })

    if (conversation_id === selectedId) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev
        return [...prev, message]
      })
    }
  })

  async function handleSend(content: string) {
    if (!selectedId) return
    setSending(true)
    try {
      const message = await api.post<Message>('/api/v1/messages', { conversation_id: selectedId, content })
      setMessages((prev) => [...prev, message])
      setConversations((prev) =>
        prev.map((c) => (c.id === selectedId ? { ...c, lastMessageAt: message.createdAt } : c))
      )
    } catch (err) {
      setError(err instanceof Error?err.message:'Não foi possível enviar a mensagem.')
      console.error('[inbox] falha ao enviar mensagem', err)
    } finally {
      setSending(false)
    }
  }

  if(error) return <ErrorState message={error} retry={()=>{setSelectedId(null);setMessages([]);setError(null);setLoadingConvs(true);api.get<Conversation[]>('/api/v1/conversations').then(setConversations).catch(e=>setError(e instanceof Error?e.message:'Falha na consulta.')).finally(()=>setLoadingConvs(false))}}/>
  return (
    <div className={'inbox-shell'+(selectedId?' has-selection':'')}>
      {selectedId&&<button className="inbox-back button button-secondary" onClick={()=>setSelectedId(null)}>Voltar para conversas</button>}
      <ConversationList
        conversations={conversations}
        selectedId={selectedId}
        loading={loadingConvs}
        onSelect={selectConversation}
      />
      <MessageThread
        key={selectedId ?? 'no-conversation'}
        conversation={conversations.find((c) => c.id === selectedId) ?? null}
        messages={messages}
        loading={loadingMsgs}
        sending={sending}
        onSend={handleSend}
      />
    </div>
  )
}
