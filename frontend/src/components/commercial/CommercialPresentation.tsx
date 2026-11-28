import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowDownRight, ArrowUpRight, FileText } from 'lucide-react'
import ThemeToggle from '@/components/ui/ThemeToggle'
import { commercialDate, commercialMoney, printCommercialPage, type CommercialContract, type CommercialSnapshot } from '@/lib/commercial'
import './CommercialPresentation.css'

function Copy({ value }: { value?: string }) {
  return value?.trim() ? <p className="offer-copy">{value}</p> : null
}

type OfferSection = { id: string; label: string; title: string; content: ReactNode }

function buildSections(snapshot: CommercialSnapshot, expiresAt?: string): OfferSection[] {
  const { commercial, presentation, quote } = snapshot
  const { payment } = commercial
  const commercialConditions = [...new Set([payment?.conditions?.trim(), snapshot.terms.trim()].filter(Boolean))]
  const optional = new Set(commercial.optionalItems)
  const optionLines = quote.lines.filter(item => optional.has(item.id))
  const baseLines = quote.lines.filter(item => !optional.has(item.id))
  const list: OfferSection[] = []
  if (presentation.intro || snapshot.briefing || commercial.objective || presentation.solution) list.push({
    id: 'visao', label: 'Visão', title: 'O que vamos construir', content: <div className="offer-copy-grid">
      <Copy value={presentation.intro} /><Copy value={snapshot.briefing} />
      {commercial.objective && <div><h3>Objetivo</h3><Copy value={commercial.objective} /></div>}
      {presentation.solution && <div><h3>Solução proposta</h3><Copy value={presentation.solution} /></div>}
    </div>,
  })
  const scope = [
    ['Entregáveis', commercial.deliverables], ['Funcionalidades', commercial.features],
    ['Requisitos', commercial.requirements], ['Integrações', commercial.integrations],
    ['Incluído', commercial.included], ['Fora do escopo', commercial.excluded],
    ['Critérios de aceite', commercial.acceptanceCriteria],
  ]
  if (scope.some(([, content]) => content)) list.push({
    id: 'escopo', label: 'Escopo', title: 'O que você recebe', content: <div className="offer-scope">
      {scope.map(([name, value]) => value && <div className="offer-scope-row" key={name}><h3>{name}</h3><Copy value={value} /></div>)}
    </div>,
  })
  if (presentation.methodology || commercial.timeline || commercial.dependencies) list.push({
    id: 'execucao', label: 'Prazos', title: 'Como vamos trabalhar', content: <div className="offer-scope">
      {presentation.methodology && <div className="offer-scope-row"><h3>Metodologia</h3><Copy value={presentation.methodology} /></div>}
      {commercial.timeline && <div className="offer-scope-row"><h3>Cronograma estimado</h3><Copy value={commercial.timeline} /></div>}
      {commercial.dependencies && <div className="offer-scope-row"><h3>Dependências</h3><Copy value={commercial.dependencies} /></div>}
    </div>,
  })
  list.push({
    id: 'investimento', label: 'Investimento', title: 'Investimento e condições', content: <>
      <div className="offer-investment">
        <div><span>Implementação</span><strong>{commercialMoney(quote.oneTimeCents)}</strong></div>
        {quote.monthlyCents > 0 && <div><span>Recorrência mensal</span><strong>{commercialMoney(quote.monthlyCents)}</strong></div>}
      </div>
      {baseLines.length > 0 && <ul className="offer-prices" aria-label="Composição do investimento">{baseLines.map(item => <li key={item.id}>
        <span>{item.label}</span><strong>{commercialMoney(item.amountCents)}{item.period === 'monthly' && ' / mês'}</strong>
      </li>)}</ul>}
      {quote.discountCents > 0 && <p className="offer-discount">Desconto de implementação · {commercialMoney(quote.discountCents)}</p>}
      {(payment?.downPaymentCents !== undefined || payment?.installments || payment?.conditions || snapshot.terms) && <div className="offer-terms">
        {!!payment?.downPaymentCents && <span>Entrada · {commercialMoney(payment.downPaymentCents)}</span>}
        {!!payment?.installments && <span>Parcelamento do saldo · {payment.installments}x</span>}
        {commercialConditions.map(value => <Copy key={value} value={value} />)}
      </div>}
      {!!optionLines.length && <div className="offer-options"><h3>Serviços opcionais</h3><ul className="offer-prices">
        {optionLines.map(item => <li key={item.id}><span>{item.label}</span><strong>{commercialMoney(item.amountCents)}{item.period === 'monthly' && ' / mês'}</strong></li>)}
      </ul></div>}
      {expiresAt && <p className="offer-validity">Válida até {commercialDate(expiresAt, true)} · horário de Brasília</p>}
    </>,
  })
  if (presentation.nextSteps) list.push({
    id: 'proximos', label: 'Próximos passos', title: 'Próximos passos',
    content: <Copy value={presentation.nextSteps} />,
  })
  return list
}

