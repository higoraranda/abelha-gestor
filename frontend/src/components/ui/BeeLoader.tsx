import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import { API_BASE_URL } from '@/lib/apiBase'
import { useBackendReady } from '@/hooks/useBackendReady'
import { FLIGHT_DURATION, LANDING_DURATION, flightFrames, flightPose, landingFrames, poseTransform } from '@/lib/beeMotion'
import './BeeLoader.css'

interface BeeLoaderProps {
  children: ReactNode
  healthUrl?: string
  prepare?: (signal: AbortSignal) => Promise<void>
}

const motionQuery = '(prefers-reduced-motion: reduce)'
const subscribeMotion = (notify: () => void) => {
  const media = window.matchMedia(motionQuery)
  media.addEventListener('change', notify)
  return () => media.removeEventListener('change', notify)
}
const reducedSnapshot = () => window.matchMedia(motionQuery).matches
const petal = 'M0 -14C-13 -24 -15 -45 0 -46C15 -45 13 -24 0 -14Z'
const petals = Array.from({ length: 8 }, (_, i) => <path key={i} d={petal} transform={`rotate(${i * 45})`} />)

function waitForImage(promise: Promise<void>, signal: AbortSignal): Promise<void> {
  signal.throwIfAborted()
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason)
    signal.addEventListener('abort', abort, { once: true })
    void promise.then(() => {
      signal.removeEventListener('abort', abort)
      if (signal.aborted) reject(signal.reason)
      else resolve()
    })
  })
}

