import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'

const require = createRequire(import.meta.url)
function load(relativePath, aliases = {}) {
  const source = readFileSync(new URL(relativePath, import.meta.url), 'utf8')
  const { outputText } = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022,
  } })
  const exports = {}
  new Function('require', 'exports', outputText)(id => id in aliases ? aliases[id] : require(id), exports)
  return exports
}

const navigation = load('./navigation.ts')
const { default: AppSidebar } = load('../components/layout/AppSidebar.tsx', {
  '@/lib/navigation': navigation,
  '@/components/ui/ThemeToggle': { __esModule: true, default: () => createElement('button', { type: 'button' }, 'Ativar tema claro') },
})
const noop = () => {}
const render = (space, activeView, commercialEnabled = false) => renderToStaticMarkup(createElement(AppSidebar, {
  space, activeView, commercialEnabled, pendingReminders: 2, onChange: noop, onSpace: noop,
  onSearch: noop, onNotifications: noop, onExport: noop, onCreate: noop, onLogout: noop,
}))

test('CRM puts every section and its active deliveries button in the left sidebar', () => {
  const html = render('crm', 'deliveries', true)
  assert.match(html, /<aside\b[\s\S]+<\/aside>$/)
  assert.match(html, /<nav[^>]+aria-label="Navegação principal"/)
  for (const { label } of navigation.NAVIGATION) assert.ok(html.includes(`>${label}</span>`), label)
  assert.match(html.match(/<button[^>]+aria-current="page"[^>]*>.*?<\/button>/)?.[0] ?? '', /<span>Entregas<\/span>/)
  assert.equal((html.match(/aria-current="page"/g) ?? []).length, 1)
  for (const label of ['Busca global', 'Novo contato', 'Exportar dados', 'Abrir calculadora de preços em uma nova aba']) {
    assert.ok(html.includes(`aria-label="${label}"`), label)
  }
})

test('commercial proposal navigation requires the enabled capability', () => {
  assert.doesNotMatch(render('crm', 'overview'), />Propostas<\/span>/)
  assert.match(render('crm', 'proposals', true), /aria-current="page"[^>]*>.*?<span>Propostas<\/span>/)
})

test('Personal reuses the sidebar with its own sections and the shared controls', () => {
  const html = render('personal', 'personal-projects')
  assert.match(html, /<aside\b[\s\S]+<\/aside>$/)
  for (const { label } of navigation.PERSONAL_NAVIGATION) assert.ok(html.includes(`>${label}</span>`), label)
  assert.match(html.match(/<button[^>]+aria-current="page"[^>]*>.*?<\/button>/)?.[0] ?? '', /<span>Projetos<\/span>/)
  assert.doesNotMatch(html, />Entregas<\/span>|aria-label="Busca global"/)
  assert.match(html, /Ativar tema claro/)
  assert.match(html, /aria-label="Abrir notificações"/)
})
