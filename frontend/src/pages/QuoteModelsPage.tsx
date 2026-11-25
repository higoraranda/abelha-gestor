import { useRef, useState } from 'react'
import { Calculator, Download, Plus, Upload } from 'lucide-react'
import { api } from '@/lib/api'
import { useRemote } from '@/hooks/useRemote'
import { useAuthStore } from '@/store/auth'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/DataState'
import { emptyModel, example, modelingPrompt, scaled, type QuoteModel, type QuoteLine, type SavedModel, type Quote } from '@/lib/quoteModels'
import QuoteProposals, { type QuoteSimulation } from './QuoteProposals'

const endpoint='/api/v1/quote-models'
const money=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'})
const reais=(cents:number)=>money.format(cents/100)
type LineDraft=Omit<QuoteLine,'priceCents'>&{price:string}
type Draft={name:string;base:string;monthly:string;discount:string;lines:LineDraft[]}
type Revision=Pick<SavedModel,'id'|'revision'>
function asDraft(model:QuoteModel):Draft{
  return {name:model.name,base:String(model.baseCents/100),monthly:String(model.monthlyCents/100),discount:String(model.discountBps/100),lines:model.lines.map(({priceCents,...line})=>({...line,price:String(priceCents/100)}))}
}
function asModel(d:Draft):QuoteModel {
  return {version:1,name:d.name,baseCents:scaled(d.base,2,'Preço base'),monthlyCents:scaled(d.monthly,2,'Mensalidade'),discountBps:scaled(d.discount,2,'Desconto'),lines:d.lines.map(({price,...line})=>({...line,priceCents:scaled(price,2,'Preço do item')}))}
}
function download(model:QuoteModel,fileName:string){
  const url=URL.createObjectURL(new Blob([JSON.stringify(model,null,2)+'\n'],{type:'application/json'}))
  const link=document.createElement('a');link.href=url;link.download=fileName;link.click()
  window.setTimeout(()=>URL.revokeObjectURL(url),1000)
}
function Field({label,value,onChange,decimal=false,required=false,maxLength}:{label:string;value:string;onChange:(value:string)=>void;decimal?:boolean;required?:boolean;maxLength?:number}){
  return <label className="login-field"><span>{label}</span><input inputMode={decimal?'decimal':undefined} value={value} required={required} maxLength={maxLength} onChange={event=>onChange(event.target.value)}/></label>
}
function Summary({quote}:{quote:Quote}){
  const totals=[['Subtotal único',quote.subtotalCents],['Desconto',quote.discountCents],['Total único',quote.oneTimeCents],['Total mensal',quote.monthlyCents]] as const
  return <div className="quote-totals" aria-live="polite"><h3>Resumo do orçamento</h3><dl>
    {quote.lines.filter(line=>line.amountCents).map(line=><div key={line.id}><dt>{line.label}{line.period==='monthly'?' (mensal)':''}</dt><dd>{reais(line.amountCents)}</dd></div>)}
    {totals.map(([label,total],i)=><div className={i>=2?'quote-total':undefined} key={label}><dt>{label}</dt><dd>{reais(total)}</dd></div>)}
  </dl></div>
}

