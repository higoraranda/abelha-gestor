// Local and opt-in: generate one dated Markdown receipt, never modify an existing note.
const fs=require('node:fs/promises')
const path=require('node:path')
function field(value,label,limit=300){
  if(typeof value!=='string'||!value.trim()||value.length>limit||/[\p{Cc}\p{Cf}]/u.test(value)||
    /-----BEGIN |(?:Bearer\s+|password\s*[:=]|token\s*[:=]|api[_-]?key\s*[:=])\S+|[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(value))
    throw Error('Campo inválido ou sensível: '+label)
  return value.trim().replace(/[\\`*_{}\[\]<>#!|]/g,'\\$&')
}
function formatReceipt(receipt){
  const {task_id,date,result,commit,reference}=receipt??{}
  if(typeof task_id!=='string'||!/^[a-zA-Z0-9][a-zA-Z0-9_-]{1,79}$/.test(task_id)) throw Error('Identificador de tarefa inválido.')
  if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)throw Error('Data inválida.')
  if(!['PASS','PARTIAL','FAIL','BLOCKED','pending_review'].includes(result))throw Error('Resultado inválido.')
  if(commit!=null&&!/^[a-f0-9]{40}$/i.test(commit))throw Error('SHA inválido.')
  const link=new URL(reference)
  if(link.protocol!=='https:'||link.username||link.password||link.search||link.hash||
      /[()<>\[\]\x00-\x20]/.test(link.href)||!['github.com','chatgpt.com','vercel.com','dashboard.render.com'].includes(link.hostname))
    throw Error('Referência técnica inválida.')
  const summary=(items,label)=> {
    if(!Array.isArray(items)||items.length>20)throw Error('Lista inválida: '+label)
    return items.length?items.map(item=>field(item,label,240)).join('; '):'Nenhum registrado'
  }
  const note=[
    '# Entrega '+task_id,
    '',
    '- Projeto: '+field(receipt.project,'projeto',120),
    '- Etapa: '+field(receipt.stage,'etapa',120),
    '- Data: '+date,
    '- Resultado: '+result,
    '- Commit: '+(commit??'Sem commit'),
    '- Testes: '+summary(receipt.tests,'testes'),
    '- Bloqueios: '+summary(receipt.blockers,'bloqueios'),
    '- Próxima atividade: '+field(receipt.next_step,'próxima atividade'),
    '- Referência: [Relatório técnico]('+link.href+')',
    '',
  ].join('\n')
  return {filename:date+'-'+task_id+'.md', note}
}
async function writeReceipt(directory,receipt){
  const {filename,note}=formatReceipt(receipt)
  return writeImmutableNote(directory,filename,note)
}
async function writeDeliveryReceipt(directory,receipt,delivery){
  const {filename}=formatReceipt(receipt)
  const uuid=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i
  if(!uuid.test(delivery?.report_id??'')||!uuid.test(delivery?.project_id??'')||delivery?.status!=='pending_review')
    throw Error('Comprovante de entrega inválido.')
  const note=[
    '# Comprovante de entrega '+receipt.task_id,'',
    '- Projeto autorizado: '+delivery.project_id.toLowerCase(),
    '- Relatório recebido: '+delivery.report_id.toLowerCase(),
    '- Estado retornado: pending_review',
    '- Commit informado: '+receipt.commit,
    '- Nota técnica: '+filename,
    '- O recebimento não representa aceite humano, conclusão de marco ou publicação.','',
  ].join('\n')
  return writeImmutableNote(directory,filename.replace(/\.md$/,'-comprovante.md'),note)
}
async function writeImmutableNote(directory,filename,note){
  const root=await fs.realpath(directory)
  const dest=path.join(root,filename)
  try {await fs.writeFile(dest,note,{encoding:'utf8',flag:'wx'})}
  catch(error){
    if(error.code!=='EEXIST')throw error
    const file=await fs.lstat(dest)
    if(!file.isFile()||file.isSymbolicLink()||file.size>30000||await fs.readFile(dest,'utf8')!==note)
      throw Error('Já existe uma nota diferente para esta tarefa; não substituída.')
  }
  return {filename}
}
module.exports={formatReceipt,writeReceipt,writeDeliveryReceipt}
if(require.main===module){
  const [, ,input,output]=process.argv
  if(!input){console.error('Uso: node obsidian-task-receipt.cjs recibo.json [pasta-de-notas-existente]');process.exitCode=2}
  else void (async()=>{
    const file=await fs.stat(input)
    if(!file.isFile()||file.size>64000)throw Error('Arquivo inválido.')
    const receipt=JSON.parse(await fs.readFile(input,'utf8'))
    if(output)console.log(JSON.stringify(await writeReceipt(output,receipt)))
    else process.stdout.write(formatReceipt(receipt).note)
  })().catch(error=>{console.error(error.message);process.exitCode=1})
}
