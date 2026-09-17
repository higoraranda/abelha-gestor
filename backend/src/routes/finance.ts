import { Router } from "express"
import { authMiddleware } from "../middleware/auth"
import { tenantMiddleware } from "../middleware/tenant"
import { db } from "../db/index"
import { mapReceivable } from "../services/contract-store"

const router = Router()
router.use(authMiddleware, tenantMiddleware)

router.get("/summary", async (req, res) => {
  const orgId = req.organizationId!
  try {
    const [totals] = await db`
      SELECT
        COALESCE(SUM(amount) FILTER (
          WHERE status = 'paid' AND paid_at >= date_trunc('month', CURRENT_DATE)
            AND paid_at < date_trunc('month', CURRENT_DATE) + interval '1 month'
        ), 0) AS received_month,
        COALESCE(SUM(amount) FILTER (WHERE status = 'open' AND due_date >= CURRENT_DATE), 0) AS open_amount,
        COALESCE(SUM(amount) FILTER (WHERE status = 'open' AND due_date < CURRENT_DATE), 0) AS overdue_amount,
        COALESCE(SUM(amount) FILTER (WHERE status <> 'cancelled'), 0) AS projected_total,
        COALESCE((
          SELECT SUM(cc.monthly_fee)
          FROM client_contracts cc
          WHERE cc.organization_id = ${orgId}
            AND cc.status = 'active'
            AND cc.monthly_fee > 0
            AND cc.development_end_date <= CURRENT_DATE
            AND cc.contract_end_date >= CURRENT_DATE
        ), 0) AS active_mrr
      FROM receivables WHERE organization_id = ${orgId}
    `
    const monthly = await db`
      WITH months AS (
        SELECT generate_series(
          date_trunc('month', CURRENT_DATE) - interval '5 months',
          date_trunc('month', CURRENT_DATE), interval '1 month'
        )::date AS month
      )
      SELECT months.month,
        COALESCE((SELECT SUM(r.amount) FROM receivables r
          WHERE r.organization_id = ${orgId} AND r.status = 'paid'
            AND date_trunc('month', r.paid_at) = months.month), 0) AS received,
        COALESCE((SELECT SUM(r.amount) FROM receivables r
          WHERE r.organization_id = ${orgId} AND r.status <> 'cancelled'
            AND date_trunc('month', r.due_date) = months.month), 0) AS projected
      FROM months ORDER BY months.month
    `
    res.json({
      receivedMonth: Number(totals.received_month),
      openAmount: Number(totals.open_amount),
      overdueAmount: Number(totals.overdue_amount),
      projectedTotal: Number(totals.projected_total),
      activeMrr: Number(totals.active_mrr),
      monthly: monthly.map((row) => ({ month: row.month, received: Number(row.received), projected: Number(row.projected) })),
    })
  } catch (error) {
    console.error("[finance] GET /summary", error)
    res.status(500).json({ error: "Erro ao carregar o resumo financeiro" })
  }
})

router.get("/receivables", async (req, res) => {
  const orgId = req.organizationId!
  const search = String(req.query.search ?? "").trim()
  const status = String(req.query.status ?? "all")
  const from = String(req.query.from ?? "").trim()
  const to = String(req.query.to ?? "").trim()
  const descending = req.query.order === "desc"
  try {
    const rows = await db`
      SELECT r.*, cl.name AS client_name, cc.service_name
      FROM receivables r
      JOIN clients cl ON cl.id = r.client_id AND cl.organization_id = ${orgId}
      JOIN client_contracts cc ON cc.id = r.contract_id AND cc.organization_id = ${orgId}
      WHERE r.organization_id = ${orgId}
        ${search ? db`AND (cl.name ILIKE ${`%${search}%`} OR cc.service_name ILIKE ${`%${search}%`})` : db``}
        ${status === "overdue" ? db`AND r.status = 'open' AND r.due_date < CURRENT_DATE` : db``}
        ${status === "open" ? db`AND r.status = 'open' AND r.due_date >= CURRENT_DATE` : db``}
        ${status === "paid" ? db`AND r.status = 'paid'` : db``}
        ${status === "cancelled" ? db`AND r.status = 'cancelled'` : db``}
        ${from ? db`AND r.due_date >= ${from}` : db``}
        ${to ? db`AND r.due_date <= ${to}` : db``}
      ORDER BY ${descending ? db`r.due_date DESC` : db`r.due_date ASC`}, r.created_at ASC
      LIMIT 500
    `
    res.json(rows.map((row) => ({ ...mapReceivable(row), clientName: row.client_name, serviceName: row.service_name })))
  } catch (error) {
    console.error("[finance] GET /receivables", error)
    res.status(500).json({ error: "Erro ao carregar cobranças" })
  }
})

router.patch("/receivables/:receivableId", async (req, res) => {
  const orgId = req.organizationId!
  const status = req.body.status
  if (!["paid", "open"].includes(status)) return res.status(400).json({ error: "Situação inválida" })
  const paidAt = status === "paid" ? (req.body.paidAt || new Date().toISOString().slice(0, 10)) : null
  try {
    const [row] = await db`
      UPDATE receivables SET status = ${status}, paid_at = ${paidAt}, updated_at = NOW()
      WHERE id = ${req.params.receivableId} AND organization_id = ${orgId} AND status <> 'cancelled'
      RETURNING *
    `
    if (!row) return res.status(404).json({ error: "Cobrança não encontrada" })
    const [related] = await db`
      SELECT cl.name AS client_name, cc.service_name
      FROM clients cl JOIN client_contracts cc ON cc.client_id = cl.id
      WHERE cl.id = ${row.client_id} AND cc.id = ${row.contract_id} AND cl.organization_id = ${orgId}
    `
    res.json({ ...mapReceivable(row), clientName: related.client_name, serviceName: related.service_name })
  } catch (error) {
    console.error("[finance] PATCH /receivables/:id", error)
    res.status(500).json({ error: "Erro ao atualizar cobrança" })
  }
})

export default router
