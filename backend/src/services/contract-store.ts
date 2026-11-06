import { buildContractSchedule, type NewContractInput } from "./contracts"
import { businessDay, civilKey } from './crm'

export function mapReceivable(row: Record<string, any>) {
  const dynamicStatus = row.status === "open" && civilKey(row.due_date) < businessDay()
    ? "overdue"
    : row.status
  return {
    id: row.id,
    organizationId: row.organization_id,
    clientId: row.client_id,
    contractId: row.contract_id,
    kind: row.kind,
    installmentNumber: row.installment_number,
    description: row.description,
    amount: Number(row.amount),
    dueDate: civilKey(row.due_date),
    status: dynamicStatus,
    paidAt: row.paid_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function mapContract(row: Record<string, any>, receivables: Record<string, any>[] = []) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    clientId: row.client_id,
    catalogItemId: row.catalog_item_id,
    serviceName: row.service_name,
    serviceDescription: row.service_description,
    serviceSnapshot: row.service_snapshot ?? {},
    grossAmount: Number(row.gross_amount),
    discountPercent: Number(row.discount_percent),
    finalAmount: Number(row.final_amount),
    paymentMethod: row.payment_method,
    monthlyFee: Number(row.monthly_fee),
    monthlyDueDay: row.monthly_due_day,
    developmentStartDate: civilKey(row.development_start_date),
    developmentEndDate: civilKey(row.development_end_date),
    contractEndDate: civilKey(row.contract_end_date),
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    receivables: receivables.map(mapReceivable),
  }
}

export async function resolveContractInput(sql: any, organizationId: string, raw: Record<string, any>): Promise<NewContractInput> {
  const catalogItemId = raw.catalogItemId || null
  let catalogItem: Record<string, any> | null = null
  if (catalogItemId) {
    const [row] = await sql`
      SELECT * FROM catalog_items
      WHERE id = ${catalogItemId} AND organization_id = ${organizationId} AND active = TRUE
    `
    if (!row) throw new Error("Serviço do catálogo não encontrado")
    catalogItem = row
  }

  return {
    catalogItemId,
    serviceName: String(raw.serviceName || catalogItem?.name || "").trim(),
    serviceDescription: raw.serviceDescription ?? catalogItem?.description ?? null,
    serviceSnapshot: catalogItem ? {
      id: catalogItem.id,
      code: catalogItem.code,
      name: catalogItem.name,
      category: catalogItem.category,
      basePrice: Number(catalogItem.base_price),
      setupPrice: catalogItem.setup_price == null ? null : Number(catalogItem.setup_price),
      monthlyPrice: catalogItem.monthly_price == null ? null : Number(catalogItem.monthly_price),
    } : (raw.serviceSnapshot ?? { custom: true }),
    grossAmount: Number(raw.grossAmount),
    paymentMethod: raw.paymentMethod,
    monthlyFee: Number(raw.monthlyFee ?? 0),
    monthlyDueDay: raw.monthlyDueDay == null || raw.monthlyDueDay === "" ? null : Number(raw.monthlyDueDay),
    developmentStartDate: raw.developmentStartDate,
    developmentEndDate: raw.developmentEndDate,
    contractEndDate: raw.contractEndDate,
    notes: raw.notes ?? null,
  }
}

export async function insertContract(sql: any, organizationId: string, clientId: string, raw: Record<string, any>) {
  const input = await resolveContractInput(sql, organizationId, raw)
  const schedule = buildContractSchedule(input)
  const [contract] = await sql`
    INSERT INTO client_contracts (
      organization_id, client_id, catalog_item_id, service_name, service_description,
      service_snapshot, gross_amount, discount_percent, final_amount, payment_method,
      monthly_fee, monthly_due_day, development_start_date, development_end_date,
      contract_end_date, notes
    ) VALUES (
      ${organizationId}, ${clientId}, ${input.catalogItemId ?? null}, ${input.serviceName},
      ${input.serviceDescription ?? null}, ${sql.json(input.serviceSnapshot ?? {})},
      ${schedule.grossAmount}, ${schedule.discountPercent}, ${schedule.finalAmount}, ${input.paymentMethod},
      ${input.monthlyFee ?? 0}, ${input.monthlyDueDay ?? null}, ${input.developmentStartDate},
      ${input.developmentEndDate}, ${input.contractEndDate}, ${input.notes ?? null}
    )
    RETURNING *
  `

  const receivables: Record<string, any>[] = []
  for (const item of schedule.receivables) {
    const [row] = await sql`
      INSERT INTO receivables (
        organization_id, client_id, contract_id, kind, installment_number,
        description, amount, due_date
      ) VALUES (
        ${organizationId}, ${clientId}, ${contract.id}, ${item.kind}, ${item.installmentNumber},
        ${item.description}, ${item.amount}, ${item.dueDate}
      )
      RETURNING *
    `
    receivables.push(row)
  }
  return mapContract(contract, receivables)
}
