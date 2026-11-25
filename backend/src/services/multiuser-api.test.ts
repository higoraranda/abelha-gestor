import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import express from 'express'
import bcrypt from 'bcryptjs'
import postgres from 'postgres'
import { ExpressAuth } from '@auth/express'
import { PGlite } from '@electric-sql/pglite'
import { PGLiteSocketServer } from '@electric-sql/pglite-socket'
import { createAuthConfig } from '../auth.config'
import { createAuthMiddleware, requireOwner } from '../middleware/auth'
import { tenantMiddleware } from '../middleware/tenant'
import { createAccountRouter } from '../routes/account'
import { createQuoteModelsRouter } from '../routes/quote-models'
import { createMemberModulesRouter } from '../routes/member-modules'
import { createPersonalRouter } from '../routes/personal'
import { postgresDatabase } from './platform-db'

test('real sessions redeem invitations and remain isolated across three workspaces',async()=>{
  process.env.AUTH_SECRET='isolated-abelha-multiuser-test-not-a-service-secret'
  process.env.ABELHA_REQUIRE_LOGIN='true'
  const pg=new PGlite()
  let wire:PGLiteSocketServer|undefined
  let sql:ReturnType<typeof postgres>|undefined
  let server:ReturnType<express.Express['listen']>|undefined
  const load=(path:string)=>readFileSync('src/db/'+path,'utf8')
  const ownerPassword='synthetic owner password'
  try {
    await pg.exec(load('schema.sql'))
    await pg.query("WITH o AS (INSERT INTO organizations(name) VALUES('Original') RETURNING id) INSERT INTO users(organization_id,name,email,password_hash) SELECT id,'Owner','Owner@Example.invalid',$1 FROM o",[await bcrypt.hash(ownerPassword,4)])
    await pg.exec(load('migrations/20261111_personal_platform.sql'))
    await pg.exec(load('migrations/20261125_account_invites.sql'))
    await pg.exec(load('migrations/20261125_signup_email.sql'))
    await pg.exec(load('migrations/20261125_quote_models.sql'))
    await pg.exec(load('migrations/20261126_quote_proposals.sql'))
    await pg.exec(load('migrations/20261127_quote_proposal_decisions.sql'))
    wire=new PGLiteSocketServer({db:pg,host:'127.0.0.1',port:0});await wire.start()
    sql=postgres('postgresql://postgres:postgres@'+wire.getServerConn()+'/postgres',{ssl:false,max:3})
    const config=createAuthConfig(sql,false)
    config.logger={error(error){console.error(error)},warn(){},debug(){}}
    const auth=createAuthMiddleware(config,sql)
    const database=postgresDatabase(sql)
    const app=express()
    app.use(express.json(),express.urlencoded({extended:true}))
    app.use('/api/auth/*',ExpressAuth(config))
    const mailbox=new Map<string,string>()
    app.use('/api/v1/account',createAccountRouter(database,auth,{
      secret:'synthetic-only-secret-for-signup-verification',
      send:async(email:string,code:string)=>{mailbox.set(email,code)}
    }))
    app.use('/api/v1/quote-models',createQuoteModelsRouter(database,auth))
    app.use('/api/v1/member-modules',createMemberModulesRouter(database,auth))
    app.use('/api/v1/personal',createPersonalRouter(database,[auth,tenantMiddleware]))
    app.get('/api/events',auth,requireOwner,(_req,res)=>res.status(200).end())
    server=app.listen(0,'127.0.0.1')
    await new Promise<void>(resolve=>server!.once('listening',resolve))
    const address=server.address();assert.ok(address&&typeof address==='object')
    const base='http://127.0.0.1:'+address.port
    process.env.AUTH_URL=base
    function client(){
      const jar=new Map<string,string>()
      return async (path:string,body?:object|URLSearchParams,method=body?'POST':'GET')=>{
        const form=body instanceof URLSearchParams
        const response=await fetch(base+path,{method,redirect:'manual',headers:{
          Cookie:[...jar].map(([k,v])=>k+'='+v).join('; '),
          ...(body?{'Content-Type':form?'application/x-www-form-urlencoded':'application/json','X-Abelha-Client':'web'}:{}),
          ...(form?{'X-Auth-Return-Redirect':'1'}:{}),
        },body:!body?undefined:form?body:JSON.stringify(body)})
        for(const cookie of response.headers.getSetCookie()){
          const [entry]=cookie.split(';');const separator=entry.indexOf('=');const key=entry.slice(0,separator)
          if(/max-age=0/i.test(cookie)||!entry.slice(separator+1))jar.delete(key);else jar.set(key,entry.slice(separator+1))
        }
        return response
      }
    }
    async function signIn(request:ReturnType<typeof client>,email:string,password:string){
      const {csrfToken}=await (await request('/api/auth/csrf')).json() as {csrfToken:string}
      const callback=await request('/api/auth/callback/credentials',new URLSearchParams({csrfToken,email,password,redirect:'false'}))
      assert.equal(callback.status,200)
      const {url}=await callback.json() as {url:string}
      assert.equal(new URL(url,base).searchParams.has('error'),false)
      return (await (await request('/api/auth/session')).json() as {user:{role:string;organizationId:string}}).user
    }
    const owner=client(), guestA=client(), guestB=client()
    const invites='/api/v1/account/invites', projects='/api/v1/personal/projects'
    assert.equal((await owner(invites,{email:'a@example.invalid'})).status,401)
    const ownerSession=await signIn(owner,'OWNER@example.invalid',ownerPassword)
    assert.equal(ownerSession.role,'owner')
    assert.equal((await owner('/api/events')).status,200)
    assert.equal((await owner(projects,{name:'Projeto do dono'})).status,201)
    const sessions=[]
    for(const [index,request] of [guestA,guestB].entries()){
      const email='friend'+index+'@example.invalid',password='synthetic member password'
      const response=await owner(invites,{email});assert.equal(response.status,201)
      const {token}=await response.json() as {token:string}
      const registration={token,email:email.toUpperCase(),name:'Convidado '+index,password}
      assert.equal((await request('/api/v1/account/register',registration)).status,400)
      const codeRequest=await request('/api/v1/account/register/code',{token,email:email.toUpperCase()})
      assert.equal(codeRequest.status,200)
      const challenge=await codeRequest.json() as {challengeId:string;code?:string}
      assert.equal(challenge.code,undefined)
      assert.match(mailbox.get(email)??'',/^\d{6}$/)
      assert.equal((await request('/api/v1/account/register/code',{email,token})).status,429)
      const attempt={...registration,challengeId:challenge.challengeId,code:mailbox.get(email)}
      const wrong=attempt.code==='000000'?'000001':'000000'
      assert.equal((await request('/api/v1/account/register',{...attempt,code:wrong})).status,400)
      assert.equal((await request('/api/v1/account/register',attempt)).status,201)
      assert.equal((await request('/api/v1/account/register',attempt)).status,400)
      const session=await signIn(request,email.toUpperCase(),password)
      assert.equal(session.role,'member');sessions.push(session)
      assert.equal((await request('/api/events')).status,403)
      assert.equal((await request(invites,{email:'third@example.invalid'})).status,403)
      assert.equal((await request('/api/v1/personal/preferences')).status,403)
      assert.deepEqual(await (await request(projects)).json(),[])
      assert.equal((await request(projects,{name:'Projeto '+index,next_step:'Planejar'})).status,201)
    }
    assert.equal(new Set([ownerSession,...sessions].map(s=>s.organizationId)).size,3)
    for(const [index,request] of [owner,guestA,guestB].entries()){
      const rows=await (await request(projects)).json() as {name:string}[]
      assert.deepEqual(rows.map(row=>row.name),[index===0?'Projeto do dono':'Projeto '+(index-1)])
    }
    const quotes='/api/v1/quote-models'
    const model={name:'Orçamento de teste',version:1,baseCents:10000,monthlyCents:0,discountBps:0,lines:[]}
    assert.equal((await client()(quotes)).status,401)
    const preview=await guestA(quotes+'/preview',{model})
    assert.equal(preview.status,200)
    assert.deepEqual(await (await guestA(quotes)).json(),[],'Preview does not persist')
    const saved=await guestA(quotes,{model});assert.equal(saved.status,201)
    const entry=await saved.json() as {id:string;revision:number}
    assert.deepEqual(await (await guestB(quotes)).json(),[])
    assert.deepEqual(await (await owner(quotes)).json(),[])
    assert.equal((await guestB(quotes+'/'+entry.id,{model,revision:entry.revision},'PATCH')).status,404)
    assert.equal((await guestA(quotes+'/'+entry.id,{model:{...model,name:'Ajustado'},revision:entry.revision},'PATCH')).status,200)
    assert.equal((await guestA(quotes+'/'+entry.id,{model,revision:entry.revision},'PATCH')).status,409)
    const ownedModel=await owner(quotes,{model});assert.equal(ownedModel.status,201)
    const ownedModelEntry=await ownedModel.json() as {id:string;revision:number}
    const proposals=quotes+'/proposals'
    assert.equal((await client()(proposals)).status,401)
    assert.equal((await guestA(proposals)).status,403)
    assert.equal((await guestB(proposals,{model})).status,403)
    const [ownedClient,foreignClient]=await sql`
      INSERT INTO clients(organization_id,name,email,whatsapp)
      VALUES(${ownerSession.organizationId},'Studio Sintético','private@example.invalid','5511999999999'),
        (${sessions[0].organizationId},'Contato alheio',NULL,NULL) RETURNING id
    `
    const brief={clientId:ownedClient.id,title:'Site de catálogo',briefing:'Criar catálogo acessível com três categorias.',model,quantities:{}}
    assert.equal((await owner(proposals,{...brief,clientId:foreignClient.id})).status,404)
    assert.equal((await owner(proposals,{...brief,approved_at:'now'})).status,400)
    const draft=await owner(proposals,brief);assert.equal(draft.status,201)
    const savedQuote=await draft.json() as {id:string;approved_at:string|null;proposal_text:string;quote:{oneTimeCents:number}}
    assert.equal(savedQuote.approved_at,null)
    assert.equal(savedQuote.quote.oneTimeCents,10000)
    assert.match(savedQuote.proposal_text,/Site de catálogo/)
    assert.doesNotMatch(savedQuote.proposal_text,/private@example.invalid|5511999999999/)
    const refusal=await owner(proposals,{...brief,terms:'Validade de dez dias.'})
    assert.equal(refusal.status,201)
    const refusedProposal=await refusal.json() as {id:string;refused_at:string|null;proposal_text:string}
    const refusedPath=proposals+'/'+refusedProposal.id
    assert.match(refusedProposal.proposal_text,/Validade de dez dias/)
    assert.equal((await guestA(refusedPath+'/refuse',{confirmed:true})).status,403)
    assert.equal((await owner(refusedPath+'/refuse',{confirmed:false})).status,400)
    const firstRefusal=await owner(refusedPath+'/refuse',{confirmed:true})
    assert.equal(firstRefusal.status,200)
    const refused=await firstRefusal.json() as {refused_at:string;approved_at:string|null;proposal_text:string}
    assert.ok(refused.refused_at);assert.equal(refused.approved_at,null)
    assert.equal(refused.proposal_text,refusedProposal.proposal_text)
    assert.equal((await owner(refusedPath+'/approve',{confirmed:true})).status,409)
    assert.equal((await owner(refusedPath+'/prompt')).status,409)
    const replayRefusal=await owner(refusedPath+'/refuse',{confirmed:true})
    assert.equal((await replayRefusal.json() as {refused_at:string}).refused_at,refused.refused_at)
    const one=proposals+'/'+savedQuote.id
    assert.equal((await owner(one+'/prompt')).status,409)
    assert.equal((await guestA(one+'/approve',{})).status,403)
    assert.equal((await owner(one+'/approve',{})).status,400)
    const approved=await owner(one+'/approve',{confirmed:true});assert.equal(approved.status,200)
    const approvedRow=await approved.json() as {approved_at:string;proposal_text:string;quote:{oneTimeCents:number}}
    assert.ok(approvedRow.approved_at)
    assert.equal(approvedRow.proposal_text,savedQuote.proposal_text)
    assert.equal(approvedRow.quote.oneTimeCents,savedQuote.quote.oneTimeCents)
    assert.equal((await owner(one+'/refuse',{confirmed:true})).status,409)
    assert.equal((await owner(quotes+'/'+ownedModelEntry.id,{model:{...model,baseCents:90000},revision:ownedModelEntry.revision},'PATCH')).status,200)
    const preserved=await (await owner(one)).json() as typeof approvedRow
    assert.equal(preserved.quote.oneTimeCents,savedQuote.quote.oneTimeCents)
    assert.equal(preserved.proposal_text,savedQuote.proposal_text)
    const again=await owner(one+'/approve',{confirmed:true})
    assert.equal((await again.json() as {approved_at:string}).approved_at,approvedRow.approved_at)
    const prompt=await owner(one+'/prompt');assert.equal(prompt.status,200)
    const promptText=(await prompt.json() as {prompt:string}).prompt
    assert.match(promptText,/Critérios de aceitação/)
    assert.match(promptText,/Criar catálogo acessível/)
    assert.doesNotMatch(promptText,/private@example.invalid|5511999999999/)
    await sql`DELETE FROM clients WHERE id=${ownedClient.id}`
    const retained=await (await owner(one)).json() as {client_id:string|null;client_name:string}
    assert.equal(retained.client_id,null);assert.equal(retained.client_name,'Studio Sintético')
    const access='/api/v1/member-modules'
    const ownModules=async (request:ReturnType<typeof client>)=>(await request(access+'/me')).json()
    assert.equal((await client()(access+'/me')).status,401)
    const defaults={projects:true,calculator:true,finance:false,subscriptions:false,prices:false,hidden:[]}
    assert.deepEqual(await ownModules(guestA),defaults,'Existing members retain the legacy defaults before migration')
    await pg.exec(load('migrations/20261126_member_modules.sql'))
    await pg.exec(load('migrations/20261127_managed_accounts.sql'))
    const members=await (await owner(access+'/members')).json() as {id:string;email:string;projects:boolean;calculator:boolean}[]
    assert.equal(members.length,2)
    assert.ok(members.every(m=>m.projects&&m.calculator))
    assert.equal((await guestA(access+'/members')).status,403)
    const member=members.find(m=>m.email==='friend0@example.invalid')!
    const memberPath=access+'/members/'+member.id
    assert.equal((await guestA(memberPath,{projects:true},'PATCH')).status,403)
    assert.equal((await owner(memberPath,{role:'owner'},'PATCH')).status,400)
    const [unmanaged]=await sql`
      INSERT INTO users(organization_id,name,email,account_role) VALUES (${sessions[0].organizationId},'Outra conta','unmanaged@example.invalid','member') RETURNING id
    `
    assert.equal((await owner(access+'/members/'+unmanaged.id,{projects:false},'PATCH')).status,404)
    assert.equal((await owner(memberPath,{projects:false},'PATCH')).status,200)
    assert.deepEqual(await ownModules(guestA),{...defaults,projects:false})
    assert.equal((await guestA(projects)).status,403)
    assert.equal((await guestA(projects,{name:'Bloqueado'})).status,403)
    assert.equal((await guestA(quotes)).status,200)
    assert.deepEqual(await ownModules(guestB),defaults)
    assert.equal((await guestB(projects)).status,200)
    assert.equal((await owner(memberPath,{projects:true,calculator:false},'PATCH')).status,200)
    assert.equal((await guestA(projects)).status,200)
    assert.equal((await guestA(quotes)).status,403)
    assert.equal((await guestA(quotes+'/preview',{model})).status,403)
    assert.equal((await guestA(quotes,{model})).status,403)
    assert.equal((await guestA(quotes+'/'+entry.id,{model,revision:2},'PATCH')).status,403)
    assert.equal((await guestB(quotes)).status,200)
    assert.equal((await owner(memberPath,{calculator:true},'PATCH')).status,200)
    assert.equal((await guestA(quotes)).status,200)
    const finance='/api/v1/personal/finance',subscriptions='/api/v1/personal/subscriptions'
    assert.equal((await guestA(finance)).status,403)
    assert.equal((await guestA(subscriptions)).status,403)
    assert.equal((await owner(memberPath,{finance:true},'PATCH')).status,200)
    assert.deepEqual(await ownModules(guestA),{...defaults,finance:true})
    assert.equal((await guestA(finance)).status,200)
    assert.equal((await guestA(subscriptions)).status,403)
    assert.equal((await guestB(finance)).status,403)
    const secondMember=members.find(m=>m.email==='friend1@example.invalid')!
    assert.equal((await owner(access+'/members/'+secondMember.id,{finance:true},'PATCH')).status,200)
    const cycle=await guestA(finance+'/cycles',{name:'Fatura particular',starts_on:'2020-01-01',closes_on:'2020-01-31'})
    assert.equal(cycle.status,201)
    const foreignCycle=(await cycle.json() as {id:string}).id
    const ownFinance=await (await guestB(finance)).json() as {cycles:unknown[]}
    assert.deepEqual(ownFinance.cycles,[])
    assert.equal((await guestB(finance+'/entries',{cycle_id:foreignCycle,recorded_on:'2020-01-03',amount:10})).status,404)
    const p=access+'/me/preferences'
    assert.equal((await guestA(p,{hidden:['projects'],finance:false},'PATCH')).status,400)
    assert.equal((await guestA(p,{hidden:['projects','subscriptions']},'PATCH')).status,200)
    assert.deepEqual(await ownModules(guestA),{...defaults,finance:true,hidden:['projects']})
    assert.equal((await guestA(projects)).status,200,'A personal visibility preference cannot affect API authorization')
    assert.equal((await owner(memberPath,{finance:false,subscriptions:true},'PATCH')).status,200)
    assert.equal((await guestA(finance)).status,403)
    assert.equal((await guestA(subscriptions)).status,200)
    assert.equal((await guestA('/api/events')).status,403)
    const prices='/api/v1/personal/prices'
    assert.equal((await guestA(prices)).status,403)
    assert.equal((await owner(memberPath,{prices:true},'PATCH')).status,200)
    const monitor=await guestA(prices);assert.equal(monitor.status,200)
    assert.equal((await monitor.json() as {provider_configured:boolean}).provider_configured,false)
    assert.equal((await guestA(prices,{name:'Produto sintético',product_url:'https://store.example.invalid/item'})).status,201)
    assert.equal((await guestB(prices)).status,403)
    const record=await (await guestA(projects)).json() as unknown[]
    assert.equal((await owner(memberPath+'/status',{active:false},'PATCH')).status,200)
    assert.equal((await guestA(projects)).status,401,'Previously established session is revoked')
    assert.equal((await guestA(quotes)).status,401)
    assert.equal(((await (await guestA('/api/auth/session')).json()) as {user?:unknown})?.user,undefined,'Revoked cookie does not expose stale name/email')
    const disabled=client()
    const csrfWhileDisabled=await (await disabled('/api/auth/csrf')).json() as {csrfToken:string}
    const disabledSignIn=await disabled('/api/auth/callback/credentials',new URLSearchParams({csrfToken:csrfWhileDisabled.csrfToken,email:'friend0@example.invalid',password:'synthetic member password',redirect:'false'}))
    assert.equal(new URL((await disabledSignIn.json() as {url:string}).url,base).searchParams.has('error'),true)
    assert.equal((await owner(memberPath+'/status',{active:true},'PATCH')).status,200)
    assert.equal((await guestA(projects)).status,401,'Reactivation must not resurrect the old JWT')
    await signIn(guestA,'friend0@example.invalid','synthetic member password')
    assert.deepEqual(await (await guestA(projects)).json(),record,'Disable/reactivate never deletes member data')
    const latest=await (await owner(access+'/members')).json() as {id:string;active:boolean;last_sign_in_at:string|null}[]
    assert.ok(latest.find(item=>item.id===member.id)?.last_sign_in_at)
    assert.ok(latest.find(item=>item.id===member.id)?.active)
    assert.equal((await guestA(memberPath+'/status',{active:false},'PATCH')).status,403)
    const {csrfToken}=await (await guestA('/api/auth/csrf')).json() as {csrfToken:string}
    await guestA('/api/auth/signout',new URLSearchParams({csrfToken,redirect:'false'}))
    assert.equal((await guestA(projects)).status,401)
  } finally {
    if(server){server.closeAllConnections();await new Promise<void>(resolve=>server!.close(()=>resolve()))}
    if(sql)await sql.end({timeout:2})
    if(wire)await wire.stop()
    await pg.close()
  }
})
