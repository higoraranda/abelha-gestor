import { useCallback, useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'
import { api } from '@/lib/api'
import type { Client, ClientDetail, Company, Reminder } from '@/types'
import AppSidebar, { type AppView } from '@/components/layout/AppSidebar'
import ClientColumn, { type ClientListView } from '@/components/layout/ClientColumn'
import ChatMessages from '@/components/layout/ChatMessages'
import ClientDetailPanel from '@/components/layout/ClientDetailPanel'
import NewClientModal from '@/components/clients/NewClientModal'
import NewCompanyModal from '@/components/clients/NewCompanyModal'
import CompaniesPage from '@/pages/CompaniesPage'
import DashboardPage from '@/pages/DashboardPage'
import FinancePage from '@/pages/FinancePage'
import InboxPage from '@/pages/InboxPage'
import PipelinePage from '@/pages/PipelinePage'

interface Tab {
  id: string
  label: string
}

export default function AppPage() {
  const [activeView, setActiveView] = useState<AppView>('overview')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [companies, setCompanies] = useState<Company[]>([])
  const [clientListView, setClientListView] = useState<ClientListView>('all-clients')
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [clientsLoading, setClientsLoading] = useState(true)
  const [overviewLoading, setOverviewLoading] = useState(true)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [openTabs, setOpenTabs] = useState<Tab[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [activeDetail, setActiveDetail] = useState<ClientDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [sending, setSending] = useState(false)
  const [showClientModal, setShowClientModal] = useState(false)
  const [showCompanyModal, setShowCompanyModal] = useState(false)

  useEffect(() => {
    let active = true

    Promise.allSettled([
      api.get<Company[]>('/api/v1/companies'),
      api.get<Client[]>('/api/v1/clients'),
      api.get<Reminder[]>('/api/v1/reminders'),
    ]).then(([companyResult, clientResult, reminderResult]) => {
      if (!active) return

      if (companyResult.status === 'fulfilled') setCompanies(companyResult.value)
      if (clientResult.status === 'fulfilled') setClients(clientResult.value)
      if (reminderResult.status === 'fulfilled') setReminders(reminderResult.value)

      const failed = [companyResult, clientResult, reminderResult].some((result) => result.status === 'rejected')
      setSyncError(failed ? 'A API não respondeu com uma sessão válida.' : null)
      setClientsLoading(false)
      setOverviewLoading(false)
    })

    return () => { active = false }
  }, [])

  const fetchClients = useCallback((query: string, companyId: string | null, view: ClientListView) => {
    if (view === 'reminders') return
    setClientsLoading(true)
    const params = new URLSearchParams()
    if (query) params.set('search', query)
    if (companyId) params.set('company_id', companyId)
    const searchParams = params.toString()

    api.get<Client[]>(`/api/v1/clients${searchParams ? `?${searchParams}` : ''}`)
      .then((data) => {
        setClients(data)
        setSyncError(null)
      })
      .catch(() => setSyncError('A API não respondeu com uma sessão válida.'))
      .finally(() => setClientsLoading(false))
  }, [])

  useEffect(() => {
    if (activeView !== 'clients') return
    const timer = window.setTimeout(() => fetchClients(search, selectedCompanyId, clientListView), 250)
    return () => window.clearTimeout(timer)
  }, [activeView, clientListView, fetchClients, search, selectedCompanyId])

  useEffect(() => {
    if (activeView !== 'reminders') return
    api.get<Reminder[]>('/api/v1/reminders')
      .then((data) => {
        setReminders(data)
        setSyncError(null)
      })
      .catch(() => setSyncError('A API não respondeu com uma sessão válida.'))
  }, [activeView])

  useEffect(() => {
    if (!activeTabId) return
    let cancelled = false

    async function loadClientDetail() {
      setDetailLoading(true)
      try {
        const detail = await api.get<ClientDetail>(`/api/v1/clients/${activeTabId}`)
        if (!cancelled) setActiveDetail(detail)
      } catch {
        if (!cancelled) setActiveDetail(null)
      } finally {
        if (!cancelled) setDetailLoading(false)
      }
    }

    void loadClientDetail()
    return () => { cancelled = true }
  }, [activeTabId])

  function openTab(client: Client) {
    const label = client.name ?? client.whatsapp ?? 'Sem nome'
    setOpenTabs((currentTabs) => currentTabs.some((tab) => tab.id === client.id)
      ? currentTabs
      : [...currentTabs, { id: client.id, label }])
    setActiveTabId(client.id)
    setActiveDetail(null)
    setChatInput('')
  }

  function closeTab(id: string) {
    const remaining = openTabs.filter((tab) => tab.id !== id)
    setOpenTabs(remaining)
    if (activeTabId === id && remaining.length === 0) setActiveDetail(null)
    setActiveTabId((currentId) => currentId === id ? (remaining.at(-1)?.id ?? null) : currentId)
  }

  function openClients() {
    setActiveView('clients')
    setClientListView('all-clients')
    setSelectedCompanyId(null)
    setSearch('')
  }

  function openCompany(companyId: string) {
    setActiveView('clients')
    setClientListView('company')
    setSelectedCompanyId(companyId)
    setSearch('')
  }

  function openReminders() {
    setActiveView('reminders')
    setClientListView('reminders')
    setSelectedCompanyId(null)
  }

  function handleViewChange(view: AppView) {
    if (view === 'clients') {
      openClients()
      return
    }
    if (view === 'reminders') {
      openReminders()
      return
    }
    setActiveView(view)
  }

  function handleCreatedClient(client: Client) {
    setClients((currentClients) => [client, ...currentClients])
    setActiveView('clients')
    setClientListView('all-clients')
    openTab(client)
  }

  function handleCreatedCompany(company: Company) {
    setCompanies((currentCompanies) => [...currentCompanies, company])
    openCompany(company.id)
  }

  function handleSelectReminder(reminder: Reminder) {
    if (reminder.linkedType !== 'client' || !reminder.linkedId) return
    const existingClient = clients.find((client) => client.id === reminder.linkedId)
    if (existingClient) {
      openTab(existingClient)
      return
    }
    api.get<ClientDetail>(`/api/v1/clients/${reminder.linkedId}`).then(openTab).catch(() => undefined)
  }

  async function handleSend() {
    if (!chatInput.trim() || !activeDetail?.conversation?.id) return
    setSending(true)
    try {
      const message = await api.post<{ id: string; content: string; direction: string; createdAt: string }>(
        '/api/v1/messages',
        { conversation_id: activeDetail.conversation.id, content: chatInput.trim() },
      )
      setChatInput('')
      setActiveDetail((currentDetail) => {
        if (!currentDetail?.conversation) return currentDetail
        return {
          ...currentDetail,
          conversation: {
            ...currentDetail.conversation,
            messages: [...currentDetail.conversation.messages, {
              id: message.id,
              conversationId: currentDetail.conversation.id,
              organizationId: currentDetail.organizationId,
              whatsappMessageId: null,
              content: message.content,
              direction: message.direction as 'in' | 'out',
              createdAt: message.createdAt,
            }],
          },
        }
      })
    } finally {
      setSending(false)
    }
  }

  const selectedCompany = companies.find((company) => company.id === selectedCompanyId) ?? null
  const pendingReminderCount = reminders.filter((reminder) => !reminder.completed).length
  const defaultCompanyId = clientListView === 'company' && selectedCompanyId ? selectedCompanyId : undefined

  const clientWorkspace = (
    <div className="client-workspace">
      <ClientColumn
        sidebarView={clientListView}
        selectedCompany={selectedCompany}
        clients={clients}
        reminders={reminders}
        loading={clientsLoading}
        search={search}
        onSearch={setSearch}
        onSelectClient={openTab}
        onSelectReminder={handleSelectReminder}
        onNewClient={() => setShowClientModal(true)}
        selectedClientId={activeTabId}
      />

      <div className="client-workspace-main">
        <div className="client-tabs">
          {openTabs.length === 0 ? <p>Nenhuma aba aberta</p> : null}
          {openTabs.map((tab) => {
            const active = tab.id === activeTabId
            return (
              <button type="button" className={`client-tab${active ? ' is-active' : ''}`} key={tab.id} onClick={() => setActiveTabId(tab.id)}>
                <span>{tab.label}</span>
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={`Fechar ${tab.label}`}
                  onClick={(event) => { event.stopPropagation(); closeTab(tab.id) }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      event.stopPropagation()
                      closeTab(tab.id)
                    }
                  }}
                >
                  <X size={12} aria-hidden="true" />
                </span>
              </button>
            )
          })}
        </div>

        <div className="client-conversation-area">
          <ChatMessages
            detail={activeDetail}
            loading={detailLoading}
            message={chatInput}
            sending={sending}
            onMessage={setChatInput}
            onSend={handleSend}
          />
          <ClientDetailPanel detail={activeDetail} />
        </div>
      </div>
    </div>
  )

  let content: React.ReactNode
  switch (activeView) {
    case 'overview':
      content = (
        <DashboardPage
          clients={clients}
          companies={companies}
          reminders={reminders}
          loading={overviewLoading}
          syncError={syncError}
          onNewClient={() => setShowClientModal(true)}
          onOpenClients={openClients}
          onOpenCompanies={() => setActiveView('companies')}
          onOpenFinance={() => setActiveView('finance')}
          onOpenPipeline={() => setActiveView('pipeline')}
          onOpenReminders={openReminders}
        />
      )
      break
    case 'clients':
    case 'reminders':
      content = clientWorkspace
      break
    case 'companies':
      content = <CompaniesPage companies={companies} clients={clients} loading={overviewLoading} onNewCompany={() => setShowCompanyModal(true)} onOpenCompany={openCompany} />
      break
    case 'inbox':
      content = <InboxPage />
      break
    case 'pipeline':
      content = <PipelinePage clients={clients} onNewClient={() => setShowClientModal(true)} />
      break
    case 'finance':
      content = <FinancePage />
      break
  }

  return (
    <div className="app-shell">
      <AppSidebar
        activeView={activeView}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        onChange={handleViewChange}
        pendingReminders={pendingReminderCount}
      />
      {mobileMenuOpen ? <button type="button" className="sidebar-overlay" onClick={() => setMobileMenuOpen(false)} aria-label="Fechar menu" /> : null}

      <main className="app-main">
        <div className="mobile-app-bar">
          <button type="button" className="icon-button" onClick={() => setMobileMenuOpen(true)} aria-label="Abrir menu">
            <Menu size={19} aria-hidden="true" />
          </button>
          <span className="mobile-brand"><span>a</span> abelha</span>
          <span className="mobile-avatar">HA</span>
        </div>
        <div className="app-view">{content}</div>
      </main>

      {showClientModal ? (
        <NewClientModal onClose={() => setShowClientModal(false)} onCreate={handleCreatedClient} defaultCompanyId={defaultCompanyId} />
      ) : null}
      {showCompanyModal ? (
        <NewCompanyModal onClose={() => setShowCompanyModal(false)} onCreate={handleCreatedCompany} />
      ) : null}
    </div>
  )
}
