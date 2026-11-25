import { useState } from 'react'
import { api } from '@/lib/api'
import { useRemote } from '@/hooks/useRemote'
import MemberModuleSettings from '@/components/personal/MemberModuleSettings'

type Invitation={email:string;expires_at:string;status:'pending'|'used'|'expired'|'revoked'}
const label={pending:'Pendente',used:'Utilizado',expired:'Expirado',revoked:'Revogado'}

export default function AccountInvites() {
  const [link,setLink]=useState('')
  const [expiresAt,setExpiresAt]=useState('')
  const [message,setMessage]=useState('')
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)
  const invitations=useRemote<Invitation[]>('/api/v1/account/invites')
  const [revoke,setRevoke]=useState<string|null>(null)

  async function expire(email:string) {
    if(busy)return
    setBusy(true);setError('')
    try {
      await api.post('/api/v1/account/invites/expire',{email})
      setRevoke(null);setLink('');setMessage('Convite encerrado.')
    }catch(failure){setError(failure instanceof Error?failure.message:'Não foi possível encerrar o convite.')}
    finally{setBusy(false)}
  }
  async function invite(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if(busy)return
    const fields=new FormData(event.currentTarget)
    const email=fields.get('email'),validityHours=Number(fields.get('validityHours'))
    setBusy(true);setError('');setMessage('');setLink('')
    try {
      const {token,expiresAt}=await api.post<{token:string;expiresAt:string}>('/api/v1/account/invites',{email,validityHours})
      setExpiresAt(expiresAt)
      setLink(new URL('/cadastro#convite='+token,window.location.origin).href)
    } catch(failure) {setError(failure instanceof Error?failure.message:'Não foi possível gerar o convite.')}
    finally {setBusy(false)}
  }
  async function copy() {
    try {await navigator.clipboard.writeText(link);setMessage('Link copiado.')}
    catch {setMessage('Selecione o link para copiá-lo manualmente.')}
  }
  return <section className="crm-panel personal-section">
    <h2>Convidar alguém</h2><p>Gere um link individual, de uso único e com prazo definido por você. Gerar outro para o mesmo email substitui o anterior.</p>
    <form className="register-fields" onSubmit={invite}>
      <label className="login-field"><span>Email do convidado</span><input name="email" type="email" maxLength={255} required /></label>
      <label className="login-field"><span>Validade do convite</span><select name="validityHours" defaultValue={72}>
        <option value={4}>4 horas</option><option value={24}>24 horas</option><option value={72}>72 horas</option><option value={168}>7 dias</option>
      </select></label>
      <button className="button button-primary" disabled={busy}>{busy?'Gerando…':'Gerar convite'}</button>
    </form>
    {error&&<p className="login-error" role="alert">{error}</p>}
    {link&&<div className="register-fields"><label className="login-field"><span>Link privado</span><input value={link} readOnly onFocus={event=>event.currentTarget.select()} /></label><button className="button button-secondary" onClick={copy}>Copiar link</button><p role="status">{message||'Convite pronto. Compartilhe somente com a pessoa convidada.'}{expiresAt&&<> Válido até {new Date(expiresAt).toLocaleString('pt-BR')}.</>}</p></div>}
    {!link&&message&&<p role="status">{message}</p>}
    <h3>Convites recentes</h3>
    {invitations.error?<p role="alert">{invitations.error} <button type="button" className="button button-secondary" onClick={invitations.reload}>Tentar novamente</button></p>:
      invitations.loading&&!invitations.data?<p role="status">Carregando convites…</p>:
      !invitations.data?.length?<p>Nenhum convite ainda.</p>:
      <ul aria-label="Convites recentes">{invitations.data.map(invite=><li className="personal-update" key={invite.email}>
        <strong>{invite.email}</strong> <span>{label[invite.status]}</span>
        {invite.status==='pending'&&<p>Válido até {new Date(invite.expires_at).toLocaleString('pt-BR')}.</p>}
        {invite.status==='pending'&&(revoke===invite.email?<div className="quote-actions">
          <span>Encerrar este link? O acesso de quem já se cadastrou não é alterado.</span>
          <button type="button" className="button button-secondary" disabled={busy} onClick={()=>void expire(invite.email)}>Encerrar link</button>
          <button type="button" className="button button-secondary" onClick={()=>setRevoke(null)}>Cancelar</button>
        </div>:<button type="button" className="button button-secondary" disabled={busy} onClick={()=>setRevoke(invite.email)}>Revogar convite</button>)}
      </li>)}</ul>}
    <MemberModuleSettings/>
  </section>
}
