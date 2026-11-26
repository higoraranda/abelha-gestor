// Local browser verification only. The application never imports these fixtures.
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')
const { createServer } = require('node:http')
const { pathToFileURL } = require('node:url')
const { spawn } = require('node:child_process')
const { chromium } = require(process.env.ABELHA_PLAYWRIGHT_MODULE || 'playwright')
const fixtures = require('./dark-mode-fixtures.cjs')
const root = path.resolve(__dirname, '../dist')
const output = path.resolve(__dirname, '../../.abelha-homologacao/bee-loader-v2')
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' }
const user = { id: 'loader-user', organizationId: 'loader-org', name: 'Demonstração', email: 'loader@example.invalid', role: 'owner' }
const encoders = new Map()

// Use an existing VP9-capable FFmpeg when the bundled recorder's codec is unavailable.
async function startScreencast(context, page) {
  const encoder = spawn(process.env.ABELHA_FFMPEG_EXECUTABLE, ['-y', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', '30', '-i', 'pipe:0', '-an', '-c:v', 'libvpx-vp9', '-deadline', 'realtime', '-cpu-used', '8', '-b:v', '900k', path.join(output, 'bee-loader-2.webm')], { windowsHide: true, stdio: ['pipe', 'ignore', 'pipe'] })
  let diagnostic = '', encoderError
  encoder.stderr.on('data', chunk => { diagnostic = (diagnostic + chunk).slice(-1000) })
  encoder.on('error', error => { encoderError = error })
  encoder.stdin.on('error', error => { encoderError = error })
  const closed = new Promise(resolve => encoder.once('close', resolve))
  encoders.set(encoder, closed)
  void closed.then(() => encoders.delete(encoder))
  const cdp = await context.newCDPSession(page)
  let firstTimestamp, emitted = 0, previous
  const frame = ({ data, metadata, sessionId }) => {
    void cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {})
    if (encoder.stdin.destroyed || encoderError) return
    firstTimestamp ??= metadata.timestamp
    const target = Math.round((metadata.timestamp - firstTimestamp) * 30)
    while (previous && emitted < target) { encoder.stdin.write(previous); emitted++ }
    previous = Buffer.from(data, 'base64')
    if (emitted <= target) { encoder.stdin.write(previous); emitted++ }
  }
  cdp.on('Page.screencastFrame', frame)
  try { await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 80, maxWidth: 960, maxHeight: 720, everyNthFrame: 1 }) }
  catch (error) { encoder.kill(); await closed; await cdp.detach(); throw error }
  return async () => {
    await cdp.send('Page.stopScreencast').catch(() => {})
    cdp.off('Page.screencastFrame', frame)
    encoder.stdin.end()
    const code = await closed
    await cdp.detach().catch(() => {})
    if (code !== 0 || encoderError) throw new Error(encoderError?.message || diagnostic)
    console.log('Screencast encoder closed. PID:', encoder.pid, 'frames:', emitted)
  }
}

