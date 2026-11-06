import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { logout } from '@/lib/auth'
import { useAuthStore } from '@/store/auth'
import { personalAccess } from '@/lib/personalAccess'
import { useRemote } from '@/hooks/useRemote'
import type { Client, Reminder } from '@/types'
import type { Notice } from '@/types/crm'
import AppSidebar from '@/components/layout/AppSidebar'
import { NAVIGATION, type AppView } from '@/lib/navigation'
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
  const requested=params.get('view');const view:AppView=NAVIGATION.some(item=>item.id===requested)?requested as AppView:'overview';const record=params.get('record')||undefined;const contract=params.get('contract')||undefined
  const [panel,setPanel]=useState<'search'|'notifications'|'export'|null>(null);const [showClient,setShowClient]=useState(false)
  const clients=useRemote<Client[]>(view==='agenda'?'/api/v1/clients?limit=100':null);const reminders=useRemote<Reminder[]>(view==='agenda'?'/api/v1/reminders':null);const notices=useRemote<Notice[]>('/api/v1/crm/notifications')
  useEffect(()=>{const timer=window.setInterval(notices.reload,60000);return()=>window.clearInterval(timer)},[notices.reload])
  useEffect(()=>{function search(event:KeyboardEvent){if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'&&!event.isComposing){event.preventDefault();setPanel('search')}}window.addEventListener('keydown',search);return()=>window.removeEventListener('keydown',search)},[])
  function open(next:AppView,id?:string,contractId?:string){const nextParams:Record<string,string>={view:next};if(id)nextParams.record=id;if(contractId)nextParams.contract=contractId;setParams(nextParams)}
  async function signOut(){try{await logout()}finally{clearAuth();navigate('/login',{replace:true})}}
  let content:React.ReactNode
  if(view==='overview')content=<DashboardPage onNewClient={()=>setShowClient(true)} onOpenClients={id=>open('clients',id)} onOpenFinance={()=>open('finance')} onOpenReminders={()=>open('agenda')}/>
  else if(view==='clients')content=<ClientsPage key={record} focusId={record} onOpenTasks={id=>open('deliveries',undefined,id)}/>
  else if(view==='deliveries')content=<TasksPage key={(record||'')+(contract||'')} focusId={record} contractId={contract}/>
  else if(view==='pipeline')content=<PipelinePage key={record} focusId={record}/>
  else if(view==='reports')content=<ReportsPage/>
  else if(view==='finance')content=<FinancePage key={record} focusId={record}/>
  else if(view==='inbox')content=<div className="inbox-workspace crm-panel"><InboxPage/></div>
  else content=(clients.loading&&!clients.data)||(reminders.loading&&!reminders.data)?<LoadingState/>:clients.error||reminders.error?<ErrorState message={clients.error||reminders.error||''} retry={()=>{clients.reload();reminders.reload()}}/>:<AgendaPage key={record} focusId={record} clients={clients.data||[]} reminders={reminders.data||[]} onRemindersChange={reminders.reload}/>
  return <div className="app-shell"><AppSidebar activeView={view} onChange={next=>open(next)} pendingReminders={notices.data?.filter(n=>!n.read).length||0} onLogout={personalAccess?undefined:signOut} onSearch={()=>setPanel('search')} onNotifications={()=>{setPanel('notifications');notices.reload()}} onExport={()=>setPanel('export')} onCreate={()=>setShowClient(true)}/><main className="app-main" id="main"><div className="app-view">{content}</div></main>
    {showClient&&<NewClientModal onClose={()=>setShowClient(false)} onCreate={client=>{setShowClient(false);open('clients',client.id)}}/>}
    {panel==='search'&&<SearchPanel onClose={()=>setPanel(null)} onOpen={open}/>}
    {panel==='notifications'&&<NotificationsPanel notices={notices.data||[]} loading={notices.loading} error={notices.error} reload={notices.reload} onClose={()=>setPanel(null)} onOpen={open}/>}
    {panel==='export'&&<ExportPanel onClose={()=>setPanel(null)}/>}
  </div>
}
