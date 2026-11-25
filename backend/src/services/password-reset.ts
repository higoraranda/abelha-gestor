import { createHash, randomBytes, randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { canonicalEmail } from './account-email'
import { InputError } from './personal'
import type { Database } from './platform-db'
import { resendMailer } from './signup-email'

export type ResetDelivery = { email: string; link: string; requestId: string }
export type ResetSettings = { origin: string; ownerEmail: string | null; send: (delivery: ResetDelivery) => Promise<void> }
const digest = (token: string) => createHash('sha256').update(token).digest('hex')
const invalidLink = () => new InputError('Link inválido ou expirado. Solicite um novo link de recuperação.')

export async function issuePasswordReset(db: Database, emailInput: unknown, config: ResetSettings): Promise<ResetDelivery | null> {
  const email = canonicalEmail(emailInput)
  if (!email) throw new InputError('Informe um e-mail válido.')
  const token = randomBytes(32).toString('base64url')
  const [user] = await db.query(`
    UPDATE users SET password_reset_hash=$2, password_reset_requested_at=now(),
      password_reset_expires_at=now()+interval '20 minutes'
    WHERE lower(btrim(email))=$1 AND password_hash IS NOT NULL
      AND ((account_role='member' AND email_verified_at IS NOT NULL AND to_jsonb(users)->>'account_disabled_at' IS NULL) OR
           (account_role='owner' AND lower(btrim(email))=$3))
      AND (password_reset_requested_at IS NULL OR password_reset_requested_at<=now()-interval '5 minutes')
    RETURNING id
  `, [email, digest(token), config.ownerEmail])
  if (!user) return null
  const link = new URL('/redefinir-senha', config.origin)
  link.hash = new URLSearchParams({ token }).toString()
  return { email, link: link.toString(), requestId: randomUUID() }
}

export async function completePasswordReset(db: Database, token: unknown, password: unknown) {
  if (typeof token !== 'string' || !/^[\w-]{43}$/.test(token)) throw invalidLink()
  if (typeof password !== 'string' || password.length<12 || Buffer.byteLength(password,'utf8')>72) {
    throw new InputError('A senha precisa ter ao menos 12 caracteres e até 72 bytes.')
  }
  const hash = digest(token)
  const active = "password_reset_hash=$1 AND password_reset_expires_at>now() AND (account_role='owner' OR (account_role='member' AND to_jsonb(users)->>'account_disabled_at' IS NULL AND password_reset_requested_at >= COALESCE((to_jsonb(users)->>'account_status_changed_at')::timestamptz,'-infinity'::timestamptz)))"
  const [match] = await db.query('SELECT id FROM users WHERE '+active, [hash])
  if (!match) throw invalidLink()
  const passwordHash = await bcrypt.hash(password, 12)
  const [updated] = await db.query(`
    UPDATE users SET password_hash=$2, password_reset_version=$3,
      password_reset_hash=NULL, password_reset_expires_at=NULL
    WHERE ${active} AND id=$4 RETURNING id
  `, [hash, passwordHash, randomUUID(), match.id])
  if (!updated) throw invalidLink()
}

export function resetSettings(): ResetSettings {
  let url: URL
  try { url = new URL(process.env.FRONTEND_URL ?? '') }
  catch { throw new InputError('A recuperação por e-mail ainda não está configurada.', 503) }
  const local = process.env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1'].includes(url.hostname) && url.protocol === 'http:'
  if ((!local && url.protocol !== 'https:') || url.href !== url.origin+'/' || url.username || url.password) {
    throw new InputError('A recuperação por e-mail ainda não está configurada.', 503)
  }
  const send = resendMailer()
  return {
    origin: url.origin,
    ownerEmail: canonicalEmail(process.env.ABELHA_OWNER_RECOVERY_EMAIL),
    send: ({email,link,requestId}) => send(email, 'abelha-reset-'+requestId, {
      subject: 'Redefina sua senha do Abelha',
      text: ['ABELHA','Redefina sua senha',link,'Link de uso único, válido por 20 minutos.',
        'Se não pediu a redefinição, ignore este e-mail. Sua senha permanece a mesma.'].join('\n\n'),
      html: `<!doctype html><html lang="pt-BR"><meta charset="utf-8">
<body style="background:#141719;color:#F5F5F3;font-family:Arial,sans-serif;padding:24px">
<div style="max-width:480px;margin:auto;background:#1D2224;border-top:4px solid #F4D22F;border-radius:12px;padding:24px">
<p style="color:#F4D22F;font-weight:bold">abelha</p><h1>Redefina sua senha</h1>
<p>Use o link abaixo para escolher uma nova senha. Ele vale por 20 minutos e só funciona uma vez.</p>
<p><a href="${link}" style="display:inline-block;background:#F4D22F;color:#141719;padding:12px 16px;border-radius:8px;font-weight:bold">Criar nova senha</a></p>
<p>Se não pediu a redefinição, ignore este e-mail. Sua senha permanece a mesma.</p>
</div></body></html>`,
    }),
  }
}
