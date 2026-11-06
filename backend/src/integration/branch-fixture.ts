import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'

export function assertTestBranch() {
  const expected=process.env.ABELHA_TEST_DATABASE_HOST
  assert.ok(expected, 'Defina a branch isolada pelo runner run-branch-tests.mjs')
  assert.equal(new URL(process.env.DATABASE_URL!).hostname,expected,'O teste deve apontar para a branch autorizada')
  assert.ok(!expected.includes('-pooler'),'Use o endpoint direto da branch de teste')
}

export function schemaConnectionUrl(schema:string) {
  assertTestBranch()
  assert.match(schema,/^abelha_(test|concurrent|ui)_[a-f0-9]{32}$/)
  const connection=new URL(process.env.DATABASE_URL!)
  connection.searchParams.set('options','-c search_path='+schema)
  return connection.toString()
}

export async function createFixtureSchema(sql:any,schema:string) {
  assert.match(schema,/^abelha_(test|concurrent|ui)_[a-f0-9]{32}$/)
  await sql.unsafe('CREATE SCHEMA "'+schema+'"')
  await sql.unsafe('SET LOCAL search_path TO "'+schema+'"')
  const tables=await sql`SELECT tablename FROM pg_tables WHERE schemaname='public'`
  for(const {tablename} of tables) {
    await sql`CREATE TABLE ${sql(schema)}.${sql(tablename)} (LIKE public.${sql(tablename)} INCLUDING ALL)`
  }
  const migration=readFileSync(path.join(process.cwd(),'src/db/migrations/20261105_personal_crm.sql'),'utf8')
  await sql.unsafe(migration)
  return migration
}
