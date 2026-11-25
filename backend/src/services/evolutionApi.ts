import { InputError } from './personal'
import type { Database } from './platform-db'
import { isIP } from 'node:net'
import { protectedEvolutionHttps, type ProviderTransport } from './evolution-https'

export type EvolutionInstance = { api_url: string; instance_name: string; api_key: string }
export type ConnectionState = 'connected' | 'connecting' | 'disconnected' | 'unconfigured' | 'unavailable'

export async function configuredInstance(db:Database, org:string):Promise<EvolutionInstance|null> {
  const instances = await db.query<EvolutionInstance>(`
    SELECT api_url,instance_name,api_key FROM evolution_instances
    WHERE organization_id=$1 ORDER BY id LIMIT 2
  `,[org])
  if (instances.length>1) throw new InputError('Há mais de uma instância cadastrada. Revise a configuração do WhatsApp.',503)
  return instances[0] ?? null
}

async function providerRequest(instance:EvolutionInstance, path:string, body?:Record<string,string>, transport:ProviderTransport=protectedEvolutionHttps) {
  let url: URL
  try { url=new URL(instance.api_url) } catch { throw new InputError('Endereço do provedor inválido.',503) }
  if (url.protocol!=='https:' || url.username || url.password || url.search || url.hash || !/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,99}$/.test(instance.instance_name)) {
    throw new InputError('Configuração HTTPS do provedor inválida.',503)
  }
  const host=url.hostname
  const trusted=(process.env.EVOLUTION_ALLOWED_ORIGINS??'').split(',').map(value=>value.trim()).filter(Boolean)
  if(url.port || !host.includes('.') || isIP(host.replace(/^\[|\]$/g,'')) || /(?:^|\.)(localhost|local|internal|invalid|test)$/.test(host) ||
      !trusted.includes(url.origin)) {
    throw new InputError('Origem da Evolution API não autorizada.',503)
  }
  url.pathname=url.pathname.replace(/\/+$/,'')+path+encodeURIComponent(instance.instance_name)
  let res:Response
  try {
    res=await transport(url,{
      method:body?'POST':'GET',signal:AbortSignal.timeout(6500),
      headers:{'Content-Type':'application/json',apikey:instance.api_key},body:body?JSON.stringify(body):undefined,
    })
  } catch { throw new InputError('Não foi possível acessar o provedor do WhatsApp.',503) }
  if(!res.ok) throw new InputError('O provedor do WhatsApp não confirmou a operação.',503)
  return res
}

async function providerJson(response:Response,maxBytes:number):Promise<unknown> {
  const reader=response.body?.getReader()
  if(!reader)return null
  let length=0
  const bytes:Uint8Array[]=[]
  try {
    for(;;){
      const {done,value}=await reader.read()
      if(done)break
      length+=value.byteLength
      if(length>maxBytes) {void reader.cancel().catch(()=>{});return null}
      bytes.push(value)
    }
    return JSON.parse(Buffer.concat(bytes,length).toString('utf8'))
  }catch{return null}
  finally{reader.releaseLock()}
}

export async function connectionState(instance:EvolutionInstance,transport?:ProviderTransport):Promise<ConnectionState> {
  const data:unknown=await providerJson(await providerRequest(instance,'/instance/connectionState/',undefined,transport),16000)
  if (!data || typeof data!=='object' || !('instance' in data) || !data.instance || typeof data.instance!=='object' || !('state' in data.instance)) return 'unavailable'
  const state=data.instance.state
  return state==='open' ? 'connected' : state==='connecting' ? 'connecting' : state==='close' ? 'disconnected' : 'unavailable'
}

export async function pairingQr(instance:EvolutionInstance,transport?:ProviderTransport):Promise<string|null> {
  const data:unknown=await providerJson(await providerRequest(instance,'/instance/connect/',undefined,transport),260000)
  if (!data || typeof data!=='object') return null
  const code='base64' in data ? data.base64 : undefined
  return typeof code==='string' && code.length<250000 && /^data:image\/png;base64,iVBORw0KGgo[A-Za-z0-9+/=]+$/.test(code) ? code : null
}

export async function sendText(apiUrl:string, instanceName:string, apiKey:string, number:string, text:string):Promise<void> {
  const response=await providerRequest({api_url:apiUrl,instance_name:instanceName,api_key:apiKey},'/message/sendText/',{number,text})
  await response.body?.cancel().catch(()=>{})
}
