import { randomBytes, timingSafeEqual } from 'node:crypto'
import { activeInvite, hashCode, inviteCredentials, inviteHash, invalidCode, MAX_SIGNUP_FAILURES, unavailableInvite } from './signup-email'
import bcrypt from 'bcryptjs'
import type { Database } from './platform-db'
import { InputError } from './personal'
import { canonicalEmail } from './account-email'

async function managedInvitesInstalled(db:Database){
  const [row]=await db.query("SELECT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('account_invites') AND attname='revoked_at' AND NOT attisdropped) AS installed")
  return row?.installed===true
}

export async function issueInvite(db: Database, actor: {id:string;organization_id:string}, value: unknown, validity:unknown=72) {
  const email = canonicalEmail(value)
  if (!email) throw new InputError('Informe um email válido.')
  if(typeof validity!=='number'||!Number.isInteger(validity)||validity<1||validity>168)throw new InputError('A validade precisa ser de 1 a 168 horas.')
  const managed=await managedInvitesInstalled(db)
  const token = randomBytes(32).toString('base64url')
  const [row] = await db.query(`
    INSERT INTO account_invites(email,token_hash,issued_by,expires_at)
    SELECT $1,$2,id,now()+($5::int*interval '1 hour') FROM users
    WHERE id=$3 AND organization_id=$4 AND account_role='owner'
      AND NOT EXISTS (SELECT 1 FROM users WHERE lower(btrim(email))=$1)
    ON CONFLICT (email) DO UPDATE SET token_hash=excluded.token_hash, issued_by=excluded.issued_by,
      expires_at=excluded.expires_at, redeemed_at=NULL, signup_challenge=NULL, signup_code_hash=NULL,
      signup_code_expires_at=NULL, signup_code_sent_at=NULL, signup_sends=0, signup_failures=0
      ${managed?', revoked_at=NULL, redeemed_user_id=NULL':''}
    WHERE account_invites.issued_by=excluded.issued_by AND account_invites.redeemed_at IS NULL
    RETURNING expires_at
  `,[email,inviteHash(token),actor.id,actor.organization_id,validity])
  if (!row) {
    const [owner] = await db.query("SELECT id FROM users WHERE id=$1 AND organization_id=$2 AND account_role='owner'",[actor.id,actor.organization_id])
    if (!owner) throw new InputError('Acesso exclusivo do proprietário.',403)
    throw new InputError('Já existe uma conta ou um convite indisponível para esse e-mail.',409)
  }
  return { token, expiresAt:row.expires_at }
}

type Issuer = {id:string;organization_id:string}
type InviteSummary = { email:string; expires_at:string; status:'pending'|'used'|'expired'|'revoked' }

export async function listInvites(db:Database, actor:Issuer):Promise<InviteSummary[]> {
  return db.query<InviteSummary>(`
    SELECT i.email,i.expires_at,CASE WHEN i.redeemed_at IS NOT NULL THEN 'used'
      WHEN to_jsonb(i)->>'revoked_at' IS NOT NULL THEN 'revoked'
      WHEN i.expires_at>now() THEN 'pending' ELSE 'expired' END AS status
    FROM account_invites i JOIN users u ON u.id=i.issued_by
    WHERE u.id=$1 AND u.organization_id=$2 AND u.account_role='owner'
    ORDER BY i.expires_at DESC LIMIT 100
  `,[actor.id,actor.organization_id])
}

export async function expireInvite(db:Database, actor:Issuer, value:unknown) {
  const email=canonicalEmail(value)
  if(!email)throw new InputError('Informe um e-mail válido.')
  const managed=await managedInvitesInstalled(db)
  const [expired]=await db.query(`
    UPDATE account_invites i SET expires_at=now()${managed?', revoked_at=now()':''}
    FROM users u WHERE i.issued_by=u.id AND i.email=$1 AND i.redeemed_at IS NULL AND i.expires_at>now()
      AND u.id=$2 AND u.organization_id=$3 AND u.account_role='owner' RETURNING i.email
  `,[email,actor.id,actor.organization_id])
  if(!expired) throw new InputError('Convite ativo não encontrado.',404)
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
      const [match]=await tx.query("SELECT signup_code_hash,to_jsonb(account_invites) ? 'redeemed_user_id' AS stable_link FROM account_invites WHERE "+activeInvite+' AND signup_challenge=$3 AND signup_code_expires_at>now() AND signup_failures<$4 FOR UPDATE',[email,tokenHash,challengeId,MAX_SIGNUP_FAILURES])
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
      const [member]=await tx.query("INSERT INTO users(organization_id,name,email,password_hash,account_role,email_verified_at) VALUES($1,$2,$3,$4,'member',now()) RETURNING id",[org.id,name,email,passwordHash])
      if(match.stable_link)await tx.query('UPDATE account_invites SET redeemed_user_id=$3 WHERE email=$1 AND token_hash=$2',[email,tokenHash,member.id])
      return true
    })
    if(!verified)throw invalidCode()
  } catch(error) {
    if((error as {code?:string}).code==='23505')throw unavailableInvite()
    throw error
  }
}
