import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import QuoteModelsPage from '../QuoteModelsPage'
import { LogOut } from 'lucide-react'
import { api } from '@/lib/api'
import { logout } from '@/lib/auth'
import { useAuthStore } from '@/store/auth'
import { useRemote } from '@/hooks/useRemote'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/DataState'

const path='/api/v1/personal/projects'
type Project={id:string;name:string;next_step:string|null}

export default function MemberHome() {
  const user=useAuthStore(state=>state.user)
  const clearAuth=useAuthStore(state=>state.clearAuth)
  const navigate=useNavigate()
  const [params,setParams]=useSearchParams()
  const showCalculator=params.get('member')==='calculadora'
  const projects=useRemote<Project[]>(showCalculator?null:path)
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)
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
    <nav className="quote-actions" aria-label="Meu espaço"><button className="button button-secondary" aria-current={!showCalculator?"page":undefined} onClick={()=>setParams({})}>Meus projetos</button><button className="button button-secondary" aria-current={showCalculator?"page":undefined} onClick={()=>setParams({member:"calculadora"})}>Calculadora de valores</button></nav>
    {showCalculator?<QuoteModelsPage/>:<section className="module-page">
      <div className="page-heading"><div><p className="eyebrow">Abelha Personal</p><h1>{user?.name?'Olá, '+user.name.split(' ')[0]+'.':'Seu espaço pessoal'}</h1><p className="page-subtitle">Organize seus projetos e deixe claro o próximo passo.</p></div></div>
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
    </section>}
  </main>
}
