/* Public shell only. Build injects the complete static allowlist and content hash. */
const CACHE = 'abelha-shell-__VERSION__'
const STATIC = __PRECACHE__
const DEFAULT_URL = '/?space=personal&view=personal-overview'

function destination(value) {
  try {
    const url = new URL(value, self.location.origin)
    return url.origin === self.location.origin && url.pathname === '/' && url.searchParams.get('space') === 'personal'
      ? url.pathname + url.search : DEFAULT_URL
  } catch { return DEFAULT_URL }
}
async function fetchPublic(path) {
  const response = await fetch(new Request(new URL(path, self.location.origin), { credentials: 'omit', cache: 'no-cache' }))
  const mime = (response.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase()
  const allowed = path === '/' ? ['text/html'] : path.endsWith('.js') ? ['text/javascript','application/javascript'] : path.endsWith('.css') ? ['text/css'] : path.endsWith('.png') ? ['image/png'] : path.endsWith('.svg') ? ['image/svg+xml'] : path.endsWith('.woff2') ? ['font/woff2'] : path.endsWith('.woff') ? ['font/woff','application/font-woff'] : []
  if (!response.ok || response.redirected || !allowed.includes(mime) || /private|no-store/i.test(response.headers.get('Cache-Control') || '')) throw new Error('Public precache failed')
  return response
}
async function publicResource(path) {
  const cache = await caches.open(CACHE)
  const saved = await cache.match(path)
  return saved || fetchPublic(path)
}
self.addEventListener('install', event => event.waitUntil((async () => {
  // Validate every response before writing this version; an incomplete install never activates.
  const responses = await Promise.all(STATIC.map(fetchPublic))
  const cache = await caches.open(CACHE)
  await Promise.all(STATIC.map((path, index) => cache.put(path, responses[index])))
})()))
self.addEventListener('activate', event => event.waitUntil((async () => {
  const keys = await caches.keys()
  await Promise.all(keys.filter(key => key.startsWith('abelha-shell-') && key !== CACHE).map(key => caches.delete(key)))
  await self.clients.claim()
})()))
self.addEventListener('message', event => { if (event.data?.type === 'ACTIVATE_UPDATE') void self.skipWaiting() })
self.addEventListener('fetch', event => {
  const request = event.request
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin || /^\/(api|webhooks|health)(\/|$)/.test(url.pathname)) return
  if (request.mode === 'navigate' && url.pathname === '/') { event.respondWith(publicResource('/')); return }
  if (!url.search && STATIC.includes(url.pathname) && url.pathname !== '/') event.respondWith(publicResource(url.pathname))
})
self.addEventListener('push', event => {
  let payload = {}
  try { payload = event.data?.json() || {} } catch { /* Display a private generic notification even for malformed payloads. */ }
  event.waitUntil(self.registration.showNotification('Abelha', {
    body: 'Você tem uma atualização no seu espaço pessoal. Abra o Abelha para conferir.',
    icon: '/pwa/icon-192.png', badge: '/pwa/icon-192.png',
    tag: typeof payload.key === 'string' ? payload.key.slice(0,160) : 'abelha-update',
    data: { url: destination(payload.url) },
  }))
})
self.addEventListener('notificationclick', event => {
  event.notification.close()
  const target = new URL(destination(event.notification.data?.url), self.location.origin).href
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const existing = windows.find(client => client.url === target)
    if (existing) return existing.focus()
    return self.clients.openWindow(target)
  })())
})
