import { InputError, overpassQuery, publicUrl, resolveLeadNiche } from './personal'

export interface Lead {source:'OpenStreetMap';source_key:string;name:string;niche:string;address:string|null;phone:string|null;website:string|null;socials:string[];source_url:string;queried_at:string}
export function normalizeOverpass(elements:unknown[],niche:string,now=new Date().toISOString()):Lead[] {
  const label=resolveLeadNiche(niche).label
  const seen=new Set<string>()
  const items:Lead[]=[]
  const link=(value:unknown)=>{try{return publicUrl(value,true)}catch{return null}}
  for(const element of elements) {
    if(!element||typeof element!=='object')continue
    const {type,id,tags} = element as {type?:string;id?:number;tags?:Record<string,unknown>}
    if(!type||!['node','way','relation'].includes(type)||!id||!Number.isSafeInteger(id)||id<1||!tags)continue
    const name=typeof tags.name==='string'?tags.name.trim():''
    const key=type+'/'+id
    if(!name||name.length>240||seen.has(key))continue
    seen.add(key)
    const phone=tags['contact:phone']||tags.phone
    items.push({source:'OpenStreetMap',source_key:key,name,niche:label,
      address:[tags['addr:street'],tags['addr:housenumber'],tags['addr:suburb'],tags['addr:city'],tags['addr:postcode']]
        .filter(value=>typeof value==='string'&&value.trim()).join(', ').slice(0,2000)||null,
      phone:typeof phone==='string'?phone.trim().slice(0,100)||null:null,
      website:link(tags['contact:website']||tags.website),
      socials:[...new Set([tags['contact:instagram'],tags['contact:facebook']].map(link).filter((url):url is string=>Boolean(url)))],
      source_url:'https://www.openstreetmap.org/'+key,queried_at:now})
  }
  return items
}

const searches=new Map<string,number>()
const OVERPASS_ENDPOINTS=['https://overpass-api.de/api/interpreter','https://overpass.private.coffee/api/interpreter']
const MAX_RESPONSE_BYTES=2_000_000
async function boundedText(response:Response) {
  const reader=response.body?.getReader()
  if(!reader)return ''
  const decoder=new TextDecoder()
  let bytes=0, body=''
  try {
    for(;;) {
      const {done,value}=await reader.read()
      if(done)return body+decoder.decode()
      bytes+=value.byteLength
      if(bytes>MAX_RESPONSE_BYTES){
        void reader.cancel().catch(()=>{})
        throw new InputError('A consulta retornou dados demais. Reduza a quantidade.',503)
      }
      body+=decoder.decode(value,{stream:true})
    }
  } finally { reader.releaseLock() }
}

