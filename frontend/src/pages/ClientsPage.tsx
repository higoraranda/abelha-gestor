import { useState, useEffect, useCallback } from 'react'
import { X } from 'lucide-react'
import { api } from '@/lib/api'
import ClientList from '@/components/clients/ClientList'
import ClientPanel from '@/components/clients/ClientPanel'
import NewClientModal from '@/components/clients/NewClientModal'
import type { Client } from '@/types'

export default function ClientsPage() {
  const [clients,    setClients]    = useState<Client[]>([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [openTabs,   setOpenTabs]   = useState<Client[]>([])
  const [activeId,   setActiveId]   = useState<string | null>(null)
  const [showModal,  setShowModal]  = useState(false)

  const fetchClients = useCallback((q: string) => {
    setLoading(true)
    api.get<Client[]>(`/api/v1/clients${q ? `?search=${encodeURIComponent(q)}` : ''}`)
      .then(setClients)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => fetchClients(search), 300)
    return () => clearTimeout(timer)
  }, [search, fetchClients])

  function openTab(client: Client) {
    if (!openTabs.find((t) => t.id === client.id)) {
      setOpenTabs((prev) => [...prev, client])
    }
    setActiveId(client.id)
  }

  function closeTab(id: string) {
    const remaining = openTabs.filter((t) => t.id !== id)
    setOpenTabs(remaining)
    setActiveId((prev) => {
      if (prev !== id) return prev
      return remaining.length > 0 ? remaining[remaining.length - 1].id : null
    })
  }

  function handleCreated(client: Client) {
    setClients((prev) => [client, ...prev])
    openTab(client)
  }

  const activeTab = openTabs.find((t) => t.id === activeId) ?? null

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <ClientList
        clients={clients}
        selectedId={activeId}
        loading={loading}
        search={search}
        onSearch={setSearch}
        onSelect={openTab}
        onNew={() => setShowModal(true)}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Barra de abas */}
        {openTabs.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '2px',
            padding: '0 12px',
            borderBottom: '1px solid rgba(0,0,0,0.07)',
            backgroundColor: '#ffffff',
            flexShrink: 0, overflowX: 'auto',
            minHeight: '42px',
          }}>
            {openTabs.map((tab) => (
              <div
                key={tab.id}
                onClick={() => setActiveId(tab.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 12px 6px 14px',
                  borderRadius: '6px 6px 0 0',
                  cursor: 'pointer', flexShrink: 0,
                  fontSize: '13px', fontWeight: tab.id === activeId ? 600 : 400,
                  color: tab.id === activeId ? '#111827' : '#6b7280',
                  backgroundColor: tab.id === activeId ? '#fafafa' : 'transparent',
                  borderBottom: tab.id === activeId ? '2px solid #F2E600' : '2px solid transparent',
                  transition: 'all 0.1s',
                }}
              >
                <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {tab.name ?? tab.whatsapp ?? 'Sem nome'}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); closeTab(tab.id) }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: '1px', display: 'flex', borderRadius: '3px',
                    color: '#9ca3af',
                  }}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Conteúdo da aba ativa */}
        {activeTab ? (
          <ClientPanel key={activeTab.id} clientId={activeTab.id} />
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fafafa' }}>
            <p style={{ fontSize: '14px', color: '#9ca3af', margin: 0 }}>
              Selecione um cliente para ver os detalhes
            </p>
          </div>
        )}
      </div>

      {showModal && (
        <NewClientModal
          onClose={() => setShowModal(false)}
          onCreate={handleCreated}
        />
      )}
    </div>
  )
}
