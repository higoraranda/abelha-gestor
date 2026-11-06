// Inspeção após migration: consultas reais, PostgreSQL restrito a leitura.
import 'dotenv/config'
import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { createInterface } from 'node:readline'
import { createServer } from 'node:net'
import path from 'node:path'
import postgres from 'postgres'

const expected=process.argv[2]
const connection=new URL(process.env.DATABASE_URL)
assert.equal(connection.hostname.replace('-pooler.','.'),expected,'Confira o endpoint autorizado')
connection.hostname=expected
connection.searchParams.set('options','-c default_transaction_read_only=on -c search_path=public')
const readonlyUrl=connection.toString()
const probe=postgres(readonlyUrl,{ssl:'require',max:1})
try{const [mode]=await probe`SELECT current_setting('default_transaction_read_only') AS mode`;assert.equal(mode.mode,'on')}finally{await probe.end({timeout:2})}

const children=[]
async function portFree(port){const server=createServer();await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',()=>server.close(resolve))})}
function start(args,cwd,env){const child=spawn(process.execPath,args,{cwd,env,windowsHide:true,stdio:['ignore','ignore','pipe']});child.stderr.on('data',()=>{});children.push(child);return child}
async function ready(url,child){for(let n=0;n<100;n++){assert.equal(child.exitCode,null,'Processo de inspeção encerrou antes de ficar disponível');try{if((await fetch(url)).ok)return}catch{}await new Promise(resolve=>setTimeout(resolve,100))}throw Error('A prévia de leitura não ficou disponível')}
let checks=0
async function get(route){const response=await fetch('http://127.0.0.1:3000/api/v1/'+route);assert.equal(response.status,200,'Consulta: '+route);checks++;return response.json()}
function inspectKeys(value){if(!value||typeof value!=='object')return;for(const [key,item] of Object.entries(value)){assert.ok(!/password|secret|token|cookie|session|api.?key/i.test(key),'Exportação deve excluir campos de credenciais');inspectKeys(item)}}
try{
  await portFree(3000);await portFree(4173)
  const env={...process.env,DATABASE_URL:readonlyUrl,NODE_ENV:'development',PORT:'3000',FRONTEND_URL:'http://127.0.0.1:4173',VITE_API_URL:'http://127.0.0.1:3000'}
  const backend=start(['dist/app.js'],process.cwd(),env);await ready('http://127.0.0.1:3000/health',backend)
  const clients=await get('clients');assert.ok(Array.isArray(clients));assert.ok(clients.every(c=>typeof c.favorite==='boolean'))
  const overview=await get('crm/overview');assert.equal(typeof overview.clients_count,'number')
  const tasks=await get('crm/tasks');assert.ok(Array.isArray(tasks.items));assert.equal(typeof tasks.total,'number')
  const opportunities=await get('crm/opportunities');assert.ok(Array.isArray(opportunities.items));assert.equal(typeof opportunities.summary.weighted_value,'number')
  assert.ok(Array.isArray(await get('crm/contracts')))
  assert.ok(Array.isArray(await get('crm/notifications')))
  assert.ok(Array.isArray(await get('crm/search?q=abelha_migration_smoke_unmatched')))
  assert.equal(typeof (await get('crm/reports')).received,'number')
  assert.equal(typeof (await get('finance/summary')).receivedMonth,'number')
  assert.ok(Array.isArray(await get('reminders')))
  if(clients[0]){
    const relationship=await get('crm/relationships/'+clients[0].id);assert.ok(Array.isArray(relationship.notes))
    const detail=await get('clients/'+clients[0].id);assert.equal(detail.id,clients[0].id)
  }
  const exported=await get('crm/export?format=json');assert.equal(exported.version,1);inspectKeys(exported)
  for(const rows of Object.values(exported.data)){assert.ok(Array.isArray(rows));assert.ok(rows.every(row=>row.organization_id===exported.organization_id))}
  const csv=await fetch('http://127.0.0.1:3000/api/v1/crm/export?format=csv&table=clients');assert.equal(csv.status,200);assert.ok((await csv.text()).includes('"organization_id"'));checks++
  const frontend=start(['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4173','--strictPort'],path.resolve('../frontend'),env);await ready('http://127.0.0.1:4173/',frontend)
  console.log(JSON.stringify({status:'READ_ONLY_SMOKE_OK',queries:checks,backendPid:backend.pid,frontendPid:frontend.pid,ports:[3000,4173]}))
  console.log('Prévia somente leitura pronta. Digite stop para encerrar.')
  const terminal=createInterface({input:process.stdin});await new Promise(resolve=>{terminal.on('line',line=>{if(line.trim()==='stop'){terminal.close();resolve()}});process.once('SIGINT',()=>{terminal.close();resolve()});process.once('SIGTERM',()=>{terminal.close();resolve()})})
}finally{
  for(const child of children.reverse()){if(child.exitCode===null){if(process.platform==='win32')spawnSync('taskkill',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'inherit'});else child.kill('SIGTERM')}}
  console.log('Prévia de leitura encerrada; processos próprios finalizados.')
}
