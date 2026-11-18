import { InputError, NICHES, text, overpassQuery, publicUrl } from './personal'

export interface Lead {source:'OpenStreetMap';source_key:string;name:string;niche:string;address:string|null;phone:string|null;website:string|null;socials:string[];source_url:string;queried_at:string}
export function normalizeOverpass(elements:any[],niche:string,now=new Date().toISOString()):Lead[] {
  return elements.filter(item=>['node','way','relation'].includes(item.type)&&Number.isSafeInteger(item.id)&&typeof item.tags?.name==='string').map(item=>{
    const tags=item.tags
    const link=(value:unknown)=>{try{return publicUrl(value,true)}catch{return null}}
    return {source:'OpenStreetMap',source_key:item.type+'/'+item.id,name:text(tags.name),niche:NICHES[niche].label,
      address:[tags['addr:street'],tags['addr:housenumber'],tags['addr:suburb'],tags['addr:city'],tags['addr:postcode']].filter(Boolean).join(', ')||null,
      phone:typeof (tags['contact:phone']||tags.phone)==='string'?String(tags['contact:phone']||tags.phone).slice(0,100):null,
      website:link(tags['contact:website']||tags.website),socials:[tags['contact:instagram'],tags['contact:facebook']].map(link).filter(Boolean) as string[],
      source_url:'https://www.openstreetmap.org/'+item.type+'/'+item.id,queried_at:now}
  })
}
const searches=new Map<string,number>()
const OVERPASS_ENDPOINTS=['https://overpass-api.de/api/interpreter','https://overpass.private.coffee/api/interpreter']
export async function searchLeads(org:string,niche:string,city:string,limit:number,fetcher:typeof fetch=fetch) {
  const query=overpassQuery(niche,city,limit)
  if(Date.now()-(searches.get(org)||0)<60000)throw new InputError('Aguarde um minuto antes de uma nova consulta pública.',429)
  if(searches.size>1000) for(const [key,time]of searches)if(Date.now()-time>60000)searches.delete(key)
  searches.set(org,Date.now())
  // Keep both attempts within the 35-second browser and integration deadlines.
  const deadline=Date.now()+30000
  let failure=new InputError('Não foi possível consultar a fonte pública. Tente novamente mais tarde.',503)
  for(const endpoint of OVERPASS_ENDPOINTS) {
    const remaining=deadline-Date.now()
    if(remaining<=0)break
    let retryable=true,status:number|undefined
    try {
      const response=await fetcher(endpoint,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','User-Agent':'AbelhaCRM/1.0 (OpenStreetMap business search)'},body:new URLSearchParams({data:query}),signal:AbortSignal.timeout(Math.min(25000,remaining))})
      status=response.status
      if(!response.ok) {
        retryable=status===429||status>=500
        await response.body?.cancel()
        throw new InputError('A fonte pública está ocupada ou indisponível. Tente novamente mais tarde.',503)
      }
      const raw=await response.text()
      if(raw.length>2000000) {
        retryable=false
        throw new InputError('A consulta retornou dados demais. Reduza a quantidade.',503)
      }
      let data:any;try{data=JSON.parse(raw)}catch{throw new InputError('A fonte pública retornou uma resposta inválida.',503)}
      if(!data||data.remark||!Array.isArray(data.elements))throw new InputError('A consulta pública não foi concluída. Tente novamente mais tarde.',503)
      return {items:normalizeOverpass(data.elements,niche).slice(0,limit),attribution:'© OpenStreetMap contributors — ODbL',source_url:'https://www.openstreetmap.org/copyright',queried_at:new Date().toISOString()}
    } catch(error:any) {
      const timedOut=['TimeoutError','AbortError'].includes(error?.name)
      failure=error instanceof InputError?error:timedOut
        ?new InputError('A fonte pública não respondeu no prazo. Aguarde um minuto antes de tentar novamente.',504)
        :new InputError('Não foi possível consultar a fonte pública. Tente novamente mais tarde.',503)
      const code=error?.cause?.code
      console.warn('[lead-search] Overpass request failed',{host:new URL(endpoint).hostname,status,kind:timedOut?'timeout':error instanceof InputError?'response':'network',...(typeof code==='string'&&/^[A-Z0-9_]{1,60}$/.test(code)?{code}:{})})
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
