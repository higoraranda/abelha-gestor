import { createHash, createHmac, randomInt, randomUUID } from 'node:crypto'
import { InputError } from './personal'
import { canonicalEmail } from './account-email'
import type { Database } from './platform-db'

export type SignupEmail={secret:string;send:(email:string,code:string,challenge:string)=>Promise<void>}
export const inviteHash=(token:string)=>createHash('sha256').update(token).digest('hex')
export const unavailableInvite=()=>new InputError('Convite indisponível. Confira o e-mail ou peça um novo link.',400)
export const invalidCode=()=>new InputError('Código inválido, expirado ou sem tentativas. Solicite outro código ou peça um novo convite.',400)
export const activeInvite="email=$1 AND token_hash=$2 AND expires_at>now() AND redeemed_at IS NULL AND EXISTS (SELECT 1 FROM users WHERE id=account_invites.issued_by AND account_role='owner')"
export const MAX_SIGNUP_FAILURES=8
export const hashCode=(secret:string,tokenHash:string,challenge:string,code:string)=>
  createHmac('sha256',secret).update(['abelha-signup-v1',tokenHash,challenge,code].join(':')).digest('hex')

export function inviteCredentials(body:Record<string,unknown>){
  const email=canonicalEmail(body.email)
  if(!email||typeof body.token!=='string'||!/^[\w-]{43}$/.test(body.token))throw unavailableInvite()
  return {email,tokenHash:inviteHash(body.token)}
}

export async function requestSignupCode(db:Database,body:Record<string,unknown>,config:SignupEmail){
  const {email,tokenHash}=inviteCredentials(body)
  const challenge=randomUUID()
  const code=String(randomInt(1_000_000)).padStart(6,'0')
  const hash=hashCode(config.secret,tokenHash,challenge,code)
  const [result]=await db.query(`
    UPDATE account_invites SET signup_challenge=$3,signup_code_hash=$4,
      signup_code_expires_at=LEAST(expires_at,now()+interval '10 minutes'),
      signup_code_sent_at=now(),signup_sends=signup_sends+1
    WHERE ${activeInvite} AND signup_sends<5 AND signup_failures<$5
      AND (signup_code_sent_at IS NULL OR signup_code_sent_at<=now()-interval '60 seconds')
    RETURNING email
  `,[email,tokenHash,challenge,hash,MAX_SIGNUP_FAILURES])
  if(!result){
    const [active]=await db.query('SELECT signup_sends,signup_failures FROM account_invites WHERE '+activeInvite,[email,tokenHash])
    if(!active)throw unavailableInvite()
    if(active.signup_sends>=5||active.signup_failures>=MAX_SIGNUP_FAILURES)throw new InputError('Limite deste convite atingido. Peça um novo link.',429)
    throw new InputError('Aguarde 60 segundos antes de solicitar outro código.',429)
  }
  try {await config.send(email,code,challenge)}
  catch {
    await db.query('UPDATE account_invites SET signup_code_hash=NULL,signup_code_expires_at=NULL WHERE email=$1 AND token_hash=$2 AND signup_challenge=$3',[email,tokenHash,challenge])
    throw new InputError('Não foi possível enviar o código agora. Aguarde um minuto e tente novamente.',503)
  }
  return {challengeId:challenge,retryAfterSeconds:60,expiresInSeconds:600}
}

export function signupSecret():string {
  const secret=process.env.ABELHA_OTP_SECRET
  if(!secret||Buffer.byteLength(secret)<32)throw new InputError('A verificação por e-mail ainda não está configurada.',503)
  return secret
}
function verificationMessage(code:string) {
  if(!/^[0-9]{6}$/.test(code))throw new Error('Formato inesperado para o código de cadastro.')
  const title='Confirme seu e-mail'
  const instructions='Digite o código abaixo na tela de cadastro do Abelha para terminar de criar sua conta.'
  const validity='O código é de uso único e vale por até 10 minutos.'
  const safety='Se você não solicitou esse cadastro, ignore este e-mail. Não compartilhe o código com ninguém.'
  return {
    subject:'Seu código de confirmação do Abelha',
    text:['ABELHA',title,instructions,code,validity,safety,'Equipe Abelha'].join('\n\n'),
    html:`<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} | Abelha</title></head>
<body style="margin:0;background:#141719;color:#F5F5F3;font-family:Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#141719"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#1D2224" style="max-width:520px;border:1px solid #353B3E;border-top:4px solid #F4D22F;border-radius:16px">
<tr><td style="padding:28px 24px 24px">
<p style="margin:0 0 20px;color:#F4D22F;font-size:18px;font-weight:700">abelha</p>
<h1 style="margin:0 0 12px;color:#F5F5F3;font-size:26px;line-height:1.2">${title}</h1>
<p style="margin:0 0 22px;color:#D1D7D8;font-size:15px;line-height:1.55">${instructions}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" bgcolor="#F4D22F" style="padding:15px 12px;border-radius:10px;color:#141719">
<p style="margin:0 0 5px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px">Código de verificação</p>
<p style="margin:0;font-family:Consolas,'Courier New',monospace;font-size:32px;line-height:1.2;letter-spacing:4px;font-weight:700">${code}</p>
</td></tr></table>
<p style="margin:14px 0 22px;color:#D1D7D8;font-size:14px;line-height:1.5">${validity}</p>
<p style="margin:0;padding-top:16px;border-top:1px solid #353B3E;color:#AAB3B5;font-size:13px;line-height:1.55">${safety}</p>
<p style="margin:12px 0 0;color:#AAB3B5;font-size:13px">Equipe Abelha</p>
</td></tr></table>
</td></tr></table>
</body></html>`,
  }
}

export function resendMailer() {
  const key=process.env.ABELHA_OTP_RESEND_API_KEY, from=process.env.ABELHA_OTP_FROM
  if(!key||!from)throw new InputError('O envio por e-mail ainda não está configurado.',503)
  return async (email:string,idempotencyKey:string,message:{subject:string;text:string;html:string}) => {
    const response=await fetch('https://api.resend.com/emails',{
      method:'POST',redirect:'error',signal:AbortSignal.timeout(8000),
      headers:{Authorization:'Bearer '+key,'Content-Type':'application/json','Idempotency-Key':idempotencyKey},
      body:JSON.stringify({
        from,to:[email],...message
      })
    })
    if(!response.ok)throw new Error('O serviço de e-mail não aceitou o envio.')
    const result=await response.json() as {id?:string}
    if(!result.id)throw new Error('O serviço de e-mail não confirmou o envio.')
  }
}

export function resendSignupEmail():SignupEmail {
  const secret=signupSecret(), send=resendMailer()
  return {secret,send:(email,code,challenge)=>send(email,'abelha-signup-'+challenge,verificationMessage(code))}
}
