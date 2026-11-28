import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateQuotePreview, example, modelingPrompt, scaled } from './quoteModels.ts'
test('converts Brazilian decimals directly to scaled integers',()=>{
  assert.equal(scaled('10,50',2,'Preço'),1050)
  assert.equal(scaled('1.375',3,'Horas'),1375)
  assert.equal(scaled('5',2,'Desconto'),500)
  assert.equal(scaled('',2,'Preço'),0)
  for(const value of ['-1','12x','1,999','1.000,00','2e5'])assert.throws(()=>scaled(value,2,'Preço'))
})
test('copied prompt embeds the fictitious versioned model, not private user settings',()=>{
  assert.match(modelingPrompt,/Não invente valores/)
  assert.ok(modelingPrompt.includes(JSON.stringify(example,null,2)))
  assert.equal(example.version,1)
})

test('updates recurring and one-time totals in cents and keeps options separate',()=>{
  const model = { ...example, baseCents: 1, discountBps: 1250, lines: [
    { id: 'measure', label: 'Medição', unit: 'hour', period: 'once', priceCents: 150 },
    { id: 'support', label: 'Apoio', unit: 'fixed', period: 'monthly', priceCents: 500 },
    { id: 'extras', label: 'Ampliação', unit: 'unit', period: 'once', priceCents: 501 },
  ] }
  const result = calculateQuotePreview(model, { measure: 1010, support: 1000, extras: 2000 }, ['extras'])
  assert.deepEqual(result.quote.lines.map(line => line.amountCents), [152, 500, 1002])
  assert.equal(result.quote.subtotalCents, 153)
  assert.equal(result.quote.discountCents, 19)
  assert.equal(result.quote.oneTimeCents, 134)
  assert.equal(result.quote.monthlyCents, 500)
  assert.equal(result.options[0].amountCents, 1002)
})

test('rejects quantities that cannot be saved using the selected billing unit',()=>{
  assert.throws(() => calculateQuotePreview(example, { fotos: 1500 }), /Fotos extras/)
  assert.throws(() => calculateQuotePreview(example, { deslocamento: 2000 }), /Deslocamento/)
  assert.throws(() => calculateQuotePreview(example, { cobertura: 10000001 }), /Cobertura/)
  assert.throws(() => calculateQuotePreview({...example, discountBps:10001}, {}), /Desconto/)
})
