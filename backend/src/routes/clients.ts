import { Router } from "express"
import { authMiddleware } from "../middleware/auth"
import { tenantMiddleware } from "../middleware/tenant"
import { db } from "../db/index"
import { insertContract, mapContract } from "../services/contract-store"

const router = Router()
router.use(authMiddleware, tenantMiddleware)

function mapClient(row: Record<string, any>) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    email: row.email,
    whatsapp: row.whatsapp,
    notes: row.notes,
    createdAt: row.created_at,
    favorite: Boolean(row.favorite),
    totalCount: row.total_count == null ? undefined : Number(row.total_count),
    activeService: row.active_service ?? null,
    monthlyFee: row.monthly_fee == null ? null : Number(row.monthly_fee),
    contractEndDate: row.contract_end_date ?? null,
    financialStatus: row.financial_status ?? null,
  }
}

router.get("/", async (req, res) => {
  const orgId = req.organizationId!
  const page = Math.max(1, Number.parseInt(String(req.query.page ?? "1"), 10) || 1)
  const limit = Math.min(100, Number.parseInt(String(req.query.limit ?? "50"), 10) || 50)
  const offset = (page - 1) * limit
  const search = String(req.query.search ?? "").trim()
  const service = String(req.query.service ?? '').trim()
  const financial = String(req.query.financial ?? '')
  if (!['','open','overdue','paid','none'].includes(financial)) return res.status(400).json({error:'Filtro financeiro inválido'})

  try {
    const rows = await db`
      SELECT cl.id, cl.organization_id, cl.name, cl.email, cl.whatsapp, cl.notes, cl.created_at, cl.favorite, count(*) OVER()::int AS total_count,
        current_contract.service_name AS active_service,
        current_contract.monthly_fee,
        current_contract.contract_end_date,
        CASE
          WHEN EXISTS (
            SELECT 1 FROM receivables r
            WHERE r.client_id = cl.id AND r.organization_id = ${orgId}
              AND r.status = 'open' AND r.due_date < (NOW() AT TIME ZONE 'America/Sao_Paulo')::date
          ) THEN 'overdue'
          WHEN EXISTS (
            SELECT 1 FROM receivables r
            WHERE r.client_id = cl.id AND r.organization_id = ${orgId} AND r.status = 'open'
          ) THEN 'open'
          WHEN EXISTS (
            SELECT 1 FROM receivables r
            WHERE r.client_id = cl.id AND r.organization_id = ${orgId} AND r.status = 'paid'
          ) THEN 'paid'
          ELSE NULL
        END AS financial_status
      FROM clients cl
      LEFT JOIN LATERAL (
        SELECT service_name, monthly_fee, contract_end_date
        FROM client_contracts cc
        WHERE cc.client_id = cl.id AND cc.organization_id = ${orgId} AND cc.status <> 'cancelled'
        ORDER BY (cc.status = 'active') DESC, cc.created_at DESC
        LIMIT 1
      ) current_contract ON TRUE
      WHERE cl.organization_id = ${orgId}
        ${req.query.favorites === 'true' ? db`AND cl.favorite` : db``}
        ${service ? db`AND EXISTS (SELECT 1 FROM client_contracts fc WHERE fc.organization_id=${orgId} AND fc.client_id=cl.id AND fc.status<>'cancelled' AND fc.service_name=${service})` : db``}
        ${financial === 'overdue' ? db`AND EXISTS(SELECT 1 FROM receivables fr WHERE fr.organization_id=${orgId} AND fr.client_id=cl.id AND fr.status='open' AND fr.due_date<(NOW() AT TIME ZONE 'America/Sao_Paulo')::date)` : db``}
        ${financial === 'open' ? db`AND EXISTS(SELECT 1 FROM receivables fr WHERE fr.organization_id=${orgId} AND fr.client_id=cl.id AND fr.status='open' AND fr.due_date>=(NOW() AT TIME ZONE 'America/Sao_Paulo')::date)` : db``}
        ${financial === 'paid' ? db`AND EXISTS(SELECT 1 FROM receivables fr WHERE fr.organization_id=${orgId} AND fr.client_id=cl.id AND fr.status='paid') AND NOT EXISTS(SELECT 1 FROM receivables fr WHERE fr.organization_id=${orgId} AND fr.client_id=cl.id AND fr.status='open')` : db``}
        ${financial === 'none' ? db`AND NOT EXISTS(SELECT 1 FROM receivables fr WHERE fr.organization_id=${orgId} AND fr.client_id=cl.id AND fr.status<>'cancelled')` : db``}
        ${search ? db`AND (
          cl.name ILIKE ${`%${search}%`} OR cl.whatsapp ILIKE ${`%${search}%`} OR
          cl.email ILIKE ${`%${search}%`} OR EXISTS (
            SELECT 1 FROM client_contracts sc
            WHERE sc.client_id = cl.id AND sc.organization_id = ${orgId}
              AND sc.service_name ILIKE ${`%${search}%`}
          )
        )` : db``}
      ORDER BY cl.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `
    res.json(rows.map(mapClient))
  } catch (error:any) {
    if(error.code==='42703') return res.status(503).json({error:"A atualização do banco ainda não foi aplicada. Os registros existentes foram preservados."})
    console.error("[clients] GET /", error)
    res.status(500).json({ error: "Erro ao carregar clientes" })
  }
})

