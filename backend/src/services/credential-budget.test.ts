import test from 'node:test'
import assert from 'node:assert/strict'
import { createCredentialBudget } from './credential-budget'

test('credential budgets bound failed attempts per normalized identity and cap process-wide bcrypt work',()=>{
  let timestamp=0
  const budget=createCredentialBudget(()=>timestamp)
  const subject='synthetic@example.invalid'
  for(let index=0;index<12;index++)assert.equal(budget.reserve(subject),true)
  assert.equal(budget.reserve(subject),false)
  assert.equal(budget.reserve('independent@example.invalid'),true)
  for(let index=0;index<77;index++)assert.equal(budget.reserve('synthetic-'+index+'@example.invalid'),true)
  assert.equal(budget.reserve('over-limit@example.invalid'),false)
  timestamp=60_000
  assert.equal(budget.reserve('over-limit@example.invalid'),true)
  assert.equal(budget.reserve(subject),false)
  budget.success(subject)
  assert.equal(budget.reserve(subject),true)
  timestamp=660_000
  assert.equal(budget.reserve(subject),true)
})
