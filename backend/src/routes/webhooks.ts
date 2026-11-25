import { Router } from "express"
import { createHash,timingSafeEqual } from 'node:crypto'
import { processIncomingMessage } from "../services/webhookProcessor"

const router=Router()
const digest=(text:string)=>createHash('sha256').update(text).digest()

router.post('/evolution',async(req,res)=>{
  const secret=req.get('x-evolution-secret'), expected=process.env.EVOLUTION_WEBHOOK_SECRET
  if(!secret||!expected||!timingSafeEqual(digest(secret),digest(expected))) {
    res.status(401).json({error:'Unauthorized'})
    return
  }
  const event=typeof req.body?.event==='string' ? req.body.event.toLowerCase().replaceAll('_','.') : ''
  try {
    if(event==='messages.upsert') await processIncomingMessage(req.body)
    res.json({ok:true})
  } catch {
    console.error('[webhook] falha ao persistir mensagem')
    res.status(503).json({error:'Não foi possível registrar a mensagem.'})
  }
})
export default router
