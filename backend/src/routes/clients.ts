import { Router } from "express"
import { authMiddleware } from "../middleware/auth"
import { tenantMiddleware } from "../middleware/tenant"
import { db } from "../db/index"

const router = Router()
router.use(authMiddleware, tenantMiddleware)

// GET /api/v1/clients
router.get("/", async (req, res) => {
  const orgId  = req.organizationId!
  const page   = Math.max(1, parseInt(req.query.page as string) || 1)
  const limit  = Math.min(50, parseInt(req.query.limit as string) || 30)
  const offset = (page - 1) * limit
  const search    = (req.query.search    as string) || ""
  const companyId = (req.query.company_id as string) || ""

  try {
    const rows = await db`
      SELECT
        cl.id, cl.organization_id, cl.company_id,
        cl.name, cl.email, cl.whatsapp, cl.notes, cl.created_at,
        co.id   AS company_id_val,
        co.name AS company_name
      FROM clients cl
      LEFT JOIN companies co ON co.id = cl.company_id
      WHERE cl.organization_id = ${orgId}
        ${companyId ? db`AND cl.company_id = ${companyId}` : db``}
        ${search
          ? db`AND (cl.name ILIKE ${"%" + search + "%"} OR cl.whatsapp ILIKE ${"%" + search + "%"})`
          : db``}
      ORDER BY cl.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `

    res.json(rows.map((r) => ({
      id:             r.id,
      organizationId: r.organization_id,
      companyId:      r.company_id,
      name:           r.name,
      email:          r.email,
      whatsapp:       r.whatsapp,
      notes:          r.notes,
      createdAt:      r.created_at,
      company: r.company_id_val ? { id: r.company_id_val, name: r.company_name } : null,
    })))
  } catch (err) {
    console.error("[clients] GET /", err)
    res.status(500).json({ error: "Erro interno" })
  }
})

// GET /api/v1/clients/:id
router.get("/:id", async (req, res) => {
  const orgId = req.organizationId!
  const { id } = req.params

  try {
    const [cl] = await db`
      SELECT
        cl.id, cl.organization_id, cl.company_id,
        cl.name, cl.email, cl.whatsapp, cl.notes, cl.created_at,
        co.id   AS company_id_val,
        co.name AS company_name
      FROM clients cl
      LEFT JOIN companies co ON co.id = cl.company_id
      WHERE cl.id = ${id} AND cl.organization_id = ${orgId}
    `

    if (!cl) return res.status(404).json({ error: "Cliente não encontrado" })

    const [conv] = await db`
      SELECT id, whatsapp_chat_id, last_message_at, unread_count
      FROM conversations
      WHERE client_id = ${id} AND organization_id = ${orgId}
      ORDER BY last_message_at DESC NULLS LAST
      LIMIT 1
    `

    let messages: object[] = []
    if (conv) {
      const rows = await db`
        SELECT * FROM (
          SELECT id, conversation_id, direction, content, created_at
          FROM messages
          WHERE conversation_id = ${conv.id} AND organization_id = ${orgId}
          ORDER BY created_at DESC
          LIMIT 50
        ) sub
        ORDER BY created_at ASC
      `
      messages = rows.map((m) => ({
        id:             m.id,
        conversationId: m.conversation_id,
        direction:      m.direction,
        content:        m.content,
        createdAt:      m.created_at,
      }))
    }

    res.json({
      id:             cl.id,
      organizationId: cl.organization_id,
      companyId:      cl.company_id,
      name:           cl.name,
      email:          cl.email,
      whatsapp:       cl.whatsapp,
      notes:          cl.notes,
      createdAt:      cl.created_at,
      company: cl.company_id_val ? { id: cl.company_id_val, name: cl.company_name } : null,
      conversation: conv ? {
        id:             conv.id,
        whatsappChatId: conv.whatsapp_chat_id,
        lastMessageAt:  conv.last_message_at,
        unreadCount:    conv.unread_count,
        messages,
      } : null,
    })
  } catch (err) {
    console.error("[clients] GET /:id", err)
    res.status(500).json({ error: "Erro interno" })
  }
})

