import test from 'node:test'
import assert from 'node:assert/strict'
import { scheduledOccurrence } from './scheduling'
test('daily and Sunday schedules catch the occurrence across midnight without assigning it to Monday',()=>{
  const now=new Date('2026-11-16T03:00:00Z')
  assert.equal(scheduledOccurrence(now,'23:59','daily')?.toISOString(),'2026-11-16T02:59:00.000Z')
  assert.equal(scheduledOccurrence(now,'23:59','weekly')?.toISOString(),'2026-11-16T02:59:00.000Z')
  assert.equal(scheduledOccurrence(new Date('2026-11-16T03:10:00Z'),'08:00','daily'),null)
})
