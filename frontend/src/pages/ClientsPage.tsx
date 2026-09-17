import { useCallback, useEffect, useState } from 'react'
import { CalendarDays, ChevronRight, CircleDollarSign, FileText, Mail, MessageCircle, Pencil, Plus, Search, UserRound } from 'lucide-react'
import { api } from '@/lib/api'
import type { Client, ClientContract, ClientDetail, ReceivableStatus } from '@/types'
import NewClientModal from '@/components/clients/NewClientModal'
import ContractModal from '@/components/clients/ContractModal'

interface Props {
  onClientCreated?: (client: Client) => void
}

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const dateFormat = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' })

const STATUS_LABEL: Record<ReceivableStatus, string> = {
  open: 'Em aberto',
  paid: 'Pago',
  overdue: 'Atrasado',
  cancelled: 'Cancelado',
}

const PAYMENT_LABEL = {
  cash: 'À vista com 5% de desconto',
  two_installments: '2x — início e entrega',
  three_installments: '3x — início, entrega e primeira mensalidade',
}

function formatDate(value: string | null | undefined) {
  return value ? dateFormat.format(new Date(`${value.slice(0, 10)}T00:00:00Z`)) : '—'
}

function ClientStatus({ status }: { status?: ReceivableStatus | null }) {
  if (!status) return <span className="status-pill status-neutral">Sem cobranças</span>
  return <span className={`status-pill status-${status}`}>{STATUS_LABEL[status]}</span>
}

