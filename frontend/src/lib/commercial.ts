import { API_BASE_URL } from './apiBase'
import { requestTimeout } from './requestTimeout'

export const commercialPath = '/api/v1/commercial'

export type CommercialStatus = 'draft' | 'published' | 'expired' | 'revoked' | 'refused' | 'accepted' | 'contract_draft' | 'contract_published' | 'formalized'
export const commercialStatusLabels: Record<CommercialStatus, string> = {
  draft: 'Rascunho', published: 'Aguardando decisão', expired: 'Expirada', revoked: 'Revogada',
  refused: 'Recusada', accepted: 'Aceita', contract_draft: 'Contrato em revisão',
  contract_published: 'Aguardando formalização', formalized: 'Formalizada',
}

export type CommercialPresentation = Partial<Record<'title' | 'intro' | 'solution' | 'methodology' | 'nextSteps' | 'brandName', string>>
export type CommercialBrief = Partial<Record<'objective' | 'requirements' | 'features' | 'integrations' | 'deliverables' | 'timeline' | 'dependencies' | 'included' | 'excluded' | 'acceptanceCriteria', string>> & {
  optionalItems?: string[]
  validDays?: number
  payment?: { downPaymentCents?: number; installments?: number; conditions?: string }
}
export type CommercialQuote = {
  lines: { id: string; label: string; period: 'once' | 'monthly'; amountCents: number }[]
  subtotalCents: number
  discountCents: number
  oneTimeCents: number
  monthlyCents: number
}
export type CommercialSnapshot = {
  title: string
  briefing: string
  client_name: string
  quote: CommercialQuote
  terms: string
  commercial: CommercialBrief
  presentation: CommercialPresentation
}
export type CommercialVersion = {
  id: string
  number: number
  status: 'published' | 'accepted' | 'refused' | 'revoked' | 'expired'
  link_state?: 'active' | 'expired' | 'revoked'
  decision?: 'published' | 'accepted' | 'refused'
  draft_revision?: number
  published_at: string
  expires_at: string
  viewed_at: string | null
  sent_at: string | null
  decided_at: string | null
  snapshot: CommercialSnapshot
}
export type CommercialContract = {
  id: string
  title: string
  supplier_name?: string
  clauses: string
  status: 'draft' | 'published' | 'formalized'
  version: number
  published_at: string | null
  acknowledged_at: string | null
  formalized_at?: string | null
  has_evidence?: boolean
}
export type CommercialProposal = {
  id: string
  title: string
  client_name: string
  quote: CommercialQuote
  status: CommercialStatus
  created_at: string
  updated_at: string
  versions: CommercialVersion[]
  contract: CommercialContract | null
  project_id: string | null
}
export type CommercialDetail = CommercialProposal & CommercialSnapshot & {
  revision: number
  events: { type: string; at: string; version_id: string | null; details?: { representativeName?: string; reason?: string } }[]
}

export const commercialMoney = (cents: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)
export const commercialDate = (value: string, time = false) => new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short', ...(time ? { timeStyle: 'short' } : {}), timeZone: 'America/Sao_Paulo',
}).format(new Date(value))

export const proposalLink = (token: string) => new URL('/proposta#' + encodeURIComponent(token), window.location.origin).href

export function printCommercialPage() {
  const { pathname, search, hash } = window.location
  if (!hash && !search) { window.print(); return }
  const state = window.history.state
  const restore = () => {
    if (window.location.pathname === pathname && !window.location.search && !window.location.hash) {
      window.history.replaceState(state, '', pathname + search + hash)
    }
  }
  // Native print headers may include the document URL.
  window.history.replaceState(state, '', pathname)
  window.addEventListener('afterprint', restore, { once: true })
  try { window.print() }
  catch (error) {
    window.removeEventListener('afterprint', restore)
    restore()
    throw error
  }
}

export async function publicCommercial<T>(action: string, body: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
  const path = commercialPath + '/public/' + action
  const deadline = AbortSignal.timeout(requestTimeout(path))
  const response = await fetch(API_BASE_URL + path, {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    referrerPolicy: 'no-referrer',
    headers: { 'Content-Type': 'application/json', 'X-Abelha-Client': 'web' },
    body: JSON.stringify(body),
    signal: signal ? AbortSignal.any([signal, deadline]) : deadline,
  })
  const data = await response.json().catch(() => null)
  if (!response.ok || !data) throw new Error(data?.error || 'Não foi possível acessar a proposta. Tente novamente.')
  return data as T
}

export async function signedContractFile(path: string) {
  const response = await fetch(API_BASE_URL + path, {
    credentials: 'include', cache: 'no-store', referrerPolicy: 'no-referrer',
    signal: AbortSignal.timeout(requestTimeout(path)),
  })
  if (!response.ok) throw new Error('Não foi possível baixar o contrato assinado.')
  const url = URL.createObjectURL(await response.blob())
  const link = document.createElement('a')
  link.href = url
  link.download = 'contrato-assinado.pdf'
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function readContractPDF(file: File) {
  if (file.size > 2 * 1024 * 1024 || file.type !== 'application/pdf') {
    throw new Error('Selecione um PDF de até 2 MB.')
  }
  const bytes = new Uint8Array(await file.arrayBuffer())
  let binary = ''
  for (let index = 0; index < bytes.length; index += 16384) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 16384))
  }
  return btoa(binary)
}
