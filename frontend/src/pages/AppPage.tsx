import { useEffect, useState } from 'react'
import { Menu } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { logout } from '@/lib/auth'
import { useAuthStore } from '@/store/auth'
import type { Client, Reminder } from '@/types'
import AppSidebar, { type AppView } from '@/components/layout/AppSidebar'
import NewClientModal from '@/components/clients/NewClientModal'
import DashboardPage from '@/pages/DashboardPage'
import ClientsPage from '@/pages/ClientsPage'
import FinancePage from '@/pages/FinancePage'
import InboxPage from '@/pages/InboxPage'
import AgendaPage from '@/pages/AgendaPage'

export default function AppPage() {
  const navigate = useNavigate()
  const clearAuth = useAuthStore((state) => state.clearAuth)
  const [activeView, setActiveView] = useState<AppView>('overview')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [overviewLoading, setOverviewLoading] = useState(true)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [showClientModal, setShowClientModal] = useState(false)

  useEffect(() => {
    let active = true
    Promise.allSettled([
      api.get<Client[]>('/api/v1/clients'),
      api.get<Reminder[]>('/api/v1/reminders'),
    ]).then(([clientResult, reminderResult]) => {
      if (!active) return
      if (clientResult.status === 'fulfilled') setClients(clientResult.value)
      if (reminderResult.status === 'fulfilled') setReminders(reminderResult.value)
      setSyncError([clientResult, reminderResult].some((result) => result.status === 'rejected')
        ? 'A API não respondeu com uma sessão válida.'
        : null)
      setOverviewLoading(false)
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (activeView !== 'agenda') return
    api.get<Reminder[]>('/api/v1/reminders').then(setReminders).catch(() => undefined)
  }, [activeView])

  function handleCreatedClient(client: Client) {
    setClients((current) => current.some((item) => item.id === client.id)
      ? current.map((item) => item.id === client.id ? client : item)
      : [client, ...current])
    setActiveView('clients')
  }

  function handleDeletedClient(clientId: string) {
    setClients((current) => current.filter((client) => client.id !== clientId))
  }

  async function handleLogout() {
    try {
      await logout()
    } finally {
      clearAuth()
      navigate('/login', { replace: true })
    }
  }

  const pendingReminderCount = reminders.filter((reminder) => !reminder.completed).length
  let content: React.ReactNode

  switch (activeView) {
    case 'overview':
      content = (
        <DashboardPage
          clients={clients}
          reminders={reminders}
          loading={overviewLoading}
          syncError={syncError}
          onNewClient={() => setShowClientModal(true)}
          onOpenClients={() => setActiveView('clients')}
          onOpenFinance={() => setActiveView('finance')}
          onOpenReminders={() => setActiveView('agenda')}
        />
      )
      break
    case 'clients':
      content = <ClientsPage onClientCreated={handleCreatedClient} onClientDeleted={handleDeletedClient} />
      break
    case 'inbox':
      content = <InboxPage />
      break
    case 'finance':
      content = <FinancePage />
      break
    case 'agenda':
      content = <AgendaPage clients={clients} reminders={reminders} onRemindersChange={setReminders} />
      break
  }

  return (
    <div className="app-shell">
      <AppSidebar
        activeView={activeView}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        onChange={setActiveView}
        onLogout={handleLogout}
        pendingReminders={pendingReminderCount}
      />
      {mobileMenuOpen ? <button type="button" className="sidebar-overlay" onClick={() => setMobileMenuOpen(false)} aria-label="Fechar menu" /> : null}

      <main className="app-main">
        <div className="mobile-app-bar">
          <button type="button" className="icon-button" onClick={() => setMobileMenuOpen(true)} aria-label="Abrir menu">
            <Menu size={19} aria-hidden="true" />
          </button>
          <span className="mobile-brand"><img src="/bee-mark.png" alt="" /> abelha</span>
          <span className="mobile-avatar">HA</span>
        </div>
        <div className="app-view">{content}</div>
      </main>

      {showClientModal ? (
        <NewClientModal onClose={() => setShowClientModal(false)} onCreate={handleCreatedClient} />
      ) : null}
    </div>
  )
}
