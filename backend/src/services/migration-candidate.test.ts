import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync,readdirSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'

test('candidate migration chain preserves legacy owner, projects and commercial records in isolated HML schema',async()=>{
  const initial=new PGlite()
  let db:PGlite|undefined
  try{
    await initial.exec('CREATE DATABASE abelha_homologacao')
    db=new PGlite({database:'abelha_homologacao',loadDataDir:await initial.dumpDataDir()})
    await db.exec(readFileSync('src/db/homologation/bootstrap-empty.sql','utf8'))
    const snapshot=await db.query<{owner_id:string;org_id:string;project_id:string;client_id:string}>(`
      WITH org AS (INSERT INTO organizations(name) VALUES('Organização sintética') RETURNING id),
      owner AS (INSERT INTO users(organization_id,email,name) SELECT id,'owner@example.invalid','Owner sintético' FROM org RETURNING id,organization_id),
      project AS (INSERT INTO personal_projects(organization_id,user_id,name,status) SELECT organization_id,id,'Projeto legado','active' FROM owner RETURNING id),
      client AS (INSERT INTO clients(organization_id,name) SELECT id,'Cliente legado' FROM org RETURNING id)
      SELECT (SELECT id FROM owner) AS owner_id,(SELECT id FROM org) AS org_id,(SELECT id FROM project) AS project_id,(SELECT id FROM client) AS client_id
    `)
    const files=readdirSync('src/db/migrations').filter(name=>/^202611(?:25|26|27|28|29)_.*\.sql$/.test(name)).sort()
    assert.ok(files.includes('20261129_quote_proposal_workflow.sql'))
    assert.ok(files.includes('20261127_managed_accounts.sql'))
    assert.ok(files.includes('20261127_project_pipeline.sql'))
    assert.ok(files.includes('20261127_quote_proposal_decisions.sql'))
    for(const file of files)await db.exec(readFileSync('src/db/migrations/'+file,'utf8'))
    const ids=snapshot.rows[0]
    assert.deepEqual((await db.query('SELECT id,organization_id,email,account_role,account_disabled_at,email_verified_at FROM users')).rows,
      [{id:ids.owner_id,organization_id:ids.org_id,email:'owner@example.invalid',account_role:'owner',account_disabled_at:null,email_verified_at:null}])
    assert.deepEqual((await db.query('SELECT id,status,pipeline_stage FROM personal_projects')).rows,[{id:ids.project_id,status:'active',pipeline_stage:null}])
    assert.deepEqual((await db.query('SELECT id,organization_id,name FROM clients')).rows,[{id:ids.client_id,organization_id:ids.org_id,name:'Cliente legado'}])
    assert.equal((await db.query<{bad:number}>("SELECT count(*)::int AS bad FROM pg_constraint WHERE connamespace='public'::regnamespace AND NOT convalidated")).rows[0].bad,0)
    assert.equal((await db.query<{bad:number}>("SELECT count(*)::int AS bad FROM pg_index WHERE indrelid IN (SELECT oid FROM pg_class WHERE relnamespace='public'::regnamespace) AND NOT indisvalid")).rows[0].bad,0)
  }finally{await db?.close();await initial.close()}
})
