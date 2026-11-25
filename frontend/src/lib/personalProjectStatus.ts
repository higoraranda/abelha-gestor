export const projectStageLabels = {
  planned: 'Planejado',
  active: 'Em andamento',
  paused: 'Pausado',
  done: 'Concluído',
} as const

type LegacyStatus = keyof typeof projectStageLabels
export function projectStageLabel(status: string): string {
  return Object.hasOwn(projectStageLabels,status) ? projectStageLabels[status as LegacyStatus] : 'Situação desconhecida'
}

export const pipelineLabels = {
  backlog:'Backlog',
  planning:'Planejamento',
  development:'Desenvolvimento',
  testing:'Testes',
  staging:'Homologação',
  awaiting_approval:'Aguardando aprovação',
  production:'Produção',
  completed:'Concluído',
} as const
export type ProjectStage = keyof typeof pipelineLabels
export const pipelineStages = Object.keys(pipelineLabels) as ProjectStage[]
export const pipelineLinkLabels = {development:'Desenvolvimento',staging:'Homologação',production:'Produção'} as const
export type PipelineLink = keyof typeof pipelineLinkLabels
export function projectUpdateSource(kind:string|null|undefined) {
  if(kind==='github')return 'Automática · GitHub'
  if(kind==='decision'||kind==='milestone')return 'Manual'
  if(kind==='report')return 'Relatório · origem não registrada'
  return 'Origem não registrada'
}
