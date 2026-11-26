// Positive route contracts with isolated synthetic provider transports. No DNS,
// HTTPS provider request, real number pairing, workflow or external job is used.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
async function main(){
 const transport=require('../dist/services/evolution-https');
 const h=await require('./hml-runtime.cjs').start(),checks=[],receipt={version:1,tag:h.tag,environment:'Backend/Auth.js/PostgreSQL HML reais; transportes Overpass/Evolution simulados',runtime:{pid:process.pid,port:Number(new URL(h.origin).port)},checks};
 receipt.execution=h.codeBinding;
 const fetchSaved=globalThis.fetch,savedTransport=transport.protectedEvolutionHttps;
 try{
   const ctx=await require(process.env.ABELHA_PLAYWRIGHT_MODULE||'C:/Users/higor aranda/Documents/Programações/SAAS/FORGE/node_modules/playwright').request.newContext({baseURL:h.origin});
   try{
     const csrf=await (await ctx.get('/api/auth/csrf')).json();await ctx.post('/api/auth/callback/credentials',{form:{csrfToken:csrf.csrfToken,email:h.ownerEmail,password:h.password,redirect:'false'},headers:{'X-Auth-Return-Redirect':'1'}});
     assert.ok((await (await ctx.get('/api/auth/session')).json()).user?.id);
     const post=async(p,data,headers={})=>{const r=await ctx.post(p,{data,headers:{'X-Abelha-Client':'web',...headers}});return {status:r.status(),body:await r.json()};};
     let sourceCalls=0,providerCalls=0;
     globalThis.fetch=async(input,options)=>{
       const url=new URL(String(input));if(['https://overpass-api.de/api/interpreter','https://overpass.private.coffee/api/interpreter'].includes(url.href)){
         sourceCalls++;return Response.json({elements:[{type:'area',id:9999999},{type:'node',id:999999999,lat:0,lon:0,tags:{name:h.tag+' fonte simulada',amenity:'restaurant'}}]});
       }return fetchSaved(input,options);
     };
     let r=await post('/api/v1/prospecting/leads/search',{niche:'restaurants',city:'Cidade Fictícia, SP',limit:1});
     checks.push({endpoint:'POST /api/v1/prospecting/leads/search',actor:'owner',case:'fonte Overpass exclusivamente simulada, sem dados reais',status:r.status,wanted:200,verdict:'positive',pass:r.status===200});assert.equal(r.status,200,JSON.stringify(r.body));assert.equal(r.body.items[0].name,h.tag+' fonte simulada');
     // A second synthetic org keeps the source request budget intact, without sleeps.
     const address=h.email('provider-other');const [other]=await h.sql`with o as(insert into organizations(name) values(${h.tag+' second'}) returning id) insert into users(organization_id,name,email,password_hash,account_role) select id,'Other synthetic owner',${address},${await require('bcryptjs').hash(h.password,4)},'owner' from o returning id,organization_id`;
     process.env.ABELHA_INTEGRATION_ORGANIZATION_ID=other.organization_id;process.env.ABELHA_INTEGRATION_USER_ID=other.id;
     r=await post('/api/v1/integrations/leads/search',{niche:'restaurants',city:'Cidade Fictícia, SP',limit:1},{Authorization:'Bearer '+process.env.ABELHA_INTEGRATION_TOKEN});
     checks.push({endpoint:'POST /api/v1/integrations/leads/search',actor:'synthetic-integration',case:'fonte Overpass exclusivamente simulada, sem automação externa',status:r.status,wanted:200,verdict:'positive',pass:r.status===200});assert.equal(r.status,200,JSON.stringify(r.body));
     process.env.EVOLUTION_ALLOWED_ORIGINS='https://evolution.example';
     await h.sql`insert into evolution_instances(organization_id,instance_name,api_url,api_key) values(${h.owner.organization_id},${h.tag},'https://evolution.example','synthetic-test-only')`;
     transport.protectedEvolutionHttps=async(url,options)=>{providerCalls++;assert.equal(url.origin,'https://evolution.example');
       if(url.pathname.includes('/instance/connectionState/'))return Response.json({instance:{state:'open'}});
       assert.ok(url.pathname.includes('/message/sendText/'));assert.equal(JSON.parse(options.body).text,'Mensagem sintética sem envio externo');return Response.json({accepted:true});
     };
     r=await post('/api/v1/conversations/whatsapp/pair',{});checks.push({endpoint:'POST /api/v1/conversations/whatsapp/pair',actor:'owner',case:'provedor simulado já conectado; nenhum QR/número vinculado',status:r.status,wanted:200,verdict:'positive',pass:r.status===200});assert.equal(r.status,200);assert.deepEqual(r.body,{status:'connected',qr:null});
     const [conv]=await h.sql`insert into conversations(organization_id,whatsapp_chat_id) values(${h.owner.organization_id},'5500000000000@s.whatsapp.net') returning id`;
     r=await post('/api/v1/messages',{conversation_id:conv.id,content:'Mensagem sintética sem envio externo'});checks.push({endpoint:'POST /api/v1/messages',actor:'owner',case:'transporte simulado; persistência SQL real; zero mensagem externa',status:r.status,wanted:201,verdict:'positive',pass:r.status===201});assert.equal(r.status,201);
     const [count]=await h.sql`select count(*)::int as count from messages where conversation_id=${conv.id} and organization_id=${h.owner.organization_id}`;assert.equal(count.count,1);
     assert.equal(sourceCalls,2);assert.equal(providerCalls,2);receipt.simulatedCalls={overpass:sourceCalls,evolution:providerCalls};
   }finally{await ctx.dispose();}
 }catch(error){receipt.failure={message:error.message};process.exitCode=1;}
 finally{globalThis.fetch=fetchSaved;transport.protectedEvolutionHttps=savedTransport;try{receipt.cleanup=await h.stop()}catch(error){receipt.cleanup={status:'FAIL',message:error.message};process.exitCode=1;}fs.writeFileSync(path.join(h.privateDir,'provider-contracts-031-result.json'),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));}
}
main().catch(e=>{console.error({message:e.message,code:e.code});process.exitCode=1});
