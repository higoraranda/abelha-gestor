import { Search, UserPlus } from 'lucide-react'
import type { Client, Company, Reminder } from '@/types'
import type { SidebarView } from './AppSidebar'

interface Props {
  sidebarView:       SidebarView
  selectedCompany:   Company | null
  clients:           Client[]
  reminders:         Reminder[]
  loading:           boolean
  search:            string
  onSearch:          (v: string) => void
  onSelectClient:    (c: Client) => void
  onSelectReminder:  (r: Reminder) => void
  onNewClient:       () => void
  selectedClientId:  string | null
}

function formatDue(dueAt: string) {
  return new Date(dueAt).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function ClientColumn({
  sidebarView, selectedCompany, clients, reminders, loading,
  search, onSearch, onSelectClient, onSelectReminder, onNewClient, selectedClientId,
}: Props) {
  const title =
    sidebarView === 'reminders'                    ? 'Lembretes' :
    sidebarView === 'company' && selectedCompany   ? selectedCompany.name :
    'Todos os clientes'

  const isReminders = sidebarView === 'reminders'

  return (
    <div style={{
      width: 240, flexShrink: 0,
      borderRight: '1px solid rgba(0,0,0,0.07)',
      backgroundColor: '#fff',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid rgba(0,0,0,0.06)', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isReminders ? 0 : 10 }}>
          <p style={{
            fontSize: 12, fontWeight: 600, color: '#555', margin: 0, textTransform: 'uppercase',
            letterSpacing: '0.05em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {title}
          </p>
          {!isReminders && (
            <button
              onClick={onNewClient}
              title="Novo cliente"
              style={{
                width: 24, height: 24, borderRadius: 6,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: '#F2E600', border: 'none', cursor: 'pointer', flexShrink: 0,
              }}
            >
              <UserPlus size={12} color="#111" />
            </button>
          )}
        </div>

        {!isReminders && (
          <div style={{ position: 'relative' }}>
            <Search size={12} color="#bbb" style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Buscar..."
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '6px 8px 6px 27px',
                fontSize: 12, color: '#111',
                border: '1px solid rgba(0,0,0,0.09)', borderRadius: 6,
                outline: 'none', backgroundColor: '#f7f7f7', fontFamily: 'inherit',
              }}
            />
          </div>
        )}
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading && (
          <p style={{ padding: '20px 14px', textAlign: 'center', color: '#bbb', fontSize: 12, margin: 0 }}>
            Carregando...
          </p>
        )}

        {/* Clients */}
        {!isReminders && !loading && clients.length === 0 && (
          <p style={{ padding: '20px 14px', textAlign: 'center', color: '#bbb', fontSize: 12, margin: 0 }}>
            {search ? 'Nenhum resultado' : 'Nenhum cliente'}
          </p>
        )}

        {!isReminders && clients.map((client) => {
          const label    = client.name ?? client.whatsapp ?? 'Sem nome'
          const isActive = client.id === selectedClientId
          return (
            <button
              key={client.id}
              onClick={() => onSelectClient(client)}
              style={{
                width: '100%', padding: '10px 14px',
                display: 'flex', alignItems: 'center', gap: 10,
                borderBottom: '1px solid rgba(0,0,0,0.04)',
                cursor: 'pointer', textAlign: 'left',
                backgroundColor: isActive ? '#FEFEF0' : 'transparent',
                borderLeft: isActive ? '3px solid #F2E600' : '3px solid transparent',
                boxSizing: 'border-box',
                transition: 'background-color 0.1s',
              }}
            >
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                backgroundColor: '#f0f0f0', display: 'flex', alignItems: 'center',
                justifyContent: 'center', flexShrink: 0,
                fontSize: 11, fontWeight: 700, color: '#777',
              }}>
                {label.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: '#111', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {label}
                </p>
                {client.company ? (
                  <p style={{ fontSize: 11, color: '#888', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {client.company.name}
                  </p>
                ) : (
                  <span style={{ fontSize: 10, color: '#bbb', border: '1px solid #e5e7eb', borderRadius: 3, padding: '0 4px' }}>
                    Sem empresa
                  </span>
                )}
              </div>
            </button>
          )
        })}

        {/* Reminders */}
        {isReminders && !loading && reminders.length === 0 && (
          <p style={{ padding: '20px 14px', textAlign: 'center', color: '#bbb', fontSize: 12, margin: 0 }}>
            Nenhum lembrete
          </p>
        )}

        {isReminders && reminders.map((reminder) => {
          const overdue = !reminder.completed && new Date(reminder.dueAt) < new Date()
          return (
            <button
              key={reminder.id}
              onClick={() => onSelectReminder(reminder)}
              style={{
                width: '100%', padding: '10px 14px',
                display: 'flex', alignItems: 'flex-start', gap: 10,
                borderBottom: '1px solid rgba(0,0,0,0.04)',
                cursor: 'pointer', textAlign: 'left', backgroundColor: 'transparent',
                borderLeft: '3px solid transparent', boxSizing: 'border-box',
              }}
            >
              <div style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 4,
                backgroundColor: reminder.completed ? '#ddd' : overdue ? '#ef4444' : '#F2E600',
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontSize: 13, fontWeight: 500, margin: '0 0 2px',
                  color: reminder.completed ? '#bbb' : '#111',
                  textDecoration: reminder.completed ? 'line-through' : 'none',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {reminder.title}
                </p>
                <p style={{ fontSize: 11, color: overdue && !reminder.completed ? '#ef4444' : '#aaa', margin: 0 }}>
                  {formatDue(reminder.dueAt)}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
