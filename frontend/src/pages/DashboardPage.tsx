import {
  ArrowRight,
  Bell,
  BriefcaseBusiness,
  CalendarCheck,
  CircleAlert,
  ContactRound,
  Plus,
  TrendingUp,
  UserPlus,
  WalletCards,
} from 'lucide-react'
import type { Client, Reminder } from '@/types'

interface Props {
  clients: Client[]
  reminders: Reminder[]
  loading: boolean
  syncError: string | null
  onNewClient: () => void
  onOpenClients: () => void
  onOpenFinance: () => void
  onOpenPipeline: () => void
  onOpenReminders: () => void
}

interface MetricCardProps {
  label: string
  value: string
  detail: string
  icon: typeof ContactRound
  tone?: 'default' | 'accent'
}

function MetricCard({ label, value, detail, icon: Icon, tone = 'default' }: MetricCardProps) {
  return (
    <article className={`metric-card${tone === 'accent' ? ' metric-card-accent' : ''}`}>
      <div className="metric-card-head">
        <span>{label}</span>
        <span className="metric-icon"><Icon size={17} strokeWidth={1.8} aria-hidden="true" /></span>
      </div>
      <strong className="metric-value">{value}</strong>
      <p className="metric-detail">{detail}</p>
    </article>
  )
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(value))
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

function buildMonthlyClients(clients: Client[]) {
  const formatter = new Intl.DateTimeFormat('pt-BR', { month: 'short' })
  const now = new Date()

  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1)
    const count = clients.filter((client) => {
      const createdAt = new Date(client.createdAt)
      return createdAt.getMonth() === date.getMonth() && createdAt.getFullYear() === date.getFullYear()
    }).length

    return { label: formatter.format(date).replace('.', ''), count }
  })
}

