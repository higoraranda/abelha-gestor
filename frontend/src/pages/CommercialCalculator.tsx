import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Calculator, Plus, X } from 'lucide-react'
import NewClientModal from '@/components/clients/NewClientModal'
import { ErrorState, LoadingState } from '@/components/ui/DataState'
import Modal from '@/components/ui/Modal'
import { useRemote } from '@/hooks/useRemote'
import { api } from '@/lib/api'
import { commercialPath, type CommercialBrief } from '@/lib/commercial'
import { calculateQuotePreview, emptyModel, scaled, type QuoteLine, type QuoteModel, type SavedModel } from '@/lib/quoteModels'
import type { Client } from '@/types'

const proposals = commercialPath + '/proposals'
const clientsPath = '/api/v1/clients?limit=100'
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const reais = (cents: number) => brl.format(cents / 100)
const services = [
  ['site', 'Site'], ['crm', 'CRM'], ['automation', 'Automação'], ['custom', 'Personalizado'],
] as const
type ServiceType = typeof services[number][0]
const scopeFields = [
  ['features', 'Funcionalidades'], ['deliverables', 'Entregáveis'], ['timeline', 'Prazo estimado'],
  ['requirements', 'Requisitos técnicos'], ['integrations', 'Integrações'], ['dependencies', 'Dependências e observações'],
  ['included', 'Incluído'], ['excluded', 'Fora do escopo'], ['acceptanceCriteria', 'Critérios de aceite'],
] as const
type ScopeKey = typeof scopeFields[number][0]
type Scope = Partial<Record<ScopeKey, string>>
type Commercial = CommercialBrief & { serviceTypes?: ServiceType[]; validDays?: number }
type SavedDraft = {
  id: string; revision: number; client_id: string | null; client_name: string; title: string;
  briefing: string; terms: string; model: QuoteModel; quantities: Record<string, number>; commercial?: Commercial; replayed?: boolean;
}
type Line = Omit<QuoteLine, 'priceCents'> & { price: string; quantity: string; optional: boolean }
type Draft = {
  clientId: string; title: string; objective: string; briefing: string; serviceTypes: ServiceType[];
  scope: Scope; lines: Line[]; base: string; monthly: string; discount: string;
  downPayment: string; installments: string; validDays: string; conditions: string;
}

function priceFields(model: QuoteModel, quantities: Record<string, number>, optional: readonly string[]) {
  return {
    base: String(model.baseCents / 100),
    monthly: String(model.monthlyCents / 100),
    discount: String(model.discountBps / 100),
    lines: model.lines.map(({ priceCents, ...line }) => ({
      ...line, price: String(priceCents / 100), quantity: String((quantities[line.id] ?? 0) / 1000),
      optional: optional.includes(line.id),
    })),
  }
}

function fromSaved(saved?: SavedDraft): Draft {
  const commercial = saved?.commercial
  const scope = Object.fromEntries(scopeFields.flatMap(([key]) => commercial?.[key] ? [[key, commercial[key]]] : []))
  return {
    clientId: saved?.client_id ?? '', title: saved?.title ?? '', objective: commercial?.objective ?? '',
    briefing: saved?.briefing ?? '', serviceTypes: commercial?.serviceTypes ?? [], scope,
    ...priceFields(saved?.model ?? emptyModel, saved?.quantities ?? {}, commercial?.optionalItems ?? []),
    downPayment: commercial?.payment?.downPaymentCents ? String(commercial.payment.downPaymentCents / 100) : '',
    installments: String(commercial?.payment?.installments ?? 1),
    validDays: String(commercial?.validDays ?? 15),
    conditions: commercial?.payment?.conditions ?? saved?.terms ?? '',
  }
}

