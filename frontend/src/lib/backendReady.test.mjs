import test from 'node:test'
import assert from 'node:assert/strict'
import { waitForBackend } from './backendReady.ts'

const url = 'http://127.0.0.1/api/v1/health'
const healthy = () => Response.json({ status: 'ok' })
const options = signal => ({ signal, retryDelayMs: 1, requestTimeoutMs: 30 })

test('same-origin protected preview health reaches readiness with the existing protection session', async () => {
  const controller = new AbortController()
  let calls = 0
  await waitForBackend('https://preview.example/api/v1/health', {
    ...options(controller.signal),
    fetcher: async (_target, init) => {
      calls++
      return init.credentials === 'same-origin'
        ? healthy()
        : new Response(null, { status: 302, headers: { location: 'https://vercel.com/login' } })
    },
    onFailure: () => controller.abort(new Error('The health request discarded the same-origin protection session')),
  })
  assert.equal(calls, 1, 'a protected same-origin health response must not enter the retry loop')
})

test('external backend health checks do not forward the frontend origin cookies', async () => {
  const frontendOrigin = 'https://preview.example'
  const externalHealth = 'https://api.example/api/v1/health'
  let sentCookies = false
  await waitForBackend(externalHealth, {
    ...options(new AbortController().signal),
    fetcher: async (target, init) => {
      sentCookies = init.credentials === 'include'
        || (init.credentials === 'same-origin' && new URL(target).origin === frontendOrigin)
      return healthy()
    },
  })
  assert.equal(sentCookies, false)
})

test('retries transport, HTTP, HTML and invalid health responses until the backend is ready', async () => {
  const controller = new AbortController()
  const responses = [
    () => { throw new TypeError('network unavailable') },
    () => Response.json({ status: 'ok' }, { status: 503 }),
    () => new Response('<html>SPA fallback</html>', { headers: { 'content-type': 'text/html' } }),
    () => new Response('{', { headers: { 'content-type': 'application/json' } }),
    () => Response.json({ status: 'starting' }),
    healthy,
  ]
  let calls = 0
  await waitForBackend(url, { ...options(controller.signal), fetcher: async (target, init) => {
    assert.equal(target, url)
    assert.equal(init.cache, 'no-store')
    assert.equal(init.method, 'GET')
    assert.ok(init.signal instanceof AbortSignal)
    return responses[calls++]()
  } })
  await new Promise(resolve => setTimeout(resolve, 15))
  assert.equal(calls, 6, 'success must stop all retries')
})

test('a timed out request is aborted before the next attempt starts', async () => {
  let calls = 0
  let aborted = false
  await waitForBackend(url, { ...options(new AbortController().signal), fetcher: async (_url, { signal }) => {
    calls++
    if (calls === 1) return new Promise((_resolve, reject) => signal.addEventListener('abort', () => {
      aborted = true
      reject(signal.reason)
    }, { once: true }))
    assert.equal(aborted, true)
    return healthy()
  } })
  assert.equal(calls, 2)
})

test('unmount cancels an in-flight request and never starts another', async () => {
  const controller = new AbortController()
  let calls = 0
  let requestSignal
  const pending = waitForBackend(url, { ...options(controller.signal), fetcher: async (_url, { signal }) => {
    calls++
    requestSignal = signal
    return new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true }))
  } })
  controller.abort()
  await assert.rejects(pending, { name: 'AbortError' })
  assert.equal(requestSignal.aborted, true)
  assert.equal(calls, 1)
})

test('cancelling during the retry delay clears the pending attempt', async () => {
  const controller = new AbortController()
  let calls = 0
  const pending = waitForBackend(url, { ...options(controller.signal), retryDelayMs: 1000, fetcher: async () => {
    calls++
    return Response.json({ error: 'unavailable' }, { status: 503 })
  } })
  await new Promise(resolve => setTimeout(resolve, 5))
  controller.abort()
  await assert.rejects(pending, { name: 'AbortError' })
  assert.equal(calls, 1)
})

test('an already cancelled initialization does not send a request', async () => {
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(waitForBackend(url, { ...options(controller.signal), fetcher: async () => assert.fail('must not fetch') }), { name: 'AbortError' })
})

test('redirected JSON is rejected and failures report a bounded backoff', async () => {
  const failures = []
  let calls = 0
  await waitForBackend(url, { ...options(new AbortController().signal), onFailure: failure => failures.push(failure), fetcher: async () => {
    calls++
    if (calls === 1) {
      const response = healthy()
      Object.defineProperty(response, 'redirected', { value: true })
      return response
    }
    if (calls < 5) return Response.json({ error: 'unavailable' }, { status: 503 })
    return healthy()
  } })
  assert.equal(calls, 5)
  assert.equal(failures[0].reason, 'invalid')
  assert.equal(failures[1].reason, 'http')
  assert.equal(failures[1].status, 503)
  assert.ok(failures.every(failure => failure.nextRetryMs <= 10000))
  assert.ok(failures.at(-1).nextRetryMs > failures[0].nextRetryMs)
})
