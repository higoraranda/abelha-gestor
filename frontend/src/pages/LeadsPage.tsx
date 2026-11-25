import { useEffect, useRef, useState } from 'react'
import { Search, ArrowUpRight } from 'lucide-react'
import { api } from '@/lib/api'
import { useRemote } from '@/hooks/useRemote'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/DataState'
interface Lead {source_key:string;name:string;niche:string;address:string|null;phone:string|null;website:string|null;socials:string[];source_url:string;queried_at:string}
interface Candidate {id:string;source:string;client_id:string|null;data:{name:string;summary?:string;classification?:string;phone?:string;email?:string}}
export default function LeadsPage({onClient}:{onClient:(id:string)=>void}) {
  const [form,setForm]=useState({niche:'',city:'',limit:'30'});const [results,setResults]=useState<Lead[]|null>(null);const [search,setSearch]=useState('');const [onlyContact,setOnlyContact]=useState(false);const [selected,setSelected]=useState<string[]>([]);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [success,setSuccess]=useState('')
  const candidates=useRemote<Candidate[]>('/api/v1/prospecting/leads/candidates');const [saving,setSaving]=useState<string|null>(null)
  const request=useRef<AbortController|null>(null)
  useEffect(()=>()=>request.current?.abort(),[])
  function cancel() {
    request.current?.abort()
    request.current=null
    setBusy(false)
    setSuccess('Busca cancelada.')
  }
  async function find(event:React.FormEvent) {
    event.preventDefault()
    if(request.current||busy||saving)return
    const active=new AbortController()
    request.current=active
    setBusy(true);setError('');setSuccess('');setResults(null);setSelected([]);setSearch('');setOnlyContact(false)
    try {
      const response=await api.post<{items:Lead[]}>('/api/v1/prospecting/leads/search',{
        niche:form.niche.trim(),city:form.city.trim(),limit:Number(form.limit),
      },active.signal)
      if(!active.signal.aborted)setResults(response.items)
    } catch(error) {
      if(!active.signal.aborted)setError(error instanceof Error?error.message:'Não foi possível consultar a fonte pública.')
    } finally {if(request.current===active){request.current=null;if(!active.signal.aborted)setBusy(false)}}
  }
  async function saveSelected(){if(saving||!results)return;setSaving('selected');setError('');setSuccess('');let saved=0;try{for(const lead of results.filter(item=>selected.includes(item.source_key))){await api.post('/api/v1/prospecting/leads/import',lead);saved++;setSelected(current=>current.filter(key=>key!==lead.source_key))}setSuccess(saved+' prospects salvos ou associados a registros existentes.')}catch(error){setError((saved?saved+' prospects processados. ':'')+(error instanceof Error?error.message:'Não foi possível salvar.'))}finally{setSaving(null)}}
  async function approve(candidate:Candidate){setSaving(candidate.id);setError('');try{const result=await api.post<{client_id:string}>('/api/v1/prospecting/leads/candidates/'+candidate.id+'/approve',{});onClient(result.client_id)}catch(error){setError(error instanceof Error?error.message:'Não foi possível importar.')}finally{setSaving(null)}}
  const visible=results?.filter(item=>item.name.toLowerCase().includes(search.toLowerCase())&&(!onlyContact||item.phone||item.website))
  return <div className="module-page"><header className="page-heading"><div><p className="eyebrow">ABELHA CRM / PROSPECÇÃO</p><h1>Encontre a próxima conversa.</h1><p className="page-subtitle">Busque estabelecimentos por nicho e cidade em dados públicos do OpenStreetMap.</p></div></header><section className="crm-panel personal-section"><form className="crm-form lead-search-form" onSubmit={find} aria-busy={busy}>
      <label>Nicho<input required disabled={busy} maxLength={80} placeholder="Ex.: padaria, barbearia" value={form.niche} onChange={e=>setForm({...form,niche:e.target.value})}/></label>
      <label>Cidade<input required disabled={busy} maxLength={100} placeholder="Ex.: Salto, SP" value={form.city} onChange={e=>setForm({...form,city:e.target.value})}/></label>
      <label>Máximo de resultados<input required disabled={busy} type="number" min="1" max="50" value={form.limit} onChange={e=>setForm({...form,limit:e.target.value})}/></label>
      <button type="submit" className="button button-primary" disabled={busy||Boolean(saving)}><Search size={17} aria-hidden="true"/>{busy?'Consultando…':'Buscar leads'}</button>
      {busy&&<button type="button" className="button button-secondary" onClick={cancel}>Cancelar busca</button>}
    </form><p className="page-subtitle">Digite o nicho que quiser. A busca cruza categorias, nomes e descrições do OpenStreetMap; a cobertura varia por cidade. Use a UF para diferenciar cidades com o mesmo nome. Até 50 resultados e uma consulta por minuto.</p><p className="page-subtitle"><a className="text-link" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors · ODbL</a></p></section>{error&&<p className="form-error" role="alert">{error}</p>}{success&&<p className="form-success" role="status">{success}</p>}{busy&&<LoadingState/>}
    {results&&<section className="crm-panel personal-section"><div className="crm-toolbar"><label>Filtrar resultados<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Nome do estabelecimento"/></label>{search&&<button className="button button-secondary" onClick={()=>setSearch('')}>Limpar busca</button>}<label className="personal-checkbox"><input type="checkbox" checked={onlyContact} onChange={e=>setOnlyContact(e.target.checked)}/> Com telefone ou site informado</label><button className="button button-primary" disabled={!selected.length||Boolean(saving)} onClick={()=>void saveSelected()}>Salvar selecionados ({selected.length})</button></div>{!visible?.length?<EmptyState title={results.length?'Nenhum resultado neste filtro':'Nenhum estabelecimento encontrado'} text={results.length?'Limpe os filtros para rever os resultados.':'Tente outro termo. O OpenStreetMap pode não ter estabelecimentos desse nicho mapeados nesta cidade.'}/>:visible.map(lead=><article className="lead-result" key={lead.source_key}><label className="personal-checkbox"><input type="checkbox" checked={selected.includes(lead.source_key)} onChange={e=>setSelected(current=>e.target.checked?[...current,lead.source_key]:current.filter(key=>key!==lead.source_key))}/><strong>{lead.name}</strong></label><div><p>{lead.niche} · {lead.address||'Endereço não informado na fonte'}</p><p>{lead.phone||'Telefone não informado'} · {lead.website?<a className="text-link" href={lead.website} target="_blank" rel="noopener noreferrer">Site informado <ArrowUpRight size={13}/></a>:'Site não informado na fonte'}</p>{lead.socials?.map(url=><a className="text-link" key={url} href={url} target="_blank" rel="noopener noreferrer">Rede social informada </a>)}<small><a className="text-link" href={lead.source_url} target="_blank" rel="noopener noreferrer">Registro OpenStreetMap</a> · consultado em {new Date(lead.queried_at).toLocaleString('pt-BR')}</small><p className="page-subtitle">Oportunidade a revisar: {lead.website?'Confira o site e os canais antes do contato.':'Investigue a presença digital antes de oferecer um site.'}</p></div></article>)}</section>}
    <section className="crm-panel personal-section"><h2>Capturas para revisar</h2><p className="page-subtitle">Emails e formulários classificados por uma integração ficam aguardando sua revisão. Aprovar cria ou associa o contato; não envia mensagens.</p>{candidates.loading?<LoadingState/>:candidates.error?<ErrorState message={candidates.error} retry={candidates.reload}/>:!candidates.data?.filter(c=>!c.client_id).length?<EmptyState title="Nenhuma captura pendente" text="As entradas de email e formulário aparecerão aqui quando a integração estiver conectada."/>:candidates.data.filter(c=>!c.client_id).map(candidate=><article className="personal-update" key={candidate.id}><h3>{candidate.data.name}</h3><p>{candidate.data.summary}</p><p>{candidate.data.email} {candidate.data.phone}</p><small>{candidate.source} · classificação informada: {candidate.data.classification||'Revisar'}</small><button className="button button-secondary" disabled={Boolean(saving)} onClick={()=>void approve(candidate)}>Aprovar e abrir contato</button></article>)}</section>
  </div>
}
