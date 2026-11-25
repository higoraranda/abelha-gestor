import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { mutationGuard } from '../middleware/mutation-guard'
const {mapAccess,runtimeMounts}=require('../../scripts/map-access.cjs')
test('access inventory covers legacy and current routes and browser writes use the same guard',async()=>{
  const rows=mapAccess() as string[][]
  assert.ok(rows.length>90)
  const preferences=rows.find(row=>row[1]==='PATCH /api/v1/member-modules/me/preferences')
  assert.ok(preferences)
  assert.equal(preferences[3],'Membro titular')
  assert.equal(preferences[6],'Usuário da sessão')
  assert.ok((runtimeMounts() as {router:string;prefix:string}[]).some(mount=>mount.router==='member-modules'&&mount.prefix==='/api/v1/member-modules'))
  for(const route of ['GET /api/v1/crm/export','POST /api/v1/integrations/codex/report','POST /webhooks/evolution'])
    assert.ok(rows.some(row=>row[1]===route),route)
  const app=express()
  app.use(mutationGuard)
  app.all('/fixture',(_req,res)=>res.json({ok:true}))
  const server=app.listen(0,'127.0.0.1')
  try{
    await new Promise<void>(resolve=>server.once('listening',resolve))
    const address=server.address()
    assert.ok(address&&typeof address==='object')
    const url='http://127.0.0.1:'+address.port+'/fixture'
    assert.equal((await fetch(url)).status,200)
    assert.equal((await fetch(url,{method:'POST'})).status,403)
    assert.equal((await fetch(url,{method:'POST',headers:{'X-Abelha-Client':'web'}})).status,200)
  }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()))}
})
