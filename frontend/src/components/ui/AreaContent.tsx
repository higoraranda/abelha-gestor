import { Component, Suspense, type ReactNode } from 'react'
import { LoadingState } from './DataState'

class AreaErrorBoundary extends Component<{children:ReactNode},{failed:boolean}> {
  state = {failed:false}
  static getDerivedStateFromError() { return {failed:true} }

  render() {
    if(!this.state.failed)return this.props.children
    return <div className="data-state error-state" role="alert">
      <strong>Não foi possível abrir esta área do Abelha.</strong>
      <p>Confira sua conexão ou volte pelo menu. Recarregue apenas após salvar o que estiver aberto em outras áreas.</p>
      <button className="button button-secondary" type="button" onClick={()=>window.location.reload()}>Recarregar página</button>
    </div>
  }
}

export default function AreaContent({children,fullscreen=false}:{children:ReactNode;fullscreen?:boolean}) {
  const content=<AreaErrorBoundary><Suspense fallback={<LoadingState/>}>{children}</Suspense></AreaErrorBoundary>
  return fullscreen?<div className="area-content-shell">{content}</div>:content
}
