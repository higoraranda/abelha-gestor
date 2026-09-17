import { Router } from "express"
import { authMiddleware } from "../middleware/auth"
import { tenantMiddleware } from "../middleware/tenant"
import { db } from "../db/index"
import { mapReceivable } from "../services/contract-store"

const router = Router()
router.use(authMiddleware, tenantMiddleware)

const EXPENSE_CATEGORIES = new Set(["subscriptions", "ads", "tools", "taxes", "services", "infrastructure", "other"])

function mapExpense(row: Record<string, any>) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    description: row.description,
    category: row.category,
    amount: Number(row.amount),
    expenseDate: row.expense_date,
    status: row.status,
    paidAt: row.paid_at,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

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
        ), 0) AS active_mrr,
        COALESCE((
          SELECT SUM(e.amount)
          FROM expenses e
          WHERE e.organization_id = ${orgId}
            AND e.status = 'paid'
            AND e.paid_at >= date_trunc('month', CURRENT_DATE)
            AND e.paid_at < date_trunc('month', CURRENT_DATE) + interval '1 month'
        ), 0) AS expenses_month
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
    const receivedMonth = Number(totals.received_month)
    const expensesMonth = Number(totals.expenses_month)
    res.json({
      receivedMonth,
      openAmount: Number(totals.open_amount),
      overdueAmount: Number(totals.overdue_amount),
      projectedTotal: Number(totals.projected_total),
      activeMrr: Number(totals.active_mrr),
      expensesMonth,
      balanceMonth: receivedMonth - expensesMonth,
      monthly: monthly.map((row) => ({ month: row.month, received: Number(row.received), projected: Number(row.projected) })),
    })
  } catch (error) {
    console.error("[finance] GET /summary", error)
    res.status(500).json({ error: "Erro ao carregar o resumo financeiro" })
  }
})

router.get("/clients", async (req, res) => {
  const orgId = req.organizationId!
  const search = String(req.query.search ?? "").trim()
  try {
    const rows = await db`
      SELECT
        cl.id AS client_id,
        cl.name AS client_name,
        cl.email,
        cl.whatsapp,
        COALESCE((SELECT STRING_AGG(DISTINCT cc.service_name, ', ' ORDER BY cc.service_name)
          FROM client_contracts cc
          WHERE cc.client_id = cl.id AND cc.organization_id = ${orgId}), '') AS service_names,
        COALESCE((SELECT SUM(r.amount) FROM receivables r
          WHERE r.client_id = cl.id AND r.organization_id = ${orgId} AND r.status <> 'cancelled'), 0) AS total_amount,
        COALESCE((SELECT SUM(r.amount) FROM receivables r
          WHERE r.client_id = cl.id AND r.organization_id = ${orgId} AND r.status = 'paid'), 0) AS paid_amount,
        COALESCE((SELECT SUM(r.amount) FROM receivables r
          WHERE r.client_id = cl.id AND r.organization_id = ${orgId} AND r.status = 'open'), 0) AS remaining_amount,
        COALESCE((SELECT SUM(r.amount) FROM receivables r
          WHERE r.client_id = cl.id AND r.organization_id = ${orgId}
            AND r.status = 'open' AND r.due_date < CURRENT_DATE), 0) AS overdue_amount,
        COALESCE((SELECT SUM(cc.monthly_fee) FROM client_contracts cc
          WHERE cc.client_id = cl.id AND cc.organization_id = ${orgId}
            AND cc.status = 'active' AND cc.monthly_fee > 0
            AND cc.development_end_date <= CURRENT_DATE AND cc.contract_end_date >= CURRENT_DATE), 0) AS active_mrr,
        (SELECT MIN(r.due_date) FROM receivables r
          WHERE r.client_id = cl.id AND r.organization_id = ${orgId} AND r.status = 'open') AS next_due_date
      FROM clients cl
      WHERE cl.organization_id = ${orgId}
        AND EXISTS (SELECT 1 FROM client_contracts cc WHERE cc.client_id = cl.id AND cc.organization_id = ${orgId})
        ${search ? db`AND (
          cl.name ILIKE ${`%${search}%`} OR cl.email ILIKE ${`%${search}%`} OR cl.whatsapp ILIKE ${`%${search}%`}
          OR EXISTS (SELECT 1 FROM client_contracts cc WHERE cc.client_id = cl.id AND cc.organization_id = ${orgId} AND cc.service_name ILIKE ${`%${search}%`})
        )` : db``}
      ORDER BY
        (SELECT COALESCE(SUM(r.amount), 0) FROM receivables r
          WHERE r.client_id = cl.id AND r.organization_id = ${orgId} AND r.status = 'open' AND r.due_date < CURRENT_DATE) DESC,
        (SELECT COALESCE(SUM(r.amount), 0) FROM receivables r
          WHERE r.client_id = cl.id AND r.organization_id = ${orgId} AND r.status = 'open') DESC,
        cl.name NULLS LAST
    `
    res.json(rows.map((row) => ({
      clientId: row.client_id,
      clientName: row.client_name,
      email: row.email,
      whatsapp: row.whatsapp,
      serviceNames: row.service_names,
      totalAmount: Number(row.total_amount),
      paidAmount: Number(row.paid_amount),
      remainingAmount: Number(row.remaining_amount),
      overdueAmount: Number(row.overdue_amount),
      activeMrr: Number(row.active_mrr),
      nextDueDate: row.next_due_date,
    })))
  } catch (error) {
    console.error("[finance] GET /clients", error)
    res.status(500).json({ error: "Erro ao carregar clientes do financeiro" })
  }
})

