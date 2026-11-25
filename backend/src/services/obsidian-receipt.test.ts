import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp,readFile,unlink,rmdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const { formatReceipt,writeReceipt }=require('../../scripts/obsidian-task-receipt.cjs')

test('isolated Obsidian receipt creates once, reuses exact evidence and does not overwrite notes',async()=>{
  const vault=await mkdtemp(join(tmpdir(),'abelha-test-vault-'))
  const receipt={task_id:'SYN-01',project:'Abelha sintético',stage:'Testes',date:'2026-11-25',
    result:'pending_review',commit:null,tests:['Teste local'],blockers:[],next_step:'Revisar aceite',
    reference:'https://github.com/example/example/actions/runs/123'}
  const {filename}=formatReceipt(receipt)
  try {
    assert.deepEqual(await writeReceipt(vault,receipt),{filename})
    assert.deepEqual(await writeReceipt(vault,receipt),{filename})
    await assert.rejects(writeReceipt(vault,{...receipt,result:'PASS'}),/Já existe uma nota diferente/)
    assert.match(await readFile(join(vault,filename),'utf8'),/pending_review/)
    assert.throws(()=>formatReceipt({...receipt,task_id:'../escape'}))
    assert.throws(()=>formatReceipt({...receipt,tests:['token=synthetic-value']}),/Campo inválido/)
    assert.throws(()=>formatReceipt({...receipt,reference:'https://github.com/example?token=synthetic-value'}))
  }finally {await unlink(join(vault,filename)).catch(()=>{});await rmdir(vault)}
})
