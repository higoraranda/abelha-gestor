import test from 'node:test'
import assert from 'node:assert/strict'
import { resendSignupEmail } from './signup-email'

test('verification mail is sent only by the configured backend adapter',async t=>{
  const keys=['ABELHA_OTP_SECRET','ABELHA_OTP_RESEND_API_KEY','ABELHA_OTP_FROM'] as const
  const saved=keys.map(key=>process.env[key])
  t.after(()=>keys.forEach((key,i)=>{if(saved[i]===undefined)delete process.env[key];else process.env[key]=saved[i]}))
  for(const key of keys)delete process.env[key]
  assert.throws(()=>resendSignupEmail(),{status:503})
  process.env.ABELHA_OTP_SECRET='local-synthetic-verification-secret'
  process.env.ABELHA_OTP_RESEND_API_KEY='synthetic-test-api-token'
  process.env.ABELHA_OTP_FROM='Abelha <synthetic@example.invalid>'
  const mock=t.mock.method(globalThis,'fetch',async(url:string,options:RequestInit)=>{
    assert.equal(url,'https://api.resend.com/emails')
    assert.equal(options.method,'POST')
    assert.equal(new Headers(options.headers).get('Idempotency-Key'),'abelha-signup-test-challenge')
    assert.equal(options.redirect,'error')
    const body=JSON.parse(String(options.body))
    assert.deepEqual(body.to,['recipient@example.invalid'])
    assert.match(body.text,/012345/)
    assert.match(body.html,/012345/)
    assert.equal(body.subject,'Seu código de confirmação do Abelha')
    assert.match(body.html,/role="presentation"/)
    for(const version of [body.text,body.html]){
      assert.match(version,/Confirme seu e-mail/)
      assert.match(version,/10 minutos/)
      assert.match(version,/ignore este e-mail/)
      assert.doesNotMatch(version,/<(?:img|a|script)\b/i)
    }
    return Response.json({id:'fake-email-id'})
  })
  await resendSignupEmail().send('recipient@example.invalid','012345','test-challenge')
  assert.equal(mock.mock.callCount(),1)
})
