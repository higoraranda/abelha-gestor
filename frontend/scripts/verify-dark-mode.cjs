// TEST ONLY: compiled frontend + loopback Personal preview, synthetic CRM responses.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require(process.env.ABELHA_PLAYWRIGHT_MODULE || 'playwright')
const fixtures = require('./dark-mode-fixtures.cjs')
const base = process.env.ABELHA_TEST_PREVIEW_URL || 'http://127.0.0.1:43170'
if (new URL(base).hostname !== '127.0.0.1') throw new Error('Use only the synthetic loopback preview.')
const output = process.env.ABELHA_SCREENSHOT_DIR || path.resolve('test-artifacts/dark-mode')
fs.mkdirSync(output, { recursive:true })
const views = ['overview','clients','deliveries','pipeline','finance','agenda','inbox','reports','leads','quote-models','personal-overview','personal-projects','personal-finance','personal-subscriptions','personal-prices','personal-review','personal-settings']

// Contrast uses alpha compositing of CSS backgrounds, matching the rendered text surface.
// Images/gradients, disabled controls and native popup internals require visual inspection.
function inspect() {
  function rgba(value) { const parts=value.match(/[\d.]+/g)?.map(Number);return parts?.length>=3 ? [...parts.slice(0,3),parts[3]??1] : [0,0,0,0] }
  function blend(top, bottom) { const a=top[3]+bottom[3]*(1-top[3]);return [0,1,2].map(i=>(top[i]*top[3]+bottom[i]*bottom[3]*(1-top[3]))/(a||1)).concat(a) }
  function background(element) { if(!element)return [20,23,25,1];const c=rgba(getComputedStyle(element).backgroundColor);return c[3]===1?c:blend(c,background(element.parentElement)) }
  function luminance(c) { return c.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0) }
  const contrast=[],lightSurfaces=[],unnamedButtons=[]
  for(const element of document.querySelectorAll('body *')) {
    const style=getComputedStyle(element),rect=element.getBoundingClientRect()
    if(rect.width===0||rect.height===0||style.visibility==='hidden'||style.display==='none')continue
    if(element.closest('[disabled],[aria-disabled=true]'))continue
    let faded=false;for(let parent=element;parent;parent=parent.parentElement)if(Number(getComputedStyle(parent).opacity)<.9){faded=true;break}if(faded)continue
    const bg=background(element), own=rgba(style.backgroundColor)
    if(own[3]>.95&&luminance(own)>.8&&rect.width*rect.height>80)lightSurfaces.push(element.tagName+'.'+element.className)
    if(element.tagName==='BUTTON'&&!element.textContent.trim()&&!element.getAttribute('aria-label')&&!element.getAttribute('aria-labelledby')&&!element.getAttribute('title'))unnamedButtons.push(element.outerHTML.slice(0,160))
    const text=[...element.childNodes].filter(node=>node.nodeType===Node.TEXT_NODE).map(node=>node.textContent).join('').trim()
    if(!text||['SCRIPT','STYLE','OPTION','TITLE'].includes(element.tagName))continue
    const fg=blend(rgba(style.color),bg),l1=luminance(fg),l2=luminance(bg),ratio=(Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05)
    const large=parseFloat(style.fontSize)>=24||(parseFloat(style.fontSize)>=18.66&&Number(style.fontWeight)>=700)
    if(ratio<(large?3:4.5))contrast.push({text:text.slice(0,70),className:element.className,ratio:Math.round(ratio*100)/100,color:style.color,background:bg.slice(0,3)})
  }
  return { scheme:getComputedStyle(document.documentElement).colorScheme,background:getComputedStyle(document.body).backgroundColor,overflow:document.documentElement.scrollWidth>innerWidth,contrast,lightSurfaces,unnamedButtons }
}

