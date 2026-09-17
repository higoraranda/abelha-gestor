import { useMemo, useState } from 'react'
import { Check, X } from 'lucide-react'
import { api } from '@/lib/api'
import type { CatalogItem, CatalogItemType } from '@/types'

interface Props {
  item: CatalogItem | null
  catalog: CatalogItem[]
  onClose: () => void
  onSaved: (item: CatalogItem) => void
}

const ITEM_TYPES: Array<{ value: CatalogItemType; label: string }> = [
  { value: 'service', label: 'Serviço' },
  { value: 'package', label: 'Pacote' },
  { value: 'plan', label: 'Plano mensal' },
  { value: 'addon', label: 'Adicional' },
  { value: 'option', label: 'Regra / opção' },
]

const CATEGORIES = [
  ['automacao', 'Automação'],
  ['site', 'Sites'],
  ['site_extra', 'Extras de site'],
  ['design', 'Design'],
  ['conteudo', 'Conteúdo'],
  ['prazo', 'Prazo'],
  ['site_mensal', 'Planos mensais'],
  ['regiao', 'Região'],
  ['combo', 'Combos'],
  ['outros', 'Outros'],
] as const

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function valueOrEmpty(value: number | null | undefined) {
  return value === null || value === undefined ? '' : String(value)
}

