import test from 'node:test'
import assert from 'node:assert/strict'
import { parseProposal, proposalPrompt, proposalText } from './quote-proposal'

test('immutable proposal formatter retains a selected free item and excludes unselected items',()=>{
  const proposal=parseProposal({
    title:' Catálogo ',briefing:' Exportar catálogo em página acessível. Contato: pessoa@example.invalid ',clientId:'synthetic-test',terms:'Pagamento em duas parcelas após aceite.' ,
    model:{version:1,name:'Modelo',baseCents:10000,monthlyCents:4000,discountBps:1000,lines:[
      {id:'free',label:'Treinamento incluído',unit:'fixed',period:'once',priceCents:0},
      {id:'skip',label:'Serviço fora do escopo',unit:'fixed',period:'once',priceCents:5000},
    ]},
    quantities:{free:1000},
  })
  const entry={...proposal,client_name:'Estúdio Fictício'}
  assert.equal(entry.quote.oneTimeCents,9000)
  assert.equal(entry.quote.monthlyCents,4000)
  assert.equal(entry.title,'Catálogo')
  assert.match(proposalText(entry),/Treinamento incluído/)
  assert.doesNotMatch(proposalText(entry),/Serviço fora do escopo/)
  assert.throws(()=>proposalPrompt(entry),{status:409})
  const prompt=proposalPrompt({...entry,approved_at:'2026-11-25T15:00:00Z'})
  assert.match(prompt,/Treinamento incluído/)
  assert.match(prompt,/dados? não confiável/i)
  assert.doesNotMatch(prompt,/Serviço fora do escopo/)
  assert.match(proposalText(entry),/Pagamento em duas parcelas/)
  assert.doesNotMatch(prompt,/Estúdio Fictício|example.invalid|duas parcelas/)
  assert.match(prompt,/Entregáveis e requisitos técnicos/)
  assert.throws(()=>proposalPrompt({...entry,approved_at:'2026-11-25T15:00:00Z',refused_at:'2026-11-25T15:00:00Z'}),{status:409})
})
