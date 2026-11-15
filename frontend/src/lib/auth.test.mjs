import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

// Run the actual auth module; only Vite's build-time API origin is replaced.
const source = await readFile(new URL('./auth.ts', import.meta.url), 'utf8')
const originModule = 'data:text/javascript,' + encodeURIComponent('export const API_BASE_URL = ""')
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText.replace(/(['"])@\/lib\/apiBase\1/, JSON.stringify(originModule))
const { getSession } = await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'))

test('an anonymous Auth.js null session reaches the login flow without throwing', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, '/api/auth/session')
    assert.equal(options.credentials, 'include')
    assert.equal(options.cache, 'no-store')
    return Response.json(null)
  })
  assert.equal(await getSession(), null)
})

test('session absence and expired authorization remain distinct from an outage', async (t) => {
  const responses = [Response.json({}), Response.json({ user: null }), new Response(null, { status: 401 }), new Response(null, { status: 403 })]
  t.mock.method(globalThis, 'fetch', async () => responses.shift())
  for (let i = 0; i < 4; i++) assert.equal(await getSession(), null)
})

test('a valid session preserves its user and tenant claims', async (t) => {
  const user = { id: 'synthetic-user', organizationId: 'synthetic-org', name: 'Teste', email: 'synthetic@example.invalid', role: 'owner' }
  t.mock.method(globalThis, 'fetch', async () => Response.json({ user }))
  assert.deepEqual(await getSession(), user)
})

test('an unavailable session endpoint still reports failure instead of logging out', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 503 }))
  await assert.rejects(getSession(), /Não foi possível verificar a sessão/)
})