export default function CatalogItemModal({ item, catalog, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    name: item?.name ?? '',
    code: item?.code ?? '',
    description: item?.description ?? '',
    itemType: item?.itemType ?? 'service' as CatalogItemType,
    category: item?.category ?? 'automacao',
    basePrice: valueOrEmpty(item?.basePrice),
    setupPrice: valueOrEmpty(item?.setupPrice),
    monthlyPrice: valueOrEmpty(item?.monthlyPrice),
    premiumMonthlyPrice: valueOrEmpty(item?.premiumMonthlyPrice),
    weight: valueOrEmpty(item?.weight),
    pagesIncluded: valueOrEmpty(item?.pagesIncluded),
    extraPagePrice: valueOrEmpty(item?.extraPagePrice),
    multiplier: valueOrEmpty(item?.multiplier),
    perPage: item?.perPage ?? false,
    featured: item?.featured ?? false,
    active: item?.active ?? true,
    includedItemCodes: item?.includedItemCodes ?? [],
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const composableItems = useMemo(
    () => catalog.filter((candidate) => candidate.code && candidate.id !== item?.id && ['service', 'addon'].includes(candidate.itemType)),
    [catalog, item?.id],
  )

  function set<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [field]: value }))
    setError(null)
  }

  function toggleIncluded(code: string) {
    set('includedItemCodes', form.includedItemCodes.includes(code)
      ? form.includedItemCodes.filter((current) => current !== code)
      : [...form.includedItemCodes, code])
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!form.name.trim()) {
      setError('Informe o nome do item.')
      return
    }

    const payload = {
      ...form,
      name: form.name.trim(),
      code: form.code.trim() || slugify(form.name),
      description: form.description.trim() || null,
      basePrice: form.basePrice || 0,
      setupPrice: form.setupPrice || null,
      monthlyPrice: form.monthlyPrice || null,
      premiumMonthlyPrice: form.premiumMonthlyPrice || null,
      weight: form.weight || null,
      pagesIncluded: form.pagesIncluded || null,
      extraPagePrice: form.extraPagePrice || null,
      multiplier: form.multiplier || null,
      attributes: item?.attributes ?? {},
    }

    setSaving(true)
    try {
      const saved = item
        ? await api.patch<CatalogItem>(`/api/v1/catalog/${item.id}`, payload)
        : await api.post<CatalogItem>('/api/v1/catalog', payload)
      onSaved(saved)
      onClose()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível salvar o item.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className="catalog-modal" role="dialog" aria-modal="true" aria-labelledby="catalog-modal-title">
        <div className="modal-heading">
          <div>
            <p className="eyebrow">Catálogo de preços</p>
            <h2 id="catalog-modal-title">{item ? 'Editar item' : 'Novo produto ou serviço'}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Fechar">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <form className="catalog-form" onSubmit={handleSubmit}>
          <section className="form-section">
            <div className="form-section-heading">
              <strong>Informações principais</strong>
              <span>Identificação e organização do catálogo.</span>
            </div>
            <div className="form-grid form-grid-two">
              <label className="form-field form-field-wide">
                <span>Nome *</span>
                <input autoFocus value={form.name} onChange={(event) => set('name', event.target.value)} placeholder="Ex.: Site institucional" />
              </label>
              <label className="form-field">
                <span>Tipo</span>
                <select value={form.itemType} onChange={(event) => set('itemType', event.target.value as CatalogItemType)}>
                  {ITEM_TYPES.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="form-field">
                <span>Categoria</span>
                <select value={form.category} onChange={(event) => set('category', event.target.value)}>
                  {CATEGORIES.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                </select>
              </label>
              <label className="form-field form-field-wide">
                <span>Descrição</span>
                <textarea rows={3} value={form.description} onChange={(event) => set('description', event.target.value)} placeholder="O que está incluído, condições e escopo..." />
              </label>
              <label className="form-field form-field-wide">
                <span>Código interno</span>
                <input value={form.code} onChange={(event) => set('code', slugify(event.target.value))} placeholder="Gerado automaticamente pelo nome" />
              </label>
            </div>
          </section>

          <section className="form-section">
            <div className="form-section-heading">
              <strong>Formação do preço</strong>
              <span>Os campos vazios não entram no cálculo.</span>
            </div>
            <div className="form-grid form-grid-three">
              <label className="form-field"><span>Preço base (R$)</span><input type="number" min="0" step="0.01" value={form.basePrice} onChange={(event) => set('basePrice', event.target.value)} /></label>
              <label className="form-field"><span>Setup (R$)</span><input type="number" min="0" step="0.01" value={form.setupPrice} onChange={(event) => set('setupPrice', event.target.value)} placeholder="Opcional" /></label>
              <label className="form-field"><span>Mensalidade (R$)</span><input type="number" min="0" step="0.01" value={form.monthlyPrice} onChange={(event) => set('monthlyPrice', event.target.value)} placeholder="Opcional" /></label>
              <label className="form-field"><span>Mensalidade praça alta</span><input type="number" min="0" step="0.01" value={form.premiumMonthlyPrice} onChange={(event) => set('premiumMonthlyPrice', event.target.value)} placeholder="Opcional" /></label>
              <label className="form-field"><span>Peso de complexidade</span><input type="number" min="0" step="1" value={form.weight} onChange={(event) => set('weight', event.target.value)} placeholder="Ex.: 1 ou 2" /></label>
              <label className="form-field"><span>Multiplicador</span><input type="number" min="0.01" step="0.01" value={form.multiplier} onChange={(event) => set('multiplier', event.target.value)} placeholder="Ex.: 1,20" /></label>
              <label className="form-field"><span>Páginas inclusas</span><input type="number" min="0" step="1" value={form.pagesIncluded} onChange={(event) => set('pagesIncluded', event.target.value)} placeholder="Opcional" /></label>
              <label className="form-field"><span>Preço por página extra</span><input type="number" min="0" step="0.01" value={form.extraPagePrice} onChange={(event) => set('extraPagePrice', event.target.value)} placeholder="Opcional" /></label>
            </div>
            <div className="form-check-row">
              <label><input type="checkbox" checked={form.perPage} onChange={(event) => set('perPage', event.target.checked)} /> Cobrar por página/unidade</label>
              <label><input type="checkbox" checked={form.featured} onChange={(event) => set('featured', event.target.checked)} /> Destacar no catálogo</label>
              <label><input type="checkbox" checked={form.active} onChange={(event) => set('active', event.target.checked)} /> Item ativo</label>
            </div>
          </section>

          {form.itemType === 'package' ? (
            <section className="form-section">
              <div className="form-section-heading">
                <strong>Composição do pacote</strong>
                <span>Marque os serviços e adicionais incluídos.</span>
              </div>
              <div className="package-options">
                {composableItems.map((candidate) => {
                  const code = candidate.code!
                  const checked = form.includedItemCodes.includes(code)
                  return (
                    <button type="button" key={candidate.id} className={checked ? 'is-selected' : ''} onClick={() => toggleIncluded(code)}>
                      <span className="package-check">{checked ? <Check size={13} aria-hidden="true" /> : null}</span>
                      <span><strong>{candidate.name}</strong><small>{candidate.category.replace('_', ' ')}</small></span>
                    </button>
                  )
                })}
              </div>
            </section>
          ) : null}

          {error ? <p className="form-error" role="alert">{error}</p> : null}

          <div className="modal-actions">
            <button type="button" className="button button-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="button button-primary" disabled={saving}>{saving ? 'Salvando...' : 'Salvar item'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
