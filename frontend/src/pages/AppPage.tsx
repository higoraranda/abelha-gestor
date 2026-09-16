import { useState, useEffect, useCallback } from 'react'
import { X } from 'lucide-react'
import { api } from '@/lib/api'
import type { Client, Company, ClientDetail, Reminder } from '@/types'
import AppSidebar, { type SidebarView } from '@/components/layout/AppSidebar'
import ClientColumn from '@/components/layout/ClientColumn'
import ChatMessages from '@/components/layout/ChatMessages'
import ClientDetailPanel from '@/components/layout/ClientDetailPanel'
import NewClientModal from '@/components/clients/NewClientModal'
import NewCompanyModal from '@/components/clients/NewCompanyModal'

interface Tab {
  id:    string
  label: string
}

export default function AppPage() {
  const [companies,         setCompanies]         = useState<Company[]>([])
  const [sidebarView,       setSidebarView]       = useState<SidebarView>('all-clients')
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)
  const [clients,           setClients]           = useState<Client[]>([])
  const [clientsLoading,    setClientsLoading]    = useState(true)
  const [search,            setSearch]            = useState('')
  const [reminders,         setReminders]         = useState<Reminder[]>([])
  const [openTabs,          setOpenTabs]          = useState<Tab[]>([])
  const [activeTabId,       setActiveTabId]       = useState<string | null>(null)
  const [activeDetail,      setActiveDetail]      = useState<ClientDetail | null>(null)
  const [detailLoading,     setDetailLoading]     = useState(false)
  const [chatInput,         setChatInput]         = useState('')
  const [sending,           setSending]           = useState(false)
  const [showClientModal,   setShowClientModal]   = useState(false)
  const [showCompanyModal,  setShowCompanyModal]  = useState(false)

  // Fetch companies on mount
  useEffect(() => {
    api.get<Company[]>('/api/v1/companies')
      .then(setCompanies)
      .catch(console.error)
  }, [])

  // Fetch clients when view/company/search changes (debounce search)
  const fetchClients = useCallback((q: string, compId: string | null, view: SidebarView) => {
    if (view === 'reminders') return
    setClientsLoading(true)
    const params = new URLSearchParams()
    if (q)     params.set('search',     q)
    if (compId) params.set('company_id', compId)
    const qs = params.toString()
    api.get<Client[]>(`/api/v1/clients${qs ? `?${qs}` : ''}`)
      .then(setClients)
      .catch(console.error)
      .finally(() => setClientsLoading(false))
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => fetchClients(search, selectedCompanyId, sidebarView), 250)
    return () => clearTimeout(timer)
  }, [search, selectedCompanyId, sidebarView, fetchClients])

  // Fetch reminders when switching to reminders view
  useEffect(() => {
    if (sidebarView !== 'reminders') return
    api.get<Reminder[]>('/api/v1/reminders')
      .then(setReminders)
      .catch(console.error)
  }, [sidebarView])

  // Fetch client detail when active tab changes
  useEffect(() => {
    if (!activeTabId) { setActiveDetail(null); return }
    setDetailLoading(true)
    api.get<ClientDetail>(`/api/v1/clients/${activeTabId}`)
      .then(setActiveDetail)
      .catch(console.error)
      .finally(() => setDetailLoading(false))
  }, [activeTabId])

  function openTab(client: Client) {
    const label = client.name ?? client.whatsapp ?? 'Sem nome'
    if (!openTabs.find((t) => t.id === client.id)) {
      setOpenTabs((prev) => [...prev, { id: client.id, label }])
    }
    setActiveTabId(client.id)
    setChatInput('')
  }

  function closeTab(id: string) {
    const remaining = openTabs.filter((t) => t.id !== id)
    setOpenTabs(remaining)
    setActiveTabId((prev) => {
      if (prev !== id) return prev
      return remaining.length > 0 ? remaining[remaining.length - 1].id : null
    })
  }

  function selectCompany(id: string) {
    setSidebarView('company')
    setSelectedCompanyId(id)
    setSearch('')
  }

  function viewAllClients() {
    setSidebarView('all-clients')
    setSelectedCompanyId(null)
    setSearch('')
  }

  function viewReminders() {
    setSidebarView('reminders')
    setSelectedCompanyId(null)
  }

  function handleCreatedClient(client: Client) {
    setClients((prev) => [client, ...prev])
    openTab(client)
  }

  function handleCreatedCompany(company: Company) {
    setCompanies((prev) => [...prev, company])
    selectCompany(company.id)
  }

  function handleSelectReminder(reminder: Reminder) {
    if (reminder.linkedType === 'client' && reminder.linkedId) {
      const existing = clients.find((c) => c.id === reminder.linkedId)
      if (existing) {
        openTab(existing)
      } else {
        api.get<ClientDetail>(`/api/v1/clients/${reminder.linkedId}`)
          .then((detail) => openTab(detail))
          .catch(console.error)
      }
    }
  }

  async function handleSend() {
    if (!chatInput.trim() || !activeDetail?.conversation?.id) return
    setSending(true)
    try {
      const msg = await api.post<{ id: string; content: string; direction: string; createdAt: string }>(
        '/api/v1/messages',
        { conversation_id: activeDetail.conversation.id, content: chatInput.trim() }
      )
      setChatInput('')
      setActiveDetail((prev) => {
        if (!prev?.conversation) return prev
        return {
          ...prev,
          conversation: {
            ...prev.conversation,
            messages: [
              ...prev.conversation.messages,
              { id: msg.id, conversationId: prev.conversation.id, organizationId: prev.organizationId, whatsappMessageId: null, content: msg.content, direction: msg.direction as 'in' | 'out', createdAt: msg.createdAt },
            ],
          },
        }
      })
    } catch (err) {
      console.error('[chat] send error', err)
    } finally {
      setSending(false)
    }
  }

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId) ?? null
  const defaultCompanyId = sidebarView === 'company' && selectedCompanyId ? selectedCompanyId : undefined

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <AppSidebar
        companies={companies}
        sidebarView={sidebarView}
        selectedCompanyId={selectedCompanyId}
        onSelectCompany={selectCompany}
        onViewAllClients={viewAllClients}
        onViewReminders={viewReminders}
        onAddCompany={() => setShowCompanyModal(true)}
      />

      <ClientColumn
        sidebarView={sidebarView}
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

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: '#fafafa' }}>
        {/* Tabs bar */}
        <div style={{
          display: 'flex', alignItems: 'center',
          height: 42, flexShrink: 0,
          borderBottom: '1px solid rgba(0,0,0,0.07)',
          backgroundColor: '#fff',
          paddingLeft: 4, overflowX: 'auto',
        }}>
          {openTabs.length === 0 && (
            <p style={{ fontSize: 12, color: '#ccc', margin: '0 16px' }}>Nenhuma aba aberta</p>
          )}
          {openTabs.map((tab) => {
            const isActive = tab.id === activeTabId
            return (
              <div
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '0 12px 0 14px', height: '100%',
                  cursor: 'pointer', flexShrink: 0, userSelect: 'none',
                  fontSize: 12, fontWeight: isActive ? 600 : 400,
                  color: isActive ? '#111' : '#888',
                  borderBottom: isActive ? '2px solid #F2E600' : '2px solid transparent',
                  transition: 'all 0.1s',
                }}
              >
                <span style={{ maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {tab.label}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); closeTab(tab.id) }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: 2, display: 'flex', borderRadius: 3, color: '#bbb',
                  }}
                >
                  <X size={11} />
                </button>
              </div>
            )
          })}
        </div>

        {/* Chat + detail */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
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

      {showClientModal && (
        <NewClientModal
          onClose={() => setShowClientModal(false)}
          onCreate={handleCreatedClient}
          defaultCompanyId={defaultCompanyId}
        />
      )}

      {showCompanyModal && (
        <NewCompanyModal
          onClose={() => setShowCompanyModal(false)}
          onCreate={handleCreatedCompany}
        />
      )}
    </div>
  )
}
