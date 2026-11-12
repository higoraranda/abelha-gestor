import test from 'node:test'
import assert from 'node:assert/strict'
import { subscriptionInput, safePersonalUrl, reportInput, invoiceSummary, priceAlert, overpassQuery, nextRecurringDate } from './personal'

test('push subscription rejects internal endpoints and malformed keys', () => {
  const keys = { p256dh: Buffer.concat([Buffer.from([4]),Buffer.alloc(64,1)]).toString('base64url'), auth: Buffer.alloc(16,2).toString('base64url') }
  assert.equal(subscriptionInput({endpoint:'https://fcm.googleapis.com/fcm/send/test',keys}).endpoint,'https://fcm.googleapis.com/fcm/send/test')
  for (const endpoint of ['http://fcm.googleapis.com/fcm/send/test','https://127.0.0.1/push','https://fcm.googleapis.com.evil.example/push','https://user:pass@fcm.googleapis.com/push']) assert.throws(()=>subscriptionInput({endpoint,keys}))
  assert.throws(()=>subscriptionInput({endpoint:'https://fcm.googleapis.com/push',keys:{p256dh:'x',auth:'y'}}))
})
test('notification links stay within Personal', () => {
  assert.equal(safePersonalUrl('/?space=personal&view=personal-finance'), '/?space=personal&view=personal-finance')
  assert.equal(safePersonalUrl('https://evil.example'), '/?space=personal&view=personal-overview')
})
test('project report requires verifiable references and never trusts a boolean claim', () => {
  const report = {schema_version:1,event_id:'run-123',summary:'Backend validado',commit:'a'.repeat(40),tests:[{name:'backend',command:'npm test',result:'passed',evidence_url:'https://github.com/example/project/actions/runs/123'}],acceptance:['Fluxo validado'],next_step:'Validar preview'}
  assert.equal(reportInput(report,'https://github.com/example/project').commit,'a'.repeat(40))
  assert.throws(()=>reportInput({...report,tests:[{name:'x',result:'passed'}]},'https://github.com/example/project'))
  assert.throws(()=>reportInput({...report,commit:'terminei'},'https://github.com/example/project'))
  assert.throws(()=>reportInput({...report,tests:[{...report.tests[0],evidence_url:'https://github.com/other/repo/actions/runs/1'}]},'https://github.com/example/project'))
})
test('invoice variation accepts zero and refunds and ignores previous billing cycles', () => {
  const summary=invoiceSummary([{recorded_on:'2026-11-01',amount:1200},{recorded_on:'2026-11-02',amount:1280},{recorded_on:'2026-11-03',amount:1280},{recorded_on:'2026-11-04',amount:1250}], '2026-11-10')
  assert.equal(summary.current,1250); assert.equal(summary.variation,-30); assert.equal(summary.average,16.67)
  assert.equal(summary.projected,1350)
  assert.equal(invoiceSummary([{recorded_on:'2026-11-01',amount:100}], '2026-11-10').variation,null)
})
test('price alert detects real drops and target crossings without alerts on unchanged prices', () => {
  assert.deepEqual(priceAlert(100,80,70),{notify:true,reduction:20})
  assert.equal(priceAlert(80,80,100).notify,false)
  assert.equal(priceAlert(null,100,100).notify,true)
})
test('Overpass query escapes city input and enforces supported niches and bounded results', () => {
  assert.match(overpassQuery('dentists','Campinas',30), /dentist/)
  assert.throws(()=>overpassQuery('anything','Campinas',30))
  assert.throws(()=>overpassQuery('dentists','Campinas',1000))
  assert.throws(()=>overpassQuery('dentists','Campinas";out;',30))
})
test('personal recurrence preserves its original billing day after a short month',()=>{
  assert.equal(nextRecurringDate('2026-01-31','monthly',31),'2026-02-28')
  assert.equal(nextRecurringDate('2026-02-28','monthly',31),'2026-03-31')
  assert.equal(nextRecurringDate('2027-02-28','yearly',29),'2028-02-29')
})
