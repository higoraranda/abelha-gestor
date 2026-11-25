import { Router } from 'express'
import { db } from '../db'
import { authMiddleware, requireOwner } from '../middleware/auth'
import { postgresDatabase, type Database } from '../services/platform-db'
import { issueInvite, redeemInvite } from '../services/invites'
import { requestSignupCode, resendSignupEmail, signupSecret, type SignupEmail } from '../services/signup-email'
import { endpoint, mutationGuard } from './personal'
import { InputError } from '../services/personal'

export function createAccountRouter(database: Database = postgresDatabase(db), authenticate = authMiddleware, mail?:SignupEmail) {
  const router = Router()
  router.use(mutationGuard)
  router.post('/invites',authenticate,requireOwner,endpoint(async (req,res) => {
    if (!req.user) throw new InputError('Entre na conta proprietária para gerar convites.',401)
    res.status(201).json(await issueInvite(database,{id:req.user.userId,organization_id:req.user.organizationId},req.body?.email))
  }))
  router.post('/register/code',endpoint(async(req,res)=>{
    const result=await requestSignupCode(database,req.body??{},mail??resendSignupEmail())
    res.json(result)
  }))
  router.post('/register',endpoint(async (req,res) => {
    await redeemInvite(database,req.body ?? {},mail?.secret??signupSecret())
    res.status(201).json({ created:true })
  }))
  return router
}
