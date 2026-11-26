import { useId, useRef, useState } from 'react'
import { Clipboard, FileText } from 'lucide-react'
import { api } from '@/lib/api'
import { useRemote } from '@/hooks/useRemote'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/DataState'
import type { Quote, QuoteModel } from '@/lib/quoteModels'

export type QuoteSimulation={model:QuoteModel;quantities:Record<string,number>;quote:Quote}
type QuoteIndex={id:string;client_id:string|null;client_name:string;title:string;created_at:string;approved_at:string|null;refused_at:string|null;status:string}
type SavedQuote=QuoteIndex&{briefing:string;proposal_text:string;status_history:{status:string;at:string}[]}
const endpoint='/api/v1/quote-models/proposals'
const clientsEndpoint='/api/v1/clients?limit=100'
const statusLabels:Record<string,string>={draft:'Rascunho',sent:'Enviado',awaiting_approval:'Aguardando aprovação',approved:'Aprovado',refused:'Recusado',cancelled:'Cancelado'}
const decisionLabel=(entry:QuoteIndex)=>statusLabels[entry.status]??(entry.approved_at?'Aprovado':entry.refused_at?'Recusado':'Rascunho')
type PromptVersion={id:string;content:string;source:string;created_at:string}

export default function QuoteProposals({simulation}:{simulation:QuoteSimulation|null}){
  const items=useRemote<QuoteIndex[]>(endpoint)
  const clientLabel=useId()
  const promptLabel=useId()
  const [clientQuery,setClientQuery]=useState('')
  const [clientFilter,setClientFilter]=useState('')
  const clients=useRemote<{id:string;name:string|null}[]>(clientsEndpoint + (clientFilter?'&search='+encodeURIComponent(clientFilter):''))
  const [clientId,setClientId]=useState('')
  const [title,setTitle]=useState('')
  const [briefing,setBriefing]=useState('')
  const [proposal,setProposal]=useState<SavedQuote|null>(null)
  const [terms,setTerms]=useState('')
  const [decision,setDecision]=useState<'approve'|'refuse'|''>('')
  const [prompt,setPrompt]=useState('')
  const history=useRemote<PromptVersion[]>(proposal?.approved_at?endpoint+'/'+proposal.id+'/prompts':null)
  const [busy,setBusy]=useState('')
  const [error,setError]=useState('')
  const [status,setStatus]=useState('')
  const inFlight=useRef(false)
  const detailHeading=useRef<HTMLHeadingElement>(null)

  function open(entry:SavedQuote){
    setProposal(entry);setPrompt('');setDecision('')
    window.requestAnimationFrame(()=>detailHeading.current?.focus())
  }
  async function run(action:string,task:()=>Promise<void>){
    if(inFlight.current)return
    inFlight.current=true;setBusy(action);setError('');setStatus('')
    try{await task()}catch(failure){setError(failure instanceof Error?failure.message:'Não foi possível concluir.')}
    finally{inFlight.current=false;setBusy('')}
  }
  function save(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault()
    if(!simulation||!clientId)return
    const {model,quantities}=simulation
    void run('save',async()=>{
      const entry=await api.post<SavedQuote>(endpoint,{clientId,title,briefing,terms,model,quantities})
      open(entry);setTitle('');setBriefing('');setTerms('');setClientId('');setStatus('Orçamento salvo como rascunho. Nenhuma mensagem foi enviada.')
    })
  }
  async function copy(value:string,noun:string){
    await run('copy',async()=>{
      try{await navigator.clipboard.writeText(value);setStatus(noun+' copiado. Nada foi enviado automaticamente.')}
      catch{setStatus('A cópia automática não está disponível. Selecione e copie o texto abaixo.')}
    })
  }

  return <section className="crm-panel personal-section quote-proposals">
    <h2>Orçamentos e propostas</h2>
    <p className="page-subtitle">Salve o briefing e os valores calculados, registre a aprovação do cliente e gere o prompt técnico. Nenhuma etapa envia mensagens ou cria contratos e cobranças.</p>
    {status&&<p className="personal-banner" role="status">{status}</p>}
    {error&&<p className="form-error" role="alert">{error}</p>}
    {<div className="quote-proposal-compose">
      <h3>Briefing do novo orçamento</h3>
      {!simulation&&<p>Preencha o briefing e calcule os valores no modelo acima para habilitar o salvamento.</p>}
      <form className="quote-client-find" onSubmit={event=>{event.preventDefault();setClientId('');setClientFilter(clientQuery.trim())}}>
        <label className="login-field"><span>Buscar cliente no CRM</span><input value={clientQuery} maxLength={100} onChange={e=>setClientQuery(e.target.value)} placeholder="Nome do cliente" /></label>
        <button className="button button-secondary" disabled={!!busy}>Buscar</button>
        {clientQuery&&<button type="button" className="button button-secondary" onClick={()=>{setClientQuery('');setClientFilter('');setClientId('')}}>Limpar busca</button>}
      </form>
      {clients.error&&<ErrorState message={clients.error} retry={clients.reload}/>}
      <form noValidate onSubmit={save}>
        <fieldset className="quote-editor" disabled={!!busy}>
          <label className="login-field"><span id={clientLabel}>Cliente</span><select aria-labelledby={clientLabel} required value={clientId} onChange={e=>setClientId(e.target.value)} disabled={clients.loading}>
            <option value="">{clients.loading?'Buscando…':'Selecione um cliente'}</option>
            {clients.data?.map(client=><option key={client.id} value={client.id}>{client.name||'Cliente sem nome'}</option>)}
          </select></label>
          {!clients.loading&&!clients.error&&!clients.data?.length&&<p>{clientFilter?'Nenhum cliente corresponde à busca.':'Cadastre um cliente no CRM antes de salvar.'}</p>}
          <label className="login-field"><span>Título do orçamento</span><input required value={title} maxLength={100} onChange={e=>setTitle(e.target.value)} placeholder="Ex.: Site institucional"/></label>
          <label className="login-field"><span>Briefing livre e escopo solicitado</span><textarea required value={briefing} maxLength={5000} rows={5} onChange={e=>setBriefing(e.target.value)} placeholder="Empresa, segmento, objetivo, problemas, serviços, funcionalidades, requisitos, integrações, referências, restrições e observações adicionais"/></label>
          <p>Inclua empresa, segmento, objetivo, problemas, serviços solicitados, funcionalidades, requisitos, integrações, referências, restrições e observações. Escreva livremente; dados técnicos ausentes serão tratados como lacunas.</p>
          <label className="login-field"><span>Condições comerciais (opcional)</span><textarea value={terms} maxLength={2000} rows={3} onChange={e=>setTerms(e.target.value)} placeholder="Prazos, validade da proposta e condições de pagamento"/></label>
          <div><button className="button button-primary" disabled={!simulation||!clientId||!title.trim()||!briefing.trim()} type="submit"><FileText size={17} aria-hidden="true"/> {busy==='save'?'Salvando…':'Salvar e montar proposta'}</button></div>
        </fieldset>
      </form>
    </div>}
    <h3>Orçamentos salvos</h3>
    {items.loading&&!items.data?<LoadingState/>:items.error?<ErrorState message={items.error} retry={items.reload}/>:!items.data?.length?<EmptyState title="Nenhum orçamento salvo" text="Orçamentos e seus valores ficam guardados na sua conta." />:
      <ul className="quote-proposal-list">{items.data.map(item=><li key={item.id}>
        <div><strong>{item.title}</strong><small>{item.client_name} · {decisionLabel(item)}</small></div>
        <button className="button button-secondary" disabled={!!busy} aria-label={'Abrir orçamento: '+item.title} onClick={()=>void run('open',async()=>open(await api.get<SavedQuote>(endpoint+'/'+item.id)))}>Abrir</button>
      </li>)}</ul>}
    {proposal&&<div className="quote-proposal-detail">
      <h3 ref={detailHeading} tabIndex={-1}>{proposal.title}</h3>
      <p>{decisionLabel(proposal)} · {proposal.client_name}</p>
      <label className="login-field"><span>Texto pronto para enviar</span><textarea readOnly rows={8} value={proposal.proposal_text}/></label>
      <div className="quote-actions"><button className="button button-secondary" disabled={!!busy} onClick={()=>void copy(proposal.proposal_text,'Texto da proposta')}><Clipboard size={16} aria-hidden="true"/> Copiar proposta</button></div>
      {proposal.approved_at ? <>
        <div className="quote-actions"><button className="button button-primary" disabled={!!busy} onClick={()=>void run('generate',async()=>{
          const result=await api.post<PromptVersion>(endpoint+'/'+proposal.id+'/prompts',{});setPrompt(result.content)
        })}>{busy==='generate'?'Gerando…':'Gerar Prompt'}</button></div>
        {prompt&&<div><p>Revise e remova dados pessoais ou sensíveis antes de compartilhar com qualquer agente. O Abelha não envia nem executa o texto.</p>
          <label className="login-field"><span id={promptLabel}>Prompt técnico</span><textarea aria-labelledby={promptLabel} rows={18} maxLength={30000} value={prompt} onChange={event=>setPrompt(event.target.value)}/></label>
          <button className="button button-primary" disabled={!!busy||!prompt.trim()} onClick={()=>void run('edit-prompt',async()=>{
            const saved=await api.post<PromptVersion>(endpoint+'/'+proposal.id+'/prompts',{content:prompt});setPrompt(saved.content);setStatus('Nova versão do prompt salva. O histórico foi preservado.')
          })}>Salvar nova versão do prompt</button>
          <button className="button button-secondary" disabled={!!busy} onClick={()=>void copy(prompt,'Prompt técnico')}>Copiar prompt técnico</button>
        </div>}
        <h4>Histórico de prompts</h4>
        {history.error?<ErrorState message={history.error} retry={history.reload}/>:history.loading?<LoadingState/>:!history.data?.length?<p>Nenhuma versão salva. Gere o primeiro prompt.</p>:<ul className="quote-proposal-list">{history.data.map((version,index)=><li key={version.id}><span>{index===0?'Mais recente · ':''}{version.source==='edited'?'Editado':'Gerado'} · {new Date(version.created_at).toLocaleString('pt-BR')}</span><button className="button button-secondary" disabled={!!busy} onClick={()=>setPrompt(version.content)}>Visualizar versão</button></li>)}</ul>}
      </> : proposal.status==='cancelled'?<p>Proposta cancelada. Salve uma nova versão para retomar a negociação.</p>: proposal.refused_at ? <p>Proposta recusada. Para negociar novamente, salve uma nova versão sem alterar este orçamento.</p> : <form className="quote-approval" onSubmit={event=>{
        event.preventDefault();if(!decision)return
        const action=decision
        void run(action,async()=>{
          open(await api.post<SavedQuote>(endpoint+'/'+proposal.id+'/'+action,{confirmed:true}))
          setStatus(action==='approve'?'Aprovação registrada. Nenhum contrato foi criado.':'Recusa registrada. Este orçamento não libera geração de prompt.')
        })
      }}>
        <label className="login-field"><span>Decisão informada pelo cliente</span><select value={decision} onChange={e=>setDecision(e.target.value as typeof decision)} disabled={!!busy}>
          <option value="">Selecione a decisão</option><option value="approve">Aprovou</option><option value="refuse">Recusou</option>
        </select></label>
        <button className="button button-primary" disabled={!!busy||!decision}>{busy==='approve'||busy==='refuse'?'Registrando…':'Registrar decisão'}</button>
      </form>}
      {!proposal.approved_at&&!proposal.refused_at&&proposal.status!=='cancelled'&&<div className="quote-actions">{[...(proposal.status==='draft'?['sent'] : []),...(proposal.status!=='awaiting_approval'?['awaiting_approval']:[]),'cancelled'].map(next=><button key={next} className="button button-secondary" disabled={!!busy} onClick={()=>void run('status',async()=>open(await api.post<SavedQuote>(endpoint+'/'+proposal.id+'/status',{status:next})))}>Registrar: {statusLabels[next]}</button>)}</div>}
      {!!proposal.status_history?.length&&<details><summary>Histórico comercial</summary><ul>{proposal.status_history.map((event,index)=><li key={index}>{statusLabels[event.status]} · {new Date(event.at).toLocaleString('pt-BR')}</li>)}</ul></details>}
    </div>}
  </section>
}
