import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CalendarCheck,
  Check,
  ChevronRight,
  CircleDollarSign,
  Mail,
  MessageCircle,
  Plus,
  ReceiptText,
  Search,
  Undo2,
  UserRound,
  WalletCards,
  X,
} from 'lucide-react'
import { api } from '@/lib/api'
import ExpenseModal from '@/components/finance/ExpenseModal'
import type {
  Expense,
  ExpenseCategory,
  ExpenseStatus,
  FinanceClientDetail,
  FinanceClientSummary,
  FinanceSummary,
  Receivable,
  ReceivableStatus,
} from '@/types'

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const dateFormat = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' })
const monthFormat = new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' })
const RECEIVABLE_LABELS: Record<ReceivableStatus, string> = { open: 'Em aberto', paid: 'Pago', overdue: 'Atrasado', cancelled: 'Cancelado' }
const EXPENSE_LABELS: Record<ExpenseCategory, string> = {
  subscriptions: 'Assinaturas',
  ads: 'Anúncios',
  tools: 'Ferramentas',
  taxes: 'Impostos e taxas',
  services: 'Serviços',
  infrastructure: 'Infraestrutura',
  other: 'Outros',
}

function formatDate(value: string | null | undefined) {
  return value ? dateFormat.format(new Date(`${value.slice(0, 10)}T00:00:00Z`)) : '—'
}

function FinancialStatus({ client }: { client: FinanceClientSummary }) {
  if (client.overdueAmount > 0) return <span className="status-pill status-overdue">Atrasado</span>
  if (client.remainingAmount > 0) return <span className="status-pill status-open">Em aberto</span>
  return <span className="status-pill status-paid">Em dia</span>
}

