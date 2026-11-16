// Compiled frontend, loopback server and synthetic health/session responses only.
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')
const { createServer } = require('node:http')
const { chromium } = require(process.env.ABELHA_PLAYWRIGHT_MODULE || 'playwright')

const root = path.resolve(__dirname, '../dist')
const output = path.resolve(__dirname, '../../.abelha-homologacao/bee-loader')
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' }

;(async () => {
  await fs.mkdir(output, { recursive: true })
  const server = createServer(async (request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname)
    const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '')
    const file = path.resolve(root, relative)
    if (!file.startsWith(root + path.sep)) { response.writeHead(403).end(); return }
    try {
      const body = await fs.readFile(file)
      response.writeHead(200, { 'content-type': mime[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' }).end(body)
    } catch { response.writeHead(404).end() }
  })
  let browser
  const checks = []
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
    const port = server.address().port
    const base = `http://127.0.0.1:${port}`
    browser = await chromium.launch({ headless: true, ...(process.env.ABELHA_BROWSER_EXECUTABLE ? { executablePath: process.env.ABELHA_BROWSER_EXECUTABLE } : {}) })

    async function scenario({ reducedMotion = 'no-preference', width = 1440, mode = 'unavailable', clock = false } = {}) {
      const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1000 }, reducedMotion, serviceWorkers: 'block' })
      const page = await context.newPage()
      page.setDefaultTimeout(10000)
      if (clock) await page.clock.install()
      const health = { mode, calls: 0, otherCalls: 0 }
      const errors = []
      page.on('pageerror', error => errors.push(error.message))
      await context.route('**/*', async route => {
        const url = new URL(route.request().url())
        if (url.origin !== base) return route.abort()
        if (url.pathname === '/api/v1/health') {
          health.calls++
          if (health.mode === 'html') return route.fulfill({ status: 200, contentType: 'text/html', body: '<html>Fallback</html>' })
          return route.fulfill({ status: health.mode === 'ready' ? 200 : 503, json: { status: health.mode === 'ready' ? 'ok' : 'starting' } })
        }
        if (url.pathname.startsWith('/api/')) {
          health.otherCalls++
          if (url.pathname === '/api/auth/session') return route.fulfill({ json: { user: null } })
          return route.fulfill({ status: 503, json: { error: 'Synthetic endpoint not configured' } })
        }
        return route.continue()
      })
      await page.goto(base)
      await page.locator('.bee-loader').waitFor()
      return { context, page, health, errors }
    }

    const desktop = await scenario()
    try {
      const { page, health } = desktop
      await page.waitForFunction(() => document.querySelector('.bee-loader__bee')?.getAnimations().length > 0)
      const first = await page.locator('.bee-loader__bee').evaluate(element => getComputedStyle(element).transform)
      await page.waitForTimeout(400)
      assert.notEqual(await page.locator('.bee-loader__bee').evaluate(element => getComputedStyle(element).transform), first)
      assert.equal(await page.locator('.bee-loader image').getAttribute('href'), '/bee-mark.png')
      assert.equal(health.otherCalls, 0, 'app APIs must wait for backend readiness')
      await page.screenshot({ path: path.join(output, 'loading-desktop.png') })
      await page.evaluate(() => {
        window.finishingCount = 0
        new MutationObserver(records => {
          for (const record of records) if (record.type === 'attributes' && record.target.dataset.state === 'finishing') window.finishingCount++
        }).observe(document.querySelector('.bee-loader'), { attributes: true, attributeFilter: ['data-state'] })
      })
      await page.waitForFunction(() => document.querySelector('.bee-loader')?.dataset.state === 'loading')
      health.mode = 'ready'
      await page.locator('.bee-loader[data-state=finishing]').waitFor()
      await page.waitForTimeout(900)
      await page.screenshot({ path: path.join(output, 'finishing-desktop.png') })
      await page.locator('.login-form').waitFor()
      const calls = health.calls
      await page.waitForTimeout(2700)
      assert.equal(health.calls, calls, 'polling must stop after success')
      assert.equal(await page.evaluate(() => window.finishingCount), 1)
      assert.equal(await page.locator('.bee-loader').count(), 0)
      assert.ok(health.otherCalls > 0)
      assert.deepEqual(desktop.errors, [])
      checks.push('desktop: loop, original asset, deferred app, one finish, landing, stopped polling, login')
    } finally { await desktop.context.close() }

    const mobile = await scenario({ width: 390, mode: 'html' })
    try {
      const { page, health, context } = mobile
      await page.waitForTimeout(2800)
      assert.ok(health.calls >= 2)
      assert.equal(health.otherCalls, 0, 'HTTP 200 HTML must never unlock the app')
      assert.equal(await page.locator('.bee-loader[data-state=loading]').count(), 1)
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
      await page.screenshot({ path: path.join(output, 'loading-mobile.png') })
      await context.setOffline(true)
      await page.getByText(/Você está sem conexão/).waitFor()
      await page.keyboard.press('Tab')
      assert.equal(await page.getByRole('button', { name: 'Tentar novamente' }).evaluate(element => element === document.activeElement), true)
      await page.screenshot({ path: path.join(output, 'offline-mobile.png') })
      health.mode = 'ready'
      await page.keyboard.press('Enter')
      await context.setOffline(false)
      await page.locator('.login-form').waitFor()
      assert.deepEqual(mobile.errors, [])
      checks.push('mobile: no overflow, HTML rejected, offline copy, keyboard retry, online recovery')
    } finally { await mobile.context.close() }

    const reduced = await scenario({ reducedMotion: 'reduce', clock: true })
    try {
      const { page, health } = reduced
      assert.equal(await page.locator('.bee-loader__bee').evaluate(element => element.getAnimations().length), 0)
      await page.clock.fastForward(45001)
      await page.getByText(/Está levando um pouco mais de tempo/).waitFor()
      health.mode = 'ready'
      await page.getByRole('button', { name: 'Tentar novamente' }).click()
      await page.clock.runFor(500)
      await page.locator('.login-form').waitFor()
      assert.deepEqual(reduced.errors, [])
      checks.push('reduced motion: no loop, slow feedback, manual retry, short completion')
    } finally { await reduced.context.close() }

    await fs.writeFile(path.join(output, 'results.json'), JSON.stringify({ checks }, null, 2))
    console.log(JSON.stringify({ checks, output, port }, null, 2))
  } finally {
    if (browser) await browser.close()
    server.closeAllConnections()
    await new Promise(resolve => server.close(resolve))
    console.log('Temporary browser and loopback server closed.')
  }
})().catch(error => { console.error(error); process.exitCode = 1 })
