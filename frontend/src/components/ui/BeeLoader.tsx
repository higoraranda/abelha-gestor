import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { API_BASE_URL } from '@/lib/apiBase'
import { useBackendReady } from '@/hooks/useBackendReady'
import './BeeLoader.css'

interface BeeLoaderProps {
  children: ReactNode
  healthUrl?: string
}

export default function BeeLoader({ children, healthUrl = `${API_BASE_URL}/api/v1/health` }: BeeLoaderProps) {
  const { ready, slow, offline, retry } = useBackendReady(healthUrl)
  const [done, setDone] = useState(false)
  const state: 'loading' | 'finishing' | 'done' = done ? 'done' : ready ? 'finishing' : 'loading'
  const beeRef = useRef<SVGGElement>(null)
  const lastPosition = useRef('translate(80px, 95px)')

  useEffect(() => {
    const bee = beeRef.current
    if (!bee || state === 'done') return
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (state === 'loading') {
      const flight = !reducedMotion && bee.animate?.([
        { transform: 'translate(80px, 95px) rotate(-12deg)', offset: 0 },
        { transform: 'translate(170px, 55px) rotate(12deg)', offset: 0.25 },
        { transform: 'translate(250px, 92px) rotate(25deg)', offset: 0.5 },
        { transform: 'translate(165px, 115px) rotate(-22deg)', offset: 0.75 },
        { transform: 'translate(80px, 95px) rotate(-12deg)', offset: 1 },
      ], { duration: 4400, iterations: Infinity, easing: 'ease-in-out' })
      return () => {
        lastPosition.current = getComputedStyle(bee).transform
        if (flight) flight.cancel()
      }
    }

    let settled = false
    const complete = () => {
      if (settled) return
      settled = true
      setDone(true)
    }
    // Capture the loop's current position so readiness never snaps the bee back.
    const landing = bee.animate?.(reducedMotion ? [
      { opacity: 1 }, { opacity: 0 },
    ] : [
      { transform: lastPosition.current, opacity: 1, offset: 0 },
      { transform: 'translate(245px, 85px) rotate(15deg) scale(.9)', opacity: 1, offset: 0.5 },
      { transform: 'translate(292px, 149px) rotate(35deg) scale(.48)', opacity: 1, offset: 0.8 },
      { transform: 'translate(300px, 170px) rotate(55deg) scale(.02)', opacity: 0, offset: 1 },
    ], { duration: reducedMotion ? 160 : 1400, easing: 'ease-in-out', fill: 'forwards' })
    // Keep the exit duration independent from animation events and browser settings.
    const finishTimer = window.setTimeout(complete, reducedMotion ? 220 : 1800)
    return () => {
      settled = true
      landing?.cancel()
      window.clearTimeout(finishTimer)
    }
  }, [state])

  if (state === 'done') return <div className="bee-loader-app">{children}</div>

  const title = state === 'finishing' ? 'Seu espaço está pronto.' : 'Preparando seu espaço'
  const message = state === 'finishing'
    ? 'Vamos entrar.'
    : offline
      ? 'Você está sem conexão. Vamos continuar assim que a internet voltar.'
      : slow
        ? 'Está levando um pouco mais de tempo. Continuamos tentando conectar.'
        : 'Só um instante enquanto tudo fica pronto.'

  return (
    <main className="bee-loader" data-state={state} aria-label="Inicializando o Abelha">
      <div className="bee-loader__content">
        <p className="bee-loader__brand">abelha<span>seu espaço, no seu ritmo</span></p>
        <svg className="bee-loader__scene" viewBox="0 0 400 260" aria-hidden="true" focusable="false">
          <path className="bee-loader__trail" d="M75 135C24 74 144 20 222 54S268 135 177 123" />
          <path className="bee-loader__stem" d="M300 178Q290 210 303 247M300 228Q266 229 265 210Q292 208 300 228M299 214Q325 215 333 196Q306 194 299 214" />
          <g className="bee-loader__petals" transform="translate(300 164)">
            {[0, 60, 120, 180, 240, 300].map(angle => <ellipse key={angle} cy="-24" rx="16" ry="25" transform={`rotate(${angle})`} />)}
            <circle className="bee-loader__flower-center" r="21" />
          </g>
          <g ref={beeRef} className="bee-loader__bee">
            <image href="/bee-mark.png" x="-49" y="-49" width="98" height="98" />
          </g>
          {/* The front petals occlude the landing, giving the flower real depth. */}
          <path className="bee-loader__front-petals" d="M266 171Q269 205 292 192Q301 216 313 191Q337 199 335 171Q318 180 300 174Q281 181 266 171Z" />
          <path className="bee-loader__ground" d="M45 249H355" />
        </svg>
        <div className="bee-loader__status" role="status" aria-live="polite" aria-atomic="true">
          <h1>{title}</h1>
          <p>{message}</p>
        </div>
        <div className="bee-loader__recovery">
          {state === 'loading' && (slow || offline) && <button className="button button-secondary" type="button" onClick={retry}>Tentar novamente</button>}
        </div>
      </div>
    </main>
  )
}
