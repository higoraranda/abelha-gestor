import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import bcrypt from 'bcryptjs'
import type { Database } from './platform-db'

test('invite signup preserves the legacy owner and grants only an isolated member account', async () => {
  const pg = new PGlite()
  try {
    await pg.exec(readFileSync('src/db/schema.sql', 'utf8'))
    const [owner] = (await pg.query<{id:string;organization_id:string}>(`
      WITH org AS (INSERT INTO organizations(name) VALUES ('Dono') RETURNING id)
      INSERT INTO users(organization_id,name,email) SELECT id,'Dono','Owner@example.invalid' FROM org RETURNING id,organization_id
    `)).rows
    await pg.exec(readFileSync('src/db/migrations/20261125_account_invites.sql', 'utf8'))
    const { issueInvite, redeemInvite } = await import('./invites')
    const adapt = (client: Pick<PGlite,'query'>): Database => ({
      query: async (query, params) => (await client.query(query, params)).rows as never,
      transaction: fn => pg.transaction(tx => fn(adapt(tx as unknown as Pick<PGlite,'query'>))),
    })
    const db = adapt(pg)
    assert.deepEqual(await db.query('SELECT id,email,account_role FROM users'), [{id:owner.id,email:'Owner@example.invalid',account_role:'owner'}])
    const invite = await issueInvite(db, owner, ' Guest@Example.invalid ')
    assert.equal((await db.query('SELECT token_hash FROM account_invites'))[0].token_hash.includes(invite.token), false)
    const payload = { token:invite.token, email:'GUEST@example.invalid', name:'Convidada', password:'synthetic long password' }
    await assert.rejects(redeemInvite(db,{...payload,email:'other@example.invalid'}), {status:400})
    const attempts = await Promise.allSettled([redeemInvite(db,payload),redeemInvite(db,payload)])
    assert.equal(attempts.filter(r=>r.status==='fulfilled').length,1)
    await assert.rejects(redeemInvite(db,payload),{status:400})
    const [member] = await db.query("SELECT * FROM users WHERE email='guest@example.invalid'")
    assert.equal(member.account_role,'member')
    assert.notEqual(member.organization_id,owner.organization_id)
    assert.equal(await bcrypt.compare(payload.password,member.password_hash),true)
    assert.equal((await db.query('SELECT id FROM organizations')).length,2)
    await assert.rejects(issueInvite(db,{id:member.id,organization_id:member.organization_id},'other@example.invalid'),{status:403})
    const expired=await issueInvite(db,owner,'other@example.invalid')
    await db.query("UPDATE account_invites SET expires_at=now()-interval '1 second' WHERE email='other@example.invalid'")
    await assert.rejects(redeemInvite(db,{...payload,token:expired.token,email:'other@example.invalid'}),{status:400})
    const old=await issueInvite(db,owner,'other@example.invalid')
    await issueInvite(db,owner,'other@example.invalid')
    await assert.rejects(redeemInvite(db,{...payload,token:old.token,email:'other@example.invalid'}),{status:400})
    assert.equal((await db.query('SELECT id FROM organizations')).length,2)
  } finally { await pg.close() }
})
