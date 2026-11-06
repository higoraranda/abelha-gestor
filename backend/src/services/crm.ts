export const STAGES = { qualification:20, proposal:40, negotiation:70, closing:90, won:100, lost:0 } as const
export function transitionTask(current: {status:string;previous_status:string|null}, next:string) {
  if (next === 'reopen') next = current.previous_status === 'in_progress' ? 'in_progress' : 'todo'
  if (!['todo','in_progress','done'].includes(next)) throw new Error('Situação de tarefa inválida')
  return { status:next, previous_status: next === 'done' && current.status !== 'done' ? current.status : current.previous_status }
}
export function probability(stage:string):number {
  if (!Object.prototype.hasOwnProperty.call(STAGES,stage)) throw new Error('Etapa comercial inválida')
  return STAGES[stage as keyof typeof STAGES]
}
export function weightedValue(amount:number,stage:string) { return Math.round(Math.round(amount * 100) * probability(stage) / 100) / 100 }
export function businessDay(date=new Date()):string { return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(date) }
export function civilKey(value:unknown):string { return value instanceof Date ? value.toISOString().slice(0,10) : String(value ?? '').slice(0,10) }
export type Notice = {key:string;title:string;detail:string;target:string;targetId:string;read:boolean}
export function notificationItems(sources:{reminders:Record<string,any>[];tasks:Record<string,any>[];receivables:Record<string,any>[]},now:Date,states:Record<string,any>[]=[]):Notice[] {
  const result:Notice[]=[]; const today=businessDay(now); const stateByKey=new Map(states.map(s=>[s.notification_key,s]))
  function add(key:string,title:string,detail:string,target:string,targetId:string) { const state=stateByKey.get(key); if (!state?.dismissed) result.push({key,title,detail,target,targetId,read:Boolean(state?.read_at)}) }
  for (const r of sources.reminders) {
    if (r.completed) continue
    const due=new Date(r.due_at)
    if (r.is_next_action && due < now) add('action:'+r.id+':'+due.toISOString(),r.title,'Próxima ação vencida','clients',r.linked_id || '')
    else if (!r.is_next_action && businessDay(due)===today) add('agenda:'+r.id+':'+today,r.title,'Compromisso de hoje','agenda',r.id)
  }
  for (const t of sources.tasks) if (t.status!=='done' && t.due_date && civilKey(t.due_date)<today) add('task:'+t.id+':'+civilKey(t.due_date),t.title,'Tarefa com prazo vencido','deliveries',t.id)
  for (const r of sources.receivables) if (r.status==='open' && civilKey(r.due_date)<today) add('receivable:'+r.id+':'+civilKey(r.due_date),r.description,'Cobrança em atraso · '+(r.client_name || ''),'finance',r.client_id || '')
  return result
}
export function csvCell(value:unknown):string { let text=value == null ? '' : typeof value==='object' ? JSON.stringify(value) : String(value); if (/^[\s\uFEFF]*[=+@\-\t\r]/.test(text)) text="'"+text; return '"'+text.replace(/"/g,'""')+'"' }
export const EXPORT_FIELDS:Record<string,string[]> = {
  clients:['id','organization_id','company_id','name','email','whatsapp','notes','favorite','created_at'],
  client_contracts:['id','organization_id','client_id','catalog_item_id','service_name','service_description','service_snapshot','gross_amount','discount_percent','final_amount','payment_method','monthly_fee','monthly_due_day','development_start_date','development_end_date','contract_end_date','status','notes','created_at','updated_at'],
  receivables:['id','organization_id','client_id','contract_id','kind','installment_number','description','amount','due_date','status','paid_at','created_at','updated_at'],
  expenses:['id','organization_id','description','category','amount','expense_date','status','paid_at','notes','created_at','updated_at'],
  reminders:['id','organization_id','title','description','due_at','completed','linked_type','linked_id','is_next_action','created_at'],
  client_notes:['id','organization_id','client_id','body','created_at'],
  delivery_tasks:['id','organization_id','contract_id','title','description','due_date','status','previous_status','created_at','updated_at'],
  opportunities:['id','organization_id','client_id','title','description','amount','expected_close','stage','contract_id','created_at','updated_at','closed_at'],
  catalog_items:['id','organization_id','code','name','description','item_type','category','base_price','setup_price','monthly_price','premium_monthly_price','weight','pages_included','extra_page_price','multiplier','per_page','featured','active','included_item_codes','attributes','created_at','updated_at'],
  conversations:['id','organization_id','client_id','whatsapp_chat_id','last_message_at','unread_count','created_at'],
  messages:['id','organization_id','conversation_id','whatsapp_message_id','content','direction','created_at'],
  companies:['id','organization_id','name','cnpj','email','phone','notes','created_at'],
  company_contacts:['id','organization_id','company_id','name','role','email','whatsapp','created_at'],
  notification_states:['organization_id','notification_key','read_at','dismissed'],
}
function cleanJSON(value:any):any {
  if (Array.isArray(value)) return value.map(cleanJSON)
  if (value && typeof value==='object' && !(value instanceof Date)) return Object.fromEntries(Object.entries(value).filter(([key])=>!/password|secret|token|cookie|session|api.?key/i.test(key)).map(([key,item])=>[key,cleanJSON(item)]))
  return value
}
export function exportBusinessRows(table:string,rows:Record<string,any>[],org:string):Record<string,any>[] {
  const fields=EXPORT_FIELDS[table]; if (!fields) throw new Error('Tabela não permitida na exportação')
  return rows.map(row=>{ if (row.organization_id!==org) throw new Error('Registro de outra organização'); return Object.fromEntries(fields.filter(key=>key in row).map(key=>[key,cleanJSON(row[key])])) })
}
