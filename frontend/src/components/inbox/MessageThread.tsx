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
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    setInput('')
  }, [conversation?.id])

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
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fafafa' }}>
        <p style={{ fontSize: '14px', color: '#9ca3af', margin: 0 }}>
          Selecione uma conversa para começar
        </p>
      </div>
    )
  }

  const label = conversation.client?.name ?? conversation.client?.whatsapp ?? conversation.whatsappChatId

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: '#fafafa' }}>

      {/* Cabeçalho */}
      <div style={{
        padding: '14px 20px',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        backgroundColor: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexShrink: 0,
      }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '50%',
          backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: '14px', fontWeight: 600, color: '#6b7280',
          flexShrink: 0,
        }}>
          {label.charAt(0).toUpperCase()}
        </div>
        <div>
          <p style={{ fontSize: '15px', fontWeight: 600, color: '#111827', margin: 0, lineHeight: 1.3 }}>
            {label}
          </p>
          {conversation.client?.whatsapp && (
            <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>
              {conversation.client.whatsapp}
            </p>
          )}
        </div>
      </div>

      {/* Mensagens */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {loading && (
          <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: '14px', margin: '32px 0 0' }}>
            Carregando mensagens...
          </p>
        )}

        {!loading && messages.length === 0 && (
          <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: '14px', margin: '32px 0 0' }}>
            Nenhuma mensagem ainda
          </p>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{ display: 'flex', justifyContent: msg.direction === 'out' ? 'flex-end' : 'flex-start' }}
          >
            <div style={{
              maxWidth: '68%',
              padding: '8px 12px',
              borderRadius: msg.direction === 'out' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
              backgroundColor: msg.direction === 'out' ? '#F2E600' : '#ffffff',
              boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
            }}>
              <p style={{ fontSize: '14px', color: '#111827', lineHeight: 1.5, margin: 0, wordBreak: 'break-word' }}>
                {msg.content}
              </p>
              <p style={{ fontSize: '11px', color: 'rgba(0,0,0,0.4)', margin: '3px 0 0', textAlign: 'right' }}>
                {formatTime(msg.createdAt)}
              </p>
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(0,0,0,0.06)', backgroundColor: '#ffffff', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite uma mensagem... (Enter para enviar, Shift+Enter para nova linha)"
            rows={1}
            style={{
              flex: 1,
              resize: 'none',
              border: '1px solid rgba(0,0,0,0.1)',
              borderRadius: '8px',
              padding: '10px 14px',
              fontSize: '14px',
              color: '#111827',
              outline: 'none',
              fontFamily: 'inherit',
              lineHeight: 1.5,
              backgroundColor: '#f9fafb',
              maxHeight: '120px',
              overflowY: 'auto',
            }}
          />
          <button
            type="button"
            onClick={submit}
            disabled={!input.trim() || sending}
            style={{
              backgroundColor: '#F2E600',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 14px',
              cursor: !input.trim() || sending ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              opacity: !input.trim() || sending ? 0.45 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            <Send size={16} color="#111827" />
          </button>
        </div>
      </div>

    </div>
  )
}
