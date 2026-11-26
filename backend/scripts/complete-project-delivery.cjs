// Explicit, opt-in completion run. Never call it on a mere conversation-turn Stop event.
const fs=require('node:fs/promises')
const {execFileSync}=require('node:child_process')
const {setTimeout:delay}=require('node:timers/promises')
const {formatReceipt,writeReceipt,writeDeliveryReceipt}=require('./obsidian-task-receipt.cjs')
const base='/api/v1/integrations/codex'

function canonicalRepo(value){
  if(typeof value!=='string')throw Error('Repositório Git inválido.')
  const ssh=/^(?:git@github\.com:|ssh:\/\/git@github\.com\/)([^?#]+)$/i.exec(value.trim())
  let url
  try{url=new URL(ssh?'https://github.com/'+ssh[1]:value.trim())}catch{throw Error('Repositório Git inválido.')}
  if(url.origin!=='https://github.com'||url.username||url.password||url.search||url.hash||
      !/^\/[\w.-]+\/[\w.-]+\/?$/.test(url.pathname)||url.pathname.split('/').some(part=>part==='.'||part==='..'))
    throw Error('Use o origin GitHub canônico do projeto.')
  return url.origin+url.pathname.replace(/\/$/,'').replace(/\.git$/i,'').toLowerCase()
}
function checkoutIdentity(cwd){
  const git=(args)=>execFileSync('git',['-C',cwd,...args],{encoding:'utf8',windowsHide:true,timeout:4000,stdio:['ignore','pipe','pipe']}).trim()
  return {repository:canonicalRepo(git(['remote','get-url','origin'])),head:git(['rev-parse','HEAD'])}
}
function transportConfig(env){
  const uri=new URL(env.ABELHA_CODEX_ORIGIN??'invalid')
  const loopback=env.ABELHA_CODEX_ALLOW_LOOPBACK==='true'&&uri.protocol==='http:'&&['127.0.0.1','localhost'].includes(uri.hostname)
  const token=env.ABELHA_CODEX_REPORT_TOKEN??''
  if((!loopback&&uri.protocol!=='https:')||uri.href!==uri.origin+'/'||Buffer.byteLength(token)<32)throw Error('Origem e credencial do Abelha não configuradas.')
  return {uri,token}
}
async function completeDelivery(input,{cwd=process.cwd(),notesDir,env=process.env,fetcher=fetch,identity=checkoutIdentity,sleep=delay}={}){
  const {receipt,report,project_id}=input??{}
  if(!receipt||!report||typeof report!=='object'||Array.isArray(report)||
      report.schema_version!==1||report.event_id!==receipt.task_id||receipt.result!=='pending_review'||
      !/^[a-f0-9]{40}$/i.test(report.commit??'')||report.commit!==receipt.commit)
    throw Error('Informe relatório v1 e recibo pendente com o mesmo ID e SHA.')
  const {repository,head}=identity(cwd)
  if(head.toLowerCase()!==report.commit.toLowerCase())throw Error('O SHA do relatório não corresponde ao checkout atual.')
  if(project_id!==undefined&&(typeof project_id!=='string'||!/^([a-f0-9]{8})(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(project_id)))throw Error('ID de projeto inválido.')
  if(!notesDir)throw Error('Informe explicitamente a pasta técnica do projeto no Obsidian.')
  formatReceipt(receipt)
  const {uri,token}=transportConfig(env)
  const headers={Authorization:'Bearer '+token,'Content-Type':'application/json'}
  const query=(endpoint,init)=>fetcher(new URL(base+endpoint,uri),{
    credentials:'omit',redirect:'error',signal:AbortSignal.timeout(9000),...init,headers,
  })
  const listed=await query('/projects',{method:'GET'})
  if(!listed.ok)throw Error('Não foi possível consultar os projetos autorizados (HTTP '+listed.status+').')
  const collection=await listed.json()
  if(!Array.isArray(collection?.projects))throw Error('Lista de projetos inválida.')
  const matches=collection.projects.filter(project=>project.repository===repository&&(!project_id||project.id===project_id.toLowerCase()))
  if(matches.length!==1)throw Error('Projeto ausente ou ambíguo. Confirme o vínculo com ID e repositório.')
  const project=matches[0]
  const body=JSON.stringify({project:{id:project.id,repository},report})
  if(Buffer.byteLength(body)>64000)throw Error('Relatório excede 64 KB.')
  const note=await writeReceipt(notesDir,receipt)
  for(let attempt=0;attempt<3;attempt++){
    let response
    try{response=await query('/report',{method:'POST',body})}catch{
      if(attempt===2)throw Error('Comunicação indisponível; a nota foi preservada e a entrega não está confirmada.')
    }
    if(response?.ok){
      const result=await response.json()
      if(result?.status!=='pending_review'||!(/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(result?.report_id??'')))
        throw Error('Resposta sem recibo verificável; não confunda com entrega.')
      let saved
      try{saved=await writeDeliveryReceipt(notesDir,receipt,{...result,project_id:project.id})}
      catch{throw Error('O Abelha recebeu o relatório, mas o comprovante local não foi salvo. Repita a mesma entrega para reconciliar; não gere outro evento.')}
      return {receipt:result.report_id,status:result.status,note:note.filename,delivery_note:saved.filename,project_id:project.id}
    }
    if(response&&(![429,502,503,504].includes(response.status)||attempt===2))
      throw Error('O Abelha não confirmou a entrega (HTTP '+response.status+').')
    await response?.body?.cancel().catch(()=>{})
    await sleep(500*(attempt+1))
  }
  throw Error('O Abelha não confirmou a entrega.')
}
module.exports={canonicalRepo,completeDelivery}
if(require.main===module){
  const [, ,file,notesDir]=process.argv
  void(async()=>{
    if(!file||!notesDir)throw Error('Uso: node complete-project-delivery.cjs entrega.json pasta-tecnica-do-projeto')
    const stat=await fs.stat(file)
    if(!stat.isFile()||stat.size>68000)throw Error('Arquivo de entrega inválido.')
    const result=await completeDelivery(JSON.parse(await fs.readFile(file,'utf8')),{notesDir})
    console.log(JSON.stringify(result))
  })().catch(err=>{console.error(err.message);process.exitCode=1})
}
