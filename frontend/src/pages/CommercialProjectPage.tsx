import { useState } from 'react'
import { ArrowLeft, ArrowUpRight, Clipboard } from 'lucide-react'
import { ErrorState, LoadingState } from '@/components/ui/DataState'
import { api } from '@/lib/api'
import { commercialDate, commercialPath, type CommercialSnapshot } from '@/lib/commercial'
import { useRemote } from '@/hooks/useRemote'
import './CommercialProposalsPage.css'

type Task = {
  id: string
  title: string
  description: string
  status: string
  priority: string
  parent_id: string | null
  blocked: boolean
  blocker: string | null
}
type ContractedProject = {
  id: string
  name: string
  description: string
  proposal_id: string
  snapshot: CommercialSnapshot
  tasks: Task[]
  next_action: Task | null
}
type Scope = 'project' | 'next_task'
type Prompt = { id: string; content: string; scope: Scope; created_at: string; source?: string }

const taskStates: Record<string, string> = {
  todo: 'A fazer', pending: 'A fazer', planned: 'Planejada', in_progress: 'Em andamento', review: 'Em revisão', done: 'Concluída',
}

function PromptEditor({ project, path }: { project: ContractedProject; path: string }) {
  const history = useRemote<Prompt[]>(path)
  const [scope, setScope] = useState<Scope>('project')
  const [content, setContent] = useState('')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<{ text: string; error: boolean } | null>(null)
  const nextUnavailable = scope === 'next_task' && !project.next_action
  async function run(label: string, action: () => Promise<void>) {
    if (busy) return
    setBusy(true)
    setFeedback(null)
    try { await action(); setFeedback({ text: label, error: false }) }
    catch (err) { setFeedback({ text: (err as Error).message, error: true }) }
    finally { setBusy(false) }
  }
  async function save(edited: boolean) {
    await run(edited ? 'Nova versão salva' : 'Prompt gerado', async () => {
      const prompt = await api.post<Prompt>(path, edited ? { scope, content } : { scope })
      setContent(prompt.content)
    })
  }
  return <section className="commercial-panel commercial-prompt">
    <h2>Prompt de desenvolvimento</h2>
    <div className="commercial-actions">
      <label className="login-field"><span>Escopo do prompt</span><select value={scope} onChange={event => {
        setScope(event.target.value as Scope); setContent(''); setFeedback(null)
      }}>
        <option value="project">Projeto completo</option>
        <option value="next_task">Próxima tarefa executável</option>
      </select></label>
      <button type="button" className="button button-primary" disabled={busy || nextUnavailable} onClick={() => void save(false)}>Gerar prompt de desenvolvimento</button>
    </div>
    {nextUnavailable && <p>O projeto não tem uma tarefa executável no momento.</p>}
    {feedback && <p className={'commercial-feedback' + (feedback.error ? ' commercial-feedback--error' : '')} role={feedback.error ? 'alert' : 'status'}>{feedback.text}</p>}
    {content && <>
      <label className="login-field"><span>Prompt para revisão</span><textarea value={content} rows={15} maxLength={30000} onChange={event => setContent(event.target.value)} /></label>
      <div className="commercial-actions">
        <button type="button" className="button button-secondary" disabled={!content.trim() || busy} onClick={() => void save(true)}>Salvar nova versão</button>
        <button type="button" className="button button-secondary" disabled={busy} onClick={() => void run('Prompt copiado', () => navigator.clipboard.writeText(content))}><Clipboard size={16} aria-hidden="true" /> Copiar prompt</button>
      </div>
    </>}
    {history.error ? <ErrorState message={history.error} retry={history.reload} /> : history.data?.length ? <details>
      <summary>Histórico de prompts</summary>
      <ul className="commercial-version-list">{history.data.map(item => <li key={item.id}>
        <div className="commercial-version-label"><strong>{item.scope === 'project' ? 'Projeto completo' : 'Próxima tarefa'}</strong><span>{commercialDate(item.created_at, true)}</span></div>
        <button type="button" className="button button-secondary" onClick={() => { setScope(item.scope); setContent(item.content); setFeedback(null) }}>Abrir versão</button>
      </li>)}</ul>
    </details> : null}
  </section>
}

export default function CommercialProjectPage({ id, onProposal, onProject, onTasks }: {
  id: string; onProposal: (id?: string) => void; onProject: () => void; onTasks: () => void
}) {
  const path = commercialPath + '/projects/' + id
  const detail = useRemote<ContractedProject>(path)
  const project = detail.data
  if (detail.error) return <ErrorState message={detail.error} retry={detail.reload} />
  if (!project) return <LoadingState />
  return <section className="commercial-admin">
    <button type="button" className="button button-secondary commercial-self-start" onClick={() => onProposal(project.proposal_id)}><ArrowLeft size={16} aria-hidden="true" /> Voltar à proposta</button>
    <header className="commercial-admin-header">
      <div><p className="commercial-kicker">{project.snapshot.client_name}</p><h1>{project.name}</h1><p>Planejamento inicial da contratação</p></div>
      <div className="commercial-actions">
        <button type="button" className="button button-secondary" onClick={onTasks}>Abrir quadro de tarefas</button>
        <button type="button" className="button button-secondary" onClick={onProject}>Abrir projeto <ArrowUpRight size={16} aria-hidden="true" /></button>
      </div>
    </header>
    <section className="commercial-panel commercial-next">
      <h2>Próxima ação</h2>
      {project.next_action ? <><strong>{project.next_action.title}</strong><p>{project.next_action.description}</p></> :
        <p>{project.tasks.some(task => task.status !== 'done') ? 'Há tarefas aguardando dependências.' : 'As tarefas do planejamento estão concluídas.'}</p>}
    </section>
    <section className="commercial-panel">
      <h2>Tarefas e dependências</h2>
      <ul className="commercial-plan">{[...project.tasks].map(task => <li key={task.id} data-subtask={task.parent_id || undefined}>
        <strong>{task.title}</strong>
        <span>{taskStates[task.status] || task.status} {task.priority === 'high' ? '· Prioridade alta' : ''}</span>
        {task.blocked && task.blocker && <span>Aguarda: {task.blocker}</span>}
      </li>)}</ul>
    </section>
    <PromptEditor project={project} path={path + '/prompts'} />
  </section>
}
