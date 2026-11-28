import { randomUUID } from 'node:crypto'
import type { Database } from './platform-db'
import { InputError } from './personal'
import { proposalText } from './quote-proposal'
import { parseDraft, projectDescription, publicToken, sha, unavailable, workPlan, type Snapshot } from './commercial'

export type CommercialScope = { org: string; user: string }
type Row = Record<string, any>
export type CommercialSettings = { organizationIds: ReadonlySet<string>; secret: string }

export function commercialSettings(env = process.env): CommercialSettings {
  const ids = (env.ABELHA_COMMERCIAL_ORGANIZATION_IDS || '').split(',').map(value => value.trim().toLowerCase())
  return { organizationIds: new Set(ids.filter(id => /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(id))),
    secret: env.ABELHA_COMMERCIAL_LINK_SECRET || '' }
}

export function commercialEnabled(settings: CommercialSettings, organizationId: string) {
  return Buffer.byteLength(settings.secret, 'utf8') >= 32 && settings.organizationIds.has(organizationId.toLowerCase())
}

export const quoteColumns = 'id, client_id, client_name, title, briefing, model, quantities, quote, terms, commercial, presentation, revision, created_at, updated_at'
const versionColumns = 'id, number, draft_revision, published_at, expires_at, viewed_at, sent_at, decided_at'
const versionStatus = "CASE WHEN status='published' AND revoked_at IS NOT NULL THEN 'revoked' WHEN status='published' AND expires_at<=now() THEN 'expired' ELSE status END AS status"
const linkState = "CASE WHEN revoked_at IS NOT NULL THEN 'revoked' WHEN expires_at<=now() THEN 'expired' ELSE 'active' END AS link_state"
const contractColumns = 'id, supplier_name, version, title, clauses, status, published_at, acknowledged_at, formalized_at, project_id, evidence IS NOT NULL AS has_evidence'
const eventColumns = 'type, at, version_id, details'
const taskColumns = 't.id, t.title, t.description, t.status, t.due_date, t.priority, t.position, t.parent_id, t.dependency_id'
const scopeParams = ({ org, user }: CommercialScope) => [org, user]

export async function quoteDraft(db: Database, scope: CommercialScope, id: string, lock = false) {
  const [row] = await db.query('SELECT ' + quoteColumns + ' FROM quote_proposals WHERE organization_id=$1 AND user_id=$2 AND id=$3 AND commercial IS NOT NULL' + (lock ? ' FOR UPDATE' : ''), [...scopeParams(scope), id])
  if (!row) throw new InputError('Orçamento não encontrado nesta conta.', 404)
  return row
}

function commercialState(proposal: Row, versions: Row[], contract: Row | undefined) {
  if (contract) return contract.status === 'formalized' ? 'formalized' : 'contract_' + contract.status
  const latest = versions[0]
  if (!latest || latest.draft_revision < proposal.revision) return 'draft'
  return latest.status
}

export async function listCommercialProposals(db: Database, scope: CommercialScope) {
  const drafts = await db.query(`
    WITH drafts AS (
      SELECT id, organization_id, user_id, client_id, client_name, title, quote, revision, created_at, updated_at
      FROM quote_proposals WHERE organization_id=$1 AND user_id=$2 AND commercial IS NOT NULL
      ORDER BY updated_at DESC, id LIMIT 100
    )
    SELECT d.id, d.client_id, coalesce(contract.accepted_client, d.client_name) AS client_name,
      coalesce(contract.accepted_title, d.title) AS title, coalesce(contract.accepted_quote, d.quote) AS quote,
      d.revision, d.created_at, d.updated_at, to_jsonb(latest) AS latest,
      to_jsonb(contract) - 'accepted_quote' - 'accepted_title' - 'accepted_client' AS contract
    FROM drafts d
    LEFT JOIN LATERAL (
      SELECT ${versionColumns}, ${versionStatus}, ${linkState}
      FROM commercial_proposal_versions v
      WHERE v.organization_id=d.organization_id AND v.user_id=d.user_id AND v.proposal_id=d.id
      ORDER BY v.number DESC LIMIT 1
    ) latest ON true
    LEFT JOIN LATERAL (
      SELECT c.id, c.status, c.version, c.formalized_at, c.published_at, c.project_id, c.evidence IS NOT NULL AS has_evidence,
        v.snapshot->>'title' AS accepted_title, v.snapshot->>'client_name' AS accepted_client, v.snapshot->'quote' AS accepted_quote
      FROM commercial_proposal_versions v
      JOIN commercial_contracts c ON c.organization_id=v.organization_id AND c.user_id=v.user_id AND c.proposal_version_id=v.id
      WHERE v.organization_id=d.organization_id AND v.user_id=d.user_id AND v.proposal_id=d.id AND v.status='accepted'
    ) contract ON true
    ORDER BY d.updated_at DESC, d.id
  `, scopeParams(scope))
  return drafts.map(({ latest, contract, ...draft }) => {
    const versions = latest ? [latest] : []
    return { ...draft, status: commercialState(draft, versions, contract), versions, contract, project_id: contract?.project_id ?? null }
  })
}

