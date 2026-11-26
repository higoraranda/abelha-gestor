import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,readdir,readFile,unlink,rmdir,writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
const {completeDelivery,canonicalRepo}=require('../../scripts/complete-project-delivery.cjs')

test('confirmed project completion retries only transient errors using the same event and preserves the evidence note',async()=>{
  const notes=await mkdtemp(join(tmpdir(),'abelha-completion-test-'))
  const id='11111111-1111-4111-8111-111111111111'
  const head='a'.repeat(40), repository='https://github.com/demo/example'
  const input={receipt:{task_id:'SYN-18',project:'Abelha sintético',stage:'Teste',date:'2026-11-25',result:'pending_review',commit:head,tests:['Teste sintético'],blockers:[],next_step:'Revisar resultado',reference:repository},report:{schema_version:1,event_id:'SYN-18',commit:head,summary:'Teste local'},project_id:id}
  const bodies:string[]=[]
  const opts={notesDir:notes,identity:()=>({repository,head}),sleep:async()=>{},
    env:{ABELHA_CODEX_ORIGIN:'https://abelha.example',ABELHA_CODEX_REPORT_TOKEN:'synthetic-report-token-32-bytes-minimum'},
    fetcher:async(url:URL,init:RequestInit)=>{
      assert.equal(url.origin,'https://abelha.example')
      assert.equal(init.redirect,'error')
      if(init.method==='GET')return Response.json({projects:[{id,repository},{id:'22222222-2222-4222-8222-222222222222',repository}]})
      bodies.push(String(init.body))
      return bodies.length===1?Response.json({}, {status:503}):Response.json({report_id:'33333333-3333-4333-8333-333333333333',status:'pending_review'},{status:201})
    }}
  try{
    assert.equal(canonicalRepo('git@github.com:DEMO/Example.git'),repository)
    await assert.rejects(completeDelivery({...input,project_id:undefined},opts),/ambíguo/)
    assert.equal(bodies.length,0)
    assert.equal((await readdir(notes)).length,0)
    const result=await completeDelivery(input,opts)
    assert.equal(result.receipt,'33333333-3333-4333-8333-333333333333')
    assert.deepEqual(bodies,[bodies[0],bodies[0]])
    const replay=await completeDelivery(input,opts)
    assert.deepEqual(replay,result)
    assert.match(await readFile(join(notes,result.note),'utf8'),/pending_review/)
    assert.match(await readFile(join(notes,result.delivery_note),'utf8'),/33333333-3333-4333-8333-333333333333/)
    assert.equal((await readdir(notes)).length,2)
    await assert.rejects(completeDelivery(input,{...opts,identity:()=>({repository,head:'b'.repeat(40)})}),/SHA/)
  }finally{for(const name of await readdir(notes))await unlink(join(notes,name));await rmdir(notes)}
})

test('two synthetic repository bindings keep notes and receipts separate, reject revocation and preserve failed deliveries',async()=>{
  const roots=await Promise.all([mkdtemp(join(tmpdir(),'abelha-project-a-')),mkdtemp(join(tmpdir(),'abelha-project-b-'))])
  const projects=[
    {id:'11111111-1111-4111-8111-111111111111',repository:'https://github.com/demo/project-a'},
    {id:'22222222-2222-4222-8222-222222222222',repository:'https://github.com/demo/project-b'},
  ]
  const reportIds=['33333333-3333-4333-8333-333333333333','44444444-4444-4444-8444-444444444444']
  const head='a'.repeat(40)
  let revoked=false,mode='ok',posts=0
  const fetcher=async(_url:URL,init:RequestInit)=>{
    if(revoked)return Response.json({}, {status:401})
    if(init.method==='GET')return Response.json({projects})
    posts++
    if(mode==='unavailable')return Response.json({}, {status:503})
    if(mode==='unauthorized')return Response.json({}, {status:401})
    if(mode==='invalid')return Response.json({status:'pending_review',report_id:'not-a-receipt'})
    const body=JSON.parse(String(init.body))
    const index=projects.findIndex(project=>project.id===body.project.id&&project.repository===body.project.repository)
    assert.notEqual(index,-1)
    return Response.json({status:'pending_review',report_id:reportIds[index]})
  }
  const run=(index:number,event='SYN-33')=>completeDelivery({
    receipt:{task_id:event,project:'Projeto sintético '+index,stage:'Verificação local',date:'2026-11-25',result:'pending_review',commit:head,tests:['Contrato de transporte local'],blockers:['Aguardando revisão humana'],next_step:'Revisar evidências',reference:projects[index].repository},
    report:{schema_version:1,event_id:event,commit:head,summary:'Ensaio isolado de transporte, sem evidência de CI'},
  },{notesDir:roots[index],identity:()=>({repository:projects[index].repository,head}),sleep:async()=>{},fetcher,
    env:{ABELHA_CODEX_ORIGIN:'https://abelha.example',ABELHA_CODEX_REPORT_TOKEN:'synthetic-report-token-32-bytes-minimum'}})
  try{
    for(const index of [0,1]){
      const result=await run(index)
      assert.equal(result.project_id,projects[index].id)
      assert.equal(result.receipt,reportIds[index])
      const note=await readFile(join(roots[index],result.note),'utf8')
      assert.match(note,/Aguardando revisão humana/)
      assert.match(note,/Revisar evidências/)
      assert.doesNotMatch(await readFile(join(roots[index],result.delivery_note),'utf8'),new RegExp(reportIds[1-index]))
      assert.deepEqual(await run(index),result)
      assert.equal((await readdir(roots[index])).length,2)
    }
    revoked=true
    const before=posts
    await assert.rejects(run(0,'REVOKED'),/HTTP 401/)
    assert.equal(posts,before)
    assert.equal((await readdir(roots[0])).length,2)
    revoked=false
    mode='unauthorized'
    await assert.rejects(run(0,'DENIED'),/HTTP 401/)
    assert.equal(posts,before+1,'Permanent failures must not retry')
    mode='unavailable'
    await assert.rejects(run(0,'OFFLINE'),/HTTP 503/)
    assert.equal(posts,before+4,'Transient failures retry at most three times')
    assert.match(await readFile(join(roots[0],'2026-11-25-OFFLINE.md'),'utf8'),/pending_review/)
    assert.equal((await readdir(roots[0])).includes('2026-11-25-OFFLINE-comprovante.md'),false)
    mode='invalid'
    await assert.rejects(run(0,'INVALID'),/sem recibo verificável/)
    mode='ok'
    await writeFile(join(roots[0],'2026-11-25-RECONCILE-comprovante.md'),'Preservar nota existente')
    await assert.rejects(run(0,'RECONCILE'),/recebeu.*comprovante local.*mesma entrega/)
    assert.equal(await readFile(join(roots[0],'2026-11-25-RECONCILE-comprovante.md'),'utf8'),'Preservar nota existente')
  }finally{
    for(const root of roots){for(const name of await readdir(root))await unlink(join(root,name));await rmdir(root)}
  }
})
