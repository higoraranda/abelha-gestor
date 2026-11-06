// Prévia manual de teste: backend real + Vite, somente registros sintéticos.
// Executar a partir de backend, passando o host da branch isolada autorizada.
import 'dotenv/config'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { spawn, spawnSync } from 'node:child_process'
import { createInterface } from 'node:readline'
import { createServer } from 'node:net'
import { writeFile, unlink } from 'node:fs/promises'
import path from 'node:path'
import postgres from 'postgres'

const target=process.argv[2]
assert.match(target||'',/^ep-[a-z0-9-]+\.[a-z0-9-]+\.aws\.neon\.tech$/)
assert.ok(!target.includes('-pooler'))
const connection=new URL(process.env.DATABASE_URL)
assert.notEqual(target,connection.hostname.replace('-pooler.','.'))
connection.hostname=target;process.env.DATABASE_URL=connection.toString();process.env.ABELHA_TEST_DATABASE_HOST=target
const {createFixtureSchema,schemaConnectionUrl}=await import('../../dist/integration/branch-fixture.js')
const {insertContract}=await import('../../dist/services/contract-store.js')
const {businessDay}=await import('../../dist/services/crm.js')
const schema='abelha_ui_'+randomUUID().replace(/-/g,'')
const owner=postgres(connection.toString(),{ssl:'require',max:1,onnotice:()=>{}})
const children=[];let scoped,created=false
const stateFile=path.join(process.cwd(),'abelha-ui-test.json')
async function portFree(port){const probe=createServer();await new Promise((resolve,reject)=>{probe.once('error',reject);probe.listen(port,'127.0.0.1',()=>probe.close(resolve))})}
async function ready(url,child){for(let i=0;i<100;i++){if(child.exitCode!==null)throw Error('Serviço temporário encerrou antes da prévia');try{const r=await fetch(url);if(r.ok)return}catch{}await new Promise(r=>setTimeout(r,100))}throw Error('Prévia não ficou disponível')}
function start(args,cwd,env){const child=spawn(process.execPath,args,{cwd,env,windowsHide:true,stdio:['ignore','pipe','pipe']});child.stdout.on('data',d=>process.stdout.write(d));child.stderr.on('data',d=>process.stderr.write(d));children.push(child);return child}
try{
  await portFree(3000);await portFree(4173)
  const org=randomUUID(),client=randomUUID(),prospect=randomUUID()
  await owner.begin(async tx=>{
    await createFixtureSchema(tx,schema)
    await tx`INSERT INTO organizations(id,name) VALUES(${org},'TESTE ISOLADO ABELHA')`
    await tx`INSERT INTO clients(id,organization_id,name,email) VALUES(${client},${org},'TESTE • Aurora Estúdio','aurora@example.test'),(${prospect},${org},'TESTE • Bela Contato','bela@example.test')`
  });created=true
  const scopedUrl=schemaConnectionUrl(schema);scoped=postgres(scopedUrl,{ssl:'require',max:2,onnotice:()=>{}})
  const [scope]=await scoped`SELECT current_schema() AS name`;assert.equal(scope.name,schema)
  const today=businessDay(),end=new Date(today+'T12:00:00Z');end.setUTCDate(end.getUTCDate()+30)
  const ending=end.toISOString().slice(0,10)
  const contract=await scoped.begin(tx=>insertContract(tx,org,client,{serviceName:'Website — teste',grossAmount:2000,paymentMethod:'two_installments',monthlyFee:0,monthlyDueDay:null,developmentStartDate:today,developmentEndDate:ending,contractEndDate:ending}))
  await scoped`INSERT INTO delivery_tasks(organization_id,contract_id,title,description,status,due_date) VALUES(${org},${contract.id},'TESTE • Revisar identidade','Tarefa sintética para verificar quadro e checklist','in_progress',${today}::date-1)`
  await scoped`INSERT INTO opportunities(organization_id,client_id,title,description,amount,expected_close,stage) VALUES(${org},${prospect},'TESTE • Identidade visual','Contexto sintético da proposta',4000,${ending},'proposal')`
  await scoped`INSERT INTO reminders(organization_id,title,due_at,linked_type,linked_id,is_next_action) VALUES(${org},'TESTE • Retornar proposta',NOW()-interval '1 day','client',${client},TRUE),(${org},'TESTE • Reunião de hoje',NOW(),NULL,NULL,FALSE)`
  await scoped`UPDATE receivables SET due_date=${today}::date-1 WHERE organization_id=${org} AND installment_number=1`
  await writeFile(stateFile,JSON.stringify({schema,branchHost:target,org,client,prospect,contractId:contract.id},null,2))
  const env={...process.env,DATABASE_URL:scopedUrl,NODE_ENV:'development',PORT:'3000',FRONTEND_URL:'http://127.0.0.1:4173',VITE_API_URL:'http://127.0.0.1:3000'}
  const backend=start(['dist/app.js'],process.cwd(),env);await ready('http://127.0.0.1:3000/health',backend)
  const frontend=start(['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4173','--strictPort'],path.resolve('../frontend'),env)
  await ready('http://127.0.0.1:4173/',frontend)
  const response=await fetch('http://127.0.0.1:3000/api/v1/clients');const records=await response.json();assert.equal(records.length,2);assert.ok(records.every(r=>r.organizationId===org))
  console.log('PRÉVIA DE TESTE PRONTA '+JSON.stringify({schema,backendPid:backend.pid,frontendPid:frontend.pid,ports:[3000,4173]}))
  console.log('Digite stop para encerrar os processos e remover somente o schema sintético desta prévia.')
  const terminal=createInterface({input:process.stdin});await new Promise(resolve=>{terminal.on('line',line=>{if(line.trim()==='stop'){terminal.close();resolve()}});process.once('SIGINT',()=>{terminal.close();resolve()});process.once('SIGTERM',()=>{terminal.close();resolve()})})
}finally{
  for(const child of children.reverse()){if(child.exitCode===null){if(process.platform==='win32')spawnSync('taskkill',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'inherit'});else child.kill('SIGTERM')}}
  if(scoped)await scoped.end({timeout:2})
  try{if(created){await owner`DROP SCHEMA ${owner(schema)} CASCADE`;const [remaining]=await owner`SELECT to_regnamespace(${schema}) AS namespace`;assert.equal(remaining.namespace,null)}}finally{await owner.end({timeout:2});await unlink(stateFile).catch(()=>{})}
  console.log('PRÉVIA ENCERRADA: processos próprios finalizados e schema sintético removido.')
}
