import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveNavigation } from './navigation.ts'
test('old CRM links resolve without a space and invalid Personal views stay Personal',()=>{
  assert.deepEqual(resolveNavigation(null,'finance'),{space:'crm',view:'finance'})
  assert.deepEqual(resolveNavigation('personal','finance'),{space:'personal',view:'personal-overview'})
  assert.deepEqual(resolveNavigation(null,'personal-projects'),{space:'personal',view:'personal-projects'})
})