;(async()=>{
  const browser=await chromium.launch({headless:true,...process.env.ABELHA_BROWSER_EXECUTABLE?{executablePath:process.env.ABELHA_BROWSER_EXECUTABLE}:{}})
  const context=await browser.newContext({viewport:{width:1440,height:1000},locale:'pt-BR',reducedMotion:'reduce',serviceWorkers:'allow'})
  const page=await context.newPage(),errors=[],results=[],checks=[];page.setDefaultTimeout(10000)
  let mode='populated'
  page.on('pageerror',error=>errors.push(error.message))
  await context.route('**/api/**',async route=>{
    const request=route.request(),url=new URL(request.url()),pathname=url.pathname
    if(url.origin!==base)return route.abort()
    if(pathname==='/api/events')return route.fulfill({status:200,contentType:'text/event-stream',body:': visual preview\n\n'})
    if(mode==='login'&&pathname==='/api/auth/session')return route.fulfill({json:{user:null}})
    if(mode==='error'&&pathname==='/api/v1/crm/tasks')return route.fulfill({status:503,json:{error:'Consulta sintética indisponível. Tente novamente.'}})
    if(mode==='empty'&&pathname==='/api/v1/crm/tasks')return route.fulfill({json:{items:[],total:0}})
    if(mode==='loading'&&pathname==='/api/v1/crm/tasks')await new Promise(resolve=>setTimeout(resolve,1400))
    const value=fixtures.response(pathname,url.searchParams)
    if(request.method()==='GET'&&value!==undefined)return route.fulfill({json:value})
    if(pathname==='/api/v1/conversations/whatsapp/status')return route.fulfill({json:{status:'connected'}})
    if(pathname==='/api/v1/conversations/visual-conversation/read')return route.fulfill({json:{ok:true}})
    // CRM writes are deliberately refused; Personal CRUD is verified by verify-personal.cjs.
    if(!['GET','HEAD'].includes(request.method())&&!pathname.startsWith('/api/v1/personal/')&&!pathname.startsWith('/api/v1/prospecting/'))return route.fulfill({status:503,json:{error:'Gravações comerciais desativadas nesta prévia visual.'}})
    return route.continue()
  })
  async function settle() { await page.locator('.workspace-header,.login-form').first().waitFor();await page.locator('[aria-busy=true]').first().waitFor({state:'hidden',timeout:10000}).catch(()=>{});await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(180) }
  async function open(view,extra='') { await page.goto(base+'/?'+(view.startsWith('personal-')?'space=personal&':'')+'view='+view+extra);await settle() }
  async function capture(name) {
    await page.evaluate(()=>scrollTo(0,0));const audit=await page.evaluate(inspect);results.push({name,...audit});await page.screenshot({path:path.join(output,name+'.png'),fullPage:await page.getByRole('dialog').count()===0});fs.writeFileSync(path.join(output,'progress.json'),JSON.stringify(results,null,2))
  }
  async function closeModal() { await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'}) }
  async function dialog(button,name) { await button.click();await page.getByRole('dialog').waitFor();await capture(name);await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.querySelector('[role=dialog]').contains(document.activeElement)),true);await closeModal();await page.waitForFunction(element=>element===document.activeElement,await button.elementHandle(),{timeout:1500}) }
  try {
    for(const viewport of [{width:1440,height:1000},{width:390,height:844}]) {
      await page.setViewportSize(viewport);const device=viewport.width===390?'mobile':'desktop'
      for(const view of views) { await open(view);await capture(view+'-'+device) }
      await open('clients','&record='+fixtures.client.id);await page.getByRole('heading',{name:fixtures.client.name,exact:true}).waitFor();await capture('client-detail-'+device)
      await dialog(page.getByRole('button',{name:'Contrato',exact:true}),'contract-modal-'+device)
      await open('finance','&record='+fixtures.client.id);await page.getByRole('button',{name:'Extrato / imprimir'}).waitFor();await capture('finance-detail-'+device)
      await dialog(page.getByRole('button',{name:'Extrato / imprimir'}),'statement-'+device)
      await page.getByRole('tab',{name:'Gastos',exact:true}).click();await page.getByText('Ferramenta de design',{exact:true}).waitFor();await capture('expenses-'+device)
      await dialog(page.getByRole('button',{name:'Registrar gasto',exact:true}).first(),'expense-modal-'+device)
      await open('inbox');await page.getByRole('button',{name:new RegExp('Estúdio Aurora')}).click();await page.getByText('Olá! Podemos revisar a proposta do novo site?',{exact:true}).waitFor();await capture('messages-'+device)
      const draft='Mensagem sintética não enviada';await page.getByLabel('Mensagem',{exact:true}).fill(draft);assert.equal(await page.getByLabel('Mensagem',{exact:true}).inputValue(),draft)
      if(device==='mobile') {const composer=await page.locator('.message-composer').boundingBox(),rail=await page.locator('.quick-rail').boundingBox();assert.ok(composer.y+composer.height<rail.y,'Message composer must remain above quick actions')}
      await open('agenda');if(device==='mobile')assert.equal(await page.locator('.calendar-panel').evaluate(element=>element.scrollWidth<=element.clientWidth),true,'Full calendar including toolbar fits mobile');await dialog(page.getByRole('button',{name:'Novo compromisso',exact:true}),'appointment-modal-'+device)
      await open('deliveries');await dialog(page.getByRole('button',{name:'Nova tarefa',exact:true}),'task-modal-'+device)
      await open('pipeline');await dialog(page.getByRole('button',{name:'Nova oportunidade',exact:true}),'opportunity-modal-'+device)
      await open('overview');await dialog(page.getByRole('button',{name:'Novo contato',exact:true}).first(),'contact-modal-'+device)
      await dialog(page.getByRole('button',{name:'Abrir notificações'}),'notifications-'+device)
      await dialog(page.getByRole('button',{name:'Exportar dados'}),'export-'+device)
      await page.getByRole('button',{name:'Busca global'}).click();await page.getByRole('dialog').getByLabel('Busca global',{exact:true}).fill('Aurora');await page.getByRole('button',{name:new RegExp('Estúdio Aurora')}).waitFor();await capture('search-'+device);await closeModal()
      await open('personal-projects');await dialog(page.getByRole('button',{name:'Novo projeto',exact:true}),'project-modal-'+device)
      const projects=await (await page.request.get(base+'/api/v1/personal/projects')).json()
      if(projects.length) { await open('personal-projects','&record='+projects[0].id);await page.getByRole('button',{name:'Adicionar marco'}).waitFor();await capture('project-detail-'+device) }
      await open('personal-finance');await dialog(page.getByRole('button',{name:'Novo ciclo',exact:true}),'invoice-modal-'+device)
      await open('personal-subscriptions');await dialog(page.getByRole('button',{name:'Nova conta',exact:true}),'subscription-modal-'+device)
      await open('personal-prices');await dialog(page.getByRole('button',{name:'Acompanhar produto',exact:true}).first(),'price-modal-'+device)
      await dialog(page.getByRole('button',{name:'Abrir notificações'}),'personal-notifications-'+device)
      mode='login';await page.goto(base+'/login');await settle();await capture('login-'+device);assert.equal(await page.getByLabel('Senha',{exact:true}).getAttribute('type'),'password');mode='populated'
    }
    await page.setViewportSize({width:390,height:844})
    for(const state of ['loading','empty','error']) {mode=state;await page.goto(base+'/?view=deliveries');if(state==='loading')await page.getByText('Carregando seus dados…',{exact:true}).waitFor();else await settle();await capture('tasks-'+state)}
    mode='populated';await page.getByRole('button',{name:'Tentar novamente'}).click();await page.getByText('Revisar conteúdo e estrutura',{exact:true}).waitFor();checks.push('error retry restores populated board')
    for(const width of [320,768]) { await page.setViewportSize({width,height:900});for(const view of views) {await open(view);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,view+' overflows at '+width)} }checks.push('17 routes reflow at 320px and 768px')
    await page.setViewportSize({width:1440,height:1000});await open('finance','&record='+fixtures.client.id);await page.getByRole('button',{name:'Extrato / imprimir'}).click();await page.emulateMedia({media:'print'});assert.equal(await page.locator('.statement').evaluate(element=>getComputedStyle(element).backgroundColor),'rgb(255, 255, 255)');assert.deepEqual((await page.evaluate(inspect)).contrast,[],'Printed statement contrast');await page.screenshot({path:path.join(output,'statement-print.png'),fullPage:true});await page.emulateMedia({media:'screen'});await closeModal();checks.push('statement dark on screen, light on paper')
    await open('reports');const date=page.getByLabel('Início do período');await date.focus();await page.keyboard.press('ArrowLeft');await page.keyboard.press('Escape');assert.equal(await date.inputValue()!== '',true)
    await open('deliveries');const select=page.getByLabel('Filtrar por contrato');await select.selectOption({index:1});await select.focus();await page.keyboard.press('Alt+ArrowDown');await page.screenshot({path:path.join(output,'native-select-open.png')});await page.keyboard.press('Escape');checks.push('native date and select keyboard; dark color-scheme')
    await open('overview');await page.keyboard.press('Tab');const focusButton=page.getByRole('button',{name:'Visão geral',exact:true});await focusButton.focus();assert.equal(await focusButton.evaluate(element=>getComputedStyle(element).outlineColor),'rgb(244, 210, 47)');await page.screenshot({path:path.join(output,'keyboard-focus.png')});checks.push('reduced motion and yellow keyboard focus')
    assert.equal(await page.locator('meta[name=theme-color]').getAttribute('content'),'#141719')
    const manifest=await (await page.request.get(base+'/manifest.webmanifest')).json();assert.equal(manifest.theme_color,'#141719');assert.equal(manifest.background_color,'#141719');checks.push('PWA metadata and manifest match dark canvas')
    await page.emulateMedia({colorScheme:'light'});assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).colorScheme),'dark');checks.push('dark remains default under system light preference')
    await page.emulateMedia({forcedColors:'active'});assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).scrollbarColor),'auto');await page.screenshot({path:path.join(output,'forced-colors.png')});await page.emulateMedia({forcedColors:'none'})
    assert.deepEqual(errors,[],'No page exceptions')
    const failures=results.filter(result=>result.scheme!=='dark'||result.background!=='rgb(20, 23, 25)'||result.overflow||result.lightSurfaces.length||result.contrast.length||result.unnamedButtons.length)
    fs.writeFileSync(path.join(output,'dark-mode-verification.json'),JSON.stringify({synthetic:true,viewports:['1440x1000','390x844'],pages:views.length+1,results,checks,pageErrors:errors,failures:failures.map(item=>item.name)},null,2))
    console.log(JSON.stringify({captures:results.length,checks,failures:failures.map(({name,overflow,lightSurfaces,contrast,unnamedButtons})=>({name,overflow,lightSurfaces,contrast,unnamedButtons})),output}))
    assert.equal(failures.length,0,'Dark mode, contrast, reflow and accessible buttons must pass')
  } catch(error) {
    await page.screenshot({path:path.join(output,'failure.png'),fullPage:true}).catch(()=>{})
    console.error(JSON.stringify({url:page.url(),body:(await page.locator('body').innerText().catch(()=>'' )).slice(0,1800),errors}))
    throw error
  } finally { await context.close();await browser.close() }
})().catch(error=>{console.error(error);process.exitCode=1})
