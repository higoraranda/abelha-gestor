import { Router } from "express"
import { authMiddleware } from "../middleware/auth"
import { tenantMiddleware } from "../middleware/tenant"
import { db } from "../db/index"

const router = Router()
router.use(authMiddleware, tenantMiddleware)

function mapReminder(r: Record<string, unknown>) {
  return {
    id:             r.id,
    organizationId: r.organization_id,
    title:          r.title,
    description:    r.description,
    dueAt:          r.due_at,
    completed:      r.completed,
    linkedType:     r.linked_type,
    linkedId:       r.linked_id,
    createdAt:      r.created_at,
  }
}

// GET /api/v1/reminders
router.get("/", async (req, res) => {
  const orgId      = req.organizationId!
  const linkedType = (req.query.linked_type as string) || ""
  const linkedId   = (req.query.linked_id   as string) || ""

  try {
    const rows = await db`
      SELECT id, organization_id, title, description, due_at, completed, linked_type, linked_id, created_at
      FROM reminders
      WHERE organization_id = ${orgId}
        ${linkedType && linkedId
          ? db`AND linked_type = ${linkedType} AND linked_id = ${linkedId}`
          : db``}
      ORDER BY due_at ASC
    `
    res.json(rows.map(mapReminder))
  } catch (err) {
    console.error("[reminders] GET /", err)
    res.status(500).json({ error: "Erro interno" })
  }
})

// POST /api/v1/reminders
router.post("/", async (req, res) => {
  const orgId = req.organizationId!
  const { title, description, due_at, linked_type, linked_id } = req.body

  if (!title?.trim()) return res.status(400).json({ error: "title é obrigatório" })
  if (!due_at)        return res.status(400).json({ error: "due_at é obrigatório" })

  try {
    const [r] = await db`
      INSERT INTO reminders (organization_id, title, description, due_at, linked_type, linked_id)
      VALUES (${orgId}, ${title.trim()}, ${description || null}, ${due_at}, ${linked_type || null}, ${linked_id || null})
      RETURNING id, organization_id, title, description, due_at, completed, linked_type, linked_id, created_at
    `
    res.status(201).json(mapReminder(r))
  } catch (err) {
    console.error("[reminders] POST /", err)
    res.status(500).json({ error: "Erro interno" })
  }
})

// PATCH /api/v1/reminders/:id
router.patch("/:id", async (req, res) => {
  const orgId = req.organizationId!
  const { id } = req.params

  try {
    const [existing] = await db`
      SELECT id FROM reminders WHERE id = ${id} AND organization_id = ${orgId}
    `
    if (!existing) return res.status(404).json({ error: "Lembrete não encontrado" })

    const allowed = ["title", "description", "due_at", "completed", "linked_type", "linked_id"] as const
    const updates: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in req.body) updates[key] = req.body[key] ?? null
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "Nenhum campo para atualizar" })
    }

    const [r] = await db`
      UPDATE reminders SET ${db(updates)}
      WHERE id = ${id} AND organization_id = ${orgId}
      RETURNING id, organization_id, title, description, due_at, completed, linked_type, linked_id, created_at
    `
    res.json(mapReminder(r))
  } catch (err) {
    console.error("[reminders] PATCH /:id", err)
    res.status(500).json({ error: "Erro interno" })
  }
})

// DELETE /api/v1/reminders/:id
router.delete("/:id", async (req, res) => {
  const orgId = req.organizationId!
  const { id } = req.params

  try {
    const [deleted] = await db`
      DELETE FROM reminders WHERE id = ${id} AND organization_id = ${orgId} RETURNING id
    `
    if (!deleted) return res.status(404).json({ error: "Lembrete não encontrado" })
    res.status(204).send()
  } catch (err) {
    console.error("[reminders] DELETE /:id", err)
    res.status(500).json({ error: "Erro interno" })
  }
})

export default router
