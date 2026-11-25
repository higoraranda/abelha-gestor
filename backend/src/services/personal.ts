import { createHash } from 'node:crypto'

export class InputError extends Error { constructor(message:string, public status=400) { super(message) } }
export function text(value:unknown,max=240,optional=false):string {
  if(typeof value!=='string' || (!optional && !value.trim()) || value.trim().length>max) throw new InputError('Preencha um texto válido (até '+max+' caracteres).')
  return value.trim()
}
export function uuid(value:unknown):string {
  if(typeof value!=='string' || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value)) throw new InputError('Identificador inválido.')
  return value
}
export function date(value:unknown):string {
  if(typeof value!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value+'T12:00:00Z')) || new Date(value+'T12:00:00Z').toISOString().slice(0,10)!==value) throw new InputError('Data inválida.')
  return value
}
export function money(value:unknown):number {
  if((typeof value!=='number' && typeof value!=='string') || value==='' || !Number.isFinite(Number(value)) || Number(value)<0 || Number(value)>999999999.99 || Math.abs(Number(value)*100-Math.round(Number(value)*100))>0.00001) throw new InputError('Informe um valor válido, com até duas casas decimais.')
  return Number(value)
}
export function integer(value:unknown,min:number,max:number):number {
  if(!Number.isInteger(Number(value)) || Number(value)<min || Number(value)>max) throw new InputError(`Informe um número inteiro entre ${min} e ${max}.`)
  return Number(value)
}
export function publicUrl(value:unknown, optional=false):string|null {
  if(optional && !value) return null
  try {
    const url=new URL(String(value))
    if(url.protocol!=='https:' || url.username || url.password || url.port || url.hostname==='localhost' || !url.hostname.includes('.') || /^[\d.]+$/.test(url.hostname) || url.hostname.includes(':') || /\.(local|internal|localhost)$/.test(url.hostname)) throw new Error()
    return url.href
  } catch { throw new InputError('Use um link HTTPS público válido, sem credenciais.') }
}
export function githubRepo(value:unknown):string {
  const url=new URL(publicUrl(value)!)
  if(url.hostname!=='github.com' || !/^\/[\w.-]+\/[\w.-]+\/?$/.test(url.pathname) || url.search || url.hash) throw new InputError('Use o endereço do repositório no GitHub.')
  return 'https://github.com'+url.pathname.replace(/\/$/,'').replace(/\.git$/i,'').toLowerCase()
}
export function subscriptionInput(value:any) {
  const endpoint=publicUrl(value?.endpoint)!
  const url=new URL(endpoint)
  if(!['fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com'].includes(url.hostname) && !/^[a-z0-9-]+\.notify\.windows\.com$/.test(url.hostname)) throw new InputError('Provedor de notificações não suportado.')
  const keys=value?.keys
  if(!keys || typeof keys.p256dh!=='string' || typeof keys.auth!=='string' || !/^[A-Za-z0-9_-]+={0,2}$/.test(keys.p256dh) || !/^[A-Za-z0-9_-]+={0,2}$/.test(keys.auth) || Buffer.from(keys.p256dh,'base64url').length!==65 || Buffer.from(keys.p256dh,'base64url')[0]!==4 || Buffer.from(keys.auth,'base64url').length!==16) throw new InputError('Inscrição de notificações inválida.')
  return {endpoint,keys:{p256dh:keys.p256dh,auth:keys.auth}}
}
export function hash(value:string) { return createHash('sha256').update(value).digest('hex') }
export function safePersonalUrl(value:unknown):string {
  const fallback='/?space=personal&view=personal-overview'
  if(typeof value!=='string' || !value.startsWith('/?')) return fallback
  const url=new URL(value,'https://abelha.invalid')
  const views=['personal-overview','personal-projects','personal-finance','personal-subscriptions','personal-prices','personal-review','personal-settings']
  return url.pathname==='/' && url.searchParams.get('space')==='personal' && views.includes(url.searchParams.get('view')||'') ? url.pathname+url.search : fallback
}
export interface DevelopmentReport {
  schema_version:1;event_id:string;summary:string;commit:string;pull_request?:string;
  tests:{name:string;command:string;result:'passed';evidence_url:string}[];
  acceptance:string[];next_step:string;blockers:string[]
}
export function reportInput(value:any,repository:string):DevelopmentReport {
  const repo=githubRepo(repository)
  if(value?.schema_version!==1 || !/^[a-f0-9]{40}$/i.test(value?.commit||'')) throw new InputError('Relatório v1 exige o SHA completo do commit.')
  function evidence(value:unknown,kind:'actions'|'pull') {
    const url=publicUrl(value)!
    if(!url.toLowerCase().startsWith(repo+'/'+(kind==='actions'?'actions/runs/':'pull/')) || !/^\d+(\/.*)?$/.test(url.slice((repo+'/'+(kind==='actions'?'actions/runs/':'pull/')).length))) throw new InputError('A evidência deve pertencer ao repositório do projeto.')
    return url
  }
  if(!Array.isArray(value.tests) || value.tests.length<1 || value.tests.length>30 || !Array.isArray(value.acceptance) || value.acceptance.length<1 || value.acceptance.length>50) throw new InputError('Informe testes e critérios de aceite verificáveis.')
  const tests=value.tests.map((item:any)=>{
    if(item?.result!=='passed') throw new InputError('Relatórios de conclusão exigem testes aprovados; registre falhas como bloqueio.')
    return {name:text(item.name),command:text(item.command,500),result:'passed' as const,evidence_url:evidence(item.evidence_url,'actions')}
  })
  return {schema_version:1,event_id:text(value.event_id,160),summary:text(value.summary,10000),commit:value.commit.toLowerCase(),...(value.pull_request?{pull_request:evidence(value.pull_request,'pull')}:{}),tests,acceptance:value.acceptance.map((v:unknown)=>text(v,1000)),next_step:text(value.next_step,2000),blockers:Array.isArray(value.blockers)?value.blockers.slice(0,30).map((v:unknown)=>text(v,1000)):[]}
}
export function invoiceSummary(records:{recorded_on:string;amount:number}[],closing:string) {
  const rows=[...records].sort((a,b)=>a.recorded_on.localeCompare(b.recorded_on))
  if(!rows.length) return {current:null,variation:null,average:null,projected:null,history:[]}
  const last=rows.at(-1)!;const first=rows[0]
  const days=(Date.parse(last.recorded_on+'T12:00:00Z')-Date.parse(first.recorded_on+'T12:00:00Z'))/86400000
  const mean=days>0?(Number(last.amount)-Number(first.amount))/days:null
  const remaining=Math.max(0,(Date.parse(closing+'T12:00:00Z')-Date.parse(last.recorded_on+'T12:00:00Z'))/86400000)
  const round=(v:number)=>Math.round(v*100)/100
  return {current:Number(last.amount),variation:rows.length>1?round(Number(last.amount)-Number(rows.at(-2)!.amount)):null,average:mean===null?null:round(mean),projected:mean===null?null:round(Math.max(0,Number(last.amount)+mean*remaining)),history:rows.map((row,i)=>({...row,amount:Number(row.amount),variation:i?round(Number(row.amount)-Number(rows[i-1].amount)):null}))}
}
export function priceAlert(previous:number|null,current:number,target:number|null) {
  return {notify:(previous!==null && current<previous) || (target!==null && current<=target && (previous===null || previous>target)),reduction:previous && current<previous?Math.round((previous-current)/previous*10000)/100:0}
}
export function nextRecurringDate(current:string,frequency:string,billingDay:number) {
  date(current);integer(billingDay,1,31)
  const [year,month]=current.split('-').map(Number)
  const next=new Date(Date.UTC(year,month-1+(frequency==='yearly'?12:1),1))
  const last=new Date(Date.UTC(next.getUTCFullYear(),next.getUTCMonth()+1,0)).getUTCDate()
  next.setUTCDate(Math.min(last,billingDay));return next.toISOString().slice(0,10)
}
export const NICHES:Record<string,{label:string;tag:string}>={dentists:{label:'Clínicas odontológicas',tag:'"amenity"="dentist"'},clinics:{label:'Clínicas',tag:'"amenity"="clinic"'},restaurants:{label:'Restaurantes',tag:'"amenity"="restaurant"'},beauty:{label:'Salões de beleza',tag:'"shop"="beauty"'},gyms:{label:'Academias',tag:'"leisure"="fitness_centre"'},shops:{label:'Lojas',tag:'"shop"'}}

