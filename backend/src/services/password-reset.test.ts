import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import bcrypt from 'bcryptjs'
import { issuePasswordReset, completePasswordReset, type ResetSettings } from './password-reset'
import type { Database } from './platform-db'

test('recovery requires a verified mailbox, respects cooldown, and changes exactly one account once', async () => {
  const owner = '11111111-1111-4111-8111-111111111111'
  const member = '22222222-2222-4222-8222-222222222222'
  const pg = new PGlite()
  const database: Database = { query: async <T extends Record<string, unknown>>(sql: string, args: unknown[] = []) => (await pg.query<T>(sql, args)).rows, transaction: async fn => fn(database) }
  try {
    await pg.exec('CREATE TABLE users(id uuid PRIMARY KEY, email text, password_hash text, account_role text, email_verified_at timestamptz)')
    await pg.exec(await readFile('src/db/migrations/20261125_password_reset.sql', 'utf8'))
    const prior = await bcrypt.hash('previous-synthetic-password', 4)
    await pg.query("INSERT INTO users (id,email,password_hash,account_role) VALUES ($1,'Owner@EXAMPLE.INVALID',$3,'owner'), ($2,'member@example.invalid',$3,'member')",[owner, member, prior])
    const settings: ResetSettings = { origin:'https://abelha.example', ownerEmail:null, send:async () => {} }
    for (const email of ['owner@example.invalid','member@example.invalid','unknown@example.invalid']) {
      assert.equal(await issuePasswordReset(database,email,settings),null)
    }
    settings.ownerEmail = 'owner@example.invalid'
    const delivery = await issuePasswordReset(database,' Owner@example.invalid ',settings)
    assert.ok(delivery)
    assert.equal(delivery.email,'owner@example.invalid')
    const link = new URL(delivery.link)
    const parse = (url:URL) => new URLSearchParams(url.hash.slice(1)).get('token')
    const token = parse(link)
    assert.equal(link.origin,settings.origin)
    assert.equal(link.pathname,'/redefinir-senha')
    assert.equal(link.search,'')
    assert.match(token ?? '',/^[\w-]{43}$/)
    const [stored] = await database.query('SELECT password_reset_hash,password_hash FROM users WHERE id=$1',[owner])
    assert.match(stored.password_reset_hash,/^[a-f0-9]{64}$/)
    assert.equal(stored.password_hash,prior)
    assert.equal(await issuePasswordReset(database,'owner@example.invalid',settings),null)
    await pg.query("UPDATE users SET password_reset_expires_at=now()-interval '1 hour',password_reset_requested_at=now()-interval '1 hour' WHERE id=$1",[owner])
    await assert.rejects(completePasswordReset(database,token,'new-synthetic-password'),{status:400})
    const next = parse(new URL((await issuePasswordReset(database,'owner@example.invalid',settings))!.link))
    await assert.rejects(completePasswordReset(database,next,'short'),{status:400})
    await assert.rejects(completePasswordReset(database,next,'🧪'.repeat(19)),{status:400})
    const attempts = await Promise.allSettled([completePasswordReset(database,next,'new-synthetic-password'),completePasswordReset(database,next,'new-synthetic-password')])
    assert.equal(attempts.filter(attempt=>attempt.status==='fulfilled').length,1)
    await assert.rejects(completePasswordReset(database,next,'another-synthetic-password'),{status:400})
    const [updated] = await database.query('SELECT password_hash,password_reset_version,password_reset_hash FROM users WHERE id=$1',[owner])
    assert.ok(updated.password_reset_version)
    assert.equal(updated.password_reset_hash,null)
    assert.equal(await bcrypt.compare('new-synthetic-password',updated.password_hash),true)
    assert.equal(await bcrypt.compare('previous-synthetic-password',updated.password_hash),false)
    const [other] = await database.query('SELECT password_hash FROM users WHERE id=$1',[member])
    assert.equal(other.password_hash,prior)
    await pg.query('UPDATE users SET email_verified_at=now() WHERE id=$1',[member])
    assert.ok(await issuePasswordReset(database,'member@example.invalid',settings))
  } finally { await pg.close() }
})
