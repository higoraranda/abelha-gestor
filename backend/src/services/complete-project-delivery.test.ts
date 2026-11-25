import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,readdir,readFile,unlink,rmdir} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
const {completeDelivery,canonicalRepo}=require('../../scripts/complete-project-delivery.cjs')

test('confirmed project completion retries only transient errors using the same event and preserves the evidence note',async()=>{
  const notes=await mkdtemp(join(tmpdir(),'abelha-completion-test-'))
  const id='11111111-1111-4111-8111-111111111111'
  const head='a'.repeat(40), repository='https://github.com/demo/example'
  const input={receipt:{task_id:'SYN-18',project:'Abelha sintético',stage:'Teste',date:'2026-11-25',result:'pending_review',commit:head,tests:['Teste sintético'],blockers:[],next_step:'Revisar resultado',reference:'https://github.com/demo/example/actions/runs/18'},report:{schema_version:1,event_id:'SYN-18',commit:head,summary:'Teste local'},project_id:id}
  const bodies:string[]=[]
  const opts={notesDir:notes,identity:()=>({repository,head}),sleep:async()=>{},
    env:{ABELHA_CODEX_ORIGIN:'https://abelha.example',ABELHA_CODEX_REPORT_TOKEN:'synthetic-report-token-32-bytes-minimum'},
    fetcher:async(url:URL,init:RequestInit)=>{
      assert.equal(url.origin,'https://abelha.example')
      assert.equal(init.redirect,'error')
      if(init.method==='GET')return Response.json({projects:[{id,repository},{id:'22222222-2222-4222-8222-222222222222',repository}]})
      bodies.push(String(init.body))
      return bodies.length===1?Response.json({}, {status:503}):Response.json({report_id:'synthetic-receipt',status:'pending_review'},{status:201})
    }}
  try{
    assert.equal(canonicalRepo('git@github.com:DEMO/Example.git'),repository)
    await assert.rejects(completeDelivery({...input,project_id:undefined},opts),/ambíguo/)
    assert.equal(bodies.length,0)
    assert.equal((await readdir(notes)).length,0)
    const result=await completeDelivery(input,opts)
    assert.equal(result.receipt,'synthetic-receipt')
    assert.deepEqual(bodies,[bodies[0],bodies[0]])
    const replay=await completeDelivery(input,opts)
    assert.deepEqual(replay,result)
    assert.match(await readFile(join(notes,result.note),'utf8'),/pending_review/)
    assert.equal((await readdir(notes)).length,1)
    await assert.rejects(completeDelivery(input,{...opts,identity:()=>({repository,head:'b'.repeat(40)})}),/SHA/)
  }finally{for(const name of await readdir(notes))await unlink(join(notes,name));await rmdir(notes)}
})
