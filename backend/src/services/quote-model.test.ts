import test from 'node:test'
import assert from 'node:assert/strict'
import { parseQuoteModel, calculateQuote } from './quote-model'

const sample={version:1,name:'Fotografia',baseCents:10000,monthlyCents:5000,discountBps:1000,lines:[
  {id:'coverage',label:'Cobertura',unit:'hour',period:'once',priceCents:7777},
  {id:'travel',label:'Deslocamento',unit:'fixed',period:'once',priceCents:3000},
  {id:'photos',label:'Fotos',unit:'unit',period:'once',priceCents:150},
  {id:'delivery',label:'Galeria',unit:'fixed',period:'monthly',priceCents:900},
]}

test('rounds lines independently in cents and discounts only the one-time subtotal',()=>{
  const model=parseQuoteModel(sample)
  const result=calculateQuote(model,{coverage:1500,travel:1000,photos:3000,delivery:1000})
  assert.deepEqual(result.lines.map(line=>line.amountCents),[11666,3000,450,900])
  assert.deepEqual([result.subtotalCents,result.discountCents,result.oneTimeCents,result.monthlyCents],[25116,2512,22604,5900])
  assert.equal(calculateQuote(model,{}).oneTimeCents,9000)
})
test('rejects unknown keys, unsupported versions, duplicate IDs and invalid quantities',()=>{
  for(const bad of [{...sample,version:2},{...sample,formula:'arbitrary'},{...sample,baseCents:1.5},{...sample,discountBps:10001},{...sample,lines:[sample.lines[0],sample.lines[0]]}]){
    assert.throws(()=>parseQuoteModel(bad),{status:400})
  }
  const model=parseQuoteModel(sample)
  for(const bad of [{unknown:1000},{travel:2000},{photos:1500},{coverage:-1},{coverage:1e12}]){
    assert.throws(()=>calculateQuote(model,bad),{status:400})
  }
})
