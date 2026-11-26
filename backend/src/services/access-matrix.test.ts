import test from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { Module } from 'node:module'
import { resolve } from 'node:path'
import express from 'express'
import postgres from 'postgres'
import bcrypt from 'bcryptjs'
import { PGlite } from '@electric-sql/pglite'
import { PGLiteSocketServer } from '@electric-sql/pglite-socket'

type Route={endpoint:string;method:string;route:string;kind:string;module:string}
type Check={case:string;status:number;verdict:'positive'|'negative'}
const {inventory,sourceFingerprint,receiptPath}=require(resolve('scripts/map-access.cjs')) as {
  inventory:()=>Route[];sourceFingerprint:()=>string;receiptPath:string
}
const dummyId='11111111-1111-4111-8111-111111111111'
const loginSecret='synthetic-loopback-auth-coverage-secret-only'
const codexToken='synthetic-loopback-dedicated-codex-token'
const automationToken='synthetic-loopback-automation-token-not-live'
const githubSecret='synthetic-loopback-github-not-remote'
const evolutionSecret='synthetic-loopback-evolution-not-remote'
const publicKinds=new Set(['public','invite','reset'])
const services=new Set(['codex','automation','github','evolution'])
const defaultModel={version:1,name:'Modelo sintético',baseCents:1000,monthlyCents:0,discountBps:0,lines:[]}

