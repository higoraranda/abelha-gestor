import { Router } from "express"
import { authMiddleware } from "../middleware/auth"
import { tenantMiddleware } from "../middleware/tenant"
import { db } from "../db/index"

const router = Router()
router.use(authMiddleware, tenantMiddleware)

// GET /api/v1/companies
router.get("/", async (req, res) => {
  const orgId  = req.organizationId!
  const page   = Math.max(1, parseInt(req.query.page as string) || 1)
  const limit  = Math.min(100, parseInt(req.query.limit as string) || 50)
  const offset = (page - 1) * limit

  try {
const rows = await db`
      SELECT id, organization_id, name, cnpj, email, phone, notes, created_at
      FROM companies
      WHERE organization_id = ${orgId}
      ORDER BY name ASC
      LIMIT ${limit} OFFSET ${offset}
    `

    res.json(rows.map((r) => ({
      id:             r.id,
      organizationId: r.organization_id,
      name:           r.name,
      cnpj:           r.cnpj,
      email:          r.email,
      phone:          r.phone,
      notes:          r.notes,
      createdAt:      r.created_at,
    })))
  } catch (err) {
    console.error("[companies] GET /", err)
    res.status(500).json({ error: "Erro interno" })
  }
})

// GET /api/v1/companies/:id
router.get("/:id", async (req, res) => {
  const orgId = req.organizationId!
  const { id } = req.params

  try {
    const [co] = await db`
      SELECT id, organization_id, name, cnpj, email, phone, notes, created_at
      FROM companies
      WHERE id = ${id} AND organization_id = ${orgId}
    `
    if (!co) return res.status(404).json({ error: "Empresa não encontrada" })

    const contacts = await db`
      SELECT id, name, role, email, whatsapp, created_at
      FROM company_contacts
      WHERE company_id = ${id} AND organization_id = ${orgId}
      ORDER BY name ASC
    `

    const reminders = await db`
      SELECT id, title, description, due_at, completed, created_at
      FROM reminders
      WHERE linked_type = 'company' AND linked_id = ${id} AND organization_id = ${orgId}
      ORDER BY due_at ASC
    `

    res.json({
      id:             co.id,
      organizationId: co.organization_id,
      name:           co.name,
      cnpj:           co.cnpj,
      email:          co.email,
      phone:          co.phone,
      notes:          co.notes,
      createdAt:      co.created_at,
      contacts: contacts.map((c) => ({
        id:        c.id,
        name:      c.name,
        role:      c.role,
        email:     c.email,
        whatsapp:  c.whatsapp,
        createdAt: c.created_at,
      })),
      reminders: reminders.map((r) => ({
        id:          r.id,
        title:       r.title,
        description: r.description,
        dueAt:       r.due_at,
        completed:   r.completed,
        createdAt:   r.created_at,
      })),
    })
  } catch (err) {
    console.error("[companies] GET /:id", err)
    res.status(500).json({ error: "Erro interno" })
  }
})

// POST /api/v1/companies
router.post("/", async (req, res) => {
  const orgId = req.organizationId!
  const { name, cnpj, email, phone, notes } = req.body

  if (!name?.trim()) {
    return res.status(400).json({ error: "name é obrigatório" })
  }

  try {
    const [co] = await db`
      INSERT INTO companies (organization_id, name, cnpj, email, phone, notes)
      VALUES (${orgId}, ${name.trim()}, ${cnpj || null}, ${email || null}, ${phone || null}, ${notes || null})
      RETURNING id, organization_id, name, cnpj, email, phone, notes, created_at
    `

    res.status(201).json({
      id:             co.id,
      organizationId: co.organization_id,
      name:           co.name,
      cnpj:           co.cnpj,
      email:          co.email,
      phone:          co.phone,
      notes:          co.notes,
      createdAt:      co.created_at,
    })
  } catch (err) {
    console.error("[companies] POST /", err)
    res.status(500).json({ error: "Erro interno" })
  }
})

// PATCH /api/v1/companies/:id
router.patch("/:id", async (req, res) => {
  const orgId = req.organizationId!
  const { id } = req.params

  try {
    const [existing] = await db`
      SELECT id FROM companies WHERE id = ${id} AND organization_id = ${orgId}
    `
    if (!existing) return res.status(404).json({ error: "Empresa não encontrada" })

    const allowed = ["name", "cnpj", "email", "phone", "notes"] as const
    const updates: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in req.body) updates[key] = req.body[key] ?? null
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "Nenhum campo para atualizar" })
    }

    const [co] = await db`
      UPDATE companies SET ${db(updates)}
      WHERE id = ${id} AND organization_id = ${orgId}
      RETURNING id, organization_id, name, cnpj, email, phone, notes, created_at
    `

    res.json({
      id:             co.id,
      organizationId: co.organization_id,
      name:           co.name,
      cnpj:           co.cnpj,
      email:          co.email,
      phone:          co.phone,
      notes:          co.notes,
      createdAt:      co.created_at,
    })
  } catch (err) {
    console.error("[companies] PATCH /:id", err)
    res.status(500).json({ error: "Erro interno" })
  }
})

// DELETE /api/v1/companies/:id
router.delete("/:id", async (req, res) => {
  const orgId = req.organizationId!
  const { id } = req.params

  try {
    const [deleted] = await db`
      DELETE FROM companies
      WHERE id = ${id} AND organization_id = ${orgId}
      RETURNING id
    `
    if (!deleted) return res.status(404).json({ error: "Empresa não encontrada" })
    res.status(204).send()
  } catch (err) {
    console.error("[companies] DELETE /:id", err)
    res.status(500).json({ error: "Erro interno" })
  }
})

export default router
