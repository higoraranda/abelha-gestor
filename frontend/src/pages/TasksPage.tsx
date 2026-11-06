import { useState } from 'react'
import { CheckSquare2, Plus, Search, X } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/DataState'
import { useRemote } from '@/hooks/useRemote'
import { api } from '@/lib/api'
import { TASK_LABELS, civilDate } from '@/types/crm'
import type { ContractOption, DeliveryTask, TaskPage, TaskStatus } from '@/types/crm'

export default function TasksPage({focusId,contractId}:{focusId?:string;contractId?:string}) {
  const [layout,setLayout]=useState<'board'|'checklist'>('board')
  const [contract,setContract]=useState(contractId||''); const [search,setSearch]=useState(''); const [page,setPage]=useState(1)
  const [editing,setEditing]=useState<DeliveryTask|'new'|null>(null); const [error,setError]=useState(''); const [busy,setBusy]=useState<string|null>(null)
  const [focus,setFocus]=useState(focusId)
  const params=new URLSearchParams({page:String(page),limit:'60',search}); if (contract) params.set('contractId',contract); if(focus) params.set('taskId',focus)
  const tasks=useRemote<TaskPage>('/api/v1/crm/tasks?'+params)
  const contracts=useRemote<ContractOption[]>('/api/v1/crm/contracts')
  async function move(task:DeliveryTask,status:string) {
    setBusy(task.id); setError('')
    try {await api.patch('/api/v1/crm/tasks/'+task.id,{status});tasks.reload()} catch(e) {setError(e instanceof Error?e.message:'Não foi possível atualizar a tarefa.')} finally {setBusy(null)}
  }
  const items=tasks.data?.items || []
  return <div className="module-page">
    <header className="page-heading"><div><p className="eyebrow">Do combinado à entrega</p><h1>Entregas</h1><p className="page-subtitle">Um checklist, duas formas de acompanhar. Cada avanço no quadro atualiza a mesma tarefa.</p></div><button className="button button-primary" onClick={()=>setEditing('new')}><Plus size={17}/> Nova tarefa</button></header>
    <div className="crm-toolbar"><Search size={18}/><input aria-label="Buscar tarefas" placeholder="Buscar tarefa ou cliente" value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}}/>{search && <button className="icon-button" aria-label="Limpar busca" onClick={()=>{setSearch('');setPage(1)}}><X size={16}/></button>}<select aria-label="Filtrar por contrato" value={contract} onChange={e=>{setContract(e.target.value);setPage(1)}}><option value="">Todos os contratos</option>{contracts.data?.map(c=><option key={c.id} value={c.id}>{c.client_name} · {c.service_name}</option>)}</select><div className="crm-tabs" role="group" aria-label="Visualização das entregas"><button aria-pressed={layout==='board'} onClick={()=>setLayout('board')}>Quadro</button><button aria-pressed={layout==='checklist'} onClick={()=>setLayout('checklist')}>Checklist</button></div>{focus && <button className="button button-secondary" onClick={()=>setFocus(undefined)}>Ver todas as tarefas</button>}</div>
    {error && <p className="form-error" role="alert">{error}</p>}
    {tasks.loading ? <LoadingState/> : tasks.error ? <ErrorState message={tasks.error} retry={tasks.reload}/> : !items.length ? <div className="crm-panel"><EmptyState title="Espaço para a próxima entrega" text="Cadastre as tarefas de um contrato para acompanhar o trabalho. Contratos antigos não recebem tarefas automaticamente."><button className="button button-primary" onClick={()=>setEditing('new')}>Cadastrar tarefa</button></EmptyState></div> : <>
      <p className="page-subtitle">{tasks.data?.total} tarefas · página {page}. Arraste um card ou use o seletor de situação.</p>
      {layout==='board' ? <div className="crm-board">{(Object.keys(TASK_LABELS) as TaskStatus[]).map(status=><section className="board-column" key={status} aria-label={TASK_LABELS[status]} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const task=items.find(t=>t.id===e.dataTransfer.getData('text/plain'));if(task) void move(task,status)}}><h2>{TASK_LABELS[status]} <span>{items.filter(t=>t.status===status).length}</span></h2>{items.filter(t=>t.status===status).map(task=><article key={task.id} draggable={!busy} onDragStart={e=>e.dataTransfer.setData('text/plain',task.id)} className={'board-card'+(task.status==='done'?' is-done':'')}><header><span className="status-pill">{task.client_name || 'Cliente'}</span><CheckSquare2 size={16}/></header><button className="text-button" onClick={()=>setEditing(task)}><h3>{task.title}</h3></button><p>{task.service_name}</p>{task.description && <p>{task.description}</p>}<footer><small>{civilDate(task.due_date)}</small><select disabled={busy===task.id} aria-label={'Situação de '+task.title} value={task.status} onChange={e=>void move(task,e.target.value)}>{Object.entries(TASK_LABELS).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></footer></article>)}</section>)}</div> : <section className="crm-panel" aria-label="Checklist das entregas">{items.map(task=><label className="checklist-row" key={task.id}><input type="checkbox" checked={task.status==='done'} disabled={busy===task.id} onChange={e=>void move(task,e.target.checked?'done':'reopen')}/><span><strong>{task.title}</strong><small>{task.client_name} · {task.service_name} · {civilDate(task.due_date)}</small></span><span className="status-pill">{TASK_LABELS[task.status]}</span></label>)}</section>}
      <div className="crm-toolbar"><button className="button button-secondary" disabled={page===1} onClick={()=>setPage(p=>p-1)}>Anterior</button><button className="button button-secondary" disabled={page*60>=(tasks.data?.total||0)} onClick={()=>setPage(p=>p+1)}>Próxima página</button></div>
    </>}
    {editing && <TaskEditor task={editing==='new'?undefined:editing} contracts={contracts.data||[]} contractsError={contracts.error} onClose={()=>setEditing(null)} onSaved={()=>{setEditing(null);tasks.reload()}}/>}
  </div>
}
function TaskEditor({task,contracts,contractsError,onClose,onSaved}:{task?:DeliveryTask;contracts:ContractOption[];contractsError:string|null;onClose:()=>void;onSaved:()=>void}) {
  const [form,setForm]=useState({title:task?.title||'',description:task?.description||'',contract_id:task?.contract_id||'',due_date:task?.due_date?.slice(0,10)||''})
  const [busy,setBusy]=useState(false); const [error,setError]=useState('')
  async function save(e:React.FormEvent) {e.preventDefault();if(busy)return;setBusy(true);setError('');try{const input={...form,due_date:form.due_date||null};if(task)await api.patch('/api/v1/crm/tasks/'+task.id,input);else await api.post('/api/v1/crm/tasks',input);onSaved()}catch(e){setError(e instanceof Error?e.message:'Não foi possível salvar.')}finally{setBusy(false)}}
  return <Modal title={task?'Detalhes da tarefa':'Nova tarefa'} description="A tarefa aparecerá no quadro e no checklist do contrato." onClose={()=>{if(!busy)onClose()}}><form className="crm-form" onSubmit={save}>
    <label>Contrato<select required value={form.contract_id} disabled={Boolean(task)} onChange={e=>setForm({...form,contract_id:e.target.value})}><option value="">Selecione um contrato</option>{contracts.filter(c=>c.status!=='cancelled'||c.id===task?.contract_id).map(c=><option key={c.id} value={c.id}>{c.client_name} · {c.service_name}</option>)}</select></label>{contractsError && <p className="form-error">{contractsError}</p>}
    <label>Tarefa<input required maxLength={240} value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label><label>Descrição<textarea rows={3} maxLength={10000} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label><label>Prazo<input type="date" value={form.due_date} onChange={e=>setForm({...form,due_date:e.target.value})}/></label>{error && <p role="alert" className="form-error">{error}</p>}<footer><button type="button" className="button button-secondary" disabled={busy} onClick={onClose}>Cancelar</button><button className="button button-primary" disabled={busy||(!task&&!contracts.length)}>{busy?'Salvando…':'Salvar tarefa'}</button></footer>
  </form></Modal>
}
