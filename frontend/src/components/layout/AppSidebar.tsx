import { Bell, CalendarDays, Calculator, Download, LogOut, Plus, Search } from 'lucide-react'
import { NAVIGATION, type AppView } from '@/lib/navigation'
export type { AppView } from '@/lib/navigation'
interface Props {
  activeView: AppView; onChange: (view: AppView) => void; onLogout?: () => void
  pendingReminders: number; isOpen?: boolean; onClose?: () => void
  onSearch?: () => void; onCreate?: () => void; onNotifications?: () => void; onExport?: () => void
}
export default function AppSidebar(props: Props) {
  return <>
    <header className="workspace-header">
      <button className="workspace-brand" onClick={() => props.onChange('overview')} aria-label="Ir para a visão geral"><img src="/bee-mark.png" alt="" /><strong>abelha<span>seu espaço pessoal</span></strong></button>
      <nav className="workspace-nav" aria-label="Navegação principal">{NAVIGATION.map(item => <button key={item.id} aria-current={item.id === props.activeView ? 'page' : undefined} className={item.id === props.activeView ? 'is-active' : ''} onClick={() => props.onChange(item.id)}>{item.label}</button>)}</nav>
      <div className="workspace-account"><button className="icon-button" aria-label="Abrir notificações" title="Notificações" onClick={props.onNotifications}><Bell size={19} />{props.pendingReminders > 0 && <i className="notification-dot" />}</button><span className="personal-avatar" title="Carteira pessoal">HA</span>{props.onLogout && <button className="icon-button" aria-label="Sair da conta" onClick={props.onLogout}><LogOut size={18} /></button>}</div>
    </header>
    <nav className="quick-rail" aria-label="Ações rápidas">
      <button aria-label="Busca global" title="Buscar" onClick={props.onSearch}><Search size={20} /></button>
      <button aria-label="Novo contato" title="Novo contato" onClick={props.onCreate}><Plus size={21} /></button>
      <button aria-label="Abrir agenda" title="Agenda" onClick={() => props.onChange('agenda')}><CalendarDays size={19} /></button>
      <button aria-label="Exportar dados" title="Exportar" onClick={props.onExport}><Download size={19} /></button>
      <a href="https://project-k3a8s.vercel.app/" target="_blank" rel="noopener noreferrer" title="Calculadora de preços" aria-label="Abrir calculadora de preços em uma nova aba"><Calculator size={19} /></a>
    </nav>
  </>
}
