const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {inventory,sourceFingerprint}=require('./map-access.cjs');
const dummy='11111111-1111-4111-8111-111111111111';
const model={version:1,name:'Modelo HML',baseCents:1000,monthlyCents:0,discountBps:0,lines:[]};
async function main(){
  const routes=inventory(),sourceDigest=sourceFingerprint();
  const h=await require('./hml-runtime.cjs').start(),checks=[],scenarios=[],timings=[];
  const receipt={version:1,environment:'Frontend/backend reais em loopback → Neon HML PostgreSQL real; e-mail simulado',sourceDigest,candidateBase:h.codeBinding.gitBase,runtime:{pid:process.pid,port:Number(new URL(h.origin).port)},identity:h.identity,endpoint:h.endpoint,tag:h.tag,checks,scenarios,timings};
  receipt.execution=h.codeBinding;
  const actors={};
  function actor(name){const cookies=new Map();return actors[name]={name,cookies,async request(p,method='GET',data,headers={}){
    const form=data instanceof URLSearchParams,start=performance.now();
    const r=await fetch(h.origin+p,{method,redirect:'manual',signal:AbortSignal.timeout(20000),headers:{Cookie:[...cookies].map(x=>x.join('=')).join('; '),...(data?{'Content-Type':form?'application/x-www-form-urlencoded':'application/json','X-Abelha-Client':'web'}:{}),...(form?{'X-Auth-Return-Redirect':'1'}:{}),...headers},body:data?(form?data.toString():JSON.stringify(data)):undefined});
    timings.push({path:p.split('?')[0],method,status:r.status,ms:Math.round(performance.now()-start)});
    for(const c of r.headers.getSetCookie()){const entry=c.split(';')[0],i=entry.indexOf('='),key=entry.slice(0,i),value=entry.slice(i+1);if(!value||/max-age=0/i.test(c))cookies.delete(key);else cookies.set(key,value);}
    let body;if((r.headers.get('content-type')||'').includes('text/event-stream'))await r.body?.cancel();else{const text=await r.text();try{body=JSON.parse(text)}catch{body=text}}
    return {status:r.status,body,headers:r.headers};
  }};}
  async function call(a,endpoint,data,params={},wanted=200,label='operação autorizada',verdict='positive',headers={}){
    const row=routes.find(r=>r.endpoint===endpoint);assert.ok(row,endpoint);
    const target=row.route.replace(/:([A-Za-z]+)/g,(_,key)=>params[key]||dummy);
    const result=await a.request(target,row.method,row.method==='GET'?undefined:data??{},headers);
    checks.push({endpoint,actor:a.name,case:label,status:result.status,wanted,verdict,pass:result.status===wanted});
    assert.equal(result.status,wanted,endpoint+' / '+a.name+' / '+label+' / '+String(JSON.stringify(result.body)).slice(0,350));return result.body;
  }
  async function signIn(a,email,password=h.password){
    const csrf=await a.request('/api/auth/csrf');assert.equal(csrf.status,200);
    const auth=await a.request('/api/auth/callback/credentials','POST',new URLSearchParams({csrfToken:csrf.body.csrfToken,email,password,redirect:'false'}));
    assert.equal(auth.status,200);assert.ok(!new URL(auth.body.url,h.origin).searchParams.has('error'),'Login sintético recusado');
    const s=await a.request('/api/auth/session');assert.ok(s.body?.user?.id);a.user=s.body.user;a.email=email;return a.user;
  }
  async function signOut(a){const c=await a.request('/api/auth/csrf');assert.equal((await a.request('/api/auth/signout','POST',new URLSearchParams({csrfToken:c.body.csrfToken,redirect:'false'}))).status,200);}
  const anonymous=actor('anonymous'),owner=actor('owner'),A=actor('member-a'),B=actor('member-b'),off=actor('module-disabled'),disabled=actor('account-disabled'),revoked=actor('session-revoked');
  try{
    await signIn(owner,h.ownerEmail);
    const project=await call(owner,'POST /api/v1/personal/projects',{name:h.tag+' proprietário',repository:'https://github.com/example/hml031'},{},201);
    process.env.ABELHA_CODEX_PROJECTS_JSON=JSON.stringify([{id:project.id,repository:'https://github.com/example/hml031'}]);
    async function invite(a){const email=h.email(a.name),inv=await call(owner,'POST /api/v1/account/invites',{email,validityHours:4},{},201);
      const code=await call(a,'POST /api/v1/account/register/code',{email,token:inv.token});
      const otp=h.mailbox.get(email)?.match(/(?:^|\n)(\d{6})(?:\n|$)/)?.[1];assert.ok(otp);
      await call(a,'POST /api/v1/account/register',{email,token:inv.token,challengeId:code.challengeId,code:otp,name:a.name,password:h.password},{},201);
      await signIn(a,email);return a;
    }
    for(const a of [A,B,off,disabled,revoked])await invite(a);
    assert.equal(new Set([owner,A,B,off,disabled,revoked].map(a=>a.user.organizationId)).size,6);
    scenarios.push({name:'convite, OTP simulado e login de seis identidades reais Auth.js',status:'PASS'});
    for(const a of [A,B])await call(owner,'PATCH /api/v1/member-modules/members/:id',{projects:true,calculator:true,finance:true,subscriptions:true,prices:true},{id:a.user.id});
    await call(owner,'PATCH /api/v1/member-modules/members/:id',{projects:false,calculator:false,finance:false,subscriptions:false,prices:false},{id:off.user.id});
    for(const a of [disabled,revoked])await call(owner,'PATCH /api/v1/member-modules/members/:id/status',{active:false},{id:a.user.id});
    await call(owner,'PATCH /api/v1/member-modules/members/:id/status',{active:true},{id:revoked.user.id});
    const serviceKinds=new Set(['automation','codex','github','evolution']);
    for(const row of routes){
      if(row.kind==='public'){await call(anonymous,row.endpoint);continue;}
      if(['invite','reset'].includes(row.kind))continue;
      if(serviceKinds.has(row.kind)){
        for(const headers of [{},{Authorization:'Bearer invalid','X-Hub-Signature-256':'sha256='+'0'.repeat(64),'X-Evolution-Secret':'invalid'}])await call(anonymous,row.endpoint,{}, {},401,'credencial ausente/inválida','negative',headers);
        continue;
      }
      for(const a of [anonymous,disabled,revoked])await call(a,row.endpoint,{}, {},401,'sessão sem acesso','negative');
      if(['owner','ownerIssuer','personalOwner'].includes(row.kind))for(const a of [A,B])await call(a,row.endpoint,{}, {},403,'restrição de papel (não comprova isolamento horizontal)','negative');
      if(row.kind==='module')await call(off,row.endpoint,{}, {},403,'módulo revogado pela administração','negative');
      if(row.kind==='member')await call(owner,row.endpoint,{}, {},403,'papel proprietário não é membro','negative');
    }
    scenarios.push({name:'anônimo, conta desativada, JWT revogado e módulos desabilitados em todas as rotas aplicáveis',status:'PASS'});
    for(const ep of ['POST /api/v1/account/register/code','POST /api/v1/account/register','POST /api/v1/account/password/reset/confirm'])await call(anonymous,ep,{email:h.email('unknown'),token:'invalid'},{},400,'token/código inválido','negative');
    await call(anonymous,'POST /api/v1/account/password/reset/request',{email:'invalid'},{},400,'e-mail inválido','negative');
    await call(anonymous,'POST /api/v1/account/password/reset/request',{email:h.email('unknown')},{},202,'resposta neutra para conta inexistente');
    for(const ep of ['GET /api/v1/account/invites','GET /api/v1/member-modules/members'])await call(owner,ep);
    const temporary=h.email('temporary');await call(owner,'POST /api/v1/account/invites',{email:temporary},{},201);await call(owner,'POST /api/v1/account/invites/expire',{email:temporary},{},204);
    await call(A,'GET /api/v1/member-modules/me');await call(B,'GET /api/v1/member-modules/me');
    await call(A,'PATCH /api/v1/member-modules/me/preferences',{hidden:['projects']});
    await call(A,'PATCH /api/v1/member-modules/me/preferences',{allowed:{projects:true}},{},400,'preferência não concede permissão','negative');
    const privateProject=await call(A,'POST /api/v1/personal/projects',{name:h.tag+' privado A'},{},201);
    const projectList=await call(B,'GET /api/v1/personal/projects');assert.equal(projectList.some(p=>p.id===privateProject.id),false);
    const ownerList=await call(owner,'GET /api/v1/personal/projects');assert.equal(ownerList.some(p=>p.id===privateProject.id),false);
    for(const ep of ['GET /api/v1/personal/projects/:id','PATCH /api/v1/personal/projects/:id','DELETE /api/v1/personal/projects/:id'])await call(owner,ep,ep.startsWith('PATCH')?{status:'active'}:{confirmation_name:h.tag+' privado A'},{id:privateProject.id},404,'proprietário não herda projeto privado de membro','negative');
    const calc=await call(A,'POST /api/v1/quote-models',{model},{},201);await call(A,'POST /api/v1/quote-models/preview',{model});
    await call(A,'PATCH /api/v1/quote-models/:id',{model,revision:1},{id:calc.id});
    for(const a of [B,owner]){const list=await call(a,'GET /api/v1/quote-models');assert.equal(list.some(m=>m.id===calc.id),false);await call(a,'PATCH /api/v1/quote-models/:id',{model,revision:2},{id:calc.id},404,'modelo de outro titular mesmo com módulo permitido','negative');}
    const cycle=await call(A,'POST /api/v1/personal/finance/cycles',{name:h.tag,starts_on:'2020-01-01',closes_on:'2020-01-31'},{},201);
    const entry={cycle_id:cycle.id,recorded_on:'2020-01-02',amount:15};await call(A,'POST /api/v1/personal/finance/entries',entry,{},201);
    await call(A,'POST /api/v1/personal/finance/plans',{month:'2020-01-01',income:1000,budget:500,savings_goal:150,saved:100});
    const sub=await call(A,'POST /api/v1/personal/subscriptions',{name:h.tag,amount:15,frequency:'monthly',scope:'personal',due_on:'2020-02-03'},{},201);
    await call(A,'PATCH /api/v1/personal/subscriptions/:id',{amount:20},{id:sub.id});await call(A,'POST /api/v1/personal/subscriptions/:id/payments',{due_on:'2020-02-03',paid_on:'2020-02-01'},{id:sub.id},201);
    const watch=await call(A,'POST /api/v1/personal/prices',{name:h.tag,product_url:'https://store.example.invalid/item'},{},201);await call(A,'PATCH /api/v1/personal/prices/:id',{active:false},{id:watch.id});
    for(const a of [B,owner]){
      assert.equal((await call(a,'GET /api/v1/personal/finance')).cycles.some(c=>c.id===cycle.id),false);
      assert.equal((await call(a,'GET /api/v1/personal/subscriptions')).subscriptions.some(s=>s.id===sub.id),false);
      assert.equal((await call(a,'GET /api/v1/personal/prices')).watches.some(w=>w.id===watch.id),false);
      await call(a,'POST /api/v1/personal/finance/entries',entry,{},404,'ciclo pertence a outro titular','negative');
      await call(a,'PATCH /api/v1/personal/subscriptions/:id',{amount:999},{id:sub.id},404,'ID de assinatura alheia','negative');
      await call(a,'POST /api/v1/personal/subscriptions/:id/payments',{due_on:'2020-03-03',paid_on:'2020-02-01'},{id:sub.id},404,'ID de assinatura alheia','negative');
      await call(a,'PATCH /api/v1/personal/prices/:id',{active:true},{id:watch.id},404,'ID de monitor alheio','negative');
    }
    scenarios.push({name:'isolamento horizontal projetos/modelos/finanças/assinaturas/preços com B autorizado e proprietário',status:'PASS'});
    const context={h,owner,A,B,off,disabled,revoked,anonymous,actor,call,signIn,signOut,project,privateProject,model,checks,scenarios};
    await require('./hml-positive-cases.cjs')(context);
    await require('./hml-isolation-cases.cjs')(context);
    await require('./hml-browser-cases.cjs')(context);
    await require('./hml-rate-cases.cjs')(context);
    await signOut(A);assert.equal((await A.request('/api/v1/quote-models')).status,401);
    scenarios.push({name:'logout elimina acesso autenticado',status:'PASS'});
  }catch(error){receipt.failure={message:error.message,stack:error.stack?.split('\n').slice(0,5)};process.exitCode=1;console.error(error.message);}
  finally{
    try{receipt.cleanup=await h.stop()}catch(e){receipt.cleanup={status:'FAIL',message:e.message};process.exitCode=1;console.error(e.message);}
    receipt.coverage=routes.map(r=>({endpoint:r.endpoint,positive:checks.filter(c=>c.endpoint===r.endpoint&&c.pass&&c.verdict==='positive').length,negative:checks.filter(c=>c.endpoint===r.endpoint&&c.pass&&c.verdict==='negative').length}));
    receipt.summary={routes:routes.length,tested:receipt.coverage.filter(r=>r.positive||r.negative).length,positive:receipt.coverage.filter(r=>r.positive).length,negative:receipt.coverage.filter(r=>r.negative).length,assertions:checks.length,failed:checks.filter(c=>!c.pass).length,outbound:h.outbound};
    fs.writeFileSync(path.join(h.privateDir,'integrated-031-result.json'),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify({summary:receipt.summary,cleanup:receipt.cleanup,failure:receipt.failure}));
  }
}
main().catch(e=>{console.error({message:e.message,code:e.code});process.exitCode=1});
