// Public build assets, synthetic HTTP on loopback. Never contacts deployed services.
const assert=require('node:assert/strict')
const {createServer}=require('node:http')
const {readFile,readdir}=require('node:fs/promises')
const path=require('node:path')
const {gzipSync}=require('node:zlib')
const {chromium}=require(process.env.ABELHA_PLAYWRIGHT_MODULE||'playwright')
const dist=path.resolve(__dirname,'../dist')
const type={'.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'}
const identity={id:'fixture-owner',organizationId:'fixture-org',name:'Teste',email:'test@example.invalid',role:'owner'}

async function main(){
  const names=await readdir(path.join(dist,'assets'))
  const owner=names.find(name=>/^AppPage-.+\.js$/.test(name))
  const projects=names.find(name=>/^PersonalProjects-.+\.js$/.test(name))
  const inbox=names.find(name=>/^InboxPage-.+\.js$/.test(name))
  assert.ok(owner&&projects&&inbox,'Expected separate workspace, project and inbox chunks')
  const worker=await readFile(path.join(dist,'sw.js'),'utf8')
  for(const name of names.filter(name=>/\.(js|css)$/.test(name)))assert.ok(worker.includes('/assets/'+name),'Public worker allowlist omitted '+name)
  const server=createServer(async(req,res)=>{
    const {pathname}=new URL(req.url,'http://127.0.0.1')
    const data=pathname==='/api/v1/health'?{status:'ok'}:pathname==='/api/auth/session'?{user:identity}:pathname.startsWith('/api/')?[]:null
    if(data)return res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify(data))
    const file=path.resolve(dist,pathname==='/'||pathname==='/login'?'index.html':'.'+pathname)
    if(!file.startsWith(dist+path.sep))return res.writeHead(403).end()
    try {
      const body=await readFile(file)
      res.writeHead(200,{'Content-Type':type[path.extname(file)]||'text/html'}).end(body)
    }catch{res.writeHead(404).end()}
  })
  let browser
  try{
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
    const base='http://127.0.0.1:'+server.address().port
    const sizes=new Map(await Promise.all(names.filter(name=>name.endsWith('.js')).map(async name=>{
      const buffer=await readFile(path.join(dist,'assets',name))
      return [name,{raw:buffer.length,gzip:gzipSync(buffer).length}]
    })))
    const bundleSize=batch=>Object.keys(batch).reduce((sum,name)=>{
      const size=sizes.get(name)
      return size?{raw:sum.raw+size.raw,gzip:sum.gzip+size.gzip}:sum
    },{raw:0,gzip:0})
    browser=await chromium.launch({headless:true,...(process.env.ABELHA_BROWSER_EXECUTABLE?{executablePath:process.env.ABELHA_BROWSER_EXECUTABLE}:{})})
    async function context(width,fail){
      const ctx=await browser.newContext({viewport:{width,height:850},serviceWorkers:'block',reducedMotion:'reduce'})
      const hits={}
      await ctx.route('**/*',route=>{
        const dest=new URL(route.request().url())
        if(dest.origin!==base)return route.abort()
        const name=path.basename(dest.pathname)
        if(sizes.has(name))hits[name]=(hits[name]||0)+1
        if(name===fail)return route.abort('failed')
        return route.continue()
      })
      const page=await ctx.newPage()
      page.setDefaultTimeout(12000)
      return {ctx,page,hits}
    }
    const login=await context(390),workspace=await context(1440),failed=await context(390,projects)
    try{
      await login.page.goto(base+'/login')
      await login.page.locator('.login-form').waitFor()
      assert.equal(login.hits[owner],undefined)
      assert.equal(login.hits[projects],undefined)
      assert.equal(login.hits[inbox],undefined)
      const loginSize=bundleSize(login.hits)
      assert.ok(loginSize.raw<350000,'Unexpected JS in anonymous login: '+loginSize.raw)
      await workspace.page.goto(base+'/')
      await workspace.page.locator('.workspace-header').waitFor()
      await workspace.page.locator('.data-state[role=status]').first().waitFor({state:'hidden'})
      assert.equal(workspace.hits[owner],1)
      assert.equal(workspace.hits[projects],undefined)
      assert.equal(workspace.hits[inbox],undefined)
      const ownerSize=bundleSize(workspace.hits)
      await workspace.page.getByRole('button',{name:'Personal',exact:true}).click()
      await workspace.page.getByRole('button',{name:'Projetos',exact:true}).click()
      await workspace.page.getByRole('heading',{name:'Retome de onde parou.'}).waitFor()
      assert.equal(workspace.hits[projects],1)
      await failed.page.goto(base+'/?space=personal&view=personal-projects')
      await failed.page.getByText('Não foi possível abrir esta área do Abelha.',{exact:true}).waitFor()
      await failed.page.getByRole('button',{name:'Meu dia',exact:true}).click()
      assert.equal(await failed.page.getByText('Não foi possível abrir esta área do Abelha.',{exact:true}).count(),0)
      console.log(JSON.stringify({login:loginSize,ownerOverview:ownerSize,ownerAfterProjects:bundleSize(workspace.hits),javascriptFiles:sizes.size,offlineStaticAssets:names.length,routeFailureKeepsSidebar:true}))
    }finally{
      await Promise.all([login.ctx.close(),workspace.ctx.close(),failed.ctx.close()])
    }
  }finally{
    await browser?.close()
    server.closeAllConnections()
    await new Promise(resolve=>server.close(resolve))
  }
}
main().catch(error=>{console.error(error);process.exitCode=1})
