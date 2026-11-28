// Run after building both workspaces. The database and HTTP server exist only for this test.
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const { once } = require('node:events')
const path = require('node:path')
const { pathToFileURL } = require('node:url')
const express = require('express')
const { PGlite } = require('@electric-sql/pglite')
const { chromium } = require(process.env.ABELHA_PLAYWRIGHT_MODULE || 'playwright')

process.env.DATABASE_URL = 'postgres://synthetic:synthetic@127.0.0.1:1/never_connect'
const { createCommercialRouter } = require('../dist/routes/commercial')
const prefix = '/api/v1/commercial'
const dist = path.resolve(__dirname, '../../frontend/dist')
const output = path.resolve(__dirname, '../../.abelha-homologacao/prompt07/commercial')
const widths = [320, 390, 768, 1024, 1440, 1920]

async function noOverflow(page, width) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'Overflow do documento em ' + width)
}

async function saveNavigableExample(page) {
  const presentation = await page.locator('.offer--public').evaluate(node => {
    const copy = node.cloneNode(true)
    copy.querySelector('.offer-decision')?.remove()
    copy.querySelector('.offer-controls')?.remove()
    copy.querySelector('.offer-progress')?.remove()
    const sections = [...copy.querySelectorAll('[data-offer-section]')]
    const anchors = (button, section) => {
      const anchor = document.createElement('a')
      anchor.href = '#' + section.id
      anchor.innerHTML = button.innerHTML
      button.replaceWith(anchor)
    }
    const navigation = [...copy.querySelectorAll('.offer-nav button')]
    navigation.at(-1)?.remove()
    navigation.slice(0, -1).forEach((button, index) => anchors(button, sections[index]))
    anchors(copy.querySelector('.offer-cover-footer button'), sections[1])
    anchors(copy.querySelector('.offer-footer button'), sections[0])
    const label = copy.querySelector('.offer-cover-strap span')
    label.textContent = 'Demonstração · dados sintéticos'
    return copy.outerHTML
  })
  const assets = path.join(dist, 'assets')
  const names = (await fs.readdir(assets)).filter(name => /^(?:index|CommercialPresentation)-.*\.css$/.test(name))
  assert.equal(names.length, 2)
  const styles = (await Promise.all(names.sort((left, right) => Number(right.startsWith('index-')) - Number(left.startsWith('index-')))
    .map(name => fs.readFile(path.join(assets, name), 'utf8')))).join('\n').replace(/@import\s+url\([^)]*\);/g, '')
  const bee = (await fs.readFile(path.join(dist, 'bee-mark.png'))).toString('base64')
  const html = '<!doctype html><html lang="pt-BR" data-theme="dark"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">' +
    '<title>Proposta Casa Lume · demonstração</title><style>' + styles +
    '.offer-nav a{white-space:nowrap;padding:.55rem .75rem;color:var(--ink);border-radius:999px}.offer-nav a:hover{background:var(--surface)}' +
    '.offer-cover-footer a,.offer-footer a{display:inline-flex;align-items:center;gap:.5rem;color:var(--accent-yellow)}' +
    '</style></head><body>' + presentation.replace('/bee-mark.png', 'data:image/png;base64,' + bee) + '</body></html>'
  assert.doesNotMatch(html, /\/proposta#[A-Za-z0-9_-]{43}/)
  await fs.writeFile(path.join(output, 'proposta-casa-lume.html'), html)
}

