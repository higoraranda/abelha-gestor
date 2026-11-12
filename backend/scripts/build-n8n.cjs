// Generates reviewable inactive n8n workflows; never calls a remote service.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const directory=path.resolve(__dirname,'../../docs/integrations/n8n')
const BACKEND='https://abelha-gestor-api.onrender.com'
const settings={executionOrder:'v1',timezone:'America/Sao_Paulo',saveDataSuccessExecution:'none',saveDataErrorExecution:'none',saveManualExecutions:false,saveExecutionProgress:false,executionTimeout:900}
function id(name){return crypto.createHash('sha256').update('abelha-v1:'+name).digest('hex').slice(0,32).replace(/^(........)(....)(....)(....)(............)$/,'$1-$2-$3-$4-$5')}
function node(name,type,typeVersion,parameters,x=0,y=0,other={}){return {id:id(name),name,type:'n8n-nodes-base.'+type,typeVersion,position:[x,y],parameters,...other}}
function code(name,file,x,y,all=false){return node(name,'code',2,{mode:all?'runOnceForAllItems':'runOnceForEachItem',jsCode:fs.readFileSync(path.join(directory,'code',file+'.js'),'utf8')},x,y)}
function inline(name,source,x,y,all=false){return node(name,'code',2,{mode:all?'runOnceForAllItems':'runOnceForEachItem',jsCode:source},x,y)}
function webhook(name,route,x=0,y=0,github=false){return node(name,'webhook',2,{httpMethod:'POST',path:'abelha/v1/'+route,authentication:github?'none':'headerAuth',responseMode:'lastNode',responseData:'firstEntryJson',options:github?{rawBody:true}:{}},x,y,{webhookId:id(route),notes:github?'HMAC obrigatório, validado no backend sobre bytes originais. Não selecionar Header Auth de outro projeto.':'Selecionar credencial Abelha — Entrada Webhook, separada do token do backend.',notesInFlow:true})}
function manual(x=0,y=180){return node('Executar manualmente','manualTrigger',1,{},x,y)}
function schedule(){return node('A cada 15 minutos','scheduleTrigger',1.2,{rule:{interval:[{field:'minutes',minutesInterval:15}]}},0,0)}
function http(name,route,x,y,{method='POST',body='={{ $json }}',retry=true,auth=true,timeout=60000}={}){
  return node(name,'httpRequest',4.2,{method,url:BACKEND+'/api/v1/integrations'+route,authentication:auth?'genericCredentialType':'none',...auth?{genericAuthType:'httpHeaderAuth'}:{},options:{timeout,redirect:{redirect:{followRedirects:false}},response:{response:{responseFormat:'json'}}},...method==='POST'?{sendBody:true,specifyBody:'json',jsonBody:body}:{}},x,y,{retryOnFail:retry,maxTries:3,waitBetweenTries:2000,onError:'stopWorkflow',notes:auth?'Selecionar Abelha — Backend (Header Auth). Backend precisa da migration e desta versão publicada antes de testar.':'Não enviar credencial do backend a este nó.',notesInFlow:true})
}
function save(key,title,description,nodes,edges){
  for(const n of nodes)if(n.name==='Registrar observação')n.parameters.url='={{ "'+BACKEND+'/api/v1/integrations/prices/" + encodeURIComponent($json.watch_id) + "/observations" }}'
  const note=node('Configuração e limites','stickyNote',1,{content:'# '+title+'\n'+description+'\n\nDESATIVADO: configurar credenciais e testar com dados sintéticos antes de ativar. URL canônica do backend preparada; se usar homologação, alterar todos os nós HTTP de backend. Não testar gravações em produção. Retenção de payloads desligada; erros interrompem o fluxo, sem continueOnFail. Não duplicar a instância ou o banco.',height:330,width:900},0,-420)
  const connections={}
  for(const [from,to,index=0]of edges){const outputs=(connections[from]??={main:[]}).main;while(outputs.length<=index)outputs.push([]);outputs[index].push({node:to,type:'main',index:0})}
  const flow={name:'Abelha — '+title,active:false,nodes:[note,...nodes],connections,settings:{...settings},pinData:{},tags:[]}
  fs.writeFileSync(path.join(directory,'abelha-'+key+'.json'),JSON.stringify(flow,null,2)+'\n')
}
save('leads-capture','Captura de Leads','Webhook autenticado de email/formulário. event_id/message_id estável, name e message/summary/text obrigatórios. Classificação por regras, sem IA ou custo. Backend deduplica e aguarda revisão humana; nunca cria contato automaticamente.',[
  webhook('Receber captura','leads/capture'),code('Extrair e classificar','capture',260,0),http('Enviar captura para revisão','/leads/capture',520,0),inline('Confirmar captura','return {json:{received:true,id:$json.id,reused:!!$json.reused,review_required:true}};',780,0),
],[['Receber captura','Extrair e classificar'],['Extrair e classificar','Enviar captura para revisão'],['Enviar captura para revisão','Confirmar captura']])

