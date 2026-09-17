import { X } from 'lucide-react'
import { api } from '@/lib/api'
import type { ClientContract, NewContractInput } from '@/types'
import ContractWizard from './ContractWizard'

interface Props {
  clientId: string
  contract?: ClientContract | null
  onClose: () => void
  onSaved: () => void
}

export default function ContractModal({ clientId, contract, onClose, onSaved }: Props) {
  const hasPaid = Boolean(contract?.receivables.some((item) => item.status === 'paid'))
  const initial = contract ? {
    catalogItemId: contract.catalogItemId,
    serviceName: contract.serviceName,
    serviceDescription: contract.serviceDescription,
    grossAmount: contract.grossAmount,
    paymentMethod: contract.paymentMethod,
    monthlyFee: contract.monthlyFee,
    monthlyDueDay: contract.monthlyDueDay,
    developmentStartDate: contract.developmentStartDate,
    developmentEndDate: contract.developmentEndDate,
    contractEndDate: contract.contractEndDate,
    notes: contract.notes,
  } satisfies NewContractInput : undefined

  async function save(input: NewContractInput) {
    if (contract) await api.patch(`/api/v1/contracts/${contract.id}`, hasPaid ? {
      serviceDescription: input.serviceDescription,
      notes: input.notes,
    } : input)
    else await api.post(`/api/v1/clients/${clientId}/contracts`, input)
    onSaved()
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className="contract-modal" role="dialog" aria-modal="true" aria-labelledby="contract-title">
        <header className="modal-heading contract-modal-heading">
          <div>
            <p className="eyebrow">{contract ? 'Contrato existente' : 'Novo serviço'}</p>
            <h2 id="contract-title">{contract ? 'Editar contrato' : 'Adicionar contrato'}</h2>
            {hasPaid ? <span className="modal-heading-note">Valores bloqueados porque há cobranças pagas.</span> : null}
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Fechar"><X size={18} aria-hidden="true" /></button>
        </header>
        <div className="contract-modal-body">
          <ContractWizard initial={initial} onBack={onClose} onSubmit={save} submitLabel={contract ? 'Salvar alterações' : 'Adicionar contrato'} lockedStructure={hasPaid} />
        </div>
      </div>
    </div>
  )
}
