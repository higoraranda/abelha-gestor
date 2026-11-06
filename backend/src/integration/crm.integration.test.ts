import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import express from 'express'
import { db } from '../db/index'
import { createCrmRouter } from '../routes/crm'
import { assertTestBranch, createFixtureSchema } from './branch-fixture'

const enabled=process.env.ABELHA_TEST_SCHEMA_ROLLBACK==='1'
// Exclusivo para execução explicitamente autorizada: sem reset, sem seed e sem registros pessoais.
test('migrations e API em schema isolado; todos os registros são sintéticos e a transação é desfeita', {skip:!enabled,timeout:120000},async()=>{
  assertTestBranch()
  const schema='abelha_test_'+randomUUID().replace(/-/g,'')
  const rolledBack=new Error('ROLLBACK_SYNTHETIC_TEST')
  let assertions=0
  try {
    await db.begin(async(tx:any)=>{
      const migration=await createFixtureSchema(tx,schema)
      const [scope]=await tx`SELECT current_schema() AS name`; assert.equal(scope.name,schema)
      await tx.unsafe(migration) // reexecução incremental não duplica estruturas
      const orgA=randomUUID(),orgB=randomUUID(),clientA=randomUUID(),clientB=randomUUID(),contractA=randomUUID(),contractB=randomUUID()
      await tx`INSERT INTO organizations(id,name) VALUES(${orgA},'TESTE ISOLADO A'),(${orgB},'TESTE ISOLADO B')`
      await tx`INSERT INTO clients(id,organization_id,name) VALUES(${clientA},${orgA},'Contato sintético A'),(${clientB},${orgB},'Contato sintético B')`
      for(const [org,client,contract] of [[orgA,clientA,contractA],[orgB,clientB,contractB]]) await tx`INSERT INTO client_contracts(id,organization_id,client_id,service_name,gross_amount,discount_percent,final_amount,payment_method,monthly_fee,development_start_date,development_end_date,contract_end_date,status) VALUES(${contract},${org},${client},'Entrega sintética',1000,0,1000,'two_installments',0,'2026-01-01','2026-02-01','2026-12-31','active')`
      function adapter(transaction:any):any {
        const query:any=(...args:any[])=>transaction(...args)
        query.json=transaction.json.bind(transaction);query.unsafe=transaction.unsafe.bind(transaction)
        query.begin=(...args:any[])=>transaction.savepoint((savepoint:any)=>args[args.length-1](adapter(savepoint)))
        return query
      }
      const app=express();app.use(express.json());app.use('/api/v1/crm',createCrmRouter(adapter(tx),[(req,res,next)=>{const org=req.headers['x-test-organization'];if(org!==orgA&&org!==orgB){res.status(403).end();return}req.organizationId=org;next()}]))
      const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));const address=server.address();if(!address||typeof address==='string')throw new Error('Sem porta de teste')
      const root='http://127.0.0.1:'+address.port+'/api/v1/crm'
      async function request(route:string,method='GET',body?:unknown,org=orgA):Promise<{status:number;data:any;text:string}> {
        let response:any
        try {await tx.savepoint(async()=>{const result=await fetch(root+route,{method,headers:{'content-type':'application/json','x-test-organization':org},body:body===undefined?undefined:JSON.stringify(body)});const text=await result.text();let data:any;try{data=JSON.parse(text)}catch{data=text};response={status:result.status,data,text};if(result.status>=400)throw response})}catch(error){if(error!==response)throw error}
        return response
      }
      try {
        const created=await request('/tasks','POST',{title:'Tarefa sintética',contract_id:contractA,due_date:'2020-01-01'});assert.equal(created.status,201);const taskId=created.data.id
        assert.equal((await request('/tasks','POST',{title:'Indevida',contract_id:contractB})).status,404)
        assert.equal((await request('/tasks/'+taskId,'PATCH',{status:'in_progress'})).data.status,'in_progress')
        assert.equal((await request('/tasks/'+taskId,'PATCH',{status:'done'})).data.previous_status,'in_progress')
        await request('/tasks/'+taskId,'PATCH',{status:'done'})
        assert.equal((await request('/tasks/'+taskId,'PATCH',{status:'reopen'})).data.status,'in_progress')
        assert.equal((await request('/tasks/'+taskId,'PATCH',{status:'done'},orgB)).status,404)
        assert.equal((await request('/tasks')).data.total,1);assert.equal((await request('/tasks','GET',undefined,orgB)).data.total,0);assertions+=7
        const o=await request('/opportunities','POST',{client_id:clientA,title:'Negócio sintético',amount:1000,expected_close:'2026-12-01',stage:'proposal'});assert.equal(o.status,201);const oid=o.data.id
        assert.equal((await request('/opportunities')).data.summary.weighted_value,400)
        const [before]=await tx`SELECT count(*)::int AS n FROM receivables WHERE organization_id=${orgA}`
        assert.equal((await request('/opportunities/'+oid,'PATCH',{stage:'won'})).status,400)
        const [after]=await tx`SELECT stage FROM opportunities WHERE id=${oid}`;assert.equal(after.stage,'proposal')
        const [afterCancel]=await tx`SELECT count(*)::int AS n FROM receivables WHERE organization_id=${orgA}`;assert.equal(afterCancel.n,before.n)
        const contractInput={serviceName:'Serviço confirmado',grossAmount:1000,paymentMethod:'cash',monthlyFee:0,monthlyDueDay:null,developmentStartDate:'2026-11-05',developmentEndDate:'2026-12-05',contractEndDate:'2027-01-05'}
        assert.equal((await request('/opportunities/'+oid+'/convert','POST',contractInput,orgB)).status,404)
        assert.equal((await request('/opportunities/'+oid+'/convert','POST',{...contractInput,grossAmount:-1})).status,400)
        assert.equal((await request('/opportunities?opportunityId='+oid)).data.items[0].stage,'proposal')
        const converted=await request('/opportunities/'+oid+'/convert','POST',contractInput);assert.equal(converted.status,200)
        const replay=await request('/opportunities/'+oid+'/convert','POST',contractInput);assert.equal(replay.data.contractId,converted.data.contractId);assert.equal(replay.data.alreadyConverted,true)
        const [billing]=await tx`SELECT count(*)::int AS n,sum(amount) AS value FROM receivables WHERE contract_id=${converted.data.contractId}`;assert.equal(billing.n,1);assert.equal(Number(billing.value),950)
        const [won]=await tx`SELECT stage,contract_id FROM opportunities WHERE id=${oid}`;assert.equal(won.stage,'won');assert.equal(won.contract_id,converted.data.contractId)
        assert.equal((await request('/opportunities')).data.summary.open_value,0);assertions+=13
        await request('/relationships/'+clientA+'/notes','POST',{body:'Nota sintética datada'})
        assert.equal((await request('/relationships/'+clientA+'/notes','POST',{body:'Indevida'},orgB)).status,404)
        await request('/relationships/'+clientA+'/next-action','POST',{title:'Retornar A',due_at:'2020-01-01T12:00:00Z'})
        await request('/relationships/'+clientA+'/next-action','POST',{title:'Retornar B',due_at:'2020-01-01T12:00:00Z'})
        const [actions]=await tx`SELECT count(*)::int AS n FROM reminders WHERE organization_id=${orgA} AND is_next_action`;assert.equal(actions.n,1)
        const n1=await request('/notifications');assert.ok(n1.data.length>=2);const key=n1.data[0].key
        assert.equal((await request('/notifications','PATCH',{key,read:true})).status,200)
        assert.equal((await request('/notifications')).data.find((n:any)=>n.key===key).read,true)
        await request('/notifications','PATCH',{key,dismissed:true});assert.equal((await request('/notifications')).data.some((n:any)=>n.key===key),false)
        assert.equal((await request('/notifications','PATCH',{key,read:true},orgB)).status,404);assertions+=6
        const exported=await request('/export?format=json');assert.equal(exported.status,200);assert.equal(exported.data.version,1);assert.equal(exported.data.data.clients.length,1);assert.equal(exported.text.includes(clientB),false);assert.equal(/password_hash|api_key|authjs.session/.test(exported.text),false)
        assert.equal((await request('/export?format=csv&table=users')).status,400);assert.equal((await request('/search?q=sint')).data.some((r:any)=>r.id===clientB),false)
        const report=await request('/reports?from=2026-01-01&to=2027-12-31');assert.equal(report.status,200);assert.equal(report.data.received,0);assertions+=8
      } finally { server.closeAllConnections();await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve())) }
      throw rolledBack
    })
  }catch(error){if(error!==rolledBack)throw error}
  finally{try{const [remaining]=await db`SELECT to_regnamespace(${schema}) AS namespace`;assert.equal(remaining.namespace,null,'Schema temporário deve desaparecer após rollback')}finally{await db.end({timeout:2})}}
  assert.ok(assertions>=34)
  // Consulta fora da transação confirma que o schema não permaneceu após rollback.
  console.log('Asserções de integração: '+assertions+'. Schema temporário desfeito: '+schema)
})
