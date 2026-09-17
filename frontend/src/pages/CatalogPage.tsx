import { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Calculator,
  CircleDollarSign,
  MoreHorizontal,
  PackageCheck,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { api } from '@/lib/api'
import type { CatalogItem } from '@/types'
import CatalogItemModal from '@/components/catalog/CatalogItemModal'

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

const CATEGORY_LABELS: Record<string, string> = {
  automacao: 'Automação',
  site: 'Sites',
  site_extra: 'Extras de site',
  design: 'Design',
  conteudo: 'Conteúdo',
  prazo: 'Prazo',
  site_mensal: 'Planos mensais',
  regiao: 'Região',
  combo: 'Combos',
  outros: 'Outros',
}

const TYPE_LABELS: Record<string, string> = {
  service: 'Serviço',
  package: 'Pacote',
  plan: 'Plano',
  addon: 'Adicional',
  option: 'Regra de preço',
}

function primaryPrice(item: CatalogItem) {
  if (item.setupPrice !== null) return { value: item.setupPrice, suffix: ' setup' }
  if (item.monthlyPrice !== null) return { value: item.monthlyPrice, suffix: '/mês' }
  if (item.basePrice > 0) return { value: item.basePrice, suffix: item.perPage ? '/un.' : '' }
  return null
}

function ItemDetails({ item }: { item: CatalogItem }) {
  const details: string[] = []
  if (item.monthlyPrice !== null && item.setupPrice !== null) details.push(`${currency.format(item.monthlyPrice)}/mês`)
  if (item.premiumMonthlyPrice !== null && item.premiumMonthlyPrice !== item.monthlyPrice) details.push(`${currency.format(item.premiumMonthlyPrice)} em praça alta`)
  if (item.weight !== null) details.push(`peso ${item.weight}`)
  if (item.pagesIncluded !== null) details.push(`${item.pagesIncluded} pág. inclusas`)
  if (item.extraPagePrice !== null) details.push(`${currency.format(item.extraPagePrice)} por pág. extra`)
  if (item.multiplier !== null) details.push(`multiplicador ${item.multiplier.toLocaleString('pt-BR')}×`)
  if (item.includedItemCodes.length > 0) details.push(`${item.includedItemCodes.length} itens incluídos`)

  return details.length > 0 ? <p className="catalog-item-details">{details.join(' • ')}</p> : null
}

export default function CatalogPage() {
  const [items, setItems] = useState<CatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [editing, setEditing] = useState<CatalogItem | null | undefined>(undefined)

  useEffect(() => {
    api.get<CatalogItem[]>('/api/v1/catalog')
      .then(setItems)
      .catch((caught) => setError(caught instanceof Error ? caught.message : 'Não foi possível carregar o catálogo.'))
      .finally(() => setLoading(false))
  }, [])

  const categories = useMemo(
    () => [...new Set(items.map((item) => item.category))].sort((a, b) => (CATEGORY_LABELS[a] ?? a).localeCompare(CATEGORY_LABELS[b] ?? b)),
    [items],
  )

  const visibleItems = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR')
    return items.filter((item) => {
      if (category !== 'all' && item.category !== category) return false
      if (!term) return true
      return [item.name, item.description, item.code, CATEGORY_LABELS[item.category]]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase('pt-BR').includes(term))
    })
  }, [category, items, search])

  const activeItems = items.filter((item) => item.active)
  const recurringItems = activeItems.filter((item) => (item.monthlyPrice ?? 0) > 0)
  const baseAverage = activeItems.filter((item) => item.basePrice > 0)
  const average = baseAverage.length > 0
    ? baseAverage.reduce((total, item) => total + item.basePrice, 0) / baseAverage.length
    : 0

  function handleSaved(saved: CatalogItem) {
    setItems((current) => current.some((item) => item.id === saved.id)
      ? current.map((item) => item.id === saved.id ? saved : item)
      : [saved, ...current])
  }

  async function handleDelete(item: CatalogItem) {
    if (!window.confirm(`Excluir "${item.name}" do catálogo?`)) return
    try {
      await api.delete<void>(`/api/v1/catalog/${item.id}`)
      setItems((current) => current.filter((candidate) => candidate.id !== item.id))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível excluir o item.')
    }
  }

  async function toggleActive(item: CatalogItem) {
    try {
      const saved = await api.patch<CatalogItem>(`/api/v1/catalog/${item.id}`, { active: !item.active })
      handleSaved(saved)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível atualizar o item.')
    }
  }

  return (
    <div className="module-page catalog-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Produtos e serviços</p>
          <h1>Catálogo de preços</h1>
          <p className="page-subtitle">Centralize seus valores, regras de precificação e pacotes no mesmo lugar.</p>
        </div>
        <button type="button" className="button button-primary" onClick={() => setEditing(null)}>
          <Plus size={17} aria-hidden="true" /> Novo item
        </button>
      </header>

      <section className="catalog-metrics" aria-label="Resumo do catálogo">
        <article><span><Box size={18} aria-hidden="true" /></span><div><small>Itens ativos</small><strong>{activeItems.length}</strong></div></article>
        <article><span><PackageCheck size={18} aria-hidden="true" /></span><div><small>Pacotes</small><strong>{activeItems.filter((item) => item.itemType === 'package').length}</strong></div></article>
        <article><span><CircleDollarSign size={18} aria-hidden="true" /></span><div><small>Receita recorrente</small><strong>{recurringItems.length} opções</strong></div></article>
        <article><span><Calculator size={18} aria-hidden="true" /></span><div><small>Ticket-base médio</small><strong>{currency.format(average)}</strong></div></article>
      </section>

      <section className="catalog-toolbar">
        <label className="catalog-search">
          <Search size={16} aria-hidden="true" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome, código ou categoria" />
        </label>
        <div className="catalog-filters" role="group" aria-label="Filtrar por categoria">
          <button type="button" className={category === 'all' ? 'is-active' : ''} onClick={() => setCategory('all')}>Todos</button>
          {categories.map((current) => (
            <button type="button" className={category === current ? 'is-active' : ''} onClick={() => setCategory(current)} key={current}>
              {CATEGORY_LABELS[current] ?? current}
            </button>
          ))}
        </div>
      </section>

      {error ? <div className="module-error" role="alert">{error}<button type="button" onClick={() => setError(null)}>Fechar</button></div> : null}

      {loading ? (
        <div className="catalog-grid" aria-label="Carregando catálogo">
          {Array.from({ length: 6 }, (_, index) => <div className="skeleton catalog-skeleton" key={index} />)}
        </div>
      ) : visibleItems.length > 0 ? (
        <div className="catalog-grid">
          {visibleItems.map((item) => {
            const price = primaryPrice(item)
            return (
              <article className={`catalog-card${item.featured ? ' is-featured' : ''}${item.active ? '' : ' is-inactive'}`} key={item.id}>
                <div className="catalog-card-top">
                  <div className="catalog-tags">
                    <span>{CATEGORY_LABELS[item.category] ?? item.category}</span>
                    <span>{TYPE_LABELS[item.itemType] ?? item.itemType}</span>
                  </div>
                  <div className="catalog-actions">
                    <button type="button" className="icon-button" onClick={() => setEditing(item)} aria-label={`Editar ${item.name}`}><Pencil size={15} aria-hidden="true" /></button>
                    <button type="button" className="icon-button danger-icon" onClick={() => handleDelete(item)} aria-label={`Excluir ${item.name}`}><Trash2 size={15} aria-hidden="true" /></button>
                  </div>
                </div>
                <div className="catalog-card-copy">
                  <div className="catalog-title-line">
                    <h2>{item.name}</h2>
                    {item.featured ? <Sparkles size={15} aria-label="Destaque" /> : null}
                  </div>
                  <p>{item.description ?? 'Sem descrição cadastrada.'}</p>
                </div>
                <ItemDetails item={item} />
                <div className="catalog-card-footer">
                  <div className="catalog-price">
                    {price ? <><strong>{currency.format(price.value)}</strong><small>{price.suffix}</small></> : <strong className="catalog-rule-price">Regra de preço</strong>}
                  </div>
                  <button type="button" className={`status-toggle${item.active ? ' is-active' : ''}`} onClick={() => toggleActive(item)}>
                    <span /> {item.active ? 'Ativo' : 'Inativo'}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="panel-empty catalog-empty">
          <span className="empty-icon"><MoreHorizontal size={21} aria-hidden="true" /></span>
          <strong>Nenhum item encontrado</strong>
          <p>Ajuste os filtros ou cadastre um novo serviço.</p>
          <button type="button" className="button button-secondary" onClick={() => setEditing(null)}>Criar item</button>
        </div>
      )}

      {editing !== undefined ? (
        <CatalogItemModal item={editing} catalog={items} onClose={() => setEditing(undefined)} onSaved={handleSaved} />
      ) : null}
    </div>
  )
}
