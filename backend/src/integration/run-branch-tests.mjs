import 'dotenv/config'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'

const target=process.argv[2]
assert.match(target||'',/^ep-[a-z0-9-]+\.[a-z0-9-]+\.aws\.neon\.tech$/,'Informe o host direto da branch isolada autorizada')
assert.ok(!target.includes('-pooler'),'Use a conexão direta da branch')
const connection=new URL(process.env.DATABASE_URL)
assert.notEqual(target,connection.hostname.replace('-pooler.','.'),'O runner recusa o endpoint atual do aplicativo')
connection.hostname=target
const result=spawnSync(process.execPath,['--test','dist/integration/crm.integration.test.js','dist/integration/crm.concurrent.integration.test.js','dist/integration/crm.date.integration.test.js'],{
  stdio:'inherit',windowsHide:true,
  env:{...process.env,DATABASE_URL:connection.toString(),ABELHA_TEST_DATABASE_HOST:target,ABELHA_TEST_SCHEMA_ROLLBACK:'1'},
})
process.exitCode=result.status??1