test('parametric route authorization in production routers over real synthetic Auth.js sessions',async t=>{
  const sourceDigest=sourceFingerprint(), all=inventory()
  const exact=new Map(all.map(row=>[row.endpoint,row]))
  const checks=new Map<string,Check[]>(),auth:Check[]=[]
  const expectation=(endpoint:string,name:string,status:number,wanted:number,verdict:Check['verdict'])=>{
    assert.equal(status,wanted,endpoint+': '+name)
    const entry=checks.get(endpoint)??[]
    entry.push({case:name,status,verdict});checks.set(endpoint,entry)
  }
  Object.assign(process.env,{
    NODE_ENV:'test',PORT:'0',ABELHA_REQUIRE_LOGIN:'true',
    DATABASE_URL:'postgres://synthetic:synthetic@127.0.0.1:1/never_connect',
    DOTENV_CONFIG_PATH:'missing-synthetic-authorization-fixture.env',
    AUTH_SECRET:loginSecret,ABELHA_CODEX_REPORT_TOKEN:codexToken,
    ABELHA_INTEGRATION_TOKEN:automationToken,GITHUB_WEBHOOK_SECRET:githubSecret,
    EVOLUTION_WEBHOOK_SECRET:evolutionSecret,EVOLUTION_ALLOWED_ORIGINS:'',
    ABELHA_CODEX_PROJECTS_JSON:'[]',ABELHA_CODEX_PROJECT_ID:'',PRICE_ALLOWED_HOSTS:'',
    ABELHA_OTP_SECRET:'synthetic-loopback-otp-test-only-nonsecret',
    ABELHA_OTP_RESEND_API_KEY:'synthetic-test-mail-adapter',
    ABELHA_OTP_FROM:'synthetic@example.invalid',ABELHA_OWNER_RECOVERY_EMAIL:'',
    VAPID_PRIVATE_KEY:'',VAPID_PUBLIC_KEY:'',VAPID_SUBJECT:'',
  })
  const bootstrap=new PGlite()
  let pg:PGlite|undefined,wire:PGLiteSocketServer|undefined,sql:ReturnType<typeof postgres>|undefined
  let server:ReturnType<typeof express.application.listen>|undefined
  const dbPath=require.resolve('../db/index')
  const savedModule=require.cache[dbPath]
  const mailbox=new Map<string,string>()
  let origin=''
  const originalFetch=globalThis.fetch
  t.mock.method(globalThis,'fetch',async(input:URL|RequestInfo,options?:RequestInit)=>{
    const url=new URL(input instanceof Request?input.url:input.toString())
    if(url.origin===origin&&origin)return originalFetch(input,options)
    if(url.href==='https://api.resend.com/emails'){
      const value=JSON.parse(String(options?.body)) as {to:string[];text:string}
      assert.equal(value.to.every(address=>address.endsWith('@example.invalid')),true)
      const code=value.text.match(/(?:^|\n)(\d{6})(?:\n|$)/)?.[1]
      if(code)mailbox.set(value.to[0],code)
      return Response.json({id:'synthetic-mail-only'})
    }
    throw Error('A fixture recusa chamadas externas.')
  })
  try{
    await bootstrap.exec('CREATE DATABASE abelha_homologacao')
    pg=new PGlite({database:'abelha_homologacao',loadDataDir:await bootstrap.dumpDataDir()})
    await pg.exec(readFileSync('src/db/homologation/bootstrap-empty.sql','utf8'))
    const ownerPassword='synthetic fixture owner password'
    const memberPassword='synthetic fixture member password'
    const [ownerIds]=(await pg.query<{id:string;organization_id:string}>(`
      WITH org AS (INSERT INTO organizations(name) VALUES('Carteira sintética A') RETURNING id)
      INSERT INTO users(organization_id,name,email,password_hash) SELECT id,'Titular sintético','owner@example.invalid',$1 FROM org RETURNING id,organization_id
    `,[await bcrypt.hash(ownerPassword,4)])).rows
    for(const name of readdirSync('src/db/migrations').filter(name=>/^202611(?:25|26|27|28|29)_.*\.sql$/.test(name)).sort())await pg.exec(readFileSync('src/db/migrations/'+name,'utf8'))
    const [project]=(await pg.query<{id:string}>(`INSERT INTO personal_projects(organization_id,user_id,name,repository)
      VALUES($1,$2,'Projeto sintético permitido','https://github.com/example/authorized') RETURNING id`,[ownerIds.organization_id,ownerIds.id])).rows
    Object.assign(process.env,{
      ABELHA_INTEGRATION_ORGANIZATION_ID:ownerIds.organization_id,ABELHA_INTEGRATION_USER_ID:ownerIds.id,
      ABELHA_CODEX_PROJECTS_JSON:JSON.stringify([{id:project.id,repository:'https://github.com/example/authorized'}]),
    })
    wire=new PGLiteSocketServer({db:pg,host:'127.0.0.1',port:0});await wire.start()
    sql=postgres('postgresql://postgres:postgres@'+wire.getServerConn()+'/postgres',{ssl:false,max:1})
    // Replace only the transport, not a route or guard. The actual app is started
    // with an ephemeral loopback listener; all sessions are issued by Auth.js.
    const shim=new Module(dbPath);shim.filename=dbPath;shim.loaded=true;shim.exports={db:sql};require.cache[dbPath]=shim
    const originalListen=express.application.listen
    express.application.listen=function(this:typeof express.application,...args:unknown[]){
      assert.equal(args[0],0);assert.equal(args[1],'127.0.0.1')
      server=Reflect.apply(originalListen,this,args) as NonNullable<typeof server>
      return server
    } as typeof originalListen
    try{await import('../app')}finally{express.application.listen=originalListen}
    assert.ok(server)
    await new Promise<void>(resolve=>server!.listening?resolve():server!.once('listening',resolve))
    const address=server.address();assert.ok(address&&typeof address==='object')
    origin='http://127.0.0.1:'+address.port
    process.env.AUTH_URL=origin
    process.env.FRONTEND_URL=origin
    const {authConfig}=await import('../auth.config')
    authConfig.logger={error(){},warn(){},debug(){}}
    function browser(){
      const jar=new Map<string,string>()
      return async(path:string,options:{method?:string;data?:object|URLSearchParams;headers?:Record<string,string>}={})=>{
        const form=options.data instanceof URLSearchParams
        const response=await fetch(origin+path,{
          method:options.method??'GET',redirect:'manual',signal:AbortSignal.timeout(7000),
          headers:{Cookie:[...jar].map(([k,v])=>k+'='+v).join('; '),
            ...(options.data?{'Content-Type':form?'application/x-www-form-urlencoded':'application/json','X-Abelha-Client':'web'}:{}),
            ...(form?{'X-Auth-Return-Redirect':'1'}:{}),...options.headers},
          body:form?options.data!.toString():options.data?JSON.stringify(options.data):undefined,
        })
        for(const cookie of response.headers.getSetCookie()){
          const [entry]=cookie.split(';'), split=entry.indexOf('='), key=entry.slice(0,split), value=entry.slice(split+1)
          if(/max-age=0/i.test(cookie)||!value)jar.delete(key);else jar.set(key,value)
        }
        return response
      }
    }
    type Browser=ReturnType<typeof browser>
    async function signIn(request:Browser,email:string,password:string,label:string){
      const csrf=await request('/api/auth/csrf');assert.equal(csrf.status,200)
      const {csrfToken}=await csrf.json() as {csrfToken:string};assert.ok(csrfToken)
      const callback=await request('/api/auth/callback/credentials',{method:'POST',data:new URLSearchParams({csrfToken,email,password,redirect:'false'})})
      assert.equal(callback.status,200)
      assert.equal(new URL((await callback.json() as {url:string}).url,origin).searchParams.has('error'),false)
      const response=await request('/api/auth/session')
      assert.equal(response.status,200);const session=await response.json() as {user:{id:string;organizationId:string;role:string}}
      assert.ok(session.user?.id)
      auth.push({case:'GET /api/auth/csrf · '+label,status:csrf.status,verdict:'positive'},{case:'POST /api/auth/callback/credentials · '+label,status:callback.status,verdict:'positive'},{case:'GET /api/auth/session · '+label,status:response.status,verdict:'positive'})
      return session.user
    }
    function rowPath(endpoint:string){const rule=exact.get(endpoint);assert.ok(rule,'Endpoint não inventariado: '+endpoint);return rule.route}
    async function exercise(request:Browser,endpoint:string,name:string,wanted:number,verdict:Check['verdict'],options:{data?:object;params?:Record<string,string>;query?:string;headers?:Record<string,string>}={}){
      const target=exact.get(endpoint);assert.ok(target,'Endpoint não inventariado: '+endpoint)
      const method=target.method,path=rowPath(endpoint).replace(/:([A-Za-z]+)/g,(_m,param:string)=>options.params?.[param]??dummyId)+(options.query??'')
      const response=await request(path,{method,...(method!=='GET'?{data:options.data??{}}:{}),headers:options.headers})
        .catch(cause=>{throw new Error(endpoint+': sem resposta para '+name,{cause})})
      expectation(endpoint,name,response.status,wanted,verdict)
      return response
    }
    const anonymous=browser(),owner=browser(),guestA=browser(),guestB=browser(),disabled=browser(),revoked=browser()
    await signIn(owner,'owner@example.invalid',ownerPassword,'proprietário')
    async function invite(request:Browser,email:string,label:string){
      const link=await exercise(owner,'POST /api/v1/account/invites','emissão pelo proprietário · '+label,201,'positive',{data:{email,validityHours:4}})
      const {token}=await link.json() as {token:string}
      const otp=await exercise(request,'POST /api/v1/account/register/code','OTP simulado do convite · '+label,200,'positive',{data:{email,token}})
      const {challengeId}=await otp.json() as {challengeId:string};const code=mailbox.get(email);assert.ok(code)
      await (await exercise(request,'POST /api/v1/account/register','resgate sintético · '+label,201,'positive',{data:{token,email,challengeId,code,name:label,password:memberPassword}})).body?.cancel()
      return signIn(request,email,memberPassword,label)
    }
    const memberA=await invite(guestA,'guest-a@example.invalid','membro A')
    const memberB=await invite(guestB,'guest-b@example.invalid','membro B')
    const memberDisabled=await invite(disabled,'disabled@example.invalid','conta desativada após login')
    const memberRevoked=await invite(revoked,'revoked@example.invalid','sessão a revogar')
    assert.equal(new Set([ownerIds.organization_id,memberA.organizationId,memberB.organizationId,memberDisabled.organizationId,memberRevoked.organizationId]).size,5)
    for(const userId of [memberDisabled.id,memberRevoked.id]){
      await (await exercise(owner,'PATCH /api/v1/member-modules/members/:id/status','proprietário desativa convidado',200,'positive',{data:{active:false},params:{id:userId}})).body?.cancel()
    }
    await (await exercise(owner,'PATCH /api/v1/member-modules/members/:id/status','proprietário reativa sem restaurar JWT',200,'positive',{data:{active:true},params:{id:memberRevoked.id}})).body?.cancel()
    await (await exercise(owner,'PATCH /api/v1/member-modules/members/:id','módulos permitidos para A',200,'positive',{data:{projects:true,calculator:true,finance:true,subscriptions:true,prices:true},params:{id:memberA.id}})).body?.cancel()
    await (await exercise(owner,'PATCH /api/v1/member-modules/members/:id','módulos desabilitados para B',200,'positive',{data:{projects:false,calculator:false,finance:false,subscriptions:false,prices:false},params:{id:memberB.id}})).body?.cancel()
    for(const row of all){
      if(publicKinds.has(row.kind))continue
      if(services.has(row.kind)){
        const bad={Authorization:'Bearer synthetic-invalid-credential','X-Hub-Signature-256':'sha256='+'0'.repeat(64),'X-Evolution-Secret':'synthetic-invalid-secret'}
        await (await exercise(anonymous,row.endpoint,'credencial ausente',401,'negative')).body?.cancel()
        await (await exercise(anonymous,row.endpoint,'credencial inválida',401,'negative',{headers:bad})).body?.cancel()
        if(row.kind==='automation'||row.kind==='codex'){
          await (await exercise(anonymous,row.endpoint,'token válido de outra integração',401,'negative',{headers:{Authorization:'Bearer '+(row.kind==='automation'?codexToken:automationToken)}})).body?.cancel()
        }
        continue
      }
      for(const [actor,name] of [[anonymous,'anônimo'],[disabled,'conta desativada'],[revoked,'JWT revogado após reativação']] as const)
        await (await exercise(actor,row.endpoint,name,401,'negative')).body?.cancel()
      if(row.kind==='owner'||row.kind==='ownerIssuer'||row.kind==='personalOwner'){
        await (await exercise(guestA,row.endpoint,'membro A (outro tenant)',403,'negative')).body?.cancel()
        await (await exercise(guestB,row.endpoint,'membro B (outro tenant)',403,'negative')).body?.cancel()
      }else if(row.kind==='member'){
        await (await exercise(owner,row.endpoint,'proprietário não é titular membro',403,'negative')).body?.cancel()
      }else if(row.kind==='module'){
        await (await exercise(guestB,row.endpoint,'módulo desabilitado',403,'negative')).body?.cancel()
      }else assert.fail('Classificação sem caso: '+row.kind)
    }
    for(const row of all.filter(row=>row.kind==='public'))
      await (await exercise(anonymous,row.endpoint,'health sem sessão',200,'positive')).body?.cancel()
    for(const endpoint of ['POST /api/v1/account/register/code','POST /api/v1/account/register','POST /api/v1/account/password/reset/confirm'])
      await (await exercise(anonymous,endpoint,'token ausente ou inválido',400,'negative',{data:{email:'guest-a@example.invalid',token:'invalid'}})).body?.cancel()
    const recovery=await exercise(anonymous,'POST /api/v1/account/password/reset/request','resposta neutra para e-mail fictício',202,'positive',{data:{email:'unknown@example.invalid'}})
    assert.deepEqual(await recovery.json(),{accepted:true})
    await (await exercise(anonymous,'POST /api/v1/account/password/reset/request','e-mail inválido',400,'negative',{data:{email:'invalid'}})).body?.cancel()

    await (await exercise(owner,'GET /api/v1/account/invites','listagem do emissor',200,'positive')).body?.cancel()
    await (await exercise(owner,'GET /api/v1/member-modules/members','lista administrada pelo emissor',200,'positive')).body?.cancel()
    await (await exercise(owner,'POST /api/v1/account/invites','edição exclusiva dos convites próprios',201,'positive',{data:{email:'temporary@example.invalid'}})).body?.cancel()
    await (await exercise(owner,'POST /api/v1/account/invites/expire','revogação de convite pendente próprio',204,'positive',{data:{email:'temporary@example.invalid'}})).body?.cancel()

    const prefs='PATCH /api/v1/member-modules/me/preferences'
    const visibility=await exercise(guestA,prefs,'membro altera visibilidade própria',200,'positive',{data:{hidden:['projects']}})
    assert.deepEqual(await visibility.json(),{hidden:['projects']})
    await (await exercise(guestA,prefs,'tentativa de autoatribuir permissão rejeitada',400,'negative',{data:{hidden:[],projects:true}})).body?.cancel()
    const ownSettings=await exercise(guestA,'GET /api/v1/member-modules/me','membro A consulta preferências próprias',200,'positive')
    const otherSettings=await exercise(guestB,'GET /api/v1/member-modules/me','membro B consulta permissões próprias',200,'positive')
    assert.deepEqual((await ownSettings.json() as {hidden:string[]}).hidden,['projects'])
    assert.deepEqual((await otherSettings.json() as {hidden:string[]}).hidden,[])
    assert.match(ownSettings.headers.get('Cache-Control')??'',/no-store/)

    const card=await exercise(guestA,'POST /api/v1/personal/projects','criação na própria carteira',201,'positive',{data:{name:'Projeto privado sintético'}})
    const ownCard=(await card.json() as {id:string}).id
    const ownList=await exercise(guestA,'GET /api/v1/personal/projects','membro lista projetos próprios',200,'positive')
    assert.deepEqual((await ownList.json() as {id:string}[]).map(value=>value.id),[ownCard])
    const ownerList=await exercise(owner,'GET /api/v1/personal/projects','proprietário lista apenas projetos próprios',200,'positive')
    assert.deepEqual((await ownerList.json() as {id:string}[]).map(value=>value.id),[project.id])
    for(const endpoint of ['GET /api/v1/personal/projects/:id','PATCH /api/v1/personal/projects/:id','DELETE /api/v1/personal/projects/:id']){
      const probe=await exercise(owner,endpoint,'proprietário não lê/muta projeto de membro',404,'negative',
        {params:{id:ownCard},data:endpoint.startsWith('PATCH')?{status:'active',next_step:'Projeto não deve ser alterado'}:{confirmation_name:'Projeto privado sintético'}})
      await probe.body?.cancel()
    }
    const verifyCard=await exercise(guestA,'GET /api/v1/personal/projects','projeto se mantém após negativas de terceiros',200,'positive')
    assert.equal((await verifyCard.json() as {id:string}[]).some(item=>item.id===ownCard),true)
    await (await exercise(guestA,'POST /api/v1/personal/projects','campo de propriedade recusado',403,'negative',{data:{name:'Projeto fictício',organization_id:ownerIds.organization_id}})).body?.cancel()
    await (await exercise(owner,'GET /api/v1/personal/projects/:id','consulta do projeto próprio',200,'positive',{params:{id:project.id}})).body?.cancel()

    for(const endpoint of ['GET /api/v1/quote-models','GET /api/v1/personal/finance','GET /api/v1/personal/subscriptions','GET /api/v1/personal/prices'])
      await (await exercise(guestA,endpoint,'membro com módulo habilitado',200,'positive')).body?.cancel()
    await (await exercise(guestA,'POST /api/v1/quote-models/preview','cálculo de modelo próprio',200,'positive',{data:{model:defaultModel}})).body?.cancel()
    const model=await exercise(guestA,'POST /api/v1/quote-models','persistência do modelo próprio',201,'positive',{data:{model:defaultModel}})
    const modelId=(await model.json() as {id:string}).id
    await (await exercise(guestA,'PATCH /api/v1/quote-models/:id','edição do modelo privado',200,'positive',{params:{id:modelId},data:{model:defaultModel,revision:1}})).body?.cancel()
    await (await exercise(owner,'PATCH /api/v1/quote-models/:id','proprietário não altera modelo de convidado',404,'negative',{params:{id:modelId},data:{model:defaultModel,revision:2}})).body?.cancel()

    const cycleResponse=await exercise(guestA,'POST /api/v1/personal/finance/cycles','membro cria ciclo privado',201,'positive',
      {data:{name:'Ciclo sintético',starts_on:'2020-01-01',closes_on:'2020-01-31'}})
    const cycleId=(await cycleResponse.json() as {id:string}).id
    const invoice={cycle_id:cycleId,recorded_on:'2020-01-02',amount:15}
    await (await exercise(guestA,'POST /api/v1/personal/finance/entries','membro registra fatura própria',201,'positive',{data:invoice})).body?.cancel()
    await (await exercise(guestA,'POST /api/v1/personal/finance/plans','membro registra meta própria',200,'positive',
      {data:{month:'2020-01-01',income:1000,budget:500,savings_goal:150,saved:100}})).body?.cancel()
    await (await exercise(owner,'PATCH /api/v1/member-modules/members/:id','libera Finanças para verificar separação também com B autorizado',200,'positive',
      {data:{finance:true},params:{id:memberB.id}})).body?.cancel()
    const privateFinance=await exercise(guestB,'GET /api/v1/personal/finance','outro membro autorizado não recebe o ciclo de A',200,'positive')
    assert.deepEqual((await privateFinance.json() as {cycles:unknown[]}).cycles,[])
    await (await exercise(guestB,'POST /api/v1/personal/finance/entries','ciclo pertence a A mesmo com B habilitado',404,'negative',{data:invoice})).body?.cancel()
    const ownerFinance=await exercise(owner,'GET /api/v1/personal/finance','proprietário não recebe o ciclo privado de A',200,'positive')
    assert.deepEqual((await ownerFinance.json() as {cycles:unknown[]}).cycles,[])

    const subscription=await exercise(guestA,'POST /api/v1/personal/subscriptions','membro registra assinatura própria',201,'positive',
      {data:{name:'Serviço sintético',amount:15,frequency:'monthly',scope:'personal',due_on:'2020-02-03'}})
    const subscriptionId=(await subscription.json() as {id:string}).id
    await (await exercise(guestA,'PATCH /api/v1/personal/subscriptions/:id','membro atualiza assinatura própria',200,'positive',
      {params:{id:subscriptionId},data:{amount:20}})).body?.cancel()
    await (await exercise(guestA,'POST /api/v1/personal/subscriptions/:id/payments','registro local de pagamento da própria assinatura',201,'positive',
      {params:{id:subscriptionId},data:{paid_on:'2020-02-01',due_on:'2020-02-03'}})).body?.cancel()
    const watch=await exercise(guestA,'POST /api/v1/personal/prices','cadastro privado sem consulta externa',201,'positive',
      {data:{name:'Produto sintético',product_url:'https://store.example.invalid/item'}})
    const watchId=(await watch.json() as {id:string}).id
    await (await exercise(guestA,'PATCH /api/v1/personal/prices/:id','pausa monitor privado',200,'positive',
      {params:{id:watchId},data:{active:false}})).body?.cancel()
    for(const endpoint of [
      'GET /api/v1/catalog','GET /api/v1/clients','GET /api/v1/conversations','GET /api/v1/conversations/whatsapp/status',
      'GET /api/v1/crm/contracts','GET /api/v1/crm/tasks','GET /api/v1/crm/opportunities','GET /api/v1/crm/search',
      'GET /api/v1/crm/notifications','GET /api/v1/crm/reports','GET /api/v1/crm/export',
      'GET /api/v1/finance/summary','GET /api/v1/finance/clients','GET /api/v1/finance/expenses','GET /api/v1/finance/receivables',
      'GET /api/v1/prospecting/leads/niches','GET /api/v1/prospecting/leads/candidates','GET /api/v1/prospecting/templates',
      'GET /api/v1/prospecting/drafts','GET /api/v1/reminders','GET /api/v1/personal/preferences','GET /api/v1/personal/notifications',
      'GET /api/v1/personal/reviews','GET /api/v1/quote-models/proposals','GET /api/events',
    ]){
      await (await exercise(owner,endpoint,'consulta autenticada do proprietário',200,'positive',{query:endpoint==='GET /api/v1/crm/search'?'?q=sintetico':undefined})).body?.cancel()
    }
    const token={Authorization:'Bearer '+codexToken}
    const scoped=await exercise(anonymous,'GET /api/v1/integrations/codex/projects','token dedicado no projeto permitido',200,'positive',{headers:token})
    assert.deepEqual((await scoped.json() as {projects:{id:string}[]}).projects.map(row=>row.id),[project.id])
    await (await exercise(anonymous,'POST /api/v1/integrations/codex/report','token válido para projeto incompatível',404,'negative',
      {headers:token,data:{project:{id:ownCard},report:{}}})).body?.cancel()
    const report={schema_version:1,event_id:'synthetic-authz-report',summary:'Evidência local sintética',commit:'a'.repeat(40),
      tests:[{name:'Fixture',command:'node --test',result:'passed',evidence_url:'https://github.com/example/authorized/actions/runs/1'}],
      acceptance:['Revisar evidência sintética'],next_step:'Revisar',blockers:[]}
    const codexSubmission={headers:token,data:{project:{id:project.id},report}}
    const reportEnd='POST /api/v1/integrations/codex/report'
    const received=await exercise(anonymous,reportEnd,'relatório do Codex no escopo correto',201,'positive',codexSubmission)
    const receipt=await received.json() as {report_id:string;status:string}
    assert.equal(receipt.status,'pending_review')
    const replay=await exercise(anonymous,reportEnd,'replay idempotente de relatório autorizado',201,'positive',codexSubmission)
    assert.deepEqual(await replay.json(),receipt)
    const legacyToken={Authorization:'Bearer '+automationToken}
    await (await exercise(anonymous,'POST /api/v1/integrations/projects/:id/reports','automação válida não alcança projeto de outro titular',404,'negative',
      {headers:legacyToken,params:{id:ownCard},data:report})).body?.cancel()
    await (await exercise(anonymous,'POST /api/v1/integrations/projects/:id/reports','automação válida na sua carteira',201,'positive',
      {headers:legacyToken,params:{id:project.id},data:{...report,event_id:'synthetic-authz-automation'}})).body?.cancel()
    const signature='sha256='+createHmac('sha256',githubSecret).update('{}').digest('hex')
    await (await exercise(anonymous,'POST /api/v1/integrations/github','ping sintético assinado',200,'positive',
      {headers:{'X-Hub-Signature-256':signature,'X-GitHub-Event':'ping','X-GitHub-Delivery':'synthetic-ping'},data:{}})).body?.cancel()
    await (await exercise(anonymous,'POST /webhooks/evolution','evento sintético autenticado e inerte',200,'positive',
      {headers:{'X-Evolution-Secret':evolutionSecret},data:{event:'ping'}})).body?.cancel()

    const [contact]=(await sql`INSERT INTO clients(organization_id,name) VALUES(${ownerIds.organization_id},'Cliente sintético da proposta') RETURNING id`)
    const proposalResponse=await exercise(owner,'POST /api/v1/quote-models/proposals','snapshot de proposta própria',201,'positive',{data:{clientId:contact.id,title:'Proposta sintética',briefing:'Escopo sintético',model:defaultModel,quantities:{}}})
    const proposal=(await proposalResponse.json() as {id:string}).id
    await (await exercise(owner,'POST /api/v1/quote-models/proposals/:id/status','proposta própria enviada',200,'positive',{params:{id:proposal},data:{status:'sent'}})).body?.cancel()
    await (await exercise(owner,'POST /api/v1/quote-models/proposals/:id/approve','aprovação explícita da proposta',200,'positive',{params:{id:proposal},data:{confirmed:true}})).body?.cancel()
    await (await exercise(owner,'POST /api/v1/quote-models/proposals/:id/prompts','prompt versionado da proposta aprovada',201,'positive',{params:{id:proposal}})).body?.cancel()
    await (await exercise(owner,'GET /api/v1/quote-models/proposals/:id/prompts','histórico próprio de prompts',200,'positive',{params:{id:proposal}})).body?.cancel()
    const csrf=await guestA('/api/auth/csrf');const {csrfToken}=await csrf.json() as {csrfToken:string}
    const signOut=await guestA('/api/auth/signout',{method:'POST',data:new URLSearchParams({csrfToken,redirect:'false'})})
    assert.equal(signOut.status,200)
    auth.push({case:'POST /api/auth/signout · limpeza do cookie',status:signOut.status,verdict:'positive'})
    await (await exercise(guestA,'GET /api/v1/quote-models','cliente após logout',401,'negative')).body?.cancel()
    assert.equal(checks.size,all.length)
    assert.equal(sourceFingerprint(),sourceDigest,'O código de autorização mudou durante a execução; gere um novo recibo.')
    const routes=all.map(row=>({endpoint:row.endpoint,checks:checks.get(row.endpoint)}))
    if(process.env.ABELHA_WRITE_LOCAL_ACCESS_RECEIPT==='1')
      writeFileSync(receiptPath,JSON.stringify({version:1,sourceDigest,environment:'Express real / Auth.js / PGlite descartável em loopback / e-mail sintético',auth,routes},null,2)+'\n')
    t.diagnostic(`${routes.length}/${all.length} rotas, ${routes.reduce((sum,row)=>sum+(row.checks?.length??0),0)} asserções HTTP de autorização`)
  }finally{
    if(server){server.closeAllConnections();await new Promise<void>(resolve=>server!.close(()=>resolve()))}
    if(savedModule)require.cache[dbPath]=savedModule;else delete require.cache[dbPath]
    await sql?.end({timeout:2})
    await wire?.stop()
    await pg?.close()
    await bootstrap.close()
  }
})