save('leads-search','Busca de Leads','Webhook autenticado: niche (dentists/clinics/restaurants/beauty/gyms/shops), city, limit 1–50. Consulta Overpass e normalização já pertencem ao backend; não duplicar consulta. Intervalo mínimo de um minuto por conta. Resultados são candidatos OpenStreetMap com atribuição para revisão.',[
  webhook('Receber busca','leads/search'),code('Validar busca','search-input',240,0),http('Consultar Overpass pelo backend','/leads/search',480,0,{retry:false,timeout:35000}),
  inline('Verificar resultados','if(!Array.isArray($json.items))throw new Error("Resposta pública inválida");return {json:{...$json,has_results:$json.items.length>0}};',720,0),
  node('Há resultados?','if',2,{conditions:{options:{caseSensitive:true,leftValue:'',typeValidation:'strict'},conditions:[{id:'has-results',leftValue:'={{ $json.has_results }}',rightValue:true,operator:{type:'boolean',operation:'true',singleValue:true}}],combinator:'and'},options:{}},960,0),
  code('Separar resultados','search-results',1200,-80,true),http('Guardar candidato público','/leads/stage',1440,-80),inline('Confirmar busca','return [{json:{received:true,staged:$input.all().length,review_required:true,attribution:"© OpenStreetMap contributors — ODbL"}}];',1680,-80,true),
  inline('Busca sem resultados','return {json:{received:true,staged:0,review_required:true,attribution:"© OpenStreetMap contributors — ODbL"}};',1200,140),
],[['Receber busca','Validar busca'],['Validar busca','Consultar Overpass pelo backend'],['Consultar Overpass pelo backend','Verificar resultados'],['Verificar resultados','Há resultados?'],['Há resultados?','Separar resultados',0],['Há resultados?','Busca sem resultados',1],['Separar resultados','Guardar candidato público'],['Guardar candidato público','Confirmar busca']])

save('finance-reminder','Lembretes Financeiros','ÚNICO tick agendado do Abelha: fatura, contas, revisão de domingo e fila push. Configurar horários no Personal; VAPID no backend. Janela de 30 minutos após a virada. Repetições têm chaves estáveis no banco. Não ativar agendadores auxiliares duplicados.',[
  schedule(),manual(),http('Executar tick completo','/tick',300,0,{body:'={{ {} }}',timeout:120000}),
],[['A cada 15 minutos','Executar tick completo'],['Executar manualmente','Executar tick completo']])
save('subscriptions-alerts','Contas e Assinaturas','AUXILIAR MANUAL, sem Schedule Trigger: o tick principal já verifica vencimentos e gera avisos sem duplicidade. Executar manualmente apenas para diagnóstico autorizado. Não paga contas nem avança vencimento automaticamente.',[
  manual(0,0),http('Conferir pendências pelo tick','/tick',300,0,{body:'={{ {} }}',timeout:120000}),
],[['Executar manualmente','Conferir pendências pelo tick']])
save('weekly-review','Revisão Semanal','AUXILIAR MANUAL: gera fotografia parcial desta semana com registros existentes. Revisão final de domingo pertence ao tick principal. Não conectar IA nem afirmar conclusão de marcos automaticamente.',[
  manual(0,0),http('Gerar revisão parcial','/weekly-review',300,0,{body:'={{ {} }}'}),
],[['Executar manualmente','Gerar revisão parcial']])

