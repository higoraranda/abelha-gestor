import { randomBytes, timingSafeEqual } from 'node:crypto'
import { activeInvite, hashCode, inviteCredentials, inviteHash, invalidCode, MAX_SIGNUP_FAILURES, unavailableInvite } from './signup-email'
import bcrypt from 'bcryptjs'
import type { Database } from './platform-db'
import { InputError } from './personal'
import { canonicalEmail } from './account-email'

export async function issueInvite(db: Database, actor: {id:string;organization_id:string}, value: unknown) {
  const email = canonicalEmail(value)
  if (!email) throw new InputError('Informe um email válido.')
  const token = randomBytes(32).toString('base64url')
  const [row] = await db.query(`
    INSERT INTO account_invites(email,token_hash,issued_by,expires_at)
    SELECT $1,$2,id,now()+interval '72 hours' FROM users
    WHERE id=$3 AND organization_id=$4 AND account_role='owner'
      AND NOT EXISTS (SELECT 1 FROM users WHERE lower(btrim(email))=$1)
    ON CONFLICT (email) DO UPDATE SET token_hash=excluded.token_hash, issued_by=excluded.issued_by,
      expires_at=excluded.expires_at, redeemed_at=NULL, signup_challenge=NULL, signup_code_hash=NULL,
      signup_code_expires_at=NULL, signup_code_sent_at=NULL, signup_sends=0, signup_failures=0
    RETURNING expires_at
  `,[email,inviteHash(token),actor.id,actor.organization_id])
  if (!row) {
    const [owner] = await db.query("SELECT id FROM users WHERE id=$1 AND organization_id=$2 AND account_role='owner'",[actor.id,actor.organization_id])
    if (!owner) throw new InputError('Acesso exclusivo do proprietário.',403)
    throw new InputError('Já existe uma conta com esse email.',409)
  }
  return { token, expiresAt:row.expires_at }
}

export async function redeemInvite(db: Database, body: Record<string,unknown>, secret:string) {
  const {email,tokenHash}=inviteCredentials(body)
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const {challengeId,code}=body
  if(typeof challengeId!=='string'||!(/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(challengeId))||typeof code!=='string'||!/^\d{6}$/.test(code))throw invalidCode()
  if (!name || name.length > 100) throw new InputError('Informe um nome de até 100 caracteres.')
  if (password.length < 12 || Buffer.byteLength(password,'utf8') > 72) {
    throw new InputError('A senha precisa ter ao menos 12 caracteres e até 72 bytes.')
  }
  try {
    const verified=await db.transaction(async tx=>{
      const [match]=await tx.query('SELECT signup_code_hash FROM account_invites WHERE '+activeInvite+' AND signup_challenge=$3 AND signup_code_expires_at>now() AND signup_failures<$4 FOR UPDATE',[email,tokenHash,challengeId,MAX_SIGNUP_FAILURES])
      if(!match?.signup_code_hash)return false
      const expected=Buffer.from(match.signup_code_hash,'hex')
      const received=Buffer.from(hashCode(secret,tokenHash,challengeId,code),'hex')
      if(expected.length!==received.length||!timingSafeEqual(expected,received)){
        await tx.query('UPDATE account_invites SET signup_failures=signup_failures+1 WHERE email=$1 AND token_hash=$2',[email,tokenHash])
        return false
      }
      const passwordHash=await bcrypt.hash(password,12)
      await tx.query('UPDATE account_invites SET redeemed_at=now(),signup_code_hash=NULL,signup_code_expires_at=NULL,signup_challenge=NULL WHERE email=$1 AND token_hash=$2',[email,tokenHash])
      const [org]=await tx.query('INSERT INTO organizations(name) VALUES($1) RETURNING id',[name])
      await tx.query("INSERT INTO users(organization_id,name,email,password_hash,account_role,email_verified_at) VALUES($1,$2,$3,$4,'member',now())",[org.id,name,email,passwordHash])
      return true
    })
    if(!verified)throw invalidCode()
  } catch(error) {
    if((error as {code?:string}).code==='23505')throw unavailableInvite()
    throw error
  }
}
