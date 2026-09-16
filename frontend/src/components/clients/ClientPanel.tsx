import { useEffect, useState, useRef } from 'react'
import { Phone, Mail, Building2, StickyNote } from 'lucide-react'
import { api } from '@/lib/api'
import type { Client, Message } from '@/types'

interface ConversationDetail {
  id: string
  whatsappChatId: string
  lastMessageAt: string | null
  messages: Message[]
}

interface ClientDetail extends Client {
  conversation: ConversationDetail | null
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

interface Props {
  clientId: string
}

export default function ClientPanel({ clientId }: Props) {
  const [detail, setDetail]   = useState<ClientDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const bottomRef             = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLoading(true)
    api.get<ClientDetail>(`/api/v1/clients/${clientId}`)
      .then(setDetail)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [clientId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [detail?.conversation?.messages])

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: '14px', color: '#9ca3af', margin: 0 }}>Carregando...</p>
      </div>
    )
  }

  if (!detail) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: '14px', color: '#9ca3af', margin: 0 }}>Cliente não encontrado</p>
      </div>
    )
  }

  const label = detail.name ?? detail.whatsapp ?? 'Sem nome'

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: '#fafafa' }}>

      {/* Cabeçalho do cliente */}
      <div style={{
        padding: '20px 24px',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        backgroundColor: '#ffffff',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '50%',
            backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '16px', fontWeight: 600, color: '#6b7280', flexShrink: 0,
          }}>
            {label.charAt(0).toUpperCase()}
          </div>
          <div>
            <p style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: 0, lineHeight: 1.3 }}>
              {label}
            </p>
            {detail.company ? (
              <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>{detail.company.name}</p>
            ) : (
              <span style={{
                fontSize: '11px', color: '#9ca3af',
                border: '1px solid #e5e7eb', borderRadius: '4px', padding: '1px 6px',
              }}>
                Sem empresa
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {detail.whatsapp && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Phone size={13} color="#9ca3af" />
              <span style={{ fontSize: '13px', color: '#374151' }}>{detail.whatsapp}</span>
            </div>
          )}
          {detail.email && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Mail size={13} color="#9ca3af" />
              <span style={{ fontSize: '13px', color: '#374151' }}>{detail.email}</span>
            </div>
          )}
          {detail.company && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={13} color="#9ca3af" />
              <span style={{ fontSize: '13px', color: '#374151' }}>{detail.company.name}</span>
            </div>
          )}
          {detail.notes && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <StickyNote size={13} color="#9ca3af" style={{ marginTop: '2px', flexShrink: 0 }} />
              <span style={{ fontSize: '13px', color: '#374151', lineHeight: 1.5 }}>{detail.notes}</span>
            </div>
          )}
        </div>
      </div>

      {/* Histórico de conversa */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {!detail.conversation && (
          <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: '14px', margin: '32px 0 0' }}>
            Nenhuma conversa com este cliente ainda
          </p>
        )}

        {detail.conversation?.messages.length === 0 && (
          <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: '14px', margin: '32px 0 0' }}>
            Nenhuma mensagem ainda
          </p>
        )}

        {detail.conversation?.messages.map((msg) => (
          <div
            key={msg.id}
            style={{ display: 'flex', justifyContent: msg.direction === 'out' ? 'flex-end' : 'flex-start' }}
          >
            <div style={{
              maxWidth: '68%', padding: '8px 12px',
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
    </div>
  )
}
