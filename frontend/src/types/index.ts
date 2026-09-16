export interface User {
  id: string
  name: string | null
  email: string
  organizationId: string
}

export interface Client {
  id: string
  organizationId: string
  companyId: string | null
  company: Pick<Company, 'id' | 'name'> | null
  name: string | null
  email: string | null
  whatsapp: string | null
  notes: string | null
  createdAt: string
}

export interface Company {
  id: string
  organizationId: string
  name: string
  cnpj: string | null
  email: string | null
  phone: string | null
  notes: string | null
  createdAt: string
}

export interface CompanyContact {
  id: string
  companyId: string
  organizationId: string
  name: string
  role: string | null
  email: string | null
  whatsapp: string | null
  createdAt: string
}

export interface Conversation {
  id: string
  organizationId: string
  clientId: string | null
  whatsappChatId: string
  lastMessageAt: string | null
  unreadCount: number
  createdAt: string
  client: (Pick<Client, 'id' | 'name' | 'whatsapp'> & {
    company: Pick<Company, 'id' | 'name'> | null
  }) | null
}

export interface Message {
  id: string
  conversationId: string
  organizationId: string
  whatsappMessageId: string | null
  content: string
  direction: 'in' | 'out'
  createdAt: string
}

export interface ClientConversation {
  id: string
  whatsappChatId: string
  lastMessageAt: string | null
  unreadCount: number
  messages: Message[]
}

export interface ClientDetail extends Client {
  conversation: ClientConversation | null
}

export interface Reminder {
  id: string
  organizationId: string
  title: string
  description: string | null
  dueAt: string
  completed: boolean
  linkedType: 'client' | 'company' | null
  linkedId: string | null
  createdAt: string
}
