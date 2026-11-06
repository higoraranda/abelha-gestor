import { useEffect, useMemo, useState } from 'react'
import { emptyContract } from '@/lib/contractDefaults'
import { ArrowLeft, ArrowRight, Check, FileText, LoaderCircle } from 'lucide-react'
import { api } from '@/lib/api'
import type { CatalogItem, NewContractInput, PaymentMethod } from '@/types'

interface Props {
  initial?: NewContractInput
  onBack: () => void
  onSubmit: (contract: NewContractInput) => Promise<void>
  submitLabel: string
  lockedStructure?: boolean
  onBusyChange?: (busy: boolean) => void
}

interface PreviewItem {
  label: string
  amount: number
  dueDate: string
}

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const dateFormat = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' })

function clampDueDate(year: number, month: number, dueDay: number) {
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  return new Date(Date.UTC(year, month, Math.min(dueDay, lastDay)))
}

function schedulePreview(contract: NewContractInput) {
  const items: PreviewItem[] = []
  const grossCents = Math.round(contract.grossAmount * 100)
  const start = contract.developmentStartDate
  const finish = contract.developmentEndDate
  const developmentEnd = new Date(`${finish}T00:00:00Z`)
  const contractEnd = new Date(`${contract.contractEndDate}T00:00:00Z`)
  let firstMonthly: Date | null = null
  if (contract.monthlyDueDay) {
    firstMonthly = clampDueDate(developmentEnd.getUTCFullYear(), developmentEnd.getUTCMonth(), contract.monthlyDueDay)
    if (firstMonthly <= developmentEnd) {
      firstMonthly = clampDueDate(developmentEnd.getUTCFullYear(), developmentEnd.getUTCMonth() + 1, contract.monthlyDueDay)
    }
  }

  if (contract.paymentMethod === 'cash') {
    items.push({ label: 'Serviço à vista com 5% de desconto', amount: Math.round(grossCents * 0.95) / 100, dueDate: start })
  } else if (contract.paymentMethod === 'two_installments') {
    const first = Math.floor(grossCents / 2)
    items.push(
      { label: 'Serviço — parcela 1/2', amount: first / 100, dueDate: start },
      { label: 'Serviço — parcela 2/2', amount: (grossCents - first) / 100, dueDate: finish },
    )
  } else if (firstMonthly) {
    const third = Math.floor(grossCents / 3)
    items.push(
      { label: 'Serviço — parcela 1/3', amount: third / 100, dueDate: start },
      { label: 'Serviço — parcela 2/3', amount: third / 100, dueDate: finish },
      { label: 'Serviço — parcela 3/3', amount: (grossCents - third * 2) / 100, dueDate: firstMonthly.toISOString().slice(0, 10) },
    )
  }

  if (contract.monthlyFee > 0 && firstMonthly && contract.monthlyDueDay) {
    let cursor = firstMonthly
    let index = 1
    while (cursor <= contractEnd && index <= 120) {
      items.push({ label: `Mensalidade ${index}`, amount: contract.monthlyFee, dueDate: cursor.toISOString().slice(0, 10) })
      index += 1
      cursor = clampDueDate(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, contract.monthlyDueDay)
    }
  }
  return items
}