async function run() {
  const pg = new PGlite()
  let server
  let browser
  let port
  try {
    await fs.mkdir(output, { recursive: true })
    const database = path.resolve(__dirname, '../src/db')
    const migrations = [
      '20261105_personal_crm.sql', '20261111_personal_platform.sql', '20261126_quote_proposals.sql',
      '20261127_project_pipeline.sql', '20261127_quote_proposal_decisions.sql', '20261128_auth_rate_buckets.sql',
      '20261129_quote_proposal_workflow.sql', '20261130_commercial_flow.sql',
    ]
    for (const file of ['schema.sql', ...migrations.map(name => 'migrations/' + name)]) {
      await pg.exec(await fs.readFile(path.join(database, file), 'utf8'))
    }
    const adapt = client => ({ query: async (sql, args) => (await client.query(sql, args)).rows, transaction: fn => pg.transaction(tx => fn(adapt(tx))) })
    const db = adapt(pg)
    const [{ id: org }] = await db.query("INSERT INTO organizations(name) VALUES('Estúdio Horizonte') RETURNING id")
    const [{ id: userId }] = await db.query("INSERT INTO users(organization_id,email) VALUES($1,'owner@example.invalid') RETURNING id", [org])
    const [{ id: clientId }] = await db.query("INSERT INTO clients(organization_id,name) VALUES($1,'Casa Lume') RETURNING id", [org])
    const session = { id: userId, organizationId: org, name: 'Responsável de teste', email: 'owner@example.invalid', role: 'owner' }
    const isOwner = request => request.get('X-Test-Session') === 'owner'
    const authenticate = (request, res, next) => {
      if (!isOwner(request)) return res.status(401).json({ error: 'Sessão sintética ausente' })
      request.user = { userId, organizationId: org, role: 'owner' }
      next()
    }
    const app = express()
    app.use(prefix, createCommercialRouter(db, authenticate, {
      organizationIds: new Set([org]), secret: 'synthetic-browser-only-secret-with-32-bytes',
    }))
    app.get('/api/auth/session', (req, res) => res.json(isOwner(req) ? { user: session } : {}))
    app.get('/api/v1/health', (_req, res) => res.json({ status: 'ok' }))
    app.get('/api/v1/clients', authenticate, async (_req, res) => res.json(await db.query('SELECT id,name FROM clients WHERE organization_id=$1', [org])))
    app.get('/api/events', (_req, res) => res.type('text/event-stream').send(': teste\n\n'))
    app.get(['/api/v1/crm/notifications', '/api/v1/quote-models'], authenticate, (_req, res) => res.json([]))
    app.use('/api', (_req, res) => res.status(404).json({ error: 'Rota fora do escopo deste teste' }))
    app.get('/proposta', (_req, res) => res.set({
      'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow, noarchive', 'Referrer-Policy': 'no-referrer',
    }).sendFile(path.join(dist, 'index.html')))
    app.use(express.static(dist))
    app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')))
    server = app.listen(0, '127.0.0.1')
    await once(server, 'listening')
    port = server.address().port
    const origin = 'http://127.0.0.1:' + port
    browser = await chromium.launch({ headless: true, executablePath: process.env.ABELHA_BROWSER_EXECUTABLE })
    const owner = await browser.newContext({
      extraHTTPHeaders: { 'X-Test-Session': 'owner' }, viewport: { width: 1440, height: 1000 },
      reducedMotion: 'reduce', permissions: ['clipboard-read', 'clipboard-write'],
    })
    const external = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })
    for (const context of [owner, external]) await context.route('**/*', route =>
      route.request().url().startsWith(origin + '/') ? route.continue() : route.abort())
    const admin = await owner.newPage()
    const guest = await external.newPage()
    for (const page of [admin, guest]) page.setDefaultTimeout(12_000)
    const errors = []
    for (const page of [admin, guest]) page.on('pageerror', error => errors.push(error.message))
    const guestPaths = []
    guest.on('request', request => guestPaths.push(new URL(request.url()).pathname))

    await admin.goto(origin + '/?view=quote-models')
    await admin.getByRole('heading', { name: 'Cliente e projeto' }).waitFor()
    const clientSelect = admin.getByRole('combobox', { name: 'Cliente', exact: true })
    await clientSelect.getByRole('option', { name: 'Casa Lume', exact: true }).waitFor({ state: 'attached' })
    await clientSelect.selectOption({ label: 'Casa Lume' })
    await admin.getByLabel('Nome do projeto').fill('Site e automação para a Casa Lume')
    await admin.getByLabel('Objetivo do projeto').fill('Facilitar a consulta ao catálogo e organizar pedidos de orçamento.')
    await admin.getByLabel('Briefing', { exact: true }).fill('A Casa Lume reúne produtos e oficinas de iluminação. O projeto concentra as informações em um site e registra pedidos em um fluxo de atendimento.')
    await admin.getByLabel('Site', { exact: true }).check()
    await admin.getByLabel('Automação', { exact: true }).check()
    const scope = admin.getByText('Detalhar escopo', { exact: false })
    if (await scope.count()) await scope.first().click()
    const dependency = admin.getByLabel('Dependências e observações')
    if (!await dependency.isVisible()) await admin.getByText('Requisitos, prazos e entregáveis', { exact: false }).first().click()
    await dependency.fill('Aprovação da identidade visual e entrega das fotos de catálogo.')
    await admin.getByLabel('Entregáveis', { exact: true }).fill('Site responsivo com catálogo, formulário e automação de triagem de pedidos.')
    await admin.getByLabel('Prazo estimado').fill('4 semanas após a entrega dos materiais.')
    await admin.getByLabel('Investimento base (R$)').fill('4800')
    await admin.getByLabel('Mensalidade base (R$)').fill('180')
    await admin.getByLabel('Entrada (R$)').fill('1200')
    await admin.getByLabel('Parcelas do saldo').fill('3')
    await admin.getByLabel('Condições de pagamento').fill('Saldo parcelado em três pagamentos após a entrada.')
    await admin.getByRole('button', { name: 'Revisar orçamento' }).click()
    await admin.getByRole('button', { name: 'Gerar proposta' }).click()
    await admin.getByRole('heading', { name: 'Site e automação para a Casa Lume' }).waitFor()
    await admin.getByLabel('Título da capa').fill('Uma nova vitrine para a Casa Lume')
    await admin.getByLabel('Nome da marca').fill('Estúdio Horizonte')
    await admin.getByLabel('Solução proposta', { exact: true }).fill('Catálogo responsivo integrado a um fluxo de triagem para organizar os pedidos recebidos.')
    await admin.getByLabel('Metodologia', { exact: true }).fill('Validar conteúdo, apresentar a primeira versão e testar o fluxo com pedidos sintéticos.')
    await admin.getByLabel('Próximos passos').fill('Revise o escopo e confirme a proposta para receber o contrato.')
    await admin.getByRole('button', { name: 'Salvar rascunho' }).click()
    await admin.getByText('Apresentação salva', { exact: true }).waitFor()
    await admin.getByRole('button', { name: 'Publicar proposta', exact: true }).click()
    await admin.getByRole('button', { name: 'Publicar e gerar link' }).click()
    const publishedLink = admin.getByLabel('Link exclusivo da proposta')
    await publishedLink.waitFor()
    const link = await publishedLink.inputValue()
    const proposalURL = new URL(link)
    assert.equal(proposalURL.pathname, '/proposta')
    assert.equal(proposalURL.search, '')
    await guest.goto(link).catch(() => { throw new Error('A proposta pública não abriu') })
    await guest.getByRole('heading', { name: 'Uma nova vitrine para a Casa Lume' }).waitFor()
    assert.equal(await guest.getByRole('navigation', { name: 'Navegação principal' }).count(), 0)
    assert.equal(guestPaths.some(value => value.startsWith('/api/auth/')), false)
    await saveNavigableExample(guest)
    const demonstration = await browser.newContext({ offline: true, viewport: { width: 390, height: 900 } })
    try {
      const example = await demonstration.newPage()
      await example.goto(pathToFileURL(path.join(output, 'proposta-casa-lume.html')).href)
      await example.getByRole('link', { name: 'Investimento', exact: true }).click()
      assert.match(new URL(example.url()).hash, /investimento$/)
      await noOverflow(example, 390)
    } finally { await demonstration.close() }
    for (const width of widths) {
      await guest.setViewportSize({ width, height: 900 })
      await noOverflow(guest, width)
      if ([390, 1440].includes(width)) await guest.screenshot({ path: path.join(output, 'proposta-' + width + '.png') })
    }
    await guest.setViewportSize({ width: 390, height: 900 })
    await guest.getByRole('button', { name: 'Ativar tema claro' }).click()
    await guest.reload()
    await guest.getByRole('button', { name: 'Ativar tema escuro' }).waitFor()
    await noOverflow(guest, 390)
    await guest.screenshot({ path: path.join(output, 'proposta-clara-390.png') })
    await guest.getByRole('button', { name: 'Ativar tema escuro' }).click()
    await guest.setViewportSize({ width: 1440, height: 1000 })
    await guest.getByRole('button', { name: 'Explorar proposta' }).press('Enter')
    assert.equal(await guest.evaluate(() => document.activeElement?.dataset.offerSection), 'visao')
    await guest.keyboard.press('ArrowRight')
    assert.equal(await guest.evaluate(() => document.activeElement?.dataset.offerSection), 'escopo')
    await guest.getByRole('button', { name: 'Investimento', exact: true }).click()
    await guest.getByRole('heading', { name: 'Investimento e condições' }).waitFor()
    await guest.getByText(/4\.800,00/).waitFor()
    await guest.screenshot({ path: path.join(output, 'investimento.png') })
    await guest.evaluate(() => {
      window.print = () => {
        if (window.location.hash) throw new Error('O cabeçalho de impressão não deve expor o fragmento do link')
        window.dispatchEvent(new Event('afterprint'))
      }
    })
    await guest.getByRole('button', { name: 'Salvar em PDF', exact: true }).click()
    assert.equal(new URL(guest.url()).hash, proposalURL.hash)
    await guest.pdf({ path: path.join(output, 'proposta-casa-lume.pdf'), preferCSSPageSize: true, printBackground: true, tagged: true })
    await admin.getByRole('button', { name: 'Registrar envio' }).click()
    await admin.getByText(/Envio registrado ·/).waitFor()

    await guest.getByRole('button', { name: 'Confirmar proposta e seguir para o contrato' }).click()
    await guest.getByLabel('Nome do representante autorizado').fill('Representante de teste')
    await guest.getByRole('checkbox').check()
    await guest.getByRole('button', { name: 'Registrar aceite' }).click()
    await guest.getByText(/Proposta aceita em/).waitFor()
    await guest.screenshot({ path: path.join(output, 'aceite.png') })
    await admin.reload()
    await admin.getByRole('heading', { name: 'Contrato', exact: true }).waitFor()
    assert.equal(await admin.getByRole('button', { name: 'Abrir planejamento' }).count(), 0)
    await admin.getByLabel('Identificação das partes, obrigações e cláusulas aprovadas').fill('Exemplo sintético de revisão do instrumento. As partes conferem escopo, dependências, prazos e condições de pagamento antes de enviar para assinatura externa.')
    await admin.getByRole('button', { name: 'Salvar contrato', exact: true }).click()
    await admin.getByText('Rascunho do contrato salvo', { exact: true }).waitFor()
    await admin.getByLabel('Revisei a identificação das partes, os dados herdados e as cláusulas desta versão.').check()
    await admin.getByRole('button', { name: 'Disponibilizar contrato' }).click()
    await admin.getByRole('status').filter({ hasText: 'Contrato disponibilizado' }).waitFor()
    await guest.reload()
    await guest.getByRole('button', { name: 'Ver contrato' }).click()
    await guest.getByRole('heading', { name: /Contrato · Site e automação/ }).waitFor()
    await guest.getByText(/4\.800,00/).waitFor()
    await guest.getByLabel('Nome do representante autorizado').fill('Representante de teste')
    await guest.getByRole('checkbox').check()
    await guest.getByRole('button', { name: 'Registrar ciência' }).click()
    await guest.getByText(/Ciência registrada\./).waitFor()
    await guest.screenshot({ path: path.join(output, 'contrato-e-ciencia.png') })
    const contract = await guest.pdf({ path: path.join(output, 'contrato-casa-lume.pdf'), preferCSSPageSize: true, printBackground: true, tagged: true })
    await admin.getByLabel('Contrato assinado externamente').setInputFiles({
      name: 'evidencia-sintetica.pdf', mimeType: 'application/pdf', buffer: contract,
    })
    await admin.getByLabel(/Conferi a assinatura externa/).check()
    await admin.getByRole('button', { name: 'Formalizar e criar projeto' }).click()
    await admin.getByText('Formalização registrada e projeto criado', { exact: true }).waitFor()
    await admin.getByRole('button', { name: 'Abrir planejamento' }).click()
    await admin.getByRole('heading', { name: 'Próxima ação' }).waitFor()
    await admin.getByText('Solicitar materiais e informações pendentes', { exact: true }).first().waitFor()
    await admin.getByRole('button', { name: 'Gerar prompt de desenvolvimento' }).click()
    await admin.getByText('Prompt gerado', { exact: true }).waitFor()
    await admin.getByLabel('Escopo do prompt').selectOption('next_task')
    await admin.getByRole('button', { name: 'Gerar prompt de desenvolvimento' }).click()
    await admin.getByText('Prompt gerado', { exact: true }).waitFor()
    const generated = await admin.getByLabel('Prompt para revisão').inputValue()
    assert.match(generated, /identidade visual/i)
    assert.doesNotMatch(generated, /4800|480000|owner@example\.invalid/)
    await fs.writeFile(path.join(output, 'prompt-proxima-tarefa.txt'), generated + '\n')
    await admin.screenshot({ path: path.join(output, 'planejamento.png'), fullPage: true })

    const rejected = await owner.request.post(origin + prefix + '/proposals', {
      headers: { 'X-Abelha-Client': 'web' }, data: {
        clientId, title: 'Proposta alternativa para teste de recusa', briefing: 'Exemplo sintético de uma venda recusada.',
        model: { version: 1, name: 'Exemplo', baseCents: 100000, monthlyCents: 0, discountBps: 0, lines: [] }, quantities: {},
        presentation: { intro: '<marcador>Texto de exemplo</marcador>' },
      },
    })
    assert.equal(rejected.status(), 201)
    const refusedDraft = await rejected.json()
    const refusedPath = prefix + '/proposals/' + refusedDraft.id
    const publish = await owner.request.post(origin + refusedPath + '/publish', {
      headers: { 'X-Abelha-Client': 'web' }, data: { revision: refusedDraft.revision, validDays: 15 },
    })
    assert.equal(publish.status(), 201)
    const refusedVersion = await publish.json()
    await guest.goto(origin + '/proposta#' + refusedVersion.token).catch(() => { throw new Error('A segunda proposta pública não abriu') })
    await guest.getByRole('heading', { name: 'Proposta alternativa para teste de recusa' }).waitFor()
    await guest.getByText('<marcador>Texto de exemplo</marcador>', { exact: true }).waitFor()
    assert.equal(await guest.locator('marcador').count(), 0)
    await guest.getByRole('button', { name: 'Não confirmar proposta' }).click()
    await guest.getByLabel('Motivo (opcional)').fill('A contratação foi adiada no cenário de teste.')
    await guest.getByRole('checkbox').check()
    await guest.getByRole('button', { name: 'Registrar recusa' }).click()
    await guest.getByText('Recusa registrada. Obrigado pelo retorno.', { exact: true }).waitFor()
    await guest.screenshot({ path: path.join(output, 'recusa.png') })
    const refused = await (await owner.request.get(origin + refusedPath)).json()
    assert.equal(refused.status, 'refused')
    assert.equal(refused.project_id, null)
    await admin.goto(origin + '/?view=proposals')
    await admin.getByRole('button', { name: /Proposta alternativa.*Recusada/ }).waitFor()
    assert.deepEqual(errors, [])
    await fs.writeFile(path.join(output, 'validacao.json'), JSON.stringify({
      status: 'PASS', widths, data: 'PGlite descartável com sessão administrativa sintética',
      accepted: true, refused: true, contractAcknowledged: true, contractFormalizedWithSyntheticPdf: true, projectCreated: true,
      generatedPrompt: true, publicWithoutSession: true, production: false,
    }, null, 2) + '\n')
    console.log('PASS fluxo comercial em navegador, seis larguras, proposta e contrato em PDF')
  } finally {
    try { await browser?.close() } finally {
      try {
        if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)) }
      } finally { await pg.close() }
    }
    if (port) {
      await assert.rejects(fetch('http://127.0.0.1:' + port + '/api/v1/health', { signal: AbortSignal.timeout(1000) }))
      console.log('Porta temporária liberada: ' + port)
    }
  }
}

run().catch(error => {
  const message = String(error.message).replace(/(\/proposta#)[A-Za-z0-9_-]{43}/g, '$1[omitido]')
  console.error(message)
  process.exitCode = 1
})
