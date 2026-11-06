export type AppView = 'overview' | 'clients' | 'deliveries' | 'pipeline' | 'finance' | 'agenda' | 'inbox' | 'reports'
export const NAVIGATION: { id: AppView; label: string }[] = [
  { id: 'overview', label: 'Visão geral' }, { id: 'clients', label: 'Clientes' },
  { id: 'deliveries', label: 'Entregas' }, { id: 'pipeline', label: 'Pipeline' },
  { id: 'finance', label: 'Financeiro' }, { id: 'agenda', label: 'Agenda' },
  { id: 'inbox', label: 'Conversas' }, { id: 'reports', label: 'Relatórios' },
]