export default function ClientsPage({ onClientCreated }: Props) {
  const [clients, setClients] = useState<Client[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<ClientDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [showNewClient, setShowNewClient] = useState(false)
  const [contractModal, setContractModal] = useState<ClientContract | null | 'new'>(null)

  const fetchClients = useCallback(async (query: string) => {
    setLoading(true)
    try {
      const data = await api.get<Client[]>(`/api/v1/clients${query.trim() ? `?search=${encodeURIComponent(query.trim())}` : ''}`)
      setClients(data)
      setError(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível carregar os clientes.')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadDetail = useCallback(async (clientId: string) => {
    setDetailLoading(true)
    try {
      setDetail(await api.get<ClientDetail>(`/api/v1/clients/${clientId}`))
      setError(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível carregar o cliente.')
      setDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => { void fetchClients(search) }, 250)
    return () => window.clearTimeout(timer)
  }, [fetchClients, search])

  function handleCreated(client: Client) {
    onClientCreated?.(client)
    setSelectedId(client.id)
    void loadDetail(client.id)
    setShowNewClient(false)
    void fetchClients('')
  }

  async function cancelContract(contract: ClientContract) {
    if (!window.confirm(`Cancelar o contrato de ${contract.serviceName}? As cobranças abertas serão canceladas e o histórico será mantido.`)) return
    try {
      await api.patch(`/api/v1/contracts/${contract.id}`, { status: 'cancelled' })
      await Promise.all([loadDetail(contract.clientId), fetchClients(search)])
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível cancelar o contrato.')
    }
  }

  async function refreshSelected() {
    if (!selectedId) return
    await Promise.all([loadDetail(selectedId), fetchClients(search)])
  }

  return (
    <div className="module-page clients-directory-page">
      <header className="page-heading clients-heading">
        <div><p className="eyebrow">Relacionamento e contratos</p><h1>Clientes</h1><p className="page-subtitle">Encontre contatos, acompanhe serviços contratados e consulte cada cobrança.</p></div>
        <button type="button" className="button button-primary" onClick={() => setShowNewClient(true)}><Plus size={17} aria-hidden="true" /> Novo cliente</button>
      </header>

      <label className="directory-search">
        <Search size={18} aria-hidden="true" />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar por nome, WhatsApp, email ou serviço" />
        {!loading ? <span>{clients.length} {clients.length === 1 ? 'cliente' : 'clientes'}</span> : null}
      </label>

      {error ? <div className="module-error" role="alert">{error}<button type="button" onClick={() => setError(null)}>Fechar</button></div> : null}

      <div className="clients-directory-layout">
        <section className="clients-list-panel" aria-label="Lista de clientes">
          <div className="clients-list-head"><span>Cliente e serviço</span><span>Contrato</span><span>Financeiro</span><span /></div>
          {loading ? Array.from({ length: 6 }, (_, index) => <div className="skeleton client-row-skeleton" key={index} />) : null}
          {!loading && clients.map((client) => (
            <button type="button" className={`client-directory-row${selectedId === client.id ? ' is-selected' : ''}`} onClick={() => { setSelectedId(client.id); void loadDetail(client.id) }} key={client.id}>
              <span className="client-directory-person"><span className="client-initial">{(client.name ?? '?').slice(0, 1).toUpperCase()}</span><span><strong>{client.name ?? 'Cliente sem nome'}</strong><small>{client.activeService ?? 'Sem contrato cadastrado'}</small></span></span>
              <span className="client-directory-contract"><strong>{client.monthlyFee != null ? `${currency.format(client.monthlyFee)}/mês` : '—'}</strong><small>{client.contractEndDate ? `até ${formatDate(client.contractEndDate)}` : 'Sem vigência'}</small></span>
              <ClientStatus status={client.financialStatus} />
              <ChevronRight size={17} aria-hidden="true" />
            </button>
          ))}
          {!loading && clients.length === 0 ? (
            <div className="panel-empty client-list-empty"><span className="empty-icon"><UserRound size={21} aria-hidden="true" /></span><strong>Nenhum cliente encontrado</strong><p>Revise a busca ou cadastre o primeiro cliente da carteira.</p><button type="button" className="button button-secondary" onClick={() => setShowNewClient(true)}>Cadastrar cliente</button></div>
          ) : null}
        </section>

        <section className="client-record-panel" aria-label="Detalhes do cliente">
          {detailLoading ? <div className="client-record-loading"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div> : null}
          {!detailLoading && !detail ? (
            <div className="panel-empty client-record-empty"><span className="empty-icon"><FileText size={22} aria-hidden="true" /></span><strong>Selecione um cliente</strong><p>Os dados de contato, contratos e cobranças aparecerão aqui.</p></div>
          ) : null}
          {!detailLoading && detail ? (
            <>
              <header className="client-record-header">
                <div><span className="client-record-avatar">{(detail.name ?? '?').slice(0, 2).toUpperCase()}</span><div><p>Cadastro do cliente</p><h2>{detail.name ?? 'Cliente sem nome'}</h2></div></div>
                <button type="button" className="button button-primary button-small" onClick={() => setContractModal('new')}><Plus size={15} aria-hidden="true" /> Adicionar contrato</button>
              </header>

              <div className="client-contact-strip">
                <span><MessageCircle size={15} aria-hidden="true" /><span><small>WhatsApp</small><strong>{detail.whatsapp ?? 'Não informado'}</strong></span></span>
                <span><Mail size={15} aria-hidden="true" /><span><small>Email</small><strong>{detail.email ?? 'Não informado'}</strong></span></span>
                <span><FileText size={15} aria-hidden="true" /><span><small>Observações</small><strong>{detail.notes ?? 'Sem observações'}</strong></span></span>
              </div>

              <div className="client-contracts-heading"><div><p className="panel-kicker">Histórico</p><h3>Contratos e cobranças</h3></div><span>{detail.contracts.length} {detail.contracts.length === 1 ? 'contrato' : 'contratos'}</span></div>
              {detail.contracts.length === 0 ? (
                <div className="panel-empty contract-empty"><strong>Nenhum contrato cadastrado</strong><p>Este contato pode ter sido criado automaticamente pelo WhatsApp.</p><button type="button" className="button button-secondary" onClick={() => setContractModal('new')}>Adicionar contrato</button></div>
              ) : (
                <div className="contract-history">
                  {detail.contracts.map((contract) => (
                    <article className={`contract-record is-${contract.status}`} key={contract.id}>
                      <header>
                        <div><span className={`contract-status status-${contract.status}`}>{contract.status === 'active' ? 'Ativo' : contract.status === 'completed' ? 'Concluído' : 'Cancelado'}</span><h4>{contract.serviceName}</h4><p>{contract.serviceDescription || 'Sem descrição adicional.'}</p></div>
                        <div className="contract-actions"><button type="button" className="icon-button" onClick={() => setContractModal(contract)} aria-label={`Editar ${contract.serviceName}`}><Pencil size={15} aria-hidden="true" /></button>{contract.status !== 'cancelled' ? <button type="button" className="text-danger-button" onClick={() => cancelContract(contract)}>Cancelar</button> : null}</div>
                      </header>
                      <div className="contract-facts">
                        <span><CircleDollarSign size={15} aria-hidden="true" /><span><small>Serviço</small><strong>{currency.format(contract.finalAmount)}{contract.discountPercent ? ` (${contract.discountPercent}% desc.)` : ''}</strong></span></span>
                        <span><CircleDollarSign size={15} aria-hidden="true" /><span><small>Mensalidade</small><strong>{currency.format(contract.monthlyFee)}{contract.monthlyDueDay ? ` · dia ${contract.monthlyDueDay}` : ''}</strong></span></span>
                        <span><FileText size={15} aria-hidden="true" /><span><small>Pagamento</small><strong>{PAYMENT_LABEL[contract.paymentMethod]}</strong></span></span>
                        <span><CalendarDays size={15} aria-hidden="true" /><span><small>Vigência</small><strong>{formatDate(contract.developmentStartDate)} a {formatDate(contract.contractEndDate)}</strong></span></span>
                      </div>
                      <div className="receivables-table">
                        <div className="receivables-head"><span>Cobrança</span><span>Vencimento</span><span>Valor</span><span>Situação</span></div>
                        {contract.receivables.map((receivable) => (
                          <div className="receivable-row" key={receivable.id}><span>{receivable.description}</span><span>{formatDate(receivable.dueDate)}</span><strong>{currency.format(receivable.amount)}</strong><span className={`status-pill status-${receivable.status}`}>{STATUS_LABEL[receivable.status]}</span></div>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          ) : null}
        </section>
      </div>

      {showNewClient ? <NewClientModal onClose={() => setShowNewClient(false)} onCreate={handleCreated} /> : null}
      {contractModal && detail ? <ContractModal clientId={detail.id} contract={contractModal === 'new' ? null : contractModal} onClose={() => setContractModal(null)} onSaved={refreshSelected} /> : null}
    </div>
  )
}
