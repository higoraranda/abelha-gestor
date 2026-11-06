export type TaskStatus = 'todo' | 'in_progress' | 'done'
export const TASK_LABELS: Record<TaskStatus,string> = {todo:'A fazer',in_progress:'Em andamento',done:'Concluído'}
export type Stage = 'qualification' | 'proposal' | 'negotiation' | 'closing' | 'won' | 'lost'
export const STAGE_LABELS: Record<Stage,string> = {qualification:'Qualificação',proposal:'Proposta',negotiation:'Negociação',closing:'Fechamento',won:'Ganho',lost:'Perdido'}
export const OPEN_STAGES: Stage[] = ['qualification','proposal','negotiation','closing']
export interface DeliveryTask {id:string;contract_id:string;client_id:string;title:string;description:string;due_date:string|null;status:TaskStatus;previous_status:TaskStatus|null;service_name:string;client_name:string|null}
export interface ContractOption {id:string;client_id:string;service_name:string;client_name:string|null;status:string}
export interface Opportunity {id:string;client_id:string;client_name:string|null;title:string;description:string;amount:number;expected_close:string;stage:Stage;probability:number;weighted_value:number;contract_id:string|null}
export interface OpportunityPage {items:Opportunity[];total:number;summary:{open_count:number;open_value:number;weighted_value:number}}
export interface TaskPage {items:DeliveryTask[];total:number}
export interface Notice {key:string;title:string;detail:string;target:string;targetId:string;read:boolean}
export const money = (value:number) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value)
export const civilDate = (value:string|null|undefined) => value ? new Intl.DateTimeFormat('pt-BR',{timeZone:'UTC'}).format(new Date(value.slice(0,10)+'T12:00:00Z')) : 'Sem prazo'
export const today = () => new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
