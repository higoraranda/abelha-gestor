import { Router, json, type RequestHandler } from 'express'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { db } from '../db'
import { postgresDatabase, type Database } from '../services/platform-db'
import { endpoint, scope, receiveReport, type Scope } from './personal'
import { InputError, uuid, text, githubRepo, hash } from '../services/personal'
import { receivePrice } from './personal-prices'
import { automationTick, weeklyReview } from '../services/personal-automation'
import { searchLeads } from '../services/leads'
import { integer } from '../services/personal'
import { stagePublicLead } from '../services/lead-candidates'
import { allowedCodexProjects, codexReportAccess, selectCodexProject } from '../services/codex-report-scope'

declare global {namespace Express {interface Request {githubRawBody?:Buffer}}}
export const githubJsonParser=json({limit:'2mb',verify:(req,_res,buffer)=>{(req as import('express').Request).githubRawBody=Buffer.from(buffer)}})
export function secretMatches(actual:string,expected:string) {
  const actualBytes=Buffer.from(actual),expectedBytes=Buffer.from(expected)
  return expected.length>=32&&actualBytes.length===expectedBytes.length&&timingSafeEqual(actualBytes,expectedBytes)
}
export function verifyGithub(raw:Buffer,signature:string,secret:string) {
  const expected='sha256='+createHmac('sha256',secret).update(raw).digest('hex')
  return secret.length>=32&&/^sha256=[a-f0-9]{64}$/.test(signature)&&timingSafeEqual(Buffer.from(signature),Buffer.from(expected))
}
async function integrationOwner(sql:Database):Promise<Scope> {
  const org=process.env.ABELHA_INTEGRATION_ORGANIZATION_ID,user=process.env.ABELHA_INTEGRATION_USER_ID
  if(!org||!user)throw new InputError('Integração sem conta configurada.',503)
  uuid(org);uuid(user)
  const [exists]=await sql.query('SELECT id FROM users WHERE organization_id=$1 AND id=$2',[org,user]);if(!exists)throw new InputError('Conta da integração indisponível.',503)
  return {org,user}
}
export function createIntegrationsRouter(sql:Database=postgresDatabase(db)) {
  const router=Router()
  router.post('/github',endpoint(async(req,res)=>{
    if(!req.githubRawBody||!verifyGithub(req.githubRawBody,req.get('X-Hub-Signature-256')||'',process.env.GITHUB_WEBHOOK_SECRET||''))throw new InputError('Assinatura GitHub inválida.',401)
    const owner=await integrationOwner(sql);const event=text(req.get('X-GitHub-Event'),80),delivery=text(req.get('X-GitHub-Delivery'),100)
    if(event==='ping'){res.json({received:true});return}
    if(!['push','pull_request','workflow_run'].includes(event)){res.status(202).json({ignored:true});return}
    const repository=githubRepo(req.body.repository?.html_url)
    const result=await sql.transaction(async tx=>{
      const projects=await tx.query('SELECT id FROM personal_projects WHERE organization_id=$1 AND user_id=$2 AND lower(repository)=lower($3) ORDER BY id',[owner.org,owner.user,repository]);let recorded=0
      for(const project of projects){
        const [saved]=await tx.query("INSERT INTO personal_project_updates(organization_id,user_id,project_id,event_key,kind,summary,report) VALUES($1,$2,$3,$4,'github',$5,$6::text::jsonb) ON CONFLICT DO NOTHING RETURNING id",[owner.org,owner.user,project.id,'github:'+project.id+':'+delivery,'Evento GitHub: '+event,JSON.stringify({event,delivery,repository,action:typeof req.body.action==='string'?req.body.action.slice(0,100):null,conclusion:typeof req.body.workflow_run?.conclusion==='string'?req.body.workflow_run.conclusion:null})])
        if(saved){await tx.query('UPDATE personal_projects SET updated_at=now() WHERE organization_id=$1 AND user_id=$2 AND id=$3',[owner.org,owner.user,project.id]);recorded++}
      }
      return {matched:projects.length,recorded}
    })
    res.json({received:true,matched_projects:result.matched,recorded_updates:result.recorded,completed_milestones:0})
  }))
  async function codexContext(header:string) {
    const access=codexReportAccess(header,process.env)
    if(!access.configured) throw new InputError('Integração Codex não configurada.',503)
    if(!access.grants) throw new InputError('Token de relatório inválido.',401)
    const owner=await integrationOwner(sql)
    return {owner,access,projects:await allowedCodexProjects(sql,owner,access.grants)}
  }
  router.get('/codex/projects',endpoint(async(req,res)=>{
    const context=await codexContext(req.get('Authorization')||'')
    res.json({projects:context.projects})
  }))
  router.post('/codex/report',endpoint(async(req,res)=>{
    const {owner,access,projects}=await codexContext(req.get('Authorization')||'')
    const envelope=req.body && typeof req.body==='object' && Object.hasOwn(req.body,'report')
    if(!access.legacy&&!envelope)throw new InputError('Informe o projeto e o relatório.',400)
    const project=selectCodexProject(projects,envelope?req.body.project:undefined,access.legacy)
    const saved=await receiveReport(sql,owner,project,envelope?req.body.report:req.body,projects.find(row=>row.id===project)?.repository)
    res.status(201).json({report_id:saved.id,status:'pending_review'})
  }))
  const authorize:RequestHandler=(req,res,next)=>{void (async()=>{
    if(!process.env.ABELHA_INTEGRATION_TOKEN)throw new InputError('Integração não configurada.',503)
    if(!secretMatches((req.get('Authorization')||'').replace(/^Bearer /,''),process.env.ABELHA_INTEGRATION_TOKEN))throw new InputError('Token de integração inválido.',401)
    res.locals.personal=await integrationOwner(sql);next()
  })().catch(error=>res.status(error instanceof InputError?error.status:503).json({error:error instanceof InputError?error.message:'Integração indisponível.'}))}
  router.use(authorize)
  router.post('/projects/:id/reports',endpoint(async(req,res)=>{res.status(201).json(await receiveReport(sql,scope(res),uuid(req.params.id),req.body))}))
  router.post('/leads/search',endpoint(async(req,res)=>{res.json(await searchLeads(scope(res).org,text(req.body.niche,80),text(req.body.city,100),integer(req.body.limit,1,50)))}))
  router.post('/leads/stage',endpoint(async(req,res)=>{
    const {candidate,reused}=await stagePublicLead(sql,scope(res).org,req.body)
    res.status(201).json({id:candidate.id,reused,review_required:!candidate.client_id&&!candidate.reviewed_at})
  }))
  router.post('/tick',endpoint(async(_req,res)=>{res.json(await automationTick(sql,scope(res)))}))
  router.post('/weekly-review',endpoint(async(_req,res)=>{res.status(201).json(await weeklyReview(sql,scope(res)))}))
  router.get('/prices/due',endpoint(async(_req,res)=>{
    if(!process.env.PRICE_ALLOWED_HOSTS)throw new InputError('Configure uma fonte autorizada de preços antes de ativar consultas.',503)
    const {org,user}=scope(res)
    res.json(await sql.query("SELECT id,name,product_url,stores,target,interval_minutes FROM personal_price_watches WHERE organization_id=$1 AND user_id=$2 AND active AND (last_checked_at IS NULL OR last_checked_at<=now()-interval_minutes*interval '1 minute') ORDER BY last_checked_at NULLS FIRST LIMIT 20",[org,user]))
  }))
  router.post('/prices/:id/observations',endpoint(async(req,res)=>{res.status(201).json(await receivePrice(sql,scope(res),uuid(req.params.id),req.body))}))
  router.post('/leads/capture',endpoint(async(req,res)=>{
    const {org}=scope(res);const b=req.body;const key=text(b.event_id,160)
    if(!['email','form'].includes(b.source))throw new InputError('Fonte de captura inválida.')
    const data={name:text(b.name),phone:text(b.phone||'',100,true),email:text(b.email||'',255,true),summary:text(b.summary,10000),classification:text(b.classification||'Revisar',160),classified_by:'external-unverified',evidence_reference:text(b.evidence_reference,500)}
    const [row]=await sql.query('INSERT INTO crm_lead_candidates(organization_id,source,source_key,data) VALUES($1,$2,$3,$4::text::jsonb) ON CONFLICT(organization_id,source,source_key) DO NOTHING RETURNING id',[org,b.source,key,JSON.stringify(data)])
    const [existing]=await sql.query('SELECT id,data FROM crm_lead_candidates WHERE organization_id=$1 AND source=$2 AND source_key=$3',[org,b.source,key])
    if(!row&&hash(JSON.stringify(existing.data))!==hash(JSON.stringify(data))) {const same=Object.keys(data).every(k=>existing.data[k]===data[k as keyof typeof data]);if(!same)throw new InputError('Evento já recebido com outro conteúdo.',409)}
    res.status(201).json({id:row?.id||existing.id,review_required:true,reused:!row})
  }))
  return router
}
