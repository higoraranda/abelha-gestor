import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { useRemote } from '@/hooks/useRemote'
import ConversationList from '@/components/inbox/ConversationList'
import MessageThread from '@/components/inbox/MessageThread'
import WhatsAppConnection from '@/components/inbox/WhatsAppConnection'
import type { WhatsAppStatus } from '@/components/inbox/WhatsAppConnection'
import type { Conversation, Message } from '@/types'
import { ErrorState } from '@/components/ui/DataState'
import './InboxPage.css'

type ConversationDetail = Conversation & { messages: Message[] }
const base = '/api/v1/conversations'
const emptyMessages: Message[] = []

export default function InboxPage() {
  const [selectedId, setSelectedId] = useState<string|null>(null)
  const [sending, setSending] = useState(false)
  const [sendError,setSendError] = useState<{id:string;message:string}|null>(null)
  const list = useRemote<Conversation[]>(base)
  const detail = useRemote<ConversationDetail>(selectedId ? base+'/'+selectedId : null)
  const connection = useRemote<{status:WhatsAppStatus}>(base+'/whatsapp/status')
  const connected = connection.data?.status==='connected'
  const reloadList = list.reload, reloadDetail = detail.reload

  // The hosted proxy buffers responses, so an SSE connection is not a reliable
  // source of updates there. Refresh only a visible, connected inbox.
  useEffect(()=>{
    if(!connected)return
    function sync() {
      if(document.visibilityState!=='visible')return
      reloadList()
      reloadDetail()
    }
    const timer=window.setInterval(sync,20000)
    document.addEventListener('visibilitychange',sync)
    return ()=>{window.clearInterval(timer);document.removeEventListener('visibilitychange',sync)}
  },[connected,reloadList,reloadDetail])

  function selectConversation(id: string) {
    setSelectedId(id)
    setSendError(null)
    void api.post(base+'/'+id+'/read',{}).catch(()=>{})
  }

  async function send(content: string) {
    if(!selectedId || sending || !connected) return false
    const id=selectedId
    setSending(true)
    setSendError(null)
    try {
      await api.post<Message>('/api/v1/messages',{conversation_id:id,content})
      return true
    } catch (error) {
      setSendError({id,message:error instanceof Error ? error.message : 'Não foi possível confirmar o envio.'})
      return false
    } finally { setSending(false) }
  }

  const conversations=list.data ?? []
  return <div className="inbox-page">
    <WhatsAppConnection status={connection.data?.status} error={connection.error} reload={connection.reload} />
    {list.error ? <ErrorState message={list.error} retry={reloadList}/> :
      <div className={'inbox-shell'+(selectedId?' has-selection':'')}>
        {selectedId&&<button className="inbox-back button button-secondary" onClick={()=>setSelectedId(null)}>Voltar para conversas</button>}
        <ConversationList conversations={conversations} selectedId={selectedId} loading={!list.data&&list.loading} onSelect={selectConversation}/>
        <MessageThread key={selectedId ?? 'no-conversation'}
          conversation={conversations.find(c=>c.id===selectedId) ?? null}
          messages={detail.data?.messages ?? emptyMessages} loading={!detail.data&&detail.loading}
          canSend={connected} sending={sending} onSend={send}
          error={sendError?.id===selectedId ? sendError?.message : detail.error ?? undefined} />
      </div>}
  </div>
}
