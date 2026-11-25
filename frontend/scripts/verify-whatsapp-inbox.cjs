// Synthetic loopback test. No connection to the real provider or message delivery.
const assert=require('node:assert/strict')
const {createServer}=require('node:http')
const {readFile}=require('node:fs/promises')
const {resolve,extname,sep}=require('node:path')
const {chromium}=require(process.env.ABELHA_PLAYWRIGHT_MODULE||'playwright')
const fixture=require('./dark-mode-fixtures.cjs')
const dist=resolve(__dirname,'../dist')
const qr='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9tAAAAAASUVORK5CYII='
const mime={'.html':'text/html','.css':'text/css','.js':'application/javascript','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'}
const conversation={id:'synthetic-conversation',whatsappChatId:'5500012345678@s.whatsapp.net',unreadCount:0,client:{name:'Cliente sintético'}}
const message={id:'synthetic-message',direction:'out',content:'Mensagem sintética',createdAt:'2026-11-25T10:00:00Z'}
let status='disconnected', calls=0, sent=[]
const json=(res,value,status=200)=>res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'}).end(JSON.stringify(value))
const server=createServer(async(req,res)=>{
  const url=new URL(req.url,'http://127.0.0.1'),p=url.pathname
  if(p==='/api/v1/health')return json(res,{status:'ok'})
  if(p==='/api/auth/session')return json(res,{user:{id:'synthetic-owner',organizationId:'synthetic-organization',email:'synthetic@example.invalid',role:'owner'}})
  if(p==='/api/v1/conversations/whatsapp/status')return json(res,{status})
  if(p==='/api/v1/conversations/whatsapp/pair'){
    assert.equal(req.method,'POST')
    calls++
    return json(res,{status:'connecting',qr})
  }
  if(p==='/api/v1/conversations')return json(res,[conversation])
  if(p.endsWith('/read')&&req.method==='POST')return res.writeHead(204).end()
  if(p==='/api/v1/conversations/'+conversation.id)return json(res,{...conversation,messages:sent})
  if(p==='/api/v1/messages'){
    const body=[];for await(const part of req)body.push(part)
    const data=JSON.parse(Buffer.concat(body))
    if(data.content!==message.content)return json(res,{error:'Somente fixture sintética'},400)
    sent.push(message)
    return json(res,message,201)
  }
  if(p.startsWith('/api/'))return json(res,fixture.response(p,url.searchParams)??[])
  const file=resolve(dist,extname(p)?'.'+p:'index.html')
  if(!file.startsWith(dist+sep))return res.writeHead(404).end()
  try{const bytes=await readFile(file);res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream'}).end(bytes)}
  catch{res.writeHead(404).end()}
})
;(async()=>{
  let browser
  try{
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
    const base='http://127.0.0.1:'+server.address().port
    browser=await chromium.launch({headless:true,...(process.env.ABELHA_BROWSER_EXECUTABLE?{executablePath:process.env.ABELHA_BROWSER_EXECUTABLE}:{})})
    for(const width of [390,1440]){
      const context=await browser.newContext({viewport:{width,height:870},serviceWorkers:'block',reducedMotion:'reduce'})
      try{
        status='disconnected';calls=0;sent=[]
        await context.route('**/*',route=>route.request().url().startsWith(base+'/')?route.continue():route.abort())
        const page=await context.newPage()
        await page.goto(base+'/?view=inbox')
        const connection=page.getByRole('region',{name:'Conexão do WhatsApp'})
        await connection.getByText('Desconectado',{exact:true}).waitFor()
        assert.equal(calls,0,'never pair merely by opening the inbox')
        await connection.getByRole('button',{name:'Conectar WhatsApp'}).click()
        await connection.getByRole('img',{name:/QR code para conectar/}).waitFor()
        assert.equal(calls,1)
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
        status='connected'
        await connection.getByText('Conectado',{exact:true}).waitFor()
        assert.equal(await connection.getByRole('img',{name:/QR code para conectar/}).count(),0)
        await page.getByRole('button',{name:/Cliente sintético/}).click()
        await page.getByRole('textbox',{name:'Mensagem'}).fill(message.content)
        await page.getByRole('button',{name:'Enviar mensagem',exact:true}).click()
        await page.getByText(message.content,{exact:true}).waitFor()
        assert.equal(sent.length,1)
        console.log('PASS Conversas/WhatsApp sintético: '+width+'px')
      }finally{await context.close()}
    }
  }finally{if(browser)await browser.close();server.closeAllConnections();server.close()}
})().catch(error=>{console.error(error);process.exitCode=1})