export async function quoteDetails(db: Database, scope: CommercialScope, proposal: Row) {
  const params = [...scopeParams(scope), proposal.id]
  const versions = await db.query('SELECT ' + versionColumns + ', ' + versionStatus + ', ' + linkState +
    ' FROM commercial_proposal_versions WHERE organization_id=$1 AND user_id=$2 AND proposal_id=$3 ORDER BY number DESC', params)
  const [contract] = await db.query('SELECT ' + contractColumns +
    ' FROM commercial_contracts WHERE organization_id=$1 AND user_id=$2 AND proposal_version_id IN (SELECT id FROM commercial_proposal_versions WHERE organization_id=$1 AND user_id=$2 AND proposal_id=$3)', params)
  const events = await db.query('SELECT ' + eventColumns +
    ' FROM commercial_events WHERE organization_id=$1 AND user_id=$2 AND version_id IN (SELECT id FROM commercial_proposal_versions WHERE organization_id=$1 AND user_id=$2 AND proposal_id=$3) ORDER BY at DESC,id DESC LIMIT 200', params)
  return { ...proposal, status: commercialState(proposal, versions, contract), versions, contract: contract || null, project_id: contract?.project_id ?? null, events }
}

export async function clientName(db: Database, org: string, clientId: string) {
  const [client] = await db.query('SELECT name FROM clients WHERE organization_id=$1 AND id=$2 FOR KEY SHARE', [org, clientId])
  if (!client) throw new InputError('Cliente não encontrado nesta organização.', 404)
  return String(client.name).trim().slice(0, 150) || 'Cliente sem nome'
}

export function draftValues(draft: ReturnType<typeof parseDraft>, clientName: string) {
  const { clientId, title, briefing, model, quantities, quote, terms, commercial, presentation } = draft
  const effectiveQuantities = { ...quantities }
  for (const option of commercial.optionalItems) effectiveQuantities[option] = 0
  const proposal = proposalText({ ...draft, client_name: clientName, quantities: effectiveQuantities })
  return [clientId, clientName, title, briefing, JSON.stringify(model), JSON.stringify(quantities), JSON.stringify(quote),
    terms, JSON.stringify(commercial), JSON.stringify(presentation), proposal]
}

export function fromStoredDraft(row: Row) {
  return { clientId: row.client_id, title: row.title, briefing: row.briefing, model: row.model, quantities: row.quantities,
    terms: row.terms, commercial: row.commercial, presentation: row.presentation }
}

export async function recordEvent(db: Database, scope: CommercialScope, versionId: string, type: string, details: Row = {}) {
  await db.query(`
    WITH event AS (
      INSERT INTO commercial_events(organization_id,user_id,version_id,type,details) VALUES($1,$2,$3,$4,$5::text::jsonb)
      ON CONFLICT(version_id,type) DO NOTHING RETURNING version_id,at
    )
    UPDATE quote_proposals q SET updated_at=event.at FROM commercial_proposal_versions v, event
    WHERE v.organization_id=$1 AND v.user_id=$2 AND v.id=event.version_id
      AND q.organization_id=v.organization_id AND q.user_id=v.user_id AND q.id=v.proposal_id
  `, [...scopeParams(scope), versionId, type, JSON.stringify(details)])
}

export async function quoteVersion(db: Database, scope: CommercialScope, proposalId: string, versionId: string) {
  const [row] = await db.query('SELECT ' + versionColumns + ', ' + versionStatus + ', ' + linkState + ', snapshot, token_hash, revoked_at, status AS decision' +
    ' FROM commercial_proposal_versions WHERE organization_id=$1 AND user_id=$2 AND proposal_id=$3 AND id=$4',
    [...scopeParams(scope), proposalId, versionId])
  if (!row) throw new InputError('Versão comercial não encontrada.', 404)
  return row
}

