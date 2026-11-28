import * as Dialog from '@radix-ui/react-dialog'
import {
  Bell, CalendarDays, Calculator, ChartColumn, CircleDollarSign, ClipboardList, ContactRound,
  Download, ExternalLink, FolderKanban, House, LayoutDashboard, ListChecks, LogOut, Menu,
  MessageSquareText, Plus, Radar, Receipt, Search, Settings, Tags, Waypoints, X, type LucideIcon,
} from 'lucide-react'
import { useRef, useState, useSyncExternalStore } from 'react'
import { NAVIGATION, PERSONAL_NAVIGATION, type AppView, type AppSpace } from '@/lib/navigation'
import ThemeToggle from '@/components/ui/ThemeToggle'

export type { AppView } from '@/lib/navigation'

interface Props {
  space: AppSpace
  activeView: AppView
  pendingReminders: number
  onSpace: (space: AppSpace) => void
  onChange: (view: AppView) => void
  onNotifications: () => void
  onSearch: () => void
  onCreate: () => void
  onExport: () => void
  onLogout?: () => void
}

const icons: Record<AppView, LucideIcon> = {
  overview: LayoutDashboard, clients: ContactRound, inbox: MessageSquareText, leads: Radar,
  deliveries: ClipboardList, pipeline: Waypoints, finance: CircleDollarSign, agenda: CalendarDays,
  reports: ChartColumn, 'quote-models': Calculator,
  'personal-overview': House, 'personal-projects': FolderKanban, 'personal-review': ListChecks,
  'personal-finance': CircleDollarSign, 'personal-subscriptions': Receipt, 'personal-prices': Tags,
  'personal-settings': Settings,
}

const crmMain = new Set<AppView>(['overview', 'clients', 'inbox', 'leads'])
const personalMain = new Set<AppView>(['personal-overview', 'personal-projects', 'personal-review'])
const compactQuery = '(width < 1024px)'
const runImmediately = (action: () => void) => action()

function subscribeToWidth(listener: () => void) {
  const media = window.matchMedia(compactQuery)
  media.addEventListener('change', listener)
  return () => media.removeEventListener('change', listener)
}

