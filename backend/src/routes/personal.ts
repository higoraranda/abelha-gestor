import { mutationGuard } from '../middleware/mutation-guard'
import { Router, type RequestHandler, type Request, type Response } from 'express'
import { randomUUID } from 'node:crypto'
import { db } from '../db'
import { authMiddleware } from '../middleware/auth'
import { tenantMiddleware } from '../middleware/tenant'
import { postgresDatabase, type Database } from '../services/platform-db'
import { InputError, uuid, text, githubRepo, reportInput, subscriptionInput, hash, safePersonalUrl } from '../services/personal'
import { registerPersonalFinance } from './personal-finance'
import { registerPersonalPrices } from './personal-prices'
import { weeklyReview } from '../services/personal-automation'
import { pipelineMove, pipelineLinks, stageLabel, type PipelineStage } from '../services/project-pipeline'
import { memberModuleAllowed, moduleForMemberRoute } from '../services/member-modules'

export type Scope={org:string;user:string}
export function endpoint(handler:(req:Request,res:Response)=>Promise<unknown>):RequestHandler {
  return (req,res)=>{void handler(req,res).catch((error:any)=>{
    if(error instanceof InputError) {res.status(error.status).json({error:error.message});return}
    if(['23505','23514','22P02','22007','22008'].includes(error.code)) {res.status(409).json({error:'Registro já existente ou dados inválidos. Atualize a tela e confira os campos.'});return}
    if(error.code==='23503') {res.status(404).json({error:'Registro relacionado não encontrado nesta conta.'});return}
    res.status(503).json({error:['42P01','42703'].includes(error.code)?'O Abelha Personal aguarda a atualização autorizada do banco. Os dados do CRM foram preservados.':'Não foi possível concluir a operação. Tente novamente.'})
  })}
}
export const scope=(res:Response)=>res.locals.personal as Scope
export function ownerMiddleware(sql:Database):RequestHandler {
  return (req,res,next)=>{void (async()=>{
    const org=req.organizationId
    if(!org) throw new InputError('Não autorizado.',401)
    const users=await sql.query('SELECT id FROM users WHERE organization_id=$1'+(req.user?' AND id=$2':'')+' LIMIT 2',req.user?[org,req.user.userId]:[org])
    if(users.length!==1) throw new InputError('Não foi possível identificar um único usuário nesta carteira.',503)
    res.locals.personal={org,user:users[0].id};next()
  })().catch(error=>{res.status(error instanceof InputError?error.status:503).json({error:error instanceof InputError?error.message:'Não foi possível acessar sua conta.'})})}
}
export { mutationGuard } from '../middleware/mutation-guard'
export async function notice(sql:Database,owner:Scope,key:string,title:string,detail:string,url:string) {
  await sql.query('INSERT INTO personal_notifications(organization_id,user_id,event_key,title,detail,url) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(organization_id,user_id,event_key) DO NOTHING',[owner.org,owner.user,key,title,detail,safePersonalUrl(url)])
}
export function createPersonalRouter(sql:Database=postgresDatabase(db),middleware:RequestHandler[]=[authMiddleware,tenantMiddleware]) {
  const router=Router(); router.use(...middleware,mutationGuard,(req,res,next)=>{
    if(req.user?.role!=='member')return next()
    const module=moduleForMemberRoute(req.method,req.path,req.body)
    if(!module){res.status(403).json({error:'Recurso não disponível nesta conta.'});return}
    void memberModuleAllowed(sql,req.user,module).then(allowed=>{
      if(allowed)next()
      else res.status(403).json({error:'O módulo não está habilitado nesta conta.'})
    }).catch(()=>{res.status(503).json({error:'Não foi possível confirmar o acesso a este módulo.'})})
  },ownerMiddleware(sql))
  router.get('/preferences',endpoint(async(_req,res)=>{
    const {org,user}=scope(res)
    const [preferences]=await sql.query('SELECT morning_time,weekly_time,timezone FROM personal_preferences WHERE organization_id=$1 AND user_id=$2',[org,user])
    res.json({preferences:preferences||{morning_time:null,weekly_time:null,timezone:'America/Sao_Paulo'},push_configured:Boolean(process.env.VAPID_PUBLIC_KEY&&process.env.VAPID_PRIVATE_KEY&&process.env.VAPID_SUBJECT),vapid_public_key:process.env.VAPID_PUBLIC_KEY||null})
  }))
  router.patch('/preferences',endpoint(async(req,res)=>{
    const {org,user}=scope(res);const time=(v:unknown)=>{if(v===null||v==='')return null;if(typeof v!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(v))throw new InputError('Horário inválido.');return v}
    const rows=await sql.query('INSERT INTO personal_preferences(organization_id,user_id,morning_time,weekly_time) VALUES($1,$2,$3,$4) ON CONFLICT(organization_id,user_id) DO UPDATE SET morning_time=excluded.morning_time,weekly_time=excluded.weekly_time RETURNING morning_time,weekly_time,timezone',[org,user,time(req.body.morning_time),time(req.body.weekly_time)]);res.json(rows[0])
  }))
  router.post('/push-subscriptions',endpoint(async(req,res)=>{
    if(!process.env.VAPID_PUBLIC_KEY||!process.env.VAPID_PRIVATE_KEY||!process.env.VAPID_SUBJECT)throw new InputError('Notificações push aguardam configuração do servidor.',503)
    const {org,user}=scope(res);const input=subscriptionInput(req.body)
    const [saved]=await sql.query('INSERT INTO push_subscriptions(organization_id,user_id,endpoint,endpoint_hash,p256dh,auth) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(endpoint_hash) DO UPDATE SET p256dh=excluded.p256dh,auth=excluded.auth WHERE push_subscriptions.organization_id=excluded.organization_id AND push_subscriptions.user_id=excluded.user_id RETURNING id',[org,user,input.endpoint,hash(input.endpoint),input.keys.p256dh,input.keys.auth])
    if(!saved)throw new InputError('Este dispositivo está vinculado a outra conta. Desative a inscrição anterior antes de trocar.',409)
    res.status(201).json({id:saved.id})
  }))
  router.delete('/push-subscriptions',endpoint(async(req,res)=>{
    const {org,user}=scope(res);await sql.query('DELETE FROM push_subscriptions WHERE organization_id=$1 AND user_id=$2 AND endpoint_hash=$3',[org,user,hash(text(req.body.endpoint,4096))]);res.status(204).end()
  }))
  router.get('/notifications',endpoint(async(_req,res)=>{const {org,user}=scope(res);res.json(await sql.query('SELECT id,title,detail,url,read_at,created_at FROM personal_notifications WHERE organization_id=$1 AND user_id=$2 AND NOT dismissed ORDER BY created_at DESC LIMIT 100',[org,user]))}))
  router.patch('/notifications/:id',endpoint(async(req,res)=>{
    const {org,user}=scope(res);if(typeof req.body.read!=='boolean'&&typeof req.body.dismissed!=='boolean')throw new InputError('Informe a ação do aviso.')
    const [row]=await sql.query('UPDATE personal_notifications SET read_at=CASE WHEN $4::boolean IS NULL THEN read_at WHEN $4 THEN now() ELSE NULL END,dismissed=COALESCE($5::boolean,dismissed) WHERE organization_id=$1 AND user_id=$2 AND id=$3 RETURNING id',[org,user,uuid(req.params.id),req.body.read??null,req.body.dismissed??null]);if(!row)throw new InputError('Aviso não encontrado.',404);res.json(row)
  }))
  router.get('/projects',endpoint(async(_req,res)=>{
    const {org,user}=scope(res);res.json(await sql.query(`SELECT p.*,count(m.id)::int AS milestone_count,count(m.id) FILTER(WHERE m.completed_at IS NOT NULL)::int AS completed_count,(SELECT title FROM personal_milestones current_stage WHERE current_stage.organization_id=p.organization_id AND current_stage.user_id=p.user_id AND current_stage.project_id=p.id AND current_stage.completed_at IS NULL ORDER BY current_stage.position,current_stage.id LIMIT 1) AS current_milestone,(SELECT kind FROM personal_project_updates u WHERE u.organization_id=p.organization_id AND u.user_id=p.user_id AND u.project_id=p.id ORDER BY u.created_at DESC,u.id DESC LIMIT 1) AS latest_update_kind FROM personal_projects p LEFT JOIN personal_milestones m ON m.project_id=p.id AND m.organization_id=p.organization_id AND m.user_id=p.user_id WHERE p.organization_id=$1 AND p.user_id=$2 GROUP BY p.id ORDER BY p.updated_at DESC LIMIT 100`,[org,user]))
  }))
  router.post('/projects',endpoint(async(req,res)=>{
    const {org,user}=scope(res);const b=req.body
    const [row]=await sql.query('INSERT INTO personal_projects(organization_id,user_id,name,description,repository,main_branch,next_step) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',[org,user,text(b.name),text(b.description??'',10000,true),b.repository?githubRepo(b.repository):null,text(b.main_branch||'main'),text(b.next_step??'',2000,true)]);res.status(201).json(row)
  }))
  router.get('/projects/:id',endpoint(async(req,res)=>{
    const {org,user}=scope(res);const id=uuid(req.params.id)
    const [project]=await sql.query('SELECT * FROM personal_projects WHERE organization_id=$1 AND user_id=$2 AND id=$3',[org,user,id]);if(!project)throw new InputError('Projeto não encontrado.',404)
    const milestones=await sql.query('SELECT * FROM personal_milestones WHERE organization_id=$1 AND user_id=$2 AND project_id=$3 ORDER BY position,id',[org,user,id])
    const updates=await sql.query('SELECT * FROM personal_project_updates WHERE organization_id=$1 AND user_id=$2 AND project_id=$3 ORDER BY created_at DESC LIMIT 100',[org,user,id]);res.json({project,milestones,updates})
  }))
  router.patch('/projects/:id',endpoint(async(req,res)=>{
    const {org,user}=scope(res);const b=req.body;const status=text(b.status,20)
    if(!['planned','active','paused','done'].includes(status))throw new InputError('Situação inválida.')
    const row=await sql.transaction(async tx=>{
      const [project]=await tx.query('SELECT id FROM personal_projects WHERE organization_id=$1 AND user_id=$2 AND id=$3 FOR UPDATE',[org,user,uuid(req.params.id)]);if(!project)throw new InputError('Projeto não encontrado.',404)
      if(status==='done') {const [counts]=await tx.query('SELECT count(*)::int AS total,count(*) FILTER(WHERE completed_at IS NOT NULL)::int AS completed FROM personal_milestones WHERE organization_id=$1 AND user_id=$2 AND project_id=$3',[org,user,project.id]);if(!counts.total||counts.total!==counts.completed)throw new InputError('Conclua os marcos revisados antes de finalizar o projeto.')}
      const [row]=await tx.query('UPDATE personal_projects SET status=$4,next_step=COALESCE($5,next_step),blockers=COALESCE($6,blockers),updated_at=now() WHERE organization_id=$1 AND user_id=$2 AND id=$3 RETURNING *',[org,user,project.id,status,b.next_step===undefined?null:text(b.next_step,2000,true),b.blockers===undefined?null:text(b.blockers,5000,true)]);return row
    });res.json(row)
  }))
  router.patch('/projects/:id/pipeline',endpoint(async(req,res)=>{
    const {org,user}=scope(res),id=uuid(req.params.id),input=pipelineMove(req.body)
    const updated=await sql.transaction(async tx=>{
      const [project]=await tx.query('SELECT * FROM personal_projects WHERE organization_id=$1 AND user_id=$2 AND id=$3 FOR UPDATE',[org,user,id])
      if(!project)throw new InputError('Projeto não encontrado.',404)
      if(!Object.hasOwn(project,'pipeline_stage'))throw new InputError('O quadro de etapas aguarda a atualização do banco de dados.',503)
      const stage=project.pipeline_stage as PipelineStage|null
      if(stage===input.stage)return project
      if(stage!==input.expected)throw new InputError('A etapa mudou em outra sessão. Atualize o quadro e tente novamente.',409)
      if(input.stage==='completed'){
        const [counts]=await tx.query('SELECT count(*)::int AS total,count(*) FILTER(WHERE completed_at IS NOT NULL)::int AS completed FROM personal_milestones WHERE organization_id=$1 AND user_id=$2 AND project_id=$3',[org,user,id])
        if(!counts.total||counts.total!==counts.completed)throw new InputError('Conclua os marcos revisados antes de finalizar o projeto.')
      }
      const [row]=await tx.query('UPDATE personal_projects SET pipeline_stage=$4,updated_at=now() WHERE organization_id=$1 AND user_id=$2 AND id=$3 RETURNING *',[org,user,id,input.stage])
      await tx.query("INSERT INTO personal_project_updates(organization_id,user_id,project_id,event_key,kind,summary) VALUES($1,$2,$3,$4,'decision',$5)",[org,user,id,'pipeline:'+randomUUID(),'Etapa movida: '+stageLabel(stage)+' → '+stageLabel(input.stage)+'.'])
      return row
    })
    res.json(updated)
  }))
  router.patch('/projects/:id/links',endpoint(async(req,res)=>{
    const {org,user}=scope(res),id=uuid(req.params.id),links=pipelineLinks(req.body)
    const [row]=await sql.query('UPDATE personal_projects SET pipeline_links=$4::text::jsonb,updated_at=now() WHERE organization_id=$1 AND user_id=$2 AND id=$3 RETURNING id,pipeline_links',[org,user,id,JSON.stringify(links)])
    if(!row)throw new InputError('Projeto não encontrado.',404)
    res.json(row)
  }))
  router.delete('/projects/:id',endpoint(async(req,res)=>{
    const {org,user}=scope(res);const id=uuid(req.params.id)
    await sql.transaction(async tx=>{
      const [project]=await tx.query('SELECT id,name FROM personal_projects WHERE organization_id=$1 AND user_id=$2 AND id=$3 FOR UPDATE',[org,user,id])
      if(!project)throw new InputError('Projeto não encontrado.',404)
      if(typeof req.body?.confirmation_name!=='string'||req.body.confirmation_name!==project.name)throw new InputError('Digite exatamente o nome do projeto para confirmar a exclusão.')
      await tx.query("DELETE FROM personal_notifications WHERE organization_id=$1 AND user_id=$2 AND (url=$3 OR event_key IN (SELECT 'report:'||id::text FROM personal_project_updates WHERE organization_id=$1 AND user_id=$2 AND project_id=$4 AND kind='report'))",[org,user,'/?space=personal&view=personal-projects&record='+project.id,project.id])
      await tx.query('DELETE FROM personal_projects WHERE organization_id=$1 AND user_id=$2 AND id=$3',[org,user,project.id])
    });res.status(204).end()
  }))
  router.post('/projects/:id/milestones',endpoint(async(req,res)=>{
    const {org,user}=scope(res);const id=uuid(req.params.id)
    const row=await sql.transaction(async tx=>{
      const [project]=await tx.query("SELECT id,status,to_jsonb(personal_projects)->>'pipeline_stage' AS pipeline_stage FROM personal_projects WHERE organization_id=$1 AND user_id=$2 AND id=$3 FOR UPDATE",[org,user,id]);if(!project)throw new InputError('Projeto não encontrado.',404)
      if(project.status==='done'||project.pipeline_stage==='completed')throw new InputError('Reabra o projeto antes de acrescentar um marco.',409)
      const [row]=await tx.query('INSERT INTO personal_milestones(organization_id,user_id,project_id,title,acceptance,position) VALUES($1,$2,$3,$4,$5,(SELECT count(*) FROM personal_milestones WHERE organization_id=$1 AND user_id=$2 AND project_id=$3)) RETURNING *',[org,user,id,text(req.body.title),text(req.body.acceptance,5000)])
      await tx.query('UPDATE personal_projects SET updated_at=now() WHERE organization_id=$1 AND user_id=$2 AND id=$3',[org,user,id]);return row
    });res.status(201).json(row)
  }))
  router.post('/projects/:id/decisions',endpoint(async(req,res)=>{
    const {org,user}=scope(res)
    const [row]=await sql.query("INSERT INTO personal_project_updates(organization_id,user_id,project_id,event_key,kind,summary) VALUES($1,$2,$3,$4,'decision',$5) RETURNING *",[org,user,uuid(req.params.id),'decision:'+randomUUID(),text(req.body.summary,10000)]);res.status(201).json(row)
  }))
  router.post('/projects/:id/reports',endpoint(async(req,res)=>{res.status(201).json(await receiveReport(sql,scope(res),uuid(req.params.id),req.body))}))
  router.post('/projects/:id/milestones/:milestone/complete',endpoint(async(req,res)=>{
    const owner=scope(res);const {org,user}=owner
    if(req.body.reviewed!==true)throw new InputError('Revise as evidências e os critérios antes de concluir.')
    const result=await sql.transaction(async tx=>{
      const [project]=await tx.query('SELECT id FROM personal_projects WHERE organization_id=$1 AND user_id=$2 AND id=$3 FOR UPDATE',[org,user,uuid(req.params.id)]);if(!project)throw new InputError('Projeto não encontrado.',404)
      const [update]=await tx.query("SELECT * FROM personal_project_updates WHERE organization_id=$1 AND user_id=$2 AND project_id=$3 AND id=$4 AND kind='report'",[org,user,project.id,uuid(req.body.report_id)]);if(!update)throw new InputError('Relatório não encontrado neste projeto.',404)
      const [milestone]=await tx.query('UPDATE personal_milestones SET completed_at=COALESCE(completed_at,now()),evidence=COALESCE(evidence,$5::text::jsonb) WHERE organization_id=$1 AND user_id=$2 AND project_id=$3 AND id=$4 RETURNING *',[org,user,project.id,uuid(req.params.milestone),JSON.stringify({report_id:update.id,commit:update.report.commit,reviewed_by:user,method:'human_review'})]);if(!milestone)throw new InputError('Marco não encontrado.',404)
      await tx.query('UPDATE personal_project_updates SET reviewed_at=COALESCE(reviewed_at,now()) WHERE organization_id=$1 AND user_id=$2 AND id=$3',[org,user,update.id])
      await tx.query("INSERT INTO personal_project_updates(organization_id,user_id,project_id,event_key,kind,summary) VALUES($1,$2,$3,$4,'milestone',$5) ON CONFLICT DO NOTHING",[org,user,project.id,'milestone:'+milestone.id,'Marco revisado: '+milestone.title])
      await tx.query('UPDATE personal_projects SET updated_at=now() WHERE organization_id=$1 AND user_id=$2 AND id=$3',[org,user,project.id]);return milestone
    });res.json(result)
  }))
  registerPersonalFinance(router,sql)
  registerPersonalPrices(router,sql)
  router.get('/reviews',endpoint(async(_req,res)=>{const {org,user}=scope(res);res.json(await sql.query('SELECT * FROM personal_weekly_reviews WHERE organization_id=$1 AND user_id=$2 ORDER BY week_of DESC LIMIT 52',[org,user]))}))
  router.post('/reviews',endpoint(async(_req,res)=>{res.status(201).json(await weeklyReview(sql,scope(res)))}))
  return router
}
export async function receiveReport(sql:Database,owner:Scope,projectId:string,body:unknown,expectedRepository?:string) {
  return sql.transaction(async tx=>{
    const {org,user}=owner;const [project]=await tx.query('SELECT * FROM personal_projects WHERE organization_id=$1 AND user_id=$2 AND id=$3 FOR UPDATE',[org,user,projectId]);if(!project)throw new InputError('Projeto não encontrado.',404)
    if(!project.repository)throw new InputError('Cadastre o repositório do projeto antes de enviar relatórios.')
    if(expectedRepository&&githubRepo(project.repository)!==expectedRepository)
      throw new InputError('Vínculo do repositório alterado. Consulte os projetos autorizados.',409)
    const report=reportInput(body,project.repository)
    const [row]=await tx.query("INSERT INTO personal_project_updates(organization_id,user_id,project_id,event_key,kind,summary,report) VALUES($1,$2,$3,$4,'report',$5,$6::text::jsonb) ON CONFLICT(organization_id,user_id,event_key) DO NOTHING RETURNING *",[org,user,projectId,'report:'+projectId+':'+report.event_id,report.summary,JSON.stringify(report)])
    if(!row) {const [existing]=await tx.query('SELECT * FROM personal_project_updates WHERE organization_id=$1 AND user_id=$2 AND event_key=$3',[org,user,'report:'+projectId+':'+report.event_id]);if(JSON.stringify(existing.report)!==JSON.stringify(report)) {if(hash(JSON.stringify(sortObject(existing.report)))!==hash(JSON.stringify(sortObject(report))))throw new InputError('O identificador do relatório já foi usado com outro conteúdo.',409)}return existing}
    await tx.query('UPDATE personal_projects SET updated_at=now() WHERE organization_id=$1 AND user_id=$2 AND id=$3',[org,user,projectId])
    await notice(tx,owner,'report:'+row.id,'Relatório de projeto recebido','Revise as evidências antes de concluir um marco.','/?space=personal&view=personal-projects&record='+projectId)
    return row
  })
}
function sortObject(value:any):any {return Array.isArray(value)?value.map(sortObject):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,sortObject(value[key])])):value}