const provider=http('Consultar API autorizada','',540,0,{auth:true,retry:false,body:'={{ {monitor_id:$json.watch_id,product_url:$json.product_url} }}'})
provider.parameters.url='={{ $json.provider_url }}'
provider.parameters.options.batching={batch:{batchSize:1,batchInterval:1000}}
provider.parameters.options.response.response.fullResponse=true
provider.notes='Selecionar Abelha — API de Preços (credencial própria da fonte). Nunca selecionar Abelha — Backend. Contrato de saída em docs/CLOUDFY-N8N.md; sem scraping e sem redirects.'
save('price-monitor','Monitor de Preços','PREPARADO para API HTTPS autorizada. Configurar PROVIDER_URL/PRODUCT_HOSTS no nó de preparação e selecionar credencial própria do provedor. API deve devolver event_id estável, store, product_url idêntica (mesma variação), price numérico BRL, currency:BRL, observed_at real. Código bloqueia sem configuração; nenhuma cotação é fabricada. Backend guarda histórico/notifica queda; push sai no tick.',[
  schedule(),manual(),http('Listar monitores devidos','/prices/due',260,0,{method:'GET',retry:false}),code('Preparar consultas autorizadas','price-requests',500,0,true),{...provider,position:[760,0]},code('Validar cotação real','price-observation',1020,0),http('Registrar observação','/prices/{{ encodeURIComponent($json.watch_id) }}/observations',1280,0,{body:'={{ {event_id:$json.event_id,store:$json.store,product_url:$json.product_url,price:$json.price,observed_at:$json.observed_at} }}'}),
],[['A cada 15 minutos','Listar monitores devidos'],['Executar manualmente','Listar monitores devidos'],['Listar monitores devidos','Preparar consultas autorizadas'],['Preparar consultas autorizadas','Consultar API autorizada'],['Consultar API autorizada','Validar cotação real'],['Validar cotação real','Registrar observação']])

const report=http('Registrar relatório pendente','/projects',520,0,{body:'={{ $json.report }}'})
report.parameters.url='={{ "'+BACKEND+'/api/v1/integrations/projects/" + encodeURIComponent($json.project_id) + "/reports" }}'
const github=http('Encaminhar GitHub assinado','/github',520,280,{auth:false})
delete github.parameters.specifyBody;delete github.parameters.jsonBody
Object.assign(github.parameters,{sendBody:true,contentType:'binaryData',inputDataFieldName:'data',sendHeaders:true,headerParameters:{parameters:[{name:'X-Hub-Signature-256',value:'={{ $json.signature }}'},{name:'X-GitHub-Event',value:'={{ $json.event }}'},{name:'X-GitHub-Delivery',value:'={{ $json.delivery }}'}]}})
save('project-sync','Sincronização de Projetos','Dois caminhos: relatório Codex autenticado com project_id UUID/report v1; GitHub recebe corpo binário original e encaminha HMAC/delivery/event ao backend. Secret HMAC fica apenas no GitHub/backend. O caminho GitHub não usa Header Auth, pois o GitHub não o envia; backend rejeita assinatura inválida antes de persistir. SHA/testes/etapas são evidências pendentes; conclusão exige ação humana.',[
  webhook('Receber relatório Codex','projects/report'),code('Validar projeto e relatório','project-report',260,0),report,inline('Confirmar relatório','return {json:{received:true,id:$json.id,review_required:true,completed_milestones:0}};',780,0),
  webhook('Receber GitHub assinado','projects/github',0,280,true),code('Conservar assinatura GitHub','github-relay',260,280),github,inline('Confirmar evento GitHub','return {json:{received:!!$json.received,matched_projects:$json.matched_projects||0,recorded_updates:$json.recorded_updates||0,completed_milestones:0}};',780,280),
],[['Receber relatório Codex','Validar projeto e relatório'],['Validar projeto e relatório','Registrar relatório pendente'],['Registrar relatório pendente','Confirmar relatório'],['Receber GitHub assinado','Conservar assinatura GitHub'],['Conservar assinatura GitHub','Encaminhar GitHub assinado'],['Encaminhar GitHub assinado','Confirmar evento GitHub']])
console.log('7 workflows desativados gerados; nenhum acesso remoto.')
