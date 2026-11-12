import { useState } from 'react'
import { Bell, Download, Smartphone } from 'lucide-react'
import { api } from '@/lib/api'
import { useRemote } from '@/hooks/useRemote'
import type { PwaState } from '@/hooks/usePwa'
import type { PersonalPreferences, PersonalNotice } from '@/types/personal'
import { ErrorState, LoadingState, EmptyState } from '@/components/ui/DataState'
import Modal from '@/components/ui/Modal'
import { enableDevicePush } from '@/lib/devicePush'

export function PersonalSettings({pwa}:{pwa:PwaState}) {
  const remote=useRemote<PersonalPreferences>('/api/v1/personal/preferences')
  const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [success,setSuccess]=useState('')
  async function togglePush(enable:boolean) {
    if(busy)return;setBusy(true);setError('');setSuccess('')
    try {
      if(!pwa.registration||!('PushManager' in window)||!('Notification' in window))throw new Error('Este navegador não disponibilizou notificações. No iPhone, instale o Abelha na tela inicial e abra pelo ícone.')
      if(enable) {
        if(!remote.data?.push_configured||!remote.data.vapid_public_key)throw new Error('As notificações aguardam configuração do servidor.')
        if(await Notification.requestPermission()!=='granted')throw new Error('Notificações não foram permitidas. Você pode alterar essa preferência nas configurações do navegador.')
        await enableDevicePush(pwa.registration.pushManager,remote.data.vapid_public_key,subscription=>api.post('/api/v1/personal/push-subscriptions',subscription.toJSON()),subscription=>api.delete('/api/v1/personal/push-subscriptions',{endpoint:subscription.endpoint}))
        setSuccess('Notificações ativadas neste dispositivo.')
      } else {
        const subscription=await pwa.registration.pushManager.getSubscription()
        if(subscription) {await api.delete('/api/v1/personal/push-subscriptions',{endpoint:subscription.endpoint});await subscription.unsubscribe()}
        setSuccess('Notificações desativadas neste dispositivo.')
      }
    } catch(error){setError(error instanceof Error?error.message:'Não foi possível configurar notificações.')}finally{setBusy(false)}
  }
  return <div className="module-page"><header className="page-heading"><div><p className="eyebrow">ABELHA PERSONAL</p><h1>Do seu jeito.</h1><p className="page-subtitle">Instalação, lembretes e notificações para acompanhar o que importa.</p></div></header>
    <div className="personal-grid"><section className="crm-panel personal-section"><Smartphone size={24}/><h2>Abelha no celular</h2><p>Abra pelo ícone da tela inicial, com espaço para o que você usa todos os dias.</p>{pwa.canInstall?<button className="button button-primary" onClick={()=>void pwa.install()}><Download size={17}/> Instalar Abelha</button>:<p className="page-subtitle">Android: menu do navegador → Instalar aplicativo. iPhone: Safari → Compartilhar → Adicionar à Tela de Início. Se já instalou, abra pelo ícone.</p>}<p className="page-subtitle">Sem conexão, a estrutura do app fica disponível. Consultar ou salvar dados exige internet.</p></section>
    <section className="crm-panel personal-section"><Bell size={24}/><h2>Notificações discretas</h2><p>O aviso na tela bloqueada não mostra valores, projetos ou dados financeiros.</p><div className="crm-toolbar"><button className="button button-primary" disabled={busy||!remote.data?.push_configured} onClick={()=>void togglePush(true)}>Ativar neste dispositivo</button><button className="button button-secondary" disabled={busy} onClick={()=>void togglePush(false)}>Desativar</button></div>{remote.data&&!remote.data.push_configured&&<p className="page-subtitle">O envio push ainda aguarda configuração. Os avisos internos continuam disponíveis.</p>}{error&&<p className="form-error" role="alert">{error}</p>}{success&&<p className="form-success" role="status">{success}</p>}</section></div>
    {remote.loading?<LoadingState/>:remote.error?<ErrorState message={remote.error} retry={remote.reload}/>:remote.data&&<ReminderPreferences key={JSON.stringify(remote.data.preferences)} preferences={remote.data.preferences}/>}
  </div>
}
function ReminderPreferences({preferences}:{preferences:PersonalPreferences['preferences']}) {
  const [morning,setMorning]=useState(preferences.morning_time?.slice(0,5)||'');const [weekly,setWeekly]=useState(preferences.weekly_time?.slice(0,5)||'')
  const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [success,setSuccess]=useState('')
  async function save(event:React.FormEvent){event.preventDefault();setBusy(true);setError('');setSuccess('');try{await api.patch('/api/v1/personal/preferences',{morning_time:morning||null,weekly_time:weekly||null});setSuccess('Horários salvos. O envio depende da ativação das automações.')}catch(error){setError(error instanceof Error?error.message:'Não foi possível salvar.')}finally{setBusy(false)}}
  return <section className="crm-panel personal-section"><h2>Seu ritmo</h2><p className="page-subtitle">Horários de Brasília. Deixe em branco para desativar. Os agendamentos precisam estar conectados para enviar avisos.</p><form className="crm-form" onSubmit={save}><label>Lembrar da fatura todos os dias<input type="time" value={morning} onChange={e=>setMorning(e.target.value)}/></label><label>Revisão semanal aos domingos<input type="time" value={weekly} onChange={e=>setWeekly(e.target.value)}/></label><button className="button button-primary" disabled={busy}>{busy?'Salvando…':'Salvar horários'}</button>{error&&<p className="form-error" role="alert">{error}</p>}{success&&<p className="form-success" role="status">{success}</p>}</form></section>
}
export function PersonalNotifications({onClose,onOpen}:{onClose:()=>void;onOpen:(url:string)=>void}) {
  const remote=useRemote<PersonalNotice[]>('/api/v1/personal/notifications');const [error,setError]=useState('');const [busy,setBusy]=useState<string|null>(null)
  async function update(id:string,body:unknown){setBusy(id);setError('');try{await api.patch('/api/v1/personal/notifications/'+id,body)}catch(error){setError(error instanceof Error?error.message:'Não foi possível atualizar.')}finally{setBusy(null)}}
  return <Modal title="Avisos do Personal" description="Atualizações da sua organização pessoal, separadas dos avisos comerciais." onClose={onClose}>{error&&<p className="form-error" role="alert">{error}</p>}{remote.loading?<LoadingState/>:remote.error?<ErrorState message={remote.error} retry={remote.reload}/>:!remote.data?.length?<EmptyState title="Tudo acompanhado" text="Os avisos aparecerão aqui quando seus registros precisarem de atenção."/>:remote.data.map(notice=><article className={'notice-row'+(!notice.read_at?' is-unread':'')} key={notice.id}><button className="text-button" onClick={()=>{onOpen(notice.url);onClose()}}><strong>{notice.title}</strong><small>{notice.detail}</small></button><div className="notice-actions"><button disabled={busy===notice.id} onClick={()=>void update(notice.id,{read:!notice.read_at})}>{notice.read_at?'Não lida':'Marcar lida'}</button><button disabled={busy===notice.id} onClick={()=>void update(notice.id,{dismissed:true})}>Descartar</button></div></article>)}</Modal>
}
