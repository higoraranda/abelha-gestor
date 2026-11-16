import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import express from 'express'
import {PGlite} from '@electric-sql/pglite'
import {PGLiteSocketServer} from '@electric-sql/pglite-socket'
import postgres from 'postgres'
import {postgresDatabase} from './platform-db'
import {createPersonalRouter} from '../routes/personal'

test('project deletion requires its owner, exact confirmation and origin, and removes only linked data',async()=>{
 const pg=new PGlite();let wire:PGLiteSocketServer|undefined,sql:ReturnType<typeof postgres>|undefined,server:ReturnType<express.Express['listen']>|undefined
 const org='10000000-0000-4000-8000-000000000001',otherOrg='10000000-0000-4000-8000-000000000002',user='20000000-0000-4000-8000-000000000001',otherUser='20000000-0000-4000-8000-000000000002',foreignUser='20000000-0000-4000-8000-000000000003'
 const project='30000000-0000-4000-8000-000000000001',sibling='30000000-0000-4000-8000-000000000002',title='Projeto sintético confirmado'
 const link='/?space=personal&view=personal-projects&record='+project
 try{
  await pg.exec('CREATE TABLE organizations(id uuid PRIMARY KEY);CREATE TABLE users(id uuid PRIMARY KEY,organization_id uuid NOT NULL REFERENCES organizations(id));CREATE TABLE clients(id uuid PRIMARY KEY,organization_id uuid NOT NULL REFERENCES organizations(id),name text)')
  await pg.exec(readFileSync('src/db/migrations/20261111_personal_platform.sql','utf8'))
  await pg.query('INSERT INTO organizations VALUES($1),($2)',[org,otherOrg])
  await pg.query('INSERT INTO users VALUES($1,$2),($3,$2),($4,$5)',[user,org,otherUser,foreignUser,otherOrg])
  await pg.query('INSERT INTO personal_projects(id,organization_id,user_id,name) VALUES($1,$2,$3,$4),($5,$2,$3,\'Outro projeto\')',[project,org,user,title,sibling])
  await pg.query("INSERT INTO personal_milestones(organization_id,user_id,project_id,title,acceptance) VALUES($1,$2,$3,'Marco','Critério')",[org,user,project])
  const updates=await pg.query<{id:string;kind:string}>("INSERT INTO personal_project_updates(organization_id,user_id,project_id,event_key,kind,summary) VALUES($1,$2,$3,'decision','decision','Decisão'),($1,$2,$3,'report','report','Relatório sintético') RETURNING id,kind",[org,user,project])
  for(const[owner,key,url]of [[user,'project',link],[user,'other','/?space=personal&view=personal-projects&record='+sibling],[otherUser,'other-owner',link]])await pg.query('INSERT INTO personal_notifications(organization_id,user_id,event_key,title,url) VALUES($1,$2,$3,\'Aviso sintético\',$4)',[org,owner,key,url])
  await pg.query('INSERT INTO personal_notifications(organization_id,user_id,event_key,title,url) VALUES($1,$2,$3,\'Relatório\',$4)',[org,user,'report:'+updates.rows.find(x=>x.kind==='report')!.id,link.toUpperCase()])
  await pg.query("INSERT INTO personal_weekly_reviews(organization_id,user_id,week_of,data) VALUES($1,$2,'2026-11-16',$3::jsonb)",[org,user,JSON.stringify({projects:[{id:project}]})])
  await pg.query("INSERT INTO personal_monthly_plans(organization_id,user_id,month,budget) VALUES($1,$2,'2026-11-01',100)",[org,user])
  wire=new PGLiteSocketServer({db:pg,host:'127.0.0.1',port:0});await wire.start();sql=postgres('postgres://postgres:postgres@'+wire.getServerConn()+'/postgres',{ssl:false,max:1})
  const auth:express.RequestHandler=(req,_res,next)=>{req.organizationId=req.get('X-Test-Org')||org;req.user={userId:req.get('X-Test-User')||user,organizationId:req.organizationId,role:'owner'};next()}
  const app=express();app.use(express.json());app.use('/api/v1/personal',createPersonalRouter(postgresDatabase(sql),[auth]));server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server!.once('listening',resolve))
  const port=(server.address() as {port:number}).port
  async function remove(body:unknown,owner=user,tenant=org,guard=true){const response=await fetch(`http://127.0.0.1:${port}/api/v1/personal/projects/${project}`,{method:'DELETE',headers:{'Content-Type':'application/json','X-Test-User':owner,'X-Test-Org':tenant,...guard?{'X-Abelha-Client':'web'}:{}},body:JSON.stringify(body)});return response.status}
  assert.equal(await remove({}),400)
  assert.equal(await remove({confirmation_name:title+' '}),400)
  assert.equal(await remove({confirmation_name:title},otherUser),404)
  assert.equal(await remove({confirmation_name:title},foreignUser,otherOrg),404)
  assert.equal(await remove({confirmation_name:title},user,org,false),403)
  assert.equal((await pg.query('SELECT id FROM personal_projects WHERE id=$1',[project])).rows.length,1)
  await pg.exec("CREATE FUNCTION reject_project_delete() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'forced deletion failure'; END $$;CREATE TRIGGER reject_project_delete BEFORE DELETE ON personal_projects FOR EACH ROW EXECUTE FUNCTION reject_project_delete()")
  assert.equal(await remove({confirmation_name:title}),503)
  assert.equal((await pg.query('SELECT id FROM personal_projects WHERE id=$1',[project])).rows.length,1)
  assert.equal((await pg.query('SELECT id FROM personal_notifications')).rows.length,4)
  await pg.exec('DROP TRIGGER reject_project_delete ON personal_projects;DROP FUNCTION reject_project_delete()')
  assert.equal(await remove({confirmation_name:title}),204)
  assert.equal((await pg.query('SELECT id FROM personal_projects WHERE id=$1',[project])).rows.length,0)
  assert.equal((await pg.query('SELECT id FROM personal_milestones WHERE project_id=$1',[project])).rows.length,0)
  assert.equal((await pg.query('SELECT id FROM personal_project_updates WHERE project_id=$1',[project])).rows.length,0)
  assert.equal((await pg.query('SELECT id FROM personal_notifications WHERE user_id=$1 AND url=$2',[user,link])).rows.length,0)
  assert.equal((await pg.query('SELECT id FROM personal_projects WHERE id=$1',[sibling])).rows.length,1)
  assert.equal((await pg.query('SELECT id FROM personal_notifications')).rows.length,2)
  assert.equal((await pg.query('SELECT budget FROM personal_monthly_plans')).rows.length,1)
  assert.equal((await pg.query('SELECT id FROM personal_weekly_reviews')).rows.length,1)
  assert.equal(await remove({confirmation_name:title}),404)
 }finally{if(server){server.closeAllConnections();await new Promise<void>(resolve=>server!.close(()=>resolve()))}if(sql)await sql.end({timeout:2});if(wire)await wire.stop();await pg.close()}
})
