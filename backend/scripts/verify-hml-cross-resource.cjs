const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
async function main(){
 const h=await require('./hml-runtime.cjs').start(),checks=[],receipt={version:1,tag:h.tag,environment:'Auth.js/API/PostgreSQL HML reais, sem provedores externos',runtime:{pid:process.pid,port:Number(new URL(h.origin).port)},checks},contexts=[];
 receipt.execution=h.codeBinding;
 try{
  const {request}=require(process.env.ABELHA_PLAYWRIGHT_MODULE||'C:/Users/higor aranda/Documents/Programações/SAAS/FORGE/node_modules/playwright');
  async function context(email){const ctx=await request.newContext({baseURL:h.origin});contexts.push(ctx);const csrf=await (await ctx.get('/api/auth/csrf')).json();await ctx.post('/api/auth/callback/credentials',{form:{csrfToken:csrf.csrfToken,email,password:h.password,redirect:'false'},headers:{'X-Auth-Return-Redirect':'1'}});assert.ok((await (await ctx.get('/api/auth/session')).json()).user?.id);return ctx;}
  async function call(ctx,method,p,data,wanted,label){const r=await ctx.fetch(p,{method,data,headers:{'X-Abelha-Client':'web'}});checks.push({method,path:p.replace(/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}/g,':id'),status:r.status(),wanted,case:label,pass:r.status()===wanted});const text=await r.text();assert.equal(r.status(),wanted,p+': '+text.slice(0,200));return text?JSON.parse(text):undefined;}
  const owner=await context(h.ownerEmail),email=h.email('same-org-owner');
  await h.sql`insert into users(organization_id,name,email,password_hash,account_role) values(${h.owner.organization_id},'Same org synthetic owner',${email},${await require('bcryptjs').hash(h.password,4)},'owner')`;
  const peer=await context(email);
  const inviteAddress=h.email('invited'),invite=await call(owner,'POST','/api/v1/account/invites',{email:inviteAddress},201,'convite do emissor');
  const anon=await request.newContext({baseURL:h.origin});contexts.push(anon);
  const code=await call(anon,'POST','/api/v1/account/register/code',{email:inviteAddress,token:invite.token},200,'OTP simulado');
  const otp=h.mailbox.get(inviteAddress).match(/(?:^|\n)(\d{6})(?:\n|$)/)[1];await call(anon,'POST','/api/v1/account/register',{email:inviteAddress,token:invite.token,challengeId:code.challengeId,code:otp,name:'Synthetic invited',password:h.password},201,'resgate');
  const [invited]=await h.sql`select id from users where email=${inviteAddress}`;
  await call(peer,'PATCH','/api/v1/member-modules/members/'+invited.id,{finance:true},404,'mesma organização: proprietário não emissor não concede módulos');
  await call(peer,'PATCH','/api/v1/member-modules/members/'+invited.id+'/status',{active:false},404,'mesma organização: proprietário não emissor não desativa membro');
  const managed=await call(peer,'GET','/api/v1/member-modules/members',undefined,200,'lista restrita ao emissor');assert.equal(managed.length,0);
  const project=await call(owner,'POST','/api/v1/personal/projects',{name:h.tag,repository:'https://github.com/example/hml031'},201,'projeto privado');
  const milestone=await call(owner,'POST','/api/v1/personal/projects/'+project.id+'/milestones',{title:'Fixture',acceptance:'Fixture'},201,'marco privado');
  const report={schema_version:1,event_id:h.tag,summary:'Fixture sintética',commit:'a'.repeat(40),tests:[{name:'Fixture',command:'fixture',result:'passed',evidence_url:'https://github.com/example/hml031/actions/runs/1'}],acceptance:['Revisar'],next_step:'Revisar',blockers:[]};
  const received=await call(owner,'POST','/api/v1/personal/projects/'+project.id+'/reports',report,201,'relatório pendente');
  await call(peer,'POST','/api/v1/personal/projects/'+project.id+'/milestones/'+milestone.id+'/complete',{reviewed:true,report_id:received.id},404,'mesma organização: outro proprietário não conclui marco');
  const notices=await call(owner,'GET','/api/v1/personal/notifications',undefined,200,'avisos privados');assert.ok(notices.length);
  assert.equal((await call(peer,'GET','/api/v1/personal/notifications',undefined,200,'outro titular não lista avisos')).length,0);
  await call(peer,'PATCH','/api/v1/personal/notifications/'+notices[0].id,{read:true,dismissed:true},404,'mesma organização: aviso de outro titular');
  const client=await call(owner,'POST','/api/v1/clients',{name:h.tag},201,'cliente sintético');
  const model={version:1,name:h.tag,baseCents:1000,monthlyCents:0,discountBps:0,lines:[]};
  const proposal=await call(owner,'POST','/api/v1/quote-models/proposals',{clientId:client.id,title:h.tag,briefing:'Fixture',model,quantities:{}},201,'proposta privada');
  for(const [method,p,data] of [['GET','',undefined],['GET','/prompt',undefined],['POST','/approve',{confirmed:true}],['POST','/refuse',{confirmed:true}]])await call(peer,method,'/api/v1/quote-models/proposals/'+proposal.id+p,data,404,'mesma organização: proposta de outro proprietário');
  assert.equal((await call(peer,'GET','/api/v1/quote-models/proposals',undefined,200,'lista de propostas privada')).length,0);
  const privatePeer=await call(peer,'POST','/api/v1/personal/projects',{name:h.tag+' peer',repository:'https://github.com/example/hml031'},201,'projeto privado do par');
  process.env.ABELHA_CODEX_PROJECTS_JSON=JSON.stringify([{id:project.id,repository:'https://github.com/example/hml031'}]);
  for(const [p,body,token] of [['/api/v1/integrations/codex/report',{project:{id:privatePeer.id},report},process.env.ABELHA_CODEX_REPORT_TOKEN],['/api/v1/integrations/projects/'+privatePeer.id+'/reports',report,process.env.ABELHA_INTEGRATION_TOKEN]]){
    const r=await anon.post(p,{data:body,headers:{Authorization:'Bearer '+token}});checks.push({method:'POST',path:p.includes('/projects/')?'/api/v1/integrations/projects/:id/reports':p,status:r.status(),wanted:404,case:'token correto não alcança projeto de outro titular na mesma organização',pass:r.status()===404});assert.equal(r.status(),404);
  }
  const [unchanged]=await h.sql`select (select completed_at is null from personal_milestones where id=${milestone.id}) as milestone_open,(select read_at is null and not dismissed from personal_notifications where id=${notices[0].id}) as notification_unread,(select approved_at is null and refused_at is null from quote_proposals where id=${proposal.id}) as undecided,(select count(*)::int from personal_project_updates where project_id=${privatePeer.id}) as peer_updates`;
  assert.equal(unchanged.milestone_open,true);assert.equal(unchanged.notification_unread,true);assert.equal(unchanged.undecided,true);assert.equal(unchanged.peer_updates,0);
  receipt.unchanged=unchanged;
 }catch(error){receipt.failure={message:error.message};process.exitCode=1;}
 finally{try{for(const ctx of contexts)await ctx.dispose()}catch(error){receipt.closeError=error.message;process.exitCode=1;}finally{try{receipt.cleanup=await h.stop()}catch(error){receipt.cleanup={status:'FAIL',message:error.message};process.exitCode=1;}}fs.writeFileSync(path.join(h.privateDir,'cross-resource-031-result.json'),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify({checks:checks.length,failures:checks.filter(c=>!c.pass),failure:receipt.failure,unchanged:receipt.unchanged,cleanup:receipt.cleanup,runtime:receipt.runtime}));}
}
main().catch(e=>{console.error({message:e.message,code:e.code});process.exitCode=1});
