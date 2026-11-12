import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import vm from 'node:vm'

const directory='../docs/integrations/n8n/'
const blocks:Record<string,string>={'leads-capture':'CAPTURA','leads-search':'BUSCA','finance-reminder':'FINANCEIRO','subscriptions-alerts':'CONTAS','price-monitor':'PREÇOS','project-sync':'PROJETOS','weekly-review':'REVISÃO'}
function load(){return JSON.parse(readFileSync(directory+'abelha-automations.json','utf8'))}
function get(name:string){const node=load().nodes.find((n:any)=>n.name===name);assert.ok(node,'Missing node '+name);return node}
function run(name:string,json:any={},extra:any={}){return vm.runInNewContext('(function(){'+get(name).parameters.jsCode+'})()',{$json:json,$input:{item:{json},all:()=>[{json}]},console:{log:()=>{}},...extra},{timeout:1000})}
function remap(value:any,prefix:string):any {
  if(Array.isArray(value))return value.map(v=>remap(v,prefix))
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,remap(v,prefix)]))
  if(typeof value==='string')return value.replace(/\$\('Preparar consultas autorizadas'\)/g,"$('"+prefix+" · Preparar consultas autorizadas')")
  return value
}
function reached(start:string){const flow=load(),seen=new Set<string>();function visit(name:string){if(seen.has(name))return;seen.add(name);for(const output of flow.connections[name]?.main||[])for(const edge of output)visit(edge.node)}visit(start);return seen}

test('unified artifact has one clock, no subworkflows, unique nodes and the eight colored areas',()=>{
  const flow=load();assert.equal(flow.name,'🐝 ABELHA — AUTOMAÇÕES');assert.equal(flow.active,false)
  assert.equal(flow.nodes.filter((n:any)=>n.type.endsWith('.scheduleTrigger')).length,1)
  assert.equal(flow.nodes.filter((n:any)=>n.type.endsWith('.manualTrigger')).length,1)
  assert.equal(flow.nodes.some((n:any)=>/executeWorkflow|errorTrigger/.test(n.type)),false)
  assert.equal(new Set(flow.nodes.map((n:any)=>n.id)).size,flow.nodes.length);assert.equal(new Set(flow.nodes.map((n:any)=>n.name)).size,flow.nodes.length)
  for(const label of ['CAPTURA DE LEADS','BUSCA DE LEADS','LEMBRETES FINANCEIROS','CONTAS E ASSINATURAS','MONITORAMENTO DE PREÇOS','SINCRONIZAÇÃO DE PROJETOS','REVISÃO SEMANAL','TRATAMENTO DE ERROS'])assert.ok(flow.nodes.some((n:any)=>n.type.endsWith('.stickyNote')&&n.parameters.content.includes(label)&&Number.isInteger(n.parameters.color)),label)
  assert.equal(flow.settings.timezone,'America/Sao_Paulo');assert.equal(flow.settings.saveDataSuccessExecution,'none');assert.equal(flow.settings.saveDataErrorExecution,'none');assert.equal(flow.settings.saveManualExecutions,false)
  assert.equal(flow.settings.errorWorkflow,undefined)
})

test('each original action preserves endpoint, validation, binary body and credential references',()=>{
  for(const [key,prefix]of Object.entries(blocks)){
    const source=JSON.parse(readFileSync(directory+'abelha-'+key+'.json','utf8'))
    for(const original of source.nodes.filter((n:any)=>!['stickyNote','scheduleTrigger','manualTrigger'].some(t=>n.type.endsWith('.'+t)))){
      const copy=get(prefix+' · '+original.name),expected=remap(original.parameters,prefix)
      if(copy.type.endsWith('.webhook')){expected.responseMode='responseNode';delete expected.responseData}
      if(key==='leads-search'&&original.name==='Confirmar busca'){
        assert.ok(copy.parameters.jsCode.endsWith(original.parameters.jsCode),'Partial-result guard must preserve the original success response')
        expected.jsCode=copy.parameters.jsCode
      }
      assert.deepEqual(copy.parameters,expected,key+'/'+original.name)
      assert.deepEqual(copy.credentials,original.credentials)
      if(/\.(code|httpRequest)$/.test(copy.type))assert.equal(copy.onError,'continueErrorOutput')
    }
  }
})

test('lead webhooks cannot reach prices, tick or weekly actions, with no cycles beyond bounded item iteration',()=>{
  const flow=load()
  for(const start of ['CAPTURA · Receber captura','BUSCA · Receber busca','PROJETOS · Receber relatório Codex','PROJETOS · Receber GitHub assinado']){
    const visited=reached(start)
    assert.equal([...visited].some(n=>/^(PREÇOS|FINANCEIRO|CONTAS|REVISÃO) · /.test(n)),false,start)
    assert.ok(visited.has('Responder webhook'))
  }
  const feedback=new Map([['BUSCA · Guardar candidato público','BUSCA · Percorrer candidatos'],['BUSCA · Falha do candidato','BUSCA · Percorrer candidatos'],['PREÇOS · Registrar observação','PREÇOS · Percorrer observações'],['PREÇOS · Falha da observação','PREÇOS · Percorrer observações']])
  const visiting=new Set(),finished=new Set();function visit(name:string){assert.equal(visiting.has(name),false,'Cycle at '+name);if(finished.has(name))return;visiting.add(name);for(const output of flow.connections[name]?.main||[])for(const edge of output){assert.ok(flow.nodes.some((n:any)=>n.name===edge.node));if(feedback.get(name)!==edge.node)visit(edge.node)}visiting.delete(name);finished.add(name)}
  for(const n of flow.nodes)visit(n.name)
})

