import { createHash, randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import type { Database } from './platform-db'
import { InputError } from './personal'
import { canonicalEmail } from './account-email'

const digest = (value: string) => createHash('sha256').update(value).digest('hex')
const invalid = () => new InputError('Convite indisponível. Confira o email ou peça um novo link.', 400)

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
      expires_at=excluded.expires_at, redeemed_at=NULL
    RETURNING expires_at
  `,[email,digest(token),actor.id,actor.organization_id])
  if (!row) {
    const [owner] = await db.query("SELECT id FROM users WHERE id=$1 AND organization_id=$2 AND account_role='owner'",[actor.id,actor.organization_id])
    if (!owner) throw new InputError('Acesso exclusivo do proprietário.',403)
    throw new InputError('Já existe uma conta com esse email.',409)
  }
  return { token, expiresAt:row.expires_at }
}

export async function redeemInvite(db: Database, body: Record<string,unknown>) {
  const email = canonicalEmail(body.email)
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  if (!email || typeof body.token !== 'string' || !/^[\w-]{43}$/.test(body.token)) throw invalid()
  if (!name || name.length > 100) throw new InputError('Informe um nome de até 100 caracteres.')
  if (password.length < 12 || Buffer.byteLength(password,'utf8') > 72) {
    throw new InputError('A senha precisa ter ao menos 12 caracteres e até 72 bytes.')
  }
  const hash = digest(body.token)
  const available = "email=$1 AND token_hash=$2 AND expires_at>now() AND redeemed_at IS NULL AND EXISTS (SELECT 1 FROM users WHERE id=account_invites.issued_by AND account_role='owner')"
  if (!(await db.query('SELECT 1 FROM account_invites WHERE '+available,[email,hash])).length) throw invalid()
  const passwordHash = await bcrypt.hash(password,12)
  try {
    await db.transaction(async tx => {
      if (!(await tx.query('UPDATE account_invites SET redeemed_at=now() WHERE '+available+' RETURNING email',[email,hash])).length) throw invalid()
      const [org] = await tx.query('INSERT INTO organizations(name) VALUES($1) RETURNING id',[name])
      await tx.query("INSERT INTO users(organization_id,name,email,password_hash,account_role) VALUES($1,$2,$3,$4,'member')",[org.id,name,email,passwordHash])
    })
  } catch (error) {
    if ((error as {code?:string}).code === '23505') throw invalid()
    throw error
  }
}