export default function BeeLoader({ children, healthUrl = `${API_BASE_URL}/api/v1/health`, prepare }: BeeLoaderProps) {
  const [mascot] = useState(() => {
    let loaded = () => {}
    const promise = new Promise<void>(resolve => { loaded = resolve })
    return { promise, loaded }
  })
  const prepareResources = useCallback(async (signal: AbortSignal) => {
    await waitForImage(mascot.promise, signal)
    if (prepare) await prepare(signal)
  }, [mascot, prepare])
  const backend = useBackendReady(healthUrl, prepareResources)
  const [done, setDone] = useState(false)
  const [imageReady, setImageReady] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [imageAttempt, setImageAttempt] = useState(0)
  const reduced = useSyncExternalStore(subscribeMotion, reducedSnapshot, () => true)
  const flying = !reduced
  const error = imageError ? 'Não foi possível carregar a imagem. Confira sua conexão e tente novamente.' : backend.error
  const recovering = Boolean(error || backend.slow || backend.offline)
  const state = done ? 'done' : backend.ready && imageReady ? 'finishing' : recovering ? 'recovering' : 'loading'
  const beeRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<HTMLDivElement>(null)
  const mainRef = useRef<HTMLElement>(null)
  const lastPose = useRef(flightPose(0))
  const loopTime = useRef(0)
  const finishWithFlight = useRef(flying)
  const clipId = useId()

  useEffect(() => { finishWithFlight.current = flying }, [flying])

  useEffect(() => {
    const bee = beeRef.current, scene = sceneRef.current
    if (!bee || !scene || state !== 'loading') return
    const flight = flying ? bee.animate?.(flightFrames(), { duration: FLIGHT_DURATION, iterations: Infinity, easing: 'linear' }) : undefined
    if (flight) flight.currentTime = loopTime.current
    return () => {
      const matrix = new DOMMatrixReadOnly(getComputedStyle(bee).transform)
      const scale = scene.getBoundingClientRect().width / 400 || 1
      lastPose.current = { x: matrix.e / scale, y: matrix.f / scale, angle: Math.atan2(matrix.b, matrix.a) * 180 / Math.PI, scale: Math.hypot(matrix.a, matrix.b) }
      bee.style.transform = poseTransform(lastPose.current)
      if (flight) {
        loopTime.current = Number(flight.currentTime ?? 0)
        flight.cancel()
      }
    }
  }, [state, flying])

  useEffect(() => {
    const bee = beeRef.current, main = mainRef.current, scene = sceneRef.current
    if (!bee || !main || !scene || state !== 'finishing') return
    let active = true
    const animations: Animation[] = []
    const animate = (element: Element, frames: Keyframe[], options: KeyframeAnimationOptions) => {
      const animation = element.animate(frames, options)
      animations.push(animation)
      return animation.finished
    }
    async function finish() {
      try {
        if (typeof bee!.animate === 'function') {
          if (finishWithFlight.current) {
            await animate(bee!, landingFrames(lastPose.current), { duration: LANDING_DURATION, fill: 'forwards', easing: 'linear' })
            if (!active) return
            for (const flower of scene!.querySelectorAll('.bee-loader__bloom')) {
              void animate(flower, [{ transform: 'scale(1)' }, { transform: 'scale(1.025)' }, { transform: 'scale(1)' }], { duration: 200 }).catch(() => {})
            }
          }
          await animate(main!, [{ opacity: 1 }, { opacity: 0 }], { duration: finishWithFlight.current ? 220 : 160, fill: 'forwards' })
        }
        if (active) setDone(true)
      } catch {
        // Cancellation on unmount is expected; unsupported animation fails open after readiness.
        if (active) setDone(true)
      }
    }
    void finish()
    return () => {
      active = false
      animations.forEach(animation => animation.cancel())
    }
  }, [state])

  if (state === 'done') return <div className="bee-loader-app">{children}</div>

  const title = state === 'finishing' ? 'Seu espaço está pronto.'
    : state !== 'recovering' ? 'Preparando seu espaço'
      : backend.offline ? 'Sem conexão' : error ? 'Vamos tentar de novo?' : 'Mais tempo que o esperado'
  const diagnostic = backend.failure?.reason === 'invalid'
    ? 'O serviço ainda não enviou uma resposta válida.'
    : backend.failure?.reason === 'http'
      ? 'O serviço está temporariamente indisponível.'
      : 'A conexão está levando mais tempo que o esperado.'
  const message = state === 'finishing' ? 'Vamos entrar.'
    : backend.offline ? 'Você está sem conexão. Vamos continuar assim que a internet voltar.'
      : error ?? (backend.slow ? `${diagnostic} Continuamos tentando. Você também pode tentar novamente.`
        : backend.phase === 'access' && !backend.ready ? 'Verificando seu acesso com segurança.'
          : 'Só um instante enquanto tudo fica pronto.')
  const retry = () => {
    if (imageError) { setImageError(false); setImageReady(false); setImageAttempt(value => value + 1) }
    else backend.retry()
  }
  const flower = <g transform="translate(312 180)"><g className="bee-loader__petals">{petals}</g><circle className="bee-loader__flower-center" r="16" /></g>

  return (
    <main ref={mainRef} className="bee-loader" data-state={state} data-motion={flying ? 'full' : 'reduced'} aria-label={state === 'recovering' ? 'Recuperação de acesso ao Abelha' : 'Inicializando o Abelha'}>
      <div className="bee-loader__content">
        <p className="bee-loader__brand">abelha<span>seu espaço, no seu ritmo</span></p>
        <div ref={sceneRef} className="bee-loader__scene" aria-hidden="true">
          <svg className="bee-loader__garden" viewBox="0 0 400 280" focusable="false">
            <path className="bee-loader__stem" d="M312 215C310 231 309 244 312 258" />
            <path className="bee-loader__leaf" d="M310 242C292 245 278 237 276 225C293 224 306 230 310 242ZM311 233C326 236 340 229 344 218C328 216 316 222 311 233Z" />
            <path className="bee-loader__vein" d="M310 242L286 230M311 233L334 223" />
            <g className="bee-loader__bloom">{flower}</g>
            <path className="bee-loader__ground" d="M48 260H352" />
          </svg>
          <div ref={beeRef} className="bee-loader__bee">
            <img src={imageAttempt ? `/bee-mark.png?loader-retry=${imageAttempt}` : '/bee-mark.png'} alt="" width="1280" height="1280" draggable="false" onLoad={() => { setImageError(false); setImageReady(true); mascot.loaded() }} onError={() => { setImageReady(false); setImageError(true) }} />
          </div>
          <svg className="bee-loader__foreground" viewBox="0 0 400 280" focusable="false">
            <defs><clipPath id={clipId}><rect x="258" y="180" width="108" height="100" /></clipPath></defs>
            <g className="bee-loader__bloom"><g clipPath={`url(#${clipId})`}>{flower}</g></g>
          </svg>
        </div>
        <div className="bee-loader__status" role="status" aria-live="polite" aria-atomic="true">
          <h1>{title}</h1><p>{message}</p>
        </div>
        <div className="bee-loader__recovery">
          {state === 'recovering' && <button className="button button-secondary" type="button" onClick={retry}>Tentar novamente</button>}
        </div>

      </div>
    </main>
  )
}
