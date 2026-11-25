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
    assert.equal((await owner(quotes,{model})).status,201)
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
