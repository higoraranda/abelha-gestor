import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'

test('proposal workflow migration preserves legacy snapshots and backfills decisions without changing contracts',async()=>{
  const pg=new PGlite()
  const load=(name:string)=>readFileSync('src/db/'+name,'utf8')
  try {
    await pg.exec(load('schema.sql'))
    await pg.exec(load('migrations/20261111_personal_platform.sql'))
    await pg.exec(load('migrations/20261126_quote_proposals.sql'))
    await pg.exec(load('migrations/20261127_quote_proposal_decisions.sql'))
    const [{id:org}]=(await pg.query<{id:string}>("INSERT INTO organizations(name) VALUES('Organização sintética') RETURNING id")).rows
    const [{id:user}]=(await pg.query<{id:string}>("INSERT INTO users(organization_id,name,email) VALUES($1,'Dono sintético','synthetic@example.invalid') RETURNING id",[org])).rows
    for(const state of ['approved','refused','draft'])await pg.query("INSERT INTO quote_proposals(organization_id,user_id,client_name,title,briefing,model,quantities,quote,proposal_text,approved_at,refused_at) VALUES($1,$2,'Contato sintético',$3,'Escopo legado livre','{}','{}','{\"oneTimeCents\":12345}','Texto comercial legado',CASE WHEN $3='approved' THEN now() END,CASE WHEN $3='refused' THEN now() END)",[org,user,state])
    const before=(await pg.query('SELECT id,title,briefing,model,quantities,quote,proposal_text,approved_at,refused_at FROM quote_proposals ORDER BY id')).rows
    await pg.exec(load('migrations/20261129_quote_proposal_workflow.sql'))
    assert.deepEqual((await pg.query('SELECT id,title,briefing,model,quantities,quote,proposal_text,approved_at,refused_at FROM quote_proposals ORDER BY id')).rows,before)
    const statuses=(await pg.query<{title:string;status:string}>('SELECT title,status FROM quote_proposals')).rows
    assert.ok(statuses.every(row=>row.title===row.status))
    await assert.rejects(pg.query("UPDATE quote_proposals SET status='draft' WHERE status='approved'"),/quote_proposal_status_decision/)
    assert.equal((await pg.query<{n:number}>('SELECT count(*)::int AS n FROM quote_proposal_prompts')).rows[0].n,0)
  } finally {await pg.close()}
})
