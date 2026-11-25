// Read-only release check. Never sends a report, changes a card or triggers a build.
const shaPattern=/^[a-f0-9]{40}$/i
const slugPattern=/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/
const receiptVersion=1
function requireMatches(condition,description){if(!condition)throw Error(description)}
function normalizeRepo(url){
  try{
    const remote=new URL(url)
    return remote.origin==='https://github.com' && !remote.username && !remote.password && !remote.search && !remote.hash
      ? remote.pathname.slice(1).replace(/\.git$/,'').replace(/\/$/,'').toLowerCase() : ''
  }catch{return ''}
}
function validate(input){
  const {repository,sha,vercelProjectId,vercelProductionAlias,renderService,renderDeploy,expectedBranch,expectedTarget='production'}=input
  requireMatches(slugPattern.test(repository??'')&&!repository.split('/').some(p=>p==='.'||p==='..'),'Repositório GitHub inválido.')
  requireMatches(shaPattern.test(sha??''),'Informe o SHA completo do Git.')
  requireMatches(['production','preview'].includes(expectedTarget),'Ambiente Vercel esperado inválido.')
  if(expectedBranch!==undefined)requireMatches(/^[a-zA-Z0-9][a-zA-Z0-9_./-]{0,119}$/.test(expectedBranch)&&!expectedBranch.includes('..'),'Branch esperada inválida.')
  requireMatches(/^prj_[a-z0-9]+$/i.test(vercelProjectId??'')&&/^[a-z0-9]+(?:[.-][a-z0-9]+)+\.[a-z]{2,}$/i.test(vercelProductionAlias??''),'Projeto ou alias Vercel inválido.')
  requireMatches(/^srv-[a-z0-9]+$/i.test(renderService??'')&&/^dep-[a-z0-9]+$/i.test(renderDeploy??''),'Serviço ou deploy Render inválido.')
}
async function verifyDelivery(input,env,fetcher=fetch){
  validate(input)
  const {repository,sha,vercelProjectId,vercelProductionAlias,renderService,renderDeploy,expectedBranch,expectedTarget='production'}=input
  const {GITHUB_READ_TOKEN,VERCEL_READ_TOKEN,RENDER_READ_TOKEN}=env
  requireMatches(GITHUB_READ_TOKEN&&VERCEL_READ_TOKEN&&RENDER_READ_TOKEN,'Configure os três tokens de leitura.')
  const get=async(url,token)=> {
    let response
    try {response=await fetcher(url,{method:'GET',redirect:'error',signal:AbortSignal.timeout(9000),headers:{Authorization:'Bearer '+token,'Accept':'application/json'}})}
    catch {throw Error('Não foi possível acessar '+new URL(url).hostname+'.')}
    if(!response.ok)throw Error(new URL(url).hostname+' respondeu HTTP '+response.status+'.')
    return response.json().catch(()=>{throw Error('Resposta inválida de '+new URL(url).hostname+'.')})
  }
  const ownerRepo=repository.split('/').map(encodeURIComponent).join('/')
  const origin='https://api.render.com/v1/services/'+renderService
  const vercelUrl=new URL('https://api.vercel.com/v13/deployments/'+vercelProductionAlias+'?withGitRepoInfo=true')
  if(input.vercelTeamId){
    requireMatches(/^team_[a-z0-9]+$/i.test(input.vercelTeamId),'Time Vercel inválido.')
    vercelUrl.searchParams.set('teamId',input.vercelTeamId)
  }
  const [commit,frontend,service,deploy]=await Promise.all([
    get('https://api.github.com/repos/'+ownerRepo+'/commits/'+sha,GITHUB_READ_TOKEN),
    get(vercelUrl.href,VERCEL_READ_TOKEN),
    get(origin,RENDER_READ_TOKEN),get(origin+'/deploys/'+renderDeploy,RENDER_READ_TOKEN),
  ])
  const repo=repository.toLowerCase()
  const deployedRepo=[frontend.meta?.githubOrg,frontend.meta?.githubRepo].join('/').toLowerCase()
  requireMatches(commit.sha?.toLowerCase()===sha.toLowerCase() && normalizeRepo(commit.html_url?.replace(/\/commit\/[^/]+$/,''))===repo,'GitHub não confirmou o commit no repositório.')
  const actualTarget=frontend.target==='production'?'production':frontend.target===null||frontend.target==='preview'?'preview':null
  requireMatches((frontend.projectId??frontend.project?.id)===vercelProjectId && actualTarget===expectedTarget && frontend.readyState==='READY' &&
    (frontend.gitSource?.sha??frontend.meta?.githubCommitSha)?.toLowerCase()===sha.toLowerCase() && deployedRepo===repo,'O alias Vercel não confirmou este projeto e SHA no ambiente esperado.')
  requireMatches(service.id===renderService && normalizeRepo(service.repo)===repo &&
    deploy.id===renderDeploy && deploy.status==='live' && deploy.commit?.id?.toLowerCase()===sha.toLowerCase(),'O Render não confirmou o mesmo repositório e SHA ativo.')
  const frontendBranch=frontend.gitSource?.ref??frontend.meta?.githubCommitRef??null
  const backendBranch=typeof service.branch==='string'?service.branch:null
  if(expectedBranch!==undefined)requireMatches(frontendBranch===expectedBranch && backendBranch===expectedBranch,'Vercel e Render não corroboram a branch esperada.')
  return {environment:expectedTarget,frontend_branch:frontendBranch,backend_branch:backendBranch,receipt_version:receiptVersion,verified_at:new Date().toISOString(),repository:repo,sha:sha.toLowerCase(),vercel_project:vercelProjectId,vercel_alias:vercelProductionAlias,render_service:renderService,render_deploy:renderDeploy}
}
function obsidianReceipt(result){
  validate({repository:result.repository,sha:result.sha,vercelProjectId:result.vercel_project,vercelProductionAlias:result.vercel_alias,renderService:result.render_service,renderDeploy:result.render_deploy})
  requireMatches(result.receipt_version===receiptVersion&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(result.verified_at),'Recibo inválido.')
  return [
    '### Deploy verificado · '+(result.environment==='preview'?'Preview':'Produção')+' · '+result.verified_at,
    '- GitHub: ['+result.repository+' @ '+result.sha.slice(0,7)+'](https://github.com/'+result.repository+'/commit/'+result.sha+')',
    '- Vercel: ['+result.vercel_alias+'](https://'+result.vercel_alias+')',
    '- Render: [Deploy '+result.render_deploy+'](https://dashboard.render.com/web/'+result.render_service+'/deploys/'+result.render_deploy+')',
    '- Este recibo confirma o mesmo SHA nas três fontes. Não substitui o aceite funcional.',
  ].join('\n')
}
module.exports={verifyDelivery,obsidianReceipt}
if(require.main===module){
  const [repository,sha,vercelProjectId,vercelProductionAlias,renderService,renderDeploy]=process.argv.slice(2).filter(arg=>arg!=='--obsidian')
  verifyDelivery({repository,sha,vercelProjectId,vercelProductionAlias,renderService,renderDeploy,vercelTeamId:process.env.VERCEL_TEAM_ID,expectedBranch:process.env.ABELHA_EXPECTED_BRANCH,expectedTarget:process.env.ABELHA_EXPECTED_TARGET},process.env)
    .then(receipt=>console.log(process.argv.includes('--obsidian')?obsidianReceipt(receipt):JSON.stringify(receipt,null,2)))
    .catch(error=>{console.error(error.message);process.exitCode=1})
}
