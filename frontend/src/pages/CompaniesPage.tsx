import { ArrowRight, Building2, Mail, Phone, Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { Client, Company } from '@/types'

interface Props {
  companies: Company[]
  clients: Client[]
  loading: boolean
  onNewCompany: () => void
  onOpenCompany: (companyId: string) => void
}

export default function CompaniesPage({ companies, clients, loading, onNewCompany, onOpenCompany }: Props) {
  const [search, setSearch] = useState('')
  const visibleCompanies = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('pt-BR')
    if (!query) return companies
    return companies.filter((company) =>
      [company.name, company.cnpj, company.email, company.phone]
        .filter(Boolean)
        .some((value) => value!.toLocaleLowerCase('pt-BR').includes(query))
    )
  }, [companies, search])

  const clientCountByCompany = useMemo(() => {
    const counts = new Map<string, number>()
    for (const client of clients) {
      if (client.companyId) counts.set(client.companyId, (counts.get(client.companyId) ?? 0) + 1)
    }
    return counts
  }, [clients])

  return (
    <div className="module-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Relacionamento B2B</p>
          <h1>Empresas</h1>
          <p className="page-subtitle">Centralize dados das contas e acesse rapidamente os clientes vinculados.</p>
        </div>
        <button type="button" className="button button-primary" onClick={onNewCompany}>
          <Plus size={17} aria-hidden="true" /> Nova empresa
        </button>
      </header>

      <section className="list-panel">
        <div className="list-toolbar">
          <div>
            <strong>{companies.length} {companies.length === 1 ? 'empresa' : 'empresas'}</strong>
            <span> na sua base</span>
          </div>
          <label className="search-field">
            <Search size={16} aria-hidden="true" />
            <span className="sr-only">Buscar empresas</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar empresa..." />
          </label>
        </div>

        {loading ? (
          <div className="list-loading" aria-busy="true">
            {Array.from({ length: 4 }, (_, index) => <div className="skeleton skeleton-row" key={index} />)}
          </div>
        ) : visibleCompanies.length > 0 ? (
          <div className="company-table" role="table" aria-label="Empresas cadastradas">
            <div className="company-table-head" role="row">
              <span>Empresa</span><span>Contato</span><span>Clientes</span><span />
            </div>
            {visibleCompanies.map((company) => (
              <button type="button" className="company-table-row" role="row" key={company.id} onClick={() => onOpenCompany(company.id)}>
                <span className="company-identity">
                  <span className="company-avatar"><Building2 size={17} aria-hidden="true" /></span>
                  <span><strong>{company.name}</strong><small>{company.cnpj || 'CNPJ não informado'}</small></span>
                </span>
                <span className="company-contact">
                  {company.email ? <small><Mail size={13} aria-hidden="true" /> {company.email}</small> : null}
                  {company.phone ? <small><Phone size={13} aria-hidden="true" /> {company.phone}</small> : null}
                  {!company.email && !company.phone ? <small>Sem contato informado</small> : null}
                </span>
                <span className="company-client-count">{clientCountByCompany.get(company.id) ?? 0}</span>
                <ArrowRight className="row-arrow" size={16} aria-hidden="true" />
              </button>
            ))}
          </div>
        ) : (
          <div className="panel-empty large-empty">
            <span className="empty-icon"><Building2 size={24} strokeWidth={1.6} aria-hidden="true" /></span>
            <strong>{search ? 'Nenhuma empresa encontrada' : 'Cadastre sua primeira empresa'}</strong>
            <p>{search ? 'Tente buscar por outro nome, CNPJ ou contato.' : 'Empresas ajudam a agrupar clientes, contatos e futuras cobranças.'}</p>
            {!search ? <button type="button" className="button button-secondary" onClick={onNewCompany}>Adicionar empresa</button> : null}
          </div>
        )}
      </section>
    </div>
  )
}
