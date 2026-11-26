const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
module.exports=async c=>{
 const {h,owner,A,B,off,disabled,revoked,call,actor,signIn,scenarios}=c;
 const {chromium}=require(process.env.ABELHA_PLAYWRIGHT_MODULE||'C:/Users/higor aranda/Documents/Programações/SAAS/FORGE/node_modules/playwright');
 const browser=await chromium.launch({headless:true,executablePath:process.env.ABELHA_BROWSER_EXECUTABLE||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const output=path.join(h.privateDir,h.tag+'-browser');fs.mkdirSync(output,{recursive:true});
 const errors=[],consoleErrors=[],network=[],screenshots=[];let injected=false;
 async function context(width){const ctx=await browser.newContext({viewport:{width,height:900},locale:'pt-BR',colorScheme:'dark',reducedMotion:'reduce',serviceWorkers:'allow'});
   await ctx.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin!==h.origin&&!['https://fonts.googleapis.com','https://fonts.gstatic.com'].includes(url.origin))return route.abort();if(injected&&url.pathname==='/api/v1/health')return route.fulfill({status:503,json:{error:'Indisponibilidade sintética'}});return route.continue();});return ctx;}
 async function pageFor(ctx){const page=await ctx.newPage();page.setDefaultTimeout(18000);page.on('pageerror',e=>errors.push(e.message));page.on('console',msg=>{if(msg.type()==='error'&&!injected)consoleErrors.push(msg.text())});page.on('response',r=>{if(r.url().startsWith(h.origin))network.push({path:new URL(r.url()).pathname,status:r.status()})});return page;}
 async function capture(page,name){const file=path.join(output,name+'.png');await page.screenshot({path:file,fullPage:true});screenshots.push(file);}
 async function layout(page){const state=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,scheme:getComputedStyle(document.documentElement).colorScheme,background:getComputedStyle(document.body).backgroundColor}));assert.equal(state.overflow,false,'Overflow horizontal: '+page.url());assert.ok(state.scheme.includes('dark'));return state;}
 async function login(page,email,password=h.password){await page.goto(h.origin+'/login');await page.getByRole('heading',{name:'Entre no Abelha'}).waitFor();await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Senha',{exact:true}).fill(password);await page.getByRole('button',{name:'Entrar',exact:true}).click();await page.locator('.workspace-header,.member-shell').first().waitFor();}
 async function jar(ctx,a){await ctx.addCookies([...a.cookies].map(([name,value])=>({name,value,url:h.origin,httpOnly:true,sameSite:'Lax'})));}
 try{
   for(const width of [1440,390]){
     const ctx=await context(width),page=await pageFor(ctx);
     try{
       await login(page,h.ownerEmail);await layout(page);await capture(page,'owner-dashboard-'+width);
       const paths=['/?view=clients','/?view=deliveries','/?view=pipeline','/?view=finance','/?view=agenda','/?view=inbox','/?view=reports','/?view=leads','/?view=quote-models','/?space=personal&view=personal-overview','/?space=personal&view=personal-finance','/?space=personal&view=personal-subscriptions','/?space=personal&view=personal-prices','/?space=personal&view=personal-settings','/?space=personal&view=personal-projects'];
       for(const route of paths){await page.goto(h.origin+route);await page.locator('.workspace-header').waitFor();await page.locator('[aria-busy=true]').first().waitFor({state:'hidden',timeout:10000}).catch(()=>{});await layout(page);}
       await page.getByRole('heading',{name:'Retome de onde parou.'}).waitFor();
       await page.locator('.project-board-move').filter({has:page.getByRole('button',{name:'Mover '+c.project.name,exact:true})}).locator('select').selectOption('testing');
       const [moved]=await Promise.all([page.waitForResponse(r=>r.url().endsWith('/'+c.project.id+'/pipeline')&&r.request().method()==='PATCH'),page.getByRole('button',{name:'Mover '+c.project.name,exact:true}).click()]);assert.equal(moved.status(),200);
       await page.reload();await page.locator('.workspace-header').waitFor();await page.locator('[data-stage=testing]').getByText(c.project.name,{exact:true}).waitFor();
       const [persisted]=await h.sql`select pipeline_stage from personal_projects where id=${c.project.id} and organization_id=${h.owner.organization_id}`;assert.equal(persisted.pipeline_stage,'testing');
       await capture(page,'kanban-'+width);await call(owner,'PATCH /api/v1/personal/projects/:id/pipeline',{stage:'development',expected_stage:'testing'},{id:c.project.id});
       scenarios.push({name:'desktop/mobile '+width+': login UI, dashboard, 15 URLs, dark mode, layout e Kanban UI→SQL→reload',status:'PASS'});
       // Real UI registration and simulated mail, distinct account for each viewport.
       const address=h.email('browser-'+width),invite=await call(owner,'POST /api/v1/account/invites',{email:address},{},201);
       await ctx.clearCookies();await page.goto(h.origin+'/cadastro#convite='+invite.token);
       await page.getByLabel('Nome',{exact:true}).fill('Browser '+width);await page.getByLabel('E-mail do convite').fill(address);await page.getByLabel('Senha',{exact:true}).fill(h.password);
       await page.getByRole('button',{name:'Enviar código',exact:true}).click();await page.locator('input[name=otp]').waitFor();
       const otp=h.mailbox.get(address)?.match(/(?:^|\n)(\d{6})(?:\n|$)/)?.[1];assert.ok(otp);await capture(page,'otp-'+width);await page.locator('input[name=otp]').fill(otp);await page.getByRole('button',{name:'Confirmar e criar conta'}).click();
       await page.getByText('Código validado. Conta criada com sucesso.',{exact:true}).waitFor();await capture(page,'verified-'+width);await page.getByRole('button',{name:'Entrar no Abelha'}).click();await page.locator('.member-shell').waitFor();
       await page.getByLabel('Nome do projeto',{exact:true}).fill('Projeto UI '+width);await page.getByRole('button',{name:'Criar projeto',exact:true}).click();await page.getByRole('heading',{name:'Projeto UI '+width}).waitFor();await page.reload();await page.getByRole('heading',{name:'Projeto UI '+width}).waitFor();await layout(page);
       const [member]=await h.sql`select id,organization_id from users where email=${address}`;assert.ok(member);
       await call(owner,'PATCH /api/v1/member-modules/members/:id',{projects:true,calculator:true,finance:true,subscriptions:true,prices:true},{id:member.id});
       for(const slug of ['projetos','calculadora','faturas','contas','precos']){await page.goto(h.origin+'/?member='+slug);await page.locator('.member-shell').waitFor();await page.locator('[aria-busy=true]').first().waitFor({state:'hidden',timeout:10000}).catch(()=>{});await layout(page);}
       await page.getByText('Personalizar meu espaço',{exact:true}).click();const [preferenceSaved]=await Promise.all([page.waitForResponse(r=>r.url().endsWith('/member-modules/me/preferences')&&r.request().method()==='PATCH'),page.getByRole('checkbox',{name:'Monitor de preços',exact:true}).click()]);assert.equal(preferenceSaved.status(),200);
       await page.reload();await page.getByText('Personalizar meu espaço',{exact:true}).click();assert.equal(await page.getByRole('checkbox',{name:'Monitor de preços',exact:true}).isChecked(),false);
       scenarios.push({name:width+': convite/OTP/sucesso/login/projeto persistido/onboarding/cinco módulos/preferências pela UI',status:'PASS'});
       // Reset through UI; an older Auth.js session must stop working.
       const old=actor('browser-old-'+width);await signIn(old,address);
       await page.goto(h.origin+'/redefinir-senha');await page.getByLabel('E-mail',{exact:true}).fill(address);await page.getByRole('button',{name:'Enviar link de redefinição'}).click();await page.getByRole('heading',{name:'Confira seu e-mail'}).waitFor();
       const link=h.mailbox.get(address)?.match(/http:\/\/127\.0\.0\.1:\d+\/redefinir-senha#[^\s]+/)?.[0];assert.ok(link);
       const token=new URL(link).hash.slice(7),newPassword='Nova senha sintetica de HML 031!';
       await page.goto(link);await page.getByLabel('Nova senha',{exact:true}).fill(newPassword);await page.getByLabel('Confirme a nova senha',{exact:true}).fill(newPassword);const [resetDone]=await Promise.all([page.waitForResponse(r=>r.url().endsWith('/account/password/reset/confirm')&&r.request().method()==='POST'),page.getByRole('button',{name:'Salvar nova senha'}).click()]);assert.equal(resetDone.status(),200);await page.getByRole('heading',{name:'Senha redefinida'}).waitFor();
       c.checks.push({endpoint:'POST /api/v1/account/password/reset/confirm',actor:'browser-'+width,case:'reset completo pela UI no PostgreSQL HML',status:200,wanted:200,verdict:'positive',pass:true});
       assert.equal((await old.request('/api/v1/quote-models')).status,401);
       await call(c.anonymous,'POST /api/v1/account/password/reset/confirm',{token,password:newPassword},{},400,'token de reset já consumido','negative');
       await login(page,address,newPassword);await page.getByRole('button',{name:'Sair',exact:true}).click();await page.getByRole('heading',{name:'Entre no Abelha'}).waitFor();
       scenarios.push({name:width+': recuperação/reset UI, token único, revogação de sessão antiga e logout UI',status:'PASS'});
     }catch(error){await capture(page,'failure-'+width).catch(()=>{});fs.writeFileSync(path.join(output,'failure-'+width+'.txt'),await page.locator('body').innerText());throw error;}finally{await ctx.close();}
   }
   // Same browser swaps A→B through the UI: private content must leave DOM/storage/cache.
   const ctx=await context(1440),page=await pageFor(ctx);try{
     await call(A,'PATCH /api/v1/member-modules/me/preferences',{hidden:[]});await jar(ctx,A);await page.goto(h.origin+'/?member=projetos');await page.getByRole('heading',{name:c.privateProject.name,exact:true}).waitFor();
     await page.getByRole('button',{name:'Sair',exact:true}).click();await login(page,B.email);await page.goto(h.origin+'/?member=projetos');await page.locator('.member-shell').waitFor();assert.equal(await page.getByText(c.privateProject.name,{exact:true}).count(),0);
     const privateCached=await page.evaluate(async()=>{const hits=[];for(const name of await caches.keys())for(const r of await (await caches.open(name)).keys())if(new URL(r.url).pathname.startsWith('/api/'))hits.push(r.url);return hits;});assert.deepEqual(privateCached,[]);
     await capture(page,'account-switch');scenarios.push({name:'troca A→B no mesmo navegador limpa dados da UI; nenhum endpoint API em Cache Storage',status:'PASS'});
   }finally{await ctx.close();}
   for(const a of [off,disabled,revoked]){const ctx=await context(390),page=await pageFor(ctx);try{await jar(ctx,a);await page.goto(h.origin+'/?space=crm&view=clients&member=faturas');
     if(a===off){await page.getByText('Nenhum módulo disponível',{exact:true}).waitFor();assert.equal(await page.locator('.workspace-header').count(),0);}else await page.getByRole('heading',{name:'Entre no Abelha'}).waitFor();
     scenarios.push({name:'URL direta no navegador '+a.name,status:'PASS'});
   }finally{await ctx.close();}}
   // Offline/reconnection run in verify-hml-supplement.cjs with their own
   // contexts, diagnostics and cleanup, independently of account CRUD.
   assert.deepEqual(errors,[],'Erros JavaScript no navegador');
   fs.writeFileSync(path.join(output,'browser-result.json'),JSON.stringify({errors,consoleErrors,network,screenshots},null,2));
   scenarios.push({name:'console do navegador',status:consoleErrors.length?'FAIL':'PASS',consoleErrors});assert.deepEqual(consoleErrors,[],'Console de erro do navegador');
 }finally{fs.writeFileSync(path.join(output,'browser-result.json'),JSON.stringify({errors,consoleErrors,network,screenshots},null,2));await browser.close();}
};