export default function DashboardPage({
  clients,
  reminders,
  loading,
  syncError,
  onNewClient,
  onOpenClients,
  onOpenFinance,
  onOpenPipeline,
  onOpenReminders,
}: Props) {
  const pendingReminders = reminders.filter((reminder) => !reminder.completed)
  const overdueReminders = pendingReminders.filter((reminder) => new Date(reminder.dueAt) < new Date())
  const recentClients = clients.slice(0, 4)
  const monthlyClients = buildMonthlyClients(clients)
  const newThisMonth = monthlyClients.at(-1)?.count ?? 0
  const maxMonthlyClients = Math.max(...monthlyClients.map((month) => month.count), 1)
  const hasActivity = monthlyClients.some((month) => month.count > 0)

  if (loading) {
    return (
      <div className="dashboard-page" aria-busy="true" aria-label="Carregando visão geral">
        <div className="skeleton skeleton-title" />
        <div className="skeleton-grid">
          {Array.from({ length: 4 }, (_, index) => <div className="skeleton skeleton-card" key={index} />)}
        </div>
        <div className="skeleton skeleton-panel" />
      </div>
    )
  }

  return (
    <div className="dashboard-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Visão geral</p>
          <h1>{getGreeting()}, Higor.</h1>
          <p className="page-subtitle">Acompanhe clientes, compromissos e a saúde do negócio em um só lugar.</p>
        </div>
        <button type="button" className="button button-primary" onClick={onNewClient}>
          <Plus size={17} strokeWidth={2} aria-hidden="true" />
          Novo cliente
        </button>
      </header>

      {syncError ? (
        <div className="sync-alert" role="status">
          <CircleAlert size={18} aria-hidden="true" />
          <div>
            <strong>Os dados ainda não foram sincronizados.</strong>
            <p>{syncError} A interface continua disponível para você explorar.</p>
          </div>
        </div>
      ) : null}

      <section className="metrics-grid" aria-label="Indicadores principais">
        <MetricCard
          label="Clientes"
          value={clients.length.toLocaleString('pt-BR')}
          detail={clients.length === 1 ? 'cliente cadastrado' : 'clientes cadastrados'}
          icon={ContactRound}
          tone="accent"
        />
        <MetricCard
          label="Novos no mês"
          value={newThisMonth.toLocaleString('pt-BR')}
          detail={newThisMonth === 1 ? 'novo cliente' : 'novos clientes'}
          icon={UserPlus}
        />
        <MetricCard
          label="Pendências"
          value={pendingReminders.length.toLocaleString('pt-BR')}
          detail={overdueReminders.length > 0 ? `${overdueReminders.length} em atraso` : 'nenhum item atrasado'}
          icon={CalendarCheck}
        />
        <MetricCard
          label="Receita do mês"
          value="R$ 0"
          detail="aguardando lançamentos"
          icon={WalletCards}
        />
      </section>

      <section className="dashboard-grid dashboard-grid-main">
        <article className="dashboard-panel growth-panel">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">Aquisição</p>
              <h2>Novos clientes</h2>
            </div>
            <button type="button" className="text-button" onClick={onOpenClients}>
              Ver clientes <ArrowRight size={14} aria-hidden="true" />
            </button>
          </div>

          <div className="chart-summary">
            <strong>{clients.length}</strong>
            <span><TrendingUp size={14} aria-hidden="true" /> total na base</span>
          </div>

          <div className={`bar-chart${hasActivity ? '' : ' is-empty'}`} aria-label="Clientes cadastrados nos últimos seis meses">
            {monthlyClients.map((month) => (
              <div className="bar-column" key={month.label}>
                <span className="bar-value">{month.count > 0 ? month.count : ''}</span>
                <div
                  className="bar-fill"
                  style={{ height: `${hasActivity ? Math.max(8, (month.count / maxMonthlyClients) * 100) : 4}%` }}
                />
                <small>{month.label}</small>
              </div>
            ))}
          </div>
        </article>

        <article className="dashboard-panel reminder-panel">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">Agenda</p>
              <h2>Próximos lembretes</h2>
            </div>
            <button type="button" className="icon-button" onClick={onOpenReminders} aria-label="Abrir todos os lembretes" title="Ver todos">
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>

          {pendingReminders.length > 0 ? (
            <div className="reminder-list">
              {pendingReminders.slice(0, 4).map((reminder) => {
                const overdue = new Date(reminder.dueAt) < new Date()
                return (
                  <button type="button" className="reminder-row" key={reminder.id} onClick={onOpenReminders}>
                    <span className={`reminder-dot${overdue ? ' is-overdue' : ''}`} />
                    <span className="reminder-copy">
                      <strong>{reminder.title}</strong>
                      <small>{formatShortDate(reminder.dueAt)}</small>
                    </span>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="panel-empty compact-empty">
              <span className="empty-icon"><Bell size={20} strokeWidth={1.6} aria-hidden="true" /></span>
              <strong>Agenda livre</strong>
              <p>Seus próximos lembretes aparecerão aqui.</p>
            </div>
          )}
        </article>
      </section>

      <section className="dashboard-grid dashboard-grid-secondary">
        <article className="dashboard-panel">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">Relacionamento</p>
              <h2>Clientes recentes</h2>
            </div>
            <button type="button" className="text-button" onClick={onOpenClients}>
              Ver todos <ArrowRight size={14} aria-hidden="true" />
            </button>
          </div>

          {recentClients.length > 0 ? (
            <div className="recent-client-list">
              {recentClients.map((client) => {
                const label = client.name ?? client.whatsapp ?? 'Sem nome'
                return (
                  <button type="button" className="recent-client-row" key={client.id} onClick={onOpenClients}>
                    <span className="client-avatar">{label.charAt(0).toUpperCase()}</span>
                    <span className="recent-client-copy">
                      <strong>{label}</strong>
                      <small>{client.whatsapp ?? client.email ?? 'Sem contato informado'}</small>
                    </span>
                    <span className="client-date">{formatShortDate(client.createdAt)}</span>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="panel-empty">
              <span className="empty-icon"><ContactRound size={21} strokeWidth={1.6} aria-hidden="true" /></span>
              <strong>Sua carteira começa aqui</strong>
              <p>Cadastre o primeiro cliente para acompanhar contatos e conversas.</p>
              <button type="button" className="button button-secondary" onClick={onNewClient}>Adicionar cliente</button>
            </div>
          )}
        </article>

        <article className="dashboard-panel quick-actions-panel">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">Atalhos</p>
              <h2>Organize seu negócio</h2>
            </div>
          </div>
          <div className="quick-actions">
            <button type="button" onClick={onOpenClients}>
              <span><UserPlus size={18} aria-hidden="true" /></span>
              <div><strong>Clientes</strong><small>Cadastre e acompanhe contatos</small></div>
              <ArrowRight size={15} aria-hidden="true" />
            </button>
            <button type="button" onClick={onOpenFinance}>
              <span><WalletCards size={18} aria-hidden="true" /></span>
              <div><strong>Financeiro</strong><small>Receitas, despesas e cobranças</small></div>
              <ArrowRight size={15} aria-hidden="true" />
            </button>
            <button type="button" onClick={onOpenPipeline}>
              <span><BriefcaseBusiness size={18} aria-hidden="true" /></span>
              <div><strong>Pipeline</strong><small>Acompanhe novas oportunidades</small></div>
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          </div>
        </article>
      </section>
    </div>
  )
}
