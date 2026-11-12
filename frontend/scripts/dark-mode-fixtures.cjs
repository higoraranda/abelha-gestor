// Dados de apresentação exclusivos do teste visual em loopback. Nunca importados pelo app.
const day = new Intl.DateTimeFormat('en-CA', { timeZone:'America/Sao_Paulo', year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date())
const timestamp = day + 'T14:00:00Z'
const client = { id:'visual-client', name:'Estúdio Aurora · demonstração', email:'aurora@example.invalid', whatsapp:'5511999990000', notes:'Contato sintético para revisão visual.', createdAt:timestamp, activeService:'Website institucional', financialStatus:'open', favorite:true, totalCount:1 }
const charge = { id:'visual-charge', clientId:client.id, clientName:client.name, serviceName:'Website institucional', description:'Etapa de desenvolvimento', kind:'setup_installment', amount:2400, dueDate:day, status:'open' }
const contract = { id:'visual-contract', clientId:client.id, serviceName:'Website institucional', serviceDescription:'Design, desenvolvimento e entrega.', finalAmount:4800, grossAmount:4800, monthlyFee:250, discountPercent:0, paymentMethod:'two_installments', developmentStartDate:day, developmentEndDate:day, contractEndDate:day, status:'active', receivables:[charge] }
const reminder = { id:'visual-reminder', title:'Revisar a proposta com o Estúdio Aurora', description:'Conferir escopo e próximos passos.', dueAt:timestamp, completed:false, linkedType:'client', linkedId:client.id, createdAt:timestamp }
const monthly = [2800,3600,2100,4200,3800,5200].map((received,i) => { const date=new Date(day+'T12:00:00Z');date.setUTCMonth(date.getUTCMonth()-5+i);return {month:date.toISOString().slice(0,7)+'-01',received,projected:received+1100} })
const summary = { receivedMonth:5200, openAmount:7400, overdueAmount:1200, projectedTotal:12600, activeMrr:1250, expensesMonth:850, balanceMonth:4350, monthly }
const financeClient = { clientId:client.id, clientName:client.name, email:client.email, whatsapp:client.whatsapp, serviceNames:contract.serviceName, totalAmount:4800, paidAmount:2400, remainingAmount:2400, overdueAmount:0, activeMrr:250, nextDueDate:day }
const tasks = ['Revisar conteúdo e estrutura','Desenvolver páginas responsivas','Conferir a entrega'].map((title,i)=>({id:'visual-task-'+i,title,description:'Etapa sintética de apresentação.',status:['todo','in_progress','done'][i],contract_id:contract.id,client_id:client.id,service_name:contract.serviceName,client_name:client.name,due_date:day}))
const opportunities = ['qualification','proposal','negotiation','closing'].map((stage,i)=>({id:'visual-deal-'+i,client_id:client.id,client_name:client.name,title:['Website para o estúdio','Identidade digital','Manutenção mensal','Nova experiência mobile'][i],description:'Próximo passo: revisar o escopo com o cliente.',amount:2400+i*800,expected_close:day,stage,probability:[20,40,70,90][i],weighted_value:1200}))
const conversation = {id:'visual-conversation',clientId:client.id,client:{id:client.id,name:client.name,whatsapp:client.whatsapp},whatsappChatId:'synthetic',lastMessageAt:timestamp,unreadCount:2}
const messages = [{id:'visual-message-1',content:'Olá! Podemos revisar a proposta do novo site?',direction:'in',createdAt:timestamp},{id:'visual-message-2',content:'Claro. Separei os próximos passos e o escopo para conversarmos.',direction:'out',createdAt:timestamp}]

function response(path, query) {
  if(path==='/api/v1/clients') return query.get('search') ? [] : [client]
  if(path==='/api/v1/clients/'+client.id) return {...client,contracts:[contract]}
  if(path==='/api/v1/reminders') return [reminder]
  if(path==='/api/v1/crm/overview') return {clients_count:12,new_clients:3,pending:4,received_month:5200}
  if(path==='/api/v1/finance/summary') return summary
  if(path==='/api/v1/finance/clients') return [financeClient]
  if(path==='/api/v1/finance/clients/'+client.id) return {...financeClient,receivables:[charge,{...charge,id:'visual-paid',description:'Primeira parcela',status:'paid',paidAt:timestamp}]}
  if(path==='/api/v1/finance/expenses') return [{id:'visual-expense',description:'Ferramenta de design',category:'tools',amount:89.90,expenseDate:day,status:'paid',notes:'Registro sintético.'}]
  if(path==='/api/v1/crm/contracts') return [{id:contract.id,client_id:client.id,service_name:contract.serviceName,client_name:client.name,status:'active'}]
  if(path==='/api/v1/crm/tasks') return {items:tasks,total:tasks.length}
  if(path==='/api/v1/crm/opportunities') return {items:opportunities,total:opportunities.length,summary:{open_count:4,open_value:14400,weighted_value:7200}}
  if(path==='/api/v1/crm/reports') return {received:5200,open_count:4,open_value:14400,weighted_value:7200,monthly}
  if(path==='/api/v1/crm/relationships/'+client.id) return {notes:[{id:'visual-note',body:'Cliente prefere revisar a proposta antes da próxima reunião.',created_at:timestamp}],nextAction:{id:reminder.id,title:reminder.title,due_at:timestamp,completed:false}}
  if(path==='/api/v1/crm/notifications') return [{key:'visual-notice',title:'Seu próximo compromisso',detail:'Revisar a proposta · hoje',target:'agenda',targetId:reminder.id,read:false}]
  if(path==='/api/v1/crm/search') return [{id:client.id,title:client.name,kind:'Cliente',target:'clients',target_id:client.id}]
  if(path==='/api/v1/catalog') return [{id:'visual-catalog',name:contract.serviceName,description:contract.serviceDescription,itemType:'service',basePrice:4800,monthlyPrice:250,active:true}]
  if(path==='/api/v1/conversations') return [conversation]
  if(path==='/api/v1/conversations/'+conversation.id) return {...conversation,messages}
  return undefined
}
module.exports = { response, client, day }
