import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Bot, Check, ChevronDown, Clipboard, FileText, Globe2, Layers3, LoaderCircle, MapPin, MessageCircle, RotateCcw, Sparkles, X } from 'lucide-react'
import { api } from '@/lib/api'
import type { CatalogItem, PricingConfig, PricingResult } from '@/types'

type CalculatorMode = 'automation' | 'site' | 'combo'
type Phase = 'menu' | 'context' | 'configure' | 'result'

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const SITE_STEPS = ['Tipo', 'Páginas', 'Design', 'Funcionalidades', 'Conteúdo', 'Prazo', 'Plano', 'Resumo']

export default function CatalogPage() {
  const [config, setConfig] = useState<PricingConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('menu')
  const [mode, setMode] = useState<CalculatorMode | null>(null)
  const [cityCode, setCityCode] = useState('')
  const [customCity, setCustomCity] = useState('')
  const [customMultiplier, setCustomMultiplier] = useState(1)
  const [client, setClient] = useState({ name: '', company: '', whatsapp: '' })
  const [automationMode, setAutomationMode] = useState<'package' | 'package_custom' | 'custom'>('package')
  const [packageCode, setPackageCode] = useState('')
  const [serviceCodes, setServiceCodes] = useState<string[]>([])
  const [extraServiceCodes, setExtraServiceCodes] = useState<string[]>([])
  const [siteStep, setSiteStep] = useState(0)
  const [comboPart, setComboPart] = useState<'automation' | 'site'>('automation')
  const [site, setSite] = useState({ typeCode: '', totalPages: 1, designCode: '', featureCodes: [] as string[], contentCode: '', imageBank: false, deadlineCode: '', planCode: '' })
  const [result, setResult] = useState<PricingResult | null>(null)
  const [proposal, setProposal] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    api.get<PricingConfig>('/api/v1/pricing/config')
      .then((data) => {
        setConfig(data)
        setCityCode(data.cities[0]?.code ?? '')
        setPackageCode(data.automationPackages[0]?.code ?? '')
        setSite({
          typeCode: data.siteTypes[0]?.code ?? '',
          totalPages: data.siteTypes[0]?.pagesIncluded ?? 1,
          designCode: data.designs[0]?.code ?? '',
          featureCodes: [],
          contentCode: data.contents[0]?.code ?? '',
          imageBank: false,
          deadlineCode: data.deadlines[0]?.code ?? '',
          planCode: data.plans[0]?.code ?? '',
        })
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : 'Não foi possível abrir a calculadora.'))
      .finally(() => setLoading(false))
  }, [])

  const selectedCity = config?.cities.find((item) => item.code === cityCode)
  const isCustomCity = cityCode === 'custom'
  const cityName = isCustomCity ? customCity.trim() : selectedCity?.name ?? ''
  const multiplier = isCustomCity ? customMultiplier : selectedCity?.multiplier ?? 1
  const selectedPackage = config?.automationPackages.find((item) => item.code === packageCode)
  const selectedSiteType = config?.siteTypes.find((item) => item.code === site.typeCode)

  const currentEstimate = useMemo(() => {
    if (!config) return { setup: 0, monthly: 0 }
    let setup = 0
    let monthly = 0
    if (mode === 'automation' || mode === 'combo') {
      if (automationMode === 'custom') {
        const selected = config.automationServices.filter((item) => serviceCodes.includes(item.code ?? ''))
        setup += selected.reduce((total, item) => total + item.basePrice, 0) * multiplier
        const weight = selected.reduce((total, item) => total + (item.weight ?? 0), 0)
        monthly += (multiplier >= 1.4 ? (weight <= 3 ? 600 : 950) : (weight <= 3 ? 500 : 800)) * multiplier
      } else if (selectedPackage) {
        setup += (selectedPackage.setupPrice ?? 0) * multiplier
        monthly += (selectedPackage.monthlyPrice ?? 0) * multiplier
      }
    }
    if ((mode === 'site' || mode === 'combo') && selectedSiteType) {
      setup += selectedSiteType.basePrice * multiplier
    }
    return { setup: Math.round(setup / 10) * 10, monthly: Math.round(monthly / 10) * 10 }
  }, [automationMode, config, mode, multiplier, selectedPackage, selectedSiteType, serviceCodes])

  function toggle(list: string[], value: string, setter: (next: string[]) => void) {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value])
  }

  function chooseMode(nextMode: CalculatorMode) {
    setMode(nextMode)
    setPhase('context')
    setResult(null)
    setError(null)
  }

  function continueContext() {
    if (!cityName) {
      setError('Selecione ou informe a cidade do cliente.')
      return
    }
    setError(null)
    setPhase('configure')
    setSiteStep(0)
    setComboPart('automation')
  }

  function automationValid() {
    if (automationMode === 'custom' && serviceCodes.length === 0) {
      setError('Selecione ao menos um serviço de automação.')
      return false
    }
    if (automationMode !== 'custom' && !packageCode) {
      setError('Selecione um pacote de automação.')
      return false
    }
    return true
  }

  function siteStepValid() {
    const checks = [site.typeCode, site.totalPages > 0, site.designCode, true, site.contentCode, site.deadlineCode, site.planCode]
    if (!checks[siteStep]) {
      setError(`Preencha a etapa ${SITE_STEPS[siteStep].toLowerCase()} para continuar.`)
      return false
    }
    return true
  }

  async function calculate() {
    if (!mode || !config) return
    if ((mode === 'automation' || mode === 'combo') && !automationValid()) return
    setCalculating(true)
    setError(null)
    try {
      const payload = {
        mode,
        cityName,
        multiplier,
        ...(mode !== 'site' ? { automation: { mode: automationMode, packageCode, serviceCodes, extraServiceCodes } } : {}),
        ...(mode !== 'automation' ? { site } : {}),
      }
      setResult(await api.post<PricingResult>('/api/v1/pricing/calculate', payload))
      setPhase('result')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível calcular o orçamento.')
    } finally {
      setCalculating(false)
    }
  }

  async function nextConfiguration() {
    if (mode === 'automation') {
      if (automationValid()) await calculate()
      return
    }
    if (mode === 'combo' && comboPart === 'automation') {
      if (!automationValid()) return
      setComboPart('site')
      setSiteStep(0)
      setError(null)
      return
    }
    if (selectedSiteType?.code === 'linktree' && siteStep === 0) {
      await calculate()
      return
    }
    if (!siteStepValid()) return
    if (siteStep < 7) {
      setSiteStep((current) => current + 1)
      setError(null)
    } else await calculate()
  }

  function backConfiguration() {
    if ((mode === 'site' || comboPart === 'site') && siteStep > 0) {
      setSiteStep((current) => current - 1)
      return
    }
    if (mode === 'combo' && comboPart === 'site') {
      setComboPart('automation')
      return
    }
    setPhase('context')
  }

  async function generateProposal() {
    if (!result) return
    try {
      const response = await api.post<{ text: string }>('/api/v1/pricing/proposal', { result, customer: client })
      setProposal(response.text)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível gerar a proposta.')
    }
  }

  async function copyProposal() {
    if (!proposal) return
    await navigator.clipboard.writeText(proposal)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  function openWhatsapp() {
    if (!proposal) return
    const phone = client.whatsapp.replace(/\D/g, '')
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(proposal)}`, '_blank', 'noopener,noreferrer')
  }

  function reset() {
    setPhase('menu')
    setMode(null)
    setResult(null)
    setProposal(null)
    setSiteStep(0)
    setComboPart('automation')
    setShowDetails(false)
  }

  if (loading) return <div className="module-page pricing-loading"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div>
  if (!config) return <div className="module-page"><div className="module-error">{error ?? 'A calculadora não está disponível.'}</div></div>

  return (
    <div className="module-page pricing-page">
      <header className="pricing-header">
        <div><p className="eyebrow">Serviços e preços</p><h1>Calculadora de propostas</h1><p>Monte um orçamento de automação, site ou combo usando os 70 itens e regras do catálogo.</p></div>
        {phase !== 'menu' ? <button type="button" className="button button-quiet" onClick={reset}><RotateCcw size={16} aria-hidden="true" /> Reiniciar</button> : null}
      </header>

      {error ? <div className="module-error" role="alert">{error}<button type="button" onClick={() => setError(null)}>Fechar</button></div> : null}

      {phase === 'menu' ? (
        <section className="pricing-menu">
          <div className="pricing-menu-intro"><span className="pricing-orbit"><Sparkles size={24} aria-hidden="true" /></span><h2>O que vamos orçar?</h2><p>Escolha o tipo de entrega. A cidade ajusta os valores ao mercado regional.</p></div>
          <div className="pricing-mode-list">
            <button type="button" onClick={() => chooseMode('automation')}><span><Bot size={23} aria-hidden="true" /></span><span><small>Fluxos e integrações</small><strong>Automação</strong><p>Pacotes prontos, personalização ou montagem do zero.</p></span><ArrowRight size={19} aria-hidden="true" /></button>
            <button type="button" onClick={() => chooseMode('site')}><span><Globe2 size={23} aria-hidden="true" /></span><span><small>Presença digital</small><strong>Site</strong><p>Tipo, páginas, design, recursos, conteúdo e plano mensal.</p></span><ArrowRight size={19} aria-hidden="true" /></button>
            <button type="button" className="is-featured" onClick={() => chooseMode('combo')}><span><Layers3 size={23} aria-hidden="true" /></span><span><small>Oferta combinada</small><strong>Automação + Site</strong><p>Os dois projetos com 10% de desconto no desenvolvimento.</p></span><ArrowRight size={19} aria-hidden="true" /></button>
          </div>
        </section>
      ) : null}

      {phase === 'context' ? (
        <section className="pricing-context">
          <button type="button" className="pricing-back" onClick={() => setPhase('menu')}><ArrowLeft size={16} aria-hidden="true" /> Voltar</button>
          <div className="pricing-context-grid">
            <div className="pricing-context-copy"><span><MapPin size={22} aria-hidden="true" /></span><h2>Praça e cliente</h2><p>O multiplicador regional atualiza todo o orçamento. Os dados do cliente são usados somente na proposta e não são salvos no CRM.</p></div>
            <div className="pricing-context-form">
              <label className="form-field"><span>Cidade ou faixa de mercado</span><select value={cityCode} onChange={(event) => setCityCode(event.target.value)}>{config.cities.map((city) => <option value={city.code} key={city.code}>{city.name} · {city.multiplier.toLocaleString('pt-BR')}×</option>)}<option value="custom">Outra cidade</option></select></label>
              {isCustomCity ? <div className="form-grid-two"><label className="form-field"><span>Nome da cidade</span><input value={customCity} onChange={(event) => setCustomCity(event.target.value)} placeholder="Informe a cidade" /></label><label className="form-field"><span>Faixa regional</span><select value={customMultiplier} onChange={(event) => setCustomMultiplier(Number(event.target.value))}><option value={1}>Interior · 1,0×</option><option value={1.2}>Cidade média · 1,2×</option><option value={1.4}>Polo regional · 1,4×</option><option value={1.6}>Capital · 1,6×</option></select></label></div> : null}
              <div className="pricing-form-divider"><span>Dados para a proposta</span></div>
              <div className="form-grid-two"><label className="form-field"><span>Nome do contato</span><input value={client.name} onChange={(event) => setClient((current) => ({ ...current, name: event.target.value }))} placeholder="Nome do cliente" /></label><label className="form-field"><span>Empresa</span><input value={client.company} onChange={(event) => setClient((current) => ({ ...current, company: event.target.value }))} placeholder="Nome da empresa" /></label></div>
              <label className="form-field"><span>WhatsApp</span><input value={client.whatsapp} onChange={(event) => setClient((current) => ({ ...current, whatsapp: event.target.value }))} placeholder="55 11 99999-9999" /></label>
              <button type="button" className="button button-primary pricing-continue" onClick={continueContext}>Montar orçamento <ArrowRight size={16} aria-hidden="true" /></button>
            </div>
          </div>
        </section>
      ) : null}

      {phase === 'configure' ? (
        <section className="pricing-builder">
          <div className="pricing-builder-main">
            {mode === 'combo' ? <div className="combo-progress"><span className={comboPart === 'automation' ? 'is-active' : 'is-complete'}><i>1</i> Automação</span><b /><span className={comboPart === 'site' ? 'is-active' : ''}><i>2</i> Site</span></div> : null}
            {(mode === 'automation' || comboPart === 'automation') ? (
              <AutomationBuilder config={config} automationMode={automationMode} setAutomationMode={setAutomationMode} packageCode={packageCode} setPackageCode={setPackageCode} serviceCodes={serviceCodes} setServiceCodes={setServiceCodes} extraServiceCodes={extraServiceCodes} setExtraServiceCodes={setExtraServiceCodes} multiplier={multiplier} toggle={toggle} />
            ) : (
              <SiteBuilder config={config} step={siteStep} site={site} setSite={setSite} multiplier={multiplier} />
            )}
            <div className="pricing-builder-actions"><button type="button" className="button button-secondary" onClick={backConfiguration}><ArrowLeft size={16} aria-hidden="true" /> Voltar</button><button type="button" className="button button-primary" onClick={nextConfiguration} disabled={calculating}>{calculating ? <LoaderCircle className="spin" size={16} aria-hidden="true" /> : null}{calculating ? 'Calculando...' : (mode === 'automation' || siteStep === 7 || selectedSiteType?.code === 'linktree' ? 'Calcular proposta' : mode === 'combo' && comboPart === 'automation' ? 'Configurar site' : 'Continuar')} {!calculating ? <ArrowRight size={16} aria-hidden="true" /> : null}</button></div>
          </div>
          <aside className="pricing-preview"><p>Estimativa em andamento</p><h3>{cityName}</h3><span>Multiplicador {multiplier.toLocaleString('pt-BR')}×</span><div><small>Desenvolvimento a partir de</small><strong>{currency.format(currentEstimate.setup)}</strong></div><div><small>Mensalidade estimada</small><strong>{currency.format(currentEstimate.monthly)}</strong></div><p className="pricing-preview-note">O valor exato aparece ao concluir todas as etapas.</p></aside>
        </section>
      ) : null}

      {phase === 'result' && result ? (
        <ResultView result={result} showDetails={showDetails} setShowDetails={setShowDetails} onProposal={generateProposal} onReset={reset} />
      ) : null}

      {proposal ? (
        <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) setProposal(null) }}>
          <div className="proposal-modal" role="dialog" aria-modal="true" aria-labelledby="proposal-title"><header><div><p className="eyebrow">Texto pronto</p><h2 id="proposal-title">Proposta comercial</h2></div><button type="button" className="icon-button" onClick={() => setProposal(null)} aria-label="Fechar"><X size={18} /></button></header><textarea readOnly value={proposal} rows={18} /><footer><button type="button" className="button button-secondary" onClick={copyProposal}>{copied ? <Check size={16} /> : <Clipboard size={16} />}{copied ? 'Copiado' : 'Copiar texto'}</button><button type="button" className="button button-primary" onClick={openWhatsapp} disabled={!client.whatsapp}><MessageCircle size={16} /> Abrir WhatsApp</button></footer>{!client.whatsapp ? <p>Informe o WhatsApp na etapa do cliente para abrir a conversa.</p> : null}</div>
        </div>
      ) : null}
    </div>
  )
}

interface AutomationProps {
  config: PricingConfig
  automationMode: 'package' | 'package_custom' | 'custom'
  setAutomationMode: (mode: 'package' | 'package_custom' | 'custom') => void
  packageCode: string
  setPackageCode: (value: string) => void
  serviceCodes: string[]
  setServiceCodes: (value: string[]) => void
  extraServiceCodes: string[]
  setExtraServiceCodes: (value: string[]) => void
  multiplier: number
  toggle: (list: string[], value: string, setter: (next: string[]) => void) => void
}

function AutomationBuilder(props: AutomationProps) {
  const selectedPackage = props.config.automationPackages.find((item) => item.code === props.packageCode)
  const included = new Set(selectedPackage?.includedItemCodes ?? [])
  return <div className="pricing-flow"><div className="pricing-step-heading"><p>Automação</p><h2>Como deseja montar?</h2><span>Use um pacote, acrescente serviços ou comece do zero.</span></div><div className="automation-mode-tabs"><button type="button" className={props.automationMode === 'package' ? 'is-active' : ''} onClick={() => props.setAutomationMode('package')}>Pacotes</button><button type="button" className={props.automationMode === 'package_custom' ? 'is-active' : ''} onClick={() => props.setAutomationMode('package_custom')}>Personalizar pacote</button><button type="button" className={props.automationMode === 'custom' ? 'is-active' : ''} onClick={() => props.setAutomationMode('custom')}>Montar do zero</button></div>{props.automationMode !== 'custom' ? <><div className="package-options">{props.config.automationPackages.map((item) => <button type="button" className={`${props.packageCode === item.code ? 'is-selected' : ''}${item.featured ? ' is-featured' : ''}`} onClick={() => props.setPackageCode(item.code ?? '')} key={item.id}><span>{item.featured ? 'Mais escolhido' : 'Pacote'}</span><h3>{item.name}</h3><strong>{currency.format((item.setupPrice ?? 0) * props.multiplier)}</strong><small>+ {currency.format((item.monthlyPrice ?? 0) * props.multiplier)}/mês</small><ul>{item.includedItemCodes.map((code) => <li key={code}><Check size={13} /> {props.config.automationServices.find((service) => service.code === code)?.name ?? code}</li>)}</ul></button>)}</div>{props.automationMode === 'package_custom' ? <div className="pricing-checklist"><h3>Acrescente serviços</h3>{props.config.automationServices.filter((item) => !included.has(item.code ?? '')).map((item) => <label className={props.extraServiceCodes.includes(item.code ?? '') ? 'is-selected' : ''} key={item.id}><input type="checkbox" checked={props.extraServiceCodes.includes(item.code ?? '')} onChange={() => props.toggle(props.extraServiceCodes, item.code ?? '', props.setExtraServiceCodes)} /><span><strong>{item.name}</strong><small>+ {currency.format(item.basePrice * props.multiplier)}</small></span><Check size={15} /></label>)}</div> : null}</> : <div className="pricing-checklist service-checklist"><h3>Escolha os serviços</h3>{props.config.automationServices.map((item) => <label className={props.serviceCodes.includes(item.code ?? '') ? 'is-selected' : ''} key={item.id}><input type="checkbox" checked={props.serviceCodes.includes(item.code ?? '')} onChange={() => props.toggle(props.serviceCodes, item.code ?? '', props.setServiceCodes)} /><span><strong>{item.name}</strong><small>{currency.format(item.basePrice * props.multiplier)} · peso {item.weight ?? 0}</small></span><Check size={15} /></label>)}</div>}</div>
}

interface SiteProps { config: PricingConfig; step: number; site: { typeCode: string; totalPages: number; designCode: string; featureCodes: string[]; contentCode: string; imageBank: boolean; deadlineCode: string; planCode: string }; setSite: React.Dispatch<React.SetStateAction<SiteProps['site']>>; multiplier: number }

function SiteBuilder({ config, step, site, setSite, multiplier }: SiteProps) {
  const type = config.siteTypes.find((item) => item.code === site.typeCode)
  function select<K extends keyof SiteProps['site']>(key: K, value: SiteProps['site'][K]) { setSite((current) => ({ ...current, [key]: value })) }
  function cards(items: CatalogItem[], selected: string, selectValue: (value: string) => void, priceLabel?: (item: CatalogItem) => string) { return <div className="site-choice-grid">{items.map((item) => <button type="button" className={`${selected === item.code ? 'is-selected' : ''}${item.featured ? ' is-featured' : ''}`} onClick={() => selectValue(item.code ?? '')} key={item.id}><span>{selected === item.code ? <Check size={15} /> : null}</span><h3>{item.name}</h3><p>{item.description || 'Configuração padrão do projeto.'}</p>{priceLabel ? <strong>{priceLabel(item)}</strong> : null}</button>)}</div> }
  return <div className="pricing-flow site-flow"><div className="site-steps" aria-label="Etapas do site">{SITE_STEPS.map((label, index) => <span className={`${index === step ? 'is-active' : ''}${index < step ? 'is-complete' : ''}`} key={label}><i>{index < step ? <Check size={11} /> : index + 1}</i>{label}</span>)}</div><div className="pricing-step-heading"><p>Site · {SITE_STEPS[step]}</p><h2>{['Qual site será criado?', 'Quantas páginas?', 'Qual nível de design?', 'Quais funcionalidades?', 'Como será o conteúdo?', 'Qual o prazo?', 'Qual plano mensal?', 'Revise a configuração'][step]}</h2><span>{['A base define páginas incluídas e preço inicial.', 'Páginas extras são calculadas automaticamente.', 'O acabamento visual aplica um multiplicador ao projeto.', 'Marque apenas os recursos que fazem parte do escopo.', 'Defina quem será responsável pelos textos do site.', 'Prazos menores aplicam prioridade ao desenvolvimento.', 'A mensalidade varia conforme o porte final do projeto.', 'Confira todas as escolhas antes do cálculo final.'][step]}</span></div>{step === 0 ? cards(config.siteTypes, site.typeCode, (value) => { const selected = config.siteTypes.find((item) => item.code === value); setSite((current) => ({ ...current, typeCode: value, totalPages: selected?.pagesIncluded ?? 1 })) }, (item) => currency.format(item.basePrice * (item.code === 'linktree' ? 1 : multiplier))) : null}{step === 1 ? <div className="pages-selector"><button type="button" onClick={() => select('totalPages', Math.max(1, site.totalPages - 1))}>−</button><div><strong>{site.totalPages}</strong><span>páginas</span></div><button type="button" onClick={() => select('totalPages', site.totalPages + 1)}>+</button><p>{type?.pagesIncluded ?? 1} incluídas · {currency.format(type?.extraPagePrice ?? 0)} por página extra</p></div> : null}{step === 2 ? cards(config.designs, site.designCode, (value) => select('designCode', value), (item) => `${(item.multiplier ?? 1).toLocaleString('pt-BR')}×`) : null}{step === 3 ? <div className="pricing-checklist site-features">{config.siteFeatures.map((item) => <label className={site.featureCodes.includes(item.code ?? '') ? 'is-selected' : ''} key={item.id}><input type="checkbox" checked={site.featureCodes.includes(item.code ?? '')} onChange={() => select('featureCodes', site.featureCodes.includes(item.code ?? '') ? site.featureCodes.filter((code) => code !== item.code) : [...site.featureCodes, item.code ?? ''])} /><span><strong>{item.name}</strong><small>{currency.format(item.basePrice)}</small></span><Check size={15} /></label>)}</div> : null}{step === 4 ? <>{cards(config.contents, site.contentCode, (value) => select('contentCode', value), (item) => item.basePrice ? `${currency.format(item.basePrice)}${item.perPage ? '/pág.' : ''}` : 'Incluído')}<label className={`image-bank-option${site.imageBank ? ' is-selected' : ''}`}><input type="checkbox" checked={site.imageBank} onChange={(event) => select('imageBank', event.target.checked)} /><span><strong>Banco de imagens</strong><small>Curadoria de imagens para o projeto · {currency.format(200)}</small></span><Check size={15} /></label></> : null}{step === 5 ? cards(config.deadlines, site.deadlineCode, (value) => select('deadlineCode', value), (item) => `${(item.multiplier ?? 1).toLocaleString('pt-BR')}×`) : null}{step === 6 ? cards(config.plans, site.planCode, (value) => select('planCode', value), (item) => `Base ${currency.format(item.monthlyPrice ?? 0)}/mês`) : null}{step === 7 ? <div className="site-summary"><SummaryLine label="Tipo" value={type?.name ?? '—'} /><SummaryLine label="Páginas" value={`${site.totalPages}`} /><SummaryLine label="Design" value={config.designs.find((item) => item.code === site.designCode)?.name ?? '—'} /><SummaryLine label="Funcionalidades" value={`${site.featureCodes.length} selecionadas`} /><SummaryLine label="Conteúdo" value={config.contents.find((item) => item.code === site.contentCode)?.name ?? '—'} /><SummaryLine label="Prazo" value={config.deadlines.find((item) => item.code === site.deadlineCode)?.description ?? '—'} /><SummaryLine label="Plano" value={config.plans.find((item) => item.code === site.planCode)?.name ?? '—'} /></div> : null}</div>
}

function SummaryLine({ label, value }: { label: string; value: string }) { return <div><span>{label}</span><strong>{value}</strong></div> }

function ResultView({ result, showDetails, setShowDetails, onProposal, onReset }: { result: PricingResult; showDetails: boolean; setShowDetails: (value: boolean) => void; onProposal: () => void; onReset: () => void }) {
  const setup = result.mode === 'combo' ? result.combo!.totalSetup : result.mode === 'automation' ? result.automation!.setup : result.site!.setup
  const monthly = result.mode === 'combo' ? result.combo!.monthly : result.mode === 'automation' ? result.automation!.monthly : result.site!.monthly
  return <section className="pricing-result"><div className="result-hero"><span><Check size={24} aria-hidden="true" /></span><p>Orçamento calculado</p><h2>{result.mode === 'automation' ? result.automation?.packageName : result.mode === 'site' ? result.site?.typeName : 'Combo Automação + Site'}</h2><small>{result.cityName} · multiplicador {result.multiplier.toLocaleString('pt-BR')}×</small></div><div className="result-totals"><div><span>Desenvolvimento</span><strong>{currency.format(setup)}</strong>{result.mode === 'combo' ? <small>Desconto de {currency.format(result.combo!.discount)} aplicado</small> : null}</div><i /><div><span>Mensalidade</span><strong>{currency.format(monthly)}</strong><small>{monthly ? 'recorrência mensal' : 'sem mensalidade'}</small></div></div><button type="button" className="result-details-toggle" onClick={() => setShowDetails(!showDetails)}>Ver detalhamento <ChevronDown className={showDetails ? 'is-open' : ''} size={16} /></button>{showDetails ? <div className="result-details">{result.automation ? <div><h3>Automação</h3><SummaryLine label="Pacote" value={result.automation.packageName} /><SummaryLine label="Serviços" value={`${result.automation.services.length} itens`} /><SummaryLine label="Setup" value={currency.format(result.automation.setup)} /><SummaryLine label="Mensalidade" value={currency.format(result.automation.monthly)} /></div> : null}{result.site ? <div><h3>Site</h3><SummaryLine label="Tipo" value={result.site.typeName} /><SummaryLine label="Páginas" value={`${result.site.totalPages}`} /><SummaryLine label="Design" value={result.site.designName} /><SummaryLine label="Setup" value={currency.format(result.site.setup)} /><SummaryLine label="Mensalidade" value={currency.format(result.site.monthly)} /></div> : null}</div> : null}<div className="result-actions"><button type="button" className="button button-secondary" onClick={onReset}><RotateCcw size={16} /> Novo cálculo</button><button type="button" className="button button-primary" onClick={onProposal}><FileText size={16} /> Gerar proposta</button></div><p className="result-disclaimer">Este cálculo é uma simulação e não cria cliente, contrato ou cobrança no CRM.</p></section>
}
