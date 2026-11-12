import { useState, useEffect, useRef } from 'react'
import { Send } from 'lucide-react'
import type { Conversation, Message } from '@/types'

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

interface Props {
  conversation: Conversation | null
  messages:     Message[]
  loading:      boolean
  sending:      boolean
  onSend:       (content: string) => void
}

export default function MessageThread({ conversation, messages, loading, sending, onSend }: Props) {
  const [input, setInput]     = useState('')
  const bottomRef             = useRef<HTMLDivElement>(null)
  const textareaRef           = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  }, [messages])

  function submit() {
    const trimmed = input.trim()
    if (!trimmed || sending) return
    onSend(trimmed)
    setInput('')
    textareaRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  if (!conversation) {
    return <div className="message-thread message-thread-empty"><p>Selecione uma conversa para começar</p></div>
  }

  const label = conversation.client?.name ?? conversation.client?.whatsapp ?? conversation.whatsappChatId

  return (
    <div className="message-thread">
      <header className="message-thread-heading">
        <span className="conversation-avatar">{label.charAt(0).toUpperCase()}</span>
        <div><strong>{label}</strong>{conversation.client?.whatsapp && <small>{conversation.client.whatsapp}</small>}</div>
      </header>
      <div className="message-list">
        {loading && <p className="conversation-empty">Carregando mensagens...</p>}
        {!loading && messages.length === 0 && <p className="conversation-empty">Nenhuma mensagem ainda</p>}
        {messages.map((msg) => (
          <div key={msg.id} className={'message-row message-' + msg.direction}>
            <div className="message-bubble"><p>{msg.content}</p><time>{formatTime(msg.createdAt)}</time></div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="message-composer">
        <textarea className="resize-none" ref={textareaRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
          aria-label="Mensagem" placeholder="Digite uma mensagem... (Enter para enviar, Shift+Enter para nova linha)" rows={1} />
        <button type="button" className="button button-primary" onClick={submit} disabled={!input.trim() || sending} aria-label={sending ? 'Enviando mensagem' : 'Enviar mensagem'}><Send size={16} /></button>
      </div>
    </div>
  )
}
