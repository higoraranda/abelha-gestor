import { useState, type FormEvent } from 'react'
import { LoaderCircle, ReceiptText, X } from 'lucide-react'
import { api } from '@/lib/api'
import type { Expense, ExpenseCategory, ExpenseStatus } from '@/types'

const CATEGORIES: Array<{ value: ExpenseCategory; label: string }> = [
  { value: 'subscriptions', label: 'Assinaturas' },
  { value: 'ads', label: 'Anúncios' },
  { value: 'tools', label: 'Ferramentas' },
  { value: 'infrastructure', label: 'Infraestrutura' },
  { value: 'services', label: 'Serviços' },
  { value: 'taxes', label: 'Impostos e taxas' },
  { value: 'other', label: 'Outros' },
]

interface Props {
  onClose: () => void
  onSaved: (expense: Expense) => void
}

export default function ExpenseModal({ onClose, onSaved }: Props) {
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<ExpenseCategory>('subscriptions')
  const [amount, setAmount] = useState('')
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [status, setStatus] = useState<ExpenseStatus>('paid')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const numericAmount = Number(amount.replace(',', '.'))
    if (!description.trim()) return setError('Informe a descrição do gasto.')
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) return setError('Informe um valor válido.')
    if (!expenseDate) return setError('Informe a data do gasto.')

    setSaving(true)
    setError(null)
    try {
      const expense = await api.post<Expense>('/api/v1/finance/expenses', {
        description: description.trim(),
        category,
        amount: numericAmount,
        expenseDate,
        status,
        notes: notes.trim() || null,
      })
      onSaved(expense)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível registrar o gasto.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className="expense-modal" role="dialog" aria-modal="true" aria-labelledby="expense-modal-title">
        <header className="modal-heading">
          <div><p className="eyebrow">Saída financeira</p><h2 id="expense-modal-title">Registrar gasto</h2><span>Inclua assinaturas, anúncios, ferramentas e outras despesas do negócio.</span></div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Fechar"><X size={18} aria-hidden="true" /></button>
        </header>

        <form className="expense-form" onSubmit={handleSubmit}>
          <div className="expense-form-intro"><span><ReceiptText size={18} aria-hidden="true" /></span><div><strong>Informações do gasto</strong><small>Os gastos pagos entram no saldo do mês pela data informada.</small></div></div>
          <label className="form-field expense-description"><span>Descrição</span><input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Ex.: Assinatura do servidor" autoFocus /></label>
          <div className="expense-form-grid">
            <label className="form-field"><span>Categoria</span><select value={category} onChange={(event) => setCategory(event.target.value as ExpenseCategory)}>{CATEGORIES.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select></label>
            <label className="form-field"><span>Valor</span><input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0,00" /></label>
            <label className="form-field"><span>Data</span><input type="date" value={expenseDate} onChange={(event) => setExpenseDate(event.target.value)} /></label>
            <label className="form-field"><span>Situação</span><select value={status} onChange={(event) => setStatus(event.target.value as ExpenseStatus)}><option value="paid">Pago</option><option value="planned">Planejado</option></select></label>
          </div>
          <label className="form-field"><span>Observações</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Detalhes opcionais" rows={3} /></label>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <footer><button type="button" className="button button-secondary" onClick={onClose}>Cancelar</button><button type="submit" className="button button-primary" disabled={saving}>{saving ? <><LoaderCircle className="spin" size={15} aria-hidden="true" /> Salvando...</> : 'Registrar gasto'}</button></footer>
        </form>
      </div>
    </div>
  )
}
