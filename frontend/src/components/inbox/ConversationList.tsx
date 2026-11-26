import type { Conversation } from '@/types'
import { useState } from 'react'

function formatTime(dateStr: string | null): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 1) return 'Ontem'
  if (diffDays < 7)  return date.toLocaleDateString('pt-BR', { weekday: 'short' })
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

interface Props {
  conversations: Conversation[]
  selectedId:    string | null
  loading:       boolean
  onSelect:      (id: string) => void
}

export default function ConversationList({ conversations, selectedId, loading, onSelect }: Props) {
  const [search,setSearch]=useState('')
  const normalize=(value:string)=>value.normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/[^\p{L}\p{N}]/gu,'').toLocaleLowerCase('pt-BR')
  const term=normalize(search)
  const shown=conversations.filter(conv=>normalize([conv.client?.name,conv.client?.whatsapp,conv.whatsappChatId].filter(Boolean).join(' ')).includes(term))
  return (
    <div className="conversation-list">
      <header className="conversation-list-heading"><h2>Conversas</h2></header>
      <label className="conversation-search"><span>Pesquisar conversas carregadas</span><input type="search" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Nome ou telefone" /></label>
      <div className="conversation-list-scroll">
        {loading && <p className="conversation-empty">Carregando...</p>}
        {!loading && conversations.length === 0 && <p className="conversation-empty">Nenhuma conversa ainda</p>}
        {!loading && conversations.length>0 && shown.length===0 && <p className="conversation-empty">Nenhuma conversa corresponde à busca.</p>}
        {shown.map((conv) => {
          const label = conv.client?.name ?? conv.client?.whatsapp ?? conv.whatsappChatId
          return (
            <button key={conv.id} onClick={() => onSelect(conv.id)} className={'conv-item' + (conv.id === selectedId ? ' active' : '')} aria-pressed={conv.id === selectedId}>
              <span className="conversation-avatar">{label.charAt(0).toUpperCase()}</span>
              <span className="conversation-copy">
                <span className="conversation-row"><strong>{label}</strong><time>{formatTime(conv.lastMessageAt)}</time></span>
                <span className="conversation-row"><small>{conv.client?.whatsapp ?? 'Contato não identificado'}</small>{conv.unreadCount > 0 && <span className="conversation-unread">{conv.unreadCount}</span>}</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
