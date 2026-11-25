import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Check, MailCheck, ShieldCheck } from 'lucide-react'
import { api } from '@/lib/api'
import { login, logout } from '@/lib/auth'
import { useAuthStore } from '@/store/auth'
import { personalAccess } from '@/lib/personalAccess'
import AuthLayout from './AuthLayout'
import './RegisterPage.css'

type Challenge={challengeId:string;retryAfterSeconds:number}
type Details={name:string;email:string;password:string}
const register='/api/v1/account/register'
const cleanCode=(value:string)=>value.replace(/[^0-9]/g,'').slice(0,6)

export default function RegisterPage() {
  const [token] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('convite') ?? '')
  const [details,setDetails]=useState<Details>({name:'',email:'',password:''})
  const [challenge,setChallenge]=useState<Challenge|null>(null)
  const [code,setCode]=useState('')
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')
  const [busy,setBusy]=useState('')
  const [created,setCreated]=useState(false)
  const [retryAt,setRetryAt]=useState(0)
  const [seconds,setSeconds]=useState(0)
  const codeInput=useRef<HTMLInputElement>(null)
  const successHeading=useRef<HTMLHeadingElement>(null)
  const pending=useRef(false)
  const navigate=useNavigate()
  const setAuth=useAuthStore(state=>state.setAuth)

  useEffect(()=>{
    if(window.location.hash)window.history.replaceState(window.history.state,'',window.location.pathname)
  },[])
  useEffect(()=>{
    if(!retryAt)return
    const tick=()=>setSeconds(Math.max(0,Math.ceil((retryAt-Date.now())/1000)))
    tick()
    const interval=window.setInterval(tick,1000)
    return ()=>window.clearInterval(interval)
  },[retryAt])
  useEffect(()=>{if(challenge&&!created)codeInput.current?.focus();if(created)successHeading.current?.focus()},[challenge,created])

  async function run(action:string,callback:()=>Promise<void>){
    if(pending.current)return
    pending.current=true;setBusy(action);setError('');setNotice('')
    try{await callback()}
    catch(failure){setError(failure instanceof Error?failure.message:'Não foi possível concluir. Tente novamente.')}
    finally{pending.current=false;setBusy('')}
  }
  function sendCode(){
    void run('sending',async()=>{
      if(new TextEncoder().encode(details.password).length>72)throw new Error('Escolha uma senha de até 72 bytes.')
      const result=await api.post<Challenge>(register+'/code',{token,email:details.email.trim()})
      setChallenge(result);setCode('');setSeconds(result.retryAfterSeconds);setRetryAt(Date.now()+result.retryAfterSeconds*1000)
      setNotice('Código solicitado. Confira também o spam caso não encontre.')
    })
  }
  function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault()
    if(!challenge){sendCode();return}
    if(code.length!==6||created)return
    void run('confirming',async()=>{
      await api.post(register,{...details,token,challengeId:challenge.challengeId,code})
      setCreated(true)
    })
  }
  function enter(){
    void run('entering',async()=>{
      await logout()
      const result=await login(details.email.trim(),details.password)
      if(result.user.role!=='member' || result.user.email.toLowerCase()!==details.email.trim().toLowerCase()) throw new Error('Entre novamente com o e-mail e a senha que você cadastrou.')
      setAuth(result.user);setDetails({name:'',email:'',password:''});navigate('/',{replace:true})
    })
  }

  const ready=/^[\w-]{43}$/.test(token)&&!personalAccess
  const title=created?'E-mail confirmado':challenge?'Confirme seu e-mail':'Crie sua conta'
  return <AuthLayout>
      <form className="login-form signup-card" onSubmit={submit} aria-busy={!!busy}>
        <span className={'login-lock'+(created?' signup-badge--success':'')} aria-hidden="true">{created?<Check size={19} strokeWidth={1.8}/>:challenge?<ShieldCheck size={19} strokeWidth={1.8}/>:<MailCheck size={19} strokeWidth={1.8}/>}</span>
        <div>
          <p className="eyebrow">{challenge?'Etapa 2 de 2 · Verificação':'Etapa 1 de 2 · Acesso por convite'}</p>
          <h2 tabIndex={-1} ref={successHeading}>{title}</h2>
          <p className="login-helper">{created?'Sua conta está pronta para usar.':challenge?<>Digite o código de 6 dígitos enviado para <strong>{details.email}</strong>. Ele vale por até 10 minutos.</>:'Use o e-mail para o qual seu convite foi gerado.'}</p>
        </div>
        {!ready?<p className="login-error" role="alert">{personalAccess?'O cadastro exige o modo local com login habilitado.':'Abra o link completo do convite para se cadastrar.'}</p>:!challenge?
          <fieldset disabled={!!busy} className="register-fields">
            <label className="login-field"><span>Nome</span><input name="name" autoComplete="name" required maxLength={100} value={details.name} onChange={e=>setDetails({...details,name:e.target.value})}/></label>
            <label className="login-field"><span>E-mail do convite</span><input name="email" type="email" autoComplete="email" required maxLength={255} value={details.email} onChange={e=>setDetails({...details,email:e.target.value})}/></label>
            <label className="login-field"><span>Senha</span><input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={72} aria-describedby="register-password" required value={details.password} onChange={e=>setDetails({...details,password:e.target.value})}/></label>
            <small id="register-password">Use pelo menos 12 caracteres.</small>
            <button className="button button-primary login-submit" type="submit">{busy?'Solicitando…':'Enviar código'}<ArrowRight size={17} aria-hidden="true"/></button>
          </fieldset>:
          <div className="register-fields">
            <label className={'signup-otp'+(created?' signup-otp--success':'')+(error&&!created?' signup-otp--error':'')}>
              <span className="signup-label">Código de verificação</span>
              <span className="signup-otp-field">
                <span className="signup-otp-boxes" aria-hidden="true">{Array.from({length:6},(_,i)=><span key={i} className={!created&&i===Math.min(code.length,5)?'signup-otp-next':''} style={{animationDelay:(i*55)+'ms'}}>{code[i]||'·'}</span>)}</span>
                <input ref={codeInput} name="otp" type="text" inputMode="numeric" autoComplete="one-time-code" aria-describedby={error&&!created?'signup-error':undefined} aria-invalid={!!error&&!created} value={code}
                  readOnly={created||!!busy} onChange={event=>setCode(cleanCode(event.target.value))}
                  onPaste={event=>{if(!created&&!busy){event.preventDefault();setCode(cleanCode(event.clipboardData.getData('text')))}}}/>
              </span>
            </label>
            {created?<button type="button" onClick={enter} className="button button-primary login-submit" disabled={!!busy}>{busy?'Entrando…':'Entrar no Abelha'}<ArrowRight size={17} aria-hidden="true"/></button>:
              <><button type="submit" disabled={code.length!==6||!!busy} className="button button-primary login-submit">{busy==='confirming'?'Confirmando…':'Confirmar e criar conta'}<ArrowRight size={17} aria-hidden="true"/></button>
              <div className="signup-links">
                <button type="button" className="text-button" disabled={seconds>0||!!busy} onClick={sendCode}>{seconds>0?'Reenviar em '+seconds+' s':'Reenviar código'}</button>
                <button type="button" className="text-button" disabled={!!busy} onClick={()=>{setChallenge(null);setCode('');setError('');setNotice('')}}>Corrigir e-mail</button>
              </div></>}
          </div>}
        {notice&&<p className="signup-notice" role="status">{notice}</p>}
        {created&&<p className="signup-notice signup-notice--success" role="status">Código validado. Conta criada com sucesso.</p>}
        {error&&<p id="signup-error" className="login-error" role="alert">{error}</p>}
        <Link className="text-button" to="/login">{created?'Ir para o login':'Já tenho conta'}</Link>
      </form>
  </AuthLayout>
}
