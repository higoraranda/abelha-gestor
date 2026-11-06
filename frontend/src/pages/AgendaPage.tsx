import { useMemo, useState } from 'react'
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Plus,
  Trash2,
  UserRound,
} from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { today as brazilToday } from '@/types/crm'
import { api } from '@/lib/api'
import type { Client, Reminder } from '@/types'
import AppointmentModal from '@/components/agenda/AppointmentModal'

interface Props {
  focusId?:string
  clients: Client[]
  reminders: Reminder[]
  onRemindersChange: () => void
}

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const monthFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
const longDateFormatter = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
const timeFormatter = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone:'America/Sao_Paulo' })

function dateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function buildCalendarDays(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const mondayOffset = (first.getDay() + 6) % 7
  const start = new Date(first)
  start.setDate(first.getDate() - mondayOffset)
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return date
  })
}

export default function AgendaPage({ clients, reminders, onRemindersChange, focusId }: Props) {
  const today = parseDateKey(brazilToday())
  const initialDay=focusId?reminders.find(r=>r.id===focusId)?.dueAt:undefined
  const initialDate=initialDay?new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(initialDay)):dateKey(today)
  const [error,setError]=useState('')
  const [removing,setRemoving]=useState<Reminder|null>(null)
  const [month, setMonth] = useState(() => new Date(parseDateKey(initialDate).getFullYear(), parseDateKey(initialDate).getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState(() => initialDate)
  const [showModal, setShowModal] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const calendarDays = useMemo(() => buildCalendarDays(month), [month])
  const remindersByDay = useMemo(() => reminders.reduce<Record<string, Reminder[]>>((groups, reminder) => {
    const key = new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(reminder.dueAt))
    groups[key] = [...(groups[key] ?? []), reminder].sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
    return groups
  }, {}), [reminders])

  const selectedReminders = remindersByDay[selectedDate] ?? []
  const pendingCount = reminders.filter((reminder) => !reminder.completed).length
  const thisMonthCount = reminders.filter((reminder) => {
    const date = parseDateKey(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(reminder.dueAt)))
    return date.getMonth() === month.getMonth() && date.getFullYear() === month.getFullYear()
  }).length

  const clientNames = useMemo(() => new Map(clients.map((client) => [client.id, client.name ?? client.whatsapp ?? 'Cliente sem nome'])), [clients])

  function changeMonth(offset: number) {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1))
  }

  function goToday() {
    const current = parseDateKey(brazilToday())
    setMonth(new Date(current.getFullYear(), current.getMonth(), 1))
    setSelectedDate(dateKey(current))
  }

  async function toggleComplete(reminder: Reminder) {
    setBusyId(reminder.id)
    try {
      await api.patch<Reminder>(`/api/v1/reminders/${reminder.id}`, { completed: !reminder.completed })
      onRemindersChange()
    } catch(caught) {setError(caught instanceof Error?caught.message:"Não foi possível atualizar a agenda.")} finally {
      setBusyId(null)
    }
  }

  async function removeReminder(reminder: Reminder) {
    setError('')
    setBusyId(reminder.id)
    try {
      await api.delete<void>(`/api/v1/reminders/${reminder.id}`)
      setRemoving(null);onRemindersChange()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="module-page agenda-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Organização do dia</p>
          <h1>Agenda</h1>
          <p className="page-subtitle">Reuniões, retornos e entregas ligados aos seus clientes.</p>
        </div>
        <button type="button" className="button button-primary" onClick={() => setShowModal(true)}><Plus size={17} aria-hidden="true" /> Novo compromisso</button>
      </header>

      {error&&<p className="form-error" role="alert">{error}</p>}
      <section className="agenda-summary" aria-label="Resumo da agenda">
        <div><span><CalendarDays size={18} aria-hidden="true" /></span><p><strong>{thisMonthCount}</strong><small>neste mês</small></p></div>
        <div><span><Clock3 size={18} aria-hidden="true" /></span><p><strong>{pendingCount}</strong><small>pendentes</small></p></div>
        <div className="agenda-next"><p><small>Dia selecionado</small><strong>{longDateFormatter.format(parseDateKey(selectedDate))}</strong></p></div>
      </section>

      <div className="agenda-layout">
        <section className="calendar-panel">
          <div className="calendar-toolbar">
            <div>
              <button type="button" className="icon-button" onClick={() => changeMonth(-1)} aria-label="Mês anterior"><ChevronLeft size={17} aria-hidden="true" /></button>
              <button type="button" className="icon-button" onClick={() => changeMonth(1)} aria-label="Próximo mês"><ChevronRight size={17} aria-hidden="true" /></button>
              <h2>{monthFormatter.format(month)}</h2>
            </div>
            <button type="button" className="button button-secondary button-small" onClick={goToday}>Hoje</button>
          </div>

          <div className="calendar-weekdays">{WEEKDAYS.map((weekday) => <span key={weekday}>{weekday}</span>)}</div>
          <div className="calendar-grid">
            {calendarDays.map((date) => {
              const key = dateKey(date)
              const dayReminders = remindersByDay[key] ?? []
              const outside = date.getMonth() !== month.getMonth()
              const isToday = key === dateKey(today)
              const selected = key === selectedDate
              return (
                <button
                  type="button"
                  key={key}
                  className={`calendar-day${outside ? ' is-outside' : ''}${isToday ? ' is-today' : ''}${selected ? ' is-selected' : ''}`}
                  onClick={() => setSelectedDate(key)}
                >
                  <span className="calendar-date-number">{date.getDate()}</span>
                  <span className="calendar-events">
                    {dayReminders.slice(0, 3).map((reminder) => (
                      <span className={reminder.completed ? 'is-completed' : ''} key={reminder.id}>
                        <i /> {timeFormatter.format(new Date(reminder.dueAt))} {reminder.title}
                      </span>
                    ))}
                    {dayReminders.length > 3 ? <small>+{dayReminders.length - 3} compromissos</small> : null}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        <aside className="agenda-day-panel">
          <div className="agenda-day-heading">
            <div><p className="panel-kicker">Dia selecionado</p><h2>{longDateFormatter.format(parseDateKey(selectedDate))}</h2></div>
            <button type="button" className="icon-button" onClick={() => setShowModal(true)} aria-label="Adicionar compromisso"><Plus size={17} aria-hidden="true" /></button>
          </div>

          {selectedReminders.length > 0 ? (
            <div className="agenda-event-list">
              {selectedReminders.map((reminder) => (
                <article className={`agenda-event${reminder.completed ? ' is-completed' : ''}`} key={reminder.id}>
                  <div className="agenda-event-time"><Clock3 size={14} aria-hidden="true" /><strong>{timeFormatter.format(new Date(reminder.dueAt))}</strong></div>
                  <div className="agenda-event-copy">
                    <h3>{reminder.title}</h3>
                    {reminder.linkedId && clientNames.has(reminder.linkedId) ? <p><UserRound size={13} aria-hidden="true" /> {clientNames.get(reminder.linkedId)}</p> : null}
                    {reminder.description ? <small>{reminder.description}</small> : null}
                  </div>
                  <div className="agenda-event-actions">
                    <button type="button" onClick={() => toggleComplete(reminder)} disabled={busyId === reminder.id} title={reminder.completed ? 'Reabrir' : 'Concluir'}><Check size={15} aria-hidden="true" /></button>
                    <button type="button" onClick={() => setRemoving(reminder)} disabled={busyId === reminder.id} title="Excluir"><Trash2 size={15} aria-hidden="true" /></button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="panel-empty compact-empty agenda-day-empty">
              <span className="empty-icon"><CalendarDays size={20} aria-hidden="true" /></span>
              <strong>Dia livre</strong>
              <p>Nenhum compromisso agendado.</p>
              <button type="button" className="button button-secondary button-small" onClick={() => setShowModal(true)}>Agendar</button>
            </div>
          )}
        </aside>
      </div>

      {removing&&<Modal title="Excluir compromisso?" description={removing.title} onClose={()=>{if(!busyId)setRemoving(null)}}><p>Esta ação remove o compromisso da agenda.</p><div className="modal-actions"><button className="button button-secondary" disabled={Boolean(busyId)} onClick={()=>setRemoving(null)}>Cancelar</button><button className="button button-primary" disabled={Boolean(busyId)} onClick={()=>void removeReminder(removing)}>Excluir compromisso</button></div></Modal>}
      {showModal ? (
        <AppointmentModal
          date={selectedDate}
          clients={clients}
          onClose={() => setShowModal(false)}
          onCreated={onRemindersChange}
        />
      ) : null}
    </div>
  )
}
