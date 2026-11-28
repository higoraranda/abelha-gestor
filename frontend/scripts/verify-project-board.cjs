// Browser contract for the compiled Personal dashboard using synthetic loopback requests.
const assert = require('node:assert/strict')
const http = require('node:http')
const fs = require('node:fs/promises')
const path = require('node:path')
const { chromium } = require(process.env.ABELHA_PLAYWRIGHT_MODULE || 'playwright')
const root = path.resolve(__dirname, '../dist')
const output = path.resolve(process.env.ABELHA_BOARD_OUTPUT || path.resolve(__dirname, '../../.abelha-homologacao/project-board'))
const mime = { '.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.webmanifest':'application/manifest+json' }

async function horizontal(board, columnSelector) {
  const geometry = await board.evaluate((element, columns) => {
    const rects = [...element.querySelectorAll(columns)].map(column => column.getBoundingClientRect().toJSON())
    const scrollWidth = element.scrollWidth
    const clientWidth = element.clientWidth
    const viewport = innerWidth
    const documentWidth = document.documentElement.scrollWidth
    const container = [element.clientWidth, element.scrollWidth, getComputedStyle(element).overflowX, getComputedStyle(element).display]
    if (documentWidth > viewport) {
      for (let parent = element; parent; parent = parent.parentElement) container.push([parent.className, parent.clientWidth, parent.scrollWidth])
      const visible = element.style.display
      element.style.display = 'none'
      container.push(['without board', document.documentElement.scrollWidth])
      element.style.display = visible
    }
    element.scrollLeft = scrollWidth
    return { rects, scrollWidth, clientWidth, scrollLeft: element.scrollLeft, viewport, documentWidth, container }
  }, columnSelector)
  assert.equal(geometry.documentWidth, geometry.viewport, 'horizontal overflow belongs to the board ' + JSON.stringify(geometry.container))
  assert.ok(geometry.rects.every(column => column.top === geometry.rects[0].top), 'columns must remain on one horizontal row')
  assert.ok(geometry.rects.every(column => column.width === geometry.rects[0].width), 'columns have equal widths')
  assert.ok(geometry.rects.every((column, index) => index === 0 || column.left > geometry.rects[index - 1].left))
  if (geometry.scrollWidth > geometry.clientWidth) assert.ok(geometry.scrollLeft > 0, 'additional columns must be reachable by scrolling')
  await board.evaluate(element => { element.scrollLeft = 0 })
}

async function swipeBoard(page, board) {
  await board.scrollIntoViewIfNeeded()
  const rect = await board.boundingBox()
  const x = Math.floor(rect.x + rect.width - 24)
  const y = Math.floor(rect.y + 25)
  const input = await page.context().newCDPSession(page)
  try {
    await input.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
    for (let distance = 30; distance <= 150; distance += 30) {
      await input.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - distance, y }] })
    }
    await input.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    assert.ok(await board.evaluate(element => element.scrollLeft > 20), 'touch swipe scrolls the board')
  } finally { await input.detach() }
}

