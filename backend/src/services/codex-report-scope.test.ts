import test from 'node:test'
import assert from 'node:assert/strict'
import { codexReportScope } from './codex-report-scope'

test('the Codex report credential is distinct from automation and fixed to one project',()=>{
  const project='11111111-1111-4111-8111-111111111111'
  const token='test-only-codex-report-token-0123456'
  const broader='test-only-automation-token-012345678'
  const env={ABELHA_CODEX_REPORT_TOKEN:token,ABELHA_INTEGRATION_TOKEN:broader,ABELHA_CODEX_PROJECT_ID:project}
  assert.deepEqual(codexReportScope('Bearer '+token,env),{configured:true,project})
  assert.equal(codexReportScope('Bearer '+broader,env).project,null)
  assert.equal(codexReportScope(token,env).project,null)
  assert.equal(codexReportScope('Bearer '+token,{...env,ABELHA_INTEGRATION_TOKEN:token}).configured,false)
  assert.equal(codexReportScope('Bearer '+token,{...env,ABELHA_CODEX_PROJECT_ID:'missing'}).configured,false)
})
