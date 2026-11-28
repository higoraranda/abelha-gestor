import { useEffect, useState, type ReactNode } from 'react'
import { ArrowDownToLine, ArrowLeft, ArrowUpRight, Clipboard, FileText, Plus, RefreshCw } from 'lucide-react'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/DataState'
import Modal from '@/components/ui/Modal'
import CommercialPresentation, { ContractDocument } from '@/components/commercial/CommercialPresentation'
import { useRemote } from '@/hooks/useRemote'
import { api } from '@/lib/api'
import {
  commercialDate, commercialMoney, commercialPath, commercialStatusLabels, proposalLink, readContractPDF, signedContractFile,
  type CommercialContract, type CommercialDetail, type CommercialPresentation as PresentationFields,
  type CommercialProposal, type CommercialSnapshot, type CommercialStatus, type CommercialVersion,
} from '@/lib/commercial'
import './CommercialProposalsPage.css'

const proposalsEndpoint = commercialPath + '/proposals'
const eventNames: Record<string, string> = {
  draft_created: 'Orçamento criado', draft_updated: 'Rascunho atualizado', published: 'Proposta publicada',
  sent: 'Envio registrado', viewed: 'Link aberto', accepted: 'Aceite registrado', refused: 'Recusa registrada',
  revoked: 'Versão revogada', contract_draft: 'Contrato preparado', contract_updated: 'Rascunho do contrato atualizado',
  contract_published: 'Contrato disponibilizado', contract_acknowledged: 'Ciência do contrato registrada',
  formalized: 'Formalização registrada', project_created: 'Projeto criado',
}
const versionNames: Record<CommercialVersion['status'], string> = {
  published: 'Publicada', accepted: 'Aceita', refused: 'Recusada', revoked: 'Revogada', expired: 'Expirada',
}
const nextSteps: Record<CommercialStatus, string> = {
  draft: 'Revisar e publicar', published: 'Acompanhar a decisão', expired: 'Revisar a validade',
  revoked: 'Preparar nova versão', refused: 'Revisar as condições', accepted: 'Revisar o contrato',
  contract_draft: 'Revisar o contrato', contract_published: 'Registrar a formalização', formalized: 'Abrir o planejamento',
}

type Feedback = { text: string; error: boolean }
type Action = (label: string, action: () => Promise<void>) => Promise<void>

