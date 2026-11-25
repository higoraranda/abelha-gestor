import test from 'node:test'
import assert from 'node:assert/strict'
const {verifyDelivery,obsidianReceipt}=require('../../scripts/verify-delivery.cjs') as {
  verifyDelivery:(a:Record<string,string>,b:Record<string,string>,c:(url:string,init:RequestInit)=>Promise<Response>)=>Promise<Record<string,string>>;
  obsidianReceipt:(a:Record<string,string>)=>string
}

test('release evidence ties GitHub, production alias and active backend to the same repository and SHA',async ()=>{
  const repository='demo/app',sha='a'.repeat(40),vercelProductionAlias='app-demo.vercel.app',vercelProjectId='prj_ab1',renderService='srv_ab1'.replace('_','-'),renderDeploy='dep-z9'
  const input={repository,sha,vercelProductionAlias,vercelProjectId,renderService,renderDeploy,expectedBranch:'main'}
  const env={GITHUB_READ_TOKEN:'gh-test',VERCEL_READ_TOKEN:'ve-test',RENDER_READ_TOKEN:'re-test'}
  let renderSha=sha, target:string|null='production'
  const fake=async(url:string,init:RequestInit)=>{
    assert.equal(init.method,'GET')
    assert.equal(init.redirect,'error')
    const parsed=new URL(url)
    if(parsed.hostname==='api.github.com')return Response.json({sha,html_url:'https://github.com/'+repository+'/commit/'+sha})
    if(parsed.hostname==='api.vercel.com')return Response.json({projectId:vercelProjectId,readyState:'READY',target,meta:{githubOrg:'demo',githubRepo:'app',githubCommitSha:sha,githubCommitRef:'main'}})
    if(parsed.pathname.endsWith('/'+renderService))return Response.json({id:renderService,repo:'https://github.com/'+repository+'.git',branch:'main'})
    assert.ok(parsed.pathname.endsWith('/'+renderDeploy))
    return Response.json({id:renderDeploy,status:'live',commit:{id:renderSha}})
  }
  const receipt=await verifyDelivery(input,env,fake)
  assert.match(obsidianReceipt(receipt),/Não substitui o aceite funcional/)
  assert.doesNotMatch(obsidianReceipt(receipt),/(gh-test|ve-test|re-test)/)
  await assert.rejects(verifyDelivery({...input,expectedBranch:'preview'},env,fake),/branch esperada/)
  target=null
  const preview=await verifyDelivery({...input,expectedTarget:'preview'},env,fake)
  assert.match(obsidianReceipt(preview),/Preview/)
  await assert.rejects(verifyDelivery(input,env,fake),/ambiente esperado/)
  target='production'
  renderSha='b'.repeat(40)
  await assert.rejects(verifyDelivery(input,env,fake),/Render não confirmou/)
})
