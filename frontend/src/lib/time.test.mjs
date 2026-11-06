import test from 'node:test'
import assert from 'node:assert/strict'
import { localDateTimeToIso } from './time.ts'
test('um horário civil brasileiro não depende do fuso do computador',()=>assert.equal(localDateTimeToIso('2026-11-05T09:00'),'2026-11-05T12:00:00.000Z'))
test('meia-noite brasileira e limite de mês',()=>assert.equal(localDateTimeToIso('2026-12-01T00:00'),'2026-12-01T03:00:00.000Z'))
test('recusa datas inválidas',()=>{assert.throws(()=>localDateTimeToIso('2026-02-30T09:00'));assert.throws(()=>localDateTimeToIso('2026-11-05T24:01'))})
