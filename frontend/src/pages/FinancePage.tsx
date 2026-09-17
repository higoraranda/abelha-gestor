import { ArrowDownLeft, ArrowUpRight, CircleDollarSign, Plus, ReceiptText, WalletCards } from 'lucide-react'

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export default function FinancePage() {
  return (
    <div className="module-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Controle financeiro</p>
          <h1>Financeiro</h1>
          <p className="page-subtitle">Uma visão clara do que entrou, do que saiu e do que ainda precisa ser recebido.</p>
        </div>
        <button type="button" className="button button-primary" disabled title="Disponível na próxima etapa">
          <Plus size={17} aria-hidden="true" /> Novo lançamento
        </button>
      </header>

      <div className="module-notice" role="note">
        <CircleDollarSign size={18} aria-hidden="true" />
        <div>
          <strong>Módulo preparado para a próxima etapa.</strong>
          <p>A interface já está pronta; a persistência de receitas, despesas e cobranças será conectada ao Neon antes de liberar lançamentos.</p>
        </div>
      </div>

      <section className="finance-metrics" aria-label="Resumo financeiro">
        <article>
          <span className="finance-icon incoming"><ArrowDownLeft size={18} aria-hidden="true" /></span>
          <p>Receitas no mês</p><strong>{currency.format(0)}</strong><small>Nenhum lançamento</small>
        </article>
        <article>
          <span className="finance-icon outgoing"><ArrowUpRight size={18} aria-hidden="true" /></span>
          <p>Despesas no mês</p><strong>{currency.format(0)}</strong><small>Nenhum lançamento</small>
        </article>
        <article>
          <span className="finance-icon"><ReceiptText size={18} aria-hidden="true" /></span>
          <p>A receber</p><strong>{currency.format(0)}</strong><small>Nenhuma cobrança</small>
        </article>
        <article className="finance-balance">
          <span className="finance-icon"><WalletCards size={18} aria-hidden="true" /></span>
          <p>Saldo projetado</p><strong>{currency.format(0)}</strong><small>Saldo inicial</small>
        </article>
      </section>

      <section className="dashboard-grid dashboard-grid-main">
        <article className="dashboard-panel finance-chart-panel">
          <div className="panel-heading">
            <div><p className="panel-kicker">Fluxo de caixa</p><h2>Entradas e saídas</h2></div>
            <span className="period-chip">Últimos 6 meses</span>
          </div>
          <div className="finance-empty-chart">
            <div className="empty-axis">
              {Array.from({ length: 6 }, (_, index) => <span key={index} />)}
            </div>
            <div className="panel-empty compact-empty">
              <strong>Sem movimentações ainda</strong>
              <p>O gráfico será preenchido quando o primeiro lançamento for criado.</p>
            </div>
          </div>
        </article>

        <article className="dashboard-panel">
          <div className="panel-heading">
            <div><p className="panel-kicker">Cobranças</p><h2>Próximos vencimentos</h2></div>
          </div>
          <div className="panel-empty compact-empty finance-side-empty">
            <span className="empty-icon"><ReceiptText size={21} strokeWidth={1.6} aria-hidden="true" /></span>
            <strong>Nada pendente</strong>
            <p>As cobranças abertas aparecerão aqui por ordem de vencimento.</p>
          </div>
        </article>
      </section>
    </div>
  )
}
