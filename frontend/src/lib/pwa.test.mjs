import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'

async function worker() {
  const handlers = {}; const stored = new Map(); const notices = []; const opened = []
  const context = { URL, Request, Response, Promise, console, fetch: async request => new Response('public resource',{headers:{'Content-Type':request.url.endsWith('.js')?'text/javascript':request.url.endsWith('.png')?'image/png':'text/html'}}), caches: {
    open: async () => ({ match: async key => stored.get(typeof key === 'string' ? key : key.url), put: async (key, value) => stored.set(typeof key === 'string' ? key : key.url, value) }),
    keys: async () => [], delete: async () => true,
  }, self: { location: { origin: 'https://abelha.example' }, addEventListener: (name, fn) => { handlers[name] = fn },
    registration: { showNotification: async (title, options) => notices.push({ title, ...options }) },
    clients: { claim: async () => {}, matchAll: async () => [], openWindow: async url => opened.push(url) }, skipWaiting: async () => {},
  } }
  vm.runInNewContext((await readFile(new URL('../../pwa/sw.js', import.meta.url), 'utf8')).replace('__PRECACHE__', JSON.stringify(['/','/assets/app-123.js','/bee-mark.png'])).replaceAll('__VERSION__', 'test'), context)
  return { handlers, stored, notices, opened, context }
}
test('service worker never intercepts API, auth, external hosts, writes or unknown assets', async () => {
  const { handlers } = await worker()
  for (const [url, method] of [['/api/v1/personal/finance','GET'],['/api/auth/session','GET'],['/api/events','GET'],['https://other.example/assets/app-123.js','GET'],['/assets/private.json','GET'],['/assets/app-123.js','POST']]) {
    let intercepted = false
    handlers.fetch({ request: new Request(new URL(url,'https://abelha.example'),{method}), respondWith: () => { intercepted = true } })
    assert.equal(intercepted, false, url)
  }
})
test('worker caches only the public shell and explicit static build files', async () => {
  const { handlers, stored } = await worker()
  let completion; handlers.install({ waitUntil: promise => { completion = promise } }); await completion
  assert.deepEqual([...stored.keys()].sort(), ['/','/assets/app-123.js','/bee-mark.png'])
})
test('push hides payload text and rejects external notification destinations', async () => {
  const { handlers, notices, opened } = await worker()
  let completion
  handlers.push({ data: { json: () => ({ title:'Fatura R$ 900', body:'segredo', url:'https://evil.example', key:'reminder' }) }, waitUntil:p=>{completion=p} }); await completion
  assert.equal(notices[0].title, 'Abelha')
  assert.equal(notices[0].body.includes('900'), false)
  handlers.notificationclick({ notification: { close(){}, data:{url:'https://evil.example'} }, waitUntil:p=>{completion=p} }); await completion
  assert.equal(opened[0], 'https://abelha.example/?space=personal&view=personal-overview')
})
test('active worker serves its own shell until the next version is activated',async()=>{
  const {handlers,stored,context}=await worker();stored.set('/',new Response('old shell'))
  context.fetch=async()=>new Response('new shell with different asset hashes')
  let response;handlers.fetch({request:{url:'https://abelha.example/?space=personal',method:'GET',mode:'navigate'},respondWith:value=>{response=value}})
  assert.equal(await (await response).text(),'old shell')
})
test('failed static precache rejects installation instead of replacing a working version',async()=>{
  const {handlers,context}=await worker();context.fetch=async request=>request.url.endsWith('.js')?new Response('missing',{status:404}):new Response('ok')
  let completion;handlers.install({waitUntil:value=>{completion=value}})
  await assert.rejects(completion)
})
test('an SPA HTML fallback with HTTP 200 cannot be installed as JavaScript',async()=>{
  const {handlers,context}=await worker();context.fetch=async()=>new Response('<html>fallback</html>',{headers:{'Content-Type':'text/html'}})
  let completion;handlers.install({waitUntil:value=>{completion=value}})
  await assert.rejects(completion)
})
test('public precache requests omit credentials and bypass the HTTP cache',async()=>{
  const {handlers,context}=await worker();const fetchPublic=context.fetch;const requests=[]
  context.fetch=async request=>{requests.push(request);return fetchPublic(request)}
  let completion;handlers.install({waitUntil:value=>{completion=value}});await completion
  assert.equal(requests.length,3)
  for(const request of requests){assert.equal(request.credentials,'omit');assert.equal(request.cache,'no-cache')}
})
test('redirected or private static responses never populate a new shell cache',async()=>{
  for(const blocked of ['redirected','private','no-store']){
    const {handlers,context,stored}=await worker();const fetchPublic=context.fetch
    context.fetch=async request=>{
      const response=await fetchPublic(request)
      if(request.url.endsWith('.js')){
        if(blocked==='redirected')Object.defineProperty(response,'redirected',{value:true})
        else response.headers.set('Cache-Control',blocked)
      }
      return response
    }
    let completion;handlers.install({waitUntil:value=>{completion=value}})
    await assert.rejects(completion,/Public precache failed/,blocked)
    assert.equal(stored.size,0,blocked+' must not leave a partial new shell')
  }
})
test('installing an update never skips waiting until explicitly requested',async()=>{
  const {handlers,context}=await worker();let activations=0;context.self.skipWaiting=async()=>{activations++}
  let completion;handlers.install({waitUntil:value=>{completion=value}});await completion
  assert.equal(activations,0)
  handlers.message({data:{type:'UNRELATED_MESSAGE'}});assert.equal(activations,0)
  handlers.message({data:{type:'ACTIVATE_UPDATE'}});assert.equal(activations,1)
})
test('activation removes only obsolete Abelha shell caches',async()=>{
  const {handlers,context}=await worker();const removed=[];let claimed=false
  context.caches.keys=async()=>['abelha-shell-old','abelha-shell-test','other-application-cache']
  context.caches.delete=async key=>{removed.push(key);return true}
  context.self.clients.claim=async()=>{claimed=true}
  let completion;handlers.activate({waitUntil:value=>{completion=value}});await completion
  assert.deepEqual(removed,['abelha-shell-old']);assert.equal(claimed,true)
})
