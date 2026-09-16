import { Search, UserPlus } from 'lucide-react'
import type { Client } from '@/types'

interface Props {
  clients:    Client[]
  selectedId: string | null
  loading:    boolean
  search:     string
  onSearch:   (v: string) => void
  onSelect:   (c: Client) => void
  onNew:      () => void
}

export default function ClientList({ clients, selectedId, loading, search, onSearch, onSelect, onNew }: Props) {
  return (
    <>
      <style>{`
        .client-item:hover { background-color: #f9fafb; }
        .client-item.active { background-color: #FEFEF0; border-left: 3px solid #F2E600; }
        .client-item:not(.active) { border-left: 3px solid transparent; }
      `}</style>

      <div style={{
        width: '300px', flexShrink: 0,
        borderRight: '1px solid rgba(0,0,0,0.07)',
        backgroundColor: '#ffffff',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#111827', margin: 0 }}>Clientes</h2>
            <button
              onClick={onNew}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                fontSize: '12px', fontWeight: 500, color: '#111827',
                backgroundColor: '#F2E600', border: 'none', borderRadius: '6px',
                padding: '5px 10px', cursor: 'pointer',
              }}
            >
              <UserPlus size={13} />
              Novo cliente
            </button>
          </div>

          <div style={{ position: 'relative' }}>
            <Search size={14} color="#9ca3af" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Buscar por nome ou WhatsApp"
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '7px 10px 7px 30px',
                fontSize: '13px', color: '#111827',
                border: '1px solid rgba(0,0,0,0.1)', borderRadius: '6px',
                outline: 'none', backgroundColor: '#f9fafb',
              }}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading && (
            <p style={{ padding: '32px 20px', textAlign: 'center', color: '#9ca3af', fontSize: '14px', margin: 0 }}>
              Carregando...
            </p>
          )}

          {!loading && clients.length === 0 && (
            <p style={{ padding: '32px 20px', textAlign: 'center', color: '#9ca3af', fontSize: '14px', margin: 0 }}>
              {search ? 'Nenhum resultado' : 'Nenhum cliente ainda'}
            </p>
          )}

          {clients.map((client) => {
            const label = client.name ?? client.whatsapp ?? 'Sem nome'
            return (
              <button
                key={client.id}
                onClick={() => onSelect(client)}
                className={`client-item${client.id === selectedId ? ' active' : ''}`}
                style={{
                  width: '100%', padding: '12px 16px',
                  display: 'flex', alignItems: 'center', gap: '12px',
                  borderBottom: '1px solid rgba(0,0,0,0.04)',
                  cursor: 'pointer', background: 'none', textAlign: 'left',
                  transition: 'background-color 0.1s',
                }}
              >
                <div style={{
                  width: '38px', height: '38px', borderRadius: '50%',
                  backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', flexShrink: 0,
                  fontSize: '14px', fontWeight: 600, color: '#6b7280',
                }}>
                  {label.charAt(0).toUpperCase()}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {label}
                  </p>
                  {client.company ? (
                    <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {client.company.name}
                    </p>
                  ) : (
                    <span style={{
                      fontSize: '11px', color: '#9ca3af',
                      border: '1px solid #e5e7eb', borderRadius: '4px',
                      padding: '1px 5px',
                    }}>
                      Sem empresa
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}
