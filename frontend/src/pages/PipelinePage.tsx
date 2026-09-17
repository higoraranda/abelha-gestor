import { CircleDashed, Plus } from 'lucide-react'
import type { Client } from '@/types'

interface Props {
  clients: Client[]
  onNewClient: () => void
}

const STAGES = [
  { id: 'incoming', title: 'Entrada', detail: 'Novas oportunidades' },
  { id: 'contact', title: 'Em contato', detail: 'Conversas iniciadas' },
  { id: 'proposal', title: 'Proposta', detail: 'Aguardando decisão' },
  { id: 'won', title: 'Fechado', detail: 'Negócios ganhos' },
] as const

export default function PipelinePage({ clients, onNewClient }: Props) {
  return (
    <div className="module-page pipeline-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Oportunidades</p>
          <h1>Pipeline</h1>
          <p className="page-subtitle">Visualize cada oportunidade e avance os negócios pelo seu processo comercial.</p>
        </div>
        <button type="button" className="button button-primary" onClick={onNewClient}>
          <Plus size={17} aria-hidden="true" /> Nova oportunidade
        </button>
      </header>

      <div className="module-notice" role="note">
        <CircleDashed size={18} aria-hidden="true" />
        <div>
          <strong>Etapas personalizáveis serão conectadas em seguida.</strong>
          <p>Por enquanto, novos clientes aparecem em Entrada sem alterar os dados existentes.</p>
        </div>
      </div>

      <section className="pipeline-board" aria-label="Funil de vendas">
        {STAGES.map((stage, stageIndex) => {
          const stageClients = stageIndex === 0 ? clients : []
          return (
            <article className="pipeline-column" key={stage.id}>
              <header>
                <div><strong>{stage.title}</strong><small>{stage.detail}</small></div>
                <span>{stageClients.length}</span>
              </header>
              <div className="pipeline-cards">
                {stageClients.length > 0 ? stageClients.slice(0, 8).map((client) => {
                  const label = client.name ?? client.whatsapp ?? 'Sem nome'
                  return (
                    <div className="pipeline-card" key={client.id}>
                      <div className="pipeline-card-head"><span>{label.charAt(0).toUpperCase()}</span><strong>{label}</strong></div>
                      <p>{client.company?.name ?? 'Sem empresa vinculada'}</p>
                      <small>{client.email ?? client.whatsapp ?? 'Contato não informado'}</small>
                    </div>
                  )
                }) : (
                  <div className="pipeline-empty"><span /><p>Nenhum negócio nesta etapa</p></div>
                )}
              </div>
            </article>
          )
        })}
      </section>
    </div>
  )
}
