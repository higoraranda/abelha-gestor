import { lookup } from 'node:dns/promises'
import { request } from 'node:https'
import { isIP, type LookupFunction } from 'node:net'

export function publicIPv4(address:string) {
  if(isIP(address)!==4)return false
  const [a,b,c]=address.split('.').map(Number)
  return a>0 && a<224 && a!==10 && a!==127 &&
    !(a===100&&b>=64&&b<=127) && !(a===169&&b===254) &&
    !(a===172&&b>=16&&b<=31) && !(a===192&&[168,0].includes(b)) &&
    !(a===192&&b===88&&c===99) && !(a===198&&(b===18||b===19||(b===51&&c===100))) &&
    !(a===203&&b===0&&c===113)
}

export function requirePublicDns(records:{address:string;family:number}[]) {
  if(!records.length||records.some(record=>record.family!==4||!publicIPv4(record.address)))
    throw new Error('Origem sem endereço IPv4 público autorizado.')
  return records[0].address
}

type ProviderOptions={method:'GET'|'POST'; headers:Record<string,string>; body?:string; signal:AbortSignal}
export type ProviderTransport=(url:URL,options:ProviderOptions)=>Promise<Response>
export const protectedEvolutionHttps:ProviderTransport=async(url,options)=>{
  if(url.protocol!=='https:')throw Error('HTTPS obrigatório.')
  const addresses=await new Promise<{address:string;family:number}[]>((resolve,reject)=>{
    options.signal.throwIfAborted()
    const cancel=()=>reject(options.signal.reason)
    options.signal.addEventListener('abort',cancel,{once:true})
    void lookup(url.hostname,{family:4,all:true}).then(resolve,reject).finally(()=>options.signal.removeEventListener('abort',cancel))
  })
  const ip=requirePublicDns(addresses)
  const pin:LookupFunction=(_hostname,opts,callback)=>{
    if(opts.all) callback(null,[{address:ip,family:4}])
    else callback(null,ip,4)
  }
  return await new Promise<Response>((resolve,reject)=>{
    const out=request(url,{method:options.method,headers:options.headers,signal:options.signal,
      lookup:pin,agent:false,servername:url.hostname,rejectUnauthorized:true},incoming=>{
      const status=incoming.statusCode??502
      if(status<200||status>=300){
        incoming.destroy()
        reject(Error('Resposta HTTPS não autorizada.'))
        return
      }
      const bytes:Buffer[]=[]
      let length=0
      incoming.on('error',reject)
      incoming.on('data',(piece:Buffer)=>{
        length+=piece.length
        if(length>260000){incoming.destroy();reject(Error('Resposta HTTPS excedeu o limite.'));return}
        bytes.push(piece)
      })
      incoming.on('end',()=>{
        try{resolve(new Response([204,205].includes(status)?null:new Uint8Array(Buffer.concat(bytes,length)),{status}))}
        catch(error){reject(error)}
      })
    })
    out.on('error',reject)
    out.end(options.body)
  })
}
