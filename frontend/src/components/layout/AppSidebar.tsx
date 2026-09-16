import { Plus, Users, Bell, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { logout } from '@/lib/auth'
import type { Company } from '@/types'

const COMPANY_COLORS = ['#4f46e5', '#0891b2', '#059669', '#d97706', '#dc2626', '#7c3aed', '#db2777', '#ea580c']

export type SidebarView = 'company' | 'all-clients' | 'reminders'

interface Props {
  companies:          Company[]
  sidebarView:        SidebarView
  selectedCompanyId:  string | null
  onSelectCompany:    (id: string) => void
  onViewAllClients:   () => void
  onViewReminders:    () => void
  onAddCompany:       () => void
}

export default function AppSidebar({
  companies, sidebarView, selectedCompanyId,
  onSelectCompany, onViewAllClients, onViewReminders, onAddCompany,
}: Props) {
  const navigate   = useNavigate()
  const { user, clearAuth } = useAuthStore()

  async function handleLogout() {
    await logout()
    clearAuth()
    navigate('/login')
  }

  const initial = (user?.name ?? user?.email ?? '?').charAt(0).toUpperCase()

  const iconBtn = (active: boolean, onClick: () => void, title: string, children: React.ReactNode) => (
    <button
      title={title}
      onClick={onClick}
      style={{
        width: 36, height: 36, borderRadius: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: 'none', cursor: 'pointer', flexShrink: 0,
        backgroundColor: active ? '#1f1f1f' : 'transparent',
        color: active ? '#F2E600' : '#666',
      }}
    >
      {children}
    </button>
  )

  return (
    <aside style={{
      width: 64, flexShrink: 0,
      backgroundColor: '#111',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      paddingTop: 14, paddingBottom: 14, gap: 4,
    }}>
      {/* Avatar */}
      <div style={{
        width: 34, height: 34, borderRadius: '50%',
        backgroundColor: '#F2E600',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 700, color: '#111',
        flexShrink: 0, marginBottom: 6, cursor: 'default',
      }}
        title={user?.name ?? user?.email ?? ''}
      >
        {initial}
      </div>

      <div style={{ width: 34, height: 1, backgroundColor: '#252525', margin: '2px 0 6px' }} />

      {/* Company icons */}
      {companies.map((co, i) => {
        const isActive = sidebarView === 'company' && selectedCompanyId === co.id
        const color    = COMPANY_COLORS[i % COMPANY_COLORS.length]
        return (
          <button
            key={co.id}
            title={co.name}
            onClick={() => onSelectCompany(co.id)}
            style={{
              width: 34, height: 34, borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: '#fff',
              backgroundColor: color,
              border: isActive ? '2.5px solid #F2E600' : '2.5px solid transparent',
              cursor: 'pointer', flexShrink: 0, boxSizing: 'border-box',
            }}
          >
            {co.name.charAt(0).toUpperCase()}
          </button>
        )
      })}

      {/* Add company */}
      <button
        title="Adicionar empresa"
        onClick={onAddCompany}
        style={{
          width: 34, height: 34, borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1.5px dashed #333', backgroundColor: 'transparent',
          cursor: 'pointer', color: '#555', flexShrink: 0,
        }}
      >
        <Plus size={14} />
      </button>

      <div style={{ width: 34, height: 1, backgroundColor: '#252525', margin: '6px 0' }} />

      {iconBtn(sidebarView === 'all-clients', onViewAllClients, 'Todos os clientes', <Users size={17} />)}
      {iconBtn(sidebarView === 'reminders',   onViewReminders,  'Lembretes',         <Bell size={17} />)}

      <div style={{ flex: 1 }} />

      {iconBtn(false, handleLogout, 'Sair', <Settings size={17} />)}
    </aside>
  )
}
