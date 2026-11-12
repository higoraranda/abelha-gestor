// Uses an ignored short-lived session file. Never loads backend/.env.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process')
const file=path.resolve(process.argv[2]||'../.abelha-homologacao/session.json')
if(!fs.existsSync(file))throw new Error('Sessão isolada não fornecida')
const systemKeys=new Set(['PATH','SYSTEMROOT','WINDIR','SYSTEMDRIVE','TEMP','TMP','COMSPEC','PATHEXT'])
const systemEnv=Object.fromEntries(Object.entries(process.env).filter(([key])=>systemKeys.has(key.toUpperCase())))
const result=spawnSync(process.execPath,['--require',path.join(__dirname,'isolated-test-env.cjs'),'--test','--test-concurrency=1','dist/services/platform.integration.test.js','dist/services/personal-api.test.js'],{
  stdio:'inherit',windowsHide:true,env:{...systemEnv,NODE_ENV:'test',ABELHA_HOMOLOGATION_SESSION_FILE:file,DATABASE_URL:'postgres://synthetic:synthetic@127.0.0.1:1/never_connect',VAPID_PUBLIC_KEY:'',VAPID_PRIVATE_KEY:'',VAPID_SUBJECT:'',ABELHA_INTEGRATION_TOKEN:'',GITHUB_WEBHOOK_SECRET:''},
})
process.exitCode=result.status??1