export default function FinancePage() {
  const [summary, setSummary] = useState<FinanceSummary | null>(null)
  const [section, setSection] = useState<'clients' | 'expenses'>('clients')
  const [clients, setClients] = useState<FinanceClientSummary[]>([])
  const [clientSearch, setClientSearch] = useState('')
  const [clientsLoading, setClientsLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<FinanceClientDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [expenseSearch, setExpenseSearch] = useState('')
  const [expenseCategory, setExpenseCategory] = useState<'all' | ExpenseCategory>('all')
  const [expenseStatus, setExpenseStatus] = useState<'all' | ExpenseStatus>('all')
  const [expensesLoading, setExpensesLoading] = useState(false)
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paying, setPaying] = useState<Receivable | null>(null)
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)

  const loadSummary = useCallback(async () => {
    setSummary(await api.get<FinanceSummary>('/api/v1/finance/summary'))
  }, [])

  const loadClients = useCallback(async (query: string) => {
    setClientsLoading(true)
    try {
      const suffix = query.trim() ? `?search=${encodeURIComponent(query.trim())}` : ''
      setClients(await api.get<FinanceClientSummary[]>(`/api/v1/finance/clients${suffix}`))
      setError(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível carregar os clientes.')
    } finally {
      setClientsLoading(false)
    }
  }, [])

  const loadDetail = useCallback(async (clientId: string) => {
    setDetailLoading(true)
    try {
      setDetail(await api.get<FinanceClientDetail>(`/api/v1/finance/clients/${clientId}`))
      setError(null)
    } catch (caught) {
      setDetail(null)
      setError(caught instanceof Error ? caught.message : 'Não foi possível carregar a ficha financeira.')
    } finally {
      setDetailLoading(false)
    }
  }, [])

  const loadExpenses = useCallback(async () => {
    const params = new URLSearchParams({ category: expenseCategory, status: expenseStatus })
    if (expenseSearch.trim()) params.set('search', expenseSearch.trim())
    setExpensesLoading(true)
    try {
      setExpenses(await api.get<Expense[]>(`/api/v1/finance/expenses?${params}`))
      setError(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível carregar os gastos.')
    } finally {
      setExpensesLoading(false)
    }
  }, [expenseCategory, expenseSearch, expenseStatus])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadSummary().catch((caught) => setError(caught instanceof Error ? caught.message : 'Não foi possível carregar o resumo.'))
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loadSummary])

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadClients(clientSearch) }, 250)
    return () => window.clearTimeout(timer)
  }, [clientSearch, loadClients])

  useEffect(() => {
    if (section !== 'expenses') return
    const timer = window.setTimeout(() => { void loadExpenses() }, 250)
    return () => window.clearTimeout(timer)
  }, [loadExpenses, section])

  const maxChart = useMemo(() => Math.max(1, ...(summary?.monthly.flatMap((item) => [item.projected, item.received]) ?? [1])), [summary])
  const expensesTotal = useMemo(() => expenses.reduce((sum, expense) => sum + expense.amount, 0), [expenses])

  async function refreshClient(clientId: string) {
    await Promise.all([loadSummary(), loadClients(clientSearch), loadDetail(clientId)])
  }

  async function markPaid() {
    if (!paying) return
    setSaving(true)
    try {
      await api.patch(`/api/v1/finance/receivables/${paying.id}`, { status: 'paid', paidAt })
      const clientId = paying.clientId
      setPaying(null)
      await refreshClient(clientId)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível dar baixa.')
    } finally {
      setSaving(false)
    }
  }

  async function reopenReceivable(item: Receivable) {
    if (!window.confirm(`Reabrir a cobrança de ${item.clientName ?? 'cliente'}?`)) return
    try {
      await api.patch(`/api/v1/finance/receivables/${item.id}`, { status: 'open' })
      await refreshClient(item.clientId)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível reabrir a cobrança.')
    }
  }

  async function updateExpense(expense: Expense, status: ExpenseStatus) {
    try {
      await api.patch(`/api/v1/finance/expenses/${expense.id}`, { status, paidAt: new Date().toISOString().slice(0, 10) })
      await Promise.all([loadSummary(), loadExpenses()])
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível atualizar o gasto.')
    }
  }

  function handleExpenseSaved() {
    setShowExpenseModal(false)
    setSection('expenses')
    void Promise.all([loadSummary(), loadExpenses()])
  }

  const metrics = [
    { label: 'Recebido no mês', value: summary?.receivedMonth ?? 0, note: 'Baixas registradas', icon: CalendarCheck, className: 'received' },
    { label: 'Gastos no mês', value: summary?.expensesMonth ?? 0, note: 'Despesas pagas', icon: ReceiptText, className: 'expenses' },
    { label: 'Saldo do mês', value: summary?.balanceMonth ?? 0, note: 'Recebido menos gastos', icon: CircleDollarSign, className: 'balance' },
    { label: 'MRR ativo', value: summary?.activeMrr ?? 0, note: 'Mensalidades recorrentes', icon: WalletCards, className: 'mrr' },
  ]

  return (
    <div className="module-page finance-page-live">
      <header className="page-heading finance-page-heading">
        <div><p className="eyebrow">Gestão financeira</p><h1>Financeiro</h1><p className="page-subtitle">Abra a ficha de cada cliente para acompanhar valores e registre as saídas do negócio.</p></div>
        <button type="button" className="button button-primary" onClick={() => setShowExpenseModal(true)}><Plus size={17} aria-hidden="true" /> Registrar gasto</button>
      </header>
      {error ? <div className="module-error" role="alert">{error}<button type="button" onClick={() => setError(null)}>Fechar</button></div> : null}

      <section className="finance-metrics" aria-label="Resumo financeiro">
        {metrics.map(({ label, value, note, icon: Icon, className }) => (
          <article className={`finance-live-metric is-${className}`} key={label}><span className="finance-icon"><Icon size={18} aria-hidden="true" /></span><p>{label}</p><strong>{summary ? currency.format(value) : '—'}</strong><small>{note}</small></article>
        ))}
      </section>

      <section className="finance-chart-live">
        <div className="panel-heading"><div><p className="panel-kicker">Visão mensal</p><h2>Recebido e projetado</h2></div><div className="chart-legend"><span><i className="received" /> Recebido</span><span><i className="projected" /> Projetado</span></div></div>
        <div className="bar-chart" aria-label="Gráfico dos últimos seis meses">
          {(summary?.monthly ?? []).map((item) => (
            <div className="bar-chart-column" key={item.month}><div className="bar-chart-bars"><span className="bar-projected" style={{ transform: `scaleY(${item.projected / maxChart})` }} title={`Projetado: ${currency.format(item.projected)}`} /><span className="bar-received" style={{ transform: `scaleY(${item.received / maxChart})` }} title={`Recebido: ${currency.format(item.received)}`} /></div><small>{monthFormat.format(new Date(`${item.month.slice(0, 10)}T00:00:00Z`)).replace('.', '')}</small></div>
          ))}
          {!summary ? Array.from({ length: 6 }, (_, index) => <div className="skeleton chart-skeleton" key={index} />) : null}
        </div>
      </section>

      <div className="finance-section-tabs" role="tablist" aria-label="Áreas do financeiro">
        <button type="button" className={section === 'clients' ? 'is-active' : ''} onClick={() => setSection('clients')} role="tab" aria-selected={section === 'clients'}>Clientes</button>
        <button type="button" className={section === 'expenses' ? 'is-active' : ''} onClick={() => setSection('expenses')} role="tab" aria-selected={section === 'expenses'}>Gastos</button>
      </div>

      {section === 'clients' ? (
        <section className="finance-directory-section">
          <label className="directory-search finance-directory-search"><Search size={17} aria-hidden="true" /><input value={clientSearch} onChange={(event) => setClientSearch(event.target.value)} placeholder="Pesquisar cliente, contato ou serviço" />{!clientsLoading ? <span>{clients.length} {clients.length === 1 ? 'cliente' : 'clientes'}</span> : null}</label>
          <div className="finance-directory-layout">
            <div className="finance-client-list" aria-label="Clientes com contratos">
              <div className="finance-client-list-head"><span>Cliente e serviço</span><span>Falta receber</span><span>Situação</span><span /></div>
              {clientsLoading ? Array.from({ length: 6 }, (_, index) => <div className="skeleton finance-client-row-skeleton" key={index} />) : null}
              {!clientsLoading && clients.map((client) => (
                <button type="button" className={`finance-directory-client${selectedId === client.clientId ? ' is-selected' : ''}`} onClick={() => { setSelectedId(client.clientId); void loadDetail(client.clientId) }} key={client.clientId}>
                  <span className="finance-directory-person"><span className="client-initial">{(client.clientName ?? '?').slice(0, 1).toUpperCase()}</span><span><strong>{client.clientName ?? 'Cliente sem nome'}</strong><small>{client.serviceNames || 'Sem serviço ativo'}</small></span></span>
                  <span className="finance-directory-remaining"><strong>{currency.format(client.remainingAmount)}</strong><small>{client.nextDueDate ? `próximo ${formatDate(client.nextDueDate)}` : 'sem pendências'}</small></span>
                  <FinancialStatus client={client} />
                  <ChevronRight size={17} aria-hidden="true" />
                </button>
              ))}
              {!clientsLoading && clients.length === 0 ? <div className="panel-empty finance-directory-empty"><span className="empty-icon"><UserRound size={21} aria-hidden="true" /></span><strong>Nenhum cliente financeiro</strong><p>Clientes com contratos aparecerão aqui.</p></div> : null}
            </div>

            <div className="finance-record-panel" aria-label="Ficha financeira do cliente">
              {detailLoading ? <div className="finance-record-loading"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div> : null}
              {!detailLoading && !detail ? <div className="panel-empty finance-record-empty"><span className="empty-icon"><CircleDollarSign size={22} aria-hidden="true" /></span><strong>Abra um cliente</strong><p>O total recebido, o valor que falta e cada cobrança aparecerão aqui.</p></div> : null}
              {!detailLoading && detail ? (
                <>
                  <header className="finance-record-header"><div><span className="client-record-avatar">{(detail.clientName ?? '?').slice(0, 2).toUpperCase()}</span><div><p>Ficha financeira</p><h2>{detail.clientName ?? 'Cliente sem nome'}</h2><small>{detail.serviceNames || 'Sem serviço ativo'}</small></div></div><div className="finance-record-contact"><span><MessageCircle size={14} aria-hidden="true" />{detail.whatsapp ?? 'Sem WhatsApp'}</span><span><Mail size={14} aria-hidden="true" />{detail.email ?? 'Sem email'}</span></div></header>
                  <div className="finance-client-summary">
                    <div className="is-primary"><small>Falta receber</small><strong>{currency.format(detail.remainingAmount)}</strong><span>{detail.nextDueDate ? `Próximo vencimento em ${formatDate(detail.nextDueDate)}` : 'Nenhuma cobrança pendente'}</span></div>
                    <div><small>Já recebido</small><strong>{currency.format(detail.paidAmount)}</strong><span>de {currency.format(detail.totalAmount)} previstos</span></div>
                    <div className={detail.overdueAmount > 0 ? 'is-overdue' : ''}><small>Em atraso</small><strong>{currency.format(detail.overdueAmount)}</strong><span>{detail.overdueAmount > 0 ? 'Requer acompanhamento' : 'Cliente em dia'}</span></div>
                    <div><small>MRR ativo</small><strong>{currency.format(detail.activeMrr)}</strong><span>Mensalidade recorrente</span></div>
                  </div>
                  <div className="finance-record-title"><div><p className="panel-kicker">Histórico</p><h3>Cobranças do cliente</h3></div><span>{detail.receivables.length} {detail.receivables.length === 1 ? 'cobrança' : 'cobranças'}</span></div>
                  <div className="finance-record-receivables">
                    <div className="finance-record-receivable-head"><span>Serviço e cobrança</span><span>Vencimento</span><span>Valor</span><span>Situação</span><span>Ação</span></div>
                    {detail.receivables.map((item) => (
                      <div className="finance-record-receivable-row" key={item.id}><span><strong>{item.serviceName}</strong><small>{item.kind === 'monthly_fee' ? 'Mensalidade recorrente' : item.description}</small></span><span>{formatDate(item.dueDate)}</span><strong>{currency.format(item.amount)}</strong><span className={`status-pill status-${item.status}`}>{RECEIVABLE_LABELS[item.status]}</span><span>{item.status === 'paid' ? <button type="button" className="button button-quiet button-small" onClick={() => reopenReceivable(item)}><Undo2 size={14} aria-hidden="true" /> Reabrir</button> : item.status !== 'cancelled' ? <button type="button" className="button button-primary button-small" onClick={() => { setPaying(item); setPaidAt(new Date().toISOString().slice(0, 10)) }}><Check size={14} aria-hidden="true" /> Dar baixa</button> : '—'}</span></div>
                    ))}
                    {detail.receivables.length === 0 ? <div className="panel-empty finance-record-no-charges"><strong>Sem cobranças</strong><p>Este cliente ainda não possui cobranças geradas.</p></div> : null}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </section>
      ) : (
        <section className="finance-expenses-section">
          <div className="finance-table-title"><div><p className="panel-kicker">Saídas</p><h2>Gastos registrados</h2></div><span>{currency.format(expensesTotal)} no filtro atual</span></div>
          <div className="expense-toolbar"><label className="finance-search"><Search size={16} aria-hidden="true" /><input value={expenseSearch} onChange={(event) => setExpenseSearch(event.target.value)} placeholder="Buscar gasto" /></label><label><span>Categoria</span><select value={expenseCategory} onChange={(event) => setExpenseCategory(event.target.value as 'all' | ExpenseCategory)}><option value="all">Todas</option>{Object.entries(EXPENSE_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label><span>Situação</span><select value={expenseStatus} onChange={(event) => setExpenseStatus(event.target.value as 'all' | ExpenseStatus)}><option value="all">Todas</option><option value="paid">Pagos</option><option value="planned">Planejados</option></select></label></div>
          <div className="expense-list"><div className="expense-list-head"><span>Gasto</span><span>Categoria</span><span>Data</span><span>Valor</span><span>Situação</span><span>Ação</span></div>{expensesLoading ? Array.from({ length: 5 }, (_, index) => <div className="skeleton expense-row-skeleton" key={index} />) : null}{!expensesLoading && expenses.map((expense) => <div className="expense-row" key={expense.id}><span><strong>{expense.description}</strong><small>{expense.notes || 'Sem observações'}</small></span><span>{EXPENSE_LABELS[expense.category]}</span><span>{formatDate(expense.expenseDate)}</span><strong>{currency.format(expense.amount)}</strong><span className={`status-pill expense-status-${expense.status}`}>{expense.status === 'paid' ? 'Pago' : 'Planejado'}</span><span>{expense.status === 'paid' ? <button type="button" className="button button-quiet button-small" onClick={() => updateExpense(expense, 'planned')}><Undo2 size={14} aria-hidden="true" /> Reabrir</button> : <button type="button" className="button button-primary button-small" onClick={() => updateExpense(expense, 'paid')}><Check size={14} aria-hidden="true" /> Marcar pago</button>}</span></div>)}{!expensesLoading && expenses.length === 0 ? <div className="panel-empty finance-list-empty"><span className="empty-icon"><ReceiptText size={21} aria-hidden="true" /></span><strong>Nenhum gasto encontrado</strong><p>Registre assinaturas, anúncios e outras saídas para acompanhar o saldo real.</p><button type="button" className="button button-secondary" onClick={() => setShowExpenseModal(true)}>Registrar primeiro gasto</button></div> : null}</div>
        </section>
      )}

      {paying ? <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) setPaying(null) }}><div className="payment-modal" role="dialog" aria-modal="true" aria-labelledby="payment-modal-title"><header><div><p className="eyebrow">Baixa integral</p><h2 id="payment-modal-title">Registrar recebimento</h2></div><button type="button" className="icon-button" onClick={() => setPaying(null)} aria-label="Fechar"><X size={18} /></button></header><div className="payment-modal-summary"><span>{paying.clientName}</span><strong>{currency.format(paying.amount)}</strong><small>{paying.description}</small></div><label className="form-field"><span>Data do pagamento</span><input type="date" value={paidAt} onChange={(event) => setPaidAt(event.target.value)} /></label><footer><button type="button" className="button button-secondary" onClick={() => setPaying(null)}>Cancelar</button><button type="button" className="button button-primary" onClick={markPaid} disabled={!paidAt || saving}>{saving ? 'Salvando...' : 'Confirmar pagamento'}</button></footer></div></div> : null}
      {showExpenseModal ? <ExpenseModal onClose={() => setShowExpenseModal(false)} onSaved={handleExpenseSaved} /> : null}
    </div>
  )
}
