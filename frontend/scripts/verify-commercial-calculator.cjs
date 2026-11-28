// Browser checks against the compiled frontend and synthetic, loopback-only quote data.
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const http = require('node:http')
const path = require('node:path')
const { chromium } = require(process.env.ABELHA_PLAYWRIGHT_MODULE || 'playwright')

const dist = path.resolve(__dirname, '../dist')
const output = path.resolve(process.env.ABELHA_CALCULATOR_EVIDENCE || path.join(__dirname, '../../.abelha-homologacao/prompt07/calculator'))
const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' }
const client = { id: 'f2def063-2d2e-42ca-a7f8-8d113986d980', name: 'Estúdio Aurora' }
const proposalId = '17bee4b9-9548-465e-bbad-3212e86a2bfd'
const proposalPath = '/api/v1/commercial/proposals'
const pricing = {
  version: 1, name: 'Site institucional', baseCents: 450000, monthlyCents: 0, discountBps: 1000,
  lines: [
    { id: 'support', label: 'Manutenção do site', unit: 'fixed', period: 'monthly', priceCents: 25000 },
    { id: 'landing', label: 'Landing page extra', unit: 'unit', period: 'once', priceCents: 90000 },
  ],
}

const www = http.createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://127.0.0.1').pathname
  const file = path.resolve(dist, '.' + (pathname === '/' ? '/index.html' : pathname))
  if (!file.startsWith(dist + path.sep)) return res.writeHead(403).end()
  try {
    const body = await fs.readFile(file)
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' }).end(body)
  } catch {
    res.writeHead(404).end()
  }
})

