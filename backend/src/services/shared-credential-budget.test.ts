import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {PGlite} from '@electric-sql/pglite'
import type {Database} from './platform-db'
import {configuredSharedBudget,createSharedCredentialBudget} from './shared-credential-budget'
test('two replicas share a bounded credential budget without persisting raw addresses',async()=>{
  const pg=new PGlite()
  const db:Database={query:async<T extends Record<string,unknown>>(sql:string,args:unknown[]=[]) => (await pg.query<T>(sql,args)).rows,transaction:async fn=>fn(db)}
  const secret='synthetic-environment-secret-of-32-bytes'
  try{
    await pg.exec(readFileSync('src/db/migrations/20261128_auth_rate_buckets.sql','utf8'))
    const first=createSharedCredentialBudget(db,secret,'login'),second=createSharedCredentialBudget(db,secret,'login')
    const value='fixture@example.invalid'
    const results=await Promise.all(Array.from({length:15},(_,i)=>(i%2?first:second).reserve(value)))
    assert.equal(results.filter(Boolean).length,12)
    assert.ok(await second.reserve('another@example.invalid'))
    const reset=createSharedCredentialBudget(db,secret,'reset')
    assert.ok(await reset.reserve(value))
    assert.equal((await db.query('SELECT bucket_key FROM auth_rate_buckets')).some(row=>String(row.bucket_key).includes('@')),false)
    await first.success(value)
    assert.ok(await second.reserve(value))
    assert.equal(configuredSharedBudget(db,'login',{}),null)
    assert.throws(()=>configuredSharedBudget(db,'login',{ABELHA_AUTH_SHARED_BUDGET:'true',ABELHA_AUTH_RATE_SECRET:'short'}))
  }finally{await pg.close()}
})
