import test from 'node:test'
import assert from 'node:assert/strict'
import { transitionTask, probability, weightedValue, businessDay, notificationItems, csvCell, exportBusinessRows } from './crm'
import { mapContract, mapReceivable } from './contract-store'

test('quadro e checklist preservam a coluna anterior, inclusive conclusão repetida', () => {
  const done = transitionTask({ status: 'in_progress', previous_status: null }, 'done')
  assert.deepEqual(done, { status: 'done', previous_status: 'in_progress' })
  const repeated = transitionTask(done, 'done')
  assert.deepEqual(repeated, done)
  assert.deepEqual(transitionTask(repeated, 'reopen'), { status: 'in_progress', previous_status: 'in_progress' })
  assert.equal(transitionTask({ status: 'done', previous_status: null }, 'reopen').status, 'todo')
  assert.equal(transitionTask(done, 'todo').status, 'todo')
  assert.throws(() => transitionTask(done, 'review'), /Situação/)
})
test('probabilidades automáticas e previsão monetária com arredondamento', () => {
  assert.deepEqual(['qualification','proposal','negotiation','closing','won','lost'].map(probability), [20,40,70,90,100,0])
  assert.equal(weightedValue(10000, 'proposal'), 4000)
  assert.equal(weightedValue(10.01, 'closing'), 9.01)
  assert.throws(() => probability('invalid'), /Etapa/)
})
test('limites de dia seguem São Paulo, não UTC', () => {
  assert.equal(businessDay(new Date('2026-11-06T01:30:00Z')), '2026-11-05')
})
test('datas civis vindas do driver não perdem o dia nem quebram formulários', () => {
  const mapped=mapReceivable({due_date:new Date('2020-01-01T00:00:00Z'),status:'open',amount:'10'})
  assert.equal(mapped.dueDate,'2020-01-01')
  assert.equal(mapped.status,'overdue')
  assert.equal(mapContract({development_start_date:new Date('2026-11-05T00:00:00Z'),development_end_date:'2026-12-05',contract_end_date:'2027-11-05'}).developmentStartDate,'2026-11-05')
})
test('avisos têm chave estável, sem duplicar próxima ação como compromisso e preservam estados', () => {
  const sources = { reminders: [{ id:'a',title:'Retornar',due_at:'2026-11-05T11:00:00Z',completed:false,is_next_action:true }], tasks:[{id:'t',title:'Entrega',due_date:'2026-11-04',status:'todo'}], receivables:[{id:'r',description:'Parcela',due_date:'2026-11-04',status:'open',client_name:'Cliente'}] }
  const now = new Date('2026-11-05T15:00:00Z')
  const result = notificationItems(sources, now)
  assert.equal(result.length, 3)
  assert.equal(new Set(result.map(x=>x.key)).size, 3)
  assert.deepEqual(notificationItems(sources, now).map(x=>x.key), result.map(x=>x.key))
  const states = [{ notification_key:result[0].key, read_at:'2026-11-05', dismissed:true }]
  assert.equal(notificationItems(sources, now, states).length, 2)
  assert.equal(notificationItems(sources, now, [{...states[0],dismissed:false}])[0].read, true)
})
test('CSV protege fórmulas e aspas; exportação usa lista explícita e organização', () => {
  assert.equal(csvCell('=1+1'), '"\'=1+1"')
  assert.equal(csvCell('a"b'), '"a""b"')
  const rows = exportBusinessRows('clients', [{id:'c', organization_id:'org',name:'Ana',password_hash:'SECRET',api_key:'SECRET'}], 'org')
  assert.equal(rows[0].name, 'Ana')
  assert.equal(JSON.stringify(rows).includes('SECRET'), false)
  assert.throws(()=>exportBusinessRows('clients',[{id:'c',organization_id:'other'}],'org'), /organização/)
  assert.throws(()=>exportBusinessRows('users',[],'org'), /exportação/)
})
