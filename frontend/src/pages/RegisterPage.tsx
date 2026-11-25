import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, MailCheck } from 'lucide-react'
import { api } from '@/lib/api'
import { login, logout } from '@/lib/auth'
import { useAuthStore } from '@/store/auth'
import { personalAccess } from '@/lib/personalAccess'

export default function RegisterPage() {
  const [token] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('convite') ?? '')
  const [error,setError]=useState('')
  const [status,setStatus]=useState<'idle'|'saving'|'created'>('idle')
  const navigate=useNavigate()
  const setAuth=useAuthStore(state=>state.setAuth)
  useEffect(()=>{
    if(window.location.hash) window.history.replaceState(window.history.state,'',window.location.pathname)
  },[])

  async function submit(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if(status!=='idle')return
    const form=new FormData(event.currentTarget)
    const email=String(form.get('email') ?? '').trim()
    const password=String(form.get('password') ?? '')
    setError('')
    setStatus('saving')
    try {
      if(new TextEncoder().encode(password).length>72) throw new Error('Escolha uma senha de até 72 bytes.')
      await api.post('/api/v1/account/register',{ token, name:form.get('name'), email, password })
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível concluir o cadastro.')
      setStatus('idle')
      return
    }
    setStatus('created')
    try {
      await logout()
      const result=await login(email,password)
      if(result.user.role!=='member' || result.user.email.toLowerCase()!==email.toLowerCase()) throw new Error()
      setAuth(result.user)
      navigate('/',{replace:true})
    } catch { /* Account was created; the login link is the safe recovery path. */ }
  }
  const ready=/^[\w-]{43}$/.test(token)&&!personalAccess
  return <main className="login-page">
    <section className="login-intro" aria-label="Apresentação do Abelha">
      <div className="login-brand"><img className="brand-mark" src="/bee-mark.png" alt="" /><strong>abelha</strong></div>
      <div className="login-intro-copy">
        <p className="eyebrow">Abelha Personal</p><h1>Um espaço seu, do primeiro projeto ao próximo passo.</h1>
        <p>Use o convite para criar sua conta e organize seus projetos em uma carteira privada.</p>
      </div>
    </section>
    <section className="login-form-side">
      <form className="login-form" onSubmit={submit}>
        <span className="login-lock"><MailCheck size={20} aria-hidden="true" /></span>
        <div><p className="eyebrow">Acesso por convite</p><h2>Crie sua conta</h2>
          <p className="login-helper">Cadastre-se com o mesmo email para o qual o convite foi gerado.</p></div>
        {status==='created'?<p role="status">Conta criada. Se você não for redirecionado, entre com sua nova senha.</p>:ready?<fieldset disabled={status==='saving'} className="register-fields">
          <label className="login-field"><span>Nome</span><input name="name" autoComplete="name" required maxLength={100} /></label>
          <label className="login-field"><span>Email do convite</span><input name="email" type="email" autoComplete="email" required maxLength={255} /></label>
          <label className="login-field"><span>Senha</span><input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={72} aria-describedby="register-password" required /></label>
          <small id="register-password">Use pelo menos 12 caracteres.</small>
          {error&&<p className="login-error" role="alert">{error}</p>}
          <button className="button button-primary login-submit" type="submit">{status==='saving'?'Criando conta…':'Criar minha conta'}<ArrowRight size={17} aria-hidden="true" /></button>
        </fieldset>:<p className="login-error" role="alert">{personalAccess?'O cadastro exige o modo local com login habilitado.':'Abra o link completo do convite para se cadastrar.'}</p>}
        <Link className="text-button" to="/login">Já tenho conta</Link>
      </form>
    </section>
  </main>
}