export async function searchLeads(org:string,niche:string,city:string,limit:number,fetcher:typeof fetch=fetch,signal?:AbortSignal) {
  signal?.throwIfAborted()
  const query=overpassQuery(niche,city,limit)
  const now=Date.now()
  const previous=searches.get(org)
  if(previous!==undefined&&now-previous<60000)throw new InputError('Aguarde um minuto antes de uma nova consulta pública.',429)
  if(searches.size>1000)for(const [key,time] of searches)if(now-time>=60000)searches.delete(key)
  searches.set(org,now)

  // Leave enough time for the second instance; both attempts share the browser's 35s budget.
  const deadline=now+30000
  let failure=new InputError('Não foi possível consultar a fonte pública. Tente novamente mais tarde.',503)
  for(const [index,endpoint] of OVERPASS_ENDPOINTS.entries()) {
    const remaining=deadline-Date.now()
    if(remaining<=0)break
    let retryable=true,status:number|undefined
    try {
      const response=await fetcher(endpoint,{method:'POST',redirect:'error',headers:{Accept:'application/json','Content-Type':'application/x-www-form-urlencoded','User-Agent':'AbelhaCRM/1.0 (OpenStreetMap business search)'},body:new URLSearchParams({data:query}),signal:signal?AbortSignal.any([signal,AbortSignal.timeout(Math.min(index===0?14000:16000,remaining))]):AbortSignal.timeout(Math.min(index===0?14000:16000,remaining))})
      status=response.status
      if(!response.ok) {
        retryable=status===429||status>=500
        void response.body?.cancel().catch(()=>{})
        throw new InputError(status===504?'A fonte pública não respondeu no prazo. Aguarde um minuto antes de tentar novamente.':'A fonte pública está ocupada ou indisponível. Tente novamente mais tarde.',status===504?504:503)
      }
      let raw:string
      try {raw=await boundedText(response)}catch(error){if(error instanceof InputError)retryable=false;throw error}
      let data:{remark?:unknown;elements?:unknown[]}|null
      try{data=JSON.parse(raw)}catch{throw new InputError('A fonte pública retornou uma resposta inválida.',503)}
      if(!data||data.remark||!Array.isArray(data.elements))throw new InputError('A consulta pública não foi concluída. Tente novamente mais tarde.',503)
      const areas=new Set(data.elements.flatMap(element=>{
        if(!element||typeof element!=='object')return []
        const {type,id}=element as {type?:string;id?:number}
        return type==='area'&&Number.isSafeInteger(id)&&id!>0?[id]:[]
      }))
      if(areas.size!==1) {
        retryable=false
        throw new InputError(areas.size===0?'Cidade não encontrada na fonte pública. Confira o nome e a UF.':'Mais de uma cidade com esse nome. Informe também a UF (ex.: Salto, SP).',422)
      }
      const timestamp=new Date().toISOString()
      return {items:normalizeOverpass(data.elements,niche,timestamp).slice(0,limit),attribution:'© OpenStreetMap contributors — ODbL',source_url:'https://www.openstreetmap.org/copyright',queried_at:timestamp}
    } catch(error:any) {
      signal?.throwIfAborted()
      const timedOut=['TimeoutError','AbortError'].includes(error?.name)
      failure=error instanceof InputError?error:timedOut
        ?new InputError('A fonte pública não respondeu no prazo. Aguarde um minuto antes de tentar novamente.',504)
        :new InputError('Não foi possível consultar a fonte pública. Tente novamente mais tarde.',503)
      if(failure.status!==422) {
        const code=error?.cause?.code
        console.warn('[lead-search] Overpass request failed',{host:new URL(endpoint).hostname,status,kind:timedOut?'timeout':error instanceof InputError?'response':'network',...(typeof code==='string'&&/^[A-Z0-9_]{1,60}$/.test(code)?{code}:{})})
      }
      if(!retryable)throw failure
    }
  }
  throw failure
}
export const SERVICE_TEMPLATES=[
  {id:'landing-page',name:'Landing page',days:10,description:'Uma página com objetivo e conversão definidos.',deliverables:['Briefing e objetivo','Estrutura e texto','Layout responsivo','Formulário e contatos','Testes e publicação revisada']},
  {id:'institutional',name:'Site institucional',days:20,description:'Presença digital e apresentação dos serviços.',deliverables:['Mapa do site','Conteúdo aprovado','Páginas responsivas','SEO básico','Validação e entrega']},
  {id:'crm',name:'CRM',days:30,description:'Fluxos comerciais e relacionamento com clientes.',deliverables:['Requisitos e dados','Autenticação e isolamento','Fluxo comercial','Testes de integração','Homologação']},
  {id:'n8n',name:'Automação n8n',days:10,description:'Automação revisável com tratamento de falhas.',deliverables:['Mapear gatilhos','Credenciais e permissões','Workflow e idempotência','Testes de falha','Documentar operação']},
  {id:'ai-support',name:'Atendimento com IA',days:20,description:'Atendimento assistido com encaminhamento humano.',deliverables:['Base de conhecimento','Limites de resposta','Canais autorizados','Avaliação de respostas','Encaminhamento humano']},
  {id:'whatsapp',name:'Integração WhatsApp',days:15,description:'Integração de canal com consentimento e validação.',deliverables:['Provedor autorizado','Configuração do canal','Webhooks e deduplicação','Fluxo de atendimento','Teste autorizado']},
  {id:'content',name:'Gestão de conteúdo',days:15,description:'Organização do conteúdo e do processo editorial.',deliverables:['Inventário de conteúdo','Calendário editorial','Modelos de publicação','Fluxo de aprovação','Documentar operação']},
  {id:'custom',name:'Projeto personalizado',days:30,description:'Escopo definido a partir da necessidade do cliente.',deliverables:['Descoberta','Critérios de aceite','Implementação','Validação','Entrega']},
]
