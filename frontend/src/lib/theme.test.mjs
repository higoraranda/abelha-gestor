import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { runInNewContext } from 'node:vm'

const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8')
const bootstrap = html.match(/<script id="abelha-theme-init">([\s\S]+?)<\/script>/)?.[1]

for (const [name, stored, theme, color] of [
  ['nova sessão', null, 'dark', '#141719'],
  ['preferência clara', 'light', 'light', '#f7f6ef'],
  ['valor inválido', 'system', 'dark', '#141719'],
  ['storage bloqueado', new Error('blocked'), 'dark', '#141719'],
]) {
  test(`HTML inicial aplica o tema correto antes de carregar o app: ${name}`, () => {
    const root = { dataset: {} }
    const metadata = new Map()
    runInNewContext(bootstrap, {
      document: {
        documentElement: root,
        querySelector: selector => ({ setAttribute: (_, value) => metadata.set(selector, value) }),
      },
      localStorage: { getItem: key => {
        assert.equal(key, 'abelha-theme')
        if (stored instanceof Error) throw stored
        return stored
      } },
    })
    assert.equal(root.dataset.theme, theme)
    assert.equal(metadata.get('meta[name="theme-color"]'), color)
    assert.equal(metadata.get('meta[name="color-scheme"]'), theme)
  })
}
