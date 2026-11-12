// TEST ONLY. Disposable in-memory PostgreSQL, fake session, loopback listener.
// Never import this file from the application or start it in production.
const express=require('express'),fs=require('node:fs'),path=require('node:path')
const {PGlite}=require('@electric-sql/pglite')
const {PGLiteSocketServer}=require('@electric-sql/pglite-socket')
const postgres=require('postgres')
process.env.DATABASE_URL='postgres://synthetic:synthetic@127.0.0.1:1/never_connect'
process.env.VAPID_PRIVATE_KEY='';process.env.VAPID_PUBLIC_KEY='';process.env.VAPID_SUBJECT=''
const {createPersonalRouter}=require('../dist/routes/personal')
const {createProspectingRouter}=require('../dist/routes/prospecting')
const {createIntegrationsRouter}=require('../dist/routes/integrations')
const {postgresDatabase}=require('../dist/services/platform-db')
const org='10000000-0000-4000-8000-000000000001',user='20000000-0000-4000-8000-000000000001'
process.env.ABELHA_INTEGRATION_ORGANIZATION_ID=org;process.env.ABELHA_INTEGRATION_USER_ID=user
process.env.GITHUB_WEBHOOK_SECRET='synthetic-preview-github-secret-not-for-production'
;(async()=>{
  const pg=new PGlite();let server
  await pg.exec(`CREATE TABLE organizations(id uuid primary key);CREATE TABLE users(id uuid primary key,organization_id uuid not null references organizations(id));CREATE TABLE clients(id uuid primary key default gen_random_uuid(),organization_id uuid not null references organizations(id),name text,whatsapp text,email text,notes text);
  INSERT INTO organizations VALUES('${org}');INSERT INTO users VALUES('${user}','${org}');INSERT INTO clients(organization_id,name) VALUES('${org}','Contato sintético de validação');`)
  await pg.exec('CREATE TABLE reminders(id uuid primary key,organization_id uuid,title text,due_at timestamptz,completed boolean)')
  await pg.exec(fs.readFileSync(path.join(__dirname,'../src/db/migrations/20261111_personal_platform.sql'),'utf8'))
  const wire=new PGLiteSocketServer({db:pg,host:'127.0.0.1',port:0});await wire.start()
  const sql=postgres('postgresql://postgres:postgres@'+wire.getServerConn()+'/postgres',{ssl:false,max:1});const database=postgresDatabase(sql)
  const app=express();app.use(express.json({verify:(req,_res,buffer)=>{req.githubRawBody=Buffer.from(buffer)}}));app.use('/api',(_req,res,next)=>{res.set('Cache-Control','no-store');next()})
  const auth=(req,_res,next)=>{req.organizationId=org;req.user={userId:user,organizationId:org,role:'user'};next()}
  app.get('/api/auth/session',(_req,res)=>res.json({user:{id:user,organizationId:org,name:'Validação sintética',email:'synthetic@example.invalid',role:'owner'}}))
  app.get('/api/v1/clients',async(_req,res)=>res.json((await pg.query('SELECT * FROM clients')).rows.map(client=>({...client,createdAt:new Date().toISOString()}))))
  app.get('/api/v1/crm/notifications',(_req,res)=>res.json([]))
  app.use('/api/v1/personal',createPersonalRouter(database,[auth]));app.use('/api/v1/prospecting',createProspectingRouter(database,[auth]));app.use('/api/v1/integrations',createIntegrationsRouter(database))
  app.use('/api',(_req,res)=>res.status(503).json({error:'Este endpoint comercial não faz parte da prévia sintética Personal.'}))
  const dist=path.resolve(__dirname,'../../frontend/dist');app.get('/sw.js',(_req,res)=>{res.set('Cache-Control','no-store');res.sendFile(path.join(dist,'sw.js'))});app.use(express.static(dist));app.get('*',(_req,res)=>res.sendFile(path.join(dist,'index.html')))
  let stopping=false
  async function stop(){if(stopping)return;stopping=true;if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve))}await sql.end({timeout:2});await wire.stop();await pg.close();console.log('SYNTHETIC_PREVIEW_STOPPED');process.exit(0)}
  process.on('SIGINT',stop);process.on('SIGTERM',stop);process.stdin.on('data',value=>{if(value.toString().trim()==='stop')void stop()});process.stdin.resume()
  server=app.listen(Number(process.env.ABELHA_TEST_PREVIEW_PORT||43170),'127.0.0.1',()=>console.log(JSON.stringify({synthetic:true,pid:process.pid,port:server.address().port,postgres_socket:wire.getServerConn(),stop:'send stop on stdin'})))
})().catch(error=>{console.error(error);process.exit(1)})
