import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { useSSE } from '@/hooks/useSSE'
import ConversationList from '@/components/inbox/ConversationList'
import MessageThread from '@/components/inbox/MessageThread'
import type { Conversation, Message } from '@/types'

type ConversationDetail = Conversation & { messages: Message[] }

export default function InboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedId,    setSelectedId]    = useState<string | null>(null)
  const [messages,      setMessages]      = useState<Message[]>([])
  const [loadingConvs,  setLoadingConvs]  = useState(true)
  const [loadingMsgs,   setLoadingMsgs]   = useState(false)
  const [sending,       setSending]       = useState(false)

  useEffect(() => {
    api.get<Conversation[]>('/api/v1/conversations')
      .then(setConversations)
      .catch(console.error)
      .finally(() => setLoadingConvs(false))
  }, [])

  useEffect(() => {
    if (!selectedId) { setMessages([]); return }

    setLoadingMsgs(true)
    api.get<ConversationDetail>(`/api/v1/conversations/${selectedId}`)
      .then((data) => setMessages(data.messages))
      .catch(console.error)
      .finally(() => setLoadingMsgs(false))

    api.post(`/api/v1/conversations/${selectedId}/read`, {}).catch(console.error)
    setConversations((prev) =>
      prev.map((c) => (c.id === selectedId ? { ...c, unreadCount: 0 } : c))
    )
  }, [selectedId])

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
      console.error('[inbox] falha ao enviar mensagem', err)
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <ConversationList
        conversations={conversations}
        selectedId={selectedId}
        loading={loadingConvs}
        onSelect={setSelectedId}
      />
      <MessageThread
        conversation={conversations.find((c) => c.id === selectedId) ?? null}
        messages={messages}
        loading={loadingMsgs}
        sending={sending}
        onSend={handleSend}
      />
    </div>
  )
}
