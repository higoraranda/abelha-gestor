import type { RequestHandler } from 'express'

// Browser mutations require a non-simple header; cross-origin forms cannot supply it.
export const mutationGuard:RequestHandler=(req,res,next)=>{
  if(!['GET','HEAD','OPTIONS'].includes(req.method) && req.get('X-Abelha-Client')!=='web') {
    res.status(403).json({error:'Origem da operação não reconhecida.'})
    return
  }
  next()
}