function commercialQuote(draft: Draft) {
  const model: QuoteModel = {
    version: 1, name: draft.title.trim().slice(0, 80) || 'Orçamento',
    baseCents: scaled(draft.base, 2, 'Investimento base'),
    monthlyCents: scaled(draft.monthly, 2, 'Mensalidade base'),
    discountBps: scaled(draft.discount, 2, 'Desconto'),
    lines: draft.lines.map(({ id, label, unit, period, price }) => ({
      id, label, unit, period, priceCents: scaled(price, 2, label || 'Preço unitário'),
    })),
  }
  const quantities = Object.fromEntries(draft.lines.map(line => [
    line.id, scaled(line.quantity, line.unit === 'hour' ? 3 : 0, line.label || 'Quantidade') * (line.unit === 'hour' ? 1 : 1000),
  ]))
  const optionalItems = draft.lines.filter(line => line.optional).map(line => line.id)
  return { model, quantities, optionalItems, ...calculateQuotePreview(model, quantities, optionalItems) }
}

function TextField({ label, value, onChange, maxLength, inputMode, rows, placeholder, required = false }: {
  label: string; value: string; onChange: (value: string) => void; maxLength?: number;
  inputMode?: 'text' | 'numeric' | 'decimal'; rows?: number; placeholder?: string; required?: boolean;
}) {
  const props = {
    value, maxLength: maxLength ?? (inputMode ? 16 : undefined), placeholder, required,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(event.target.value),
  }
  return <label className="login-field">
    <span>{label}</span>
    {rows ? <textarea className="resize-none" rows={rows} {...props}/> : <input inputMode={inputMode} {...props}/>}
  </label>
}

function QuoteSummary({ result, warning }: { result: ReturnType<typeof commercialQuote> | null; warning: string }) {
  const quote = result?.quote
  return <aside className="crm-panel quote-live-summary" aria-label="Resumo do orçamento">
    <h2>Resumo do orçamento</h2>
    <dl aria-live="polite" aria-atomic="true">
      {quote?.discountCents ? <>
        <div className="quote-summary-extra"><dt>Subtotal</dt><dd>{reais(quote.subtotalCents)}</dd></div>
        <div className="quote-summary-extra"><dt>Desconto</dt><dd>− {reais(quote.discountCents)}</dd></div>
      </> : null}
      <div className="quote-summary-total"><dt>Implementação</dt><dd>{quote ? reais(quote.oneTimeCents) : '—'}</dd></div>
      <div className="quote-summary-total"><dt>Recorrência mensal</dt><dd>{quote ? reais(quote.monthlyCents) : '—'}</dd></div>
    </dl>
    {warning && <p className="form-error" role="status">{warning}</p>}
    {!!result?.options.length && <details className="quote-summary-options">
      <summary>{result.options.length} {result.options.length === 1 ? 'item opcional' : 'itens opcionais'}</summary>
      <ul>{result.options.map(line => <li key={line.id}>{line.label || 'Item'} · {reais(line.amountCents)}{line.period === 'monthly' && '/mês'}</li>)}</ul>
    </details>}
  </aside>
}