export default function QuoteModelsPage(){
  const userId=useAuthStore(state=>state.user?.id)
  const isOwner=useAuthStore(state=>state.user?.role==='owner')
  const remote=useRemote<SavedModel[]>(userId?endpoint:null)
  const [editor,setEditor]=useState<Draft|null>(null)
  const [selected,setSelected]=useState<Revision|null>(null)
  const [quantities,setQuantities]=useState<Record<string,string>>({})
  const [simulation,setSimulation]=useState<QuoteSimulation|null>(null)
  const [importText,setImportText]=useState('')
  const [copyFallback,setCopyFallback]=useState(false)
  const [busy,setBusy]=useState('')
  const [error,setError]=useState('')
  const [status,setStatus]=useState('')
  const editorHeading=useRef<HTMLHeadingElement>(null)
  const working=useRef(false)

  function open(model:QuoteModel,saved:Revision|null=null){
    setSelected(saved);setEditor(asDraft(model));setQuantities({});setSimulation(null);setError('');setStatus('')
    window.requestAnimationFrame(()=>editorHeading.current?.focus())
  }
  function update(values:Partial<Draft>){setEditor(current=>current?{...current,...values}:current);setSimulation(null)}
  function changeLine(id:string,values:Partial<LineDraft>){
    if(editor)update({lines:editor.lines.map(line=>line.id===id?{...line,...values}:line)})
    if('unit' in values)setQuantities(current=>({...current,[id]:''}))
  }
  async function run(action:string,fn:()=>Promise<void>){
    if(working.current)return
    working.current=true;setBusy(action);setError('');setStatus('')
    try{await fn()}catch(failure){setError(failure instanceof Error?failure.message:'Não foi possível concluir.')}
    finally{working.current=false;setBusy('')}
  }
  const preview=(model:unknown,values:Record<string,number>={})=>api.post<{model:QuoteModel;quote:Quote}>(endpoint+'/preview',{model,quantities:values})
  function simulate(){
    if(!editor)return
    void run('calculando',async()=>{
      const values=Object.fromEntries(editor.lines.map(line=>[line.id,scaled(quantities[line.id]??'',3,line.label||'Quantidade')]))
      const result=await preview(asModel(editor),values)
      setSimulation({...result,quantities:values})
    })
  }
  function save(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault()
    if(!editor)return
    void run('salvando',async()=>{
      const model=asModel(editor)
      const saved=selected?await api.patch<SavedModel>(endpoint+'/'+selected.id,{model,revision:selected.revision}):await api.post<SavedModel>(endpoint,{model})
      setSelected({id:saved.id,revision:saved.revision});setStatus('Modelo salvo na sua conta.')
    })
  }
  function importModel(){
    void run('validando',async()=>{
      if(!importText.trim())throw new Error('Cole o JSON ou selecione um arquivo.')
      if(new TextEncoder().encode(importText).length>32768)throw new Error('O modelo deve ter até 32 KB.')
      let value:unknown
      try{value=JSON.parse(importText)}catch{throw new Error('JSON inválido. Cole somente o conteúdo do modelo, sem as marcações do chat.')}
      const result=await preview(value)
      open(result.model);setSimulation({...result,quantities:{}});setStatus('Prévia aberta como novo modelo. Confira os valores e salve para confirmar.')
    })
  }
  function readFile(file?:File){
    if(!file)return
    void run('lendo',async()=>{
      if(file.size>32768)throw new Error('O arquivo deve ter até 32 KB.')
      setImportText(await file.text());setStatus('Arquivo carregado. Use Validar e abrir prévia.')
    })
  }
  async function copyPrompt(){
    try{await navigator.clipboard.writeText(modelingPrompt);setStatus('Prompt copiado. Nenhum dado foi enviado para a IA.')}
    catch{setCopyFallback(true)}
  }
  if(!userId)return <section className="module-page"><h1>Calculadora de valores</h1><p className="personal-banner">Entre com uma conta para salvar modelos privados. A calculadora antiga continua no atalho do CRM.</p></section>
  return <div className="module-page quote-page">
    <header className="page-heading"><div><p className="eyebrow">Abelha / Orçamentos</p><h1>Calculadora de valores</h1><p className="page-subtitle">Monte suas regras de preço e reutilize o modelo em novos orçamentos.</p></div><button className="button button-primary" onClick={()=>open(emptyModel)} disabled={!!busy}><Plus size={17} aria-hidden="true"/> Novo modelo</button></header>
    {status&&<p className="personal-banner" role="status">{status}</p>}
    {error&&<p className="login-error" role="alert">{error}</p>}
    <div className="quote-grid">
      <aside className="crm-panel personal-section quote-library">
        <h2>Meus modelos</h2>
        {remote.loading&&!remote.data?<LoadingState/>:remote.error?<ErrorState message={remote.error} retry={remote.reload}/>:!remote.data?.length?<EmptyState title="Nenhum modelo salvo" text="Crie do zero ou importe um exemplo. Seus modelos ficam só nesta conta."/>:
          <ul aria-label="Modelos salvos">{remote.data.map(item=><li key={item.id}><button className="button button-secondary" aria-pressed={selected?.id===item.id} disabled={!!busy} onClick={()=>open(item.model,{id:item.id,revision:item.revision})}>{item.model.name}</button></li>)}</ul>}
        <details className="quote-transfer"><summary>Importar modelo ou usar IA</summary>
          <p>Use o agente que preferir. Não inclua dados de clientes nem senhas. Nada é enviado automaticamente.</p>
          <div className="quote-actions"><button className="button button-secondary" onClick={()=>download(example,'abelha-modelo-exemplo.json')}>Baixar exemplo</button><button className="button button-secondary" onClick={()=>void copyPrompt()}>Copiar prompt</button></div>
          {copyFallback&&<label className="login-field"><span>Prompt para copiar</span><textarea readOnly value={modelingPrompt} rows={6}/></label>}
          <label className="login-field"><span>Carregar arquivo JSON (até 32 KB)</span><input type="file" accept=".json,application/json" disabled={!!busy} onChange={event=>{readFile(event.currentTarget.files?.[0]);event.currentTarget.value=''}}/></label>
          <label className="login-field"><span>Ou cole o JSON</span><textarea rows={5} value={importText} onChange={event=>setImportText(event.target.value)} maxLength={32768}/></label>
          <button className="button button-secondary" onClick={importModel} disabled={!!busy}><Upload size={16} aria-hidden="true"/> Validar e abrir prévia</button>
        </details>
      </aside>
      {editor?<div className="quote-main"><section className="crm-panel personal-section">
        <h2 ref={editorHeading} tabIndex={-1}>{selected?'Editar modelo':'Novo modelo'}</h2>
        <p>Preencha em reais. O desconto vale só para a cobrança única.</p>
        <form className="register-fields" onSubmit={save}><fieldset disabled={!!busy} className="quote-editor">
          <Field label="Nome do modelo" value={editor.name} required maxLength={80} onChange={name=>update({name})}/>
          <div className="quote-fields">
            <Field label="Preço base (R$)" value={editor.base} decimal onChange={base=>update({base})}/>
            <Field label="Mensalidade base (R$)" value={editor.monthly} decimal onChange={monthly=>update({monthly})}/>
            <Field label="Desconto (%)" value={editor.discount} decimal onChange={discount=>update({discount})}/>
          </div>
          {editor.lines.map((line,index)=><fieldset key={line.id} className="quote-line">
            <legend>Item {index+1}</legend>
            <div className="quote-fields">
              <Field label="Descrição" value={line.label} required maxLength={80} onChange={label=>changeLine(line.id,{label})}/>
              <Field label="Preço (R$)" value={line.price} decimal onChange={price=>changeLine(line.id,{price})}/>
              <label className="login-field"><span>Cobrar por</span><select value={line.unit} onChange={event=>changeLine(line.id,{unit:event.target.value as QuoteLine['unit']})}><option value="fixed">Valor fixo</option><option value="unit">Unidade</option><option value="hour">Hora</option></select></label>
              <label className="login-field"><span>Frequência</span><select value={line.period} onChange={event=>changeLine(line.id,{period:event.target.value as QuoteLine['period']})}><option value="once">Uma vez</option><option value="monthly">Por mês</option></select></label>
            </div>
            <button className="text-button" type="button" aria-label={'Remover item '+(index+1)} onClick={()=>update({lines:editor.lines.filter(item=>item.id!==line.id)})}>Remover item</button>
          </fieldset>)}
          <div className="quote-actions">
            <button type="button" className="button button-secondary" disabled={editor.lines.length>=30} onClick={()=>update({lines:[...editor.lines,{id:'item-'+crypto.randomUUID().replaceAll('-',''),label:'',price:'0',unit:'fixed',period:'once'}]})}>Adicionar item</button>
            <button type="submit" className="button button-primary">{busy==='salvando'?'Salvando…':'Salvar modelo'}</button>
            <button type="button" className="button button-secondary" onClick={()=>void run('exportando',async()=>{const result=await preview(asModel(editor));download(result.model,'abelha-meu-modelo.json');setStatus('Modelo exportado.')})}><Download size={16} aria-hidden="true"/> Exportar modelo</button>
          </div>
        </fieldset></form>
      </section><section className="crm-panel personal-section">
        <h2>Simular orçamento</h2><p>Inclua só os itens deste trabalho. A simulação não cria contratos nem cobranças.</p>
        <div className="quote-fields">{editor.lines.map((line,index)=><label className="login-field" key={line.id}><span>{line.label||'Item '+(index+1)} {line.unit==='hour'?'(horas)':line.unit==='unit'?'(unidades)':''}</span>
          {line.unit==='fixed'?<select disabled={!!busy} value={quantities[line.id]??'0'} onChange={event=>{setQuantities({...quantities,[line.id]:event.target.value});setSimulation(null)}}><option value="0">Não incluir</option><option value="1">Incluir</option></select>:<input disabled={!!busy} inputMode={line.unit==='hour'?'decimal':'numeric'} value={quantities[line.id]??''} placeholder="0" onChange={event=>{setQuantities({...quantities,[line.id]:event.target.value});setSimulation(null)}}/>}
        </label>)}</div>
        <button className="button button-primary" type="button" disabled={!!busy} onClick={simulate}><Calculator size={17} aria-hidden="true"/> {busy==='calculando'?'Calculando…':'Calcular'}</button>
        {simulation&&<Summary quote={simulation.quote}/>}
      </section></div>:<section className="crm-panel personal-section"><EmptyState title="Selecione ou crie um modelo" text="Junte preço fixo, horas, unidades, adicionais e cobranças mensais conforme o seu serviço."/></section>}
    </div>
    {isOwner&&<QuoteProposals key={userId} simulation={simulation}/>}
  </div>
}
