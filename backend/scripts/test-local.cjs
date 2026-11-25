const { spawnSync } = require('node:child_process')
const { readdirSync } = require('node:fs')
const files = readdirSync('dist/services').filter(name => name.endsWith('.test.js')).map(name => 'dist/services/'+name)
const result = spawnSync(process.execPath,['--test',...files],{
  stdio:'inherit', windowsHide:true,
  env:{...process.env,ABELHA_HOMOLOGATION_SESSION_FILE:'',DATABASE_URL:'postgres://synthetic:synthetic@127.0.0.1:1/never_connect',VAPID_PRIVATE_KEY:'',VAPID_PUBLIC_KEY:'',VAPID_SUBJECT:'',ABELHA_INTEGRATION_TOKEN:'',GITHUB_WEBHOOK_SECRET:'',ABELHA_OTP_SECRET:'',ABELHA_OTP_RESEND_API_KEY:'',ABELHA_OTP_FROM:'',ABELHA_CODEX_REPORT_TOKEN:'',ABELHA_CODEX_PROJECT_ID:'',ABELHA_CODEX_PROJECTS_JSON:'',ABELHA_OWNER_RECOVERY_EMAIL:'',EVOLUTION_WEBHOOK_SECRET:'',ABELHA_AUTH_SHARED_BUDGET:'',ABELHA_AUTH_RATE_SECRET:''},
})
process.exitCode=result.status??1
