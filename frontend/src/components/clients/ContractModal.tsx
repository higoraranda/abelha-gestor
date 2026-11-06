import { useState } from 'react'
import { api } from '@/lib/api'
import type { ClientContract, NewContractInput } from '@/types'
import type { Opportunity } from '@/types/crm'
import ContractWizard from './ContractWizard'
import { emptyContract } from '@/lib/contractDefaults'
import Modal from '@/components/ui/Modal'
interface Props { clientId:string;contract?:ClientContract|null;opportunity?:Opportunity;onClose:()=>void;onSaved:()=>void }
export default function ContractModal({clientId,contract,opportunity,onClose,onSaved}:Props) {
  const [busy,setBusy]=useState(false)
  const hasPaid=Boolean(contract?.receivables.some(item=>item.status==='paid'))
  const initial=contract ? {
    catalogItemId:contract.catalogItemId,serviceName:contract.serviceName,serviceDescription:contract.serviceDescription,
    grossAmount:contract.grossAmount,paymentMethod:contract.paymentMethod,monthlyFee:contract.monthlyFee,monthlyDueDay:contract.monthlyDueDay,
    developmentStartDate:contract.developmentStartDate.slice(0,10),developmentEndDate:contract.developmentEndDate.slice(0,10),contractEndDate:contract.contractEndDate.slice(0,10),notes:contract.notes,
  } satisfies NewContractInput : opportunity ? {...emptyContract(),serviceName:opportunity.title,grossAmount:opportunity.amount} : undefined
  async function save(input:NewContractInput) {
    if (opportunity) await api.post('/api/v1/crm/opportunities/'+opportunity.id+'/convert',input)
    else if(contract) await api.patch('/api/v1/contracts/'+contract.id,hasPaid?{serviceDescription:input.serviceDescription,notes:input.notes}:input)
    else await api.post('/api/v1/clients/'+clientId+'/contracts',input)
    onSaved();onClose()
  }
  return <Modal wide title={opportunity?'Confirmar contratação':contract?'Editar contrato':'Adicionar contrato'} description={opportunity?'Revise os dados. A oportunidade só será ganha quando você confirmar o contrato.':hasPaid?'Valores bloqueados porque há cobranças pagas.':'Valores e regras de contratação preservados.'} onClose={()=>{if(!busy)onClose()}}>
    <ContractWizard initial={initial} onBack={()=>{if(!busy)onClose()}} onSubmit={save} onBusyChange={setBusy} submitLabel={opportunity?'Confirmar contrato e ganhar':contract?'Salvar alterações':'Adicionar contrato'} lockedStructure={hasPaid}/>
  </Modal>
}