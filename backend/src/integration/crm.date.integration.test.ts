import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { spawn, spawnSync } from 'node:child_process'
import { createServer } from 'node:net'
import postgres from 'postgres'
import { assertTestBranch, createFixtureSchema, schemaConnectionUrl } from './branch-fixture'
import { insertContract } from '../services/contract-store'
import { businessDay } from '../services/crm'

test('clientes e financeiro classificam vencimento pelo dia brasileiro, mesmo com sessão em outro fuso',{skip:process.env.ABELHA_TEST_SCHEMA_ROLLBACK!=='1',timeout:120000},async()=>{
  assertTestBranch()
  const schema='abelha_test_'+randomUUID().replace(/-/g,'')
  const owner=postgres(process.env.DATABASE_URL!,{ssl:'require',max:1,onnotice:()=>{}})
  const org=randomUUID(),client=randomUUID(),today=businessDay()
  let created=false,child:ReturnType<typeof spawn>|undefined
  try{
    const [days]=await owner`SELECT to_char(NOW() AT TIME ZONE 'Pacific/Kiritimati','YYYY-MM-DD') AS east,to_char(NOW() AT TIME ZONE 'Etc/GMT+12','YYYY-MM-DD') AS west`
    const timezone=days.east!==today?'Pacific/Kiritimati':'Etc/GMT+12'
    assert.notEqual(timezone==='Pacific/Kiritimati'?days.east:days.west,today)
    await owner.begin(async(tx:any)=>{
      await createFixtureSchema(tx,schema)
      await tx`INSERT INTO organizations(id,name) VALUES(${org},'TESTE DE FUSO')`
      await tx`INSERT INTO clients(id,organization_id,name) VALUES(${client},${org},'Contato sintético de fuso')`
      const end=new Date(today+'T12:00:00Z');end.setUTCDate(end.getUTCDate()+30)
      await insertContract(tx,org,client,{serviceName:'Serviço sintético de fuso',grossAmount:1000,paymentMethod:'cash',monthlyFee:0,developmentStartDate:today,developmentEndDate:end.toISOString().slice(0,10),contractEndDate:end.toISOString().slice(0,10)})
    });created=true
    const url=new URL(schemaConnectionUrl(schema));url.searchParams.set('options','-c search_path='+schema+' -c timezone='+timezone)
    const probe=createServer();await new Promise<void>(resolve=>probe.listen(0,'127.0.0.1',resolve));const address=probe.address();assert.ok(address&&typeof address!=='string');const port=address.port;await new Promise<void>(resolve=>probe.close(()=>resolve()))
    child=spawn(process.execPath,['dist/app.js'],{cwd:process.cwd(),windowsHide:true,env:{...process.env,DATABASE_URL:url.toString(),PORT:String(port),NODE_ENV:'development'},stdio:'ignore'})
    const root='http://127.0.0.1:'+port
    for(let n=0;n<100;n++){assert.equal(child.exitCode,null,'Backend de teste deve continuar ativo');try{if((await fetch(root+'/health')).ok)break}catch{}await new Promise(resolve=>setTimeout(resolve,50))}
    async function get(route:string){const result=await fetch(root+'/api/v1/'+route);const body=await result.json();assert.ok(result.ok,JSON.stringify(body));return body as any}
    const clients=await get('clients');assert.equal(clients.length,1);assert.equal(clients[0].financialStatus,'open')
    assert.equal((await get('clients?financial=overdue')).length,0)
    assert.equal((await get('clients?financial=open')).length,1)
    const summary=await get('finance/summary');assert.equal(summary.overdueAmount,0);assert.equal(summary.openAmount,950)
    const detail=await get('finance/clients/'+client);assert.equal(detail.overdueAmount,0);assert.equal(detail.receivables[0].status,'open');assert.equal(detail.receivables[0].dueDate,today)
    const charges=await get('finance/receivables?status=overdue');assert.equal(charges.length,0)
  }finally{
    if(child&&child.exitCode===null){if(process.platform==='win32')spawnSync('taskkill',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});else child.kill('SIGTERM')}
    try{if(created){await owner`DROP SCHEMA ${owner(schema)} CASCADE`;const [remaining]=await owner`SELECT to_regnamespace(${schema}) AS namespace`;assert.equal(remaining.namespace,null)}}finally{await owner.end({timeout:2})}
  }
})