function AccountControls({ pendingReminders, onNotifications, onLogout }: Pick<Props, 'pendingReminders' | 'onNotifications' | 'onLogout'>) {
  return (
    <div className="workspace-account">
      <ThemeToggle />
      <button type="button" className="icon-button" aria-label="Abrir notificações" title="Notificações" onClick={onNotifications}>
        <Bell size={19} aria-hidden="true" />
        {pendingReminders > 0 && <span className="notification-dot" aria-hidden="true" />}
      </button>
      {onLogout && (
        <button type="button" className="icon-button" aria-label="Sair da conta" title="Sair da conta" onClick={onLogout}>
          <LogOut size={18} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

function SidebarContents({ props, run = runImmediately, compact = false }: {
  props: Props
  run?: (action: () => void) => void
  compact?: boolean
}) {
  const crm = props.space === 'crm'
  const items = crm ? NAVIGATION : PERSONAL_NAVIGATION
  const firstGroup = crm ? crmMain : personalMain
  const groups = [
    { label: crm ? 'CRM' : 'Personal', items: items.filter(item => firstGroup.has(item.id)) },
    { label: 'Gestão', items: items.filter(item => !firstGroup.has(item.id)) },
  ]
  const signOut = props.onLogout

  return (
    <>
      <div className="sidebar-brand-row">
        <button type="button" className="sidebar-brand" aria-label="Ir para a visão geral" onClick={() => run(() => props.onChange(crm ? 'overview' : 'personal-overview'))}>
          <img className="brand-mark" src="/bee-mark.png" alt="" />
          <span className="brand-name">abelha</span>
        </button>
        {compact && (
          <Dialog.Close className="icon-button sidebar-dismiss" aria-label="Fechar menu">
            <X size={20} aria-hidden="true" />
          </Dialog.Close>
        )}
      </div>

      <div className="space-switch" role="group" aria-label="Ambiente do Abelha">
        <button type="button" aria-pressed={crm} onClick={() => run(() => props.onSpace('crm'))}>CRM</button>
        <button type="button" aria-pressed={!crm} onClick={() => run(() => props.onSpace('personal'))}>Personal</button>
      </div>

      <nav className="sidebar-navigation" aria-label="Navegação principal">
        {groups.map(group => (
          <div className="sidebar-nav-group" key={group.label}>
            <p className="sidebar-label">{group.label}</p>
            {group.items.map(({ id, label }) => {
              const Icon = icons[id]
              const active = id === props.activeView
              return (
                <button key={id} type="button" className={`sidebar-nav-item${active ? ' is-active' : ''}`}
                  aria-current={active ? 'page' : undefined} onClick={() => run(() => props.onChange(id))}>
                  <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                  <span>{label}</span>
                </button>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        {crm && (
          <>
            <div className="sidebar-actions" role="group" aria-label="Ações rápidas">
              <button type="button" className="icon-button" aria-label="Busca global" title="Buscar" onClick={() => run(props.onSearch)}><Search size={19} aria-hidden="true" /></button>
              <button type="button" className="icon-button" aria-label="Novo contato" title="Novo contato" onClick={() => run(props.onCreate)}><Plus size={20} aria-hidden="true" /></button>
              <button type="button" className="icon-button" aria-label="Exportar dados" title="Exportar dados" onClick={() => run(props.onExport)}><Download size={19} aria-hidden="true" /></button>
            </div>
            <a className="sidebar-calculator-link" href="https://project-k3a8s.vercel.app/" target="_blank" rel="noopener noreferrer" aria-label="Abrir calculadora de preços em uma nova aba">
              <Calculator size={17} aria-hidden="true" />
              <span>Calculadora externa</span>
              <ExternalLink size={14} aria-hidden="true" />
            </a>
          </>
        )}
        {compact ? signOut && (
          <button type="button" className="sidebar-nav-item" onClick={() => run(signOut)}>
            <LogOut size={18} aria-hidden="true" /><span>Sair da conta</span>
          </button>
        ) : <AccountControls {...props} />}
      </div>
    </>
  )
}

function MobileSidebar(props: Props) {
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const nextAction = useRef<(() => void) | null>(null)
  const items = props.space === 'crm' ? NAVIGATION : PERSONAL_NAVIGATION
  const activeLabel = items.find(item => item.id === props.activeView)?.label

  function run(action: () => void) {
    nextAction.current = action
    setOpen(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <header className="workspace-mobile-bar">
        <Dialog.Trigger ref={trigger} className="icon-button" aria-label="Abrir menu">
          <Menu size={22} aria-hidden="true" />
        </Dialog.Trigger>
        <div className="workspace-mobile-location">
          <span>{props.space === 'crm' ? 'CRM' : 'Personal'}</span>
          <strong>{activeLabel}</strong>
        </div>
        <AccountControls pendingReminders={props.pendingReminders} onNotifications={props.onNotifications} />
      </header>
      <Dialog.Portal>
        <Dialog.Overlay className="workspace-drawer-overlay" />
        <Dialog.Content className="app-sidebar workspace-sidebar workspace-drawer" aria-describedby={undefined}
          onCloseAutoFocus={event => {
            const action = nextAction.current
            nextAction.current = null
            if (action) {
              event.preventDefault()
              trigger.current?.focus()
              action()
            }
          }}
          onKeyDown={event => {
            if (props.space === 'crm' && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k' && !event.nativeEvent.isComposing) {
              event.preventDefault()
              event.stopPropagation()
              run(props.onSearch)
            }
          }}>
          <Dialog.Title className="sr-only">Menu do Abelha</Dialog.Title>
          <SidebarContents props={props} compact run={run} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export default function AppSidebar(props: Props) {
  const compact = useSyncExternalStore(subscribeToWidth, () => window.matchMedia(compactQuery).matches, () => false)
  if (compact) return <MobileSidebar {...props} />

  return (
    <aside className="app-sidebar workspace-sidebar" aria-label="Menu do Abelha">
      <SidebarContents props={props} />
    </aside>
  )
}
