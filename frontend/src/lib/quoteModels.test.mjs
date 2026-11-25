import test from 'node:test'
import assert from 'node:assert/strict'
import { example, modelingPrompt, scaled } from './quoteModels.ts'
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
