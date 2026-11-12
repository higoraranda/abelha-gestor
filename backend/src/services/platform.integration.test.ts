import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'

test('incremental platform migration preserves CRM rows, reruns safely and enforces owner foreign keys', async () => {
  const db=new PGlite()
  try {
    await db.exec(`CREATE TABLE organizations(id uuid primary key); CREATE TABLE users(id uuid primary key,organization_id uuid not null references organizations(id)); CREATE TABLE clients(id uuid primary key,organization_id uuid not null references organizations(id),name text);
      INSERT INTO organizations VALUES ('10000000-0000-4000-8000-000000000001'),('10000000-0000-4000-8000-000000000002');
      INSERT INTO users VALUES ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001'),('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002');
      INSERT INTO clients VALUES ('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Cliente preservado');`)
    await db.exec(`INSERT INTO users VALUES('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001');
      CREATE TABLE receivables(id uuid primary key,amount numeric(12,2),due_date date);INSERT INTO receivables VALUES('40000000-0000-4000-8000-000000000001',1234.56,'2026-11-30');
      CREATE TABLE expenses(id uuid primary key,amount numeric(12,2),status text);INSERT INTO expenses VALUES('50000000-0000-4000-8000-000000000001',99.99,'paid');`)
    const beforeReceivables=await db.query('SELECT * FROM receivables'),beforeExpenses=await db.query('SELECT * FROM expenses')
    const migration=readFileSync('src/db/migrations/20261111_personal_platform.sql','utf8')
    await db.exec(migration); await db.exec(migration)
    const row=await db.query('SELECT name FROM clients');assert.equal((row.rows[0] as any).name,'Cliente preservado')
    await assert.rejects(db.query(`INSERT INTO personal_projects(organization_id,user_id,name) VALUES('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','Outro usuário')`), /foreign key/)
    const org='10000000-0000-4000-8000-000000000001',owner='20000000-0000-4000-8000-000000000001',other='20000000-0000-4000-8000-000000000003',project='60000000-0000-4000-8000-000000000001',cycle='70000000-0000-4000-8000-000000000001',watch='80000000-0000-4000-8000-000000000001'
    await db.query('INSERT INTO personal_projects(id,organization_id,user_id,name) VALUES($1,$2,$3,$4)',[project,org,owner,'Isolated project'])
    await db.query("INSERT INTO personal_invoice_cycles(id,organization_id,user_id,name,starts_on,closes_on) VALUES($1,$2,$3,'Cycle','2026-11-01','2026-11-30')",[cycle,org,owner])
    await db.query("INSERT INTO personal_price_watches(id,organization_id,user_id,name) VALUES($1,$2,$3,'Watch')",[watch,org,owner])
    await assert.rejects(db.query("INSERT INTO personal_milestones(organization_id,user_id,project_id,title,acceptance) VALUES($1,$2,$3,'Forbidden','Criteria')",[org,other,project]),/foreign key/)
    await assert.rejects(db.query("INSERT INTO personal_invoice_entries(organization_id,user_id,cycle_id,recorded_on,amount) VALUES($1,$2,$3,'2026-11-11',10)",[org,other,cycle]),/foreign key/)
    await assert.rejects(db.query("INSERT INTO personal_price_observations(organization_id,user_id,watch_id,event_key,store,product_url,price,observed_at) VALUES($1,$2,$3,'event','shop','https://shop.example/product',10,now())",[org,other,watch]),/foreign key/)
    await assert.rejects(db.query("INSERT INTO crm_service_drafts(organization_id,client_id,idempotency_key,template_key,title,proposal,checklist) VALUES('10000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001','event','custom','Title','Proposal','[]')"),/foreign key/)
    assert.deepEqual((await db.query('SELECT * FROM receivables')).rows,beforeReceivables.rows);assert.deepEqual((await db.query('SELECT * FROM expenses')).rows,beforeExpenses.rows)
    await db.query('DELETE FROM personal_projects WHERE id=$1',[project]);await db.query('DELETE FROM users WHERE id=$1',[owner])
    assert.equal((await db.query('SELECT * FROM personal_invoice_cycles')).rows.length,0);assert.equal((await db.query('SELECT * FROM personal_price_watches')).rows.length,0)
  } finally { await db.close() }
})
