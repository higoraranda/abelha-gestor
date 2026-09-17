export interface User {
  id: string
  name: string | null
  email: string
  organizationId: string
}

export interface Client {
  id: string
  organizationId: string
  name: string | null
  email: string | null
  whatsapp: string | null
  notes: string | null
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
  client: Pick<Client, 'id' | 'name' | 'whatsapp'> | null
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
  linkedType: 'client' | null
  linkedId: string | null
  createdAt: string
}

export type CatalogItemType = 'service' | 'package' | 'plan' | 'addon' | 'option'

export interface CatalogItem {
  id: string
  organizationId: string
  code: string | null
  name: string
  description: string | null
  itemType: CatalogItemType
  category: string
  basePrice: number
  setupPrice: number | null
  monthlyPrice: number | null
  premiumMonthlyPrice: number | null
  weight: number | null
  pagesIncluded: number | null
  extraPagePrice: number | null
  multiplier: number | null
  perPage: boolean
  featured: boolean
  active: boolean
  includedItemCodes: string[]
  attributes: Record<string, unknown>
  createdAt: string
  updatedAt: string
}
