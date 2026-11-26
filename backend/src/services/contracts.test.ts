import test from "node:test"
import assert from "node:assert/strict"
import { buildContractSchedule, dueDateInMonth } from "./contracts"
import { resolveContractInput } from './contract-store'

test('contract edits accept PostgreSQL date objects without changing civil dates', async () => {
  const input=await resolveContractInput(null,'synthetic-org',{
    serviceName:'HML',grossAmount:100,paymentMethod:'cash',monthlyFee:0,
    developmentStartDate:new Date('2020-01-01T00:00:00.000Z'),
    developmentEndDate:new Date('2020-01-02T00:00:00.000Z'),
    contractEndDate:new Date('2020-02-02T00:00:00.000Z'),
  })
  assert.equal(input.developmentStartDate,'2020-01-01')
  assert.equal(input.developmentEndDate,'2020-01-02')
  assert.equal(input.contractEndDate,'2020-02-02')
  assert.equal(buildContractSchedule(input).grossAmount,100)
})

const base = {
  serviceName: "Site institucional",
  grossAmount: 1000.01,
  monthlyFee: 120,
  monthlyDueDay: 31,
  developmentStartDate: "2026-01-10",
  developmentEndDate: "2026-01-31",
  contractEndDate: "2026-04-30",
} as const

test("aplica 5% somente ao serviço no pagamento à vista", () => {
  const result = buildContractSchedule({ ...base, paymentMethod: "cash" })
  assert.equal(result.finalAmount, 950.01)
  assert.equal(result.receivables[0].amount, 950.01)
  assert.equal(result.receivables.filter((item) => item.kind === "monthly_fee").length, 3)
})

test("divide 2x e coloca centavo restante na última parcela", () => {
  const result = buildContractSchedule({ ...base, paymentMethod: "two_installments", monthlyFee: 0, monthlyDueDay: null })
  assert.deepEqual(result.receivables.map((item) => item.amount), [500, 500.01])
  assert.deepEqual(result.receivables.map((item) => item.dueDate), ["2026-01-10", "2026-01-31"])
})

test("divide 3x, usa o primeiro vencimento mensal e preserva os centavos", () => {
  const result = buildContractSchedule({ ...base, paymentMethod: "three_installments" })
  const setup = result.receivables.filter((item) => item.kind === "setup_installment")
  assert.deepEqual(setup.map((item) => item.amount), [333.33, 333.33, 333.35])
  assert.equal(setup[2].dueDate, "2026-02-28")
  assert.equal(result.receivables.filter((item) => item.kind === "monthly_fee")[0].dueDate, "2026-02-28")
})

test("ajusta o dia 31 para o fim de meses curtos e limita ao fim do contrato", () => {
  assert.equal(dueDateInMonth(2028, 1, 31).toISOString().slice(0, 10), "2028-02-29")
  const result = buildContractSchedule({ ...base, paymentMethod: "cash" })
  assert.deepEqual(
    result.receivables.filter((item) => item.kind === "monthly_fee").map((item) => item.dueDate),
    ["2026-02-28", "2026-03-31", "2026-04-30"],
  )
})

test("exige mensalidade para contratos em 3x", () => {
  assert.throws(
    () => buildContractSchedule({ ...base, paymentMethod: "three_installments", monthlyFee: 0 }),
    /exigem mensalidade/,
  )
})
