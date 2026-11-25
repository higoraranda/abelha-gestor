import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import express from 'express'
import postgres from 'postgres'
import bcrypt from 'bcryptjs'
import { PGlite } from '@electric-sql/pglite'
import { PGLiteSocketServer } from '@electric-sql/pglite-socket'
import { ExpressAuth } from '@auth/express'
import { getToken } from '@auth/core/jwt'

test('Auth.js safely rejects malformed Bearer encoding',async()=>{
  await assert.doesNotReject(async()=>{
    assert.equal(await getToken({req:new Request('https://abelha.example',{headers:{Authorization:'Bearer %'}}),secret:'synthetic-security-test-secret-of-32-characters'}),null)
  })
})

test('production auth preserves credential login, CSRF, secure cookies, legacy session and tenant claims',async()=>{
  const legacy=JSON.parse(fs.readFileSync('src/services/fixtures/auth-v035-session.json','utf8'))
  process.env.AUTH_SECRET=legacy.secret;process.env.AUTH_URL='https://abelha.example';process.env.NODE_ENV='production'
  const {createAuthConfig,authConfig}=await import('../auth.config');authConfig.logger={error(){},warn(){},debug(){}}
  const {createAuthMiddleware}=await import('../middleware/auth')
  const {tenantMiddleware}=await import('../middleware/tenant')
  const pg=new PGlite();let wire:PGLiteSocketServer|undefined;let sql:ReturnType<typeof postgres>|undefined;let server:ReturnType<express.Express['listen']>|undefined
  try {
    await pg.exec('CREATE TABLE users(id uuid primary key,organization_id uuid,name text,email text,password_hash text, account_role text NOT NULL)')
    await pg.query('INSERT INTO users VALUES($1,$2,$3,$4,$5,$6)',[legacy.payload.userId,legacy.payload.organizationId,'Synthetic auth user','synthetic@example.invalid',await bcrypt.hash('synthetic-password',4),'owner'])
    wire=new PGLiteSocketServer({db:pg,host:'127.0.0.1',port:0});await wire.start();sql=postgres('postgresql://postgres:postgres@'+wire.getServerConn()+'/postgres',{ssl:false,max:1})
    const config=createAuthConfig(sql,true);config.logger={error(){},warn(){},debug(){}}
    const app=express();app.use(express.json());app.use(express.urlencoded({extended:true}));app.use('/api/auth/*',ExpressAuth(config))
    app.get('/protected',createAuthMiddleware(config,sql),tenantMiddleware,(req,res)=>res.json({id:req.user?.userId,organizationId:req.organizationId}))
    server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server!.once('listening',resolve));const base='http://127.0.0.1:'+(server.address() as any).port
    const jar=new Map<string,string>()
    async function request(path:string,body?:Record<string,string>,cookies=jar){
      const response=await fetch(base+path,{method:body?'POST':'GET',redirect:'manual',headers:{Cookie:[...cookies].map(([k,v])=>k+'='+v).join('; '),...(body?{'Content-Type':'application/x-www-form-urlencoded','X-Auth-Return-Redirect':'1'}:{})},body:body?new URLSearchParams(body):undefined})
      for(const cookie of response.headers.getSetCookie()){const [entry]=cookie.split(';');const separator=entry.indexOf('=');const key=entry.slice(0,separator);if(/max-age=0/i.test(cookie)||!entry.slice(separator+1))cookies.delete(key);else cookies.set(key,entry.slice(separator+1))}
      return response
    }
    assert.equal((await request('/protected')).status,401,'Production must never use the loopback bypass')
    const legacyJar=new Map([[legacy.salt,legacy.token]])
    const old=await request('/protected',undefined,legacyJar);assert.equal(old.status,200);assert.deepEqual(await old.json(),{id:legacy.payload.userId,organizationId:legacy.payload.organizationId})
    await request('/api/auth/callback/credentials',{email:'synthetic@example.invalid',password:'synthetic-password',redirect:'false'})
    assert.equal((await request('/api/auth/session')).status,200);assert.equal((await (await request('/api/auth/session')).json())?.user,undefined,'Missing CSRF must not sign in')
    let csrf=await (await request('/api/auth/csrf')).json() as {csrfToken:string}
    await request('/api/auth/callback/credentials',{csrfToken:csrf.csrfToken,email:'synthetic@example.invalid',password:'wrong',redirect:'false'})
    assert.equal((await request('/protected')).status,401)
    csrf=await (await request('/api/auth/csrf')).json() as {csrfToken:string}
    const login=await request('/api/auth/callback/credentials',{csrfToken:csrf.csrfToken,email:'synthetic@example.invalid',password:'synthetic-password',redirect:'false'})
    const cookie=login.headers.getSetCookie().find(value=>value.startsWith('__Secure-authjs.session-token='));assert.ok(cookie,'Existing production cookie name must be preserved');assert.match(cookie,/HttpOnly/i);assert.match(cookie,/; Secure/i);assert.match(cookie,/SameSite=Lax/i)
    const protectedResponse=await request('/protected?organization_id=ffffffff-ffff-4fff-8fff-ffffffffffff');assert.equal(protectedResponse.status,200);assert.deepEqual(await protectedResponse.json(),{id:legacy.payload.userId,organizationId:legacy.payload.organizationId})
    const session=await (await request('/api/auth/session')).json() as any;assert.equal(session.user.id,legacy.payload.userId);assert.equal(session.user.organizationId,legacy.payload.organizationId)
    await pg.exec('ALTER TABLE users DROP COLUMN account_role')
    const withoutRole=await request('/api/auth/session',undefined,new Map(jar))
    assert.equal((await withoutRole.json())?.user?.id,undefined,'The published login cannot finalize a session before the account-role migration')
    await pg.exec("ALTER TABLE users ADD COLUMN account_role text NOT NULL DEFAULT 'owner'; ALTER TABLE users ADD COLUMN email_verified_at timestamptz")
    await pg.exec(fs.readFileSync('src/db/migrations/20261125_password_reset.sql','utf8'))
    const {createAccountRouter}=await import('../routes/account')
    const {postgresDatabase}=await import('./platform-db')
    const mailbox:string[]=[]
    app.use('/api/v1/account',createAccountRouter(postgresDatabase(sql),createAuthMiddleware(config,sql),undefined,{
      origin:'https://abelha.example',ownerEmail:'synthetic@example.invalid',send:async delivery=>{mailbox.push(delivery.link)},
    }))
    const reset=async (action:string,body:Record<string,string>,clientHeader=true)=>fetch(base+'/api/v1/account/password/reset/'+action,{
      method:'POST',headers:{'Content-Type':'application/json',...(clientHeader?{'X-Abelha-Client':'web'}:{})},body:JSON.stringify(body),
    })
    assert.equal((await reset('request',{email:'synthetic@example.invalid'},false)).status,403)
    const unknown=await reset('request',{email:'unknown@example.invalid'})
    const known=await reset('request',{email:'synthetic@example.invalid'})
    assert.equal(known.status,202);assert.equal(unknown.status,202);assert.deepEqual(await known.json(),await unknown.json())
    assert.equal(mailbox.length,1)
    const token=new URLSearchParams(new URL(mailbox[0]).hash.slice(1)).get('token')!
    assert.equal((await reset('confirm',{token,password:'new-synthetic-password'})).status,200)
    assert.equal((await reset('confirm',{token,password:'new-synthetic-password'})).status,400)
    assert.equal((await request('/protected')).status,401,'A reset revokes previously authenticated sessions')
    assert.equal((await request('/protected',undefined,new Map([[legacy.salt,legacy.token]]))).status,401,'A reset also revokes legacy sessions')
    csrf=await (await request('/api/auth/csrf')).json() as {csrfToken:string}
    await request('/api/auth/callback/credentials',{csrfToken:csrf.csrfToken,email:'synthetic@example.invalid',password:'synthetic-password',redirect:'false'})
    assert.equal((await request('/protected')).status,401,'The previous password is rejected')
    csrf=await (await request('/api/auth/csrf')).json() as {csrfToken:string}
    await request('/api/auth/callback/credentials',{csrfToken:csrf.csrfToken,email:'synthetic@example.invalid',password:'new-synthetic-password',redirect:'false'})
    assert.equal((await request('/protected')).status,200,'The new password gives access through the standard login')
    csrf=await (await request('/api/auth/csrf')).json() as {csrfToken:string}
    await request('/api/auth/signout',{csrfToken:csrf.csrfToken,redirect:'false'});assert.equal((await request('/protected')).status,401)
  } finally {if(server){server.closeAllConnections();await new Promise<void>(resolve=>server!.close(()=>resolve()))}if(sql)await sql.end({timeout:2});if(wire)await wire.stop();await pg.close()}
})
