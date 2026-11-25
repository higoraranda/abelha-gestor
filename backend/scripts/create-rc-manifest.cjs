// Read checkout and build outputs; writes no repository state. Redirect stdout outside the checkout.
const fs=require('node:fs')
const path=require('node:path')
const {createHash}=require('node:crypto')
const {execFileSync}=require('node:child_process')
const root=path.resolve(__dirname,'../..')
const git=(...args)=>execFileSync('git',args,{cwd:root,windowsHide:true,stdio:['ignore','pipe','pipe'],maxBuffer:12*1024*1024})
const hash=value=>createHash('sha256').update(value).digest('hex')
const asNames=value=>value.toString('utf8').split('\0').filter(Boolean)
const names=[...new Set([...asNames(git('diff','--name-only','-z','HEAD')),...asNames(git('ls-files','--others','--exclude-standard','-z'))])].sort()
const credentials=/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|(?:gh[pous]_[A-Za-z0-9]{35,}|github_pat_[A-Za-z0-9_]{55,}|sk_(?:live|test)_[A-Za-z0-9]{25,}|re_[A-Za-z0-9]{30,})|postgres(?:ql)?:\/\/[^/\s:@]+:[^@\s]+@[^/\s]+(?:neon\.tech|supabase\.co|render\.com)/i
function details(name,scan=false){
  const file=path.resolve(root,name)
  const relation=path.relative(root,file)
  if(!relation||relation.startsWith('..')||path.isAbsolute(relation))throw Error('Arquivo fora do checkout.')
  if(scan&&/(^|\/)\.env(?:\.|$)|\.(?:pfx|pem|key)$/i.test(name))throw Error('Revise o arquivo de configuração antes de incluí-lo: '+name)
  if(!fs.existsSync(file))return {file:name,state:'removed'}
  if(!fs.lstatSync(file).isFile()||fs.realpathSync(file)!==file)throw Error('Arquivo especial fora do inventário: '+name)
  const content=fs.readFileSync(file)
  if(scan&&credentials.test(content.toString('utf8')))throw Error('Possível credencial, requer revisão: '+name)
  return {file:name,bytes:content.length,sha256:hash(content)}
}
const basis={base_git_sha:git('rev-parse','HEAD').toString('utf8').trim(),
  files:names.map(name=>details(name,true)),patch_sha256:hash(git('-c','core.safecrlf=false','diff','--binary','HEAD'))}
const migrations='backend/src/db/migrations/'
const lockfiles=['backend/package-lock.json','frontend/package-lock.json'].map(name=>details(name))
const buildFiles=['frontend/dist/index.html','frontend/dist/sw.js','backend/dist/app.js']
const distAssets=path.join(root,'frontend/dist/assets')
if(fs.existsSync(distAssets))buildFiles.push(...fs.readdirSync(distAssets).sort().filter(name=>/\.(css|js)$/.test(name)).map(name=>'frontend/dist/assets/'+name))
const manifest={
  schema_version:1,
  candidate_id:'working-tree-sha256:'+hash(JSON.stringify(basis)),
  branch:git('branch','--show-current').toString('utf8').trim(),
  staged_files:asNames(git('diff','--cached','--name-only','-z')),
  ...basis,
  migrations:fs.readdirSync(path.join(root,migrations)).filter(name=>name.endsWith('.sql')).sort().map(name=>details(migrations+name)),
  lockfiles,
  build:{node:process.version,commands:{backend:'npm test',frontend:'npm test && npm run lint && npx --no-install tsc -b && npx --no-install vite build --configLoader runner'},artifacts:buildFiles.map(name=>details(name))},
}
process.stdout.write(JSON.stringify(manifest,null,2)+'\n')
