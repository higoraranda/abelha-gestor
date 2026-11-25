import { InputError } from './personal'

const stages={
  backlog:'Backlog',planning:'Planejamento',development:'Desenvolvimento',testing:'Testes',
  staging:'Homologação',awaiting_approval:'Aguardando aprovação',production:'Produção',completed:'Concluído',
} as const
export type PipelineStage=keyof typeof stages
export function pipelineStage(value:unknown):PipelineStage {
  if(typeof value!=='string'||!Object.hasOwn(stages,value)) throw new InputError('Etapa do projeto inválida.')
  return value as PipelineStage
}
export function stageLabel(value:PipelineStage|null):string {
  return value===null?'Sem etapa definida':stages[value]
}
export function pipelineMove(value:unknown) {
  if(!value||typeof value!=='object'||Array.isArray(value))throw new InputError('Informe a etapa e a versão atual do cartão.')
  const body=value as Record<string,unknown>
  if(Object.keys(body).length!==2||!Object.hasOwn(body,'stage')||!Object.hasOwn(body,'expected_stage'))throw new InputError('Informe a etapa e a versão atual do cartão.')
  return {stage:pipelineStage(body.stage),expected:body.expected_stage===null?null:pipelineStage(body.expected_stage)}
}
export function pipelineLinks(value:unknown) {
  if(!value||typeof value!=='object'||Array.isArray(value))throw new InputError('Informe os links do projeto.')
  const names=['development','staging','production'] as const
  const entries=Object.entries(value)
  if(entries.length!==3||entries.some(([key])=>!names.some(name=>name===key)))throw new InputError('Informe os campos de desenvolvimento, homologação e produção.')
  return Object.fromEntries(entries.filter(([,link])=>link!=='').map(([key,link])=>{
    try {
      if(typeof link!=='string'||link.length>500)throw new Error()
      const url=new URL(link)
      const sensitive=/^(?:access_token|auth_token|token|api[_-]?key|key|secret|password|signature|sig|x-amz-signature)$/i
      if(url.protocol!=='https:'||url.username||url.password||url.origin==='null'||[...url.searchParams.keys()].some(key=>sensitive.test(key))||/(?:token|secret|password)=/i.test(url.hash))throw new Error()
      return [key,url.href]
    } catch {throw new InputError('Use links HTTPS válidos, sem credenciais, ou deixe o campo vazio.')}
  }))
}
