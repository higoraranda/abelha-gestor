import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import ts from 'typescript'

const source = await readFile(new URL('../hooks/usePwa.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source.replace('import.meta.env.PROD', 'true'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

// Execute the actual hook. React scheduling and browser worker events are the
// only boundaries replaced; no browser, notification provider or server starts.
async function lifecycle({ active = null, installing = null } = {}) {
  const values = []; let cursor = 0; let mounted = false; let cleanup; let reloads = 0
  const registration = Object.assign(new EventTarget(), { active, installing, waiting: null })
  const serviceWorker = Object.assign(new EventTarget(), {
    controller: active,
    register: async () => registration,
  })
  const window = Object.assign(new EventTarget(), { location: { reload: () => { reloads++ } } })
  const react = {
    useState(initial) { const index = cursor++; if (!(index in values)) values[index] = initial; return [values[index], value => { values[index] = value }] },
    useEffect(effect) { if (!mounted) cleanup = effect() },
    useCallback: callback => callback,
  }
  const exports = {}
  vm.runInNewContext(compiled, { exports, require: name => { assert.equal(name, 'react'); return react }, navigator: { onLine: true, serviceWorker }, window, Event })
  const render = () => { cursor = 0; const result = exports.usePwa(); mounted = true; return result }
  render(); await Promise.resolve(); await Promise.resolve()
  return { render, registration, serviceWorker, unmount: () => cleanup(), reloads: () => reloads }
}

function worker(state) {
  return Object.assign(new EventTarget(), { state, postMessage() {} })
}
function transition(target, state) {
  target.state = state
  target.dispatchEvent(new Event('statechange'))
}

test('a precache failure after registration reports unavailability and exposes no inactive push registration', async () => {
  const installing = worker('installing')
  const app = await lifecycle({ installing })
  app.registration.installing = null
  transition(installing, 'redundant')
  assert.ok(app.render().failure, 'A failed install must not look ready for offline use')
  assert.equal(app.render().registration, null, 'Push cannot subscribe without an active worker')
  app.unmount()
})

test('an already-installing first worker becomes available to push only after activation', async () => {
  const installing = worker('installing')
  const app = await lifecycle({ installing })
  assert.equal(app.render().registration, null)
  app.registration.active = installing
  app.registration.installing = null
  transition(installing, 'activated')
  assert.equal(app.render().registration, app.registration)
  assert.equal(app.render().failure, '')
  app.unmount()
})

test('an update already installing when registration resolves waits for explicit reload', async () => {
  const active = worker('activated'); const installing = worker('installing')
  const app = await lifecycle({ active, installing })
  app.registration.waiting = installing
  transition(installing, 'installed')
  assert.equal(app.render().waiting, installing)
  assert.equal(app.reloads(), 0, 'A waiting update must preserve the open form')
  let message
  installing.postMessage = value => { message = value.type }
  app.render().update()
  assert.equal(message, 'ACTIVATE_UPDATE')
  app.serviceWorker.dispatchEvent(new Event('controllerchange'))
  assert.equal(app.reloads(), 1)
  app.unmount()
})

test('a failed update preserves the active worker and stops lifecycle observation on unmount', async () => {
  const active = worker('activated'); const installing = worker('installing')
  const app = await lifecycle({ active, installing })
  transition(installing, 'redundant')
  assert.equal(app.render().registration, app.registration)
  assert.ok(app.render().failure)
  app.unmount()
  transition(installing, 'activated')
  assert.ok(app.render().failure, 'An unmounted hook must not receive lifecycle updates')
})
