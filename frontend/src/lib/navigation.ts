export type AppSpace = 'crm' | 'personal'
export type PersonalView = 'personal-overview' | 'personal-projects' | 'personal-finance' | 'personal-subscriptions' | 'personal-prices' | 'personal-review' | 'personal-settings'
export type AppView = 'overview' | 'clients' | 'deliveries' | 'pipeline' | 'finance' | 'agenda' | 'inbox' | 'reports' | 'leads' | 'templates' | 'quote-models' | PersonalView
export const NAVIGATION: { id: AppView; label: string }[] = [
  { id: 'overview', label: 'Visão geral' }, { id: 'clients', label: 'Clientes' },
  { id: 'deliveries', label: 'Entregas' }, { id: 'pipeline', label: 'Pipeline' },
  { id: 'finance', label: 'Financeiro' }, { id: 'agenda', label: 'Agenda' },
  { id: 'inbox', label: 'Conversas' }, { id: 'reports', label: 'Relatórios' },
  { id: 'leads', label: 'Buscar leads' }, { id: 'templates', label: 'Templates' }, { id:'quote-models',label:'Calculadora de valores' },
]
export const PERSONAL_NAVIGATION: {id: PersonalView;label:string}[] = [
  {id:'personal-overview',label:'Meu dia'},{id:'personal-projects',label:'Projetos'},
  {id:'personal-finance',label:'Faturas e metas'},{id:'personal-subscriptions',label:'Contas'},
  {id:'personal-prices',label:'Preços'},{id:'personal-review',label:'Revisão semanal'},
  {id:'personal-settings',label:'Preferências'},
]
export function resolveNavigation(space:string|null,requested:string|null):{space:AppSpace;view:AppView} {
  if(space==='personal'||requested?.startsWith('personal-'))return {space:'personal',view:PERSONAL_NAVIGATION.some(item=>item.id===requested)?requested as PersonalView:'personal-overview'}
  return {space:'crm',view:NAVIGATION.some(item=>item.id===requested)?requested as AppView:'overview'}
}
