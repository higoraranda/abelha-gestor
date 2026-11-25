import { Router, type RequestHandler } from 'express'
import { db } from '../db'
import { authMiddleware, requireOwner } from '../middleware/auth'
import { postgresDatabase, type Database } from '../services/platform-db'
import { InputError, uuid } from '../services/personal'
import { listManagedMembers, memberModules, setManagedMemberStatus, updateManagedMember, updateModulePreferences } from '../services/member-modules'
import { endpoint, mutationGuard } from './personal'

export function createMemberModulesRouter(database:Database=postgresDatabase(db),authenticate:RequestHandler=authMiddleware){
  const router=Router()
  router.use((_req,res,next)=>{res.set('Cache-Control','private, no-store');next()},authenticate,mutationGuard,(req,res,next)=>{
    if(!req.user)return res.status(401).json({error:'Entre para verificar o acesso.'})
    next()
  })
  router.get('/me',endpoint(async(req,res)=>{
    if(req.user!.role!=='member')throw new InputError('Acesso disponível apenas para contas convidadas.',403)
    res.json(await memberModules(database,req.user!))
  }))
  router.patch('/me/preferences',endpoint(async(req,res)=>{
    if(req.user!.role!=='member')throw new InputError('Acesso disponível apenas para contas convidadas.',403)
    res.json(await updateModulePreferences(database,req.user!,req.body))
  }))
  router.patch('/members/:id/status',requireOwner,endpoint(async(req,res)=>{
    res.json(await setManagedMemberStatus(database,req.user!,uuid(req.params.id),req.body))
  }))
  router.get('/members',requireOwner,endpoint(async(req,res)=>{
    res.json(await listManagedMembers(database,req.user!))
  }))
  router.patch('/members/:id',requireOwner,endpoint(async(req,res)=>{
    res.json(await updateManagedMember(database,req.user!,uuid(req.params.id),req.body))
  }))
  return router
}
