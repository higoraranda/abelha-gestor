import { useState } from 'react'
import { api } from '@/lib/api'

export default function AccountInvites() {
  const [link,setLink]=useState('')
  const [message,setMessage]=useState('')
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)
  async function invite(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if(busy)return
    const email=new FormData(event.currentTarget).get('email')
    setBusy(true);setError('');setMessage('');setLink('')
    try {
      const {token}=await api.post<{token:string}>('/api/v1/account/invites',{email})
      setLink(new URL('/cadastro#convite='+token,window.location.origin).href)
    } catch(failure) {setError(failure instanceof Error?failure.message:'Não foi possível gerar o convite.')}
    finally {setBusy(false)}
  }
  async function copy() {
    try {await navigator.clipboard.writeText(link);setMessage('Link copiado.')}
    catch {setMessage('Selecione o link para copiá-lo manualmente.')}
  }
  return <section className="crm-panel personal-section">
    <h2>Convidar alguém</h2><p>Gere um link individual, válido por 72 horas e de uso único. Gerar outro para o mesmo email substitui o anterior.</p>
    <form className="register-fields" onSubmit={invite}>
      <label className="login-field"><span>Email do convidado</span><input name="email" type="email" maxLength={255} required /></label>
      <button className="button button-primary" disabled={busy}>{busy?'Gerando…':'Gerar convite'}</button>
    </form>
    {error&&<p className="login-error" role="alert">{error}</p>}
    {link&&<div className="register-fields"><label className="login-field"><span>Link privado</span><input value={link} readOnly onFocus={event=>event.currentTarget.select()} /></label><button className="button button-secondary" onClick={copy}>Copiar link</button><p role="status">{message||'Convite pronto. Compartilhe somente com a pessoa convidada.'}</p></div>}
  </section>
}
