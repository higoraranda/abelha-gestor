import { useEffect, useState } from 'react'
import { Smartphone } from 'lucide-react'
import { api } from '@/lib/api'

export type WhatsAppStatus = 'connected'|'connecting'|'disconnected'|'unconfigured'|'unavailable'

export default function WhatsAppConnection({status,error,reload}:{status?:WhatsAppStatus;error:string|null;reload:()=>void}) {
  const [pair,setPair]=useState<{qr:string;expires:number}|null>(null)
  const [pending,setPending]=useState(false)
  const [problem,setProblem]=useState<string|null>(null)
  const visible=status!=='connected' ? pair : null

  useEffect(()=>{
    if(!pair)return
    const expire=window.setTimeout(()=>setPair(null),Math.max(0,pair.expires-Date.now()))
    return ()=>window.clearTimeout(expire)
  },[pair])
  useEffect(()=>{
    if(!visible)return
    const refresh=window.setInterval(reload,5000)
    return ()=>window.clearInterval(refresh)
  },[visible,reload])

  async function connect(){
    if(pending)return
    setPending(true)
    setPair(null)
    setProblem(null)
    try{
      const result=await api.post<{status:WhatsAppStatus;qr:string|null}>('/api/v1/conversations/whatsapp/pair',{})
      if(result.qr && /^data:image\/png;base64,iVBORw0KGgo[A-Za-z0-9+/=]+$/.test(result.qr)) setPair({qr:result.qr,expires:Date.now()+45000})
      reload()
    }catch(failure){setProblem(failure instanceof Error?failure.message:'Não foi possível solicitar o QR code.')}
    finally{setPending(false)}
  }

  const label=error||status==='unavailable'?'Conexão indisponível':status==='connected'?'Conectado':status==='unconfigured'?'Instância não configurada':status==='connecting'?'Aguardando conexão':status==='disconnected'?'Desconectado':'Verificando conexão…'

  return <section className="inbox-connection" aria-label="Conexão do WhatsApp">
    <div className="inbox-connection-bar">
      <span aria-live="polite"><Smartphone size={16} aria-hidden="true"/><strong>WhatsApp</strong><small>{label}</small></span>
      {(status==='disconnected'||status==='connecting')&&<button type="button" className="button button-secondary" onClick={()=>void connect()} disabled={pending}>{pending?'Gerando QR…':'Conectar WhatsApp'}</button>}
      {(error||status==='unavailable')&&<button type="button" className="button button-secondary" onClick={reload}>Verificar conexão</button>}
    </div>
    {(problem||error)&&<p className="login-error" role="alert">{problem||error}</p>}
    {visible&&<div className="inbox-pair-code">
      <img src={visible.qr} alt="QR code para conectar o WhatsApp nesta conta" width={155} height={155} />
      <div><strong>Escaneie pelo WhatsApp no celular</strong><p>Abra Aparelhos conectados → Conectar um aparelho. Não compartilhe este código.</p>
        <button type="button" className="button button-secondary" onClick={()=>setPair(null)}>Fechar QR</button>
      </div>
    </div>}
  </section>
}
