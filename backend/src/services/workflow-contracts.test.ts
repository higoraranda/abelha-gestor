import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { createHmac } from 'node:crypto'

const directory='../docs/integrations/n8n/'
function flow(key:string){return JSON.parse(readFileSync(directory+'abelha-'+key+'.json','utf8'))}
function execute(key:string,name:string,json:any,extra:Record<string,unknown>={}) {
  const node=flow(key).nodes.find((n:any)=>n.name===name)
  assert.ok(node,'Exported node missing: '+name)
  return vm.runInNewContext('(function(){'+node.parameters.jsCode+'})()',{$json:json,$input:{item:{json},all:()=>[{json}]},...extra},{timeout:1000})
}

test('capture extracts contact fields, classifies explicitly by rules and preserves a stable source event',()=>{
  const input={body:{event_id:'form-123',name:'Contato sintético',message:'Preciso de um site institucional. Email: teste@example.invalid; WhatsApp: +55 (11) 99999-9999',organization_id:'ignored'}}
  const result=execute('leads-capture','Extrair e classificar',input).json
  assert.equal(result.email,'teste@example.invalid');assert.equal(result.phone,'5511999999999');assert.equal(result.event_id,'form-123');assert.equal(result.source,'form');assert.match(result.classification,/regra.*Site institucional/i);assert.equal(result.organization_id,undefined)
  assert.equal(JSON.stringify(result),JSON.stringify(execute('leads-capture','Extrair e classificar',input).json))
  assert.throws(()=>execute('leads-capture','Extrair e classificar',{body:{name:'Sem evento',message:'Texto'}}),/event_id/)
})

test('search validates public query input and stages only identified OSM results for human review',()=>{
  assert.equal(execute('leads-search','Validar busca',{body:{niche:'dentists',city:'Campinas',limit:2}}).json.limit,2)
  for(const body of [{niche:'arbitrary',city:'A',limit:1},{niche:'dentists',city:'A";out;',limit:1},{niche:'dentists',city:'A',limit:51}])assert.throws(()=>execute('leads-search','Validar busca',{body}))
  const result=execute('leads-search','Separar resultados',{items:[{source:'OpenStreetMap',source_key:'node/123',name:'Teste',niche:'Clínicas',queried_at:'2026-11-12T12:00:00Z'}]} as any)
  assert.equal(result[0].json.source_key,'node/123')
  assert.throws(()=>execute('leads-search','Separar resultados',{items:[{source_key:'../../tick'}]}),/OpenStreetMap/)
})

test('GitHub relay keeps original signed bytes and never creates an authentication token from input',()=>{
  const raw=Buffer.from('{ "repository": {"html_url":"https://github.com/example/project"}, "ação":"revisar" }')
  const signature='sha256='+createHmac('sha256','synthetic-github-secret').update(raw).digest('hex')
  const binary={data:{data:raw.toString('base64'),mimeType:'application/json'}}
  const headers={'x-hub-signature-256':signature,'x-github-event':'push','x-github-delivery':'delivery-123','authorization':'Bearer attacker'}
  const output=execute('project-sync','Conservar assinatura GitHub',{headers},{$input:{item:{json:{headers},binary}}})
  assert.equal(output.binary.data.data,binary.data.data);assert.equal(output.json.signature,signature);assert.equal(output.json.authorization,undefined)
  assert.throws(()=>execute('project-sync','Conservar assinatura GitHub',{headers:{...headers,'x-hub-signature-256':'bad'}}),/assinatura/)
})

