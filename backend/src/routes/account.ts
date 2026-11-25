import { Router } from 'express'
import { db } from '../db'
import { authMiddleware, requireOwner } from '../middleware/auth'
import { postgresDatabase, type Database } from '../services/platform-db'
import { issueInvite, redeemInvite } from '../services/invites'
import { requestSignupCode, resendSignupEmail, signupSecret, type SignupEmail } from '../services/signup-email'
import { endpoint, mutationGuard } from './personal'
import { InputError } from '../services/personal'
import { completePasswordReset, issuePasswordReset, resetSettings, type ResetSettings } from '../services/password-reset'

export function createAccountRouter(database: Database = postgresDatabase(db), authenticate = authMiddleware, mail?:SignupEmail, recovery?: ResetSettings) {
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
  // Delivery runs separately from the HTTP response, so provider latency and
  // failures cannot reveal whether the address matched an eligible account.
  let pendingDeliveries = 0
  router.post('/password/reset/request',endpoint(async (req,res) => {
    const config = recovery ?? resetSettings()
    if (pendingDeliveries >= 20) throw new InputError('A recuperação está ocupada. Tente novamente em instantes.',503)
    pendingDeliveries++
    try {
      const delivery = await issuePasswordReset(database,req.body?.email,config)
      res.status(202).json({ accepted:true })
      if (delivery) {
        await config.send(delivery).catch(() => console.warn('[password-reset] Falha na entrega do e-mail.'))
      }
    } finally { pendingDeliveries-- }
  }))
  router.post('/password/reset/confirm',endpoint(async (req,res) => {
    await completePasswordReset(database,req.body?.token,req.body?.password)
    res.json({ changed:true })
  }))
  return router
}
