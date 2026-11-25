import type { ReactNode } from 'react'
import { CheckCircle2 } from 'lucide-react'

export default function AuthLayout({children}: {children: ReactNode}) {
  return (
    <main className="login-page">
      <section className="login-intro" aria-label="Apresentação do Abelha">
        <div className="login-brand"><img className="brand-mark" src="/bee-mark.png" alt="" /><strong>abelha</strong></div>
        <div className="login-intro-copy">
          <p className="eyebrow">Seu CRM pessoal</p>
          <h1>Clientes, conversas e financeiro sob o seu controle.</h1>
          <p>Um espaço privado para organizar sua carteira e acompanhar cada oportunidade sem informações desnecessárias.</p>
        </div>
        <ul className="login-benefits">
          <li><CheckCircle2 size={16} aria-hidden="true" /> Acesso exclusivo aos seus dados</li>
          <li><CheckCircle2 size={16} aria-hidden="true" /> Clientes cadastrados diretamente</li>
          <li><CheckCircle2 size={16} aria-hidden="true" /> Sessão protegida no navegador</li>
        </ul>
      </section>

      <section className="login-form-side">
        {children}
      </section>
    </main>
  )
}
