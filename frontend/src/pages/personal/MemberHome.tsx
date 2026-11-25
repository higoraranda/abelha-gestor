import { lazy, useEffect, useState } from 'react'
import AreaContent from '@/components/ui/AreaContent'
import { useNavigate, useSearchParams } from 'react-router-dom'
import QuoteModelsPage from '../LazyQuoteModelsPage'
import { resolveMemberWorkspace, type MemberModule, type MemberWorkspace } from '@/lib/memberModules'
import { LogOut } from 'lucide-react'
import { api } from '@/lib/api'
import { logout } from '@/lib/auth'
import { useAuthStore } from '@/store/auth'
import { useRemote } from '@/hooks/useRemote'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/DataState'

const PersonalFinance = lazy(() => import('./PersonalFinance'))
const PersonalSubscriptions = lazy(() => import('./PersonalSubscriptions'))
const PersonalPrices = lazy(() => import('./PersonalPrices'))

const path='/api/v1/personal/projects'
type Project={id:string;name:string;next_step:string|null}

export default function MemberHome() {
  const user=useAuthStore(state=>state.user)
  const clearAuth=useAuthStore(state=>state.clearAuth)
  const navigate=useNavigate()
  const [params,setParams]=useSearchParams()
  const modules=useRemote<MemberWorkspace>(user?.id?'/api/v1/member-modules/me':null)
  const reload=modules.reload
  useEffect(()=>{
    const timer=window.setInterval(()=>{if(document.visibilityState==='visible'&&navigator.onLine)reload()},30000)
    window.addEventListener('focus',reload)
    return ()=>{window.clearInterval(timer);window.removeEventListener('focus',reload)}
  },[reload])
  const requested=params.get('member')
  const allowed=modules.error?null:modules.data
  const {allowed:authorized,visible,active}=resolveMemberWorkspace(allowed,requested)
  const projects=useRemote<Project[]>(active==='projects'?path:null)
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)
  const [savingPrefs,setSavingPrefs]=useState(false)
  const [preferenceError,setPreferenceError]=useState('')
  async function toggleVisibility(id:MemberModule,visible:boolean){
    if(!allowed||savingPrefs)return
    const prior=allowed.hidden??[]
    const hidden=visible?prior.filter(key=>key!==id):[...new Set([...prior,id])]
    setSavingPrefs(true);setPreferenceError('')
    try{await api.patch('/api/v1/member-modules/me/preferences',{hidden})}
    catch(failure){setPreferenceError(failure instanceof Error?failure.message:'Não foi possível salvar esta preferência.')}
    finally{setSavingPrefs(false)}
  }
  async function create(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if(busy)return
    const form=event.currentTarget
    const data=new FormData(form)
    setBusy(true);setError('')
    try {
      await api.post(path,{name:String(data.get('name')??'').trim(),next_step:String(data.get('next_step')??'').trim()})
      form.reset();projects.reload()
    } catch(failure) {setError(failure instanceof Error?failure.message:'Não foi possível criar o projeto.')}
    finally {setBusy(false)}
  }
  async function signOut() {
    try {await logout();clearAuth();navigate('/login',{replace:true})}
    catch {setError('Não foi possível sair. Verifique sua conexão e tente novamente.')}
  }
  return <main className="member-shell">
    <header className="personal-row"><div className="login-brand"><img className="brand-mark" src="/bee-mark.png" alt=""/><strong>abelha</strong></div><button className="button button-secondary" onClick={signOut}><LogOut size={17} aria-hidden="true" /> Sair</button></header>
    <div className="page-heading"><div><p className="eyebrow">Meu espaço · Acesso por convite</p><h1>{user?.name?'Olá, '+user.name.split(' ')[0]+'.':'Seu espaço pessoal'}</h1><p className="page-subtitle">Aqui ficam os módulos disponíveis para a sua conta.</p></div></div>
    {!!visible.length&&<nav className="quote-actions" aria-label="Módulos disponíveis">{visible.map(module=><button key={module.id} className="button button-secondary" aria-current={active===module.id?'page':undefined} onClick={()=>setParams({member:module.slug})}>{module.navigation}</button>)}</nav>}
    {!!authorized.length&&<details className="quote-transfer"><summary>Personalizar meu espaço</summary>
      <p>Escolha quais módulos liberados aparecem aqui. Isso não muda sua autorização.</p>
      <fieldset className="quote-approval quote-module-flags" disabled={savingPrefs||modules.loading}><legend>Exibir no meu espaço</legend>
        {authorized.map(module=><label key={module.id}><input type="checkbox" checked={!allowed?.hidden?.includes(module.id)} onChange={event=>void toggleVisibility(module.id,event.target.checked)}/> {module.label}</label>)}
      </fieldset>{preferenceError&&<p className="form-error" role="alert">{preferenceError}</p>}
    </details>}
    <AreaContent key={active}>{modules.error?<ErrorState message={modules.error} retry={reload}/>:!allowed?<LoadingState/>:active==='calculator'?<QuoteModelsPage/>:active==='finance'?<PersonalFinance/>:active==='subscriptions'?<PersonalSubscriptions/>:active==='prices'?<PersonalPrices onClear={()=>setParams({member:'precos'})}/>:active==='projects'?<section className="module-page">
      <section className="crm-panel personal-section"><h2>Novo projeto</h2>
        <form className="register-fields" onSubmit={create}>
          <label className="login-field"><span>Nome do projeto</span><input name="name" maxLength={160} required /></label>
          <label className="login-field"><span>Próximo passo (opcional)</span><input name="next_step" maxLength={500} /></label>
          <button className="button button-primary" disabled={busy}>{busy?'Salvando…':'Criar projeto'}</button>
        </form>
        {error&&<p className="login-error" role="alert">{error}</p>}
      </section>
      <section className="crm-panel personal-section"><h2>Meus projetos</h2>
        {projects.loading&&!projects.data?<LoadingState/>:projects.error?<ErrorState message={projects.error} retry={projects.reload}/>:!projects.data?.length?<EmptyState title="Nenhum projeto ainda" text="Crie seu primeiro projeto para acompanhar a próxima etapa."/>:projects.data.map(project=><article className="personal-update" key={project.id}><h3>{project.name}</h3><p>{project.next_step||'Próximo passo ainda não definido.'}</p></article>)}
      </section>
    </section>:<EmptyState title={authorized.length?'Todos os módulos liberados estão ocultos':'Nenhum módulo disponível'} text={authorized.length?'Escolha o que exibir em Personalizar meu espaço.':'O proprietário ainda não liberou módulos para esta conta.'}/>}</AreaContent>
  </main>
}