test('price polling blocks until configured and rejects fabricated, wrong-currency or redirected product evidence',()=>{
  const prepare=flow('price-monitor').nodes.find((n:any)=>n.name==='Preparar consultas autorizadas');assert.ok(prepare)
  const watch={id:'20000000-0000-4000-8000-000000000001',product_url:'https://shop.example/product'}
  const runPrepare=(code:string,items:any[]=[watch])=>vm.runInNewContext('(function(){'+code+'})()',{$input:{all:()=>items.map(json=>({json}))}},{timeout:1000})
  assert.throws(()=>runPrepare(prepare.parameters.jsCode),/CONFIGURAR/)
  const configured=prepare.parameters.jsCode.replace('https://configure-authorized-price-api.invalid/quote','https://api.example/quote').replace('const PRODUCT_HOSTS = []','const PRODUCT_HOSTS = ["shop.example"]')
  assert.equal(runPrepare(configured)[0].json.product_url,watch.product_url)
  assert.equal(runPrepare(configured,[{...watch,product_url:null},watch]).length,1,'A wish without a product URL must remain awaiting setup without blocking configured monitors')
  const quote={event_id:'observation-123',store:'Loja teste',product_url:watch.product_url,price:100,currency:'BRL',observed_at:new Date().toISOString()}
  const context={$:()=>({item:{json:{watch_id:watch.id,product_url:watch.product_url}}})}
  const provider=flow('price-monitor').nodes.find((n:any)=>n.name==='Consultar API autorizada')
  assert.equal(provider.parameters.options.response.response.fullResponse,true,'HTTP array responses must not silently expand into zero successful items')
  assert.equal(execute('price-monitor','Validar cotação real',{statusCode:200,body:quote},context).json.watch_id,watch.id)
  for(const input of [{...quote,currency:'USD'},{...quote,price:0},{...quote,product_url:'https://evil.example/x'},{...quote,event_id:undefined},[],null])assert.throws(()=>execute('price-monitor','Validar cotação real',{statusCode:200,body:input},context))
  assert.throws(()=>execute('price-monitor','Validar cotação real',{statusCode:503,body:quote},context))
})

test('seven workflows stay inactive with private retention and only one tick scheduler',()=>{
  const keys=['leads-capture','leads-search','finance-reminder','subscriptions-alerts','price-monitor','project-sync','weekly-review']
  const workflows=keys.map(flow)
  for(const workflow of workflows){assert.equal(workflow.active,false);assert.equal(workflow.settings.timezone,'America/Sao_Paulo');assert.equal(workflow.settings.saveManualExecutions,false);assert.equal(workflow.settings.saveDataSuccessExecution,'none');assert.equal(workflow.settings.saveDataErrorExecution,'none')}
  for(const key of ['subscriptions-alerts','weekly-review'])assert.equal(flow(key).nodes.some((n:any)=>n.type.endsWith('.scheduleTrigger')),false)
  assert.equal(flow('finance-reminder').nodes.filter((n:any)=>n.type.endsWith('.scheduleTrigger')).length,1)
  const github=flow('project-sync').nodes.find((n:any)=>n.name==='Encaminhar GitHub assinado');assert.equal(github.parameters.contentType,'binaryData');assert.equal(github.parameters.authentication,'none');assert.equal(github.parameters.inputDataFieldName,'data')
  for(const workflow of workflows)for(const node of workflow.nodes.filter((n:any)=>n.type.endsWith('.webhook'))){if(node.parameters.path.endsWith('/github'))assert.equal(node.parameters.options.rawBody,true);else assert.equal(node.parameters.authentication,'headerAuth')}
})

test('dynamic backend paths are real n8n expressions with a fixed backend origin',()=>{
  const id='20000000-0000-4000-8000-000000000001'
  for(const [key,name,field,suffix]of [['project-sync','Registrar relatório pendente','project_id','/projects/'+id+'/reports'],['price-monitor','Registrar observação','watch_id','/prices/'+id+'/observations']]){
    const node=flow(key).nodes.find((n:any)=>n.name===name),url=node.parameters.url
    assert.match(url,/^=\{\{/,'URL must be evaluated by n8n instead of sending literal braces')
    const resolved=vm.runInNewContext('('+url.slice(3,-2)+')',{$json:{[field]:id}},{timeout:1000})
    assert.equal(resolved,'https://abelha-gestor-api.onrender.com/api/v1/integrations'+suffix)
  }
})
test('project-sync validates the path identifier before building an authenticated request',()=>{
  const flow=JSON.parse(readFileSync('../docs/integrations/n8n/abelha-project-sync.json','utf8'))
  const guard=flow.nodes.find((node:any)=>node.type==='n8n-nodes-base.code')
  assert.ok(guard,'The exported workflow must validate untrusted project identifiers before HTTP')
  const execute=(project_id:string)=>vm.runInNewContext('(function(){'+guard.parameters.jsCode+'})()',{$json:{project_id,report:{schema_version:1}}},{timeout:1000})
  assert.equal(execute('20000000-0000-4000-8000-000000000001').json.project_id,'20000000-0000-4000-8000-000000000001')
  for(const id of ['../../tick','id?other=1','https://evil.example',''])assert.throws(()=>execute(id),/UUID/)
})
