import { Router, type RequestHandler } from 'express'
import { db } from '../db'
import { authMiddleware } from '../middleware/auth'
import { tenantMiddleware } from '../middleware/tenant'
import { endpoint, mutationGuard } from './personal'
import { postgresDatabase, type Database } from '../services/platform-db'
import { InputError, text, uuid, integer, publicUrl, NICHES } from '../services/personal'
import { SERVICE_TEMPLATES, searchLeads } from '../services/leads'
import { stagePublicLead, publicLeadInput } from '../services/lead-candidates'

export function createProspectingRouter(sql:Database=postgresDatabase(db),middleware:RequestHandler[]=[authMiddleware,tenantMiddleware]) {
  const router=Router();router.use(...middleware,mutationGuard)
  router.get('/leads/niches',(_req,res)=>res.json(Object.entries(NICHES).map(([id,value])=>({id,label:value.label}))))
  router.post('/leads/search',endpoint(async(req,res)=>{res.json(await searchLeads(req.organizationId!,text(req.body.niche,80),text(req.body.city,100),integer(req.body.limit,1,50)))}))
  router.get('/leads/candidates',endpoint(async(req,res)=>{res.json(await sql.query('SELECT id,source,data,client_id,reviewed_at,created_at FROM crm_lead_candidates WHERE organization_id=$1 AND client_id IS NULL AND reviewed_at IS NULL ORDER BY created_at,id LIMIT 100',[req.organizationId!]))}))
  router.post('/leads/import',endpoint(async(req,res)=>{
    const org=req.organizationId!;const {key}=publicLeadInput(req.body)
    const row=await sql.transaction(async tx=>{
      await stagePublicLead(tx,org,req.body)
      const [candidate]=await tx.query("SELECT * FROM crm_lead_candidates WHERE organization_id=$1 AND source='OpenStreetMap' AND source_key=$2 FOR UPDATE",[org,key]);return importCandidate(tx,org,candidate)
    });res.status(201).json(row)
  }))
  router.post('/leads/candidates/:id/approve',endpoint(async(req,res)=>{
    const org=req.organizationId!;const row=await sql.transaction(async tx=>{const [candidate]=await tx.query('SELECT * FROM crm_lead_candidates WHERE organization_id=$1 AND id=$2 FOR UPDATE',[org,uuid(req.params.id)]);if(!candidate)throw new InputError('Lead não encontrado.',404);return importCandidate(tx,org,candidate)});res.json(row)
  }))
  router.get('/templates',(_req,res)=>res.json(SERVICE_TEMPLATES))
  router.get('/drafts',endpoint(async(req,res)=>{res.json(await sql.query('SELECT d.*,c.name AS client_name FROM crm_service_drafts d JOIN clients c ON c.organization_id=d.organization_id AND c.id=d.client_id WHERE d.organization_id=$1 ORDER BY d.created_at DESC LIMIT 100',[req.organizationId!]))}))
  router.post('/drafts',endpoint(async(req,res)=>{
    const org=req.organizationId!;const b=req.body;const template=SERVICE_TEMPLATES.find(t=>t.id===b.template_key);if(!template)throw new InputError('Template não encontrado.')
    const client=uuid(b.client_id);const key=text(b.idempotency_key,160)
    const [parent]=await sql.query('SELECT name FROM clients WHERE organization_id=$1 AND id=$2',[org,client]);if(!parent)throw new InputError('Cliente não encontrado.',404)
    const title=template.name+' — '+(parent.name||'Cliente')
    const proposal=`${title}\n\nObjetivo\n${template.description}\n\nEscopo inicial\n${template.deliverables.map(item=>'• '+item).join('\n')}\n\nPrazo estimado: ${template.days} dias, sujeito à revisão.\n\nValores, critérios de aceite e condições serão definidos na revisão. Este rascunho não é um contrato.`
    const [saved]=await sql.query('INSERT INTO crm_service_drafts(organization_id,client_id,idempotency_key,template_key,title,proposal,checklist) VALUES($1,$2,$3,$4,$5,$6,$7::text::jsonb) ON CONFLICT(organization_id,idempotency_key) DO NOTHING RETURNING *',[org,client,key,template.id,title,proposal,JSON.stringify(template.deliverables.map(title=>({title,completed:false})))])
    const row=saved||(await sql.query('SELECT * FROM crm_service_drafts WHERE organization_id=$1 AND idempotency_key=$2',[org,key]))[0]
    if(row.client_id!==client||row.template_key!==template.id)throw new InputError('Esta operação já foi usada para outro projeto.',409)
    res.status(201).json(row)
  }))
  router.patch('/drafts/:id',endpoint(async(req,res)=>{
    const org=req.organizationId!;const b=req.body
    if(!Array.isArray(b.checklist)||b.checklist.length>100||b.checklist.some((item:any)=>typeof item.completed!=='boolean'))throw new InputError('Checklist inválido.')
    const checklist=b.checklist.map((item:any)=>({title:text(item.title),completed:item.completed}))
    const [row]=await sql.query('UPDATE crm_service_drafts SET title=$3,proposal=$4,checklist=$5::text::jsonb,confirmed_at=CASE WHEN $6 THEN COALESCE(confirmed_at,now()) ELSE confirmed_at END WHERE organization_id=$1 AND id=$2 RETURNING *',[org,uuid(req.params.id),text(b.title),text(b.proposal,30000),JSON.stringify(checklist),b.confirmed===true]);if(!row)throw new InputError('Rascunho não encontrado.',404);res.json(row)
  }))
  return router
}
async function importCandidate(tx:Database,org:string,candidate:any) {
  if(candidate.client_id)return {client_id:candidate.client_id,reused:true}
  const name=text(candidate.data.name);const phone=typeof candidate.data.phone==='string'?candidate.data.phone.replace(/\D/g,''):''
  // Serialize imports per organization before matching existing CRM identities.
  await tx.query('SELECT id FROM organizations WHERE id=$1 FOR UPDATE',[org])
  const email=typeof candidate.data.email==='string'?candidate.data.email.trim().toLowerCase():''
  const [existing]=await tx.query("SELECT id FROM clients WHERE organization_id=$1 AND (($2<>'' AND regexp_replace(COALESCE(whatsapp,''),'[^0-9]','','g')=$2) OR ($3<>'' AND lower(trim(email))=$3)) ORDER BY id LIMIT 1",[org,phone,email])
  const client=existing||(await tx.query('INSERT INTO clients(organization_id,name,whatsapp,email,notes) VALUES($1,$2,$3,$4,$5) RETURNING id',[org,name,phone||null,email||null,'Origem: '+candidate.source+'\n'+(candidate.data.source_url||'Captura revisada')]))[0]
  await tx.query('UPDATE crm_lead_candidates SET client_id=$3,reviewed_at=now() WHERE organization_id=$1 AND id=$2',[org,candidate.id,client.id]);return {client_id:client.id,reused:Boolean(existing)}
}
