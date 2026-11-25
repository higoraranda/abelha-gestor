import { strict as assert } from 'node:assert'
import test from 'node:test'
import { resolveMemberWorkspace } from './memberModules.ts'

test('navigation cannot reveal an admin-disabled module; hiding an allowed view is only personal preference',()=>{
  const profile={projects:true,calculator:false,finance:true,subscriptions:false,hidden:['projects','subscriptions']}
  const result=resolveMemberWorkspace(profile,'calculadora')
  assert.deepEqual(result.allowed.map(m=>m.id),['projects','finance'])
  assert.deepEqual(result.visible.map(m=>m.id),['finance'])
  assert.equal(result.active,'finance')
  assert.equal(resolveMemberWorkspace({...profile,hidden:['projects','finance']},'projetos').active,null)
  assert.equal(resolveMemberWorkspace(null,'projetos').active,null)
})
