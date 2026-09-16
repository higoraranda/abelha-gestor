import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { api } from '@/lib/api'
import type { Client, Company } from '@/types'

interface Props {
  onClose:          () => void
  onCreate:         (client: Client) => void
  defaultCompanyId?: string
}

export default function NewClientModal({ onClose, onCreate, defaultCompanyId }: Props) {
  const [companies, setCompanies] = useState<Company[]>([])
  const [form, setForm] = useState({ name: '', whatsapp: '', email: '', notes: '', company_id: defaultCompanyId ?? '' })
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    api.get<Company[]>('/api/v1/companies').then(setCompanies).catch(console.error)
  }, [])

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.company_id) { setError('Empresa é obrigatória'); return }
    setSaving(true)
    try {
      const client = await api.post<Client>('/api/v1/clients', {
        name:       form.name.trim() || null,
        whatsapp:   form.whatsapp.trim() || null,
        email:      form.email.trim() || null,
        notes:      form.notes.trim() || null,
        company_id: form.company_id,
      })
      onCreate(client)
      onClose()
    } catch (err: any) {
      setError(err.message ?? 'Erro ao criar cliente')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    padding: '9px 12px', fontSize: '14px', color: '#111827',
    border: '1px solid rgba(0,0,0,0.12)', borderRadius: '7px',
    outline: 'none', backgroundColor: '#f9fafb',
    fontFamily: 'inherit',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '13px', fontWeight: 500,
    color: '#374151', marginBottom: '5px',
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      backgroundColor: 'rgba(0,0,0,0.35)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        backgroundColor: '#ffffff', borderRadius: '12px',
        padding: '24px', width: '440px', maxWidth: 'calc(100vw - 32px)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: 0 }}>Novo cliente</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex' }}>
            <X size={18} color="#6b7280" />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={labelStyle}>Nome</label>
            <input style={inputStyle} type="text" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Nome do cliente" />
          </div>

          <div>
            <label style={labelStyle}>WhatsApp</label>
            <input style={inputStyle} type="text" value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} placeholder="Ex: 5585999887766" />
          </div>

          <div>
            <label style={labelStyle}>Email</label>
            <input style={inputStyle} type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="email@exemplo.com" />
          </div>

          <div>
            <label style={{ ...labelStyle }}>
              Empresa <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              value={form.company_id}
              onChange={(e) => set('company_id', e.target.value)}
              style={{ ...inputStyle, appearance: 'auto' }}
              required
            >
              <option value="">Selecione uma empresa</option>
              {companies.map((co) => (
                <option key={co.id} value={co.id}>{co.name}</option>
              ))}
            </select>
            {companies.length === 0 && (
              <p style={{ fontSize: '12px', color: '#9ca3af', margin: '4px 0 0' }}>
                Nenhuma empresa cadastrada ainda. Cadastre uma empresa primeiro.
              </p>
            )}
          </div>

          <div>
            <label style={labelStyle}>Observações</label>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Observações sobre o cliente..."
              rows={3}
              style={{ ...inputStyle, resize: 'none', lineHeight: 1.5 }}
            />
          </div>

          {error && (
            <p style={{ fontSize: '13px', color: '#ef4444', margin: 0 }}>{error}</p>
          )}

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 16px', fontSize: '14px', fontWeight: 500,
                color: '#6b7280', backgroundColor: '#f3f4f6',
                border: 'none', borderRadius: '7px', cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '9px 16px', fontSize: '14px', fontWeight: 500,
                color: '#111827', backgroundColor: '#F2E600',
                border: 'none', borderRadius: '7px',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? 'Salvando...' : 'Criar cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
