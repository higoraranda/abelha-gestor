import test from 'node:test'
import assert from 'node:assert/strict'
import { enableDevicePush } from './devicePush.ts'
test('explicit activation replaces an old VAPID subscription before confirming success',async()=>{
  const key=Uint8Array.from({length:65},(_,i)=>i===0?4:2);let removed=false;let revoked=false;let saved=null
  const old={endpoint:'old',options:{applicationServerKey:new Uint8Array(65).buffer},unsubscribe:async()=>{revoked=true;return true}}
  const fresh={endpoint:'new',options:{applicationServerKey:key.buffer},unsubscribe:async()=>true}
  const manager={getSubscription:async()=>old,subscribe:async options=>{assert.equal(revoked,true);assert.deepEqual(new Uint8Array(options.applicationServerKey),key);return fresh}}
  await enableDevicePush(manager,btoa(String.fromCharCode(...key)),async subscription=>{saved=subscription.endpoint},async subscription=>{assert.equal(subscription.endpoint,'old');removed=true})
  assert.equal(removed,true);assert.equal(saved,'new')
})
test('failed persistence revokes a newly-created subscription instead of reporting activation',async()=>{
  const key=Uint8Array.from({length:65},(_,i)=>i===0?4:2);let revoked=false
  const fresh={endpoint:'new',unsubscribe:async()=>{revoked=true;return true}}
  await assert.rejects(enableDevicePush({getSubscription:async()=>null,subscribe:async()=>fresh},btoa(String.fromCharCode(...key)),async()=>{throw new Error('server unavailable')},async()=>{}),/server unavailable/)
  assert.equal(revoked,true)
})
