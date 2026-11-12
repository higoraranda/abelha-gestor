import { businessDay } from './crm'

function shiftDay(day:string,days:number) {
  const value=new Date(day+'T12:00:00Z');value.setUTCDate(value.getUTCDate()+days);return value.toISOString().slice(0,10)
}
function localInstant(day:string,time:string) {
  const offset=new Intl.DateTimeFormat('en-US',{timeZone:'America/Sao_Paulo',timeZoneName:'longOffset'}).formatToParts(new Date(day+'T12:00:00Z')).find(part=>part.type==='timeZoneName')!.value.replace('GMT','')||'+00:00'
  return new Date(day+'T'+time+':00'+offset)
}
// A 30-minute rollover window covers a 15-minute tick plus scheduling jitter.
// Same-day catch-up remains supported; older occurrences do not produce stale reminders.
export function scheduledOccurrence(now:Date,time:string,cadence:'daily'|'weekly'):Date|null {
  const hhmm=time.slice(0,5)
  if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(hhmm))return null
  const today=businessDay(now);let day=today
  if(cadence==='weekly')day=shiftDay(day,-new Date(day+'T12:00:00Z').getUTCDay())
  let occurrence=localInstant(day,hhmm)
  if(occurrence>now){day=shiftDay(day,cadence==='weekly'?-7:-1);occurrence=localInstant(day,hhmm)}
  return day===today||now.valueOf()-occurrence.valueOf()<=30*60000?occurrence:null
}
