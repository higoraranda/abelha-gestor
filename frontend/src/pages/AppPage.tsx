import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { logout } from '@/lib/auth'
import { useAuthStore } from '@/store/auth'
import { personalAccess } from '@/lib/personalAccess'
import { useRemote } from '@/hooks/useRemote'
import type { Client, Reminder } from '@/types'
import type { Notice } from '@/types/crm'
import AppSidebar from '@/components/layout/AppSidebar'
import { resolveNavigation, type AppView, type AppSpace } from '@/lib/navigation'
import { usePwa } from '@/hooks/usePwa'
import type { PersonalNotice } from '@/types/personal'
import { PersonalNotifications, PersonalSettings } from '@/components/personal/PersonalSettings'
import PersonalHome from './personal/PersonalHome'
import AccountInvites from '@/components/personal/AccountInvites'
import PersonalProjects from './personal/PersonalProjects'
import PersonalFinance from './personal/PersonalFinance'
import PersonalSubscriptions from './personal/PersonalSubscriptions'
import PersonalPrices from './personal/PersonalPrices'
import PersonalReview from './personal/PersonalReview'
import LeadsPage from './LeadsPage'
import TemplatesPage from './TemplatesPage'
import QuoteModelsPage from './QuoteModelsPage'
import { api } from '@/lib/api'
import { SearchPanel, NotificationsPanel, ExportPanel } from '@/components/layout/GlobalPanels'
import { ErrorState, LoadingState } from '@/components/ui/DataState'
import NewClientModal from '@/components/clients/NewClientModal'
import DashboardPage from './DashboardPage'
import ClientsPage from './ClientsPage'
import TasksPage from './TasksPage'
import PipelinePage from './PipelinePage'
import ReportsPage from './ReportsPage'
import FinancePage from './FinancePage'
import InboxPage from './InboxPage'
import AgendaPage from './AgendaPage'
export default function AppPage() {
  const navigate=useNavigate();const [params,setParams]=useSearchParams();const clearAuth=useAuthStore(state=>state.clearAuth)
  const {space,view}=resolveNavigation(params.get('space'),params.get('view'));const record=params.get('record')||undefined;const contract=params.get('contract')||undefined
  const pwa=usePwa()
  const isOwner=useAuthStore(state=>state.user?.role==='owner')
  const [panel,setPanel]=useState<'search'|'notifications'|'export'|null>(null);const [showClient,setShowClient]=useState(false)
  const clients=useRemote<Client[]>(view==='agenda'?'/api/v1/clients?limit=100':null);const reminders=useRemote<Reminder[]>(view==='agenda'?'/api/v1/reminders':null);const notices=useRemote<Notice[]>(space==='crm'?'/api/v1/crm/notifications':null)
  const personalNotices=useRemote<PersonalNotice[]>(space==='personal'?'/api/v1/personal/notifications':null)
  const reloadCrmNotices=notices.reload;const reloadPersonalNotices=personalNotices.reload
  useEffect(()=>{const timer=window.setInterval(()=>{if(navigator.onLine){if(space==='crm')reloadCrmNotices();else reloadPersonalNotices()}},60000);return()=>window.clearInterval(timer)},[space,reloadCrmNotices,reloadPersonalNotices])
  useEffect(()=>{function search(event:KeyboardEvent){if(space==='crm'&&(event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'&&!event.isComposing){event.preventDefault();setPanel('search')}}window.addEventListener('keydown',search);return()=>window.removeEventListener('keydown',search)},[space])
  function open(next:AppView,id?:string,contractId?:string){const nextParams:Record<string,string>={view:next};if(next.startsWith('personal-'))nextParams.space='personal';if(id)nextParams.record=id;if(contractId)nextParams.contract=contractId;setParams(nextParams)}
  function changeSpace(next:AppSpace){setPanel(null);open(next==='personal'?'personal-overview':'overview')}
  async function signOut(){try{
    try{if('serviceWorker' in navigator){const registration=await navigator.serviceWorker.getRegistration();const subscription=await registration?.pushManager?.getSubscription();if(subscription){try{await api.delete('/api/v1/personal/push-subscriptions',{endpoint:subscription.endpoint})}catch{/* Browser revocation still prevents further delivery to this subscription. */}await subscription.unsubscribe()}}}catch{/* Push failures must not prevent the existing sign-out flow. */}
    await logout()
  }finally{clearAuth();navigate('/login',{replace:true})}}
  let content:React.ReactNode
  if(view==='personal-overview')content=<PersonalHome onOpen={open}/>
  else if(view==='personal-projects')content=<PersonalProjects key={record} focusId={record} onOpen={id=>open('personal-projects',id)}/>
  else if(view==='personal-finance')content=<PersonalFinance/>
  else if(view==='personal-subscriptions')content=<PersonalSubscriptions/>
  else if(view==='personal-prices')content=<PersonalPrices focusId={record} onClear={()=>open('personal-prices')}/>
  else if(view==='personal-review')content=<PersonalReview onProject={id=>open('personal-projects',id)}/>
  else if(view==='personal-settings')content=<><PersonalSettings pwa={pwa}/>{isOwner&&<AccountInvites/>}</>
  else if(view==='leads')content=<LeadsPage onClient={id=>open('clients',id)}/>
  else if(view==='templates')content=<TemplatesPage/>
  else if(view==='quote-models')content=<QuoteModelsPage key={view}/>
  else if(view==='overview')content=<DashboardPage onNewClient={()=>setShowClient(true)} onOpenClients={id=>open('clients',id)} onOpenFinance={()=>open('finance')} onOpenReminders={()=>open('agenda')}/>
  else if(view==='clients')content=<ClientsPage key={record} focusId={record} onOpenTasks={id=>open('deliveries',undefined,id)}/>
  else if(view==='deliveries')content=<TasksPage key={(record||'')+(contract||'')} focusId={record} contractId={contract}/>
  else if(view==='pipeline')content=<PipelinePage key={record} focusId={record}/>
  else if(view==='reports')content=<ReportsPage/>
  else if(view==='finance')content=<FinancePage key={record} focusId={record}/>
  else if(view==='inbox')content=<div className="inbox-workspace crm-panel"><InboxPage/></div>
  else content=(clients.loading&&!clients.data)||(reminders.loading&&!reminders.data)?<LoadingState/>:clients.error||reminders.error?<ErrorState message={clients.error||reminders.error||''} retry={()=>{clients.reload();reminders.reload()}}/>:<AgendaPage key={record} focusId={record} clients={clients.data||[]} reminders={reminders.data||[]} onRemindersChange={reminders.reload}/>
  return <div className="app-shell"><a className="skip-link" href="#main">Ir para o conteúdo</a><AppSidebar space={space} onSpace={changeSpace} activeView={view} onChange={next=>open(next)} pendingReminders={space==='crm'?notices.data?.filter(n=>!n.read).length||0:personalNotices.data?.filter(n=>!n.read_at).length||0} onLogout={personalAccess?undefined:signOut} onSearch={()=>setPanel('search')} onNotifications={()=>{setPanel('notifications');if(space==='crm')notices.reload();else personalNotices.reload()}} onExport={()=>setPanel('export')} onCreate={()=>setShowClient(true)}/><main className="app-main" id="main"><div className="app-view">{!pwa.online&&<p className="personal-banner" role="status">Você está offline. Reconecte para consultar ou salvar dados. Nenhuma gravação será enviada em segundo plano.</p>}{pwa.waiting&&<div className="personal-banner" role="status"><span>Uma atualização está disponível. Salve seu trabalho antes de recarregar.</span><button className="button button-secondary" onClick={pwa.update}>Atualizar e recarregar</button></div>}{pwa.failure&&<p className="personal-banner" role="status">{pwa.failure}</p>}{content}</div></main>
    {showClient&&<NewClientModal onClose={()=>setShowClient(false)} onCreate={client=>{setShowClient(false);open('clients',client.id)}}/>}
    {panel==='search'&&<SearchPanel onClose={()=>setPanel(null)} onOpen={open}/>}
    {panel==='notifications'&&(space==='personal'?<PersonalNotifications onClose={()=>setPanel(null)} onOpen={url=>navigate(url)}/>:<NotificationsPanel notices={notices.data||[]} loading={notices.loading} error={notices.error} reload={notices.reload} onClose={()=>setPanel(null)} onOpen={open}/>)}
    {panel==='export'&&<ExportPanel onClose={()=>setPanel(null)}/>}
  </div>
}
