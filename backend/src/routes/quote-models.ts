import { Router, type RequestHandler } from 'express'
import { db } from '../db'
import { authMiddleware } from '../middleware/auth'
import { postgresDatabase, type Database } from '../services/platform-db'
import { InputError, uuid } from '../services/personal'
import { parseQuoteModel, calculateQuote } from '../services/quote-model'
import { endpoint, mutationGuard } from './personal'

export function createQuoteModelsRouter(database:Database=postgresDatabase(db),authenticate:RequestHandler=authMiddleware) {
  const router=Router()
  router.use(authenticate,mutationGuard,(req,res,next)=>{
    if(!req.user?.userId||!req.user.organizationId){res.status(401).json({error:'Entre na sua conta para usar suas calculadoras.'});return}
    next()
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
