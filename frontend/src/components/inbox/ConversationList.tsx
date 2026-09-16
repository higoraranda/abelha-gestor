import type { Conversation } from '@/types'

function formatTime(dateStr: string | null): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 1) return 'Ontem'
  if (diffDays < 7)  return date.toLocaleDateString('pt-BR', { weekday: 'short' })
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

interface Props {
  conversations: Conversation[]
  selectedId:    string | null
  loading:       boolean
  onSelect:      (id: string) => void
}

export default function ConversationList({ conversations, selectedId, loading, onSelect }: Props) {
  return (
    <>
      <style>{`
        .conv-item:hover { background-color: #f9fafb; }
        .conv-item.active { background-color: #FEFEF0; border-left: 3px solid #F2E600; }
        .conv-item:not(.active) { border-left: 3px solid transparent; }
      `}</style>

      <div style={{
        width: '300px',
        flexShrink: 0,
        borderRight: '1px solid rgba(0,0,0,0.07)',
        backgroundColor: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#111827', margin: 0 }}>
            Conversas
          </h2>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading && (
            <p style={{ padding: '32px 20px', textAlign: 'center', color: '#9ca3af', fontSize: '14px', margin: 0 }}>
              Carregando...
            </p>
          )}

          {!loading && conversations.length === 0 && (
            <p style={{ padding: '32px 20px', textAlign: 'center', color: '#9ca3af', fontSize: '14px', margin: 0 }}>
              Nenhuma conversa ainda
            </p>
          )}

          {conversations.map((conv) => {
            const label = conv.client?.name ?? conv.client?.whatsapp ?? conv.whatsappChatId
            return (
              <button
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={`conv-item${conv.id === selectedId ? ' active' : ''}`}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  borderBottom: '1px solid rgba(0,0,0,0.04)',
                  cursor: 'pointer',
                  background: 'none',
                  textAlign: 'left',
                  transition: 'background-color 0.1s',
                }}
              >
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%',
                  backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', flexShrink: 0,
                  fontSize: '15px', fontWeight: 600, color: '#6b7280',
                }}>
                  {label.charAt(0).toUpperCase()}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {label}
                    </span>
                    <span style={{ fontSize: '11px', color: '#9ca3af', flexShrink: 0, marginLeft: '8px' }}>
                      {formatTime(conv.lastMessageAt)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {conv.client?.company ? (
                      <span style={{ fontSize: '12px', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {conv.client.company.name}
                      </span>
                    ) : (
                      <span style={{
                        fontSize: '11px', color: '#9ca3af',
                        border: '1px solid #e5e7eb', borderRadius: '4px',
                        padding: '1px 5px', flexShrink: 0,
                      }}>
                        Sem empresa
                      </span>
                    )}
                    {conv.unreadCount > 0 && (
                      <span style={{
                        backgroundColor: '#F2E600',
                        color: '#111827',
                        fontSize: '11px',
                        fontWeight: 700,
                        borderRadius: '9999px',
                        padding: '1px 7px',
                        flexShrink: 0,
                        marginLeft: '8px',
                      }}>
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}