export function safeVersion(row: Row) {
  const { token_hash: _token, decision: _decision, revoked_at: _revoked, ...safe } = row
  return safe
}

export async function acceptedVersion(db: Database, scope: CommercialScope, proposalId: string) {
  const [row] = await db.query("SELECT id,snapshot FROM commercial_proposal_versions WHERE organization_id=$1 AND user_id=$2 AND proposal_id=$3 AND status='accepted'", [...scopeParams(scope), proposalId])
  return row
}

export async function publish(db: Database, scope: CommercialScope, proposal: Row, validDays: number, secret: string) {
  if (!proposal.client_id) throw new InputError('Vincule um cliente da carteira antes de publicar.', 409)
  await clientName(db, scope.org, proposal.client_id)
  if (await acceptedVersion(db, scope, proposal.id)) throw new InputError('A proposta aceita já está vinculada ao contrato.', 409)
  const params = [...scopeParams(scope), proposal.id]
  const [previous] = await db.query('SELECT id,number,draft_revision,' + versionStatus +
    ' FROM commercial_proposal_versions WHERE organization_id=$1 AND user_id=$2 AND proposal_id=$3 ORDER BY number DESC LIMIT 1', params)
  if (previous?.draft_revision === proposal.revision) {
    if (previous.status !== 'published') throw new InputError('Prepare uma nova versão do orçamento antes de publicar novamente.', 409)
    const row = await quoteVersion(db, scope, proposal.id, previous.id)
    const token = publicToken(secret, row.id)
    if (sha(token) !== row.token_hash) throw new InputError('Atualize o orçamento para gerar um novo link com a configuração atual.', 409)
    return { version: safeVersion(row), token }
  }
  const id = randomUUID()
  const token = publicToken(secret, id)
  const { title, briefing, client_name, quantities, quote, terms, commercial, presentation } = proposal
  const snapshot: Snapshot = { title, briefing, client_name, quantities, quote, terms, commercial: { ...commercial, validDays }, presentation }
  const revoked = await db.query("UPDATE commercial_proposal_versions SET revoked_at=now() WHERE organization_id=$1 AND user_id=$2 AND proposal_id=$3 AND status='published' AND revoked_at IS NULL RETURNING id", params)
  for (const old of revoked) await recordEvent(db, scope, old.id, 'revoked')
  await db.query("INSERT INTO commercial_proposal_versions(id,organization_id,user_id,proposal_id,number,draft_revision,token_hash,snapshot,expires_at) VALUES($4,$1,$2,$3,$5,$6,$7,$8::text::jsonb,now()+$9::int*interval '1 day')",
    [...params, id, (previous?.number ?? 0) + 1, proposal.revision, sha(token), JSON.stringify(snapshot), validDays])
  await db.query("UPDATE quote_proposals SET status='awaiting_approval',refused_at=NULL,updated_at=now() WHERE organization_id=$1 AND user_id=$2 AND id=$3", params)
  await recordEvent(db, scope, id, 'published')
  return { version: safeVersion(await quoteVersion(db, scope, proposal.id, id)), token }
}

export async function publicVersion(db: Database, token: string, settings: CommercialSettings, versionId?: string) {
  const [found] = await db.query('SELECT id,organization_id,user_id,proposal_id FROM commercial_proposal_versions WHERE token_hash=$1', [sha(token)])
  if (!found || !commercialEnabled(settings, found.organization_id) ||
    (versionId && found.id !== versionId) || publicToken(settings.secret, found.id) !== token) throw unavailable()
  const scope = { org: found.organization_id, user: found.user_id }
  await quoteDraft(db, scope, found.proposal_id, true)
  const row = await quoteVersion(db, scope, found.proposal_id, found.id)
  if (row.link_state !== 'active') throw unavailable()
  return { scope, proposalId: String(found.proposal_id), version: row }
}

export async function contractForVersion(db: Database, scope: CommercialScope, versionId: string) {
  const [contract] = await db.query('SELECT ' + contractColumns + ' FROM commercial_contracts WHERE organization_id=$1 AND user_id=$2 AND proposal_version_id=$3',
    [...scopeParams(scope), versionId])
  return contract
}

