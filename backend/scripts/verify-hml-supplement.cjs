const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
async function main(){
 const h=await require('./hml-runtime.cjs').start(),scenarios=[],receipt={version:1,tag:h.tag,environment:'Frontend/backend reais → Neon HML',runtime:{pid:process.pid,port:Number(new URL(h.origin).port)},scenarios};let browser;
 receipt.execution=h.codeBinding;
 try{
   const {chromium}=require(process.env.ABELHA_PLAYWRIGHT_MODULE||'C:/Users/higor aranda/Documents/Programações/SAAS/FORGE/node_modules/playwright');
   browser=await chromium.launch({headless:true,executablePath:process.env.ABELHA_BROWSER_EXECUTABLE||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
   const ctx=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'allow',reducedMotion:'reduce'}),page=await ctx.newPage();page.setDefaultTimeout(20000);
   let outage=true,expectedNetworkFailure=true;const errors=[],consoleErrors=[],requests=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('console',msg=>{if(msg.type()==='error'&&!expectedNetworkFailure)consoleErrors.push(msg.text())});
   await ctx.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin!==h.origin&&!['https://fonts.googleapis.com','https://fonts.gstatic.com'].includes(url.origin))return route.abort();if(outage&&url.pathname==='/api/v1/health')return route.fulfill({status:503,json:{error:'Indisponibilidade simulada'}});return route.continue();});
   page.on('request',r=>{if(r.url().startsWith(h.origin))requests.push({path:new URL(r.url()).pathname,method:r.method()})});
   await page.goto(h.origin+'/login',{waitUntil:'domcontentloaded'});await page.locator('.bee-loader').waitFor();assert.equal(await page.getByRole('button',{name:/Ativar.*voo|Pausar.*voo/i}).count(),0);
   outage=false;await page.getByRole('heading',{name:'Entre no Abelha'}).waitFor();expectedNetworkFailure=false;
   scenarios.push({name:'backend indisponível retorna ao login após restauração automática do health; sem botão manual de voo',status:'PASS'});
   await page.getByLabel('Email',{exact:true}).fill(h.ownerEmail);await page.getByLabel('Senha',{exact:true}).fill(h.password);await page.getByRole('button',{name:'Entrar',exact:true}).click();await page.locator('.workspace-header').waitFor();
   await page.evaluate(async()=>{await navigator.serviceWorker.register('/sw.js');await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(Error('PWA timeout')),15000))]);});
   await page.reload();await page.locator('.workspace-header').waitFor();
   const before=await page.evaluate(async()=>({controlled:!!navigator.serviceWorker.controller,paths:(await Promise.all((await caches.keys()).map(async name=>(await (await caches.open(name)).keys()).map(r=>new URL(r.url).pathname)))).flat()}));
   assert.ok(before.controlled);assert.ok(before.paths.includes('/'));assert.ok(before.paths.some(p=>p.endsWith('.js')));assert.ok(!before.paths.some(p=>p.startsWith('/api/')));
   expectedNetworkFailure=true;await ctx.setOffline(true);await page.reload({waitUntil:'domcontentloaded'});await page.getByText('Você está sem conexão. Vamos continuar assim que a internet voltar.',{exact:true}).waitFor();assert.equal(await page.locator('.workspace-header').count(),0);
   const screenshot=path.join(h.privateDir,h.tag+'-pwa-offline.png');await page.screenshot({path:screenshot,fullPage:true});
   await ctx.setOffline(false);await page.getByRole('heading',{name:/Bom ter você por aqui/}).waitFor({timeout:25000});expectedNetworkFailure=false;
   assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors,[]);
   receipt.pwa={cacheEntries:before.paths.length,apiCached:false,offlinePath:'/',screenshots:[screenshot],errors,consoleErrors};
   scenarios.push({name:'PWA: precache público, raiz offline sem dados privados e reconexão autenticada sem logout',status:'PASS'});
   await ctx.close();
   const anonymous=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'allow',reducedMotion:'reduce'}),p=await anonymous.newPage();
   try{
     await p.goto(h.origin+'/login');await p.getByRole('heading',{name:'Entre no Abelha'}).waitFor();
     await p.evaluate(async()=>{await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready});await p.reload();await p.getByRole('heading',{name:'Entre no Abelha'}).waitFor();
     await anonymous.setOffline(true);await p.goto(h.origin+'/',{waitUntil:'domcontentloaded'});await p.getByText('Você está sem conexão. Vamos continuar assim que a internet voltar.',{exact:true}).waitFor();
     await anonymous.setOffline(false);await p.reload();await p.getByRole('heading',{name:'Entre no Abelha'}).waitFor({timeout:35000});
     scenarios.push({name:'PWA anônimo: navegação raiz offline e reload online retorna ao login',status:'PASS'});
   }catch(error){receipt.anonymousPwaDiagnostic={url:p.url(),text:await p.locator('body').innerText()};await p.screenshot({path:path.join(h.privateDir,h.tag+'-anonymous-pwa-failure.png'),fullPage:true});throw error;}finally{await anonymous.close();}
   await browser.close();browser=null;
   await require('./hml-rate-cases.cjs')({h,scenarios});
 }catch(error){receipt.failure={message:error.message,stack:error.stack?.split('\n').slice(0,5)};process.exitCode=1;}
 finally{try{await browser?.close()}catch(error){receipt.closeError=error.message;process.exitCode=1;}finally{try{receipt.cleanup=await h.stop()}catch(error){receipt.cleanup={status:'FAIL',message:error.message};process.exitCode=1;}}fs.writeFileSync(path.join(h.privateDir,'supplement-031-result.json'),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));}
}
main().catch(e=>{console.error({message:e.message,code:e.code});process.exitCode=1});
