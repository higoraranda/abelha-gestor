export type PaymentMethod = "cash" | "two_installments" | "three_installments"

export interface NewContractInput {
  catalogItemId?: string | null
  serviceName: string
  serviceDescription?: string | null
  serviceSnapshot?: Record<string, unknown>
  grossAmount: number
  paymentMethod: PaymentMethod
  monthlyFee?: number
  monthlyDueDay?: number | null
  developmentStartDate: string
  developmentEndDate: string
  contractEndDate: string
  notes?: string | null
}

export interface ReceivableDraft {
  kind: "setup_installment" | "monthly_fee"
  installmentNumber: number | null
  description: string
  amount: number
  dueDate: string
}

export interface ContractSchedule {
  grossAmount: number
  discountPercent: number
  finalAmount: number
  receivables: ReceivableDraft[]
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function asUtcDate(value: string, field: string) {
  if (!ISO_DATE.test(value)) throw new Error(`${field} deve usar o formato AAAA-MM-DD`)
  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error(`${field} é inválida`)
  }
  return date
}

function iso(date: Date) {
  return date.toISOString().slice(0, 10)
}

function lastDayOfMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
}

export function dueDateInMonth(year: number, month: number, preferredDay: number) {
  const day = Math.min(preferredDay, lastDayOfMonth(year, month))
  return new Date(Date.UTC(year, month, day))
}

export function firstMonthlyDueDate(afterDate: Date, preferredDay: number) {
  let year = afterDate.getUTCFullYear()
  let month = afterDate.getUTCMonth()
  let candidate = dueDateInMonth(year, month, preferredDay)

  if (candidate.getTime() <= afterDate.getTime()) {
    month += 1
    if (month > 11) {
      month = 0
      year += 1
    }
    candidate = dueDateInMonth(year, month, preferredDay)
  }

  return candidate
}

export function validateContractInput(input: NewContractInput) {
  if (!input.serviceName?.trim()) throw new Error("Serviço é obrigatório")
  if (!Number.isFinite(input.grossAmount) || input.grossAmount <= 0) {
    throw new Error("Valor do serviço deve ser maior que zero")
  }
  if (!(["cash", "two_installments", "three_installments"] as string[]).includes(input.paymentMethod)) {
    throw new Error("Forma de pagamento inválida")
  }

  const monthlyFee = Number(input.monthlyFee ?? 0)
  const dueDay = input.monthlyDueDay == null ? null : Number(input.monthlyDueDay)
  if (!Number.isFinite(monthlyFee) || monthlyFee < 0) throw new Error("Mensalidade inválida")
  if (dueDay != null && (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31)) {
    throw new Error("Dia de pagamento deve estar entre 1 e 31")
  }
  if (monthlyFee > 0 && dueDay == null) throw new Error("Informe o dia da mensalidade")
  if (input.paymentMethod === "three_installments" && (monthlyFee <= 0 || dueDay == null)) {
    throw new Error("Contratos em 3x exigem mensalidade e dia de pagamento")
  }

  const start = asUtcDate(input.developmentStartDate, "Data de início")
  const developmentEnd = asUtcDate(input.developmentEndDate, "Término do desenvolvimento")
  const contractEnd = asUtcDate(input.contractEndDate, "Fim do contrato")
  if (developmentEnd < start) throw new Error("O término do desenvolvimento deve ocorrer após o início")
  if (contractEnd < developmentEnd) throw new Error("O fim do contrato deve ocorrer após o desenvolvimento")
}

export function buildContractSchedule(input: NewContractInput): ContractSchedule {
  validateContractInput(input)

  const grossCents = Math.round(input.grossAmount * 100)
  const monthlyCents = Math.round(Number(input.monthlyFee ?? 0) * 100)
  const developmentEnd = asUtcDate(input.developmentEndDate, "Término do desenvolvimento")
  const contractEnd = asUtcDate(input.contractEndDate, "Fim do contrato")
  const dueDay = input.monthlyDueDay == null ? null : Number(input.monthlyDueDay)
  const firstMonthly = dueDay == null ? null : firstMonthlyDueDate(developmentEnd, dueDay)
  const receivables: ReceivableDraft[] = []
  let finalCents = grossCents
  let discountPercent = 0

  if (input.paymentMethod === "cash") {
    discountPercent = 5
    finalCents = Math.round(grossCents * 0.95)
    receivables.push({
      kind: "setup_installment",
      installmentNumber: 1,
      description: `${input.serviceName} — à vista`,
      amount: finalCents / 100,
      dueDate: input.developmentStartDate,
    })
  } else if (input.paymentMethod === "two_installments") {
    const first = Math.floor(grossCents / 2)
    receivables.push(
      {
        kind: "setup_installment",
        installmentNumber: 1,
        description: `${input.serviceName} — parcela 1/2`,
        amount: first / 100,
        dueDate: input.developmentStartDate,
      },
      {
        kind: "setup_installment",
        installmentNumber: 2,
        description: `${input.serviceName} — parcela 2/2`,
        amount: (grossCents - first) / 100,
        dueDate: input.developmentEndDate,
      },
    )
  } else {
    const part = Math.floor(grossCents / 3)
    receivables.push(
      {
        kind: "setup_installment",
        installmentNumber: 1,
        description: `${input.serviceName} — parcela 1/3`,
        amount: part / 100,
        dueDate: input.developmentStartDate,
      },
      {
        kind: "setup_installment",
        installmentNumber: 2,
        description: `${input.serviceName} — parcela 2/3`,
        amount: part / 100,
        dueDate: input.developmentEndDate,
      },
      {
        kind: "setup_installment",
        installmentNumber: 3,
        description: `${input.serviceName} — parcela 3/3`,
        amount: (grossCents - part * 2) / 100,
        dueDate: iso(firstMonthly!),
      },
    )
  }

  if (monthlyCents > 0 && firstMonthly && dueDay != null) {
    let cursor = firstMonthly
    let sequence = 1
    while (cursor.getTime() <= contractEnd.getTime()) {
      receivables.push({
        kind: "monthly_fee",
        installmentNumber: sequence,
        description: `${input.serviceName} — mensalidade ${sequence}`,
        amount: monthlyCents / 100,
        dueDate: iso(cursor),
      })
      sequence += 1
      let year = cursor.getUTCFullYear()
      let month = cursor.getUTCMonth() + 1
      if (month > 11) {
        month = 0
        year += 1
      }
      cursor = dueDateInMonth(year, month, dueDay)
    }
  }

  return {
    grossAmount: grossCents / 100,
    discountPercent,
    finalAmount: finalCents / 100,
    receivables,
  }
}
