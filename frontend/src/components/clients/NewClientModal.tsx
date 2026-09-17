import { useState } from 'react'
import { ArrowRight, X } from 'lucide-react'
import { api } from '@/lib/api'
import type { Client, NewContractInput } from '@/types'
import ContractWizard from './ContractWizard'

interface Props {
  onClose: () => void
  onCreate: (client: Client) => void
}

export default function NewClientModal({ onClose, onCreate }: Props) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ name: '', whatsapp: '', email: '', notes: '' })
  const [error, setError] = useState<string | null>(null)

  function set(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
    setError(null)
  }

  function continueToContract() {
    if (!form.name.trim()) {
      setError('Nome é obrigatório.')
      return
    }
    setStep(2)
  }

  async function createClient(initialContract: NewContractInput) {
    const client = await api.post<Client>('/api/v1/clients', {
      name: form.name.trim(),
      whatsapp: form.whatsapp.trim() || null,
      email: form.email.trim() || null,
      notes: form.notes.trim() || null,
      initialContract,
    })
    onCreate(client)
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className="contract-modal" role="dialog" aria-modal="true" aria-labelledby="new-client-title">
        <header className="modal-heading contract-modal-heading">
          <div><p className="eyebrow">Cadastro completo</p><h2 id="new-client-title">Novo cliente</h2></div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Fechar"><X size={18} aria-hidden="true" /></button>
        </header>

        <div className="contract-modal-body">
          {step === 1 ? (
            <>
              <div className="wizard-progress" aria-label="Etapa 1 de 4">
                {[1, 2, 3, 4].map((item) => <span className={item === 1 ? 'is-active' : ''} key={item} />)}
              </div>
              <section className="contract-step">
                <div className="wizard-copy"><p>Etapa 1 de 4</p><h3>Dados do cliente</h3><span>Cadastre os canais de contato e informações importantes.</span></div>
                <div className="form-grid-two">
                  <label className="form-field"><span>Nome</span><input value={form.name} onChange={(event) => set('name', event.target.value)} placeholder="Nome ou razão social" autoFocus /></label>
                  <label className="form-field"><span>WhatsApp</span><input value={form.whatsapp} onChange={(event) => set('whatsapp', event.target.value)} placeholder="55 11 99999-9999" /></label>
                </div>
                <label className="form-field"><span>Email</span><input type="email" value={form.email} onChange={(event) => set('email', event.target.value)} placeholder="cliente@empresa.com" /></label>
                <label className="form-field"><span>Observações</span><textarea rows={4} value={form.notes} onChange={(event) => set('notes', event.target.value)} placeholder="Contexto, preferências e informações relevantes" /></label>
              </section>
              {error ? <p className="form-error" role="alert">{error}</p> : null}
              <footer className="wizard-actions wizard-actions-end">
                <button type="button" className="button button-secondary" onClick={onClose}>Cancelar</button>
                <button type="button" className="button button-primary" onClick={continueToContract}>Continuar <ArrowRight size={16} aria-hidden="true" /></button>
              </footer>
            </>
          ) : (
            <ContractWizard onBack={() => setStep(1)} onSubmit={createClient} submitLabel="Criar cliente e contrato" />
          )}
        </div>
      </div>
    </div>
  )
}