router.get("/:id", async (req, res) => {
  const orgId = req.organizationId!
  try {
    const [client] = await db`
      SELECT * FROM clients WHERE id = ${req.params.id} AND organization_id = ${orgId}
    `
    if (!client) return res.status(404).json({ error: "Cliente não encontrado" })

    const contracts = await db`
      SELECT * FROM client_contracts
      WHERE client_id = ${client.id} AND organization_id = ${orgId}
      ORDER BY created_at DESC
    `
    const receivables = contracts.length ? await db`
      SELECT * FROM receivables
      WHERE client_id = ${client.id} AND organization_id = ${orgId}
      ORDER BY due_date ASC, created_at ASC
    ` : []
    const byContract = new Map<string, Record<string, any>[]>()
    for (const item of receivables) {
      const group = byContract.get(item.contract_id) ?? []
      group.push(item)
      byContract.set(item.contract_id, group)
    }

    res.json({
      ...mapClient(client),
      contracts: contracts.map((contract) => mapContract(contract, byContract.get(contract.id) ?? [])),
    })
  } catch (error) {
    console.error("[clients] GET /:id", error)
    res.status(500).json({ error: "Erro ao carregar o cliente" })
  }
})

router.post("/", async (req, res) => {
  const orgId = req.organizationId!
  const { name, whatsapp, email, notes, initialContract } = req.body
  if (!String(name ?? "").trim()) return res.status(400).json({ error: "Nome é obrigatório" })

  try {
    const result = await db.begin(async (sql) => {
      const [client] = await sql`
        INSERT INTO clients (organization_id, name, email, whatsapp, notes)
        VALUES (${orgId}, ${String(name).trim()}, ${email || null}, ${whatsapp || null}, ${notes || null})
        RETURNING *
      `
      const contract = initialContract
        ? await insertContract(sql, orgId, client.id, initialContract)
        : null
      return { ...mapClient(client), contracts: contract ? [contract] : [] }
    })
    res.status(201).json(result)
  } catch (error: any) {
    if (error.code === "23505") return res.status(409).json({ error: "Já existe um cliente com esse WhatsApp nessa organização" })
    if (error instanceof Error && !(error as any).code) return res.status(400).json({ error: error.message })
    console.error("[clients] POST /", error)
    res.status(500).json({ error: "Erro ao criar cliente" })
  }
})

router.post("/:clientId/contracts", async (req, res) => {
  const orgId = req.organizationId!
  try {
    const result = await db.begin(async (sql) => {
      const [client] = await sql`
        SELECT id FROM clients WHERE id = ${req.params.clientId} AND organization_id = ${orgId}
      `
      if (!client) throw new Error("Cliente não encontrado")
      return insertContract(sql, orgId, client.id, req.body)
    })
    res.status(201).json(result)
  } catch (error: any) {
    if (error instanceof Error && !(error as any).code) return res.status(error.message === "Cliente não encontrado" ? 404 : 400).json({ error: error.message })
    console.error("[clients] POST /:clientId/contracts", error)
    res.status(500).json({ error: "Erro ao criar contrato" })
  }
})

router.patch("/:id", async (req, res) => {
  const orgId = req.organizationId!
  const allowed = ["name", "email", "whatsapp", "notes", "favorite"] as const
  const updates: Record<string, unknown> = {}
  for (const key of allowed) if (key in req.body) updates[key] = req.body[key] ?? null
  if ('favorite' in updates && typeof updates.favorite !== 'boolean') return res.status(400).json({error:'Favorito inválido'})
  if (!Object.keys(updates).length) return res.status(400).json({ error: "Nenhum campo para atualizar" })

  try {
    const [client] = await db`
      UPDATE clients SET ${db(updates)}
      WHERE id = ${req.params.id} AND organization_id = ${orgId}
      RETURNING *
    `
    if (!client) return res.status(404).json({ error: "Cliente não encontrado" })
    res.json(mapClient(client))
  } catch (error: any) {
    if (error.code === "23505") return res.status(409).json({ error: "Já existe um cliente com esse WhatsApp nessa organização" })
    console.error("[clients] PATCH /:id", error)
    res.status(500).json({ error: "Erro ao atualizar cliente" })
  }
})

router.delete("/:id", async (req, res) => {
  const orgId = req.organizationId!

  try {
    const [client] = await db`
      DELETE FROM clients
      WHERE id = ${req.params.id} AND organization_id = ${orgId}
      RETURNING id
    `
    if (!client) return res.status(404).json({ error: "Cliente não encontrado" })
    res.status(204).send()
  } catch (error) {
    console.error("[clients] DELETE /:id", error)
    res.status(500).json({ error: "Erro ao excluir cliente" })
  }
})

export default router
