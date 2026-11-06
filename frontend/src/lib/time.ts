export const APP_TIME_ZONE = 'America/Sao_Paulo'
// Interpreta o campo civil no fuso do produto, independentemente do fuso do computador.
export function localDateTimeToIso(value:string):string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error('Informe uma data e horário válidos.')
  const [year,month,day,hour,minute]=value.split(/[-T:]/).map(Number)
  const civil=Date.UTC(year,month-1,day,hour,minute)
  if(month<1||month>12||hour>23||minute>59||new Date(civil).toISOString().slice(0,10)!==value.slice(0,10)) throw new Error('Informe uma data e horário válidos.')
  const formatter=new Intl.DateTimeFormat('en-US',{timeZone:APP_TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'})
  let timestamp=civil
  for(let i=0;i<3;i++) {const parts=Object.fromEntries(formatter.formatToParts(new Date(timestamp)).map(p=>[p.type,p.value]));const represented=Date.UTC(Number(parts.year),Number(parts.month)-1,Number(parts.day),Number(parts.hour),Number(parts.minute));timestamp+=civil-represented}
  return new Date(timestamp).toISOString()
}