;(async () => {
  await fs.mkdir(output, { recursive: true })
  const server = createServer(async (request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname)
    const file = path.resolve(root, pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, ''))
    if (!file.startsWith(root + path.sep)) { response.writeHead(403).end(); return }
    try { response.writeHead(200, { 'content-type': mime[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' }).end(await fs.readFile(file)) }
    catch { response.writeHead(404).end() }
  })
  let browser, vite
  const checks = [], ports = []
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
    const port = server.address().port
    ports.push(port)
    const base = `http://127.0.0.1:${port}`
    browser = await chromium.launch({ headless: true, ...(process.env.ABELHA_BROWSER_EXECUTABLE ? { executablePath: process.env.ABELHA_BROWSER_EXECUTABLE } : {}) })

    async function scenario({ origin = base, reducedMotion = 'no-preference', width = 1440, height = width === 390 ? 844 : 1000, mode = 'unavailable', session = 'anonymous', clock = false, video = false, brokenImage = false, persistedUser = false } = {}) {
      const nativeVideo = video && process.env.ABELHA_FFMPEG_EXECUTABLE
      const context = await browser.newContext({ viewport: { width, height }, reducedMotion, serviceWorkers: 'block', ...(video && !nativeVideo ? { recordVideo: { dir: path.join(output, 'video'), size: { width: 960, height: 720 } } } : {}) })
      const page = await context.newPage()
      page.setDefaultTimeout(12000)
      if (clock) await page.clock.install()
      if (persistedUser) await page.addInitScript(value => localStorage.setItem('abelha-auth', JSON.stringify({ state: { user: value }, version: 0 })), user)
      await page.addInitScript(() => {
        window.loaderFrames = []
        function capture() {
          const bee = document.querySelector('.bee-loader__bee'), scene = document.querySelector('.bee-loader__scene'), loader = document.querySelector('.bee-loader')
          if (bee && scene) {
            const matrix = new DOMMatrixReadOnly(getComputedStyle(bee).transform), scale = scene.getBoundingClientRect().width / 400
            window.loaderFrames.push({ t: performance.now(), state: loader.dataset.state, x: matrix.e / scale, y: matrix.f / scale, opacity: getComputedStyle(bee).opacity, cycleTime: Number(bee.getAnimations()[0]?.currentTime ?? 0) })
          }
          if (document.querySelector('.auth-loading')) window.unexpectedAuthLoader = true
          requestAnimationFrame(capture)
        }
        requestAnimationFrame(capture)
      })
      const health = { mode, session, brokenImage, calls: 0, sessionCalls: 0, dataCalls: 0, releaseSession: null }
      const errors = []
      page.on('pageerror', error => errors.push(error.message))
      await context.route('**/*', async route => {
        const url = new URL(route.request().url())
        const headers = { 'access-control-allow-origin': origin, 'access-control-allow-credentials': 'true' }
        if (url.pathname === '/api/v1/health') {
          health.calls++
          if (health.mode === 'html') return route.fulfill({ status: 200, contentType: 'text/html', body: '<html>Fallback</html>', headers })
          return route.fulfill({ status: health.mode === 'ready' ? 200 : 503, json: { status: health.mode === 'ready' ? 'ok' : 'starting' }, headers })
        }
        if (url.pathname.startsWith('/api/')) {
          if (url.pathname === '/api/auth/session') {
            health.sessionCalls++
            if (health.session === 'hold') await new Promise(resolve => { health.releaseSession = resolve })
            if (health.session === 'error') return route.fulfill({ status: 503, json: { error: 'Synthetic failure' }, headers })
            return route.fulfill({ json: health.session === 'authenticated' ? { user } : null, headers })
          }
          if (url.pathname === '/api/auth/csrf') return route.fulfill({ json: { csrfToken: 'synthetic-csrf' }, headers })
          if (url.pathname === '/api/auth/callback/credentials') return route.fulfill({ json: { url: '/' }, headers })
          health.dataCalls++
          if (url.pathname === '/api/events') return route.fulfill({ contentType: 'text/event-stream', body: ': synthetic\n\n', headers })
          return route.fulfill({ json: fixtures.response(url.pathname, url.searchParams) ?? [], headers })
        }
        if (url.origin !== origin) return route.abort()
        if (url.pathname === '/bee-mark.png' && health.brokenImage) return route.fulfill({ status: 404, body: '' })
        return route.continue()
      })
      const stopVideo = nativeVideo ? await startScreencast(context, page) : null
      await page.goto(origin)
      await page.locator('.bee-loader').waitFor()
      return { context, page, health, errors, stopVideo }
    }
    async function record(name, test) {
      if (process.env.ABELHA_LOADER_ONLY && !name.includes(process.env.ABELHA_LOADER_ONLY)) return
      await test()
      checks.push(name)
      console.log('PASS:', name)
    }

    await record('production: two complete cycles, smooth seam, session gating, physical occlusion, one finish and internal navigation', async () => {
      const s = await scenario({ session: 'hold' })
      try {
        const { page, health } = s
        await page.waitForTimeout(10800)
        const frames = await page.evaluate(() => window.loaderFrames)
        await fs.writeFile(path.join(output, 'flight-frames.json'), JSON.stringify(frames))
        assert.ok(frames.some(frame => frame.cycleTime >= 10400), 'must observe two complete 5.2-second cycles')
        assert.ok(Math.max(...frames.map(f => f.x)) - Math.min(...frames.map(f => f.x)) > 195)
        for (let i = 1; i < frames.length; i++) {
          const a = frames[i - 1], b = frames[i], dt = b.t - a.t
          if (dt < 80) assert.ok(Math.hypot(b.x - a.x, b.y - a.y) < dt * 0.2 + 1, 'flight must never jump at a seam')
          assert.ok(Math.hypot(b.x - 312, b.y - 180) > 85, 'loading flight stays away from the flower')
        }
        assert.equal(await page.locator('.bee-loader img').getAttribute('src'), '/bee-mark.png')
        assert.equal(health.sessionCalls, 0)
        assert.equal(health.dataCalls, 0)
        await page.screenshot({ path: path.join(output, 'loading-desktop.png') })
        await page.locator('.bee-loader__content').screenshot({ path: path.join(output, 'scene-desktop.png') })
        health.mode = 'ready'
        await page.getByText('Verificando seu acesso com segurança.').waitFor()
        await page.waitForTimeout(600)
        assert.equal(await page.locator('.bee-loader[data-state=loading]').count(), 1)
        assert.equal(health.sessionCalls, 1)
        assert.equal(health.dataCalls, 0)
        health.session = 'authenticated'
        health.releaseSession()
        await page.locator('.bee-loader[data-state=finishing]').waitFor()
        await page.evaluate(() => { const animation = document.querySelector('.bee-loader__bee').getAnimations()[0]; animation.pause(); animation.currentTime = 720 })
        await page.screenshot({ path: path.join(output, 'approaching-desktop.png') })
        await page.evaluate(() => { document.querySelector('.bee-loader__bee').getAnimations()[0].currentTime = 930 })
        const visible = await page.locator('.bee-loader__scene').screenshot()
        await fs.writeFile(path.join(output, 'entering-flower.png'), visible)
        assert.equal(await page.locator('.bee-loader__bee').evaluate(el => getComputedStyle(el).opacity), '1')
        await page.locator('.bee-loader__foreground').evaluate(el => { el.style.visibility = 'hidden' })
        const uncovered = await page.locator('.bee-loader__scene').screenshot()
        const difference = await page.evaluate(async ([front, back]) => {
          async function pixels(data) {
            const bytes = Uint8Array.from(atob(data), char => char.charCodeAt(0))
            const image = await createImageBitmap(new Blob([bytes], { type: 'image/png' }))
            const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height
            const context = canvas.getContext('2d'); context.drawImage(image, 0, 0)
            const pixels = context.getImageData(300, 195, 25, 25).data
            image.close(); return pixels
          }
          const a = await pixels(front), b = await pixels(back)
          let different = 0
          for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 60) different++
          return different
        }, [visible.toString('base64'), uncovered.toString('base64')])
        assert.ok(difference > 10, 'front petals must physically cover the opaque bee')
        await page.locator('.bee-loader__foreground').evaluate(el => { el.style.visibility = '' })
        await page.evaluate(() => document.querySelector('.bee-loader__bee').getAnimations()[0].play())
        await page.locator('.workspace-header').waitFor()
        assert.equal(health.sessionCalls, 1, 'ProtectedRoute must reuse the verified startup session')
        assert.equal(await page.evaluate(() => !!window.unexpectedAuthLoader), false)
        const trace = await page.evaluate(() => window.loaderFrames)
        const finishIndex = trace.findIndex(frame => frame.state === 'finishing')
        assert.ok(finishIndex > 0)
        assert.ok(Math.hypot(trace[finishIndex].x - trace[finishIndex - 1].x, trace[finishIndex].y - trace[finishIndex - 1].y) < 12, 'landing starts from the current loop position')
        await fs.writeFile(path.join(output, 'motion-samples.json'), JSON.stringify({ frames: trace, occludedPixels: difference }, null, 2))
        const calls = health.calls
        await page.getByRole('button', { name: 'Clientes', exact: true }).click()
        await page.waitForTimeout(600)
        assert.equal(await page.locator('.bee-loader').count(), 0)
        assert.equal(health.calls, calls)
        await page.screenshot({ path: path.join(output, 'system-ready-desktop.png') })
        assert.deepEqual(s.errors, [])
      } finally {
        const video = s.page.video()
        s.health.releaseSession?.()
        await s.stopVideo?.().catch(error => console.warn('Optional screencast was not saved:', error.message))
        await s.context.close()
        if (video) await video.saveAs(path.join(output, 'bee-loader-2.webm')).catch(error => console.warn('Optional video was not saved:', error.message))
      }
    })

    await record('fast backend: anonymous session, short event-driven finish and login without a second loader', async () => {
      const s = await scenario({ mode: 'ready' })
      try {
        await s.page.locator('.login-form').waitFor()
        const trace = await s.page.evaluate(() => window.loaderFrames)
        const finish = trace.filter(frame => frame.state === 'finishing')
        assert.ok(finish.length > 0)
        assert.ok(finish.at(-1).t - finish[0].t < 1400)
        assert.equal(s.health.sessionCalls, 1)
        assert.equal(await s.page.evaluate(() => !!window.unexpectedAuthLoader), false)
        assert.deepEqual(s.errors, [])
      } finally { await s.context.close() }
    })

    await record('mobile: HTML rejected, persistent failure diagnosed, keyboard retry, offline and reconnection', async () => {
      const s = await scenario({ width: 390, mode: 'html', clock: true })
      try {
        const { page, health } = s
        await page.waitForTimeout(100)
        await page.clock.fastForward(45001)
        await page.getByText(/O serviço ainda não enviou uma resposta válida/).waitFor()
        await page.locator('.bee-loader[data-state=recovering]').waitFor()
        assert.equal(await page.locator('.bee-loader__bee').evaluate(el=>el.getAnimations().length),0,'A persistent outage must stop the loading animation')
        assert.equal(health.sessionCalls, 0)
        assert.ok(health.calls < 12)
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
        await page.screenshot({ path: path.join(output, 'error-mobile.png') })
        await s.context.setOffline(true)
        await page.getByText(/Você está sem conexão/).waitFor()
        await page.screenshot({ path: path.join(output, 'offline-mobile.png') })
        await page.getByRole('button', { name: 'Tentar novamente' }).focus()
        assert.ok(await page.getByRole('button', { name: 'Tentar novamente' }).evaluate(el => getComputedStyle(el).outlineStyle !== 'none'))
        health.mode = 'ready'
        await page.keyboard.press('Enter')
        await s.context.setOffline(false)
        await page.clock.runFor(1700)
        await page.locator('.login-form').waitFor()
        assert.deepEqual(s.errors, [])
      } finally { await s.context.close() }
    })

    await record('session failure: persisted user retained, no premature finish, functional retry', async () => {
      const s = await scenario({ mode: 'ready', session: 'error', persistedUser: true })
      try {
        await s.page.getByText(/Não foi possível verificar seu acesso/).waitFor()
        assert.equal(await s.page.locator('.bee-loader[data-state=recovering]').count(), 1)
        assert.equal(await s.page.evaluate(() => JSON.parse(localStorage.getItem('abelha-auth')).state.user.id), user.id)
        assert.equal(s.health.dataCalls, 0)
        s.health.session = 'anonymous'
        await s.page.getByRole('button', { name: 'Tentar novamente' }).click()
        await s.page.locator('.login-form').waitFor()
        assert.equal(s.health.sessionCalls, 2)
        assert.deepEqual(s.errors, [])
      } finally { await s.context.close() }
    })

    await record('automatic motion: no flight button, mobile and desktop, gentler reduced-motion variant', async () => {
      const noToggle = page => page.getByRole('button', { name: /Ativar voo|Pausar voo/ }).count()
      for (const width of [390, 1440]) {
        const s = await scenario({ width })
        try {
          const { page } = s
          assert.equal(await noToggle(page), 0)
          await page.waitForFunction(() => document.querySelector('.bee-loader__bee').getAnimations().some(a => Number(a.currentTime) > 100))
          await page.emulateMedia({ reducedMotion: 'reduce' })
          await page.locator('.bee-loader[data-motion=reduced]').waitFor()
          await page.waitForFunction(() => document.querySelector('.bee-loader__bee').getAnimations().length === 0)
          await page.waitForFunction(() => document.querySelector('.bee-loader__bee img').getAnimations().some(a => Number(a.currentTime) > 100))
          assert.equal(await noToggle(page), 0)
          assert.equal(await page.locator('.bee-loader__bee img').evaluate(el => getComputedStyle(el).transform), 'none')
          assert.deepEqual(s.errors, [])
        } finally { await s.context.close() }
      }
      const reduced = await scenario({ reducedMotion: 'reduce' })
      try {
        await reduced.page.locator('.bee-loader[data-motion=reduced]').waitFor()
        assert.equal(await noToggle(reduced.page), 0)
        await reduced.page.waitForFunction(() => document.querySelector('.bee-loader__bee img').getAnimations().length === 1)
        reduced.health.mode = 'ready'
        await reduced.page.locator('.login-form').waitFor()
        assert.deepEqual(reduced.errors, [])
      } finally { await reduced.context.close() }
    })

    await record('essential asset: failed image blocks completion and retry recovers without repeating successful health', async () => {
      const s = await scenario({ mode: 'ready', brokenImage: true })
      try {
        await s.page.getByText(/Não foi possível carregar a imagem/).waitFor()
        await s.page.waitForTimeout(150)
        assert.equal(s.health.sessionCalls, 0, 'session validation must wait for the essential asset, avoiding a stale snapshot')
        const calls = s.health.calls
        s.health.brokenImage = false
        await s.page.getByRole('button', { name: 'Tentar novamente' }).click()
        await s.page.locator('.login-form').waitFor()
        assert.equal(s.health.calls, calls)
        assert.deepEqual(s.errors, [])
      } finally { await s.context.close() }
    })

    await record('snapshot: history change during finishing must not overwrite a subsequent login', async () => {
      const s = await scenario({ mode: 'ready' })
      try {
        await s.page.locator('.bee-loader[data-state=finishing]').waitFor()
        await s.page.evaluate(() => { history.pushState(null, '', '/login'); dispatchEvent(new PopStateEvent('popstate')) })
        await s.page.locator('.login-form').waitFor()
        s.health.session = 'authenticated'
        await s.page.getByLabel('Email', { exact: true }).fill(user.email)
        await s.page.getByLabel('Senha', { exact: true }).fill('synthetic-test-only')
        await s.page.getByRole('button', { name: 'Entrar', exact: true }).click()
        await s.page.locator('.workspace-header').waitFor()
        assert.equal(await s.page.evaluate(() => JSON.parse(localStorage.getItem('abelha-auth')).state.user.id), user.id)
        assert.deepEqual(s.errors, [])
      } finally { await s.context.close() }
    })

    if (process.env.ABELHA_FFMPEG_EXECUTABLE) await record('video: uninterrupted rendered flight and final entry', async () => {
      const s = await scenario({ video: true })
      try {
        await s.page.waitForTimeout(5400)
        s.health.mode = 'ready'
        await s.page.locator('.login-form').waitFor()
        await s.page.waitForTimeout(250)
      } finally {
        await s.stopVideo?.()
        await s.context.close()
      }
      assert.ok((await fs.stat(path.join(output, 'bee-loader-2.webm'))).size > 10000)
    })

    await record('responsive geometry: tablet, notebook and 320px phone retain the complete scene', async () => {
      for (const viewport of [{ width: 768, height: 1024 }, { width: 1366, height: 768 }, { width: 320, height: 568 }]) {
        const s = await scenario(viewport)
        try {
          const bounds = await s.page.locator('.bee-loader__scene').boundingBox()
          assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= viewport.width)
          assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= viewport.height)
          assert.equal(await s.page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
          assert.deepEqual(s.errors, [])
        } finally { await s.context.close() }
      }
    })

    const { createServer: createViteServer } = await import(pathToFileURL(path.resolve(__dirname, '../node_modules/vite/dist/node/index.js')).href)
    vite = await createViteServer({ root: path.resolve(__dirname, '..'), server: { host: '127.0.0.1', port: 0, strictPort: true, open: false }, define: { 'import.meta.env.VITE_API_URL': JSON.stringify('') } })
    await vite.listen()
    const vitePort = vite.httpServer.address().port
    ports.push(vitePort)
    await record('development/StrictMode: actual flight, single animation and functional completion', async () => {
      const s = await scenario({ origin: `http://127.0.0.1:${vitePort}`, width: 390 })
      try {
        const first = await s.page.locator('.bee-loader__bee').evaluate(el => getComputedStyle(el).transform)
        await s.page.waitForTimeout(1000)
        assert.notEqual(await s.page.locator('.bee-loader__bee').evaluate(el => getComputedStyle(el).transform), first)
        assert.equal(await s.page.locator('.bee-loader__bee').evaluate(el => el.getAnimations().length), 1)
        assert.equal(await s.page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
        await s.page.screenshot({ path: path.join(output, 'loading-mobile.png') })
        s.health.mode = 'ready'
        await s.page.locator('.workspace-header').waitFor()
        assert.equal(s.health.sessionCalls, 0, 'loopback-only development access remains unchanged')
        assert.deepEqual(s.errors, [])
      } finally { await s.context.close() }
    })

    await fs.writeFile(path.join(output, process.env.ABELHA_LOADER_ONLY ? 'results-filtered.json' : 'results.json'), JSON.stringify({ checks, ports }, null, 2))
    console.log(JSON.stringify({ checks, output, ports }, null, 2))
  } finally {
    await browser?.close()
    for (const [encoder, closed] of encoders) { encoder.kill(); await closed }
    await vite?.close()
    server.closeAllConnections()
    await new Promise(resolve => server.close(resolve))
    console.log('Temporary browser, Vite and loopback server closed. Ports:', ports.join(', '))
  }
})().catch(error => { console.error(error); process.exitCode = 1 })
