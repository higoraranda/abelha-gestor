import { useRef, useState, type DragEvent } from 'react'
import { ArrowRight, ArrowUpRight, GitBranch, ListTodo } from 'lucide-react'
import { api } from '@/lib/api'
import { pipelineLabels, pipelineStages, projectStageLabel, projectUpdateSource, type ProjectStage } from '@/lib/personalProjectStatus'
import { civilDate } from '@/types/crm'
import type { PersonalProject } from '@/types/personal'
import './ProjectBoard.css'

const stages = [{ id:null, label:'Sem etapa definida' }, ...pipelineStages.map(id => ({ id, label:pipelineLabels[id] }))]
const searchText = (value:string) => value.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLocaleLowerCase('pt-BR')

export default function ProjectBoard({ projects, onOpen }: {
  projects: PersonalProject[]
  onOpen: (id: string) => void
}) {
  const inFlight = useRef(false)
  const dragging = useRef<PersonalProject | null>(null)
  const [busyId, setBusyId] = useState('')
  const [dropTarget, setDropTarget] = useState<ProjectStage | null>(null)
  const [message, setMessage] = useState('')
  const [query, setQuery] = useState('')
  const [attention, setAttention] = useState('all')
  const shown = projects.filter(project =>
    searchText(project.name+' '+project.description).includes(searchText(query.trim())) &&
    (attention==='all'||(attention==='paused'&&project.status==='paused')||(attention==='blocked'&&Boolean(project.blockers.trim())))
  )
  const writable = projects.some(project => project.pipeline_stage!==undefined)
  const [error, setError] = useState('')
  const feedback = useRef<HTMLParagraphElement>(null)

  async function move(project: PersonalProject, destination: ProjectStage) {
    if (inFlight.current || destination === project.pipeline_stage) return
    inFlight.current = true
    setBusyId(project.id)
    setError('')
    setMessage('')
    feedback.current?.focus({ preventScroll: true })
    try {
      await api.patch('/api/v1/personal/projects/'+project.id+'/pipeline', { stage: destination, expected_stage: project.pipeline_stage ?? null })
      setMessage(project.name+' movido para '+pipelineLabels[destination]+'.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível mover o projeto.')
    } finally {
      inFlight.current = false
      setBusyId('')
    }
  }

  function handleDrop(event: DragEvent, destination: ProjectStage | null) {
    event.preventDefault()
    const project = dragging.current
    dragging.current = null
    setDropTarget(null)
    if (project && destination) void move(project, destination)
  }

  return <section className="project-board" aria-labelledby="project-board-title">
    <div className="project-board-heading">
      <div><h2 id="project-board-title">Quadro de projetos</h2><p className="page-subtitle">Arraste os cartões ou use «Mover para». O quadro não altera os marcos do projeto.</p></div>
      <span className="status-pill">{shown.length} {shown.length === 1 ? 'projeto' : 'projetos'}</span>
    </div>
    <div className="project-board-filters">
      <label>Buscar projeto<input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Nome ou descrição"/></label>
      <label>Condição<select value={attention} onChange={event=>setAttention(event.target.value)}><option value="all">Todos</option><option value="paused">Pausados</option><option value="blocked">Bloqueados</option></select></label>
    </div>
    {!writable&&<p className="page-subtitle">O quadro está em leitura até a atualização do banco. Os projetos e seus estados anteriores foram preservados.</p>}
    {!shown.length&&<p role="status">Nenhum projeto corresponde aos filtros.</p>}
    <p className="project-board-feedback" tabIndex={-1} ref={feedback} role="status">{busyId ? 'Salvando movimentação…' : message}</p>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="project-board-columns">
      {stages.map(({ id, label }) => {
        const cards = shown.filter(project => (project.pipeline_stage ?? null) === id)
        const sectionId = id ?? 'unassigned'
        const Icon = id ? GitBranch : ListTodo
        return <section key={sectionId} className="project-board-column" data-stage={sectionId} aria-labelledby={'project-stage-'+sectionId}
          data-drop-target={id !== null && dropTarget === id || undefined}
          onDragOver={event => {
            if (!id || !dragging.current || dragging.current.pipeline_stage === id || inFlight.current) return
            event.preventDefault()
            event.dataTransfer.dropEffect = 'move'
            setDropTarget(id)
          }}
          onDragLeave={event => { if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setDropTarget(current => current === id ? null : current) }}
          onDrop={event => handleDrop(event, id)}>
          <header className="project-board-column-head">
            <Icon size={18} aria-hidden="true"/>
            <h3 id={'project-stage-'+sectionId}>{label}</h3>
            <span className="project-board-count" aria-label={cards.length+' projetos'}>{cards.length}</span>
          </header>
          {cards.length > 0 ? <ul className="project-board-cards">{cards.map(project => <li key={project.id}>
            <article className="project-board-card"
              draggable={writable&&!busyId}
              onDragStart={event => {
                dragging.current = project
                event.dataTransfer.effectAllowed = 'move'
                event.dataTransfer.setData('text/plain', project.id)
              }}
              onDragEnd={() => { dragging.current = null; setDropTarget(null) }}>
              <button className="project-board-open" type="button" onClick={() => onOpen(project.id)}>
                <span>{project.name}</span><ArrowUpRight aria-hidden="true" size={16}/>
              </button>
              {project.description && <p className="project-board-description">{project.description}</p>}
              <dl className="project-board-facts">
                <dt>Situação</dt><dd>{projectStageLabel(project.status)}</dd>
                <dt>Registro mais recente</dt><dd>{projectUpdateSource(project.latest_update_kind)}</dd>
                <dt>Próxima ação</dt><dd>{project.next_step || 'Ainda não definida'}</dd>
                {project.current_milestone && <><dt>Marco em aberto</dt><dd>{project.current_milestone}</dd></>}
                {project.blockers && <><dt>Bloqueio</dt><dd>{project.blockers}</dd></>}
              </dl>
              <ProjectProgress project={project}/>
              <p className="project-board-date">Atualização: {civilDate(project.updated_at)}</p>
              {writable&&<MoveControl project={project} disabled={Boolean(busyId)} onMove={destination => void move(project, destination)}/>}
            </article>
          </li>)}</ul> : <p className="project-board-empty">Nenhum projeto nesta etapa.</p>}
        </section>
      })}
    </div>
  </section>
}

