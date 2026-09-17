import { Router } from "express"
import { authMiddleware } from "../middleware/auth"
import { tenantMiddleware } from "../middleware/tenant"
import { db } from "../db/index"
import { buildContractSchedule } from "../services/contracts"
import { mapContract, resolveContractInput } from "../services/contract-store"

const router = Router()
router.use(authMiddleware, tenantMiddleware)

const STRUCTURE_FIELDS = new Set([
  "catalogItemId", "serviceName", "grossAmount", "paymentMethod", "monthlyFee", "monthlyDueDay",
  "developmentStartDate", "developmentEndDate", "contractEndDate",
])

router.patch("/:contractId", async (req, res) => {
  const orgId = req.organizationId!
  try {
    const result = await db.begin(async (sql) => {
      const [current] = await sql`
        SELECT * FROM client_contracts
        WHERE id = ${req.params.contractId} AND organization_id = ${orgId}
        FOR UPDATE
      `
      if (!current) throw new Error("Contrato não encontrado")

      const status = req.body.status ?? current.status
      if (!["active", "completed", "cancelled"].includes(status)) throw new Error("Situação do contrato inválida")

      if (status === "cancelled") {
        const [updated] = await sql`
          UPDATE client_contracts SET status = 'cancelled', updated_at = NOW()
          WHERE id = ${current.id} AND organization_id = ${orgId}
          RETURNING *
        `
        await sql`
          UPDATE receivables SET status = 'cancelled', updated_at = NOW()
          WHERE contract_id = ${current.id} AND organization_id = ${orgId} AND status = 'open'
        `
        const receivables = await sql`SELECT * FROM receivables WHERE contract_id = ${current.id} ORDER BY due_date`
        return mapContract(updated, receivables)
      }

      const changesStructure = Object.keys(req.body).some((key) => STRUCTURE_FIELDS.has(key))
      if (changesStructure) {
        const [paid] = await sql`
          SELECT id FROM receivables
          WHERE contract_id = ${current.id} AND organization_id = ${orgId} AND status = 'paid'
          LIMIT 1
        `
        if (paid) throw new Error("Reabra as cobranças pagas antes de alterar valores ou parcelamento")
      }

      const merged = {
        catalogItemId: "catalogItemId" in req.body ? req.body.catalogItemId : current.catalog_item_id,
        serviceName: req.body.serviceName ?? current.service_name,
        serviceDescription: "serviceDescription" in req.body ? req.body.serviceDescription : current.service_description,
        serviceSnapshot: current.service_snapshot,
        grossAmount: req.body.grossAmount ?? Number(current.gross_amount),
        paymentMethod: req.body.paymentMethod ?? current.payment_method,
        monthlyFee: req.body.monthlyFee ?? Number(current.monthly_fee),
        monthlyDueDay: "monthlyDueDay" in req.body ? req.body.monthlyDueDay : current.monthly_due_day,
        developmentStartDate: req.body.developmentStartDate ?? current.development_start_date,
        developmentEndDate: req.body.developmentEndDate ?? current.development_end_date,
        contractEndDate: req.body.contractEndDate ?? current.contract_end_date,
        notes: "notes" in req.body ? req.body.notes : current.notes,
      }
      const input = await resolveContractInput(sql, orgId, merged)
      const schedule = buildContractSchedule(input)
      const [updated] = await sql`
        UPDATE client_contracts SET
          catalog_item_id = ${input.catalogItemId ?? null}, service_name = ${input.serviceName},
          service_description = ${input.serviceDescription ?? null}, service_snapshot = ${sql.json((input.serviceSnapshot ?? {}) as any)},
          gross_amount = ${schedule.grossAmount}, discount_percent = ${schedule.discountPercent},
          final_amount = ${schedule.finalAmount}, payment_method = ${input.paymentMethod},
          monthly_fee = ${input.monthlyFee ?? 0}, monthly_due_day = ${input.monthlyDueDay ?? null},
          development_start_date = ${input.developmentStartDate}, development_end_date = ${input.developmentEndDate},
          contract_end_date = ${input.contractEndDate}, notes = ${input.notes ?? null}, status = ${status}, updated_at = NOW()
        WHERE id = ${current.id} AND organization_id = ${orgId}
        RETURNING *
      `

      if (changesStructure) {
        await sql`DELETE FROM receivables WHERE contract_id = ${current.id} AND organization_id = ${orgId}`
        for (const item of schedule.receivables) {
          await sql`
            INSERT INTO receivables (
              organization_id, client_id, contract_id, kind, installment_number, description, amount, due_date
            ) VALUES (
              ${orgId}, ${current.client_id}, ${current.id}, ${item.kind}, ${item.installmentNumber},
              ${item.description}, ${item.amount}, ${item.dueDate}
            )
          `
        }
      }
      const receivables = await sql`SELECT * FROM receivables WHERE contract_id = ${current.id} ORDER BY due_date, created_at`
      return mapContract(updated, receivables)
    })
    res.json(result)
  } catch (error: any) {
    if (error instanceof Error && !(error as any).code) {
      const status = error.message === "Contrato não encontrado" ? 404 : error.message.startsWith("Reabra") ? 409 : 400
      return res.status(status).json({ error: error.message })
    }
    console.error("[contracts] PATCH", error)
    res.status(500).json({ error: "Erro ao atualizar contrato" })
  }
})

export default router
