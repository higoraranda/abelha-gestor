import test from 'node:test'
import assert from 'node:assert/strict'
import { searchLeads } from './leads'
test('Overpass timeout becomes an explicit retryable error rather than an empty result',async t=>{
  t.mock.method(console,'warn',()=>{})
  const unavailable:typeof fetch=async()=>{throw new DOMException('timeout','TimeoutError')}
  await assert.rejects(searchLeads('synthetic-timeout','dentists','Campinas',1,unavailable),(error:any)=>error.status===504&&/prazo/.test(error.message))
})

const primary='https://overpass-api.de/api/interpreter'
const fallback='https://overpass.private.coffee/api/interpreter'
const validResponse=()=>Response.json({elements:[{type:'node',id:123,tags:{name:'Clínica de teste','contact:phone':'+55 19 0000-0000'}}]})

for(const failure of ['network','busy','timeout','invalid-json','incomplete'] as const) {
  test(`Overpass ${failure} on primary recovers through another instance`,async t=>{
    t.mock.method(console,'warn',()=>{})
    const calls:string[]=[]
    const fetcher:typeof fetch=async(input,init)=>{
      calls.push(String(input))
      assert.equal(init?.method,'POST')
      assert.match(String(init?.body),/Campinas/)
      assert.ok(init?.signal)
      if(String(input)===fallback)return validResponse()
      assert.equal(String(input),primary)
      if(failure==='network')throw new TypeError('fetch failed',{cause:{code:'ECONNRESET'}})
      if(failure==='timeout')throw new DOMException('timeout','TimeoutError')
      if(failure==='busy')return new Response('All query workers are busy',{status:502})
      if(failure==='invalid-json')return new Response('<html>unavailable</html>')
      return Response.json({remark:'runtime error: Query timed out',elements:[]})
    }
    const org='synthetic-failover-'+failure
    const result=await searchLeads(org,'dentists','Campinas',1,fetcher)
    assert.deepEqual(calls,[primary,fallback])
    assert.equal(result.items[0].name,'Clínica de teste')
    assert.equal(result.items[0].source_url,'https://www.openstreetmap.org/node/123')
    assert.match(result.attribution,/OpenStreetMap/)
    await assert.rejects(searchLeads(org,'dentists','Campinas',1,fetcher),(error:any)=>error.status===429)
    assert.equal(calls.length,2)
  })
}

test('successful primary and genuine empty results do not query another instance',async()=>{
  let calls=0
  const fetcher:typeof fetch=async()=>{calls++;return Response.json({elements:[]})}
  assert.deepEqual((await searchLeads('synthetic-empty','dentists','Campinas',1,fetcher)).items,[])
  assert.equal(calls,1)
})

test('unavailable instances still fail explicitly and log only technical details',async t=>{
  const warnings:any[][]=[]
  t.mock.method(console,'warn',(...args:any[])=>{warnings.push(args)})
  let calls=0
  const fetcher:typeof fetch=async()=>{calls++;throw new TypeError('do not log Cidade Privada',{cause:{code:'ECONNRESET'}})}
  await assert.rejects(searchLeads('synthetic-private-org','dentists','Cidade Privada',1,fetcher),(error:any)=>error.status===503)
  assert.equal(calls,2)
  assert.equal(warnings.length,2)
  const logged=JSON.stringify(warnings)
  assert.match(logged,/ECONNRESET/)
  assert.doesNotMatch(logged,/Cidade Privada|synthetic-private-org|do not log/)
})

test('a failed query cannot start another request after the total deadline',async t=>{
  t.mock.method(console,'warn',()=>{})
  let now=1800000000000,calls=0
  t.mock.method(Date,'now',()=>now)
  const fetcher:typeof fetch=async()=>{calls++;now+=31000;throw new DOMException('timeout','TimeoutError')}
  await assert.rejects(searchLeads('synthetic-deadline','dentists','Campinas',1,fetcher),(error:any)=>error.status===504)
  assert.equal(calls,1)
})

test('the fallback timeout uses only the time left in the shared request budget',async t=>{
  t.mock.method(console,'warn',()=>{})
  let now=1800000000000,calls=0
  t.mock.method(Date,'now',()=>now)
  const timeouts:number[]=[]
  t.mock.method(AbortSignal,'timeout',(ms:number)=>{timeouts.push(ms);return new AbortController().signal})
  const fetcher:typeof fetch=async()=>{
    calls++
    if(calls===1){now+=25000;throw new DOMException('timeout','TimeoutError')}
    return validResponse()
  }
  assert.equal((await searchLeads('synthetic-budget','dentists','Campinas',1,fetcher)).items.length,1)
  assert.deepEqual(timeouts,[25000,5000])
})

test('a rejected query is not resent to another instance',async t=>{
  t.mock.method(console,'warn',()=>{})
  let calls=0
  const fetcher:typeof fetch=async()=>{calls++;return new Response('parse error',{status:400})}
  await assert.rejects(searchLeads('synthetic-invalid-query','dentists','Campinas',1,fetcher),(error:any)=>error.status===503)
  assert.equal(calls,1)
})

test('rate-limited primary can recover on the fallback without bypassing the organization limit',async t=>{
  t.mock.method(console,'warn',()=>{})
  let calls=0
  const fetcher:typeof fetch=async()=>++calls===1?new Response('busy',{status:429}):validResponse()
  assert.equal((await searchLeads('synthetic-upstream-limit','dentists','Campinas',1,fetcher)).items.length,1)
  await assert.rejects(searchLeads('synthetic-upstream-limit','dentists','Campinas',1,fetcher),(error:any)=>error.status===429)
  assert.equal(calls,2)
})