function useActivityRefresh(reload: () => void) {
  useEffect(() => {
    function refresh() { if (!document.hidden) reload() }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [reload])
}

function Status({ status }: { status: CommercialStatus }) {
  return <span className={'commercial-status commercial-status--' + status}>{commercialStatusLabels[status]}</span>
}

function ProposalsIndex({ onOpen, onQuote }: { onOpen: (id: string) => void; onQuote: () => void }) {
  const list = useRemote<CommercialProposal[]>(proposalsEndpoint)
  const [filter, setFilter] = useState<CommercialStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  useActivityRefresh(list.reload)
  const term = search.trim().toLocaleLowerCase('pt-BR')
  const items = list.data?.filter(item => (filter === 'all' || item.status === filter)
    && (item.title + ' ' + item.client_name).toLocaleLowerCase('pt-BR').includes(term))
  return <section className="commercial-admin">
    <header className="commercial-admin-header">
      <div><p className="commercial-kicker">CRM</p><h1>Propostas</h1><p>Acompanhe decisões, contratos e projetos contratados.</p></div>
      <button type="button" className="button button-primary" onClick={onQuote}><Plus size={17} aria-hidden="true" /> Novo orçamento</button>
    </header>
    <div className="commercial-filters">
      <label className="login-field"><span>Buscar por cliente ou projeto</span><input type="search" value={search} onChange={event => setSearch(event.target.value)} /></label>
      <label className="login-field"><span>Situação</span><select value={filter} onChange={event => setFilter(event.target.value as typeof filter)}>
        <option value="all">Todas</option>
        {Object.entries(commercialStatusLabels).map(([id, label]) => <option value={id} key={id}>{label}</option>)}
      </select></label>
      <button type="button" className="button button-secondary" onClick={list.reload} disabled={list.loading}><RefreshCw size={16} aria-hidden="true" /> Atualizar atividade</button>
    </div>
    {list.error ? <ErrorState message={list.error} retry={list.reload} /> : !items ? <LoadingState /> :
      items.length === 0 ? <EmptyState title={filter === 'all' && !term ? 'Nenhuma proposta ainda' : 'Nenhuma proposta corresponde aos filtros'}
        text={filter === 'all' && !term ? 'Crie um orçamento para preparar a primeira apresentação comercial.' : 'Ajuste a busca ou a situação.'} /> :
        <ul className="commercial-list" aria-label="Propostas comerciais">{items.map(item => {
          const latest = item.versions[0]
          return <li key={item.id}>
            <button type="button" className="commercial-item" onClick={() => onOpen(item.id)}>
              <span className="commercial-item-title"><strong>{item.title}</strong><span>{item.client_name}</span></span>
              <span className="commercial-item-investment"><strong>{commercialMoney(item.quote.oneTimeCents)}</strong>
                {item.quote.monthlyCents > 0 && <span>{commercialMoney(item.quote.monthlyCents)} / mês</span>}</span>
              <span className="commercial-item-meta"><Status status={item.status} /><span>{nextSteps[item.status]}</span>
                {latest?.viewed_at && <span>Link aberto em {commercialDate(latest.viewed_at)}</span>}</span>
              <span className="commercial-item-dates">
                <span>Atividade · {commercialDate(item.updated_at, true)}</span>
                {latest?.sent_at && <span>Envio · {commercialDate(latest.sent_at)}</span>}
                {latest && <span>Validade · {commercialDate(latest.expires_at)}</span>}
              </span>
              <ArrowUpRight className="commercial-item-arrow" size={20} aria-hidden="true" />
            </button>
          </li>
        })}</ul>}
  </section>
}

const presentationFields: { key: keyof PresentationFields; label: string; short?: boolean; max: number }[] = [
  { key: 'title', label: 'Título da capa', short: true, max: 140 }, { key: 'brandName', label: 'Nome da marca', short: true, max: 140 },
  { key: 'intro', label: 'Apresentação comercial', max: 2400 }, { key: 'solution', label: 'Solução proposta', max: 2400 },
  { key: 'methodology', label: 'Metodologia', max: 2400 }, { key: 'nextSteps', label: 'Próximos passos', max: 2400 },
]

function ProposalEditor({ proposal, busy, run, onDirty }: { proposal: CommercialDetail; busy: string; run: Action; onDirty: (dirty: boolean) => void }) {
  const [presentation, setPresentation] = useState<PresentationFields>(proposal.presentation)
  const [preview, setPreview] = useState(false)
  const changed = presentationFields.some(({ key }) => (presentation[key] || '') !== (proposal.presentation[key] || ''))
  const path = proposalsEndpoint + '/' + proposal.id
  function update(key: keyof PresentationFields, value: string) {
    const next = { ...presentation, [key]: value }
    setPresentation(next)
    onDirty(presentationFields.some(field => (next[field.key] || '') !== (proposal.presentation[field.key] || '')))
  }
  return <div className="commercial-editor">
    <form className="commercial-panel" onSubmit={event => {
      event.preventDefault()
      void run('Apresentação salva', async () => {
        await api.patch(path, { revision: proposal.revision, presentation })
        onDirty(false)
      })
    }}>
      <h2>Apresentação</h2>
      <div className="commercial-editor-fields">
        {presentationFields.map(({ key, label, short, max }) => <label className={'login-field' + (short ? '' : ' commercial-field-wide')} key={key}>
          <span>{label}</span>{short ? <input value={presentation[key] || ''} maxLength={max}
            onChange={event => update(key, event.target.value)} /> :
            <textarea rows={3} value={presentation[key] || ''} maxLength={max}
              onChange={event => update(key, event.target.value)} />}
        </label>)}
      </div>
      <div className="commercial-actions">
        <button type="button" className="button button-secondary" onClick={() => setPreview(current => !current)} aria-expanded={preview}>
          <FileText size={16} aria-hidden="true" />{preview ? 'Fechar prévia' : 'Visualizar apresentação'}
        </button>
        {changed && <button type="button" className="button button-secondary" disabled={!!busy} onClick={() => {
          setPresentation(proposal.presentation)
          onDirty(false)
        }}>Descartar alterações</button>}
        <button className="button button-primary" disabled={!changed || !!busy}>Salvar rascunho</button>
      </div>
    </form>
    {preview && <CommercialPresentation snapshot={{ ...proposal, presentation }} preview />}
  </div>
}

function ContractEditor({ proposal, contract, accepted, run, busy }: {
  proposal: CommercialDetail; contract: CommercialContract; accepted: CommercialSnapshot; run: Action; busy: string
}) {
  const [title, setTitle] = useState(contract.title)
  const [clauses, setClauses] = useState(contract.clauses)
  const [reviewed, setReviewed] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [preview, setPreview] = useState(false)
  const contractPath = proposalsEndpoint + '/' + proposal.id + '/contract'
  const dirty = title !== contract.title || clauses !== contract.clauses
  return <section className="commercial-panel commercial-admin-contract">
    <div className="commercial-panel-heading">
      <div><h2>Contrato</h2><p>Versão {contract.version} · {contract.status === 'draft' ? 'Em revisão' : contract.status === 'published' ? 'Disponível ao cliente' : 'Formalizado'}</p></div>
      <button type="button" className="button button-secondary" aria-expanded={preview} onClick={() => setPreview(current => !current)}>
        {preview ? 'Fechar documento' : 'Visualizar documento'}
      </button>
    </div>
    {contract.status === 'draft' && <form className="commercial-stack" onSubmit={event => {
      event.preventDefault()
      void run('Rascunho do contrato salvo', async () => { await api.patch(contractPath, { version: contract.version, title, clauses }) })
    }}>
      <label className="login-field"><span>Título</span><input required maxLength={160} value={title} onChange={event => setTitle(event.target.value)} /></label>
      <label className="login-field"><span>Identificação das partes, obrigações e cláusulas aprovadas</span>
        <textarea required rows={7} maxLength={16000} value={clauses} onChange={event => setClauses(event.target.value)} />
      </label>
      <div className="commercial-actions"><button className="button button-secondary" disabled={!!busy || !dirty}>Salvar contrato</button></div>
      <label className="commercial-check"><input type="checkbox" checked={reviewed} onChange={event => setReviewed(event.target.checked)} />
        <span>Revisei a identificação das partes, os dados herdados e as cláusulas desta versão.</span>
      </label>
      <div className="commercial-actions"><button type="button" className="button button-primary" disabled={!reviewed || dirty || !clauses.trim() || !!busy}
        onClick={() => void run('Contrato disponibilizado', async () => { await api.post(contractPath + '/publish', { version: contract.version, reviewed }) })}>Disponibilizar contrato</button></div>
    </form>}
    {preview && <ContractDocument contract={{ ...contract, title, clauses }} snapshot={accepted} />}
    {contract.status !== 'draft' && <p>{contract.acknowledged_at ? 'Ciência do cliente em ' + commercialDate(contract.acknowledged_at, true) + '.' : 'A ciência do cliente ainda não foi registrada.'}</p>}
    {contract.status === 'published' && <form className="commercial-stack" onSubmit={event => {
      event.preventDefault()
      if (!file || !confirmed) return
      void run('Formalização registrada e projeto criado', async () => {
        await api.post(contractPath + '/formalize', { version: contract.version, confirmed, evidenceBase64: await readContractPDF(file), fileName: file.name })
      })
    }}>
      <label className="login-field"><span>Contrato assinado externamente (PDF, até 2 MB)</span>
        <input type="file" accept="application/pdf,.pdf" required onChange={event => setFile(event.target.files?.[0] || null)} />
      </label>
      <label className="commercial-check"><input type="checkbox" checked={confirmed} required onChange={event => setConfirmed(event.target.checked)} />
        <span>Conferi a assinatura externa e a correspondência com a versão {contract.version}.</span></label>
      <div className="commercial-actions"><button className="button button-primary" disabled={!file || !confirmed || !!busy}>Formalizar e criar projeto</button></div>
    </form>}
    {contract.has_evidence && <div className="commercial-actions">
      <button type="button" className="button button-secondary" disabled={!!busy} onClick={() => void run('Arquivo baixado', () => signedContractFile(contractPath + '/evidence'))}>
        <ArrowDownToLine size={16} aria-hidden="true" /> Baixar contrato assinado
      </button>
    </div>}
  </section>
}

function ProposalDetail({ id, onBack, onQuote, onProject }: { id: string; onBack: () => void; onQuote: () => void; onProject: (id: string) => void }) {
  const path = proposalsEndpoint + '/' + id
  const detail = useRemote<CommercialDetail>(path)
  useActivityRefresh(detail.reload)
  const [busy, setBusy] = useState('')
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [validDays, setValidDays] = useState(14)
  const [revoking, setRevoking] = useState<CommercialVersion | null>(null)
  const [showVersion, setShowVersion] = useState<CommercialVersion | null>(null)
  const [share, setShare] = useState('')
  const proposal = detail.data
  const [unsavedRevision, setUnsavedRevision] = useState<number | null>(null)
  const unsaved = !!proposal && unsavedRevision === proposal.revision
  const accepted = proposal?.versions.find(version => (version.decision || version.status) === 'accepted')
  const acceptedDetail = useRemote<CommercialVersion>(proposal?.contract && accepted ? path + '/versions/' + accepted.id : null)
  const locked = !!proposal?.contract || !!accepted

  const run: Action = async (label, action) => {
    if (busy) return
    setBusy(label)
    setFeedback(null)
    try { await action(); setFeedback({ text: label, error: false }) }
    catch (err) { setFeedback({ text: (err as Error).message, error: true }) }
    finally { setBusy('') }
  }

  async function publish(revision: number) {
    await run('Versão publicada', async () => {
      const result = await api.post<{ token: string }>(path + '/publish', { revision, validDays })
      setShare(proposalLink(result.token))
      setPublishing(false)
    })
  }

  async function getLink(versionId: string) {
    await run('Link disponível para compartilhar', async () => {
      const { token } = await api.get<{ token: string }>(path + '/versions/' + versionId + '/link')
      setShare(proposalLink(token))
    })
  }

  const acceptedSnapshot = accepted?.snapshot || acceptedDetail.data?.snapshot
  let content: ReactNode
  if (detail.error) content = <ErrorState message={detail.error} retry={detail.reload} />
  else if (!proposal) content = <LoadingState />
  else content = <>
    <header className="commercial-admin-header">
      <div><p className="commercial-kicker">{acceptedSnapshot?.client_name || proposal.client_name}</p><h1>{acceptedSnapshot?.title || proposal.title}</h1>
        <Status status={proposal.status} /></div>
      <div className="commercial-actions">
        {proposal.project_id && <button className="button button-primary" onClick={() => onProject(proposal.project_id!)}>Abrir planejamento</button>}
        {!locked && <button className="button button-secondary" onClick={onQuote} disabled={unsaved || !!busy}>Editar orçamento</button>}
        {!locked && (!proposal.versions.length || proposal.versions[0].draft_revision !== proposal.revision) && <button className="button button-primary" onClick={() => { setValidDays(proposal.commercial.validDays ?? 15); setPublishing(true) }} disabled={unsaved || !!busy}>
          {proposal.versions.length ? 'Publicar nova versão' : 'Publicar proposta'}
        </button>}
      </div>
    </header>
    {feedback && <p className={'commercial-feedback' + (feedback.error ? ' commercial-feedback--error' : '')} role={feedback.error ? 'alert' : 'status'}>{feedback.text}</p>}
    {share && <div className="commercial-panel commercial-share">
      <label className="login-field"><span>Link exclusivo da proposta</span><input readOnly value={share} onFocus={event => event.currentTarget.select()} /></label>
      <button type="button" className="button button-primary" onClick={() => void run('Link copiado', () => navigator.clipboard.writeText(share))}><Clipboard size={16} aria-hidden="true" /> Copiar link</button>
      <a className="button button-secondary" href={share} target="_blank" rel="noopener noreferrer">Abrir link <ArrowUpRight size={16} aria-hidden="true" /></a>
      <button type="button" className="button button-secondary" onClick={() => setShare('')}>Fechar link</button>
    </div>}
    {proposal.contract && (acceptedSnapshot ?
      <ContractEditor key={proposal.contract.id + ':' + proposal.contract.version} proposal={proposal} contract={proposal.contract} accepted={acceptedSnapshot} busy={busy} run={run} /> :
      acceptedDetail.error ? <ErrorState message={acceptedDetail.error} retry={acceptedDetail.reload} /> : <LoadingState />)}
    {!locked && <ProposalEditor proposal={proposal} key={proposal.revision} run={run} busy={busy}
      onDirty={value => setUnsavedRevision(value ? proposal.revision : null)} />}
    {proposal.versions.length > 0 && <section className="commercial-panel">
      <h2>Versões publicadas</h2>
      <ul className="commercial-version-list">
        {proposal.versions.map(version => <li key={version.id}>
          <div className="commercial-version-label">
            <strong>Versão {version.number} · {versionNames[version.decision === 'accepted' ? 'accepted' : version.status]}</strong>
            {version.link_state && version.link_state !== 'active' && <span>Link {version.link_state === 'expired' ? 'expirado' : 'revogado'}</span>}
            <span>Publicação · {commercialDate(version.published_at, true)}</span>
            <span>Validade · {commercialDate(version.expires_at, true)}</span>
            {version.viewed_at && <span>Primeira abertura do link · {commercialDate(version.viewed_at, true)}</span>}
            {version.sent_at && <span>Envio registrado · {commercialDate(version.sent_at, true)}</span>}
          </div>
          <div className="commercial-actions">
            <button className="button button-secondary" disabled={!!busy} onClick={() => void run('Versão carregada', async () => {
              const result = await api.get<CommercialVersion>(path + '/versions/' + version.id)
              setShowVersion(result)
            })}>Ver versão</button>
            {(version.link_state === 'active' || (!version.link_state && ['published', 'accepted'].includes(version.status))) &&
              <button className="button button-secondary" disabled={!!busy} onClick={() => void getLink(version.id)}>Obter link</button>}
            {version.status === 'published' && version.link_state !== 'expired' && !version.sent_at && <button className="button button-secondary" disabled={!!busy}
              onClick={() => void run('Envio registrado', async () => { await api.post(path + '/versions/' + version.id + '/sent', {}) })}>Registrar envio</button>}
            {(version.link_state === 'active' || (!version.link_state && ['published', 'accepted'].includes(version.status))) &&
              <button className="button button-danger-ghost" disabled={!!busy} onClick={() => setRevoking(version)}>Revogar link</button>}
          </div>
        </li>)}
      </ul>
    </section>}
    {showVersion && <div className="commercial-stack commercial-version-print">
      <button type="button" className="button button-secondary commercial-self-start commercial-version-print-controls" onClick={() => setShowVersion(null)}>Fechar versão</button>
      <CommercialPresentation snapshot={showVersion.snapshot} expiresAt={showVersion.expires_at} version={showVersion.number} preview printPreview />
    </div>}
    {proposal.events.length > 0 && <section className="commercial-panel">
      <h2>Histórico comercial</h2>
      <ul className="commercial-events">{proposal.events.map((event, index) => <li key={event.type + event.at + index}>
        <span>{eventNames[event.type] || event.type}{event.details?.representativeName && ' · ' + event.details.representativeName}
          {event.details?.reason && <span className="commercial-event-detail">{event.details.reason}</span>}</span>
        <time dateTime={event.at}>{commercialDate(event.at, true)}</time>
      </li>)}</ul>
    </section>}
    {publishing && <Modal title="Publicar proposta" onClose={() => setPublishing(false)}>
      <form className="commercial-stack" onSubmit={event => { event.preventDefault(); void publish(proposal.revision) }}>
        <p>A publicação gera um link exclusivo com os valores, o escopo e a apresentação salvos.</p>
        {proposal.versions.some(version => version.status === 'published') && <p>A versão ativa será revogada ao publicar a nova.</p>}
        <label className="login-field"><span>Validade em dias</span><input type="number" min={1} max={180} required value={validDays} onChange={event => setValidDays(event.target.valueAsNumber || 1)} /></label>
        {feedback?.error && <p role="alert">{feedback.text}</p>}
        <div className="commercial-actions"><button className="button button-primary" disabled={!!busy}>Publicar e gerar link</button></div>
      </form>
    </Modal>}
    {revoking && <Modal title="Revogar link da proposta" onClose={() => setRevoking(null)}>
      <div className="commercial-stack">
        <p>A versão {revoking.number} ficará indisponível para o destinatário. Seu histórico será preservado.</p>
        {feedback?.error && <p role="alert">{feedback.text}</p>}
        <div className="commercial-actions"><button className="button button-danger-ghost" disabled={!!busy} onClick={() => void run('Link revogado', async () => {
          await api.post(path + '/versions/' + revoking.id + '/revoke', {})
          setRevoking(null)
          setShare('')
        })}>Revogar link</button></div>
      </div>
    </Modal>}
  </>

  return <section className="commercial-admin">
    <button type="button" className="button button-secondary commercial-self-start" onClick={onBack}><ArrowLeft size={16} aria-hidden="true" /> Propostas</button>
    {content}
  </section>
}

export default function CommercialProposalsPage({ proposalId, onOpen, onQuote, onProject }: {
  proposalId?: string; onOpen: (id?: string) => void; onQuote: (id?: string) => void; onProject: (id: string) => void
}) {
  return proposalId ? <ProposalDetail key={proposalId} id={proposalId} onBack={() => onOpen()} onQuote={() => onQuote(proposalId)} onProject={onProject} /> :
    <ProposalsIndex onOpen={onOpen} onQuote={() => onQuote()} />
}