test('shared clock dispatches only tick and prices; manual selector routes exactly one allowed operation',()=>{
  const scheduled=run('Operações do relógio').map((item:any)=>item.json.operation)
  assert.equal(JSON.stringify(scheduled),JSON.stringify(['tick','prices']))
  const route=get('Rotear operação'),expected=['tick','accounts','prices','weekly-review']
  assert.equal(JSON.stringify(route.parameters.rules.values.map((v:any)=>v.conditions.conditions[0].rightValue)),JSON.stringify(expected))
  for(const operation of expected)assert.equal(run('Validar operação',{operation}).json.operation,operation)
  assert.throws(()=>run('Validar operação',{operation:'../leads/capture'}))
  const flow=load();assert.equal(flow.connections['Rotear operação'].main.length,5)
  for(let index=0;index<4;index++)assert.equal(flow.connections['Rotear operação'].main[index].length,1)
})

test('branch errors discard untrusted data and use non-2xx webhook response without stopping siblings',()=>{
  const poison={error:{message:'private-body',headers:{authorization:'secret-token'}},webhook:false,block:'attacker'}
  for(const block of ['CAPTURA','BUSCA','FINANCEIRO','CONTAS','PREÇOS','PROJETOS','REVISÃO']){
    const output=run('Falha · '+block,poison).json
    assert.equal(output.ok,false);assert.equal(output.block,block);assert.equal(output.webhook,['CAPTURA','BUSCA','PROJETOS'].includes(block));assert.equal(output.statusCode,503)
    assert.equal(JSON.stringify(output).includes('secret-token'),false);assert.equal(JSON.stringify(output).includes('private-body'),false)
  }
  const flow=load();for(const node of flow.nodes.filter((n:any)=>/\.(code|httpRequest)$/.test(n.type)&&Object.values(blocks).some(prefix=>n.name.startsWith(prefix+' · '))))assert.equal(flow.connections[node.name].main[1].length,1,node.name)
  assert.equal(flow.nodes.some((n:any)=>n.type.endsWith('.stopAndError')),false)
  assert.equal(get('Responder falha webhook').parameters.options.responseCode,503)
  assert.ok(get('Registrar falha sem payload').parameters.jsCode.includes('console.log('))
})

test('consolidation preserves credentials supplied by an authorized Abelha source',()=>{
  const {buildUnified}=require('../../scripts/build-n8n-unified.cjs')
  const sources=Object.fromEntries(Object.keys(blocks).map(key=>[key,JSON.parse(readFileSync(directory+'abelha-'+key+'.json','utf8'))]))
  sources['leads-capture'].nodes.find((n:any)=>n.type.endsWith('.httpRequest')).credentials={httpHeaderAuth:{id:'synthetic-reference',name:'Abelha — Backend'}}
  const artifact=buildUnified(sources)
  assert.equal(artifact.nodes.find((n:any)=>n.name==='CAPTURA · Enviar captura para revisão').credentials.httpHeaderAuth.id,'synthetic-reference')
})

test('a public search cannot return HTTP success when only part of the candidates were staged',()=>{
  const prior={$:()=>({first:()=>({json:{items:[{source_key:'node/1'},{source_key:'node/2'}]}})})}
  assert.throws(()=>run('BUSCA · Confirmar busca',{}, {...prior,$input:{all:()=>[{json:{id:'one'}}]}}),/incompleta/)
  const completed=run('BUSCA · Confirmar busca',{}, {...prior,$input:{all:()=>[{json:{id:'one'}},{json:{id:'two'}}]}})
  assert.equal(completed[0].json.staged,2)
  assert.throws(()=>run('BUSCA · Confirmar busca',{}, {...prior,$input:{all:()=>[{json:{id:'one'}},{json:{error:true}}]}}),/incompleta/)
})

test('batch writes execute one item at a time so every failed item retains the original retry policy',()=>{
  const flow=load()
  for(const [loop,write,done]of [['BUSCA · Percorrer candidatos','BUSCA · Guardar candidato público','BUSCA · Confirmar busca'],['PREÇOS · Percorrer observações','PREÇOS · Registrar observação','PREÇOS · Resumir observações']]){
    const batch=get(loop),writer=get(write)
    assert.equal(batch.type,'n8n-nodes-base.splitInBatches');assert.equal(batch.parameters.batchSize,1);assert.equal(batch.parameters.options.reset,false)
    assert.equal(flow.connections[loop].main[0][0].node,done);assert.equal(flow.connections[loop].main[1][0].node,write)
    const incoming=Object.entries(flow.connections).flatMap(([from,outputs]:any)=>outputs.main.flatMap((items:any[],output:number)=>items.filter(e=>e.node===write).map(()=>({from,output}))))
    assert.deepEqual(incoming,[{from:loop,output:1}]);assert.equal(writer.retryOnFail,true);assert.equal(writer.maxTries,3)
  }
  const result=run('PREÇOS · Resumir observações',{},{$input:{all:()=>[{json:{id:'one'}},{json:{error:true}}]}})
  assert.equal(result[0].json.ok,false);assert.equal(result[0].json.failed,1)
})
