// Static route inventory + explicitly produced synthetic HTTP receipt.
const fs=require('node:fs')
const path=require('node:path')
const ts=require('typescript')
const {createHash}=require('node:crypto')
const backend=path.resolve(__dirname,'..')
const root=path.resolve(backend,'src/routes')
const receiptPath=path.resolve(backend,'../docs/ABELHA-EVIDENCIA-ACESSO.json')
const rules={
 account:['/api/v1/account','Contas e convites','createAccountRouter'],
 catalog:['/api/v1/catalog','Catálogo'],clients:['/api/v1/clients','Clientes e contratos'],
 contracts:['/api/v1/contracts','Contratos'],conversations:['/api/v1/conversations','Conversas e Evolution'],
 commercial:['/api/v1/commercial','Fluxo comercial','createCommercialRouter'],
 crm:['/api/v1/crm','CRM e legados'],events:['/api/events','Eventos por organização'],
 finance:['/api/v1/finance','Financeiro comercial'],integrations:['/api/v1/integrations','Integrações','createIntegrationsRouter'],
 'member-modules':['/api/v1/member-modules','Administração de membros','createMemberModulesRouter'],messages:['/api/v1/messages','Mensagens'],
 personal:['/api/v1/personal','Projetos, preferências, notificações e histórico','createPersonalRouter'],
 'personal-finance':['/api/v1/personal','Finanças pessoais, assinaturas e revisão'],
 'personal-prices':['/api/v1/personal','Monitoramento de preços'],prospecting:['/api/v1/prospecting','Prospecção e Templates legado','createProspectingRouter'],
 'quote-models':['/api/v1/quote-models','Calculadora e propostas','createQuoteModelsRouter'],reminders:['/api/v1/reminders','Agenda e lembretes'],
 webhooks:['/webhooks','Webhook Evolution'],
}
const policyDetails={
 owner:['Sessão Auth.js','Proprietário','Nenhum para membros','Organização da sessão','Não é carteira de membro','Entidade da organização'],
 member:['Sessão Auth.js','Membro titular','Nenhum','Organização da sessão','Usuário da sessão','Preferências de exibição próprias; não elevam permissões'],
 ownerIssuer:['Sessão Auth.js','Proprietário emissor','Nenhum para membros','Organização do emissor','Emissor da sessão','Convites próprios e UUID do membro que resgatou o convite'],
 module:['Sessão Auth.js','Proprietário ou membro com grant','Individual','Organização da sessão','Usuário da sessão','Registro privado do usuário e organização'],
 personalOwner:['Sessão Auth.js','Proprietário','Nenhum para membros','Organização da sessão','Usuário da sessão','Titular da carteira; proprietário não herda recursos de convidados'],
 invite:['Convite e OTP conforme etapa','Fluxo pré-login','Não aplicável','Criada no resgate','Titular do convite','Hash/token, e-mail e estado do convite'],
 reset:['Controle pré-login, token no resgate','Titular da conta almejada','Não aplicável','Vínculo na conta','Titular da conta','Confirmação exige token ativo e vinculado ao titular'],
 automation:['Bearer de automação','Identidade de integração','Não aplicável','Configurada no backend','Configurado no backend','Registros da carteira da integração'],
 codex:['Bearer dedicado de relatórios','Integração Codex','Não aplicável','Configurada no backend','Configurado no backend','Projetos/pares ID e repositório configurados'],
 github:['HMAC do corpo bruto','Webhook GitHub','Não aplicável','Configurada no backend','Configurado no backend','Repositório vinculado e chave de idempotência'],
 evolution:['Segredo Evolution','Webhook Evolution','Não aplicável','Instância cadastrada','Serviço','Mensagem atribuída à organização da instância'],
 public:['Público','Nenhum','Não aplicável','Nenhuma','Nenhum','Sem recurso privado'],
 commercialAccess:['Sessão Auth.js','Conta ativa','Fluxo comercial','Organização da sessão','Usuário da sessão','Consulta de disponibilidade'],
 commercialOwner:['Sessão Auth.js','Proprietário habilitado','Fluxo comercial','Organização autorizada no backend','Usuário titular','Orçamento, versão, contrato ou projeto da carteira'],
 commercialLink:['Token comercial ativo','Destinatário do link','Não aplicável','Vinculada à versão','Vinculado à versão','Snapshot publicado, decisão ou contrato disponibilizado'],
}
function policy(name,route,method){
 if(name==='app'){
   if(method==='get'&&['/health','/api/v1/health'].includes(route))return ['public']
   throw Error('Rota direta sem política de autorização: '+method+' '+route)
 }
 if(name==='account'){
   if(/^\/register(\/|$)/.test(route))return ['invite']
   if(route.startsWith('/password/reset/'))return ['reset']
   return ['ownerIssuer']
 }
 if(name==='integrations'){
   if(route==='/github')return ['github']
   if(route.startsWith('/codex/'))return ['codex']
   return ['automation']
 }
 if(name==='webhooks')return ['evolution']
 if(name==='member-modules')return [route==='/me'||route==='/me/preferences'?'member':'ownerIssuer']
 if(name==='quote-models')return route.startsWith('/proposals')?['personalOwner']:['module','Calculadora']
 if(name==='commercial')return [route.startsWith('/public/')?'commercialLink':route==='/access'?'commercialAccess':'commercialOwner']
 if(name==='personal-finance')return ['module',route.startsWith('/subscriptions')?'Assinaturas':'Financeiro pessoal']
 if(name==='personal-prices')return ['module','Monitor de preços']
 if(name==='personal')return route==='/projects'&&['get','post'].includes(method)?['module','Projetos']:['personalOwner']
 return ['owner']
}
const methods=['get','post','delete','patch','put','options','head']
function inventory(routesDir=root){
 const rows=[]
 function add(name,route,method){
   const [prefix,entity]=name==='app'?['','Disponibilidade']:rules[name]
   const [kind,module]=policy(name,route,method)
   const [auth,role,defaultModule,org,user,resource]=policyDetails[kind]
   const endpoint=prefix+(route==='/'?'':route)
   rows.push({entity,method:method.toUpperCase(),route:endpoint,endpoint:method.toUpperCase()+' '+endpoint,
     router:name,kind,auth,role,module:module??defaultModule,org,user,resource,operation:method==='get'?'Leitura':'Mutação'})
 }
 function collect(name,file,target){
   const source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true)
   const visit=node=>{
     if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&node.expression.expression.getText(source)===target){
       const method=node.expression.name.text,arg=node.arguments[0]
       if(methods.includes(method)){
         const routes=arg&&ts.isStringLiteral(arg)?[arg.text]
           :arg&&ts.isArrayLiteralExpression(arg)&&arg.elements.every(ts.isStringLiteral)?arg.elements.map(value=>value.text)
           :name==='quote-models'&&arg?.getText(source)==="'/proposals/:id/'+action"&&/\[\s*'approve'\s*,\s*'refuse'\s*\]/.test(source.text)
             ?['/proposals/:id/approve','/proposals/:id/refuse']:null
         if(!routes)throw Error('Rota não literal em '+file)
         for(const route of routes)add(name,(target==='publicRouter'?'/public':'')+route,method)
       }
     }
     ts.forEachChild(node,visit)
   }
   visit(source)
 }
 for(const file of fs.readdirSync(routesDir).filter(s=>s.endsWith('.ts')).sort()){
   const name=file.slice(0,-3)
   if(!rules[name])throw Error('Classifique o roteador '+file)
   collect(name,path.join(routesDir,file),'router')
   if(name==='commercial')collect(name,path.join(routesDir,file),'publicRouter')
 }
 collect('app',path.resolve(routesDir,'../app.ts'),'app')
 const unique=new Set(rows.map(row=>row.endpoint))
 if(unique.size!==rows.length)throw Error('Endpoints duplicados no inventário')
 return rows
}
function runtimeMounts(){
 const file=path.resolve(backend,'src/app.ts')
 const source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true)
 const imports=new Map()
 const mounts=[]
 function visit(node){
   if(ts.isImportDeclaration(node)&&ts.isStringLiteral(node.moduleSpecifier)&&node.moduleSpecifier.text.startsWith('./routes/')){
     const name=node.moduleSpecifier.text.slice('./routes/'.length)
     const clause=node.importClause
     if(clause?.name)imports.set(clause.name.text,[name,'default'])
     if(clause?.namedBindings&&ts.isNamedImports(clause.namedBindings))for(const item of clause.namedBindings.elements)
       imports.set(item.name.text,[name,item.propertyName?.text??item.name.text])
   }
   if(ts.isCallExpression(node)&&node.expression.getText(source)==='app.use'&&node.arguments.length===2&&ts.isStringLiteral(node.arguments[0])){
     const [prefix,target]=node.arguments
     const constructor=ts.isCallExpression(target)?target.expression.getText(source):target.getText(source)
     // Raw-body parser composes the GitHub webhook; it does not register another endpoint.
     if(constructor==='githubJsonParser'&&prefix.text==='/api/v1/integrations/github')return
     const registered=imports.get(constructor)
     if(registered){
       const [router,method]=registered
       if(!rules[router]||rules[router][0]!==prefix.text)throw Error('Mount não inventariado: '+prefix.text)
       mounts.push({router,prefix:prefix.text,method,call:ts.isCallExpression(target)})
     }
   }
   ts.forEachChild(node,visit)
 }
 visit(source)
 return mounts
}
function sourceFingerprint(){
 const hash=createHash('sha256')
 const scope=[path.resolve(backend,'src/routes'),path.resolve(backend,'src/middleware'),path.resolve(backend,'src/db/migrations')]
 const files=['src/db/homologation/bootstrap-empty.sql','src/app.ts','src/auth.config.ts','src/services/member-modules.ts','src/services/invites.ts','src/services/password-reset.ts','src/services/credential-budget.ts','src/services/signup-email.ts','src/services/webhookProcessor.ts','src/services/codex-report-scope.ts','src/services/commercial.ts','src/services/commercial-store.ts','src/services/shared-credential-budget.ts','src/services/access-matrix.test.ts','scripts/map-access.cjs']
 for(const dir of scope)for(const name of fs.readdirSync(dir).filter(value=>/\.(?:ts|sql)$/.test(value)))files.push(path.relative(backend,path.join(dir,name)).replace(/\\/g,'/'))
 for(const name of files.sort())if(fs.existsSync(path.resolve(backend,name))){
   hash.update(name).update('\0').update(fs.readFileSync(path.resolve(backend,name),'utf8').replaceAll('\r\n','\n')).update('\0')
 }
 return hash.digest('hex')
}
function mapAccess(routesDir=root){
 return inventory(routesDir).map(row=>[row.entity,row.endpoint,row.auth,row.role,row.module,row.org,row.user,row.resource,row.operation])
}
function markdown(receipt){
 const rows=inventory()
 receipt??=fs.existsSync(receiptPath)?JSON.parse(fs.readFileSync(receiptPath,'utf8')):null
 const validReceipt=receipt?.sourceDigest===sourceFingerprint()?receipt:null
 const evidence=new Map((validReceipt?.routes??[]).map(row=>[row.endpoint,row.checks]))
 function checks(row,verdict){
   return (evidence.get(row.endpoint)??[]).filter(check=>check.verdict===verdict).map(check=>check.case+' → '+check.status).join('; ')||'Não exercitado'
 }
 const recorded=rows.filter(row=>evidence.has(row.endpoint))
 const positive=recorded.filter(row=>checks(row,'positive')!=='Não exercitado').length
 const negative=recorded.filter(row=>checks(row,'negative')!=='Não exercitado').length
 const routesCount=rows.filter(row=>row.router!=='app').length
 const directCount=rows.length-routesCount
 const head='# Abelha | Inventário de autorização por rota\n\n'+routesCount+' rotas dos roteadores Express, mais '+directCount+' aliases HTTP registrados diretamente no app. O middleware de autenticação da biblioteca é montado em /api/auth e os fluxos usados pela fixture aparecem separadamente. Rotas HEAD implícitas do Express não são entradas independentes.\n\n'
 const summary=validReceipt?'**Evidência local:** '+recorded.length+'/'+rows.length+' rotas com teste direto; '+negative+' com negativa executada, '+positive+' com positiva executada, '+validReceipt.routes.reduce((n,row)=>n+row.checks.length,0)+' asserções HTTP nas rotas inventariadas. [Recibo reproduzível](ABELHA-EVIDENCIA-ACESSO.json), hash do escopo-fonte `'+validReceipt.sourceDigest+'`.':'**Sem recibo para este escopo-fonte:** classificação estática sem crédito automático de teste.'
 const limits='\n\n**Interpretação:** a negativa comprova o caso anotado, não CRUD, integridade, replays, acesso a objetos de outro tenant ou RLS. Positivas são casos sintéticos executados, sem presumir sucesso remoto. Testes por fluxo e a suíte de PWA são complementares, não foram convertidos em crédito individual. Produção e HML não foram usadas.\n\n'
 const auth=validReceipt?.auth?.length?'**Auth.js, fora do total de rotas da aplicação:** '+validReceipt.auth.map(x=>x.case+' → '+x.status).join('; ')+'.\n\n':''
 return head+summary+limits+auth+'| Entidade | Endpoint | Autenticação | Papel | Módulo | Organização | Usuário | Propriedade | Operação | Positiva local | Negativa local | Estado |\n|---|---|---|---|---|---|---|---|---|---|---|---|\n'+rows.map(row=>{
   const positive=checks(row,'positive'),negative=checks(row,'negative')
   const state=positive==='Não exercitado'&&negative==='Não exercitado'?'NÃO VERIFICADO':positive==='Não exercitado'||negative==='Não exercitado'?'PARCIAL':'Casos locais aprovados'
   return '| '+[row.entity,row.endpoint,row.auth,row.role,row.module,row.org,row.user,row.resource,row.operation,positive,negative,state].join(' | ')+' |'
 }).join('\n')+'\n'
}
module.exports={inventory,mapAccess,markdown,runtimeMounts,sourceFingerprint,receiptPath}
if(require.main===module)process.stdout.write(markdown())
