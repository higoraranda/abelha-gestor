import { useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { api } from '@/lib/api'
import { pipelineLabels, pipelineLinkLabels, pipelineStages, type PipelineLink } from '@/lib/personalProjectStatus'
import type { PersonalProject, ProjectMilestone } from '@/types/personal'

export default function ProjectRoadmap({project,milestones}:{project:PersonalProject;milestones:ProjectMilestone[]}) {
  const [links,setLinks]=useState<Record<PipelineLink,string>>({
    development:project.pipeline_links?.development??'',
    staging:project.pipeline_links?.staging??'',
    production:project.pipeline_links?.production??'',
  })
  const [busy,setBusy]=useState(false)
  const [notice,setNotice]=useState('')
  const [error,setError]=useState('')
  async function save(event:React.FormEvent) {
    event.preventDefault()
    if(busy)return
    setBusy(true);setError('');setNotice('')
    try {
      await api.patch('/api/v1/personal/projects/'+project.id+'/links',links)
      setNotice('Links atualizados.')
    } catch (cause) {setError(cause instanceof Error?cause.message:'Não foi possível salvar.')}
    finally {setBusy(false)}
  }
  const environments=Object.entries(pipelineLinkLabels) as [PipelineLink,string][]
  const reviewed=milestones.filter(milestone=>milestone.completed_at).length
  return <section className="crm-panel personal-section project-roadmap" aria-labelledby="project-roadmap-title">
    <div><p className="eyebrow">ETAPAS DO PROJETO</p><h2 id="project-roadmap-title">Roadmap</h2></div>
    {!project.pipeline_stage&&<p className="page-subtitle">Sem etapa definida. Escolha uma etapa no quadro sem modificar o estado original.</p>}
    <ol className="project-roadmap-stages" aria-label="Etapas possíveis">
      {pipelineStages.map(stage=><li className="status-pill" aria-current={project.pipeline_stage===stage?'step':undefined} key={stage}>{pipelineLabels[stage]}</li>)}
    </ol>
    <p className="page-subtitle">A etapa informada não certifica publicação nem conclui atividades por conta própria.</p>
    <h3>Checklist de atividades dos marcos</h3>
    {milestones.length ? <><p>{reviewed} de {milestones.length} marcos revisados</p><ul className="project-roadmap-checklist">
      {milestones.map(milestone=><li key={milestone.id}><span>{milestone.completed_at?'Revisado':'Pendente'}:</span> {milestone.title}</li>)}
    </ul></> : <p>Nenhum marco cadastrado. Adicione os critérios de aceite nos detalhes abaixo.</p>}
    <h3>Links dos ambientes</h3>
    {project.pipeline_links===undefined ? <p className="page-subtitle">Os links dos ambientes aguardam a atualização do banco.</p> : <form className="crm-form" onSubmit={save}>
      {environments.map(([key,label])=><label key={key}>{label}<input type="url" value={links[key]} maxLength={500} onChange={event=>setLinks({...links,[key]:event.target.value})} placeholder="https://…" /></label>)}
      {environments.map(([key,label])=>{const link=project.pipeline_links?.[key];return link?.startsWith('https://')?<a key={key} className="text-link" href={link} target="_blank" rel="noopener noreferrer">Abrir {label.toLowerCase()} <ArrowUpRight size={14}/></a>:null})}
      {notice&&<p role="status">{notice}</p>}{error&&<p className="form-error" role="alert">{error}</p>}
      <button className="button button-secondary" disabled={busy}>{busy?'Salvando…':'Salvar links'}</button>
    </form>}
  </section>
}
