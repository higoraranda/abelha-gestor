// Opt-in local stdio server; no retries, discovery, provider privileges or global settings.
const readline = require('node:readline')
const toolName = 'abelha_entregar_relatorio'
const base = '/api/v1/integrations/codex'
const listName = 'abelha_listar_projetos_autorizados'
const versions = ['2025-11-25','2025-06-18']
const definition = {
  name: toolName,
  description: 'Registra um relatório para um projeto autorizado. Não altera marcos, status ou deploys.',
  inputSchema: {
    type: 'object', additionalProperties: false, required: ['report'],
    properties: {
      project:{type:'object',additionalProperties:false,properties:{id:{type:'string'},repository:{type:'string'}},anyOf:[{required:['id']},{required:['repository']}]},
      report:{type:'object',description:'Relatório v1 no formato documentado em development-report.schema.json.'},
    },
  },
  annotations: { readOnlyHint:false, destructiveHint:false, idempotentHint:true, openWorldHint:true },
}

const listDefinition={name:listName,description:'Lista identificadores e repositórios dos projetos autorizados nesta conexão.',inputSchema:{type:'object',additionalProperties:false},annotations:{readOnlyHint:true,openWorldHint:true}}

async function submit(action,args) {
  const url = new URL(process.env.ABELHA_CODEX_ORIGIN || 'invalid')
  const allowLoopback = process.env.ABELHA_CODEX_ALLOW_LOOPBACK==='true' && url.protocol==='http:' && ['127.0.0.1','localhost'].includes(url.hostname)
  const token = process.env.ABELHA_CODEX_REPORT_TOKEN || ''
  if ((!allowLoopback && url.protocol!=='https:') || url.href!==url.origin+'/' || token.length<32) throw Error('Configure a origem e o token dedicado.')
  const list=action===listName
  const {report,project}=args||{}
  if (!list && (!report || typeof report !== 'object' || Array.isArray(report))) throw Error('Informe um relatório no formato v1.')
  const body=list?undefined:JSON.stringify(project?{project,report}:report)
  if (body&&Buffer.byteLength(body)>64000) throw Error('O relatório excede o limite de 64 KB.')
  const response = await fetch(new URL(base+(list?'/projects':'/report'),url), {
    method:list?'GET':'POST', redirect:'error', signal:AbortSignal.timeout(10000),
    headers:{'Content-Type':'application/json',Authorization:'Bearer '+token}, body,
  })
  if (!response.ok) throw Error('Relatório não aceito (HTTP '+response.status+').')
  const result = await response.json()
  if(list){
    if(!Array.isArray(result?.projects))throw Error('O serviço não retornou a lista autorizada.')
    return {projects:result.projects}
  }
  if(typeof result?.report_id!=='string' || result?.status!=='pending_review') throw Error('O serviço não retornou um recibo verificável.')
  return {status:result.status,report_id:result.report_id}
}

const input=readline.createInterface({input:process.stdin,crlfDelay:Infinity})
const write=message=>process.stdout.write(JSON.stringify({jsonrpc:'2.0',...message})+'\n')
const problem=(id,code,message)=>write({id,error:{code,message}})
let initialized=false

input.on('line', line=>{
  void (async ()=>{
    if(Buffer.byteLength(line)>100000) return problem(null,-32600,'Request too large')
    let req
    try {req=JSON.parse(line)} catch {return problem(null,-32700,'Parse error')}
    if(!req || Array.isArray(req) || req.jsonrpc!=='2.0' || typeof req.method!=='string')return problem(null,-32600,'Invalid Request')
    if(req.id===undefined) return
    if(req.method==='ping') return write({id:req.id,result:{}})
    if(req.method==='initialize'){
      initialized=true
      return write({id:req.id,result:{
        protocolVersion:versions.includes(req.params?.protocolVersion) ? req.params.protocolVersion : versions[0],
        capabilities:{tools:{}}, serverInfo:{name:'abelha-projetos',version:'0.1.0'},
      }})
    }
    if(!initialized)return problem(req.id,-32002,'Initialize first')
    if(req.method==='tools/list')return write({id:req.id,result:{tools:[listDefinition,definition]}})
    if(req.method!=='tools/call')return problem(req.id,-32601,'Method not found')
    if(![toolName,listName].includes(req.params?.name))return problem(req.id,-32602,'Unknown tool')
    try{
      const receipt=await submit(req.params.name,req.params.arguments)
      write({id:req.id,result:{content:[{type:'text',text:JSON.stringify(receipt)}]}})
    }catch(error){
      const reason=error instanceof Error && /^(Configure |Informe |O relatório |Relatório não |O serviço )/.test(error.message) ? error.message : 'Não foi possível entregar o relatório.'
      write({id:req.id,result:{isError:true,content:[{type:'text',text:reason}]}})
    }
  })()
})
