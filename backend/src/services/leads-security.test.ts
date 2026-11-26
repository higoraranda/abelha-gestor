import test from 'node:test'
import assert from 'node:assert/strict'
import { searchLeads } from './leads'
test('Overpass timeout becomes an explicit retryable error rather than an empty result',async t=>{
  t.mock.method(console,'warn',()=>{})
  const unavailable:typeof fetch=async()=>{throw new DOMException('timeout','TimeoutError')}
  await assert.rejects(searchLeads('synthetic-timeout','dentists','Campinas',1,unavailable),(error:any)=>error.status===504&&/prazo/.test(error.message))
})

test('canceling a public search aborts transport without starting another provider',async()=>{
  const controller=new AbortController()
  let calls=0
  const fetcher:typeof fetch=async(_input,init)=>{
    calls++
    controller.abort()
    init?.signal?.throwIfAborted()
    throw Error('The transport signal should already be canceled')
  }
  await assert.rejects(searchLeads('synthetic-cancel','padaria','Salto, SP',1,fetcher,controller.signal),{name:'AbortError'})
  assert.equal(calls,1)
})

const primary='https://overpass-api.de/api/interpreter'
const fallback='https://overpass.private.coffee/api/interpreter'
const area={type:'area',id:3600000123}
const validResponse=()=>Response.json({elements:[area,{type:'node',id:123,tags:{name:'Clínica de teste','contact:phone':'+55 19 0000-0000'}}]})

for(const failure of ['network','busy','not-acceptable','timeout','invalid-json','incomplete'] as const) {
  test(`Overpass ${failure} on primary recovers through another instance`,async t=>{
    t.mock.method(console,'warn',()=>{})
    const calls:string[]=[]
    const fetcher:typeof fetch=async(input,init)=>{
      calls.push(String(input))
      assert.equal(init?.method,'POST')
      assert.match(new URLSearchParams(String(init?.body)).get('data')??'',/"boundary"="administrative"/)
      assert.ok(init?.signal)
      if(String(input)===fallback)return validResponse()
      assert.equal(String(input),primary)
      if(failure==='network')throw new TypeError('fetch failed',{cause:{code:'ECONNRESET'}})
      if(failure==='timeout')throw new DOMException('timeout','TimeoutError')
      if(failure==='busy')return new Response('All query workers are busy',{status:502})
      if(failure==='not-acceptable')return new Response('Rejected by endpoint gateway',{status:406})
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
  const fetcher:typeof fetch=async()=>{calls++;return Response.json({elements:[area]})}
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
    if(calls===1){now+=14000;throw new DOMException('timeout','TimeoutError')}
    return validResponse()
  }
  assert.equal((await searchLeads('synthetic-budget','dentists','Campinas',1,fetcher)).items.length,1)
  assert.deepEqual(timeouts,[14000,16000])
})

test('a free niche keeps its readable label and skips malformed and duplicate provider records',async()=>{
  const malformed = [{type:'way',id:45,tags:{name:'   '}},{type:'node',id:88,tags:{name:'a'.repeat(241)}}, {type:'node',id:123,tags:{name:'Loja especializada'}}, {type:'node',id:123,tags:{name:'Duplicata'}},null]
  const fetcher:typeof fetch=async()=>Response.json({elements:[area,...malformed]})
  const response=await searchLeads('synthetic-custom','  Ar condicionado  ','Campinas',5,fetcher)
  assert.deepEqual(response.items.map(i=>[i.name,i.niche]),[['Loja especializada','Ar condicionado']])
})

test('unknown and ambiguous municipalities are not reported as having zero establishments',async()=>{
  let calls=0
  const none:typeof fetch=async()=>{calls++;return Response.json({elements:[]})}
  await assert.rejects(searchLeads('synthetic-area-missing','padaria','Cidade Fantasma',5,none),(error:any)=>error.status===422&&/não encontrada/i.test(error.message))
  const duplicate:typeof fetch=async()=>{calls++;return Response.json({elements:[area,{type:'area',id:3600001100}]})}
  await assert.rejects(searchLeads('synthetic-area-ambiguous','padaria','Santa Helena',5,duplicate),(error:any)=>error.status===422&&/UF/.test(error.message))
  assert.equal(calls,2)
})

test('a response over the byte limit is stopped while streaming without retry',async t=>{
  t.mock.method(console,'warn',()=>{})
  let calls=0,cancelled=false
  const fetcher:typeof fetch=async()=>{
    calls++
    return new Response(new ReadableStream<Uint8Array>({
      start(controller){controller.enqueue(new Uint8Array(1_900_001));controller.enqueue(new Uint8Array(100_000))},
      cancel(){cancelled=true},
    }))
  }
  await assert.rejects(searchLeads('synthetic-cap','dentists','Campinas',1,fetcher),(error:any)=>error.status===503&&/dados demais/.test(error.message))
  assert.equal(calls,1)
  assert.equal(cancelled,true)
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
