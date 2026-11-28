import test from 'node:test'
import assert from 'node:assert/strict'

let moduleId = 0
async function invoke(environment, backend, method = 'POST', target='v1/personal/tasks', upstream) {
  const previous = { environment: process.env.VERCEL_ENV, backend: process.env.BACKEND_URL, fetch: globalThis.fetch }
  process.env.VERCEL_ENV = environment
  if (backend === undefined) delete process.env.BACKEND_URL
  else process.env.BACKEND_URL = backend
  const calls = []
  globalThis.fetch = async (...args) => {
    calls.push(args)
    if (upstream) return upstream
    return new Response('{"ok":true}', { status: 200, headers: { 'content-type': 'application/json' } })
  }
  const response = { headers: {}, setHeader(name, value) { this.headers[name] = value }, end(body) { this.body = String(body) } }
  try {
    const { default: handler } = await import(`../../api/proxy.js?test=${++moduleId}`)
    await handler({ method, query: { target, limit: '2' }, headers: { host: 'preview.vercel.app', 'content-type': 'application/json', cookie: 'synthetic=session' }, body: { title: 'Synthetic' } }, response)
    return { calls, response }
  } finally {
    if (previous.environment === undefined) delete process.env.VERCEL_ENV
    else process.env.VERCEL_ENV = previous.environment
    if (previous.backend === undefined) delete process.env.BACKEND_URL
    else process.env.BACKEND_URL = previous.backend
    globalThis.fetch = previous.fetch
  }
}

test('preview refuses missing, production, insecure or invalid backend before forwarding a write', async () => {
  for (const backend of [undefined, '', 'https://abelha-gestor-api.onrender.com', 'https://abelha-gestor-api.onrender.com/path', 'https://abelha-gestor-api.onrender.com.', 'http://staging.example', 'invalid']) {
    const { calls, response } = await invoke('preview', backend)
    assert.equal(response.statusCode, 503, `must reject ${backend}`)
    assert.equal(calls.length, 0)
    assert.match(response.body, /homologa/i)
  }
})

test('preview with explicit isolated HTTPS backend preserves proxy request and response', async () => {
  const { calls, response } = await invoke('preview', 'https://abelha-hml.example')
  assert.equal(response.statusCode, 200)
  assert.equal(calls.length, 1)
  assert.equal(String(calls[0][0]), 'https://abelha-hml.example/api/v1/personal/tasks?limit=2')
  assert.equal(calls[0][1].method, 'POST')
  assert.equal(calls[0][1].headers.get('cookie'), 'synthetic=session')
  assert.equal(calls[0][1].body, '{"title":"Synthetic"}')
  assert.equal(response.body, '{"ok":true}')
})

test('production keeps the existing default backend and GET has no body', async () => {
  const { calls, response } = await invoke('production', undefined, 'GET')
  assert.equal(response.statusCode, 200)
  assert.equal(new URL(calls[0][0]).origin, 'https://abelha-gestor-api.onrender.com')
  assert.equal(calls[0][1].body, undefined)
})

test('public commercial requests do not forward application cookies', async () => {
  const { calls, response } = await invoke('preview', 'https://abelha-hml.example', 'POST', 'v1/commercial/public/read')
  assert.equal(response.statusCode, 200)
  assert.equal(calls[0][1].headers.has('cookie'), false)
  assert.equal(calls[0][1].redirect, 'manual')
})

test('production keeps the error code delivered in a credentials redirect', async () => {
  const upstream = new Response(null, {status:302,headers:{Location:'https://abelha.example/api/auth/error?error=CredentialsSignin'}})
  const { response } = await invoke('production', undefined, 'POST', 'auth/callback/credentials', upstream)
  assert.equal(response.statusCode,200)
  assert.match(JSON.parse(response.body).url,/\?error=CredentialsSignin$/)
})