export default function ContractWizard({ initial, onBack, onSubmit, submitLabel, lockedStructure = false, onBusyChange }: Props) {
  const [step, setStep] = useState(2)
  const [form, setForm] = useState<NewContractInput>(() => initial ?? emptyContract())
  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  const [customService, setCustomService] = useState(!initial?.catalogItemId)
  const [loadingCatalog, setLoadingCatalog] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.get<CatalogItem[]>('/api/v1/catalog?active=true')
      .then((items) => setCatalog(items.filter((item) => ['service', 'package', 'addon'].includes(item.itemType))))
      .catch(() => setError('Não foi possível carregar o catálogo. Você ainda pode usar um serviço personalizado.'))
      .finally(() => setLoadingCatalog(false))
  }, [])

  const preview = useMemo(() => schedulePreview(form), [form])
  const serviceTotal = form.paymentMethod === 'cash' ? Math.round(form.grossAmount * 95) / 100 : form.grossAmount
  const grandTotal = preview.reduce((total, item) => total + item.amount, 0)

  function set<K extends keyof NewContractInput>(field: K, value: NewContractInput[K]) {
    setForm((current) => ({ ...current, [field]: value }))
    setError(null)
  }

  function selectCatalog(id: string) {
    const item = catalog.find((candidate) => candidate.id === id)
    setForm((current) => ({
      ...current,
      catalogItemId: item?.id ?? null,
      serviceName: item?.name ?? '',
      serviceDescription: item?.description ?? '',
      grossAmount: item ? Number(item.setupPrice ?? item.basePrice ?? 0) : 0,
      monthlyFee: item ? Number(item.monthlyPrice ?? 0) : current.monthlyFee,
    }))
  }

  function next() {
    if (step === 2 && (!form.serviceName.trim() || form.grossAmount <= 0)) {
      setError('Informe o serviço e um valor maior que zero.')
      return
    }
    if (step === 3) {
      if (!form.developmentStartDate || !form.developmentEndDate || !form.contractEndDate) {
        setError('Preencha todas as datas do contrato.')
        return
      }
      if (form.developmentEndDate < form.developmentStartDate || form.contractEndDate < form.developmentEndDate) {
        setError('As datas precisam seguir a ordem: início, entrega e fim do contrato.')
        return
      }
      if ((form.monthlyFee > 0 || form.paymentMethod === 'three_installments') && (!form.monthlyDueDay || form.monthlyDueDay < 1 || form.monthlyDueDay > 31)) {
        setError('Informe um dia de pagamento entre 1 e 31.')
        return
      }
      if (form.paymentMethod === 'three_installments' && form.monthlyFee <= 0) {
        setError('A opção em 3x exige uma mensalidade maior que zero.')
        return
      }
    }
    setStep((current) => Math.min(4, current + 1))
  }

  async function save() {
    if (saving) return
    setSaving(true)
    onBusyChange?.(true)
    setError(null)
    try {
      await onSubmit({ ...form, serviceDescription: form.serviceDescription || null, notes: form.notes || null })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível salvar o contrato.')
    } finally {
      setSaving(false)
      onBusyChange?.(false)
    }
  }

  return (
    <>
      <div className="wizard-progress" aria-label={`Etapa ${step} de 4`}>
        {[1, 2, 3, 4].map((item) => <span className={item <= step ? 'is-active' : ''} key={item} />)}
      </div>

      {step === 2 ? (
        <section className="contract-step">
          <div className="wizard-copy"><p>Etapa 2 de 4</p><h3>Serviço contratado</h3><span>Escolha um item do catálogo ou descreva um serviço personalizado.</span></div>
          <div className="service-source-toggle">
            <button type="button" className={!customService ? 'is-active' : ''} onClick={() => setCustomService(false)} disabled={lockedStructure}>Catálogo</button>
            <button type="button" className={customService ? 'is-active' : ''} onClick={() => { setCustomService(true); set('catalogItemId', null) }} disabled={lockedStructure}>Personalizado</button>
          </div>
          {!customService ? (
            <label className="form-field"><span>Serviço</span>
              <select value={form.catalogItemId ?? ''} onChange={(event) => selectCatalog(event.target.value)} disabled={loadingCatalog || lockedStructure}>
                <option value="">{loadingCatalog ? 'Carregando catálogo...' : 'Selecione um serviço'}</option>
                {catalog.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
              </select>
            </label>
          ) : (
            <label className="form-field"><span>Nome do serviço</span><input value={form.serviceName} onChange={(event) => set('serviceName', event.target.value)} placeholder="Ex.: Site institucional" disabled={lockedStructure} /></label>
          )}
          <label className="form-field"><span>Descrição</span><textarea rows={3} value={form.serviceDescription ?? ''} onChange={(event) => set('serviceDescription', event.target.value)} placeholder="Escopo e entregáveis principais" /></label>
          <label className="form-field"><span>Valor do serviço</span><input type="number" min="0.01" step="0.01" value={form.grossAmount || ''} onChange={(event) => set('grossAmount', Number(event.target.value))} disabled={lockedStructure} /></label>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="contract-step">
          <div className="wizard-copy"><p>Etapa 3 de 4</p><h3>Pagamento e vigência</h3><span>Defina como o desenvolvimento e as mensalidades serão cobrados.</span></div>
          <fieldset className="payment-options" disabled={lockedStructure}>
            {([
              ['cash', 'À vista', '5% de desconto no serviço'],
              ['two_installments', 'Em 2x', '50% no início e 50% na entrega'],
              ['three_installments', 'Em 3x', 'Início, entrega e primeira mensalidade'],
            ] as Array<[PaymentMethod, string, string]>).map(([value, title, description]) => (
              <label className={form.paymentMethod === value ? 'is-selected' : ''} key={value}>
                <input type="radio" name="paymentMethod" value={value} checked={form.paymentMethod === value} onChange={() => set('paymentMethod', value)} />
                <span><strong>{title}</strong><small>{description}</small></span>
                {form.paymentMethod === value ? <Check size={16} aria-hidden="true" /> : null}
              </label>
            ))}
          </fieldset>
          <div className="form-grid-two">
            <label className="form-field"><span>Mensalidade</span><input type="number" min="0" step="0.01" value={form.monthlyFee || ''} onChange={(event) => set('monthlyFee', Number(event.target.value))} disabled={lockedStructure} /></label>
            <label className="form-field"><span>Dia de pagamento</span><input type="number" min="1" max="31" value={form.monthlyDueDay ?? ''} onChange={(event) => set('monthlyDueDay', event.target.value ? Number(event.target.value) : null)} disabled={lockedStructure} /></label>
          </div>
          <div className="form-grid-three contract-dates">
            <label className="form-field"><span>Início</span><input type="date" value={form.developmentStartDate} onChange={(event) => set('developmentStartDate', event.target.value)} disabled={lockedStructure} /></label>
            <label className="form-field"><span>Fim do desenvolvimento</span><input type="date" value={form.developmentEndDate} onChange={(event) => set('developmentEndDate', event.target.value)} disabled={lockedStructure} /></label>
            <label className="form-field"><span>Fim do contrato</span><input type="date" value={form.contractEndDate} onChange={(event) => set('contractEndDate', event.target.value)} disabled={lockedStructure} /></label>
          </div>
          <label className="form-field"><span>Observações do contrato</span><textarea rows={2} value={form.notes ?? ''} onChange={(event) => set('notes', event.target.value)} /></label>
        </section>
      ) : null}

      {step === 4 ? (
        <section className="contract-step">
          <div className="wizard-copy"><p>Etapa 4 de 4</p><h3>Prévia das cobranças</h3><span>Confira valores e vencimentos antes de salvar.</span></div>
          <div className="contract-preview-summary">
            <div><span>Serviço</span><strong>{form.serviceName}</strong></div>
            <div><span>Valor após desconto</span><strong>{currency.format(serviceTotal)}</strong></div>
            <div><span>Total projetado</span><strong>{currency.format(grandTotal)}</strong></div>
          </div>
          <div className="receivable-preview">
            {preview.map((item, index) => (
              <div key={`${item.label}-${item.dueDate}-${index}`}>
                <span className="preview-icon"><FileText size={15} aria-hidden="true" /></span>
                <span><strong>{item.label}</strong><small>Vence em {dateFormat.format(new Date(`${item.dueDate}T00:00:00Z`))}</small></span>
                <b>{currency.format(item.amount)}</b>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <footer className="wizard-actions">
        <button type="button" className="button button-secondary" onClick={step === 2 ? onBack : () => setStep((current) => current - 1)}><ArrowLeft size={16} aria-hidden="true" /> Voltar</button>
        {step < 4 ? (
          <button type="button" className="button button-primary" onClick={next}>Continuar <ArrowRight size={16} aria-hidden="true" /></button>
        ) : (
          <button type="button" className="button button-primary" onClick={save} disabled={saving}>{saving ? <LoaderCircle className="spin" size={16} aria-hidden="true" /> : <Check size={16} aria-hidden="true" />}{saving ? 'Salvando...' : submitLabel}</button>
        )}
      </footer>
    </>
  )
}
