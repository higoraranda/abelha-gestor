import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import postgres from 'postgres'
import express from 'express'
import { createCrmRouter } from '../routes/crm'
import { assertTestBranch, createFixtureSchema, schemaConnectionUrl } from './branch-fixture'

const enabled=process.env.ABELHA_TEST_SCHEMA_ROLLBACK==='1'
test('conversões concorrentes criam um único contrato; avisos persistem em outra conexão', {skip:!enabled,timeout:120000},async()=>{
  assertTestBranch()
  const schema='abelha_concurrent_'+randomUUID().replace(/-/g,'')
  const owner=postgres(process.env.DATABASE_URL!,{ssl:'require',max:1,onnotice:()=>{}})
  let scoped:ReturnType<typeof postgres>|undefined
  let server:ReturnType<ReturnType<typeof express>['listen']>|undefined
  let created=false
  const org=randomUUID(),client=randomUUID()
  try {
    await owner.begin(async(tx:any)=>{
      await createFixtureSchema(tx,schema)
      await tx`INSERT INTO organizations(id,name) VALUES(${org},'TESTE DE CONCORRÊNCIA')`
      await tx`INSERT INTO clients(id,organization_id,name) VALUES(${client},${org},'Contato sintético concorrente')`
    });created=true
    const scopedUrl=schemaConnectionUrl(schema)
    scoped=postgres(scopedUrl,{ssl:'require',max:5,onnotice:()=>{}})
    const [scope]=await scoped`SELECT current_schema() AS name`;assert.equal(scope.name,schema)
    const app=express();app.use(express.json());app.use('/api/v1/crm',createCrmRouter(scoped,[(req,_res,next)=>{req.organizationId=org;next()}]))
    server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server!.once('listening',resolve))
    const address=server.address();assert.ok(address&&typeof address!=='string')
    const root='http://127.0.0.1:'+address.port+'/api/v1/crm'
    async function request(route:string,method='GET',body?:unknown) {
      const response=await fetch(root+route,{method,headers:{'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)})
      const data:any=await response.json();assert.ok(response.ok,route+': '+JSON.stringify(data));return data
    }
    const opportunity=await request('/opportunities','POST',{client_id:client,title:'Concorrência sintética',description:'Deve preservar um único contrato',amount:1000,expected_close:'2026-12-01'})
    const input={serviceName:'Serviço sintético concorrente',grossAmount:1000,paymentMethod:'two_installments',monthlyFee:0,monthlyDueDay:null,developmentStartDate:'2026-11-05',developmentEndDate:'2026-12-05',contractEndDate:'2027-01-05'}
    const responses=await Promise.all(Array.from({length:12},()=>request('/opportunities/'+opportunity.id+'/convert','POST',input)))
    assert.equal(new Set(responses.map(r=>r.contractId)).size,1)
    assert.equal(responses.filter(r=>r.alreadyConverted===false).length,1)
    assert.equal(responses.filter(r=>r.alreadyConverted===true).length,11)
    const [contracts]=await scoped`SELECT count(*)::int AS n FROM client_contracts WHERE organization_id=${org}`
    const [billing]=await scoped`SELECT count(*)::int AS n,sum(amount) AS total FROM receivables WHERE organization_id=${org}`
    assert.equal(contracts.n,1);assert.equal(billing.n,2);assert.equal(Number(billing.total),1000)
    const [saved]=await scoped`SELECT stage,description,contract_id FROM opportunities WHERE id=${opportunity.id} AND organization_id=${org}`
    assert.equal(saved.stage,'won');assert.equal(saved.description,'Deve preservar um único contrato');assert.equal(saved.contract_id,responses[0].contractId)
    await request('/relationships/'+client+'/next-action','POST',{title:'Retorno sintético',due_at:'2020-01-01T12:00:00Z'})
    const notices=await request('/notifications');const key=notices.find((n:any)=>n.detail==='Próxima ação vencida').key
    await request('/notifications','PATCH',{key,read:true})
    const fresh=postgres(scopedUrl,{ssl:'require',max:1})
    try{const [state]=await fresh`SELECT read_at,dismissed FROM notification_states WHERE organization_id=${org} AND notification_key=${key}`;assert.ok(state.read_at);assert.equal(state.dismissed,false)}finally{await fresh.end({timeout:2})}
    await request('/notifications','PATCH',{key,dismissed:true});assert.equal((await request('/notifications')).some((n:any)=>n.key===key),false)
    console.log('12 requisições simultâneas, 1 contrato, 2 cobranças e estados persistidos em conexão independente.')
  } finally {
    if(server){server.closeAllConnections();await new Promise<void>(resolve=>server!.close(()=>resolve()))}
    if(scoped)await scoped.end({timeout:2})
    try{if(created){await owner`DROP SCHEMA ${owner(schema)} CASCADE`;const [remaining]=await owner`SELECT to_regnamespace(${schema}) AS namespace`;assert.equal(remaining.namespace,null)}}finally{await owner.end({timeout:2})}
  }
})