function MoveControl({ project, disabled, onMove }: {
  project: PersonalProject
  disabled: boolean
  onMove: (destination: ProjectStage) => void
}) {
  const [choice, setChoice] = useState<ProjectStage | ''>('')
  return <form className="project-board-move" onSubmit={event => { event.preventDefault(); if (choice && !disabled) onMove(choice) }}>
    <label>
      <span className="sr-only">{'Mover '+project.name+' para'}</span>
      <select value={choice} onChange={event => setChoice(event.target.value as ProjectStage | '')} disabled={disabled}>
        <option value="">Mover para…</option>
        {pipelineStages.filter(stage => stage !== project.pipeline_stage).map(stage => <option value={stage} key={stage}>{pipelineLabels[stage]}</option>)}
      </select>
    </label>
    <button type="submit" className="button button-secondary" aria-label={'Mover '+project.name} disabled={!choice || disabled}><ArrowRight size={16} aria-hidden="true"/></button>
  </form>
}

function ProjectProgress({ project }: { project: PersonalProject }) {
  const { milestone_count: total, completed_count: complete } = project
  if (!total) return <p className="project-board-progress-label">Sem marcos definidos</p>
  const value = Math.round(complete / total * 100)
  return <div className="personal-progress project-board-progress">
    <progress value={value} max={100} aria-label={'Progresso de '+project.name}/>
    <span>{complete}/{total} marcos</span>
  </div>
}
