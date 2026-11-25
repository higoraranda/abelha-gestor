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
    await pg.exec(readFileSync('src/db/migrations/20261125_signup_email.sql','utf8'))
    const { issueInvite, redeemInvite } = await import('./invites')
    const { requestSignupCode } = await import('./signup-email')
    const adapt = (client: Pick<PGlite,'query'>): Database => ({
      query: async (query, params) => (await client.query(query, params)).rows as never,
      transaction: fn => pg.transaction(tx => fn(adapt(tx as unknown as Pick<PGlite,'query'>))),
    })
    const db = adapt(pg)
    const secret='test-only-synthetic-otp-secret-with-32-bytes'
    const messages=new Map<string,string>()
    const mail={secret,send:async(email:string,code:string)=>{messages.set(email,code)}}
    assert.deepEqual(await db.query('SELECT id,email,account_role FROM users'), [{id:owner.id,email:'Owner@example.invalid',account_role:'owner'}])
    const invite = await issueInvite(db, owner, ' Guest@Example.invalid ')
    assert.equal((await db.query('SELECT token_hash FROM account_invites'))[0].token_hash.includes(invite.token), false)
    const payload = { token:invite.token, email:'GUEST@example.invalid', name:'Convidada', password:'synthetic long password' }
    await assert.rejects(requestSignupCode(db,{...payload,email:'other@example.invalid'},mail),{status:400})
    const a=await requestSignupCode(db,payload,mail)
    const oldCode=messages.get('guest@example.invalid')!
    const stored=await db.query("SELECT signup_code_hash FROM account_invites WHERE email='guest@example.invalid'")
    assert.match(stored[0].signup_code_hash,/^[0-9a-f]{64}$/)
    assert.notEqual(stored[0].signup_code_hash,oldCode)
    await db.query("UPDATE account_invites SET signup_code_sent_at=now()-interval '61 seconds', signup_code_expires_at=now()-interval '1 second' WHERE email='guest@example.invalid'")
    await assert.rejects(redeemInvite(db,{...payload,...a,code:oldCode},secret),{status:400})
    const b=await requestSignupCode(db,payload,mail)
    await assert.rejects(redeemInvite(db,{...payload,...a,code:oldCode},secret),{status:400})
    const valid={...payload,...b,code:messages.get('guest@example.invalid')}
    const attempts = await Promise.allSettled([redeemInvite(db,valid,secret),redeemInvite(db,valid,secret)])
    assert.equal(attempts.filter(r=>r.status==='fulfilled').length,1)
    await assert.rejects(redeemInvite(db,valid,secret),{status:400})
    const [member] = await db.query("SELECT * FROM users WHERE email='guest@example.invalid'")
    assert.equal(member.account_role,'member')
    assert.ok(member.email_verified_at)
    assert.notEqual(member.organization_id,owner.organization_id)
    assert.equal(await bcrypt.compare(payload.password,member.password_hash),true)
    assert.equal((await db.query('SELECT id FROM organizations')).length,2)
    await assert.rejects(issueInvite(db,{id:member.id,organization_id:member.organization_id},'other@example.invalid'),{status:403})
    const expired=await issueInvite(db,owner,'other@example.invalid')
    await db.query("UPDATE account_invites SET expires_at=now()-interval '1 second' WHERE email='other@example.invalid'")
    await assert.rejects(requestSignupCode(db,{...payload,token:expired.token,email:'other@example.invalid'},mail),{status:400})
    const failure=await issueInvite(db,owner,'failure@example.invalid')
    const failurePayload={...payload,token:failure.token,email:'failure@example.invalid'}
    await assert.rejects(requestSignupCode(db,failurePayload,{secret,send:async()=>{throw new Error('synthetic failure')}}),{status:503})
    assert.equal((await db.query("SELECT signup_code_hash FROM account_invites WHERE email='failure@example.invalid'"))[0].signup_code_hash,null)

    const locked=await issueInvite(db,owner,'locked@example.invalid')
    const lockedPayload={...payload,token:locked.token,email:'locked@example.invalid'}
    const lockChallenge=await requestSignupCode(db,lockedPayload,mail)
    const lockCode=messages.get(lockedPayload.email)!
    const wrong=lockCode==='000000'?'000001':'000000'
    for(let i=0;i<8;i++)await assert.rejects(redeemInvite(db,{...lockedPayload,...lockChallenge,code:wrong},secret),{status:400})
    await assert.rejects(redeemInvite(db,{...lockedPayload,...lockChallenge,code:lockCode},secret),{status:400})
    await assert.rejects(requestSignupCode(db,lockedPayload,mail),{status:429})

    const old=await issueInvite(db,owner,'other@example.invalid')
    await issueInvite(db,owner,'other@example.invalid')
    await assert.rejects(requestSignupCode(db,{...payload,token:old.token,email:'other@example.invalid'},mail),{status:400})
    assert.equal((await db.query('SELECT id FROM organizations')).length,2)
  } finally { await pg.close() }
})
