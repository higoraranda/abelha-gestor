import { useId, useRef, useState, type DragEvent, type FormEvent } from 'react'
import { Plus, Search, TriangleAlert, X } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/DataState'
import { useRemote } from '@/hooks/useRemote'
import { api } from '@/lib/api'
import { TASK_LABELS, civilDate } from '@/types/crm'
import type { ContractOption, DeliveryTask, TaskPage, TaskStatus } from '@/types/crm'

const pageSize = 60
const statuses = Object.keys(TASK_LABELS) as TaskStatus[]
const priorityLabels = { high: 'alta', normal: 'normal', low: 'baixa' }

export default function TasksPage({ focusId, contractId, projectId }: { focusId?: string; contractId?: string; projectId?: string }) {
  const [layout, setLayout] = useState<'board' | 'checklist'>('board')
  const [contract, setContract] = useState(contractId || '')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<DeliveryTask | 'new' | null>(null)
  const [error, setError] = useState('')
  const feedback = useRef<HTMLParagraphElement>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [focus, setFocus] = useState(focusId)
  const updating = useRef(false)
  const searchInput = useRef<HTMLInputElement>(null)
  const dragging = useRef<DeliveryTask | null>(null)
  const [dropTarget, setDropTarget] = useState<TaskStatus | null>(null)
  const params = new URLSearchParams({ page: String(page), limit: String(pageSize), search })
  if (projectId) params.set('projectId', projectId)
  else if (contract) params.set('contractId', contract)
  if (focus) params.set('taskId', focus)
  const tasks = useRemote<TaskPage>('/api/v1/crm/tasks?' + params)
  const contracts = useRemote<ContractOption[]>(projectId ? null : '/api/v1/crm/contracts')
  const items = tasks.data?.items ?? []
  const selectedTask = editing && editing !== 'new' ? (items.find(task => task.id === editing.id) ?? editing) : undefined

  async function move(task: DeliveryTask, status: TaskStatus | 'reopen') {
    if (updating.current || status === task.status) return
    updating.current = true
    setBusy(true)
    setError('')
    setMessage('')
    if (layout === 'board' && !editing) feedback.current?.focus({ preventScroll: true })
    try {
      const saved = await api.patch<DeliveryTask>('/api/v1/crm/tasks/' + task.id, { status })
      setMessage(task.title + ' movida para ' + TASK_LABELS[saved.status] + '.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível atualizar a tarefa.')
    } finally {
      updating.current = false
      setBusy(false)
    }
  }

  function drop(event: DragEvent, status: TaskStatus) {
    event.preventDefault()
    const task = dragging.current
    dragging.current = null
    setDropTarget(null)
    if (task) void move(task, status)
  }

  return <div className="module-page">
    <header className="page-heading">
      <div><h1>{projectId ? 'Entregas do projeto' : 'Entregas'}</h1><p className="page-subtitle">{projectId ? items[0]?.service_name : 'Tarefas de clientes e projetos.'}</p></div>
      <button className="button button-primary" onClick={() => setEditing('new')}><Plus size={17} aria-hidden="true"/> Nova tarefa</button>
    </header>
    <div className="crm-toolbar tasks-toolbar">
      <Search size={18} aria-hidden="true"/>
      <input ref={searchInput} aria-label="Buscar tarefas" placeholder="Buscar tarefa ou cliente" value={search} onChange={event => { setSearch(event.target.value); setPage(1) }}/>
      {search && <button className="icon-button" aria-label="Limpar busca" onClick={() => { setSearch(''); setPage(1); searchInput.current?.focus() }}><X size={16} aria-hidden="true"/></button>}
      {!projectId && <select aria-label="Filtrar por contrato" value={contract} onChange={event => { setContract(event.target.value); setPage(1) }}>
        <option value="">Todos os contratos</option>
        {contracts.data?.map(item => <option key={item.id} value={item.id}>{item.client_name} · {item.service_name}</option>)}
      </select>}
      <div className="crm-tabs" role="group" aria-label="Visualização das entregas">
        <button aria-pressed={layout === 'board'} onClick={() => setLayout('board')}>Quadro</button>
        <button aria-pressed={layout === 'checklist'} onClick={() => setLayout('checklist')}>Checklist</button>
      </div>
      {focus && <button className="button button-secondary" onClick={() => setFocus(undefined)}>Ver todas as tarefas</button>}
    </div>
    <p ref={feedback} className="board-feedback" role="status" tabIndex={-1}>{busy ? 'Salvando movimentação…' : message}</p>
    {error && <p className="form-error" role="alert">{error}</p>}
    {tasks.loading && !tasks.data ? <LoadingState/> : tasks.error ? <ErrorState message={tasks.error} retry={tasks.reload}/> : <>
      {layout === 'board' ? <>
        <p className="page-subtitle">Arraste um cartão ou use o seletor de situação.</p>
        <div className="tasks-board kanban-columns" role="region" aria-label="Quadro de tarefas" tabIndex={0}>
          {statuses.map(status => {
            const cards = items.filter(task => task.status === status)
            return <section className="board-column" key={status} aria-label={TASK_LABELS[status]} data-drop-target={dropTarget === status || undefined}
              onDragOver={event => {
                if (!dragging.current || dragging.current.status === status || updating.current) return
                event.preventDefault()
                event.dataTransfer.dropEffect = 'move'
                setDropTarget(status)
              }}
              onDragLeave={event => {
                if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) {
                  setDropTarget(current => current === status ? null : current)
                }
              }}
              onDrop={event => drop(event, status)}>
              <h2>{TASK_LABELS[status]} <span>{cards.length}</span></h2>
              {cards.length ? <div className="kanban-cards" role="group" aria-label={'Tarefas em ' + TASK_LABELS[status]} tabIndex={0}>
                {cards.map(task => <article key={task.id} draggable={!busy} className={'board-card' + (status === 'done' ? ' is-done' : '')}
                  onDragStart={event => {
                    dragging.current = task
                    event.dataTransfer.effectAllowed = 'move'
                    event.dataTransfer.setData('text/plain', task.id)
                  }}
                  onDragEnd={() => { dragging.current = null; setDropTarget(null) }}>
                  <header>
                    {task.client_name && <p>{task.client_name}</p>}
                    <h3><button type="button" className="text-button task-title" onClick={() => { setError(''); setEditing(task) }}>{task.title}</button></h3>
                  </header>
                  {(task.priority || task.blocked) && <p className="task-flags">
                    {task.priority && <span>Prioridade {priorityLabels[task.priority]}</span>}
                    {task.blocked && <span className="task-blocked"><TriangleAlert size={13} aria-hidden="true"/> Bloqueada</span>}
                  </p>}
                  <footer>
                    <small>{civilDate(task.due_date)}</small>
                    <select disabled={busy} aria-label={'Situação de ' + task.title} value={task.status} onChange={event => void move(task, event.target.value as TaskStatus)}>
                      {statuses.map(option => <option key={option} value={option}>{TASK_LABELS[option]}</option>)}
                    </select>
                  </footer>
                </article>)}
              </div> : <p className="task-column-empty">Nenhuma tarefa nesta etapa.</p>}
            </section>
          })}
        </div>
        {!items.length && (search || contract || focus) && <p className="page-subtitle" role="status">Nenhuma tarefa corresponde aos filtros.</p>}
      </> : items.length > 0 ? <section className="crm-panel" aria-label="Checklist das entregas">
        {items.map(task => <label className="checklist-row" key={task.id}>
          <input type="checkbox" checked={task.status === 'done'} disabled={busy} onChange={event => void move(task, event.target.checked ? 'done' : 'reopen')}/>
          <span><strong>{task.title}</strong><small>{[task.client_name, task.service_name, civilDate(task.due_date)].filter(Boolean).join(' · ')}</small></span>
          <span className="status-pill">{TASK_LABELS[task.status]}</span>
        </label>)}
      </section> : <div className="crm-panel"><EmptyState title="Nenhuma tarefa encontrada" text="Ajuste os filtros ou cadastre uma tarefa."/></div>}
      {(page > 1 || page * pageSize < (tasks.data?.total ?? 0)) && <div className="crm-toolbar">
        <button className="button button-secondary" disabled={page === 1} onClick={() => setPage(current => current - 1)}>Anterior</button>
        <span aria-live="polite">Página {page}</span>
        <button className="button button-secondary" disabled={page * pageSize >= (tasks.data?.total ?? 0)} onClick={() => setPage(current => current + 1)}>Próxima página</button>
      </div>}
    </>}
    {editing && <TaskEditor
      task={selectedTask}
      relatedTasks={selectedTask ? items.filter(task => task.parent_id === selectedTask.id) : []}
      dependency={selectedTask?.dependency_id ? items.find(task => task.id === selectedTask.dependency_id) : undefined}
      relatedBusy={busy}
      relatedError={error}
      onToggleTask={(task, checked) => void move(task, checked ? 'done' : 'reopen')}
      projectId={projectId}
      defaultContract={contract}
      contracts={contracts.data ?? []}
      contractsError={contracts.error}
      onClose={() => setEditing(null)}
      onSaved={() => { setEditing(null); setMessage(editing === 'new' ? 'Tarefa criada.' : 'Tarefa atualizada.') }}/>}
  </div>
}

