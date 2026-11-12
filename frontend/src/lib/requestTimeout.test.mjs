import test from 'node:test'
import assert from 'node:assert/strict'
import { requestTimeout } from './requestTimeout.ts'
test('public lead searches can receive the backend timeout response while other API budgets stay bounded',()=>{
  assert.ok(requestTimeout('/api/v1/prospecting/leads/search')>25000)
  assert.ok(requestTimeout('/api/v1/prospecting/leads/search')<60000)
  assert.equal(requestTimeout('/api/v1/clients'),20000)
  assert.equal(requestTimeout('/api/v1/prospecting/leads/candidates'),20000)
})
