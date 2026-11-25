import { useState } from 'react'
import { api } from '@/lib/api'
import { memberModuleList, type MemberModule } from '@/lib/memberModules'
import { useRemote } from '@/hooks/useRemote'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/DataState'

type Member=Record<MemberModule,boolean>&{id:string;email:string;active:boolean;created_at:string|null;last_sign_in_at:string|null;status_changed_at:string|null}
const path='/api/v1/member-modules/members'
const timestamp=(value:string|null)=>value?new Date(value).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'Não registrado'

export default function MemberModuleSettings(){
  const list=useRemote<Member[]>(path)
  const [saving,setSaving]=useState('')
  const [confirm,setConfirm]=useState('')
  const [status,setStatus]=useState('')
  const [error,setError]=useState('')

  async function update(member:Member,resource:string,value:object,message:string){
    if(saving)return
    setSaving(member.id);setStatus('');setError('')
    try{
      await api.patch(path+'/'+member.id+resource,value)
      setConfirm('');setStatus(message)
    }catch(failure){setError(failure instanceof Error?failure.message:'Não foi possível salvar o acesso.')}
    finally{setSaving('')}
  }

  return <section className="crm-panel personal-section">
    <h2>Contas e módulos dos convidados</h2>
    <p>Defina o que cada pessoa pode usar. A desativação encerra o acesso e preserva os dados. Não altera convites de outras pessoas.</p>
    {status&&<p role="status" className="personal-banner">{status}</p>}
    {error&&<p role="alert" className="form-error">{error}</p>}
    {list.loading&&!list.data?<LoadingState/>:list.error?<ErrorState message={list.error} retry={list.reload}/>:!list.data?.length?
      <EmptyState title="Nenhum convite utilizado" text="Os controles aparecem quando um convidado seu termina o cadastro."/>:
      <ul className="quote-proposal-list">{list.data.map(member=><li key={member.id}>
        <div><strong>{member.email}</strong><span className="status-pill">{member.active?'Ativa':'Desativada'}</span>
          <small>Cadastro: {timestamp(member.created_at)} · Último login: {timestamp(member.last_sign_in_at)}{member.status_changed_at&&<> · Acesso alterado: {timestamp(member.status_changed_at)}</>}</small>
          <fieldset className="quote-approval quote-module-flags" disabled={!!saving||list.loading}>
            <legend>Módulos liberados</legend>
            {memberModuleList.map(module=><label key={module.id}><input type="checkbox" checked={member[module.id]} onChange={event=>{
              const enabled=event.target.checked
              void update(member,'',{[module.id]:enabled},module.label+(enabled?' liberado':' bloqueado')+' para '+member.email+'.')
            }}/> {module.label}</label>)}
          </fieldset>
          {confirm===member.id?<div className="quote-actions">
            <span>{member.active?'A pessoa será desconectada; os dados continuam salvos.':'A pessoa poderá entrar com uma nova sessão.'}</span>
            <button type="button" className="button button-primary" disabled={!!saving} onClick={()=>void update(member,'/status',{active:!member.active},member.active?'Conta desativada e sessões antigas revogadas.':'Conta reativada. É necessário entrar novamente.')}>Confirmar {member.active?'desativação':'reativação'}</button>
            <button type="button" className="button button-secondary" onClick={()=>setConfirm('')}>Cancelar</button>
          </div>:<div><button type="button" className="button button-secondary" disabled={!!saving||list.loading} onClick={()=>setConfirm(member.id)}>{member.active?'Desativar conta':'Reativar conta'}</button></div>}
        </div>
      </li>)}</ul>}
  </section>
}
