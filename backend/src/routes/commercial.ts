import express, { Router, type ErrorRequestHandler, type Request, type RequestHandler } from 'express'
import { db } from '../db'
import { authMiddleware } from '../middleware/auth'
import { mutationGuard } from '../middleware/mutation-guard'
import { InputError, uuid } from '../services/personal'
import { postgresDatabase, type Database } from '../services/platform-db'
import { createSharedCredentialBudget } from '../services/shared-credential-budget'
import { bounded, draftFields, integer, object, parseDraft, pdfEvidence, projectPrompt, publicToken, sha, unavailable, validPublicToken } from '../services/commercial'
import {
  acceptedVersion, clientName, commercialEnabled, commercialSettings, contractForVersion, contractedProject,
  createContractDraft, createContractedProject, draftValues, fromStoredDraft, publicContract, publish, publicVersion,
  listCommercialProposals, quoteColumns, quoteDetails, quoteDraft, quoteVersion, recordEvent, safeVersion, type CommercialScope,
} from '../services/commercial-store'
import { endpoint } from './personal'

const draftSet = 'client_id=$4,client_name=$5,title=$6,briefing=$7,model=$8::text::jsonb,quantities=$9::text::jsonb,quote=$10::text::jsonb,terms=$11,commercial=$12::text::jsonb,presentation=$13::text::jsonb,proposal_text=$14'
const positiveVersion = (value: unknown) => integer(value, 1, 2_147_483_646, 'Versão')

function userScope(req: Request): CommercialScope {
  return { org: req.user!.organizationId, user: req.user!.userId }
}

function tokenFrom(value: unknown) {
  if (!validPublicToken(value)) throw unavailable()
  return value
}

