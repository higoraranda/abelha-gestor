// One standalone workflow. Never calls n8n, backend or another workflow.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const directory=path.resolve(__dirname,'../../docs/integrations/n8n')
const blocks=[
  {key:'leads-capture',prefix:'CAPTURA',title:'🟡 CAPTURA DE LEADS',color:1,x:0,y:1000,width:1800,height:750,description:'Webhook protegido → extração/classificação por regras → candidato pendente. Nada nesta entrada aciona preços ou revisão.'},
  {key:'leads-search',prefix:'BUSCA',title:'🟡 BUSCA DE LEADS',color:1,x:2200,y:1000,width:2500,height:1150,description:'Entrada nicho/cidade/limite → Overpass → staging para revisão. Lote finito de até 50 candidatos, um por vez para preservar retries. Reset desligado; sem ciclo entre automações. Rate limit e deduplicação preservados.'},
  {key:'finance-reminder',prefix:'FINANCEIRO',title:'🔵 LEMBRETES FINANCEIROS',color:5,x:0,y:2200,width:1800,height:650,description:'Tick único de 15 min. Backend verifica horários/fuso, contas, domingo e push. Janela de virada e chaves estáveis são mantidas.'},
  {key:'subscriptions-alerts',prefix:'CONTAS',title:'🔵 CONTAS E ASSINATURAS',color:5,x:2200,y:2200,width:1800,height:650,description:'Auxiliar manual accounts; usa o mesmo tick completo original. O relógio não faz esta chamada de novo. Nunca paga uma conta.'},
  {key:'price-monitor',prefix:'PREÇOS',title:'🟢 MONITORAMENTO DE PREÇOS',color:4,x:0,y:3300,width:2100,height:1400,description:'Automático desligado em Operações do relógio: PRICE_MONITOR_ENABLED=false. Habilitar somente após configurar e validar API/hosts/credencial própria. Diagnóstico manual prices preservado; falhas configuradas continuam visíveis. GET due respeita interval_minutes por produto. Lote finito de até 20 observações, gravação por item com retries/reset desligado. Sem link aguarda configuração; nenhuma cotação fictícia.'},
  {key:'project-sync',prefix:'PROJETOS',title:'🟣 SINCRONIZAÇÃO DE PROJETOS',color:6,x:2400,y:3300,width:1800,height:1400,description:'Entradas independentes Codex e GitHub. Relatório pendente e revisão humana. Raw Body/binário/HMAC preservados; nenhum marco é concluído automaticamente.'},
  {key:'weekly-review',prefix:'REVISÃO',title:'🟣 REVISÃO SEMANAL',color:6,x:0,y:5200,width:1800,height:650,description:'Auxiliar manual weekly-review gera parcial. Revisão final de domingo já pertence ao tick principal: nenhum cron redundante.'},
]
function id(name){return crypto.createHash('sha256').update('abelha-unified-v1:'+name).digest('hex').slice(0,32).replace(/^(........)(....)(....)(....)(............)$/,'$1-$2-$3-$4-$5')}
function make(name,type,typeVersion,parameters,position){return {id:id(name),name,type:'n8n-nodes-base.'+type,typeVersion,position,parameters}}
function js(name,source,position,all=false){return make(name,'code',2,{mode:all?'runOnceForAllItems':'runOnceForEachItem',jsCode:source},position)}
function note(title,description,color,x,y,width,height){return make(title,'stickyNote',1,{content:'# '+title+'\n\n'+description,color,width,height},[x,y])}
function remap(value,names){
  if(Array.isArray(value))return value.map(v=>remap(v,names))
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,remap(v,names)]))
  if(typeof value!=='string')return value
  for(const [oldName,newName]of Object.entries(names)){
    for(const quote of ["'",'"'])value=value.replaceAll('$('+quote+oldName+quote+')','$('+quote+newName+quote+')')
  }
  return value
}
function buildUnified(sources){
  const nodes=[],connections={}
  function add(node){nodes.push(node);return node}
  function edge(from,to,output=0){const outputs=(connections[from]??={main:[]}).main;while(outputs.length<=output)outputs.push([]);outputs[output].push({node:to,type:'main',index:0})}
  add(note('🐝 CONTROLE E CONFIGURAÇÃO','DESATIVADO até credenciais e ensaio. Um relógio executa tick; preços opcionais desligados por PRICE_MONITOR_ENABLED=false em Operações do relógio. Habilitar somente após fonte autorizada configurada e validada. Webhooks não passam pelo roteador. Teste manual: editar operation em Escolher operação. Erros são tratados por bloco, sem subworkflows. Mesmo backend/conta/hosts revisados; não apontar testes de gravação à produção.',1,0,0,4400,750))
  add(make('Relógio compartilhado','scheduleTrigger',1.2,{rule:{interval:[{field:'minutes',minutesInterval:15}]}},[200,300]))
  add(js('Operações do relógio','const PRICE_MONITOR_ENABLED=false;\nconst operations=[{json:{operation:"tick"}}];\nif(PRICE_MONITOR_ENABLED)operations.push({json:{operation:"prices"}});\nreturn operations;',[500,300],true))
  add(make('Teste manual','manualTrigger',1,{},[200,550]))
  add(make('Escolher operação','set',3.4,{assignments:{assignments:[{id:'operation',name:'operation',value:'tick',type:'string'}]},options:{}},[500,550]))
  add(js('Validar operação','if(!["tick","accounts","prices","weekly-review"].includes($json.operation))throw new Error("Operação inválida");return {json:{operation:$json.operation}};',[800,450]))
  const operations=['tick','accounts','prices','weekly-review']
  add(make('Rotear operação','switch',3.2,{mode:'rules',rules:{values:operations.map(operation=>({conditions:{options:{caseSensitive:true,leftValue:'',typeValidation:'strict',version:2},conditions:[{id:operation,leftValue:'={{ $json.operation }}',rightValue:operation,operator:{type:'string',operation:'equals'}}],combinator:'and'},renameOutput:true,outputKey:operation}))},options:{fallbackOutput:'extra',renameFallbackOutput:'operação inválida',allMatchingOutputs:false}},[1100,450]))
  edge('Relógio compartilhado','Operações do relógio');edge('Operações do relógio','Validar operação');edge('Teste manual','Escolher operação');edge('Escolher operação','Validar operação');edge('Validar operação','Rotear operação')

  add(note('🔴 TRATAMENTO DE ERROS','Saídas de erro por bloco descartam mensagem, headers, payload e tokens. Webhook recebe JSON genérico HTTP503. Falha do relógio/manual retorna ok:false e não cancela a outra operação. Para logs de produção, configurar/verificar CODE_ENABLE_STDOUT=true no host. Como a falha foi tratada, status global n8n pode ser concluído: conferir saída e log genérico. Sem Error Workflow externo ou retorno ao roteador.',3,4900,2200,1600,3300))
  const errorBlocks=['CONTROLE',...blocks.map(b=>b.prefix)]
  for(const [index,prefix]of errorBlocks.entries()){
    const webhook=['CAPTURA','BUSCA','PROJETOS'].includes(prefix)
    add(js('Falha · '+prefix,'return {json:{ok:false,block:'+JSON.stringify(prefix)+',webhook:'+webhook+',statusCode:503,error_code:'+JSON.stringify('ABELHA_'+prefix.normalize('NFD').replace(/[\u0300-\u036f]/g,'')+'_FAILED')+'}};',[5100,2500+index*260]))
    edge('Falha · '+prefix,'Erro veio de webhook?')
  }
  add(make('Erro veio de webhook?','if',2,{conditions:{options:{caseSensitive:true,leftValue:'',typeValidation:'strict'},conditions:[{id:'webhook',leftValue:'={{ $json.webhook }}',rightValue:true,operator:{type:'boolean',operation:'true',singleValue:true}}],combinator:'and'},options:{}},[5500,3300]))
  add(make('Responder falha webhook','respondToWebhook',1.1,{respondWith:'json',responseBody:'={{ {ok:false,error:$json.error_code,block:$json.block} }}',options:{responseCode:503,responseHeaders:{entries:[{name:'Cache-Control',value:'no-store'}]}}},[5850,3000]))
  add(js('Registrar falha sem payload','console.log("[Abelha] "+$json.error_code+" bloco="+$json.block);return {json:{ok:false,block:$json.block,error_code:$json.error_code}};',[5850,3600]))
  edge('Erro veio de webhook?','Responder falha webhook',0);edge('Erro veio de webhook?','Registrar falha sem payload',1)
  add(make('Responder webhook','respondToWebhook',1.1,{respondWith:'json',responseBody:'={{ $json }}',options:{responseCode:200,responseHeaders:{entries:[{name:'Cache-Control',value:'no-store'}]}}},[5100,1500]))

  for(const block of blocks){
    const source=sources[block.key];if(!source)throw new Error('Missing source '+block.key)
    add(note(block.title,block.description,block.color,block.x,block.y,block.width,block.height))
    const originals=source.nodes.filter(n=>!['stickyNote','scheduleTrigger','manualTrigger'].some(type=>n.type.endsWith('.'+type)))
    const names=Object.fromEntries(originals.map(n=>[n.name,block.prefix+' · '+n.name]))
    for(const original of originals){
      const copy=JSON.parse(JSON.stringify(original));copy.id=id(names[original.name]);copy.name=names[original.name];copy.parameters=remap(copy.parameters,names);copy.position=[block.x+150+original.position[0],block.y+300+original.position[1]]
      if(block.prefix==='BUSCA'&&original.name==='Confirmar busca')copy.parameters.jsCode='const expected=$("BUSCA · Verificar resultados").first().json.items.length;if($input.all().length!==expected||$input.all().some(item=>item.json.error))throw new Error("Busca incompleta: nem todos os candidatos foram persistidos");\n'+copy.parameters.jsCode
      if(copy.type.endsWith('.webhook')){copy.webhookId=id(copy.name+':webhook');copy.parameters.responseMode='responseNode';delete copy.parameters.responseData}
      if(/\.(code|httpRequest)$/.test(copy.type)){copy.onError='continueErrorOutput';edge(copy.name,'Falha · '+block.prefix,1)}
      add(copy)
    }
    for(const [from,outputs]of Object.entries(source.connections))if(names[from])for(const [index,list]of outputs.main.entries())for(const item of list)if(names[item.node])edge(names[from],names[item.node],index)
    // Only terminal webhook success nodes answer HTTP. Scheduled/manual branches never do.
    if(['CAPTURA','BUSCA','PROJETOS'].includes(block.prefix))for(const original of originals){const name=names[original.name];if(!connections[name]?.main[0]?.length)edge(name,'Responder webhook')}
  }
  // Native finite item loops preserve per-item retry in n8n (the engine checks
  // only the first returned item when deciding whether to retry a failed node).
  function boundedWriter({prefix,loop,writer,input,done,position}){
    add(make(loop,'splitInBatches',3,{batchSize:1,options:{reset:false}},position))
    const collect=prefix==='BUSCA'?'BUSCA · Falha do candidato':'PREÇOS · Falha da observação'
    const failure=js(collect,'console.log("[Abelha] '+prefix+' item não persistido após tentativas");return {json:{error:true,error_code:"ABELHA_ITEM_FAILED"}};',[position[0]+300,position[1]+250]);failure.onError='continueErrorOutput';add(failure)
    connections[input].main[0]=[{node:loop,type:'main',index:0}]
    connections[writer].main[0]=[{node:loop,type:'main',index:0}]
    connections[writer].main[1]=[{node:collect,type:'main',index:0}]
    edge(loop,done,0);edge(loop,writer,1);edge(collect,loop);edge(collect,'Falha · '+prefix,1)
  }
  boundedWriter({prefix:'BUSCA',loop:'BUSCA · Percorrer candidatos',writer:'BUSCA · Guardar candidato público',input:'BUSCA · Separar resultados',done:'BUSCA · Confirmar busca',position:[3450,1600]})
  const gate=js('PREÇOS · Limitar lote de observações','const items=$input.all();if(items.length>20)throw new Error("Lote de observações acima do limite");return items;',[1350,3950],true);gate.onError='continueErrorOutput';add(gate)
  connections['PREÇOS · Validar cotação real'].main[0]=[{node:gate.name,type:'main',index:0}];edge(gate.name,'Falha · PREÇOS',1)
  const summary=js('PREÇOS · Resumir observações','const items=$input.all();const failed=items.filter(item=>item.json.error).length;return [{json:{ok:failed===0,processed:items.length-failed,failed}}];',[1750,4300],true);summary.onError='continueErrorOutput';add(summary);edge(summary.name,'Falha · PREÇOS',1)
  boundedWriter({prefix:'PREÇOS',loop:'PREÇOS · Percorrer observações',writer:'PREÇOS · Registrar observação',input:gate.name,done:summary.name,position:[1100,4300]})
  const destinations=['FINANCEIRO · Executar tick completo','CONTAS · Conferir pendências pelo tick','PREÇOS · Listar monitores devidos','REVISÃO · Gerar revisão parcial']
  destinations.forEach((destination,index)=>edge('Rotear operação',destination,index));edge('Rotear operação','Falha · CONTROLE',4)
  for(const name of ['Operações do relógio','Validar operação']){nodes.find(n=>n.name===name).onError='continueErrorOutput';edge(name,'Falha · CONTROLE',1)}
  return {name:'🐝 ABELHA — AUTOMAÇÕES',active:false,nodes,connections,settings:{...sources['finance-reminder'].settings,timezone:'America/Sao_Paulo',saveDataSuccessExecution:'none',saveDataErrorExecution:'none',saveManualExecutions:false,saveExecutionProgress:false},pinData:{},tags:[]}
}
function localSources(){return Object.fromEntries(blocks.map(b=>[b.key,JSON.parse(fs.readFileSync(path.join(directory,'abelha-'+b.key+'.json'),'utf8'))]))}
if(require.main===module){const flow=buildUnified(localSources());fs.writeFileSync(path.join(directory,'abelha-automations.json'),JSON.stringify(flow,null,2)+'\n');console.log(JSON.stringify({name:flow.name,nodes:flow.nodes.length,active:flow.active,remote_actions:0}))}
module.exports={buildUnified}
