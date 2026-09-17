import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowDownUp, CalendarCheck, Check, CircleAlert, CircleDollarSign, Clock3, Search, Undo2, WalletCards, X } from 'lucide-react'
import { api } from '@/lib/api'
import type { FinanceSummary, Receivable, ReceivableStatus } from '@/types'

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const dateFormat = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' })
const monthFormat = new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' })
const LABELS: Record<ReceivableStatus, string> = { open: 'Em aberto', paid: 'Pago', overdue: 'Atrasado', cancelled: 'Cancelado' }

function formatDate(value: string) {
  return dateFormat.format(new Date(`${value.slice(0, 10)}T00:00:00Z`))
}

export default function FinancePage() {
  const [summary, setSummary] = useState<FinanceSummary | null>(null)
  const [receivables, setReceivables] = useState<Receivable[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [order, setOrder] = useState<'asc' | 'desc'>('asc')
  const [paying, setPaying] = useState<Receivable | null>(null)
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)

  const loadSummary = useCallback(async () => {
    setSummary(await api.get<FinanceSummary>('/api/v1/finance/summary'))
  }, [])

  const loadReceivables = useCallback(async () => {
    const params = new URLSearchParams({ status, order })
    if (search.trim()) params.set('search', search.trim())
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    setLoading(true)
    try {
      setReceivables(await api.get<Receivable[]>(`/api/v1/finance/receivables?${params}`))
      setError(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível carregar o financeiro.')
    } finally {
      setLoading(false)
    }
  }, [from, order, search, status, to])

  useEffect(() => {
    let active = true
    api.get<FinanceSummary>('/api/v1/finance/summary')
      .then((data) => { if (active) setSummary(data) })
      .catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : 'Não foi possível carregar o resumo.') })
    return () => { active = false }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadReceivables() }, 250)
    return () => window.clearTimeout(timer)
  }, [loadReceivables])

  const maxChart = useMemo(() => Math.max(1, ...(summary?.monthly.flatMap((item) => [item.projected, item.received]) ?? [1])), [summary])

  async function markPaid() {
    if (!paying) return
    setSaving(true)
    try {
      await api.patch(`/api/v1/finance/receivables/${paying.id}`, { status: 'paid', paidAt })
      setPaying(null)
      await Promise.all([loadSummary(), loadReceivables()])
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível dar baixa.')
    } finally {
      setSaving(false)
    }
  }

  async function reopen(item: Receivable) {
    if (!window.confirm(`Reabrir a cobrança de ${item.clientName ?? 'cliente'}?`)) return
    try {
      await api.patch(`/api/v1/finance/receivables/${item.id}`, { status: 'open' })
      await Promise.all([loadSummary(), loadReceivables()])
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível reabrir a cobrança.')
    }
  }

  const metrics = [
    { label: 'Recebido no mês', value: summary?.receivedMonth ?? 0, note: 'Baixas registradas', icon: CalendarCheck, className: 'received' },
    { label: 'Em aberto', value: summary?.openAmount ?? 0, note: 'Vencimentos atuais e futuros', icon: Clock3, className: 'open' },
    { label: 'Atrasado', value: summary?.overdueAmount ?? 0, note: 'Exige acompanhamento', icon: CircleAlert, className: 'overdue' },
    { label: 'Total projetado', value: summary?.projectedTotal ?? 0, note: 'Contratos não cancelados', icon: WalletCards, className: 'projected' },
  ]

  return (
    <div className="module-page finance-page-live">
      <header className="page-heading"><div><p className="eyebrow">Contas a receber</p><h1>Financeiro</h1><p className="page-subtitle">Acompanhe parcelas, mensalidades e baixas geradas pelos contratos.</p></div></header>
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
            <div className="bar-chart-column" key={item.month}>
              <div className="bar-chart-bars"><span className="bar-projected" style={{ transform: `scaleY(${item.projected / maxChart})` }} title={`Projetado: ${currency.format(item.projected)}`} /><span className="bar-received" style={{ transform: `scaleY(${item.received / maxChart})` }} title={`Recebido: ${currency.format(item.received)}`} /></div>
              <small>{monthFormat.format(new Date(`${item.month.slice(0, 10)}T00:00:00Z`)).replace('.', '')}</small>
            </div>
          ))}
          {!summary ? Array.from({ length: 6 }, (_, index) => <div className="skeleton chart-skeleton" key={index} />) : null}
        </div>
      </section>

      <section className="finance-receivables-section">
        <div className="finance-table-title"><div><p className="panel-kicker">Cobranças</p><h2>Contas a receber</h2></div><span>{receivables.length} resultados</span></div>
        <div className="finance-toolbar">
          <label className="finance-search"><Search size={16} aria-hidden="true" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar cliente ou serviço" /></label>
          <label><span>Situação</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Todas</option><option value="open">Em aberto</option><option value="overdue">Atrasadas</option><option value="paid">Pagas</option><option value="cancelled">Canceladas</option></select></label>
          <label><span>De</span><input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
          <label><span>Até</span><input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label>
          <button type="button" className="icon-button order-button" onClick={() => setOrder((current) => current === 'asc' ? 'desc' : 'asc')} aria-label="Inverter ordem de vencimento"><ArrowDownUp size={17} aria-hidden="true" /></button>
        </div>

        <div className="finance-table">
          <div className="finance-table-head"><span>Cliente</span><span>Serviço</span><span>Vencimento</span><span>Valor</span><span>Situação</span><span>Ação</span></div>
          {loading ? Array.from({ length: 5 }, (_, index) => <div className="skeleton finance-row-skeleton" key={index} />) : null}
          {!loading && receivables.map((item) => (
            <div className="finance-table-row" key={item.id}>
              <span><strong>{item.clientName ?? 'Cliente sem nome'}</strong><small>{item.kind === 'monthly_fee' ? 'Mensalidade' : `Parcela ${item.installmentNumber ?? ''}`}</small></span>
              <span>{item.serviceName}</span><span>{formatDate(item.dueDate)}</span><strong>{currency.format(item.amount)}</strong><span className={`status-pill status-${item.status}`}>{LABELS[item.status]}</span>
              <span>{item.status === 'paid' ? <button type="button" className="button button-quiet button-small" onClick={() => reopen(item)}><Undo2 size={14} aria-hidden="true" /> Reabrir</button> : item.status !== 'cancelled' ? <button type="button" className="button button-primary button-small" onClick={() => { setPaying(item); setPaidAt(new Date().toISOString().slice(0, 10)) }}><Check size={14} aria-hidden="true" /> Dar baixa</button> : '—'}</span>
            </div>
          ))}
          {!loading && receivables.length === 0 ? <div className="panel-empty finance-list-empty"><span className="empty-icon"><CircleDollarSign size={21} aria-hidden="true" /></span><strong>Nenhuma cobrança encontrada</strong><p>As cobranças são criadas automaticamente com os contratos dos clientes.</p></div> : null}
        </div>
      </section>

      {paying ? (
        <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) setPaying(null) }}>
          <div className="payment-modal" role="dialog" aria-modal="true" aria-labelledby="payment-modal-title">
            <header><div><p className="eyebrow">Baixa integral</p><h2 id="payment-modal-title">Registrar recebimento</h2></div><button type="button" className="icon-button" onClick={() => setPaying(null)} aria-label="Fechar"><X size={18} /></button></header>
            <div className="payment-modal-summary"><span>{paying.clientName}</span><strong>{currency.format(paying.amount)}</strong><small>{paying.description}</small></div>
            <label className="form-field"><span>Data do pagamento</span><input type="date" value={paidAt} onChange={(event) => setPaidAt(event.target.value)} /></label>
            <footer><button type="button" className="button button-secondary" onClick={() => setPaying(null)}>Cancelar</button><button type="button" className="button button-primary" onClick={markPaid} disabled={!paidAt || saving}>{saving ? 'Salvando...' : 'Confirmar pagamento'}</button></footer>
          </div>
        </div>
      ) : null}
    </div>
  )
}
