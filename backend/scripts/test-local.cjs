const { spawnSync } = require('node:child_process')
const { readdirSync } = require('node:fs')
const files = readdirSync('dist/services').filter(name => name.endsWith('.test.js')).map(name => 'dist/services/'+name)
const result = spawnSync(process.execPath,['--test',...files],{
  stdio:'inherit', windowsHide:true,
  env:{...process.env,ABELHA_HOMOLOGATION_SESSION_FILE:'',DATABASE_URL:'postgres://synthetic:synthetic@127.0.0.1:1/never_connect',VAPID_PRIVATE_KEY:'',VAPID_PUBLIC_KEY:'',VAPID_SUBJECT:'',ABELHA_INTEGRATION_TOKEN:'',GITHUB_WEBHOOK_SECRET:''},
})
process.exitCode=result.status??1