async function main() {
  await fs.mkdir(output, { recursive: true })
  const server = http.createServer(async (req,res) => {
    const p = new URL(req.url, 'http://127.0.0.1').pathname
    const file = path.resolve(root, '.'+(p==='/' ? '/index.html' : p))
    if (!file.startsWith(root+path.sep)) return res.writeHead(403).end()
    try { const body = await fs.readFile(file); res.writeHead(200, {'Content-Type': mime[path.extname(file)] || 'application/octet-stream'}).end(body) }
    catch { res.writeHead(404).end() }
  })
  let browser, port
  try {
    await new Promise(resolve => server.listen(0,'127.0.0.1',resolve))
    port=server.address().port
    const origin = 'http://127.0.0.1:'+port
    browser = await chromium.launch({headless:true,...(process.env.ABELHA_BROWSER_EXECUTABLE ? {executablePath: process.env.ABELHA_BROWSER_EXECUTABLE} : {})})
    for (const width of [320,390,768,1024,1440,1920]) {
      const page = await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce',hasTouch:width<=390,isMobile:width<=390})
      const testProject={id:'30000000-0000-4000-8000-000000000001',name:'Site do Estúdio Aurora',status:'paused',pipeline_stage:null,pipeline_links:{},latest_update_kind:'github',next_step:'Revisar a identidade visual',description:'Nova presença digital',blockers:'Aguardando materiais',updated_at:'2026-11-25T00:00:00Z',milestone_count:2,completed_count:1,current_milestone:'Entrega'}
      const projectSamples = [
        ['1', 'Organizar catálogo', 'backlog'], ['2', 'Portal institucional', 'planning'],
        ['3', 'Automação de atendimento', 'development'], ['4', 'Landing de lançamento', 'testing'],
        ['5', 'Integração de agenda', 'development'],
      ].map(([id, name, pipeline_stage]) => ({ ...testProject, id, name, status: 'active', pipeline_stage, blockers: '', next_step: '' }))
      const contract = { id: 'contract-fixture', client_id: 'client-fixture', service_name: 'Site institucional', client_name: 'Estúdio Aurora', status: 'active' }
      const taskFixture = { contract_id: contract.id, client_id: contract.client_id, client_name: contract.client_name, service_name: contract.service_name, description: 'Revisar as páginas com o cliente.', due_date: '2026-12-06', previous_status: null }
      const taskSamples = [
        { ...taskFixture, id: 'task-01', title: 'Validar identidade visual', status: 'todo', contract_id: null, project_id: testProject.id, priority: 'high', blocked: true },
        { ...taskFixture, id: 'task-02', title: 'Desenhar a página inicial', status: 'in_progress' },
        { ...taskFixture, id: 'task-03', title: 'Reunir materiais', status: 'todo', contract_id: null, project_id: testProject.id, parent_id: 'task-01' },
        ...Array.from({ length: 8 }, (_, index) => ({ ...taskFixture, id: 'task-dense-' + index, title: 'Etapa de conteúdo ' + (index + 1), status: 'done' })),
      ]
      const patches=[]
      const taskPatches = []
      const taskCreates = []
      try {
        await page.route('**/*', async route => {
          const req=route.request(), url=new URL(req.url())
          if(url.origin!==origin)return route.abort()
          if(url.pathname==='/api/v1/health')return route.fulfill({json:{status:'ok'}})
          if(url.pathname==='/api/auth/session')return route.fulfill({json:{user:{id:'test-user',organizationId:'test-org',name:'Teste',email:'test@example.invalid',role:'owner'}}})
          if(url.pathname==='/api/v1/personal/projects')return route.fulfill({json:[testProject,...projectSamples]})
          if(url.pathname==='/api/v1/personal/projects/'+testProject.id+'/pipeline'){
            if(req.method()==='PATCH'){
              const body=req.postDataJSON()
              patches.push(body)
              if(body.stage==='completed')return route.fulfill({status:400,json:{error:'Conclua os marcos revisados antes de finalizar o projeto.'}})
              testProject.pipeline_stage=body.stage
              return route.fulfill({json:testProject})
            }
          }
          if(url.pathname==='/api/v1/personal/projects/'+testProject.id) return route.fulfill({json:{project:testProject,updates:[],milestones:[{id:'m1',title:'Concluir catálogo',acceptance:'Conferir listagem',completed_at:null}]}})
          if(url.pathname==='/api/v1/crm/contracts') return route.fulfill({json:[contract]})
          if(url.pathname==='/api/v1/crm/tasks') {
            if(req.method()==='POST'){
              const form = req.postDataJSON()
              taskCreates.push(form)
              const task={...taskFixture,...form,id:'task-new-'+taskCreates.length,status:'todo',contract_id:form.project_id ? null : form.contract_id}
              taskSamples.push(task)
              return route.fulfill({status:201,json:task})
            }
            const projectId = url.searchParams.get('projectId')
            const matchingTasks = projectId ? taskSamples.filter(task => task.project_id === projectId) : taskSamples
            return route.fulfill({json:{items:matchingTasks,total:matchingTasks.length}})
          }
          if(url.pathname==='/api/v1/crm/tasks/task-01' && req.method()==='PATCH'){
            const patch=req.postDataJSON()
            taskPatches.push(patch)
            if(taskPatches.length===1)return route.fulfill({status:409,json:{error:'A tarefa aguarda uma dependência.'}})
            Object.assign(taskSamples[0],patch)
            return route.fulfill({json:taskSamples[0]})
          }
          if(url.pathname==='/api/v1/crm/tasks/task-03' && req.method()==='PATCH'){
            Object.assign(taskSamples[2],req.postDataJSON())
            return route.fulfill({json:taskSamples[2]})
          }
          if(url.pathname==='/api/events')return route.fulfill({contentType:'text/event-stream',body:': synthetic\n\n'})
          if(url.pathname.startsWith('/api/'))return route.fulfill({json:[]})
          return route.continue()
        })
        await page.goto(origin+'/?space=personal&view=personal-projects')
        const board=page.getByRole('region',{name:'Quadro de projetos'}), card=board.getByRole('article').filter({hasText:testProject.name})
        await card.waitFor()
        assert.equal(await board.locator('[data-stage]').count(),9)
        await horizontal(board.locator('.project-board-columns'), '[data-stage]')
        assert.equal(await card.getByText('Revisar a identidade visual').count(),1)
        assert.equal(await card.getByText('Aguardando materiais').count(),1)
        assert.equal(await card.getByText('Pausado').count(),1)
        if ([390,1440].includes(width)) {
          await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller))
          await page.screenshot({path:path.join(output,'projetos-'+width+'.png'),fullPage:true})
        }
        if(width===390) await swipeBoard(page,board.locator('.project-board-columns'))
        await board.getByRole('searchbox',{name:'Buscar projeto'}).fill('não encontrado')
        await board.getByText('Nenhum projeto corresponde aos filtros.').waitFor()
        await board.getByRole('searchbox',{name:'Buscar projeto'}).fill('estudio')
        await card.waitFor()
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth===innerWidth),true)
        assert.equal(await card.getByText('1/2 marcos').count(),1)
        await card.getByRole('combobox',{name:'Mover '+testProject.name+' para'}).selectOption('completed')
        await card.getByRole('button',{name:'Mover '+testProject.name}).press('Enter')
        await board.getByRole('alert').getByText(/Conclua os marcos/).waitFor()
        assert.equal(await board.locator('[data-stage=unassigned]').getByRole('article').count(),1)
        if(width===1440){
          await card.dragTo(board.locator('[data-stage=development]'))
          await board.locator('[data-stage=development]').getByRole('article').waitFor()
        } else {
          await card.getByRole('combobox',{name:'Mover '+testProject.name+' para'}).selectOption('development')
          await card.getByRole('button',{name:'Mover '+testProject.name}).press('Enter')
          await board.locator('[data-stage=development]').getByRole('article').waitFor()
        }
        assert.deepEqual(patches,[{stage:'completed',expected_stage:null},{stage:'development',expected_stage:null}])
        await card.getByRole('button',{name:testProject.name,exact:true}).click()
        await page.getByRole('heading',{name:testProject.name,exact:true}).waitFor()
        await page.getByRole('heading',{name:'Roadmap'}).waitFor()
        assert.equal(await page.getByRole('link',{name:'Abrir produção'}).count(),0)
        assert.equal(await page.getByText('Checklist de atividades dos marcos').count(),1)
        await page.goto(origin+'/?space=crm&view=deliveries')
        const taskBoard = page.getByRole('region',{name:'Quadro de tarefas'})
        const task = taskBoard.getByRole('article').filter({hasText:taskSamples[0].title})
        await task.waitFor()
        await horizontal(taskBoard, '.board-column')
        const dense = taskBoard.getByRole('region', { name: 'Concluído' }).locator('.kanban-cards')
        assert.ok(await dense.evaluate(el => el.scrollHeight > el.clientHeight), 'a dense column scrolls vertically')
        assert.equal(await task.getByText('Prioridade alta').count(),1)
        assert.equal(await task.getByText('Bloqueada').count(),1)
        if ([390,1440].includes(width)) await page.screenshot({path:path.join(output,'tarefas-'+width+'.png'),fullPage:true})
        if(width===390) await swipeBoard(page,taskBoard)
        const moveTask = task.getByRole('combobox', { name: 'Situação de '+taskSamples[0].title })
        await moveTask.selectOption('in_progress')
        await page.getByRole('alert').getByText('A tarefa aguarda uma dependência.').waitFor()
        assert.equal(await moveTask.inputValue(),'todo')
        if (width===1440) await task.dragTo(taskBoard.getByRole('region',{name:'Em andamento'}))
        else await moveTask.selectOption('in_progress')
        await taskBoard.getByRole('region',{name:'Em andamento'}).getByText(taskSamples[0].title).waitFor()
        assert.deepEqual(taskPatches,[{status:'in_progress'},{status:'in_progress'}])
        await task.getByRole('button',{name:taskSamples[0].title}).click()
        const editor=page.getByRole('dialog',{name:'Detalhes da tarefa'})
        await editor.getByText(contract.service_name).waitFor()
        assert.equal(await editor.getByLabel('Contrato').count(),0)
        const subtask = editor.getByRole('checkbox',{name:'Reunir materiais'})
        await subtask.click()
        await editor.getByRole('checkbox',{name:'Reunir materiais',checked:true}).waitFor()
        await editor.getByRole('button',{name:'Cancelar'}).click()
        await page.getByRole('button',{name:'Nova tarefa'}).click()
        const creator = page.getByRole('dialog',{name:'Nova tarefa'})
        await creator.getByLabel('Tarefa',{exact:true}).fill('Preparar guia editorial')
        assert.equal(await creator.getByLabel('Contrato',{exact:true}).inputValue(),contract.id)
        await creator.getByRole('button',{name:'Salvar tarefa'}).click()
        await taskBoard.getByRole('region',{name:'A fazer'}).getByText('Preparar guia editorial').waitFor()
        if (width===390) {
          await page.goto(origin+'/?view=deliveries&project='+testProject.id)
          await page.getByRole('heading',{name:'Entregas do projeto'}).waitFor()
          await task.waitFor()
          assert.equal(await taskBoard.getByText('Desenhar a página inicial').count(),0)
          await page.getByRole('button',{name:'Nova tarefa'}).click()
          await creator.getByLabel('Tarefa',{exact:true}).fill('Revisar catálogo')
          assert.equal(await creator.getByLabel('Contrato').count(),0)
          await creator.getByRole('button',{name:'Salvar tarefa'}).click()
          await taskBoard.getByRole('region',{name:'A fazer'}).getByText('Revisar catálogo').waitFor()
          assert.equal(taskCreates.at(-1).project_id,testProject.id)
          assert.equal(taskCreates.at(-1).contract_id,undefined)
        }
        console.log('PASS: '+width+'px · boards horizontais, persistência, falhas e detalhes')
      } finally { await page.close() }
    }
  } finally {
    await browser?.close()
    server.closeAllConnections()
    await new Promise(resolve=>server.close(resolve))
    console.log('Chromium e servidor de teste encerrados. Porta:',port)
  }
}
main().catch(error=>{console.error(error);process.exitCode=1})
