import {
  CalendarDays,
  ChartNoAxesCombined,
  CircleDollarSign,
  ContactRound,
  LayoutDashboard,
  MessageSquareText,
  PackageOpen,
  LogOut,
  Settings,
  Sparkles,
  X,
} from 'lucide-react'

export type AppView =
  | 'overview'
  | 'clients'
  | 'inbox'
  | 'pipeline'
  | 'finance'
  | 'agenda'
  | 'catalog'

interface Props {
  activeView: AppView
  isOpen: boolean
  onClose: () => void
  onChange: (view: AppView) => void
  onLogout: () => void
  pendingReminders: number
}

const PRIMARY_NAV = [
  { id: 'overview', label: 'Visão geral', icon: LayoutDashboard },
  { id: 'clients', label: 'Clientes', icon: ContactRound },
  { id: 'inbox', label: 'Conversas', icon: MessageSquareText },
] as const

const OPERATIONS_NAV = [
  { id: 'pipeline', label: 'Pipeline', icon: ChartNoAxesCombined },
  { id: 'finance', label: 'Financeiro', icon: CircleDollarSign },
  { id: 'agenda', label: 'Agenda', icon: CalendarDays },
  { id: 'catalog', label: 'Serviços e preços', icon: PackageOpen },
] as const

export default function AppSidebar({ activeView, isOpen, onClose, onChange, onLogout, pendingReminders }: Props) {
  function select(view: AppView) {
    onChange(view)
    onClose()
  }

  const renderItem = ({ id, label, icon: Icon }: (typeof PRIMARY_NAV)[number] | (typeof OPERATIONS_NAV)[number]) => {
    const active = activeView === id

    return (
      <button
        key={id}
        type="button"
        className={`sidebar-nav-item${active ? ' is-active' : ''}`}
        onClick={() => select(id)}
        aria-current={active ? 'page' : undefined}
      >
        <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
        <span>{label}</span>
        {id === 'agenda' && pendingReminders > 0 ? (
          <span className="sidebar-badge" aria-label={`${pendingReminders} lembretes pendentes`}>
            {pendingReminders > 99 ? '99+' : pendingReminders}
          </span>
        ) : null}
      </button>
    )
  }

  return (
    <aside className={`app-sidebar${isOpen ? ' is-open' : ''}`} aria-label="Navegação principal">
      <div className="sidebar-brand-row">
        <button type="button" className="sidebar-brand" onClick={() => select('overview')} aria-label="Ir para a visão geral">
          <span className="brand-mark">a</span>
          <span className="brand-name">abelha</span>
        </button>
        <button type="button" className="sidebar-close" onClick={onClose} aria-label="Fechar menu">
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="workspace-switcher">
        <span className="workspace-avatar">HG</span>
        <span className="workspace-copy">
          <strong>Carteira pessoal</strong>
          <small>Uso individual</small>
        </span>
      </div>

      <nav className="sidebar-navigation">
        <div className="sidebar-nav-group">
          <p className="sidebar-label">CRM</p>
          {PRIMARY_NAV.map(renderItem)}
        </div>

        <div className="sidebar-nav-group">
          <p className="sidebar-label">Gestão</p>
          {OPERATIONS_NAV.map(renderItem)}
        </div>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-insight">
          <span className="insight-icon"><Sparkles size={15} aria-hidden="true" /></span>
          <div>
            <strong>Central de melhorias</strong>
            <p>Seu CRM crescerá por módulos.</p>
          </div>
        </div>
        <button type="button" className="sidebar-nav-item">
          <Settings size={18} strokeWidth={1.8} aria-hidden="true" />
          <span>Configurações</span>
        </button>
        <button type="button" className="sidebar-user" onClick={onLogout} title="Sair da conta">
          <span className="sidebar-user-avatar">HA</span>
          <span>
            <strong>Higor Aranda</strong>
            <small>Administrador</small>
          </span>
          <LogOut size={17} aria-hidden="true" />
        </button>
      </div>
    </aside>
  )
}