export function createCommercialRouter(database: Database = postgresDatabase(db), authenticate: RequestHandler = authMiddleware, settings = commercialSettings()) {
  const router = Router()
  const publicRouter = Router()
  const normalJson = express.json({ limit: '80kb' })
  const evidenceJson = express.json({ limit: '3mb' })
  const budget = Buffer.byteLength(settings.secret, 'utf8') >= 32
    ? createSharedCredentialBudget(database, settings.secret, 'commercial') : null
  router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store')
    res.set('X-Robots-Tag', 'noindex, nofollow, noarchive')
    res.set('Referrer-Policy', 'no-referrer')
    res.set('X-Content-Type-Options', 'nosniff')
    next()
  })
  publicRouter.use(normalJson, (req, res, next) => {
    if (!budget || !settings.organizationIds.size) { res.status(404).json({ error: unavailable().message }); return }
    const token = req.body?.token
    const identity = validPublicToken(token) ? token : 'invalid'
    void budget.reserve(identity).then(granted => {
      if (granted) next()
      else res.set('Retry-After', '60').status(429).json({ error: 'Muitas tentativas. Aguarde e tente novamente.' })
    }).catch(() => res.status(503).json({ error: 'A consulta está temporariamente indisponível.' }))
  })
  publicRouter.post('/read', endpoint(async (req, res) => {
    const body = object(req.body, ['token'])
    const token = tokenFrom(body.token)
    const result = await database.transaction(async tx => {
      const { scope, proposalId, version } = await publicVersion(tx, token, settings)
      if (!version.viewed_at) {
        await tx.query('UPDATE commercial_proposal_versions SET viewed_at=now() WHERE organization_id=$1 AND user_id=$2 AND id=$3', [scope.org, scope.user, version.id])
        await recordEvent(tx, scope, version.id, 'viewed')
      }
      return { version: safeVersion(await quoteVersion(tx, scope, proposalId, version.id)),
        contract: version.decision === 'accepted' ? publicContract(await contractForVersion(tx, scope, version.id)) : null }
    })
    res.json(result)
  }))
  publicRouter.post('/decision', endpoint(async (req, res) => {
    const body = object(req.body, ['token', 'versionId', 'decision', 'confirmed', 'representativeName', 'reason'])
    const token = tokenFrom(body.token)
    const versionId = uuid(body.versionId)
    if (body.confirmed !== true || (body.decision !== 'accept' && body.decision !== 'refuse')) throw new InputError('Confirme a decisão sobre a proposta.')
    const accepted = body.decision === 'accept'
    const state = accepted ? 'accepted' : 'refused'
    const details = accepted
      ? { representativeName: bounded(body.representativeName, 140, 'Nome do representante') }
      : { reason: body.reason === undefined ? '' : bounded(body.reason, 1500, 'Motivo', false) }
    const result = await database.transaction(async tx => {
      const { scope, proposalId, version } = await publicVersion(tx, token, settings, versionId)
      if (version.decision !== state) {
        if (version.decision !== 'published') throw new InputError('Esta versão já possui uma decisão comercial.', 409)
        if (accepted && await acceptedVersion(tx, scope, proposalId)) throw new InputError('A contratação já possui proposta aceita.', 409)
        await tx.query('UPDATE commercial_proposal_versions SET status=$4,decided_at=now() WHERE organization_id=$1 AND user_id=$2 AND id=$3', [scope.org, scope.user, versionId, state])
        await tx.query("UPDATE quote_proposals SET status=$4,approved_at=CASE WHEN $4='approved' THEN now() END,refused_at=CASE WHEN $4='refused' THEN now() END,updated_at=now() WHERE organization_id=$1 AND user_id=$2 AND id=$3", [scope.org, scope.user, proposalId, accepted ? 'approved' : 'refused'])
        if (accepted) await createContractDraft(tx, scope, version)
        await recordEvent(tx, scope, versionId, state, details)
      }
      return { version: safeVersion(await quoteVersion(tx, scope, proposalId, versionId)),
        contract: publicContract(await contractForVersion(tx, scope, versionId)) }
    })
    res.json(result)
  }))
  publicRouter.post('/contract/acknowledge', endpoint(async (req, res) => {
    const body = object(req.body, ['token', 'versionId', 'contractVersion', 'confirmed', 'representativeName'])
    const token = tokenFrom(body.token), versionId = uuid(body.versionId), contractVersion = positiveVersion(body.contractVersion)
    if (body.confirmed !== true) throw new InputError('Confirme a leitura e o aceite eletrônico do documento.')
    const representativeName = bounded(body.representativeName, 140, 'Nome do representante')
    const result = await database.transaction(async tx => {
      const { scope, version } = await publicVersion(tx, token, settings, versionId)
      if (version.decision !== 'accepted') throw unavailable()
      const row = await contractForVersion(tx, scope, version.id)
      if (!row || row.version !== contractVersion || row.status === 'draft') throw unavailable()
      if (!row.acknowledged_at) {
        if (row.status !== 'published') throw new InputError('A formalização já está concluída.', 409)
        await tx.query('UPDATE commercial_contracts SET acknowledged_at=now() WHERE organization_id=$1 AND user_id=$2 AND id=$3', [scope.org, scope.user, row.id])
        await recordEvent(tx, scope, version.id, 'contract_acknowledged', { representativeName, contractVersion })
      }
      return publicContract(await contractForVersion(tx, scope, version.id))
    })
    res.json({ contract: result })
  }))
  publicRouter.use((_req, res) => { res.status(404).json({ error: unavailable().message }) })
  router.use('/public', publicRouter)

  router.use(authenticate, mutationGuard)
  const enabled = (req: Request) => !!req.user?.userId && req.user.role === 'owner' && commercialEnabled(settings, req.user.organizationId)
  router.get('/access', (req, res) => { res.json({ enabled: enabled(req) }) })
  router.use((req, res, next) => {
    if (!enabled(req)) { res.status(403).json({ error: 'Fluxo comercial indisponível nesta conta.' }); return }
    if (req.method === 'POST' && /^\/proposals\/[^/]+\/contract\/formalize\/?$/.test(req.path)) evidenceJson(req, res, next)
    else normalJson(req, res, next)
  })
  router.get('/proposals', endpoint(async (req, res) => {
    res.json(await listCommercialProposals(database, userScope(req)))
  }))
  router.post('/proposals', endpoint(async (req, res) => {
    const scope = userScope(req)
    const { draftKey, ...payload } = object(req.body, [...draftFields, 'draftKey'])
    const parsed = parseDraft(payload)
    const key = draftKey === undefined ? null : uuid(draftKey)
    const result = await database.transaction(async tx => {
      const values = draftValues(parsed, await clientName(tx, scope.org, parsed.clientId))
      const [created] = await tx.query('INSERT INTO quote_proposals(organization_id,user_id,client_id,client_name,title,briefing,model,quantities,quote,terms,commercial,presentation,proposal_text,draft_key,updated_at) ' +
        'VALUES($1,$2,$3,$4,$5,$6,$7::text::jsonb,$8::text::jsonb,$9::text::jsonb,$10,$11::text::jsonb,$12::text::jsonb,$13,$14,now()) ON CONFLICT(organization_id,user_id,draft_key) DO NOTHING RETURNING ' + quoteColumns, [scope.org, scope.user, ...values, key])
      const [existing] = created ? [created] : await tx.query('SELECT ' + quoteColumns + ' FROM quote_proposals WHERE organization_id=$1 AND user_id=$2 AND draft_key=$3', [scope.org, scope.user, key])
      return { created: !!created, row: await quoteDetails(tx, scope, existing) }
    })
    res.status(result.created ? 201 : 200).json({ ...result.row, replayed: !result.created })
  }))
  router.get('/proposals/:id', endpoint(async (req, res) => {
    const scope = userScope(req)
    res.json(await quoteDetails(database, scope, await quoteDraft(database, scope, uuid(req.params.id))))
  }))
  router.patch('/proposals/:id', endpoint(async (req, res) => {
    const scope = userScope(req), id = uuid(req.params.id)
    const { revision, ...payload } = object(req.body, [...draftFields, 'revision'])
    const requiredRevision = positiveVersion(revision)
    if (!Object.keys(payload).length) throw new InputError('Informe quais dados deseja atualizar.')
    const result = await database.transaction(async tx => {
      const row = await quoteDraft(tx, scope, id, true)
      if (row.revision !== requiredRevision) throw new InputError('O orçamento mudou em outra sessão. Abra a revisão atual.', 409)
      if (await acceptedVersion(tx, scope, id)) throw new InputError('O orçamento aceito já está vinculado à contratação.', 409)
      const parsed = parseDraft({ ...fromStoredDraft(row), ...payload })
      const values = draftValues(parsed, await clientName(tx, scope.org, parsed.clientId))
      const [updated] = await tx.query('UPDATE quote_proposals SET ' + draftSet + ',revision=revision+1,updated_at=now() WHERE organization_id=$1 AND user_id=$2 AND id=$3 RETURNING ' + quoteColumns, [scope.org, scope.user, id, ...values])
      return quoteDetails(tx, scope, updated)
    })
    res.json(result)
  }))
  router.post('/proposals/:id/publish', endpoint(async (req, res) => {
    const scope = userScope(req), id = uuid(req.params.id)
    const body = object(req.body, ['revision', 'validDays'])
    const revision = positiveVersion(body.revision)
    const result = await database.transaction(async tx => {
      const proposal = await quoteDraft(tx, scope, id, true)
      if (proposal.revision !== revision) throw new InputError('A revisão atual do orçamento é diferente. Abra a versão mais recente.', 409)
      return publish(tx, scope, proposal, integer(body.validDays ?? proposal.commercial.validDays, 1, 180, 'Validade em dias'), settings.secret)
    })
    res.status(201).json(result)
  }))

  router.get('/proposals/:id/versions/:versionId', endpoint(async (req, res) => {
    res.json(safeVersion(await quoteVersion(database, userScope(req), uuid(req.params.id), uuid(req.params.versionId))))
  }))
  router.get('/proposals/:id/versions/:versionId/link', endpoint(async (req, res) => {
    const version = await quoteVersion(database, userScope(req), uuid(req.params.id), uuid(req.params.versionId))
    const token = publicToken(settings.secret, version.id)
    if (version.revoked_at || new Date(version.expires_at).getTime() <= Date.now() || sha(token) !== version.token_hash)
      throw new InputError('O link está indisponível. Consulte a versão atual do orçamento.', 409)
    res.json({ token })
  }))
  function versionEvent(action: 'revoke' | 'sent') {
    return endpoint(async (req, res) => {
      const scope = userScope(req), id = uuid(req.params.id), versionId = uuid(req.params.versionId)
      object(req.body || {}, [])
      const result = await database.transaction(async tx => {
        await quoteDraft(tx, scope, id, true)
        const version = await quoteVersion(tx, scope, id, versionId)
        if (action === 'sent' && (version.revoked_at || new Date(version.expires_at).getTime() <= Date.now())) throw new InputError('O link expirou ou foi revogado.', 409)
        const column = action === 'revoke' ? 'revoked_at' : 'sent_at'
        if (!version[column]) {
          await tx.query('UPDATE commercial_proposal_versions SET ' + column + '=now() WHERE organization_id=$1 AND user_id=$2 AND id=$3', [scope.org, scope.user, versionId])
          await recordEvent(tx, scope, versionId, action === 'revoke' ? 'revoked' : 'sent')
        }
        return safeVersion(await quoteVersion(tx, scope, id, versionId))
      })
      res.json(result)
    })
  }
  router.post('/proposals/:id/versions/:versionId/revoke', versionEvent('revoke'))
  router.post('/proposals/:id/versions/:versionId/sent', versionEvent('sent'))

  async function contractContext(tx: Database, scope: CommercialScope, id: string, lock = true) {
    await quoteDraft(tx, scope, id, lock)
    const approved = await acceptedVersion(tx, scope, id)
    const contract = approved && await contractForVersion(tx, scope, approved.id)
    if (!contract) throw new InputError('O contrato requer aceite da proposta publicada.', 409)
    return { contract, approved }
  }
  router.patch('/proposals/:id/contract', endpoint(async (req, res) => {
    const scope = userScope(req), id = uuid(req.params.id), body = object(req.body, ['version', 'title', 'clauses'])
    const version = positiveVersion(body.version)
    const title = bounded(body.title, 160, 'Título do contrato')
    const clauses = bounded(body.clauses, 16000, 'Cláusulas')
    const result = await database.transaction(async tx => {
      const { contract, approved } = await contractContext(tx, scope, id)
      if (contract.status !== 'draft' || contract.version !== version) throw new InputError('Abra a revisão atual do contrato antes de editar.', 409)
      await tx.query('UPDATE commercial_contracts SET title=$4,clauses=$5,version=version+1 WHERE organization_id=$1 AND user_id=$2 AND id=$3', [scope.org, scope.user, contract.id, title, clauses])
      return contractForVersion(tx, scope, approved.id)
    })
    res.json(result)
  }))
  router.post('/proposals/:id/contract/publish', endpoint(async (req, res) => {
    const scope = userScope(req), id = uuid(req.params.id), body = object(req.body, ['version', 'reviewed'])
    const version = positiveVersion(body.version)
    if (body.reviewed !== true) throw new InputError('Confirme a revisão humana do contrato.')
    const result = await database.transaction(async tx => {
      const { contract, approved } = await contractContext(tx, scope, id)
      if (version !== contract.version) throw new InputError('Abra a revisão atual do contrato antes de publicar.', 409)
      if (contract.status !== 'draft') return contract
      if (!contract.clauses.trim()) throw new InputError('Preencha e revise as cláusulas antes de publicar o contrato.')
      await tx.query("UPDATE commercial_contracts SET status='published',published_at=now() WHERE organization_id=$1 AND user_id=$2 AND id=$3", [scope.org, scope.user, contract.id])
      await recordEvent(tx, scope, approved.id, 'contract_published', { contractVersion: version })
      return contractForVersion(tx, scope, approved.id)
    })
    res.json(result)
  }))
  router.post('/proposals/:id/contract/formalize', endpoint(async (req, res) => {
    const scope = userScope(req), id = uuid(req.params.id)
    const body = object(req.body, ['version', 'confirmed', 'evidenceBase64', 'fileName'])
    const version = positiveVersion(body.version)
    if (body.confirmed !== true) throw new InputError('Confirme que a evidência corresponde à versão publicada e foi conferida.')
    const { filename, document, digest } = pdfEvidence(body.evidenceBase64, body.fileName)
    const result = await database.transaction(async tx => {
      const { contract, approved } = await contractContext(tx, scope, id)
      if (version !== contract.version || contract.status === 'draft') throw new InputError('Formalize somente a versão revisada e publicada.', 409)
      if (contract.status === 'formalized') {
        const [saved] = await tx.query('SELECT evidence_digest FROM commercial_contracts WHERE organization_id=$1 AND user_id=$2 AND id=$3', [scope.org, scope.user, contract.id])
        if (saved.evidence_digest !== digest) throw new InputError('O contrato já foi formalizado com outra evidência.', 409)
        return { contract, project_id: contract.project_id }
      }
      const projectId = await createContractedProject(tx, scope, approved.snapshot)
      await tx.query("UPDATE commercial_contracts SET status='formalized',formalized_at=now(),project_id=$4,evidence_filename=$5,evidence=$6::bytea,evidence_digest=$7 WHERE organization_id=$1 AND user_id=$2 AND id=$3", [scope.org, scope.user, contract.id, projectId, filename, document, digest])
      await recordEvent(tx, scope, approved.id, 'formalized', { contractVersion: version })
      return { contract: await contractForVersion(tx, scope, approved.id), project_id: projectId }
    })
    res.json(result)
  }))
  router.get('/proposals/:id/contract/evidence', endpoint(async (req, res) => {
    const scope = userScope(req), id = uuid(req.params.id)
    const { contract } = await contractContext(database, scope, id, false)
    const [file] = await database.query('SELECT evidence,evidence_filename FROM commercial_contracts WHERE organization_id=$1 AND user_id=$2 AND id=$3', [scope.org, scope.user, contract.id])
    if (!file?.evidence) throw new InputError('Evidência de formalização indisponível.', 404)
    res.attachment(file.evidence_filename).type('application/octet-stream').send(Buffer.from(file.evidence))
  }))

  router.get('/projects/:id', endpoint(async (req, res) => {
    res.json(await contractedProject(database, userScope(req), uuid(req.params.id)))
  }))
  router.get('/projects/:id/prompts', endpoint(async (req, res) => {
    const scope = userScope(req)
    const project = await contractedProject(database, scope, uuid(req.params.id))
    res.json(await database.query('SELECT id,content,source,project_scope AS scope,task_id,created_at FROM quote_proposal_prompts WHERE organization_id=$1 AND user_id=$2 AND proposal_id=$3 AND project_scope IS NOT NULL ORDER BY created_at DESC,id LIMIT 100', [scope.org, scope.user, project.proposal_id]))
  }))
  router.post('/projects/:id/prompts', endpoint(async (req, res) => {
    const scope = userScope(req), id = uuid(req.params.id)
    const body = object(req.body, ['scope', 'content'])
    const kind = body.scope
    if (kind !== 'project' && kind !== 'next_task') throw new InputError('Escolha o projeto inteiro ou a próxima tarefa.')
    const edited = body.content === undefined ? undefined : bounded(body.content, 30000, 'Conteúdo do prompt')
    const result = await database.transaction(async tx => {
      const project = await contractedProject(tx, scope, id, true)
      const next = kind === 'next_task' ? project.next_action : null
      if (kind === 'next_task' && !next) throw new InputError('Atualmente não há próxima tarefa executável neste projeto.', 409)
      const generated = projectPrompt(project.snapshot, project.supplier_name, next ? { title: next.title, description: next.description } : null)
      const [saved] = await tx.query('INSERT INTO quote_proposal_prompts(organization_id,user_id,proposal_id,content,source,project_scope,task_id) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id,content,source,project_scope AS scope,task_id,created_at', [scope.org, scope.user, project.proposal_id, edited ?? generated, edited === undefined ? 'generated' : 'edited', kind, next?.id ?? null])
      return saved
    })
    res.status(201).json(result)
  }))

  const safeParseError: ErrorRequestHandler = (error, _req, res, _next) => {
    res.status(error.status === 413 ? 413 : 400).json({ error: error.status === 413 ? 'O conteúdo ultrapassa o tamanho permitido.' : 'Não foi possível ler o conteúdo enviado.' })
  }
  router.use(safeParseError)
  return router
}
