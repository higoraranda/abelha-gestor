import { useCallback, useEffect, useState } from 'react'

interface InstallEvent extends Event { prompt():Promise<void>;userChoice:Promise<{outcome:string}> }
export function usePwa() {
  const [install,setInstall]=useState<InstallEvent|null>(null)
  const [registration,setRegistration]=useState<ServiceWorkerRegistration|null>(null)
  const [waiting,setWaiting]=useState<ServiceWorker|null>(null)
  const [online,setOnline]=useState(navigator.onLine)
  const [failure,setFailure]=useState('')
  useEffect(()=>{
    const availability=()=>{setOnline(navigator.onLine);if(navigator.onLine)window.dispatchEvent(new Event('abelha:updated'))}
    const installable=(event:Event)=>{event.preventDefault();setInstall(event as InstallEvent)}
    const installed=()=>setInstall(null)
    window.addEventListener('online',availability);window.addEventListener('offline',availability)
    window.addEventListener('beforeinstallprompt',installable);window.addEventListener('appinstalled',installed)
    let active=true
    const listeners:Array<()=>void>=[]
    const unavailable='A instalação offline não pôde ser preparada. Recarregue quando estiver conectado.'
    if(import.meta.env.PROD&&'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'}).then(reg=>{
        if(!active)return
        const sync=()=>{setRegistration(reg.active?.state==='activated'?reg:null);setWaiting(reg.waiting)}
        const watched=new Set<ServiceWorker>()
        const observe=(worker:ServiceWorker|null)=>{
          if(!worker||watched.has(worker))return
          watched.add(worker)
          const changed=()=>{
            if(!active)return
            sync()
            if(worker.state==='installed'&&navigator.serviceWorker.controller)setWaiting(reg.waiting||worker)
            if(worker.state==='redundant')setFailure(unavailable)
            else if(worker.state==='activated')setFailure('')
          }
          worker.addEventListener('statechange',changed)
          listeners.push(()=>worker.removeEventListener('statechange',changed))
          changed()
        }
        const found=()=>observe(reg.installing)
        reg.addEventListener('updatefound',found);listeners.push(()=>reg.removeEventListener('updatefound',found))
        sync();found()
        if(reg.active?.state==='activating')observe(reg.active)
      }).catch(()=>{if(active)setFailure(unavailable)})
    }
    return()=>{active=false;listeners.forEach(remove=>remove());window.removeEventListener('online',availability);window.removeEventListener('offline',availability);window.removeEventListener('beforeinstallprompt',installable);window.removeEventListener('appinstalled',installed)}
  },[])
  return {online,registration,waiting,failure,canInstall:Boolean(install),
    install:useCallback(async()=>{if(install){await install.prompt();await install.userChoice;setInstall(null)}},[install]),
    update:useCallback(()=>{
      if(!waiting)return
      // Only invoked after the user explicitly chooses to reload.
      navigator.serviceWorker.addEventListener('controllerchange',()=>window.location.reload(),{once:true})
      waiting.postMessage({type:'ACTIVATE_UPDATE'})
    },[waiting]),
  }
}
export type PwaState=ReturnType<typeof usePwa>
