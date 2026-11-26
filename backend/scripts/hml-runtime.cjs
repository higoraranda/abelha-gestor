// Harness opt-in da homologação integrada; nunca importado pela aplicação.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {randomUUID,createHash}=require('node:crypto');
const root=path.resolve(__dirname,'../..'),privateDir=path.join(root,'.abelha-homologacao');
async function start(){
  assert.equal(process.env.ABELHA_RUN_REAL_HML,'031','Execução exige opt-in explícito.');
  const env=require('dotenv').parse(fs.readFileSync(path.join(privateDir,'backend.env'))),url=new URL(env.DATABASE_URL);
  assert.equal(url.hostname,'ep-crimson-snow-acmuhqgp-pooler.sa-east-1.aws.neon.tech');assert.equal(url.pathname,'/abelha_homologacao');assert.equal(url.username,'abelha_hml_app');
  const tag='hml031-'+randomUUID().slice(0,8),emails=new Set(),orgs=new Set(),mailbox=new Map(),outbound=[],rateKeys=new Set();let baselineOrgIds=new Set();
  const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
  function treeDigest(directory){const entries=[];function visit(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const file=path.join(dir,item.name);if(item.isDirectory())visit(file);else entries.push([path.relative(directory,file).replaceAll('\\','/'),digest(fs.readFileSync(file))]);}}visit(directory);return digest(JSON.stringify(entries));}
  const codeBinding={gitBase:require('node:child_process').execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),backendSourceSha256:treeDigest(path.join(root,'backend/src')),frontendSourceSha256:treeDigest(path.join(root,'frontend/src')),backendBuildSha256:treeDigest(path.join(root,'backend/dist')),frontendBuildSha256:treeDigest(path.join(root,'frontend/dist')),scripts:fs.readdirSync(__dirname).filter(n=>/^(?:hml-|verify-(?:integrated-hml|hml-))/.test(n)&&n.endsWith('.cjs')).sort().map(n=>({file:n,sha256:digest(fs.readFileSync(path.join(__dirname,n)))}))};
  const email=name=>{const value=name+'+'+tag+'@example.invalid';emails.add(value);return value};
  const password='Senha sintetica de homologacao 031!';
  for(const key of Object.keys(process.env))if(/^(ABELHA_|VAPID_|EVOLUTION_|GITHUB_WEBHOOK|AUTH_|PRICE_)/.test(key))delete process.env[key];
  Object.assign(process.env,{NODE_ENV:'test',PORT:'0',DATABASE_URL:env.DATABASE_URL,AUTH_SECRET:randomUUID()+randomUUID(),
    ABELHA_REQUIRE_LOGIN:'true',ABELHA_OTP_SECRET:randomUUID()+randomUUID(),ABELHA_OTP_RESEND_API_KEY:'simulated-hml-only',ABELHA_OTP_FROM:'mail@example.invalid',
    ABELHA_OWNER_RECOVERY_EMAIL:'',VAPID_PRIVATE_KEY:'',VAPID_PUBLIC_KEY:'',VAPID_SUBJECT:'',EVOLUTION_API_URL:'',EVOLUTION_API_KEY:'',EVOLUTION_ALLOWED_ORIGINS:'',
    GITHUB_WEBHOOK_SECRET:'synthetic-hml-github-webhook-secret-not-live-031',EVOLUTION_WEBHOOK_SECRET:'synthetic-hml-evolution-webhook-secret-not-live-031',
    ABELHA_CODEX_REPORT_TOKEN:'synthetic-hml-dedicated-codex-token-not-live-031',ABELHA_INTEGRATION_TOKEN:'synthetic-hml-dedicated-automation-token-not-live-031',
    ABELHA_CODEX_PROJECTS_JSON:'[]',ABELHA_CODEX_PROJECT_ID:'',PRICE_ALLOWED_HOSTS:'store.example.invalid',ABELHA_HOMOLOGATION_SESSION_FILE:'',ABELHA_AUTH_SHARED_BUDGET:''});
  // No dotenv file is loaded: the launcher sets cwd to the repository root.
  assert.equal(process.cwd(),root);
  const {db:sql}=require('../dist/db');let server,origin='',stopped=false;
  const originalFetch=globalThis.fetch;
  globalThis.fetch=async(input,options)=>{
    const target=new URL(input instanceof Request?input.url:String(input));
    if(target.origin===origin&&origin)return originalFetch(input,options);
    if(target.href==='https://api.resend.com/emails'){
      const payload=JSON.parse(String(options?.body));assert.ok(payload.to.every(value=>emails.has(value)),'Destino de e-mail fora da rodada.');
      mailbox.set(payload.to[0],payload.text);outbound.push({kind:'simulated-email'});return Response.json({id:'simulated-hml'});
    }
    outbound.push({kind:'blocked',host:target.hostname});throw Error('Saída externa bloqueada na homologação.');
  };
  async function snapshot(){const tables=await sql`select tablename from pg_tables where schemaname='public' order by tablename`;const rows=[];
    for(const {tablename} of tables){const [row]=await sql`select count(*)::int as count,md5(coalesce(string_agg(row_to_json(t)::text,'|' order by row_to_json(t)::text),'')) as fingerprint from ${sql(tablename)} t`;rows.push({table:tablename,...row});}return rows;}
  let before;
  async function stop(){if(stopped)return;stopped=true;const result={};
    try{if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));result.portClosed=!server.listening;}
      if(before){
        const fixtureUsers=emails.size?await sql`select id,organization_id,email from users where email in ${sql([...emails])}`:[];
        for(const row of fixtureUsers)orgs.add(row.organization_id);
        await sql.begin(async tx=>{
          const userIds=fixtureUsers.map(row=>row.id);
          if(userIds.length)await tx`delete from account_invites where issued_by in ${sql(userIds)}`;
          for(const id of orgs){assert.equal(baselineOrgIds.has(id),false,'Organização preexistente não pode ser removida.');const users=await tx`select email from users where organization_id=${id}`;assert.ok(users.length&&users.every(row=>emails.has(row.email)),'Organização contém usuário fora da rodada.');
            await tx`delete from organizations where id=${id}`;
          }
          // Only exact keys allocated by this run; shared login/reset keys are never touched.
          if(rateKeys.size){const keys=[...rateKeys];assert.ok(keys.every(key=>key.startsWith(tag+':')));await tx`delete from auth_rate_buckets where bucket_key in ${sql(keys)}`;}
        });
        const after=await snapshot();result.tables=after.length;result.equal=JSON.stringify(after)===JSON.stringify(before);result.differences=after.filter((r,i)=>JSON.stringify(r)!==JSON.stringify(before[i])).map(r=>r.table);
        result.syntheticOrganizations=orgs.size;fs.writeFileSync(path.join(privateDir,tag+'-cleanup.json'),JSON.stringify(result,null,2));assert.ok(result.equal,'Fingerprints divergentes após limpeza: '+result.differences.join(','));
      }
    }finally{globalThis.fetch=originalFetch;await sql.end({timeout:3});}
    return result;
  }
  try{
    const [identity]=await sql`select current_database() as database,current_user as role,version()`;
    assert.equal(identity.database,'abelha_homologacao');assert.equal(identity.role,'abelha_hml_app');assert.equal(sql.options.ssl,'require');
    const initial=await snapshot();assert.equal(initial.length,39);before=initial;baselineOrgIds=new Set((await sql`select id from organizations`).map(row=>row.id));
    fs.writeFileSync(path.join(privateDir,tag+'-baseline.json'),JSON.stringify({identity,endpoint:url.hostname,tables:before},null,2));
    const ownerEmail=email('owner');const [owner]=await sql`with o as(insert into organizations(name) values(${tag}) returning id) insert into users(organization_id,name,email,password_hash,account_role) select id,${tag},${ownerEmail},${await require('bcryptjs').hash(password,4)},'owner' from o returning id,organization_id`;
    orgs.add(owner.organization_id);process.env.ABELHA_INTEGRATION_ORGANIZATION_ID=owner.organization_id;process.env.ABELHA_INTEGRATION_USER_ID=owner.id;
    const express=require('express'),listen=express.application.listen;
    express.application.listen=function(...args){assert.equal(args[0],0);assert.equal(args[1],'127.0.0.1');
      const dist=path.join(root,'frontend/dist');this.use(express.static(dist));this.get('*',(req,res)=>req.path.startsWith('/api/')?res.status(404).end():res.sendFile(path.join(dist,'index.html')));
      server=Reflect.apply(listen,this,args);return server;};
    try{require('../dist/app')}finally{express.application.listen=listen;}
    await new Promise(resolve=>server.listening?resolve():server.once('listening',resolve));origin='http://127.0.0.1:'+server.address().port;
    process.env.AUTH_URL=origin;process.env.FRONTEND_URL=origin;
    require('../dist/auth.config').authConfig.logger={error(){},warn(){},debug(){}};
    return {root,privateDir,tag,email,emails,password,owner,ownerEmail,sql,origin,mailbox,outbound,rateKeys,codeBinding,stop,identity,endpoint:url.hostname};
  }catch(error){await stop();throw error;}
}
module.exports={start};
