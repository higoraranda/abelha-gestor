import test from 'node:test'
import assert from 'node:assert/strict'
import { searchLeads } from './leads'
test('Overpass timeout becomes an explicit retryable error rather than an empty result',async()=>{
  const unavailable:typeof fetch=async()=>{throw new DOMException('timeout','TimeoutError')}
  await assert.rejects(searchLeads('synthetic-timeout','dentists','Campinas',1,unavailable),(error:any)=>error.status===504&&/prazo/.test(error.message))
})