router.get("/clients/:clientId", async (req, res) => {
  const orgId = req.organizationId!
  const clientId = req.params.clientId
  try {
    const [client] = await db`
      SELECT id, name, email, whatsapp FROM clients
      WHERE id = ${clientId} AND organization_id = ${orgId}
    `
    if (!client) return res.status(404).json({ error: "Cliente não encontrado" })

    const rows = await db`
      SELECT r.*, cc.service_name
      FROM receivables r
      JOIN client_contracts cc ON cc.id = r.contract_id AND cc.organization_id = ${orgId}
      WHERE r.client_id = ${clientId} AND r.organization_id = ${orgId}
      ORDER BY r.due_date ASC, r.created_at ASC
    `
    const receivables = rows.map((row) => ({ ...mapReceivable(row), clientName: client.name, serviceName: row.service_name }))
    const activeMrrRows = await db`
      SELECT
        COALESCE((SELECT SUM(monthly_fee) FROM client_contracts
          WHERE client_id = ${clientId} AND organization_id = ${orgId}
            AND status = 'active' AND development_end_date <= CURRENT_DATE AND contract_end_date >= CURRENT_DATE), 0) AS active_mrr,
        COALESCE((SELECT STRING_AGG(DISTINCT service_name, ', ' ORDER BY service_name) FROM client_contracts
          WHERE client_id = ${clientId} AND organization_id = ${orgId} AND status <> 'cancelled'), '') AS service_names
    `
    const totalAmount = receivables.filter((item) => item.status !== "cancelled").reduce((sum, item) => sum + item.amount, 0)
    const paidAmount = receivables.filter((item) => item.status === "paid").reduce((sum, item) => sum + item.amount, 0)
    const remainingAmount = receivables.filter((item) => item.status === "open" || item.status === "overdue").reduce((sum, item) => sum + item.amount, 0)
    const overdueAmount = receivables.filter((item) => item.status === "overdue").reduce((sum, item) => sum + item.amount, 0)
    const nextDueDate = receivables.find((item) => item.status === "open" || item.status === "overdue")?.dueDate ?? null

    res.json({
      clientId: client.id,
      clientName: client.name,
      email: client.email,
      whatsapp: client.whatsapp,
      serviceNames: activeMrrRows[0]?.service_names ?? "",
      totalAmount,
      paidAmount,
      remainingAmount,
      overdueAmount,
      activeMrr: Number(activeMrrRows[0]?.active_mrr ?? 0),
      nextDueDate,
      receivables,
    })
  } catch (error) {
    console.error("[finance] GET /clients/:clientId", error)
    res.status(500).json({ error: "Erro ao carregar ficha financeira do cliente" })
  }
})

router.get("/expenses", async (req, res) => {
  const orgId = req.organizationId!
  const search = String(req.query.search ?? "").trim()
  const category = String(req.query.category ?? "all")
  const status = String(req.query.status ?? "all")
  try {
    const rows = await db`
      SELECT * FROM expenses
      WHERE organization_id = ${orgId}
        ${search ? db`AND (description ILIKE ${`%${search}%`} OR notes ILIKE ${`%${search}%`})` : db``}
        ${category !== "all" && EXPENSE_CATEGORIES.has(category) ? db`AND category = ${category}` : db``}
        ${status === "paid" || status === "planned" ? db`AND status = ${status}` : db``}
      ORDER BY expense_date DESC, created_at DESC
      LIMIT 500
    `
    res.json(rows.map(mapExpense))
  } catch (error) {
    console.error("[finance] GET /expenses", error)
    res.status(500).json({ error: "Erro ao carregar gastos" })
  }
})

router.post("/expenses", async (req, res) => {
  const orgId = req.organizationId!
  const description = String(req.body.description ?? "").trim()
  const category = String(req.body.category ?? "other")
  const amount = Number(req.body.amount)
  const expenseDate = String(req.body.expenseDate ?? "")
  const status = req.body.status === "planned" ? "planned" : "paid"
  const notes = String(req.body.notes ?? "").trim() || null
  if (!description) return res.status(400).json({ error: "Informe a descrição do gasto" })
  if (!EXPENSE_CATEGORIES.has(category)) return res.status(400).json({ error: "Categoria inválida" })
  if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: "Informe um valor válido" })
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expenseDate)) return res.status(400).json({ error: "Informe a data do gasto" })
  try {
    const [row] = await db`
      INSERT INTO expenses (organization_id, description, category, amount, expense_date, status, paid_at, notes)
      VALUES (${orgId}, ${description}, ${category}, ${amount}, ${expenseDate}, ${status}, ${status === "paid" ? expenseDate : null}, ${notes})
      RETURNING *
    `
    res.status(201).json(mapExpense(row))
  } catch (error) {
    console.error("[finance] POST /expenses", error)
    res.status(500).json({ error: "Erro ao registrar gasto" })
  }
})

router.patch("/expenses/:expenseId", async (req, res) => {
  const orgId = req.organizationId!
  const status = req.body.status
  if (status !== "paid" && status !== "planned") return res.status(400).json({ error: "Situação inválida" })
  const paidAt = status === "paid" ? (req.body.paidAt || new Date().toISOString().slice(0, 10)) : null
  try {
    const [row] = await db`
      UPDATE expenses SET status = ${status}, paid_at = ${paidAt}, updated_at = NOW()
      WHERE id = ${req.params.expenseId} AND organization_id = ${orgId}
      RETURNING *
    `
    if (!row) return res.status(404).json({ error: "Gasto não encontrado" })
    res.json(mapExpense(row))
  } catch (error) {
    console.error("[finance] PATCH /expenses/:expenseId", error)
    res.status(500).json({ error: "Erro ao atualizar gasto" })
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