function CalculatorForm({ initial, onProposal }: {
  initial?: SavedDraft; onProposal?: (id: string) => void;
}) {
  const [draft, setDraft] = useState(() => fromSaved(initial))
  const [lastSaved, setLastSaved] = useState(draft)
  const [saved, setSaved] = useState(initial)
  const [draftKey] = useState(() => crypto.randomUUID())
  const [clientQuery, setClientQuery] = useState('')
  const [clientFilter, setClientFilter] = useState('')
  const [clientSelection, setClientSelection] = useState<{ id: string; name: string | null } | null>(
    () => initial?.client_id ? { id: initial.client_id, name: initial.client_name } : null,
  )
  const clients = useRemote<Pick<Client, 'id' | 'name'>[]>(clientsPath + (clientFilter ? '&search=' + encodeURIComponent(clientFilter) : ''))
  const library = useRemote<SavedModel[]>('/api/v1/quote-models')
  const [creatingClient, setCreatingClient] = useState(false)
  const [modelId, setModelId] = useState('')
  const [replaceModel, setReplaceModel] = useState<QuoteModel | null>(null)
  const [reviewing, setReviewing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const clientSearch = useRef<HTMLInputElement>(null)
  const reviewHeading = useRef<HTMLHeadingElement>(null)
  const feedback = useRef<HTMLDivElement>(null)
  const inFlight = useRef(false)
  const lastCreatePayload = useRef<string | null>(null)
  const dirty = draft !== lastSaved

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const clientOptions = clients.data ?? []
  const options = clientSelection && !clientOptions.some(client => client.id === clientSelection.id)
    ? [clientSelection, ...clientOptions] : clientOptions
  let result: ReturnType<typeof commercialQuote> | null = null
  let downPayment: number | null = null
  let warning = ''
  try { result = commercialQuote(draft) }
  catch (failure) { warning = failure instanceof Error ? failure.message : 'Confira preços e quantidades.' }
  try { downPayment = scaled(draft.downPayment, 2, 'Entrada') }
  catch { /* The save action reports the invalid amount beside the review. */ }

  function update<D extends keyof Draft>(key: D, value: Draft[D]) {
    setDraft(current => ({ ...current, [key]: value }))
    setStatus('')
  }
  function selectClient(client?: Pick<Client, 'id' | 'name'>) {
    setClientSelection(client ?? null)
    update('clientId', client?.id ?? '')
  }
  function editLine(id: string, value: Partial<Line>) {
    update('lines', draft.lines.map(line => line.id === id ? { ...line, ...value } : line))
  }
  function applyModel(model: QuoteModel) {
    const quantities = Object.fromEntries(model.lines.map(line => [line.id, 1000]))
    setDraft(current => ({ ...current, ...priceFields(model, quantities, []) }))
    setReplaceModel(null)
    setStatus('Modelo aplicado. Revise os itens e as quantidades.')
  }
  function revealReview() {
    setReviewing(true)
    requestAnimationFrame(() => reviewHeading.current?.focus())
  }
  async function save(openProposal: boolean) {
    if (inFlight.current) return
    setError('')
    setStatus('')
    try {
      if (!draft.clientId) throw new Error('Selecione ou cadastre o cliente do orçamento.')
      if (!draft.title.trim()) throw new Error('Informe o nome do projeto.')
      if (!draft.briefing.trim()) throw new Error('Preencha o briefing do projeto.')
      if (draft.lines.some(line => !line.label.trim())) throw new Error('Nomeie todos os serviços adicionados.')
      if (!result) throw new Error(warning || 'Confira preços e quantidades.')
      const validDays = scaled(draft.validDays, 0, 'Validade')
      if (validDays < 1 || validDays > 180) throw new Error('Informe uma validade entre 1 e 180 dias.')
      const downPaymentCents = scaled(draft.downPayment, 2, 'Entrada')
      if (downPaymentCents > result.quote.oneTimeCents) throw new Error('A entrada deve caber no valor de implementação.')
      const installments = scaled(draft.installments, 0, 'Parcelas')
      if (installments < 1 || installments > 36) throw new Error('Informe entre 1 e 36 parcelas do saldo.')
      const commercial: Commercial = {
        ...draft.scope, objective: draft.objective.trim(), serviceTypes: draft.serviceTypes,
        optionalItems: result.optionalItems, validDays,
        payment: { downPaymentCents, installments, conditions: draft.conditions.trim() },
      }
      const body = {
        clientId: draft.clientId, title: draft.title.trim(), briefing: draft.briefing.trim(), terms: draft.conditions.trim(),
        model: result.model, quantities: result.quantities, commercial,
      }
      inFlight.current = true
      setBusy(true)
      const patch = (entry: SavedDraft) =>
        api.patch<SavedDraft>(`${proposals}/${entry.id}`, { ...body, revision: entry.revision })
      let entry = saved
      if (!entry) {
        const payload = JSON.stringify(body)
        entry = await api.post<SavedDraft>(proposals, { ...body, draftKey })
          .catch(failure => {
            lastCreatePayload.current ??= payload
            throw failure
          })
        if (entry.replayed && lastCreatePayload.current !== payload) {
          if (entry.revision !== 1) throw new Error('O rascunho mudou em outra sessão. Abra a revisão atual em Propostas.')
          entry = await patch(entry)
        }
      } else if (dirty) {
        entry = await patch(entry)
      }
      setSaved(entry)
      setLastSaved(draft)
      setStatus(openProposal ? 'Rascunho da proposta gerado.' : 'Rascunho salvo.')
      if (openProposal) onProposal?.(entry.id)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível salvar o orçamento.')
      requestAnimationFrame(() => feedback.current?.focus())
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }

  return <div className="commercial-calculator">
    <QuoteSummary result={result} warning={warning}/>
    <fieldset className="quote-editor commercial-quote-fields" disabled={busy}>
      <section className="crm-panel quote-block" aria-labelledby="calculator-client">
        <h2 id="calculator-client">Cliente e projeto</h2>
        <form className="calculator-client-row" noValidate onSubmit={event => { event.preventDefault(); setClientFilter(clientQuery.trim()) }}>
          <div className="calculator-client-search">
            <label className="login-field"><span>Buscar clientes</span><input ref={clientSearch} type="search" value={clientQuery} maxLength={100} onChange={event => setClientQuery(event.target.value)}/></label>
            {clientQuery && <button type="button" className="icon-button calculator-clear" aria-label="Limpar busca" onClick={() => {
              setClientQuery(''); setClientFilter(''); clientSearch.current?.focus()
            }}><X size={17} aria-hidden="true"/></button>}
          </div>
          <button type="submit" className="button button-secondary">Buscar</button>
        </form>
        {clients.error && <ErrorState message={clients.error} retry={clients.reload}/>}
        <div className="calculator-client-row">
          <label className="login-field"><span>Cliente</span><select value={draft.clientId} onChange={event => selectClient(options.find(client => client.id === event.target.value))} required>
            <option value="">{clients.loading ? 'Buscando clientes…' : 'Selecione um cliente'}</option>
            {options.map(client => <option key={client.id} value={client.id}>{client.name || 'Cliente sem nome'}</option>)}
          </select></label>
          <button type="button" className="button button-secondary" onClick={() => setCreatingClient(true)}><Plus size={16} aria-hidden="true"/> Novo cliente</button>
        </div>
        {!clients.loading && !clients.error && !clientOptions.length && <p className="quote-help">{clientFilter ? 'Nenhum cliente corresponde à busca.' : 'Nenhum cliente disponível no CRM.'}</p>}
        <TextField label="Nome do projeto" value={draft.title} onChange={value => update('title', value)} maxLength={100} placeholder="Ex.: Site institucional" required/>
        <TextField label="Objetivo do projeto" value={draft.objective} onChange={value => update('objective', value)} maxLength={2000} placeholder="O que o cliente quer alcançar?"/>
        <TextField label="Briefing" value={draft.briefing} onChange={value => update('briefing', value)} maxLength={5000} rows={4} required/>
      </section>

      <section className="crm-panel quote-block" aria-labelledby="calculator-scope">
        <h2 id="calculator-scope">Serviços e requisitos</h2>
        <fieldset className="quote-service-types">
          <legend>Tipo de serviço</legend>
          <div>{services.map(([value, label]) => <label key={value}><input type="checkbox" checked={draft.serviceTypes.includes(value)} onChange={event => update('serviceTypes',
            event.target.checked ? [...draft.serviceTypes, value] : draft.serviceTypes.filter(service => service !== value),
          )}/>{label}</label>)}</div>
        </fieldset>
        <div className="quote-client-find">
          <label className="login-field"><span>Modelo de preço</span><select value={modelId} onChange={event => setModelId(event.target.value)}>
            <option value="">{library.loading ? 'Carregando modelos…' : 'Selecione um modelo salvo'}</option>
            {library.data?.map(item => <option key={item.id} value={item.id}>{item.model.name}</option>)}
          </select></label>
          <button type="button" className="button button-secondary" disabled={!modelId} onClick={() => {
            const model = library.data?.find(item => item.id === modelId)?.model
            if (!model) return
            if (draft.lines.length || draft.base !== '0' || draft.monthly !== '0' || draft.discount !== '0') setReplaceModel(model)
            else applyModel(model)
          }}>Aplicar modelo</button>
        </div>
        {library.error && <ErrorState message={library.error} retry={library.reload}/>}
        {draft.lines.map((line, index) => <fieldset key={line.id} className="quote-service-line">
          <legend>{line.label.trim() || `Serviço ${index + 1}`}</legend>
          <div className="quote-line-header">
            <TextField label="Serviço" value={line.label} onChange={label => editLine(line.id, { label })} maxLength={80} required/>
            <button className="icon-button" type="button" aria-label={`Remover ${line.label || `serviço ${index + 1}`}`} title="Remover serviço" onClick={() => update('lines', draft.lines.filter(item => item.id !== line.id))}><X size={17} aria-hidden="true"/></button>
          </div>
          <div className="quote-fields">
            <TextField label="Valor unitário (R$)" inputMode="decimal" value={line.price} onChange={price => editLine(line.id, { price })}/>
            <label className="login-field"><span>Cobrança</span><select value={line.unit} onChange={event => {
              const unit = event.target.value as QuoteLine['unit']
              editLine(line.id, { unit, quantity: unit === 'fixed' || line.unit === 'fixed' ? '1' : line.quantity })
            }}><option value="fixed">Fixa</option><option value="unit">Por unidade</option><option value="hour">Por hora</option></select></label>
            {line.unit === 'fixed'
              ? <label className="login-field"><span>Incluir</span><select value={line.quantity} onChange={event => editLine(line.id, { quantity: event.target.value })}><option value="1">Sim</option><option value="0">Não</option></select></label>
              : <TextField label={line.unit === 'hour' ? 'Horas' : 'Quantidade'} value={line.quantity} inputMode={line.unit === 'hour' ? 'decimal' : 'numeric'} onChange={quantity => editLine(line.id, { quantity })}/>}
            <label className="login-field"><span>Frequência</span><select value={line.period} onChange={event => editLine(line.id, { period: event.target.value as QuoteLine['period'] })}><option value="once">Única</option><option value="monthly">Mensal</option></select></label>
          </div>
          <label className="quote-option"><input type="checkbox" checked={line.optional} onChange={event => editLine(line.id, { optional: event.target.checked })}/> Serviço opcional</label>
        </fieldset>)}
        <div><button type="button" className="button button-secondary" disabled={draft.lines.length >= 30} onClick={() => update('lines', [...draft.lines, {
          id: 'item-' + crypto.randomUUID().replaceAll('-', ''), label: '', price: '', quantity: '1', unit: 'fixed', period: 'once', optional: false,
        }])}><Plus size={16} aria-hidden="true"/> Adicionar serviço</button></div>
        <details className="quote-more">
          <summary>Detalhar escopo</summary>
          <div className="quote-scope-fields">{scopeFields.map(([key, label]) => <TextField key={key} label={label} rows={2}
            value={draft.scope[key] ?? ''} maxLength={2000} onChange={value => update('scope', { ...draft.scope, [key]: value })}/>)}</div>
        </details>
      </section>

      <section className="crm-panel quote-block" aria-labelledby="calculator-payment">
        <h2 id="calculator-payment">Investimento e condições</h2>
        <div className="quote-fields">
          <TextField label="Investimento base (R$)" value={draft.base} onChange={value => update('base', value)} inputMode="decimal"/>
          <TextField label="Mensalidade base (R$)" value={draft.monthly} onChange={value => update('monthly', value)} inputMode="decimal"/>
          <TextField label="Desconto na implementação (%)" value={draft.discount} onChange={value => update('discount', value)} inputMode="decimal"/>
        </div>
        <div className="quote-fields">
          <TextField label="Entrada (R$)" value={draft.downPayment} onChange={value => update('downPayment', value)} inputMode="decimal"/>
          <TextField label="Parcelas do saldo" value={draft.installments} onChange={value => update('installments', value)} inputMode="numeric"/>
          <TextField label="Validade (dias)" value={draft.validDays} onChange={value => update('validDays', value)} inputMode="numeric" required/>
        </div>
        <TextField label="Condições de pagamento" value={draft.conditions} onChange={value => update('conditions', value)} maxLength={2000} rows={3}/>
      </section>

      <section className="crm-panel quote-block" aria-labelledby="calculator-review">
        <h2 id="calculator-review" ref={reviewHeading} tabIndex={-1}>Revisão e proposta</h2>
        {!reviewing && <p className="quote-help">Confira escopo, valores e condições antes de abrir o editor da proposta.</p>}
        {reviewing && <><div className="quote-review">
          <div><strong>{draft.title.trim() || 'Projeto sem nome'}</strong><span>{clientSelection?.name || 'Cliente a selecionar'}</span></div>
          <div><span>Implementação</span><strong>{result ? reais(result.quote.oneTimeCents) : '—'}</strong></div>
          <div><span>Recorrência mensal</span><strong>{result ? reais(result.quote.monthlyCents) : '—'}</strong></div>
          <div><span>Validade a partir da publicação</span><strong>{draft.validDays || '—'} dias</strong></div>
          {draft.downPayment && <div><span>Entrada</span><strong>{downPayment === null ? 'Valor inválido' : reais(downPayment)}</strong></div>}
          {draft.installments && <div><span>Parcelas do saldo</span><strong>{draft.installments}</strong></div>}
        </div>
        <details className="quote-more">
          <summary>Conferir escopo e serviços</summary>
          <dl className="quote-review-scope">
            {draft.objective.trim() && <><dt>Objetivo</dt><dd>{draft.objective}</dd></>}
            {draft.briefing.trim() && <><dt>Briefing</dt><dd>{draft.briefing}</dd></>}
            {scopeFields.filter(([key]) => draft.scope[key]?.trim()).map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{draft.scope[key]}</dd></div>)}
            {draft.conditions.trim() && <><dt>Pagamento</dt><dd>{draft.conditions}</dd></>}
          </dl>
          {result?.quote.lines.some(line => result.quantities[line.id] > 0) && <ul className="quote-review-services">{result.quote.lines
            .filter(line => result.quantities[line.id] > 0)
            .map(line => <li key={line.id}>
              <span>{line.label || 'Serviço sem nome'}{result.optionalItems.includes(line.id) && ' · Opcional'}</span>
              <strong>{reais(line.amountCents)}{line.period === 'monthly' && '/mês'}</strong>
            </li>)}</ul>}
        </details></>}
        <div ref={feedback} tabIndex={-1}>
          {error && <p className="form-error" role="alert">{error}</p>}
          {status && <p className="personal-banner" role="status">{status}</p>}
        </div>
        <div className="quote-actions">
          <button type="button" className="button button-secondary" onClick={() => void save(false)}>Salvar rascunho</button>
          {!reviewing && <button type="button" className="button button-primary" onClick={revealReview}><Calculator size={17} aria-hidden="true"/> Revisar orçamento</button>}
          {reviewing && <button type="button" className="button button-primary" onClick={() => void save(true)}>Gerar proposta <ArrowRight size={17} aria-hidden="true"/></button>}
          {busy && <span role="status">Salvando…</span>}
        </div>
      </section>
    </fieldset>
    {creatingClient && <NewClientModal onClose={() => setCreatingClient(false)} onCreate={selectClient} allowInitialContract={false}/>}
    {replaceModel && <Modal title="Aplicar modelo de preço?" description="O modelo substitui os serviços e valores atuais deste orçamento." onClose={() => setReplaceModel(null)}>
      <footer className="quote-actions"><button type="button" className="button button-secondary" onClick={() => setReplaceModel(null)}>Voltar</button>
        <button type="button" className="button button-primary" onClick={() => applyModel(replaceModel)}>Aplicar modelo</button></footer>
    </Modal>}
  </div>
}

export default function CommercialCalculator({ draftId, onProposal }: {
  draftId?: string | null; onProposal?: (id: string) => void;
}) {
  const remote = useRemote<SavedDraft>(draftId ? `${proposals}/${draftId}` : null)
  if (remote.error && !remote.data) return <ErrorState message={remote.error} retry={remote.reload}/>
  if (draftId && !remote.data) return <LoadingState/>
  return <CalculatorForm key={draftId || 'new'} initial={remote.data ?? undefined} onProposal={onProposal}/>
}
