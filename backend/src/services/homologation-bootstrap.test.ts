import test from 'node:test'
import assert from 'node:assert/strict'
import {existsSync,readFileSync} from 'node:fs'
import {PGlite} from '@electric-sql/pglite'

function bootstrap() {
  const file='src/db/homologation/bootstrap-empty.sql'
  assert.ok(existsSync(file),'O bootstrap revisável de homologação deve existir')
  return readFileSync(file,'utf8')
}

async function emptyHomologation() {
  const initial=new PGlite()
  try {
    await initial.exec('CREATE DATABASE abelha_homologacao')
    return new PGlite({database:'abelha_homologacao',loadDataDir:await initial.dumpDataDir()})
  }finally{await initial.close()}
}

test('empty homologation database receives full CRM and Personal schema without business records',async()=>{
  const sql=bootstrap(),db=await emptyHomologation()
  try {
    await db.exec(sql)
    const counts=await db.query<{total:number;personal:number}>("SELECT count(*)::int AS total,count(*) FILTER(WHERE tablename LIKE 'personal_%' OR tablename IN('push_subscriptions','crm_lead_candidates','crm_service_drafts'))::int AS personal FROM pg_tables WHERE schemaname='public'")
    assert.deepEqual(counts.rows,[{total:35,personal:18}])
    for(const {tablename} of (await db.query<{tablename:string}>("SELECT tablename FROM pg_tables WHERE schemaname='public'")).rows) {
      assert.equal((await db.query<{count:number}>('SELECT count(*)::int AS count FROM "'+tablename+'"')).rows[0].count,0,tablename)
    }
    await assert.rejects(db.exec(sql),/vazio/i)
    assert.equal((await db.query<{favorite:boolean}>("SELECT attname='favorite' AS favorite FROM pg_attribute WHERE attrelid='clients'::regclass AND attname='favorite'")).rows[0].favorite,true)
  }finally{await db.close()}
})

test('bootstrap refuses another database without creating any tables',async()=>{
  const sql=bootstrap(),db=new PGlite()
  try {
    await assert.rejects(db.exec(sql),/banco.*recusado/i)
    assert.equal((await db.query<{count:number}>("SELECT count(*)::int AS count FROM pg_tables WHERE schemaname='public'")).rows[0].count,0)
  }finally{await db.close()}
})

test('bootstrap refuses an already used homologation database and preserves existing rows',async()=>{
  const sql=bootstrap(),db=await emptyHomologation()
  try {
    await db.exec("CREATE TABLE sentinel(id integer PRIMARY KEY);INSERT INTO sentinel VALUES(42)")
    await assert.rejects(db.exec(sql),/vazio/i)
    assert.deepEqual((await db.query('SELECT id FROM sentinel')).rows,[{id:42}])
    assert.equal((await db.query<{count:number}>("SELECT count(*)::int AS count FROM pg_tables WHERE schemaname='public'")).rows[0].count,1)
  }finally{await db.close()}
})

test('bootstrap detects existing data in a non-system schema beginning with pg',async()=>{
  const sql=bootstrap(),db=await emptyHomologation()
  try {
    await db.exec('CREATE SCHEMA pgapp;CREATE TABLE pgapp.sentinel(id integer PRIMARY KEY);INSERT INTO pgapp.sentinel VALUES(42)')
    await assert.rejects(db.exec(sql),/vazio/i)
    assert.deepEqual((await db.query('SELECT id FROM pgapp.sentinel')).rows,[{id:42}])
    assert.equal((await db.query<{count:number}>("SELECT count(*)::int AS count FROM pg_tables WHERE schemaname='public'")).rows[0].count,0)
  }finally{await db.close()}
})
