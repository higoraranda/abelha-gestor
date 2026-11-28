import assert from 'node:assert/strict'
import { once } from 'node:events'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import express from 'express'
import { PGlite } from '@electric-sql/pglite'
import { PGLiteSocketServer } from '@electric-sql/pglite-socket'
import postgres from 'postgres'
import { createCrmRouter } from '../routes/crm'
import { createQuoteModelsRouter } from '../routes/quote-models'
import { postgresDatabase } from './platform-db'
import type { Database } from './platform-db'

test('commercial snapshots, decisions, contract evidence and contracted work stay versioned and scoped', async () => {
  const pg = new PGlite()
  let server: ReturnType<express.Express['listen']> | undefined
  let socket: PGLiteSocketServer | undefined
  let sql: ReturnType<typeof postgres> | undefined
  try {
    const { createCommercialRouter } = require('../routes/commercial') as {
      createCommercialRouter: (db: Database, auth: express.RequestHandler, settings: unknown) => express.Router
    }
    for (const file of [
      'schema.sql', 'migrations/20261105_personal_crm.sql', 'migrations/20261111_personal_platform.sql',
      'migrations/20261126_quote_proposals.sql', 'migrations/20261127_project_pipeline.sql',
      'migrations/20261127_quote_proposal_decisions.sql', 'migrations/20261128_auth_rate_buckets.sql',
      'migrations/20261129_quote_proposal_workflow.sql', 'migrations/20261130_commercial_flow.sql',
    ]) await pg.exec(readFileSync('src/db/' + file, 'utf8'))
    socket = new PGLiteSocketServer({ db: pg, host: '127.0.0.1', port: 0 })
    await socket.start()
    sql = postgres('postgresql://postgres:postgres@' + socket.getServerConn() + '/postgres', { ssl: false, max: 1 })
    const db = postgresDatabase(sql)
    const [{ id: org }] = await db.query("INSERT INTO organizations(name) VALUES('Ateliê de teste') RETURNING id")
    const [{ id: user }] = await db.query("INSERT INTO users(organization_id,email) VALUES($1,'example@example.invalid') RETURNING id", [org])
    const [{ id: other }] = await db.query("INSERT INTO users(organization_id,email) VALUES($1,'other@example.invalid') RETURNING id", [org])
    const [{ id: external }] = await db.query("INSERT INTO organizations(name) VALUES('Organização externa') RETURNING id")
    const [{ id: client }] = await db.query("INSERT INTO clients(organization_id,name) VALUES($1,'Cliente sintético') RETURNING id", [org])
    const app = express()
    app.use(express.json())
    const authenticate: express.RequestHandler = (req, _res, next) => {
      const identity = req.get('X-Test-Identity')
      if (identity) {
        req.organizationId = identity === 'external' ? external : org
        req.user = {
          organizationId: req.organizationId!,
          userId: identity === 'other' ? other : user,
          role: identity === 'member' ? 'member' : 'owner',
        }
      }
      next()
    }
    const settings = { organizationIds: new Set<string>([org]), secret: 'synthetic-only-secret-with-at-least-32-characters' }
    app.use('/commercial', createCommercialRouter(db, authenticate, settings))
    app.use('/crm', createCrmRouter(sql, [authenticate], settings))
    app.use('/legacy', createQuoteModelsRouter(db, authenticate))
    server = app.listen(0, '127.0.0.1')
    await once(server, 'listening')
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('Expected loopback port')
    const port = address.port
    async function request(path: string, method = 'GET', data?: unknown, identity = 'owner') {
      const res = await fetch('http://127.0.0.1:' + port + (path.startsWith('/crm') || path.startsWith('/legacy') ? path : '/commercial' + path), {
        method, headers: { 'Content-Type': 'application/json', 'X-Abelha-Client': 'web', 'X-Test-Identity': identity },
        body: data === undefined ? undefined : JSON.stringify(data),
      })
      return { status: res.status, data: await res.json() as any, cache: res.headers.get('cache-control') }
    }
    const draft = {
      clientId: client, title: 'Site e automação de atendimento', briefing: 'Publicar os serviços e organizar os pedidos.',
      terms: 'Entrada antes da implementação.',
      model: { version: 1, name: 'modelo sintético', baseCents: 350000, monthlyCents: 6000, discountBps: 1000,
        lines: [{ id: 'opcional', label: 'Treinamento extra', unit: 'fixed', period: 'once', priceCents: 60000 }] },
      quantities: { opcional: 1000 },
      commercial: { serviceTypes: ['site', 'automation'], optionalItems: ['opcional'], dependencies: 'Identidade visual', payment: { downPaymentCents: 50000, installments: 3 } },
    }
    assert.deepEqual(await request('/access', 'GET', undefined, 'member').then(r => r.data), { enabled: false })
    assert.equal((await request('/proposals', 'POST', draft, 'external')).status, 403)
    assert.equal((await request('/proposals', 'POST', { ...draft, quote: { oneTimeCents: 1 } })).status, 400)
    const initial = await request('/proposals', 'POST', draft)
    assert.equal(initial.status, 201, JSON.stringify(initial))
    assert.equal(initial.data.quote.oneTimeCents, 315000)
    assert.equal(initial.data.quote.lines[0].amountCents, 60000)
    const path = '/proposals/' + initial.data.id
    assert.equal((await request(path, 'GET', undefined, 'other')).status, 404)
    assert.equal((await request('/legacy' + path + '/approve', 'POST', { confirmed: true })).status, 404)
    const first = await request(path + '/publish', 'POST', { revision: 1, validDays: 15 })
    assert.equal(first.status, 201, JSON.stringify(first))
    assert.match(first.data.token, /^[A-Za-z0-9_-]{43}$/)
    const firstPublic = await request('/public/read', 'POST', { token: first.data.token }, '')
    assert.equal(firstPublic.status, 200, JSON.stringify(firstPublic))
    assert.equal(firstPublic.cache, 'no-store')
    assert.equal(firstPublic.data.version.snapshot.quote.oneTimeCents, 315000)
    assert.equal(firstPublic.data.version.snapshot.client_id, undefined)
    assert.equal((await request(path + '/versions/' + first.data.version.id + '/sent', 'POST', {})).status, 200)
    const edited = await request(path, 'PATCH', { ...draft, revision: 1, title: 'Escopo refinado' })
    assert.equal(edited.status, 200, JSON.stringify(edited))
    assert.equal((await request(path + '/versions/' + first.data.version.id)).data.snapshot.title, draft.title)
    const second = await request(path + '/publish', 'POST', { revision: edited.data.revision, validDays: 30 })
    assert.equal(second.status, 201, JSON.stringify(second))
    assert.equal((await request('/public/read', 'POST', { token: first.data.token }, '')).status, 404)
    const unpublished = await request(path, 'PATCH', { revision: edited.data.revision, title: 'Alteração não publicada', model: { ...draft.model, baseCents: 420000 } })
    assert.equal(unpublished.status, 200)
    assert.equal(unpublished.data.quote.oneTimeCents, 378000)
    const decision = (decision: string) => request('/public/decision', 'POST', { token: second.data.token, versionId: second.data.version.id, decision, confirmed: true, representativeName: 'Pessoa sintética' }, '')
    const [accepted, refused] = await Promise.all([decision('accept'), decision('accept')])
    assert.equal(accepted.status, 200, JSON.stringify(accepted))
    assert.equal(refused.status, 200, JSON.stringify(refused))
    assert.equal((await decision('refuse')).status, 409)
    const draftContract = (await request(path)).data.contract
    assert.equal(draftContract.status, 'draft')
    assert.equal((await request(path)).data.project_id, null)
    assert.equal((await request(path + '/contract/publish', 'POST', { version: draftContract.version, reviewed: false })).status, 400)
    const reviewed = await request(path + '/contract', 'PATCH', { version: draftContract.version, title: 'Instrumento de teste', clauses: 'Cláusulas de teste revisadas para este cenário.' })
    assert.equal(reviewed.status, 200, JSON.stringify(reviewed))
    const published = await request(path + '/contract/publish', 'POST', { version: reviewed.data.version, reviewed: true })
    assert.equal(published.status, 200, JSON.stringify(published))
    assert.equal((await request('/public/read', 'POST', { token: second.data.token }, '')).data.contract.title, 'Instrumento de teste')
    const formalization = { version: published.data.version, confirmed: true, evidenceBase64: Buffer.from('%PDF-1.4\nTeste sintético\n%%EOF').toString('base64'), fileName: 'evidencia-teste.pdf' }
    const formalized = await request(path + '/contract/formalize', 'POST', formalization)
    assert.equal(formalized.status, 200, JSON.stringify(formalized))
    assert.equal((await request(path + '/contract/formalize', 'POST', formalization)).data.project_id, formalized.data.project_id)
    const projectPath = '/projects/' + formalized.data.project_id
    const project = await request(projectPath)
    assert.equal(project.status, 200, JSON.stringify(project))
    assert.ok(project.data.tasks.some((task: any) => task.title.includes('site')))
    assert.ok(project.data.tasks.some((task: any) => task.title.includes('automação')))
    assert.match(project.data.next_action.title, /materiais/i)
    assert.equal((await request(projectPath, 'GET', undefined, 'other')).status, 404)
    const board = await request('/crm/tasks?projectId=' + formalized.data.project_id)
    assert.equal(board.status, 200, JSON.stringify(board))
    assert.equal(board.data.total, project.data.tasks.length)
    assert.ok(board.data.items.every((task: any) => task.client_name === 'Cliente sintético'))
    const isolated = await request('/crm/tasks?projectId=' + formalized.data.project_id, 'GET', undefined, 'other')
    assert.equal(isolated.data.total, 0)
    assert.equal((await request('/crm/tasks/' + project.data.next_action.id, 'PATCH', { status: 'done' })).status, 409)
    assert.equal((await request('/crm/tasks/' + project.data.next_action.id, 'PATCH', { status: 'done' }, 'other')).status, 404)
    const custom = await request('/crm/tasks', 'POST', { project_id: formalized.data.project_id, title: 'Revisar documentação' })
    assert.equal(custom.status, 201, JSON.stringify(custom))
    const prompt = await request(projectPath + '/prompts', 'POST', { scope: 'next_task' })
    assert.equal(prompt.status, 201, JSON.stringify(prompt))
    assert.match(prompt.data.content, /Identidade visual/)
    assert.doesNotMatch(prompt.data.content, /315000|60000/)
    assert.equal((await request(path)).data.events.filter((e: any) => e.type === 'accepted').length, 1)
    const revoked = await request(path + '/versions/' + second.data.version.id + '/revoke', 'POST', {})
    assert.equal(revoked.data.status, 'accepted')
    assert.equal(revoked.data.link_state, 'revoked')
    assert.equal((await request('/public/read', 'POST', { token: second.data.token }, '')).status, 404)
    assert.equal((await request(path)).data.status, 'formalized')
    assert.equal((await request('/public/read', 'POST', { token: 'A'.repeat(43) }, '')).status, 404)
    const refusedDraft = await request('/proposals', 'POST', draft)
    const refusedPath = '/proposals/' + refusedDraft.data.id
    const refusedVersion = await request(refusedPath + '/publish', 'POST', { revision: 1, validDays: 6 })
    assert.equal((await request('/public/decision', 'POST', { token: refusedVersion.data.token, versionId: refusedVersion.data.version.id, decision: 'refuse', confirmed: true, reason: 'Fora do planejamento.' }, '')).status, 200)
    const refusedProposal = (await request(refusedPath)).data
    assert.equal(refusedProposal.status, 'refused')
    assert.equal(refusedProposal.contract, null)
    assert.equal(refusedProposal.project_id, null)
    const pipeline = await request('/proposals')
    assert.equal(pipeline.status, 200)
    assert.equal(pipeline.data[0].status, 'refused')
    assert.equal(pipeline.data[0].versions[0].status, 'refused')
    assert.equal(pipeline.data[1].status, 'formalized')
    assert.equal(pipeline.data[1].contract.has_evidence, true)
    assert.equal(pipeline.data[1].quote.oneTimeCents, 315000)
    assert.equal(pipeline.data[1].title, 'Escopo refinado')
    assert.equal((await request('/proposals', 'GET', undefined, 'other')).data.length, 0)
    const negotiated = await request(refusedPath, 'PATCH', { ...draft, revision: 1, title: 'Escopo renegociado' })
    assert.equal(negotiated.status, 200, JSON.stringify(negotiated))
    const expired = await request(refusedPath + '/publish', 'POST', { revision: 2, validDays: 7 })
    await db.query("UPDATE commercial_proposal_versions SET published_at=now()-interval '2 days',expires_at=now()-interval '1 day' WHERE id=$1", [expired.data.version.id])
    assert.equal((await request('/public/read', 'POST', { token: expired.data.token }, '')).status, 404)
    assert.equal((await request(refusedPath)).data.status, 'expired')
  } finally {
    await new Promise<void>(resolve => server ? server.close(() => resolve()) : resolve())
    await sql?.end({ timeout: 1 })
    await socket?.stop()
    await pg.close()
  }
})