// POST /api/v1/clients
router.post("/", async (req, res) => {
  const orgId = req.organizationId!
  const { name, whatsapp, email, notes, company_id } = req.body

  if (!company_id) {
    return res.status(400).json({ error: "company_id é obrigatório" })
  }

  try {
    const [company] = await db`
      SELECT id, name FROM companies WHERE id = ${company_id} AND organization_id = ${orgId}
    `
    if (!company) return res.status(404).json({ error: "Empresa não encontrada" })

    const [cl] = await db`
      INSERT INTO clients (organization_id, company_id, name, email, whatsapp, notes)
      VALUES (${orgId}, ${company_id}, ${name || null}, ${email || null}, ${whatsapp || null}, ${notes || null})
      RETURNING id, organization_id, company_id, name, email, whatsapp, notes, created_at
    `

    res.status(201).json({
      id:             cl.id,
      organizationId: cl.organization_id,
      companyId:      cl.company_id,
      name:           cl.name,
      email:          cl.email,
      whatsapp:       cl.whatsapp,
      notes:          cl.notes,
      createdAt:      cl.created_at,
      company: { id: company.id, name: company.name },
    })
  } catch (err: any) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Já existe um cliente com esse WhatsApp nessa organização" })
    }
    console.error("[clients] POST /", err)
    res.status(500).json({ error: "Erro interno" })
  }
})

// PATCH /api/v1/clients/:id
router.patch("/:id", async (req, res) => {
  const orgId = req.organizationId!
  const { id }  = req.params

  try {
    const [existing] = await db`
      SELECT id FROM clients WHERE id = ${id} AND organization_id = ${orgId}
    `
    if (!existing) return res.status(404).json({ error: "Cliente não encontrado" })

    const allowed = ["name", "email", "whatsapp", "notes", "company_id"] as const
    const updates: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in req.body) updates[key] = req.body[key] ?? null
    }

    if ("company_id" in updates && updates.company_id) {
      const [company] = await db`
        SELECT id FROM companies WHERE id = ${updates.company_id as string} AND organization_id = ${orgId}
      `
      if (!company) return res.status(404).json({ error: "Empresa não encontrada" })
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "Nenhum campo para atualizar" })
    }

    const [cl] = await db`
      UPDATE clients SET ${db(updates)}
      WHERE id = ${id} AND organization_id = ${orgId}
      RETURNING id, organization_id, company_id, name, email, whatsapp, notes, created_at
    `

    const coRows = cl.company_id
      ? await db`SELECT id, name FROM companies WHERE id = ${cl.company_id}`
      : []

    res.json({
      id:             cl.id,
      organizationId: cl.organization_id,
      companyId:      cl.company_id,
      name:           cl.name,
      email:          cl.email,
      whatsapp:       cl.whatsapp,
      notes:          cl.notes,
      createdAt:      cl.created_at,
      company: coRows[0] ? { id: coRows[0].id, name: coRows[0].name } : null,
    })
  } catch (err: any) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Já existe um cliente com esse WhatsApp nessa organização" })
    }
    console.error("[clients] PATCH /:id", err)
    res.status(500).json({ error: "Erro interno" })
  }
})

// DELETE /api/v1/clients/:id
router.delete("/:id", async (req, res) => {
  const orgId = req.organizationId!
  const { id } = req.params

  try {
    const [deleted] = await db`
      DELETE FROM clients
      WHERE id = ${id} AND organization_id = ${orgId}
      RETURNING id
    `
    if (!deleted) return res.status(404).json({ error: "Cliente não encontrado" })
    res.status(204).send()
  } catch (err) {
    console.error("[clients] DELETE /:id", err)
    res.status(500).json({ error: "Erro interno" })
  }
})

export default router