async function runWidth(browser, origin, width) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' })
  const writes = []
  let selectedClient = client
  let stored
  try {
    await page.route('**/*', async route => {
      const request = route.request()
      const url = new URL(request.url())
      if (url.origin !== origin) return route.abort()
      if (url.pathname === '/api/v1/health') return route.fulfill({ json: { status: 'ok' } })
      if (url.pathname === '/api/auth/session') return route.fulfill({
        json: { user: { id: 'test-user', organizationId: 'test-org', name: 'Teste', email: 'test@example.invalid', role: 'owner' } },
      })
      if (url.pathname === '/api/v1/commercial/access') return route.fulfill({ json: { enabled: true } })
      if (url.pathname === '/api/v1/quote-models') return route.fulfill({ json: [{ id: 'model', revision: 1, model: pricing }] })
      if (url.pathname === '/api/v1/clients' && request.method() === 'POST') {
        const body = request.postDataJSON()
        assert.equal(body.initialContract, undefined)
        selectedClient = { id: '97b7cf55-89a9-47a4-ad44-d8aa705363b1', name: body.name }
        return route.fulfill({ json: selectedClient })
      }
      if (url.pathname === '/api/v1/clients') {
        return route.fulfill({ json: url.searchParams.has('search') ? [] : [client, ...(selectedClient === client ? [] : [selectedClient])] })
      }
      if ((url.pathname === proposalPath && request.method() === 'POST') || (url.pathname === proposalPath + '/' + proposalId && request.method() === 'PATCH')) {
        const body = request.postDataJSON()
        const method = request.method()
        writes.push({ method, body })
        if (body.title === 'Falha transitória') {
          return route.fulfill({ status: 503, json: { error: 'Serviço temporariamente indisponível.' } })
        }
        if (stored && method === 'POST') {
          assert.equal(stored.draftKey, body.draftKey)
          return route.fulfill({ json: { ...stored, replayed: true } })
        }
        stored = {
          ...body, id: proposalId, client_id: body.clientId, client_name: selectedClient.name, status: 'draft',
          quote: { lines: [], oneTimeCents: 405000, monthlyCents: 25000 }, versions: [], events: [],
          presentation: {}, contract: null, revision: method === 'POST' ? 1 : 2,
        }
        if (body.title === 'Salvo, sem resposta') {
          return route.fulfill({ status: 503, json: { error: 'Serviço temporariamente indisponível.' } })
        }
        return route.fulfill({ json: stored })
      }
      if (url.pathname === proposalPath + '/' + proposalId) return route.fulfill({ json: stored })
      if (url.pathname === proposalPath) return route.fulfill({ json: stored ? [stored] : [] })
      if (url.pathname === '/api/events') return route.fulfill({ contentType: 'text/event-stream', body: ': synthetic\n\n' })
      if (url.pathname.startsWith('/api/')) return route.fulfill({ json: [] })
      return route.continue()
    })
    await page.goto(origin + '/?view=quote-models')
    await page.getByRole('heading', { name: 'Cliente e projeto' }).waitFor()
    await page.getByRole('combobox', { name: 'Modelo de preço' }).selectOption('model')
    await page.getByRole('button', { name: 'Aplicar modelo' }).press('Enter')
    await page.getByRole('group', { name: 'Landing page extra' }).getByLabel('Serviço opcional').check()
    const summary = page.getByRole('complementary', { name: 'Resumo do orçamento' })
    await summary.getByText(/4\.050,00/).waitFor()
    await summary.getByText(/250,00/).waitFor()
    await page.getByLabel('Nome do projeto', { exact: true }).fill('Site institucional do Estúdio Aurora')
    await page.getByLabel('Objetivo do projeto').fill('Apresentar os serviços de design e receber pedidos de orçamento.')
    await page.getByLabel('Briefing', { exact: true }).fill('Lançar um site responsivo com catálogo de serviços e formulário de contato.')
    await page.getByLabel('Site', { exact: true }).check()
    await page.getByLabel('Entrada (R$)', { exact: true }).fill('1500,00')
    await page.getByLabel('Parcelas do saldo', { exact: true }).fill('2')

    if (width === 390) {
      await page.getByRole('searchbox', { name: 'Buscar clientes' }).fill('sem resultados')
      await page.getByRole('button', { name: 'Buscar', exact: true }).press('Enter')
      await page.getByText('Nenhum cliente corresponde à busca.').waitFor()
      await page.getByRole('button', { name: 'Limpar busca', exact: true }).click()
      assert.equal(await page.getByRole('searchbox', { name: 'Buscar clientes' }).evaluate(element => element === document.activeElement), true)
      await page.getByRole('button', { name: 'Novo cliente', exact: true }).click()
      const modal = page.getByRole('dialog', { name: 'Novo contato' })
      assert.equal(await modal.getByRole('button', { name: 'Adicionar contrato agora' }).count(), 0)
      await modal.getByLabel('Nome', { exact: true }).fill('Estúdio Horizonte')
      await modal.getByRole('button', { name: 'Salvar contato' }).click()
      await modal.waitFor({ state: 'hidden' })
    } else {
      await page.getByRole('combobox', { name: 'Cliente', exact: true }).selectOption(client.id)
    }
    await page.getByRole('button', { name: 'Revisar orçamento' }).click()
    await page.waitForFunction(() => document.activeElement?.id === 'calculator-review')
    await page.getByText('Conferir escopo e serviços').click()
    await page.getByText(/Landing page extra · Opcional/).waitFor()
    await page.getByText('Conferir escopo e serviços').click()
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'Sem rolagem horizontal no documento')
    if (width === 390 || width === 1440) {
      await page.waitForFunction(async () => Boolean((await navigator.serviceWorker.ready).active))
      await page.getByRole('button', { name: 'Gerar proposta' }).scrollIntoViewIfNeeded()
      await page.screenshot({ path: path.join(output, 'revisao-' + width + '.png') })
      await page.evaluate(() => window.scrollTo(0, 0))
      await page.screenshot({ path: path.join(output, 'calculadora-' + width + '.png') })
      if (width === 390) {
        await page.getByRole('button', { name: 'Ativar tema claro' }).click()
        await page.screenshot({ path: path.join(output, 'calculadora-clara-' + width + '.png') })
        await page.getByRole('button', { name: 'Ativar tema escuro' }).click()
      }
    }

    if (width === 1440 || width === 1024) {
      const failedTitle = width === 1440 ? 'Falha transitória' : 'Salvo, sem resposta'
      await page.getByLabel('Nome do projeto', { exact: true }).fill(failedTitle)
      await page.getByRole('button', { name: 'Salvar rascunho' }).click()
      await page.getByRole('alert').getByText('Serviço temporariamente indisponível.').waitFor()
      assert.equal(await page.getByLabel('Nome do projeto', { exact: true }).inputValue(), failedTitle)
      await page.getByLabel('Nome do projeto', { exact: true }).fill('Site institucional do Estúdio Aurora')
    }
    await page.getByRole('button', { name: 'Salvar rascunho' }).click()
    await page.getByText('Rascunho salvo.', { exact: true }).waitFor()
    const body = writes.at(-1).body
    assert.equal(body.clientId, selectedClient.id)
    assert.equal(body.quote, undefined)
    assert.equal(body.model.discountBps, 1000)
    assert.deepEqual(body.commercial.optionalItems, ['landing'])
    assert.deepEqual(body.commercial.payment, { downPaymentCents: 150000, installments: 2, conditions: '' })
    assert.equal(body.quantities.landing, 1000)
    if (width === 1024) {
      assert.deepEqual(writes.map(write => write.method), ['POST', 'POST', 'PATCH'])
      assert.equal(body.revision, 1)
      assert.equal(stored.title, 'Site institucional do Estúdio Aurora')
    }
    if (width === 1440) {
      assert.equal(writes[0].body.draftKey, body.draftKey)
      await page.goto(origin + '/?view=quote-models&record=' + proposalId)
      await page.getByLabel('Nome do projeto', { exact: true }).waitFor()
      assert.equal(await page.getByLabel('Nome do projeto', { exact: true }).inputValue(), body.title)
      await page.getByLabel('Validade (dias)').fill('20')
      await page.getByRole('button', { name: 'Salvar rascunho' }).click()
      await page.getByText('Rascunho salvo.', { exact: true }).waitFor()
      assert.equal(writes.at(-1).method, 'PATCH')
      assert.equal(writes.at(-1).body.revision, 1)
      await page.getByRole('button', { name: 'Revisar orçamento' }).click()
    }
    const count = writes.length
    await page.getByRole('button', { name: 'Gerar proposta' }).click()
    await page.waitForURL(url => url.searchParams.get('view') === 'proposals' && url.searchParams.get('record') === proposalId)
    assert.equal(writes.length, count)
    console.log(`PASS ${width}px · cálculo, escopo, persistência, editor e largura`)
  } finally {
    await page.close()
  }
}

async function main() {
  await fs.mkdir(output, { recursive: true })
  let browser
  try {
    await new Promise((resolve, reject) => {
      www.once('error', reject)
      www.listen(0, '127.0.0.1', resolve)
    })
    const origin = 'http://127.0.0.1:' + www.address().port
    browser = await chromium.launch({ headless: true, ...(process.env.ABELHA_BROWSER_EXECUTABLE ? { executablePath: process.env.ABELHA_BROWSER_EXECUTABLE } : {}) })
    for (const width of [320, 390, 768, 1024, 1440, 1920]) await runWidth(browser, origin, width)
  } finally {
    await browser?.close()
    www.closeAllConnections()
    if (www.listening) await new Promise(resolve => www.close(resolve))
  }
}

main().catch(error => { console.error(error); process.exitCode = 1 })
