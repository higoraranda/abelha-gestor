import { useState } from 'react'
import { CalendarClock, X } from 'lucide-react'
import { api } from '@/lib/api'
import type { Client, Reminder } from '@/types'

interface Props {
  date: string
  clients: Client[]
  onClose: () => void
  onCreated: (reminder: Reminder) => void
}

export default function AppointmentModal({ date, clients, onClose, onCreated }: Props) {
  const [form, setForm] = useState({ title: '', date, time: '09:00', clientId: '', description: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
    setError(null)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!form.title.trim()) {
      setError('Informe um título para o compromisso.')
      return
    }
    if (!form.date || !form.time) {
      setError('Informe a data e o horário.')
      return
    }

    setSaving(true)
    try {
      const dueAt = new Date(`${form.date}T${form.time}:00`).toISOString()
      const reminder = await api.post<Reminder>('/api/v1/reminders', {
        title: form.title.trim(),
        description: form.description.trim() || null,
        due_at: dueAt,
        linked_type: form.clientId ? 'client' : null,
        linked_id: form.clientId || null,
      })
      onCreated(reminder)
      onClose()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível criar o compromisso.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className="appointment-modal" role="dialog" aria-modal="true" aria-labelledby="appointment-modal-title">
        <div className="modal-heading">
          <div>
            <p className="eyebrow">Agenda</p>
            <h2 id="appointment-modal-title">Novo compromisso</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Fechar"><X size={18} aria-hidden="true" /></button>
        </div>

        <form className="appointment-form" onSubmit={handleSubmit}>
          <div className="appointment-callout"><CalendarClock size={19} aria-hidden="true" /><span>O compromisso também aparecerá nos lembretes da visão geral.</span></div>
          <label className="form-field"><span>Título *</span><input autoFocus value={form.title} onChange={(event) => set('title', event.target.value)} placeholder="Ex.: Reunião de alinhamento" /></label>
          <div className="form-grid form-grid-two">
            <label className="form-field"><span>Data *</span><input type="date" value={form.date} onChange={(event) => set('date', event.target.value)} /></label>
            <label className="form-field"><span>Horário *</span><input type="time" value={form.time} onChange={(event) => set('time', event.target.value)} /></label>
          </div>
          <label className="form-field">
            <span>Cliente relacionado</span>
            <select value={form.clientId} onChange={(event) => set('clientId', event.target.value)}>
              <option value="">Nenhum cliente</option>
              {clients.map((client) => <option value={client.id} key={client.id}>{client.name ?? client.whatsapp ?? 'Cliente sem nome'}</option>)}
            </select>
          </label>
          <label className="form-field"><span>Observações</span><textarea rows={4} value={form.description} onChange={(event) => set('description', event.target.value)} placeholder="Pauta, local, link da reunião ou próximos passos..." /></label>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <div className="modal-actions">
            <button type="button" className="button button-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="button button-primary" disabled={saving}>{saving ? 'Agendando...' : 'Agendar'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
