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
  activeService?: string | null
  monthlyFee?: number | null
  contractEndDate?: string | null
  financialStatus?: ReceivableStatus | null
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

export type PaymentMethod = 'cash' | 'two_installments' | 'three_installments'
export type ContractStatus = 'active' | 'completed' | 'cancelled'
export type ReceivableStatus = 'open' | 'paid' | 'overdue' | 'cancelled'

export interface Receivable {
  id: string
  organizationId: string
  clientId: string
  contractId: string
  kind: 'setup_installment' | 'monthly_fee'
  installmentNumber: number | null
  description: string
  amount: number
  dueDate: string
  status: ReceivableStatus
  paidAt: string | null
  createdAt: string
  updatedAt: string
  clientName?: string | null
  serviceName?: string
}

export interface ClientContract {
  id: string
  organizationId: string
  clientId: string
  catalogItemId: string | null
  serviceName: string
  serviceDescription: string | null
  serviceSnapshot: Record<string, unknown>
  grossAmount: number
  discountPercent: number
  finalAmount: number
  paymentMethod: PaymentMethod
  monthlyFee: number
  monthlyDueDay: number | null
  developmentStartDate: string
  developmentEndDate: string
  contractEndDate: string
  status: ContractStatus
  notes: string | null
  createdAt: string
  updatedAt: string
  receivables: Receivable[]
}

export interface NewContractInput {
  catalogItemId: string | null
  serviceName: string
  serviceDescription: string | null
  grossAmount: number
  paymentMethod: PaymentMethod
  monthlyFee: number
  monthlyDueDay: number | null
  developmentStartDate: string
  developmentEndDate: string
  contractEndDate: string
  notes?: string | null
}

export interface ClientDetail extends Client {
  contracts: ClientContract[]
}

export interface FinanceSummary {
  receivedMonth: number
  openAmount: number
  overdueAmount: number
  projectedTotal: number
  activeMrr: number
  monthly: Array<{ month: string; received: number; projected: number }>
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
