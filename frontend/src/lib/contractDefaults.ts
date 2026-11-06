import type { NewContractInput } from '@/types'

function isoOffset(days: number) {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

export function emptyContract(): NewContractInput {
  return {
    catalogItemId: null,
    serviceName: '',
    serviceDescription: '',
    grossAmount: 0,
    paymentMethod: 'two_installments',
    monthlyFee: 0,
    monthlyDueDay: 10,
    developmentStartDate: isoOffset(0),
    developmentEndDate: isoOffset(30),
    contractEndDate: isoOffset(365),
    notes: '',
  }
}