const accentless=(value:string)=>value.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase()
const POSIX_SPECIAL=/[\\.^$|?*+()[\]{}]/g
const letterFamilies:Record<string,string>={a:'aáàâãä',e:'eéêèë',i:'iíîìï',o:'oóôõòö',u:'uúûùü',c:'cç'}
function osmLiteral(value:string, flexibleSpaces=false):string {
  return Array.from(accentless(value),char=>{
    if(char===' '&&flexibleSpaces)return '[[:space:]_-]+'
    const family=letterFamilies[char]
    return family ? '['+family+family.toUpperCase()+']' : char.replace(POSIX_SPECIAL,'\\$&')
  }).join('')
}

const TYPES:ReadonlyArray<readonly [string,string,readonly string[]]>=[
  ['amenity','dentist',['dentista','dentistas','odontologia','clinica odontologica','clinicas odontologicas','consultorio odontologico']],
  ['amenity','clinic',['clinica','clinicas','clinica medica','clinicas medicas']],
  ['amenity','restaurant',['restaurante','restaurantes']],
  ['shop','beauty',['salao de beleza','saloes de beleza','estetica','clinica de estetica']],
  ['shop','hairdresser',['barbeiro','barbearia','barbearias','cabeleireiro','cabeleireiros']],
  ['leisure','fitness_centre',['academia','academias','musculacao']],
  ['shop','bakery',['padaria','padarias','panificadora']],
  ['shop','pastry',['confeitaria','confeitarias']],
  ['shop','pet',['pet shop','pet shops','petshop']],
  ['amenity','veterinary',['veterinaria','clinica veterinaria','veterinario','veterinarios']],
  ['shop','car_repair',['oficina','oficina mecanica','oficinas mecanicas','mecanica automotiva']],
  ['shop','supermarket',['supermercado','supermercados']],
  ['amenity','pharmacy',['farmacia','farmacias','drogaria','drogarias']],
  ['amenity','cafe',['cafe','cafes','cafeteria','cafeterias']],
  ['tourism','hotel',['hotel','hoteis']],
  ['office','estate_agent',['imobiliaria','imobiliarias']],
  ['office','lawyer',['advocacia','advogado','advogados','escritorio de advocacia']],
  ['amenity','school',['escola','escolas','colegio','colegios']],
  ['shop','optician',['otica','oticas']],
  ['shop','stationery',['papelaria','papelarias']],
  ['craft','electrician',['eletricista','eletricistas']],
  ['shop','furniture',['moveis','loja de moveis','lojas de moveis']],
  ['amenity','bank',['banco','bancos','agencia bancaria']],
]
const BRAZIL_STATES=new Set('AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' '))

export function resolveLeadNiche(raw:string) {
  const label=text(raw,80).normalize('NFC').replace(/\p{Zs}+/gu,' ')
  if(!/^[\p{L}\p{M}\p{N} .&+'’(),/-]+$/u.test(label)||!/\p{L}/u.test(label))throw new InputError('Informe um nicho de negócio válido.')
  const key=accentless(label)
  if(Object.hasOwn(NICHES,key))return NICHES[key]
  const mapped=TYPES.find(([, ,aliases])=>aliases.includes(key))
  if(mapped)return {label,tag:JSON.stringify(mapped[0])+'='+JSON.stringify(mapped[1])}
  const pattern='(^|[^[:alnum:]])'+osmLiteral(label,true)+'([^[:alnum:]]|$)'
  const categoryKeys='shop|craft|office|healthcare|amenity|leisure|tourism'
  return {label,tag:'~"^(name|brand|description|'+categoryKeys+')$"~'+JSON.stringify(pattern)+',i]["name"][~"^('+categoryKeys+')$"~"."'}
}

export function overpassQuery(niche:string,city:string,limit:number) {
  const {tag}=resolveLeadNiche(niche)
  integer(limit,1,50)
  const location=text(city,100).normalize('NFC').replace(/\p{Zs}+/gu,' ')
  const stateSuffix=location.match(/^(.*?)[ ]*(?:,|\/| - )[ ]*([a-z]{2})$/i)
  const municipality=(stateSuffix?.[1]??location).trim()
  const state=stateSuffix?.[2]?.toUpperCase()
  if(!/^[\p{L}\p{M}\p{N} .'’()-]+$/u.test(municipality)||!/\p{L}/u.test(municipality)||state&&!BRAZIL_STATES.has(state)) {
    throw new InputError('Informe uma cidade válida. Exemplo: Campinas, SP.')
  }
  const region=state
    ? 'area["ISO3166-2"="BR-'+state+'"]["boundary"="administrative"]["admin_level"="4"]->.region;'
    : ''
  const cityFilters='["boundary"="administrative"]["admin_level"="8"]["name"~'+JSON.stringify('^'+osmLiteral(municipality)+'$')+',i]'
  // A filter by area is supported on relations, not on already derived areas.
  const locality=state?'rel'+cityFilters+'(area.region);map_to_area->.city;':'area'+cityFilters+'->.city;'
  return '[out:json][timeout:10];'+region+locality+'.city out ids 2;nwr['+tag+']["name"](area.city);out tags '+limit+';'
}
