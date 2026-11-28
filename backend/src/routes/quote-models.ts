import { Router, type RequestHandler } from 'express'
import { db } from '../db'
import { authMiddleware, requireOwner } from '../middleware/auth'
import { postgresDatabase, type Database } from '../services/platform-db'
import { InputError, uuid } from '../services/personal'
import { parseQuoteModel, calculateQuote } from '../services/quote-model'
import { endpoint, mutationGuard } from './personal'
import { parseProposal, proposalText, proposalPrompt } from '../services/quote-proposal'
import { memberModuleAllowed } from '../services/member-modules'

const proposalRow='id,client_id,client_name,title,briefing,model,quantities,quote,proposal_text,created_at,approved_at,refused_at,terms,status,status_history'
const legacyProposal=" AND to_jsonb(quote_proposals)->>'commercial' IS NULL"

export function createQuoteModelsRouter(database:Database=postgresDatabase(db),authenticate:RequestHandler=authMiddleware) {
  const router=Router()
  router.use(authenticate,mutationGuard,(req,res,next)=>{
    if(!req.user?.userId||!req.user.organizationId){res.status(401).json({error:'Entre na sua conta para usar suas calculadoras.'});return}
    if(req.user.role!=='member')return next()
    void memberModuleAllowed(database,req.user,'calculator').then(allowed=>{
      if(allowed)next()
      else res.status(403).json({error:'A calculadora não está habilitada nesta conta.'})
    }).catch(()=>{res.status(503).json({error:'Não foi possível confirmar o acesso à calculadora.'})})
  })
  router.get('/',endpoint(async(req,res)=>{
    const {organizationId,userId}=req.user!
    const models=await database.query('SELECT id,revision,model,updated_at FROM quote_models WHERE organization_id=$1 AND user_id=$2 ORDER BY updated_at DESC,id LIMIT 100',[organizationId,userId])
    res.json(models)
  }))
  router.post('/preview',endpoint(async(req,res)=>{
    const model=parseQuoteModel(req.body?.model)
    res.json({model,quote:calculateQuote(model,req.body?.quantities??{})})
  }))
  router.post('/',endpoint(async(req,res)=>{
    const {organizationId,userId}=req.user!
    const model=parseQuoteModel(req.body?.model)
    const entry=await database.transaction(async tx=>{
      const locked=await tx.query('SELECT id FROM users WHERE organization_id=$1 AND id=$2 FOR UPDATE',[organizationId,userId])
      if(!locked.length)throw new InputError('Sessão inválida.',401)
      const [count]=await tx.query('SELECT count(*)::int AS n FROM quote_models WHERE organization_id=$1 AND user_id=$2',[organizationId,userId])
      if(count.n>=100)throw new InputError('Limite de 100 modelos por conta.',409)
      const [saved]=await tx.query('INSERT INTO quote_models(organization_id,user_id,model) VALUES($1,$2,$3::text::jsonb) RETURNING id,revision,model,updated_at',[organizationId,userId,JSON.stringify(model)])
      return saved
    })
    res.status(201).json(entry)
  }))
  router.get('/proposals',requireOwner,endpoint(async(req,res)=>{
    const {organizationId,userId}=req.user!
    const proposals=await database.query('SELECT id,client_id,client_name,title,created_at,approved_at,refused_at,status FROM quote_proposals WHERE organization_id=$1 AND user_id=$2'+legacyProposal+' ORDER BY created_at DESC,id LIMIT 100',[organizationId,userId])
    res.json(proposals)
  }))
  router.post('/proposals',requireOwner,endpoint(async(req,res)=>{
    const {organizationId,userId}=req.user!
    const clientId=uuid(req.body?.clientId)
    const proposal=parseProposal(req.body)
    const saved=await database.transaction(async tx=>{
      const [contact]=await tx.query('SELECT name FROM clients WHERE organization_id=$1 AND id=$2 FOR KEY SHARE',[organizationId,clientId])
      if(!contact)throw new InputError('Cliente não encontrado na sua organização.',404)
      const clientName=String(contact.name??'').trim().slice(0,150)||'Cliente sem nome'
      const [result]=await tx.query('INSERT INTO quote_proposals(organization_id,user_id,client_id,client_name,title,briefing,model,quantities,quote,proposal_text,terms) VALUES($1,$2,$3,$4,$5,$6,$7::text::jsonb,$8::text::jsonb,$9::text::jsonb,$10,$11) RETURNING '+proposalRow,
        [organizationId,userId,clientId,clientName,proposal.title,proposal.briefing,JSON.stringify(proposal.model),JSON.stringify(proposal.quantities),JSON.stringify(proposal.quote),proposalText({...proposal,client_name:clientName}),proposal.terms])
      return result
    })
    res.status(201).json(saved)
  }))
  async function getProposal(organizationId:string,userId:string,id:string){
    const [entry]=await database.query('SELECT '+proposalRow+' FROM quote_proposals WHERE organization_id=$1 AND user_id=$2 AND id=$3'+legacyProposal,[organizationId,userId,id])
    if(!entry)throw new InputError('Orçamento não encontrado na sua conta.',404)
    return entry
  }
  router.get('/proposals/:id',requireOwner,endpoint(async(req,res)=>{
    res.json(await getProposal(req.user!.organizationId,req.user!.userId,uuid(req.params.id)))
  }))
  for(const action of ['approve','refuse'] as const) {
    router.post('/proposals/:id/'+action,requireOwner,endpoint(async(req,res)=>{
      if(req.body?.confirmed!==true || Object.keys(req.body).length!==1)throw new InputError('Confirme a decisão do cliente.')
      const {organizationId,userId}=req.user!,id=uuid(req.params.id)
      const decision=action==='approve'?'approved_at':'refused_at'
      const conflict=action==='approve'?'refused_at':'approved_at'
      const saved=await database.transaction(async tx=>{
        const [current]=await tx.query('SELECT '+proposalRow+' FROM quote_proposals WHERE organization_id=$1 AND user_id=$2 AND id=$3'+legacyProposal+' FOR UPDATE',[organizationId,userId,id])
        if(!current)throw new InputError('Orçamento não encontrado na sua conta.',404)
        if(current.status==='cancelled')throw new InputError('Este orçamento foi cancelado. Salve uma nova proposta.',409)
        if(current[conflict])throw new InputError('Este orçamento já tem outra decisão. Salve uma nova proposta para negociar outra versão.',409)
        if(current[decision])return current
        const [row]=await tx.query('UPDATE quote_proposals SET '+decision+"=now(),status=$4,status_history=status_history||jsonb_build_array(jsonb_build_object('status',$4::text,'at',now())) WHERE organization_id=$1 AND user_id=$2 AND id=$3 RETURNING "+proposalRow,[organizationId,userId,id,action==='approve'?'approved':'refused'])
        return row
      })
      res.json(saved)
    }))
  }
  router.get('/proposals/:id/prompt',requireOwner,endpoint(async(req,res)=>{
    const {organizationId,userId}=req.user!
    const entry=await getProposal(organizationId,userId,uuid(req.params.id))
    res.set('Cache-Control','no-store').json({prompt:proposalPrompt({title:entry.title,briefing:entry.briefing,client_name:entry.client_name,quote:entry.quote,quantities:entry.quantities,approved_at:entry.approved_at,refused_at:entry.refused_at})})
  }))
  router.post('/proposals/:id/status',requireOwner,endpoint(async(req,res)=>{
    const target=req.body?.status
    if(!['draft','sent','awaiting_approval','cancelled'].includes(target)||Object.keys(req.body).length!==1)throw new InputError('Estado comercial inválido.')
    const {organizationId,userId}=req.user!,id=uuid(req.params.id)
    const saved=await database.transaction(async tx=>{
      const [current]=await tx.query('SELECT '+proposalRow+' FROM quote_proposals WHERE organization_id=$1 AND user_id=$2 AND id=$3'+legacyProposal+' FOR UPDATE',[organizationId,userId,id])
      if(!current)throw new InputError('Orçamento não encontrado na sua conta.',404)
      if(current.status===target)return current
      if(['approved','refused','cancelled'].includes(current.status))throw new InputError('Proposta encerrada. Salve uma nova versão para negociar.',409)
      const transitions:Record<string,string[]>={draft:['sent','awaiting_approval','cancelled'],sent:['awaiting_approval','cancelled'],awaiting_approval:['sent','cancelled']}
      if(!transitions[current.status]?.includes(target))throw new InputError('Transição comercial inválida.',409)
      const [row]=await tx.query("UPDATE quote_proposals SET status=$4,status_history=status_history||jsonb_build_array(jsonb_build_object('status',$4::text,'at',now())) WHERE organization_id=$1 AND user_id=$2 AND id=$3 RETURNING "+proposalRow,[organizationId,userId,id,target])
      return row
    });res.json(saved)
  }))
  router.get('/proposals/:id/prompts',requireOwner,endpoint(async(req,res)=>{
    const {organizationId,userId}=req.user!,id=uuid(req.params.id)
    await getProposal(organizationId,userId,id)
    res.set('Cache-Control','no-store').json(await database.query('SELECT id,content,source,created_at FROM quote_proposal_prompts WHERE organization_id=$1 AND user_id=$2 AND proposal_id=$3 ORDER BY created_at DESC,id LIMIT 100',[organizationId,userId,id]))
  }))
  router.post('/proposals/:id/prompts',requireOwner,endpoint(async(req,res)=>{
    const {organizationId,userId}=req.user!,id=uuid(req.params.id)
    const edited=req.body?.content
    if(!req.body||Object.keys(req.body).some(key=>key!=='content')||(edited!==undefined&&(typeof edited!=='string'||!edited.trim()||edited.length>30000||edited.includes(String.fromCharCode(0)))))throw new InputError('O prompt deve ter de 1 a 30.000 caracteres.')
    const saved=await database.transaction(async tx=>{
      const [entry]=await tx.query('SELECT '+proposalRow+' FROM quote_proposals WHERE organization_id=$1 AND user_id=$2 AND id=$3'+legacyProposal+' FOR UPDATE',[organizationId,userId,id])
      if(!entry)throw new InputError('Orçamento não encontrado na sua conta.',404)
      const generated=proposalPrompt({title:entry.title,briefing:entry.briefing,client_name:entry.client_name,quote:entry.quote,quantities:entry.quantities,approved_at:entry.approved_at,refused_at:entry.refused_at})
      const [row]=await tx.query('INSERT INTO quote_proposal_prompts(organization_id,user_id,proposal_id,content,source) VALUES($1,$2,$3,$4,$5) RETURNING id,content,source,created_at',[organizationId,userId,id,edited===undefined?generated:edited.trim(),edited===undefined?'generated':'edited'])
      return row
    });res.set('Cache-Control','no-store').status(201).json(saved)
  }))
  router.patch('/:id',endpoint(async(req,res)=>{
    const {organizationId,userId}=req.user!
    const id=uuid(req.params.id),revision=req.body?.revision
    if(!Number.isSafeInteger(revision)||revision<1||revision>=2_147_483_647)throw new InputError('Revisão inválida.',400)
    const model=parseQuoteModel(req.body?.model)
    const [saved]=await database.query('UPDATE quote_models SET model=$4::text::jsonb,revision=revision+1,updated_at=now() WHERE organization_id=$1 AND user_id=$2 AND id=$3 AND revision=$5 RETURNING id,revision,model,updated_at',[organizationId,userId,id,JSON.stringify(model),revision])
    if(!saved) {
      const [existing]=await database.query('SELECT id FROM quote_models WHERE organization_id=$1 AND user_id=$2 AND id=$3',[organizationId,userId,id])
      if(!existing)throw new InputError('Modelo não encontrado na sua conta.',404)
      throw new InputError('O modelo foi alterado em outra sessão. Abra a versão atual antes de editar.',409)
    }
    res.json(saved)
  }))
  return router
}
