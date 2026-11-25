import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import test from 'node:test'
import assert from 'node:assert/strict'
import ts from 'typescript'
import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import * as Icons from 'lucide-react'

const require = createRequire(import.meta.url)
const invite = 'a'.repeat(43)

async function pageModule(name, signupState) {
  const src = await readFile(new URL('../pages/'+name+'.tsx',import.meta.url),'utf8')
  const { outputText } = ts.transpileModule(src,{compilerOptions:{
    module:ts.ModuleKind.CommonJS, jsx:ts.JsxEmit.ReactJSX, target:ts.ScriptTarget.ES2022,
  }})
  let stateIndex = 0
  const output = {exports:{}}
  const deps = {
    react: !signupState ? React : {
      ...React,
      useState(initial) {
        const index = stateIndex++
        return React.useState(index === 0 ? invite : index === 1 ? signupState.details : index === 2 ? signupState.challenge : index === 3 ? signupState.code : initial)
      },
    },
    'lucide-react': Icons,
    '@/lib/api': {},
    '@/lib/auth': {},
    '@/store/auth': { useAuthStore: () => () => {} },
    '@/lib/personalAccess': { personalAccess:false },
    './RegisterPage.css': {},
    './AuthLayout': name === 'AuthLayout' ? undefined : await pageModule('AuthLayout'),
  }
  new Function('require','exports',outputText)(id=>id in deps ? deps[id] : require(id),output.exports)
  return output.exports
}

const render = Page => renderToStaticMarkup(React.createElement(MemoryRouter,null,React.createElement(Page)))

test('signup reuses the same left panel as login and places registration and OTP in the credentials panel',async ()=>{
  const {default:Login}=await pageModule('LoginPage')
  const login=render(Login)
  assert.match(login,/<section class="login-form-side"><form class="login-form">/)
  assert.match(login,/Entre no Abelha/)
  assert.match(login,/autoComplete="current-password"/i)
  const intro=login.match(/<section class="login-intro"[\s\S]*?<\/section>/)[0]
  const details={name:'Pessoa Teste',email:'convidado@example.invalid',password:'senha-sintetica'}
  const {default:Register}=await pageModule('RegisterPage',{details,challenge:null,code:''})
  const register=render(Register)
  assert.ok(register.includes(intro))
  assert.match(register,/<section class="login-form-side">[\s\S]*Crie sua conta[\s\S]*name="password"/)
  assert.doesNotMatch(register,/name="otp"/)
  const {default:Verify}=await pageModule('RegisterPage',{details,challenge:{challengeId:'test'},code:'012345'})
  const verify=render(Verify)
  assert.ok(verify.includes(intro))
  assert.match(verify,/<section class="login-form-side">[\s\S]*Confirme seu e-mail[\s\S]*name="otp"/)
  assert.match(verify,/autocomplete="one-time-code"/i)
  assert.doesNotMatch(verify,/name="password"/)
})
