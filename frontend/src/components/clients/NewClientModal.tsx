import { useRef, useState } from 'react'
import { api } from '@/lib/api'
import type { Client, NewContractInput } from '@/types'
import ContractWizard from './ContractWizard'
import Modal from '@/components/ui/Modal'
export default function NewClientModal({onClose,onCreate}:{onClose:()=>void;onCreate:(client:Client)=>void}) {
  const [contract,setContract]=useState(false); const [form,setForm]=useState({name:'',whatsapp:'',email:'',notes:''}); const [error,setError]=useState('');const [busy,setBusy]=useState(false);const submitting=useRef(false)
  async function create(initialContract?:NewContractInput) {
    if(submitting.current)return
    if(!form.name.trim()){setError('Informe o nome do contato.');return}
    submitting.current=true;setBusy(true);setError('')
    try{const client=await api.post<Client>('/api/v1/clients',{...form,name:form.name.trim(),whatsapp:form.whatsapp.trim()||null,email:form.email.trim()||null,notes:form.notes.trim()||null,initialContract});onCreate(client);onClose()}
    catch(e){if(initialContract)throw e;setError(e instanceof Error?e.message:'Não foi possível cadastrar.')}finally{submitting.current=false;setBusy(false)}
  }
  return <Modal wide={contract} title="Novo contato" description="Cadastre um cliente ou prospect. Você pode adicionar um contrato agora ou depois." onClose={()=>{if(!busy)onClose()}}>
    {contract?<ContractWizard onBack={()=>setContract(false)} onSubmit={create} submitLabel="Criar contato e contrato"/>:<form className="crm-form" onSubmit={e=>{e.preventDefault();void create()}}>
      <label>Nome<input autoFocus required maxLength={255} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Nome ou razão social"/></label><div className="crm-form-grid"><label>WhatsApp<input value={form.whatsapp} onChange={e=>setForm({...form,whatsapp:e.target.value})} placeholder="55 11 99999-9999"/></label><label>Email<input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="cliente@empresa.com"/></label></div><label>Observações<textarea rows={3} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label>{error&&<p role="alert" className="form-error">{error}</p>}<footer><button className="button button-secondary" type="button" disabled={busy} onClick={()=>{if(form.name.trim())setContract(true);else setError('Informe o nome antes de adicionar o contrato.')}}>Adicionar contrato agora</button><button className="button button-primary" disabled={busy}>{busy?'Salvando…':'Salvar contato'}</button></footer>
    </form>}
  </Modal>
}