function TaskEditor({ task, relatedTasks, dependency, relatedBusy, relatedError, onToggleTask, projectId, defaultContract, contracts, contractsError, onClose, onSaved }: {
  task?: DeliveryTask
  relatedTasks: DeliveryTask[]
  dependency?: DeliveryTask
  relatedBusy: boolean
  relatedError: string
  onToggleTask: (task: DeliveryTask, checked: boolean) => void
  projectId?: string
  defaultContract: string
  contracts: ContractOption[]
  contractsError: string | null
  onClose: () => void
  onSaved: () => void
}) {
  const contractOptions = contracts.filter(contract => contract.status !== 'cancelled' || contract.id === task?.contract_id)
  const [selectedContract, setSelectedContract] = useState<string | null>(null)
  const fallbackContract = contractOptions.find(contract => contract.id === defaultContract)?.id ?? (contractOptions.length === 1 ? contractOptions[0].id : '')
  const contractId = task ? (task.contract_id ?? '') : (selectedContract ?? fallbackContract)
  const [form, setForm] = useState({
    title: task?.title ?? '',
    description: task?.description ?? '',
    due_date: task?.due_date?.slice(0, 10) ?? '',
  })
  const [priority, setPriority] = useState<NonNullable<DeliveryTask['priority']>>(task?.priority ?? 'normal')
  const projectTask = task ? Boolean(task.project_id) : Boolean(projectId)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const titleInput = useRef<HTMLInputElement>(null)
  const contractInput = useRef<HTMLSelectElement>(null)
  const contractLabel = useId()

  async function save(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    const title = form.title.trim()
    if (!title) { setError('Informe o nome da tarefa.'); titleInput.current?.focus(); return }
    if (!task && !projectId && !contractId) { setError('Selecione o contrato da tarefa.'); contractInput.current?.focus(); return }
    setBusy(true)
    setError('')
    try {
      const input = { ...form, title, due_date: form.due_date || null }
      if (task) await api.patch('/api/v1/crm/tasks/' + task.id, projectTask ? { ...input, priority } : input)
      else if (projectId) await api.post('/api/v1/crm/tasks', { ...input, project_id: projectId, priority })
      else await api.post('/api/v1/crm/tasks', { ...input, contract_id: contractId })
      onSaved()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar a tarefa.')
    } finally {
      setBusy(false)
    }
  }

  const details = <>
    <label>Descrição<textarea rows={3} maxLength={10000} disabled={busy} value={form.description} onChange={event => setForm({ ...form, description: event.target.value })}/></label>
    <label>Prazo<input type="date" disabled={busy} value={form.due_date} onChange={event => setForm({ ...form, due_date: event.target.value })}/></label>
  </>

  return <Modal title={task ? 'Detalhes da tarefa' : 'Nova tarefa'} onClose={() => { if (!busy) onClose() }}>
    {task?.blocked && <p className="task-edit-blocker"><TriangleAlert size={16} aria-hidden="true"/>
      {dependency ? 'Depende de ' + dependency.title : 'Aguardando outra tarefa do projeto.'}
    </p>}
    {relatedTasks.length > 0 && <fieldset className="task-edit-checklist" disabled={relatedBusy || busy}>
      <legend>Subtarefas</legend>
      {relatedTasks.map(child => <label key={child.id}>
        <input type="checkbox" checked={child.status === 'done'} onChange={event => onToggleTask(child, event.target.checked)}/>
        <span>{child.title}{child.blocked && <small> · Bloqueada</small>}</span>
      </label>)}
      {relatedError && <p className="form-error" role="alert">{relatedError}</p>}
    </fieldset>}
    <form className="crm-form" noValidate aria-busy={busy} onSubmit={save}>
      <label>Tarefa<input ref={titleInput} autoFocus required maxLength={240} disabled={busy} value={form.title} onChange={event => setForm({ ...form, title: event.target.value })}/></label>
      {task && !task.contract_id && <p className="page-subtitle">{task.service_name}</p>}
      {projectTask && <label>Prioridade<select value={priority} disabled={busy} onChange={event => setPriority(event.target.value as typeof priority)}>
        {Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>}
      {!projectTask && (!task || task.contract_id) && <>
        <label><span id={contractLabel}>Contrato</span><select ref={contractInput} aria-labelledby={contractLabel} required value={contractId} disabled={Boolean(task) || busy} onChange={event => setSelectedContract(event.target.value)}>
          <option value="">Selecione um contrato</option>
          {contractOptions.map(contract => <option key={contract.id} value={contract.id}>{contract.client_name} · {contract.service_name}</option>)}
        </select></label>
        {contractsError && <p className="form-error" role="alert">{contractsError}</p>}
        {!task && !contractOptions.length && <p className="page-subtitle">Cadastre um contrato ativo para criar tarefas manuais.</p>}
      </>}
      {task ? details : <details className="task-edit-notes"><summary>Adicionar descrição e prazo</summary>{details}</details>}
      {error && <p role="alert" className="form-error">{error}</p>}
      <footer>
        <button type="button" className="button button-secondary" disabled={busy} onClick={onClose}>Cancelar</button>
        <button className="button button-primary" disabled={busy || (!task && !projectId && !contractOptions.length)}>{busy ? 'Salvando…' : 'Salvar tarefa'}</button>
      </footer>
    </form>
  </Modal>
}
