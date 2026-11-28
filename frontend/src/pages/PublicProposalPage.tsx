import { useEffect, useState } from 'react'
import { Check, FileText } from 'lucide-react'
import { ErrorState, LoadingState } from '@/components/ui/DataState'
import CommercialPresentation, { ContractDocument } from '@/components/commercial/CommercialPresentation'
import { commercialDate, commercialMoney, printCommercialPage, publicCommercial, type CommercialContract, type CommercialVersion } from '@/lib/commercial'

type PublicProposal = { version: CommercialVersion; contract: CommercialContract | null }

function ProposalResponse({ proposal, token, onChange, onContract }: {
  proposal: PublicProposal
  token: string
  onChange: () => Promise<void>
  onContract: () => void
}) {
  const [decision, setDecision] = useState<'accept' | 'refuse' | null>(null)
  const [representativeName, setRepresentativeName] = useState('')
  const [reason, setReason] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const { version, contract } = proposal

  async function submit() {
    if (!decision || !confirmed || busy) return
    setBusy(true)
    setError('')
    try {
      await publicCommercial('decision', { token, versionId: version.id, decision, confirmed, representativeName, reason })
      await onChange()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (version.status === 'refused') return <p role="status">Recusa registrada. Obrigado pelo retorno.</p>
  if (version.status === 'accepted') return <div className="offer-response">
    <p role="status"><Check size={18} aria-hidden="true" /> Proposta aceita{version.decided_at ? ' em ' + commercialDate(version.decided_at, true) : ''}.</p>
    {contract ? <button type="button" className="button button-primary" onClick={onContract}>Ver contrato</button> :
      <p>O responsável está preparando o contrato. Use este link para consultá-lo quando estiver disponível.</p>}
  </div>
  if (version.status !== 'published') return <p role="status">Esta versão está indisponível para decisão.</p>

  if (!decision) return <div className="offer-action-row">
    <button type="button" className="button button-primary" onClick={() => setDecision('accept')}>Confirmar proposta e seguir para o contrato</button>
    <button type="button" className="button button-secondary" onClick={() => setDecision('refuse')}>Não confirmar proposta</button>
  </div>

  return <div className="offer-response">
    <p><strong>{version.snapshot.presentation.title || version.snapshot.title}</strong> · versão {version.number}</p>
    {decision === 'accept' && <p>Implementação {commercialMoney(version.snapshot.quote.oneTimeCents)}
      {version.snapshot.quote.monthlyCents > 0 && ' · ' + commercialMoney(version.snapshot.quote.monthlyCents) + ' por mês'}</p>}
    <form onSubmit={event => { event.preventDefault(); void submit() }}>
      {decision === 'accept' ? <label className="login-field"><span>Nome do representante autorizado</span>
        <input value={representativeName} required minLength={3} maxLength={140} autoComplete="name" onChange={event => setRepresentativeName(event.target.value)} />
      </label> : <label className="login-field"><span>Motivo (opcional)</span>
        <textarea value={reason} maxLength={1000} rows={3} onChange={event => setReason(event.target.value)} />
      </label>}
      <label className="commercial-check"><input type="checkbox" checked={confirmed} required onChange={event => setConfirmed(event.target.checked)} />
        <span>{decision === 'accept' ? 'Confirmo que li e aceito os valores e o escopo desta versão para seguir à formalização.' : 'Confirmo que desejo recusar esta versão da proposta.'}</span>
      </label>
      {error && <p role="alert">{error}</p>}
      <div className="offer-action-row">
        <button className="button button-primary" disabled={busy || !confirmed}>{busy ? 'Registrando…' : decision === 'accept' ? 'Registrar aceite' : 'Registrar recusa'}</button>
        <button type="button" className="button button-secondary" disabled={busy} onClick={() => { setDecision(null); setConfirmed(false); setError('') }}>Voltar</button>
      </div>
    </form>
  </div>
}

function PublicContract({ proposal, token, onChange, onBack }: {
  proposal: PublicProposal
  token: string
  onChange: () => Promise<void>
  onBack: () => void
}) {
  const [name, setName] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const { contract, version } = proposal
  if (!contract) return null

  async function acknowledge() {
    if (!contract || !confirmed || busy) return
    setError('')
    setBusy(true)
    try {
      await publicCommercial('contract/acknowledge', { token, versionId: version.id, contractVersion: contract.version, confirmed, representativeName: name })
      await onChange()
    } catch (err) { setError((err as Error).message) }
    finally { setBusy(false) }
  }

  return <main className="offer offer--public offer-print-contract">
    <div className="offer-contract">
      <div className="offer-action-row offer-contract-controls">
        <button type="button" className="button button-secondary" onClick={onBack}>Voltar à proposta</button>
        <button type="button" className="button button-secondary" onClick={printCommercialPage}><FileText size={16} aria-hidden="true" /> Salvar contrato em PDF</button>
      </div>
      <ContractDocument contract={contract} snapshot={version.snapshot} />
      <div className="offer-response offer-contract-controls">
        {contract.status === 'formalized' ? <p role="status">Formalização registrada mediante evidência externa.</p> :
          contract.acknowledged_at ? <p role="status">Ciência registrada. Aguarde as instruções para assinatura externa.</p> :
            <form onSubmit={event => { event.preventDefault(); void acknowledge() }}>
              <p>Registre a ciência desta versão. O responsável orientará a assinatura externa.</p>
              <label className="login-field"><span>Nome do representante autorizado</span><input required minLength={3} maxLength={140} autoComplete="name" value={name} onChange={event => setName(event.target.value)} /></label>
              <label className="commercial-check"><input type="checkbox" required checked={confirmed} onChange={event => setConfirmed(event.target.checked)} /><span>Confirmo que tive acesso à versão {contract.version} do contrato.</span></label>
              {error && <p role="alert">{error}</p>}
              <div><button className="button button-primary" disabled={!confirmed || busy}>{busy ? 'Registrando…' : 'Registrar ciência'}</button></div>
            </form>}
      </div>
    </div>
  </main>
}

function currentToken() {
  const value = window.location.hash.slice(1)
  return /^[A-Za-z0-9_-]{43}$/.test(value) ? value : ''
}

export default function PublicProposalPage() {
  const [token, setToken] = useState(currentToken)
  const [result, setResult] = useState<{ token: string; proposal?: PublicProposal; error?: string } | null>(null)
  const [retry, setRetry] = useState(0)
  const [showContract, setShowContract] = useState(false)

  useEffect(() => {
    const change = () => { setToken(currentToken()); setShowContract(false) }
    window.addEventListener('hashchange', change)
    return () => window.removeEventListener('hashchange', change)
  }, [])

  useEffect(() => {
    document.title = 'Proposta comercial | Abelha'
    const robots = document.createElement('meta')
    robots.name = 'robots'
    robots.content = 'noindex, nofollow, noarchive'
    document.head.append(robots)
    return () => { robots.remove(); document.title = 'Abelha' }
  }, [])

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    void publicCommercial<PublicProposal>('read', { token }, controller.signal).then(
      proposal => { if (!controller.signal.aborted) setResult({ token, proposal }) },
      error => { if (!controller.signal.aborted) setResult({ token, error: (error as Error).message }) },
    )
    return () => controller.abort()
  }, [token, retry])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [showContract, token])

  async function refresh() {
    const proposal = await publicCommercial<PublicProposal>('read', { token })
    setResult({ token, proposal })
  }

  const proposal = result?.token === token ? result.proposal : undefined
  if (showContract && proposal?.contract) return <PublicContract proposal={proposal} token={token} onChange={refresh} onBack={() => setShowContract(false)} />
  if (proposal) return <CommercialPresentation snapshot={proposal.version.snapshot} expiresAt={proposal.version.expires_at} version={proposal.version.number}
    decision={<ProposalResponse key={proposal.version.id} proposal={proposal} token={token} onChange={refresh} onContract={() => setShowContract(true)} />} />

  return <main className="offer offer--public"><div className="offer-state">
    <img src="/bee-mark.png" alt="" />
    <h1>Proposta comercial</h1>
    {!token ? <p role="status">Abra o link completo recebido do responsável pela proposta.</p> : result?.token === token && result.error ?
      <ErrorState message={result.error} retry={() => { setResult(null); setRetry(attempt => attempt + 1) }} /> :
      <LoadingState />}
  </div></main>
}