export default function CommercialPresentation({ snapshot, expiresAt, version, decision, preview = false, printPreview = false }: {
  snapshot: CommercialSnapshot
  expiresAt?: string
  version?: number
  decision?: ReactNode
  preview?: boolean
  printPreview?: boolean
}) {
  const prefix = useId()
  const root = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState('capa')
  const sections = buildSections(snapshot, expiresAt)
  const navigation = [{ id: 'capa', label: 'Apresentação' }, ...sections, ...(decision ? [{ id: 'decisao', label: 'Decisão' }] : [])]
  const activeIndex = Math.max(0, navigation.findIndex(item => item.id === active))
  const navKey = navigation.map(item => item.id).join(',')
  const title = snapshot.presentation.title || snapshot.title
  const brand = snapshot.presentation.brandName || 'Abelha'

  useEffect(() => {
    if (!root.current || !('IntersectionObserver' in window)) return
    const observer = new IntersectionObserver(entries => {
      const visible = entries.find(entry => entry.isIntersecting)
      if (visible) setActive((visible.target as HTMLElement).dataset.offerSection || 'capa')
    }, { rootMargin: '-29% 0px -65% 0px' })
    root.current.querySelectorAll('[data-offer-section]').forEach(section => observer.observe(section))
    return () => observer.disconnect()
  }, [navKey])

  function goTo(index: number) {
    const item = navigation[index]
    if (!item) return
    const section = document.getElementById(prefix + item.id)
    setActive(item.id)
    section?.focus({ preventScroll: true })
    section?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  }

  return <div className={preview ? 'offer offer--preview' + (printPreview ? ' offer--print-preview' : '') : 'offer offer--public'} ref={root} onKeyDown={event => {
    if (preview || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || !(event.target instanceof HTMLElement)
      || event.target.closest('input, textarea, select, button, a, [contenteditable]')) return
    const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    if (delta) { event.preventDefault(); goTo(activeIndex + delta) }
  }}>
    <header className="offer-toolbar" aria-label="Controles da apresentação">
      <div className="offer-toolbar-inner">
        <span className="offer-brand"><img src="/bee-mark.png" alt="" />{brand}</span>
        <nav aria-label="Seções da proposta" className="offer-nav">
          {navigation.map((item, index) => <button type="button" key={item.id} onClick={() => goTo(index)}
            aria-current={activeIndex === index ? 'location' : undefined}>{item.label}</button>)}
        </nav>
        {(!preview || printPreview) && <div className="offer-controls">
          <button type="button" className="offer-print" aria-label="Salvar em PDF" onClick={printCommercialPage}><FileText size={17} aria-hidden="true" /><span>Salvar em PDF</span></button>
          {!preview && <ThemeToggle />}
        </div>}
      </div>
      <progress className="offer-progress" value={activeIndex + 1} max={navigation.length} aria-label="Progresso da apresentação" />
    </header>
    <article className="offer-document">
      <section className="offer-cover" data-offer-section="capa" id={prefix + 'capa'} tabIndex={-1}>
        <div className="offer-cover-strap"><span>Proposta comercial</span>{version !== undefined && <span>Versão {version}</span>}</div>
        <div className="offer-cover-body"><div>
          <p>Preparada para <strong>{snapshot.client_name}</strong></p>
          <h1>{title}</h1>
        </div><div className="offer-emblem" aria-hidden="true"><ArrowDownRight strokeWidth={0.75} /></div></div>
        <div className="offer-cover-footer">
          <span>{expiresAt ? 'Válida até ' + commercialDate(expiresAt) : brand}</span>
          <button type="button" onClick={() => goTo(1)}>Explorar proposta <ArrowDown size={18} aria-hidden="true" /></button>
        </div>
      </section>
      {sections.map(section => <section className={'offer-section offer-section--' + section.id} key={section.id}
        id={prefix + section.id} data-offer-section={section.id} tabIndex={-1}>
        <div className="offer-section-heading"><p>{section.label}</p><h2>{section.title}</h2></div>
        <div className="offer-section-content">{section.content}</div>
      </section>)}
      {decision && <section className="offer-section offer-decision" id={prefix + 'decisao'} data-offer-section="decisao" tabIndex={-1}>
        <div className="offer-section-heading"><p>Decisão comercial</p><h2>Sua resposta</h2></div>
        <div className="offer-section-content">{decision}</div>
      </section>}
    </article>
    <footer className="offer-footer"><span>{brand}</span>
      <button type="button" onClick={() => goTo(0)}>Voltar ao início <ArrowUpRight size={16} aria-hidden="true" /></button>
    </footer>
  </div>
}

export function ContractDocument({ contract, snapshot }: { contract: CommercialContract; snapshot: CommercialSnapshot }) {
  const { commercial, quote } = snapshot
  const immutable = [
    ['Objeto', commercial.objective || snapshot.title], ['Escopo', commercial.included],
    ['Funcionalidades', commercial.features], ['Entregáveis', commercial.deliverables],
    ['Prazo', commercial.timeline], ['Dependências', commercial.dependencies], ['Limites do escopo', commercial.excluded],
    ['Condições de pagamento', [...new Set([commercial.payment?.conditions?.trim(), snapshot.terms.trim()].filter(Boolean))].join('\n')],
  ]
  return <article className="contract-document">
    <header><p>Contrato · versão {contract.version}</p><h2>{contract.title}</h2><p>{[contract.supplier_name, snapshot.client_name].filter(Boolean).join(' · ')}</p></header>
    <dl className="offer-contract-details">
      {immutable.map(([label, value]) => value && <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      <div><dt>Implementação</dt><dd>{commercialMoney(quote.oneTimeCents)}</dd></div>
      {quote.monthlyCents > 0 && <div><dt>Recorrência mensal</dt><dd>{commercialMoney(quote.monthlyCents)}</dd></div>}
      {!!commercial.payment?.installments && <div><dt>Parcelamento</dt><dd>{commercial.payment.installments}x</dd></div>}
      {!!commercial.payment?.downPaymentCents && <div><dt>Entrada</dt><dd>{commercialMoney(commercial.payment.downPaymentCents)}</dd></div>}
    </dl>
    {contract.clauses && <div><h3>Cláusulas e identificação das partes</h3><Copy value={contract.clauses} /></div>}
  </article>
}
