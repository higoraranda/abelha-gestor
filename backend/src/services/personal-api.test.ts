import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import express from 'express'
import { PGlite } from '@electric-sql/pglite'
import { PGLiteSocketServer } from '@electric-sql/pglite-socket'
import postgres from 'postgres'
import { postgresDatabase } from './platform-db'
import { createPersonalRouter } from '../routes/personal'
import { createProspectingRouter } from '../routes/prospecting'
import { createIntegrationsRouter, githubJsonParser, secretMatches } from '../routes/integrations'
import { createHmac } from 'node:crypto'
import webpush from 'web-push'
import { sendPendingPush, weeklyReview, automationTick } from './personal-automation'
import vm from 'node:vm'

function workflowNode(key:string,name:string,json:any,extra:Record<string,unknown>={}) {
  const workflow=JSON.parse(readFileSync('../docs/integrations/n8n/abelha-'+key+'.json','utf8'))
  const node=workflow.nodes.find((n:any)=>n.name===name)
  return vm.runInNewContext('(function(){'+node.parameters.jsCode+'})()',{$json:json,$input:{item:{json},all:()=>[{json}]},...extra},{timeout:1000})
}

test('Personal API isolates users, validates mutations and keeps reports pending until human review',async()=>{
  const pg=new PGlite();let server:ReturnType<express.Express['listen']>|undefined;let wire:PGLiteSocketServer|undefined;let sql:ReturnType<typeof postgres>|undefined
  const org='10000000-0000-4000-8000-000000000001',user='20000000-0000-4000-8000-000000000001',other='20000000-0000-4000-8000-000000000002'
  try {
    await pg.exec(`CREATE TABLE organizations(id uuid primary key);CREATE TABLE users(id uuid primary key,organization_id uuid not null references organizations(id));CREATE TABLE clients(id uuid primary key default gen_random_uuid(),organization_id uuid not null references organizations(id),name text,whatsapp text,email text,notes text);
      INSERT INTO organizations VALUES('${org}');INSERT INTO users VALUES('${user}','${org}'),('${other}','${org}');`)
    await pg.exec('CREATE TABLE reminders(id uuid primary key,organization_id uuid,title text,due_at timestamptz,completed boolean)')
    await pg.exec(readFileSync('src/db/migrations/20261111_personal_platform.sql','utf8'))
    wire=new PGLiteSocketServer({db:pg,host:'127.0.0.1',port:0});await wire.start();sql=postgres('postgresql://postgres:postgres@'+wire.getServerConn()+'/postgres',{ssl:false,max:1});const database=postgresDatabase(sql)
    const app=express();app.use('/api/v1/integrations/github',githubJsonParser);app.use(express.json());const auth:express.RequestHandler=(req,_res,next)=>{req.organizationId=org;req.user={userId:req.get('X-Test-User')||user,organizationId:org,role:'user'};next()};app.use('/api/v1/personal',createPersonalRouter(database,[auth]));app.use('/api/v1/prospecting',createProspectingRouter(database,[auth]));app.use('/api/v1/integrations',createIntegrationsRouter(database));app.use((error:any,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{res.status(error.status||500).json({error:'Request rejected'})});server=app.listen(0,'127.0.0.1')
    await new Promise<void>(resolve=>server!.once('listening',resolve));const port=(server.address() as any).port
    async function request(path:string,method='GET',body?:unknown,as=user,guard=true){const response=await fetch(`http://127.0.0.1:${port}/api/v1/personal${path}`,{method,headers:{'Content-Type':'application/json','X-Test-User':as,...guard?{'X-Abelha-Client':'web'}:{}},body:body===undefined?undefined:JSON.stringify(body)});return {status:response.status,body:response.status===204?null:await response.json() as any}}
    assert.equal((await request('/projects','POST',{name:'Sem origem'},user,false)).status,403)
    const project=await request('/projects','POST',{name:'Projeto sintético',repository:'https://github.com/example/project'});assert.equal(project.status,201)
    assert.equal((await request('/projects/'+project.body.id,'GET',undefined,other)).status,404)
    const milestone=await request('/projects/'+project.body.id+'/milestones','POST',{title:'Backend',acceptance:'Testes verdes e revisão'});assert.equal(milestone.status,201)
    assert.equal((await request('/projects')).body[0].current_milestone,'Backend')
    const report={schema_version:1,event_id:'run-123',summary:'Backend validado',commit:'a'.repeat(40),tests:[{name:'API',command:'node --test',result:'passed',evidence_url:'https://github.com/example/project/actions/runs/123'}],acceptance:['Testes verdes'],next_step:'Revisar',blockers:[]}
    const receipt=await request('/projects/'+project.body.id+'/reports','POST',report);assert.equal(receipt.status,201);assert.equal(receipt.body.report.commit,'a'.repeat(40),'postgres.js must persist a JSON object, not a JSON string')
    const replay=await request('/projects/'+project.body.id+'/reports','POST',report);assert.equal(replay.body.id,receipt.body.id)
    assert.equal((await request('/projects/'+project.body.id+'/reports','POST',{...report,summary:'Conteúdo diferente'})).status,409)
    let details=await request('/projects/'+project.body.id);assert.equal(details.body.milestones[0].completed_at,null)
    assert.equal((await request('/projects/'+project.body.id+'/milestones/'+milestone.body.id+'/complete','POST',{report_id:receipt.body.id})).status,400)
    assert.equal((await request('/projects/'+project.body.id+'/milestones/'+milestone.body.id+'/complete','POST',{report_id:receipt.body.id,reviewed:true})).status,200)
    details=await request('/projects/'+project.body.id);assert.ok(details.body.milestones[0].completed_at)
    assert.equal((await request('/projects')).body[0].current_milestone,null)
    assert.equal((await request('/notifications','GET',undefined,other)).body.length,0)
    assert.equal((await request('/notifications')).body.length,1)
    assert.equal((await request('/preferences','PATCH',{morning_time:'25:99',weekly_time:null})).status,400)
    assert.equal((await request('/preferences','PATCH',{morning_time:'08:30',weekly_time:'18:00'})).status,200)
    const cycle=await request('/finance/cycles','POST',{name:'Cartão sintético',starts_on:'2026-01-01',closes_on:'2026-12-31'});assert.equal(cycle.status,201)
    for(const [recorded_on,amount]of [['2026-01-01',1200],['2026-01-02',1280],['2026-01-03',1280],['2026-01-04',1250]]) {const result=await request('/finance/entries','POST',{cycle_id:cycle.body.id,recorded_on,amount});assert.equal(result.status,201,JSON.stringify(result.body))}
    assert.equal((await request('/finance')).body.summary.variation,-30)
    assert.equal(Number((await request('/finance')).body.monthly[0].total),1250)
    await request('/finance/plans','POST',{month:'2026-01-01',income:0,budget:0,savings_goal:0,saved:0})
    await request('/finance/entries','POST',{cycle_id:cycle.body.id,recorded_on:'2026-01-04',amount:1250})
    assert.equal((await request('/notifications')).body.some((item:any)=>item.title==='Fatura acima do orçamento'),true,'An explicit zero budget must alert on a positive invoice')
    assert.equal((await request('/finance/entries','POST',{cycle_id:cycle.body.id,recorded_on:'2026-01-04',amount:1250},other)).status,404)
    const subscription=await request('/subscriptions','POST',{name:'Serviço sintético',amount:20,frequency:'monthly',scope:'personal',due_on:'2026-01-31'});assert.equal(subscription.status,201)
    assert.equal((await request('/subscriptions')).body.payments.length,0)
    const payment=await request('/subscriptions/'+subscription.body.id+'/payments','POST',{due_on:'2026-01-31',paid_on:'2026-01-31'});assert.equal(payment.status,201,JSON.stringify(payment.body))
    const paymentReplay=await request('/subscriptions/'+subscription.body.id+'/payments','POST',{due_on:'2026-01-31',paid_on:'2026-01-31'});assert.equal(paymentReplay.body.id,payment.body.id)
    assert.match((await request('/subscriptions')).body.subscriptions[0].due_on,/^2026-02-28/)
    const watch=await request('/prices','POST',{name:'Produto sintético',interval_minutes:60,target:100});assert.equal(watch.status,201)
    process.env.ABELHA_INTEGRATION_TOKEN='integration-test-secret-with-at-least-32-chars';process.env.ABELHA_INTEGRATION_ORGANIZATION_ID=org;process.env.ABELHA_INTEGRATION_USER_ID=user;process.env.PRICE_ALLOWED_HOSTS='shop.example';process.env.GITHUB_WEBHOOK_SECRET='github-test-secret-with-at-least-32-chars'
    async function integration(path:string,body:any,token=process.env.ABELHA_INTEGRATION_TOKEN){const response=await fetch(`http://127.0.0.1:${port}/api/v1/integrations${path}`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(body)});const raw=await response.text();return {status:response.status,body:response.headers.get('content-type')?.includes('application/json')?JSON.parse(raw):raw}}
    assert.equal((await integration('/tick',{},'bad-token')).status,401)
    const observation=workflowNode('price-monitor','Validar cotação real',{statusCode:200,body:{event_id:'obs-1',store:'Loja teste',product_url:'https://shop.example/product',price:100,currency:'BRL',observed_at:new Date().toISOString()}},{$:()=>({item:{json:{watch_id:watch.body.id,product_url:'https://shop.example/product'}}})}).json
    const firstPrice=await integration('/prices/'+watch.body.id+'/observations',observation);assert.equal(firstPrice.status,201,JSON.stringify(firstPrice.body))
    assert.equal((await integration('/prices/'+watch.body.id+'/observations',observation)).body.id,firstPrice.body.id)
    assert.equal((await request('/prices')).body.observations.length,1)
    const tick=await integration('/tick',{});assert.equal(tick.status,200,JSON.stringify(tick.body));assert.equal((await integration('/tick',{})).status,200)
    const review=await request('/reviews','POST',{});assert.equal(review.status,201,JSON.stringify(review.body));assert.equal((await request('/reviews','POST',{})).body.id,review.body.id)
    assert.equal((await request('/reviews','GET',undefined,other)).body.length,0)
    const capture=workflowNode('leads-capture','Extrair e classificar',{body:{event_id:'capture-1',source:'form',name:'Prospect sintético',summary:'Pedido de site',evidence_reference:'form/123'}}).json
    assert.equal((await integration('/leads/capture',capture)).status,201)
    const raw=JSON.stringify({repository:{html_url:'https://github.com/example/project'}})
    const signature='sha256='+createHmac('sha256',process.env.GITHUB_WEBHOOK_SECRET).update(raw).digest('hex')
    const headers={'x-github-event':'push','x-github-delivery':'delivery-1','x-hub-signature-256':signature}
    const relayed=workflowNode('project-sync','Conservar assinatura GitHub',{headers},{$input:{item:{binary:{data:{data:Buffer.from(raw).toString('base64'),mimeType:'application/json'}}}}})
    const webhook=await fetch(`http://127.0.0.1:${port}/api/v1/integrations/github`,{method:'POST',headers:{'Content-Type':'application/json','X-GitHub-Event':relayed.json.event,'X-GitHub-Delivery':relayed.json.delivery,'X-Hub-Signature-256':relayed.json.signature},body:Buffer.from(relayed.binary.data.data,'base64')});assert.equal(webhook.status,200)
    const guardedReport=workflowNode('project-sync','Validar projeto e relatório',{body:{project_id:project.body.id,report}}).json
    assert.equal((await integration('/projects/'+guardedReport.project_id+'/reports',guardedReport.report)).body.id,receipt.body.id)
    const badWebhook=await fetch(`http://127.0.0.1:${port}/api/v1/integrations/github`,{method:'POST',headers:{'Content-Type':'application/json','X-GitHub-Event':'push','X-GitHub-Delivery':'delivery-2','X-Hub-Signature-256':signature},body:raw+' '});assert.equal(badWebhook.status,401)
    const largeRaw=JSON.stringify({repository:{html_url:'https://github.com/Example/Project'},padding:'x'.repeat(150000)})
    const largeSignature='sha256='+createHmac('sha256',process.env.GITHUB_WEBHOOK_SECRET).update(largeRaw).digest('hex')
    await database.query("UPDATE personal_projects SET updated_at='2026-01-01T00:00:00Z' WHERE id=$1",[project.body.id])
    const largeWebhook=await fetch(`http://127.0.0.1:${port}/api/v1/integrations/github`,{method:'POST',headers:{'Content-Type':'application/json','X-GitHub-Event':'push','X-GitHub-Delivery':'delivery-large','X-Hub-Signature-256':largeSignature},body:largeRaw});assert.equal(largeWebhook.status,200);assert.equal((await largeWebhook.json() as any).matched_projects,1)
    const activity=(await request('/projects/'+project.body.id)).body.project.updated_at;assert.ok(new Date(activity).valueOf()>Date.parse('2026-01-01T00:00:00Z'))
    await fetch(`http://127.0.0.1:${port}/api/v1/integrations/github`,{method:'POST',headers:{'Content-Type':'application/json','X-GitHub-Event':'push','X-GitHub-Delivery':'delivery-large','X-Hub-Signature-256':largeSignature},body:largeRaw});assert.equal((await request('/projects/'+project.body.id)).body.project.updated_at,activity,'Replay must not manufacture new project activity')
    assert.equal((await integration('/leads/capture',{...capture,summary:'x'.repeat(150000)})).status,413,'Ordinary API payload limit must remain 100KB')
    assert.equal(secretMatches('é'.repeat(process.env.ABELHA_INTEGRATION_TOKEN.length),process.env.ABELHA_INTEGRATION_TOKEN),false)
    const prospectBase=`http://127.0.0.1:${port}/api/v1/prospecting`
    async function prospect(path:string,body?:any){const response=await fetch(prospectBase+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json','X-Abelha-Client':'web'},body:body?JSON.stringify(body):undefined});return {status:response.status,body:await response.json() as any}}
    const candidates=await prospect('/leads/candidates');assert.equal(candidates.body.length,1)
    const approved=await prospect('/leads/candidates/'+candidates.body[0].id+'/approve',{});assert.equal(approved.status,200)
    assert.equal((await prospect('/leads/candidates/'+candidates.body[0].id+'/approve',{})).body.client_id,approved.body.client_id)
    const draft=await prospect('/drafts',{client_id:approved.body.client_id,template_key:'landing-page',idempotency_key:'draft-1'});assert.equal(draft.status,201)
    assert.equal((await prospect('/drafts',{client_id:approved.body.client_id,template_key:'landing-page',idempotency_key:'draft-1'})).body.id,draft.body.id)
    assert.equal((await pg.query<{count:number}>('SELECT count(*)::int AS count FROM clients')).rows[0].count,1)
    const duplicateName=await prospect('/leads/import',{source_key:'node/100',name:'Prospect sintético',niche:'Serviço',phone:'5511999999999',queried_at:new Date().toISOString()});assert.notEqual(duplicateName.body.client_id,approved.body.client_id,'Names alone must never merge different prospects')
    const capturedEmail=await integration('/leads/capture',{...capture,event_id:'capture-email',name:'Prospect com email',email:'prospect@example.invalid'});assert.equal(capturedEmail.status,201)
    const approvedEmail=await prospect('/leads/candidates/'+capturedEmail.body.id+'/approve',{});assert.equal(approvedEmail.status,200)
    assert.equal((await pg.query<{email:string}>('SELECT email FROM clients WHERE id=$1',[approvedEmail.body.client_id])).rows[0].email,'prospect@example.invalid')
    await pg.query('DELETE FROM clients WHERE id=$1',[approved.body.client_id]);assert.equal((await prospect('/drafts')).body.length,0,'Client deletion must cascade its drafts')
    const clientsBeforeStaging=(await pg.query('SELECT id FROM clients ORDER BY id')).rows
    const publicLead={source_key:'node/999',name:'Estabelecimento público sintético',niche:'Academias',phone:'5511888888888',address:'Rua sintética',queried_at:new Date().toISOString(),organization_id:'10000000-0000-4000-8000-000000000999'}
    const normalizedPublicLead=workflowNode('leads-search','Separar resultados',{items:[{...publicLead,source:'OpenStreetMap'}]})[0].json
    const staged=await integration('/leads/stage',normalizedPublicLead);assert.equal(staged.status,201,JSON.stringify(staged.body));assert.equal(staged.body.review_required,true)
    assert.equal((await integration('/leads/stage',publicLead)).body.id,staged.body.id)
    assert.equal((await integration('/leads/stage',{...publicLead,source_key:'../../tick'})).status,400)
    assert.equal((await integration('/leads/stage',publicLead,'invalid')).status,401)
    const pending=(await prospect('/leads/candidates')).body.find((row:any)=>row.id===staged.body.id);assert.equal(pending.source,'OpenStreetMap');assert.equal(pending.client_id,null);assert.match(pending.data.summary,/Academias/)
    assert.deepEqual((await pg.query('SELECT id FROM clients ORDER BY id')).rows,clientsBeforeStaging,'Integration may only stage a public result, never create a client')
    assert.equal((await pg.query<any>('SELECT organization_id FROM crm_lead_candidates WHERE id=$1',[staged.body.id])).rows[0].organization_id,org)
    assert.equal((await integration('/prices/'+watch.body.id+'/observations',{...observation,observed_at:new Date(Date.now()-60000).toISOString()})).status,409)
    await request('/subscriptions/'+subscription.body.id+'/payments','POST',{due_on:'2026-02-28',paid_on:'2026-02-28'});assert.match((await request('/subscriptions')).body.subscriptions[0].due_on,/^2026-03-31/)
    const sunday=new Date('2026-11-15T21:00:00Z')
    const preliminary=await weeklyReview(database,{org,user},new Date('2026-11-11T18:00:00Z'))
    await request('/projects','POST',{name:'Projeto criado depois da revisão parcial'})
    const finalReview=await weeklyReview(database,{org,user},sunday,true)
    assert.equal(finalReview.finalized,true);assert.equal(finalReview.id,preliminary.id);assert.equal(finalReview.data.period.to,'2026-11-15');assert.equal(finalReview.data.projects.some((p:any)=>p.name==='Projeto criado depois da revisão parcial'),true)
    await request('/preferences','PATCH',{morning_time:'23:59',weekly_time:'23:59'})
    await automationTick(database,{org,user},new Date('2026-11-23T03:00:00Z'))
    await automationTick(database,{org,user},new Date('2026-11-23T03:10:00Z'))
    const midnightReview=await database.query("SELECT data,finalized FROM personal_weekly_reviews WHERE organization_id=$1 AND user_id=$2 AND week_of='2026-11-16'",[org,user]);assert.equal(midnightReview.length,1);assert.equal(midnightReview[0].data.period.to,'2026-11-22');assert.equal(midnightReview[0].finalized,true)
    assert.equal((await database.query("SELECT count(*)::int AS count FROM personal_notifications WHERE organization_id=$1 AND user_id=$2 AND event_key='invoice-reminder:2026-11-22'",[org,user]))[0].count,1)
    const vapid=webpush.generateVAPIDKeys();process.env.VAPID_PUBLIC_KEY=vapid.publicKey;process.env.VAPID_PRIVATE_KEY=vapid.privateKey;process.env.VAPID_SUBJECT='mailto:synthetic@example.invalid'
    const keys={p256dh:vapid.publicKey,auth:Buffer.alloc(16,1).toString('base64url')}
    await request('/push-subscriptions','POST',{endpoint:'https://fcm.googleapis.com/fcm/send/device-one',keys});await request('/push-subscriptions','POST',{endpoint:'https://fcm.googleapis.com/fcm/send/device-two',keys})
    // Only one unread item makes the device retry scenario unambiguous.
    await database.query('UPDATE personal_notifications SET read_at=now() WHERE organization_id=$1 AND user_id=$2',[org,user])
    await database.query("INSERT INTO personal_notifications(organization_id,user_id,event_key,title,url) VALUES($1,$2,'push-retry','Sintético','/?space=personal&view=personal-overview')",[org,user])
    let retry=false;const deliveries:string[]=[]
    const transport=async(subscription:any)=>{deliveries.push(subscription.endpoint);if(subscription.endpoint.endsWith('two')&&!retry)throw new Error('temporary network failure');return {}}
    await sendPendingPush(database,{org,user},transport);retry=true;await sendPendingPush(database,{org,user},transport)
    assert.equal(deliveries.filter(endpoint=>endpoint.endsWith('one')).length,1);assert.equal(deliveries.filter(endpoint=>endpoint.endsWith('two')).length,2)
    assert.equal((await database.query('SELECT count(*)::int AS count FROM personal_push_deliveries WHERE organization_id=$1 AND user_id=$2',[org,user]))[0].count,2)
    await database.query('UPDATE personal_notifications SET read_at=now() WHERE organization_id=$1 AND user_id=$2',[org,user])
    for(let index=0;index<11;index++)await database.query("INSERT INTO personal_notifications(organization_id,user_id,event_key,title,url) VALUES($1,$2,$3,'Queue test','/?space=personal&view=personal-overview')",[org,user,'queue-'+index])
    const healthy:string[]=[];const partialTransport=async(subscription:any,payload:string)=>{if(subscription.endpoint.endsWith('two'))throw new Error('persistently unavailable');healthy.push(JSON.parse(payload).key);return {}}
    await sendPendingPush(database,{org,user},partialTransport);await sendPendingPush(database,{org,user},partialTransport)
    assert.equal(new Set(healthy).size,11,'A failing device must never block later notices to the healthy device');assert.equal(healthy.length,11)
    await database.query('UPDATE personal_notifications SET read_at=now() WHERE organization_id=$1 AND user_id=$2',[org,user])
    await database.query("INSERT INTO personal_notifications(organization_id,user_id,event_key,title,url) VALUES($1,$2,'expired-queue','Expired test','/?space=personal&view=personal-overview')",[org,user])
    const expired=await sendPendingPush(database,{org,user},async()=>{throw Object.assign(new Error('expired'),{statusCode:410})})
    assert.equal(expired.sent,0,'Expired subscriptions must never be counted as successful deliveries')
    assert.equal((await database.query('SELECT count(*)::int AS count FROM push_subscriptions WHERE organization_id=$1 AND user_id=$2',[org,user]))[0].count,0)
  } finally {if(server){server.closeAllConnections();await new Promise<void>(resolve=>server!.close(()=>resolve()))}if(sql)await sql.end({timeout:2});if(wire)await wire.stop();await pg.close()}
})
