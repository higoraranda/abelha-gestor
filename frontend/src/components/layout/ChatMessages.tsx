import { useRef, useEffect } from 'react'
import { Send } from 'lucide-react'
import type { ClientDetail } from '@/types'

interface Props {
  detail:       ClientDetail | null
  loading:      boolean
  message:      string
  sending:      boolean
  onMessage:    (v: string) => void
  onSend:       () => void
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export default function ChatMessages({ detail, loading, message, sending, onMessage, onSend }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [detail?.conversation?.messages])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey && message.trim()) {
      e.preventDefault()
      onSend()
    }
  }

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fafafa' }}>
        <p style={{ fontSize: 13, color: '#aaa', margin: 0 }}>Carregando...</p>
      </div>
    )
  }

  if (!detail) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fafafa' }}>
        <p style={{ fontSize: 13, color: '#aaa', margin: 0 }}>Selecione um cliente</p>
      </div>
    )
  }

  const label   = detail.name ?? detail.whatsapp ?? 'Sem nome'
  const hasConv = !!detail.conversation

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: '#fafafa' }}>
      {/* Header */}
      <div style={{
        padding: '0 20px',
        height: 48, flexShrink: 0,
        display: 'flex', alignItems: 'center',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        backgroundColor: '#fff', gap: 6,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          backgroundColor: '#f0f0f0', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#777', flexShrink: 0,
        }}>
          {label.charAt(0).toUpperCase()}
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{label}</span>
        {detail.company && (
          <>
            <span style={{ color: '#ccc', fontSize: 12 }}>·</span>
            <span style={{ fontSize: 12, color: '#888' }}>{detail.company.name}</span>
          </>
        )}
        {detail.whatsapp && (
          <>
            <span style={{ color: '#ccc', fontSize: 12 }}>·</span>
            <span style={{ fontSize: 12, color: '#aaa' }}>{detail.whatsapp}</span>
          </>
        )}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {!hasConv && (
          <p style={{ textAlign: 'center', color: '#bbb', fontSize: 13, margin: '32px 0 0' }}>
            Nenhuma conversa via WhatsApp ainda
          </p>
        )}

        {hasConv && detail.conversation!.messages.length === 0 && (
          <p style={{ textAlign: 'center', color: '#bbb', fontSize: 13, margin: '32px 0 0' }}>
            Nenhuma mensagem ainda
          </p>
        )}

        {hasConv && detail.conversation!.messages.map((msg) => (
          <div key={msg.id} style={{ display: 'flex', justifyContent: msg.direction === 'out' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '68%', padding: '8px 12px',
              borderRadius: msg.direction === 'out' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
              backgroundColor: msg.direction === 'out' ? '#F2E600' : '#fff',
              boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
            }}>
              <p style={{ fontSize: 13, color: '#111', lineHeight: 1.5, margin: 0, wordBreak: 'break-word' }}>
                {msg.content}
              </p>
              <p style={{ fontSize: 10, color: 'rgba(0,0,0,0.35)', margin: '3px 0 0', textAlign: 'right' }}>
                {formatTime(msg.createdAt)}
              </p>
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {hasConv && (
        <div style={{
          padding: '10px 16px 14px',
          flexShrink: 0, backgroundColor: '#fafafa',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            backgroundColor: '#fff', borderRadius: 24,
            border: '1px solid rgba(0,0,0,0.1)',
            padding: '6px 6px 6px 16px',
          }}>
            <input
              type="text"
              value={message}
              onChange={(e) => onMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Mensagem..."
              style={{
                flex: 1, border: 'none', outline: 'none',
                fontSize: 13, color: '#111', backgroundColor: 'transparent',
                fontFamily: 'inherit',
              }}
            />
            <button
              onClick={onSend}
              disabled={sending || !message.trim()}
              style={{
                width: 32, height: 32, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: message.trim() ? '#F2E600' : '#f0f0f0',
                border: 'none', cursor: message.trim() ? 'pointer' : 'default',
                flexShrink: 0, transition: 'background-color 0.15s',
              }}
            >
              <Send size={14} color={message.trim() ? '#111' : '#aaa'} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