export function publicContract(row: Row | undefined) {
  if (!row || row.status === 'draft') return null
  const { id, supplier_name, title, clauses, status, version, published_at, acknowledged_at } = row
  return { id, supplier_name, title, clauses, status, version, published_at, acknowledged_at }
}

export async function createContractDraft(db: Database, scope: CommercialScope, version: Row) {
  const [organization] = await db.query('SELECT name FROM organizations WHERE id=$1', [scope.org])
  if (!organization) throw new InputError('Organização indisponível.', 409)
  await db.query('INSERT INTO commercial_contracts (organization_id,user_id,proposal_version_id,supplier_name,title) VALUES ($1,$2,$3,$4,$5)',
    [...scopeParams(scope), version.id, organization.name, 'Contrato · ' + version.snapshot.title])
}

export async function createContractedProject(db: Database, scope: CommercialScope, snapshot: Snapshot) {
  const steps = workPlan(snapshot)
  const [{ id }] = await db.query("INSERT INTO personal_projects(organization_id,user_id,name,description,pipeline_stage,next_step,blockers) VALUES($1,$2,$3,$4,'planning',$5,$6) RETURNING id",
    [...scopeParams(scope), snapshot.title, projectDescription(snapshot), steps[0].title, snapshot.commercial.dependencies || ''])
  let prior: string | null = null
  for (const [position, step] of steps.entries()) {
    const [parent]: { id: string }[] = await db.query('INSERT INTO delivery_tasks (organization_id,project_user_id,project_id,title,description,priority,position,dependency_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id',
      [...scopeParams(scope), id, step.title, step.description, step.priority, position * 10, prior])
    await db.query('INSERT INTO personal_milestones(organization_id,user_id,project_id,title,acceptance,position) VALUES($1,$2,$3,$4,$5,$6)',
      [...scopeParams(scope), id, step.title, step.checklist.join('\n'), position])
    for (const [index, item] of step.checklist.entries()) {
      await db.query('INSERT INTO delivery_tasks(organization_id,project_user_id,project_id,title,description,priority,position,parent_id,dependency_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',
        [...scopeParams(scope), id, item, step.description, step.priority, position * 10 + index + 1, parent.id, prior])
    }
    prior = parent.id
  }
  return id as string
}

export async function contractedProject(db: Database, scope: CommercialScope, projectId: string, lock = false) {
  const params = [...scopeParams(scope), projectId]
  const [row] = await db.query<{ id: string; name: string; description: string; status: string; contract_id: string; supplier_name: string; proposal_id: string; snapshot: Snapshot; client_id: string | null }>('SELECT p.id,p.name,p.description,p.status,c.id AS contract_id,c.supplier_name,v.proposal_id,v.snapshot,q.client_id FROM personal_projects p ' +
    'JOIN commercial_contracts c ON c.organization_id=p.organization_id AND c.user_id=p.user_id AND c.project_id=p.id ' +
    'JOIN commercial_proposal_versions v ON v.organization_id=c.organization_id AND v.user_id=c.user_id AND v.id=c.proposal_version_id ' +
    'JOIN quote_proposals q ON q.organization_id=v.organization_id AND q.user_id=v.user_id AND q.id=v.proposal_id ' +
    'WHERE p.organization_id=$1 AND p.user_id=$2 AND p.id=$3' + (lock ? ' FOR UPDATE OF p' : ''), params)
  if (!row) throw new InputError('Projeto contratado não encontrado nesta conta.', 404)
  const tasks = await db.query('SELECT ' + taskColumns + ", CASE WHEN d.id IS NOT NULL AND d.status<>'done' THEN true ELSE false END AS blocked, d.title AS blocker " +
    'FROM delivery_tasks t LEFT JOIN delivery_tasks d ON d.organization_id=t.organization_id AND d.project_id=t.project_id AND d.id=t.dependency_id ' +
    "WHERE t.organization_id=$1 AND t.project_user_id=$2 AND t.project_id=$3 ORDER BY CASE t.priority WHEN 'high' THEN 0 WHEN 'low' THEN 2 ELSE 1 END,t.position,t.id", params)
  const next = tasks.find(task => task.status !== 'done' && !task.blocked && !(task.status === 'in_progress' &&
    tasks.some(child => child.parent_id === task.id && child.status !== 'done'))) ?? null
  return { ...row, tasks, next_action: next }
}
