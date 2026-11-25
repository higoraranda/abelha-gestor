// Browser contract for the compiled Personal dashboard using synthetic loopback requests.
const assert = require('node:assert/strict')
const http = require('node:http')
const fs = require('node:fs/promises')
const path = require('node:path')
const { chromium } = require(process.env.ABELHA_PLAYWRIGHT_MODULE || 'playwright')
const root = path.resolve(__dirname, '../dist')
const mime = { '.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2' }

async function main() {
  const server = http.createServer(async (req,res) => {
    const p = new URL(req.url, 'http://127.0.0.1').pathname
    const file = path.resolve(root, '.'+(p==='/' ? '/index.html' : p))
    if (!file.startsWith(root+path.sep)) return res.writeHead(403).end()
    try { const body = await fs.readFile(file); res.writeHead(200, {'Content-Type': mime[path.extname(file)] || 'application/octet-stream'}).end(body) }
    catch { res.writeHead(404).end() }
  })
  let browser
  try {
    await new Promise(resolve => server.listen(0,'127.0.0.1',resolve))
    const origin = 'http://127.0.0.1:'+server.address().port
    browser = await chromium.launch({headless:true,...(process.env.ABELHA_BROWSER_EXECUTABLE ? {executablePath: process.env.ABELHA_BROWSER_EXECUTABLE} : {})})
    for (const width of [390,1440]) {
      const page = await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce',serviceWorkers:'block'})
      const testProject={id:'30000000-0000-4000-8000-000000000001',name:'Projeto sintético',status:'paused',pipeline_stage:null,pipeline_links:{},latest_update_kind:'github',next_step:'Revisar',description:'Cliente de demonstração',blockers:'',updated_at:'2026-11-25T00:00:00Z',milestone_count:2,completed_count:1,current_milestone:'Entrega'}
      const patches=[]
      try {
        await page.route('**/*', async route => {
          const req=route.request(), url=new URL(req.url())
          if(url.origin!==origin)return route.abort()
          if(url.pathname==='/api/v1/health')return route.fulfill({json:{status:'ok'}})
          if(url.pathname==='/api/auth/session')return route.fulfill({json:{user:{id:'test-user',organizationId:'test-org',name:'Teste',email:'test@example.invalid',role:'owner'}}})
          if(url.pathname==='/api/v1/personal/projects')return route.fulfill({json:[testProject]})
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
          if(url.pathname==='/api/events')return route.fulfill({contentType:'text/event-stream',body:': synthetic\n\n'})
          if(url.pathname.startsWith('/api/'))return route.fulfill({json:[]})
          return route.continue()
        })
        await page.goto(origin+'/?space=personal&view=personal-projects')
        const board=page.getByRole('region',{name:'Quadro de projetos'}), card=board.getByRole('article')
        await card.waitFor()
        assert.equal(await board.locator('[data-stage]').count(),9)
        assert.equal(await card.getByText('Automática · GitHub').count(),1)
        assert.equal(await card.getByText('Pausado').count(),1)
        await board.getByRole('searchbox',{name:'Buscar projeto'}).fill('não encontrado')
        await board.getByText('Nenhum projeto corresponde aos filtros.').waitFor()
        await board.getByRole('searchbox',{name:'Buscar projeto'}).fill('sintetico')
        await card.waitFor()
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth===innerWidth),true)
        assert.equal(await card.getByText('1/2 marcos').count(),1)
        await card.getByRole('combobox',{name:'Mover Projeto sintético para'}).selectOption('completed')
        await card.getByRole('button',{name:'Mover Projeto sintético'}).press('Enter')
        await board.getByRole('alert').getByText(/Conclua os marcos/).waitFor()
        assert.equal(await board.locator('[data-stage=unassigned]').getByRole('article').count(),1)
        if(width===1440){
          await card.dragTo(board.locator('[data-stage=development]'))
          await board.locator('[data-stage=development]').getByRole('article').waitFor()
        } else {
          await card.getByRole('combobox',{name:'Mover Projeto sintético para'}).selectOption('development')
          await card.getByRole('button',{name:'Mover Projeto sintético'}).press('Enter')
          await board.locator('[data-stage=development]').getByRole('article').waitFor()
        }
        assert.deepEqual(patches,[{stage:'completed',expected_stage:null},{stage:'development',expected_stage:null}])
        await card.getByRole('button',{name:'Projeto sintético',exact:true}).click()
        await page.getByRole('heading',{name:'Projeto sintético',exact:true}).waitFor()
        await page.getByRole('heading',{name:'Roadmap'}).waitFor()
        assert.equal(await page.getByRole('link',{name:'Abrir produção'}).count(),0)
        assert.equal(await page.getByText('Checklist de atividades dos marcos').count(),1)
        console.log('PASS: '+width+'px · board, approval gate, movement and project details')
      } finally { await page.close() }
    }
  } finally {
    await browser?.close()
    server.closeAllConnections()
    await new Promise(resolve=>server.close(resolve))
  }
}
main().catch(error=>{console.error(error);process.exitCode=1})
