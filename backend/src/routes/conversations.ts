import { Router } from "express"
import { authMiddleware } from "../middleware/auth"
import { tenantMiddleware } from "../middleware/tenant"
import { db } from "../db/index"

const router = Router()
router.use(authMiddleware, tenantMiddleware)

// GET /api/v1/conversations
router.get("/", async (req, res) => {
  const orgId = req.organizationId!
  const page  = Math.max(1, parseInt(req.query.page as string) || 1)
  const limit = Math.min(50, parseInt(req.query.limit as string) || 20)
  const offset = (page - 1) * limit

  try {
    const rows = await db`
      SELECT
        c.id,
        c.client_id,
        c.whatsapp_chat_id,
        c.last_message_at,
        c.unread_count,
        c.created_at,
        cl.id         AS client_id_val,
        cl.name       AS client_name,
        cl.whatsapp   AS client_whatsapp,
        co.id         AS company_id_val,
        co.name       AS company_name
      FROM conversations c
      LEFT JOIN clients cl  ON cl.id = c.client_id
      LEFT JOIN companies co ON co.id = cl.company_id
      WHERE c.organization_id = ${orgId}
      ORDER BY c.last_message_at DESC NULLS LAST
      LIMIT ${limit} OFFSET ${offset}
    `

    res.json(
      rows.map((r) => ({
        id:             r.id,
        clientId:       r.client_id,
        whatsappChatId: r.whatsapp_chat_id,
        lastMessageAt:  r.last_message_at,
        unreadCount:    r.unread_count,
        createdAt:      r.created_at,
        client: r.client_id_val
          ? {
              id:      r.client_id_val,
              name:    r.client_name,
              whatsapp: r.client_whatsapp,
              company: r.company_id_val ? { id: r.company_id_val, name: r.company_name } : null,
            }
          : null,
      }))
    )
  } catch (err) {
    console.error("[conversations] GET /", err)
    res.status(500).json({ error: "Erro interno" })
  }
})

// GET /api/v1/conversations/:id
router.get("/:id", async (req, res) => {
  const orgId = req.organizationId!
  const { id } = req.params

  try {
    const [conv] = await db`
      SELECT
        c.id,
        c.client_id,
        c.whatsapp_chat_id,
        c.last_message_at,
        c.unread_count,
        c.created_at,
        cl.id         AS client_id_val,
        cl.name       AS client_name,
        cl.whatsapp   AS client_whatsapp,
        co.id         AS company_id_val,
        co.name       AS company_name
      FROM conversations c
      LEFT JOIN clients cl  ON cl.id = c.client_id
      LEFT JOIN companies co ON co.id = cl.company_id
      WHERE c.id = ${id} AND c.organization_id = ${orgId}
    `

    if (!conv) return res.status(404).json({ error: "Conversa não encontrada" })

    const messages = await db`
      SELECT * FROM (
        SELECT id, conversation_id, organization_id, whatsapp_message_id,
               content, direction, created_at
        FROM messages
        WHERE conversation_id = ${id} AND organization_id = ${orgId}
        ORDER BY created_at DESC
        LIMIT 50
      ) sub
      ORDER BY created_at ASC
    `

    res.json({
      id:             conv.id,
      clientId:       conv.client_id,
      whatsappChatId: conv.whatsapp_chat_id,
      lastMessageAt:  conv.last_message_at,
      unreadCount:    conv.unread_count,
      createdAt:      conv.created_at,
      client: conv.client_id_val
        ? {
            id:       conv.client_id_val,
            name:     conv.client_name,
            whatsapp: conv.client_whatsapp,
            company:  conv.company_id_val ? { id: conv.company_id_val, name: conv.company_name } : null,
          }
        : null,
      messages: messages.map((m) => ({
        id:                 m.id,
        conversationId:     m.conversation_id,
        organizationId:     m.organization_id,
        whatsappMessageId:  m.whatsapp_message_id,
        content:            m.content,
        direction:          m.direction,
        createdAt:          m.created_at,
      })),
    })
  } catch (err) {
    console.error("[conversations] GET /:id", err)
    res.status(500).json({ error: "Erro interno" })
  }
})

// POST /api/v1/conversations/:id/read
router.post("/:id/read", async (req, res) => {
  const orgId = req.organizationId!
  const { id } = req.params

  try {
    const [updated] = await db`
      UPDATE conversations
      SET unread_count = 0
      WHERE id = ${id} AND organization_id = ${orgId}
      RETURNING id
    `
    if (!updated) return res.status(404).json({ error: "Conversa não encontrada" })
    res.status(204).send()
  } catch (err) {
    console.error("[conversations] POST /:id/read", err)
    res.status(500).json({ error: "Erro interno" })
  }
})

export default router
