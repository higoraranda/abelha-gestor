import { Router } from "express"
import { ownerAuthMiddleware } from "../middleware/auth"
import { tenantMiddleware } from "../middleware/tenant"
import { db } from "../db/index"
import { configuredInstance, sendText } from "../services/evolutionApi"
import { postgresDatabase } from '../services/platform-db'
import { mutationGuard } from './personal'
import { InputError } from '../services/personal'
import { emit } from "../services/sseManager"

const router = Router()
router.use(ownerAuthMiddleware, tenantMiddleware, mutationGuard)

// POST /api/v1/messages
router.post("/", async (req, res) => {
  const orgId = req.organizationId!
  const { conversation_id, content } = req.body

  if (typeof conversation_id!=='string' || !/^[0-9a-f-]{36}$/i.test(conversation_id) ||
      typeof content!=='string' || !content.trim() || content.length>4096) {
    return res.status(400).json({ error: "conversation_id e content são obrigatórios" })
  }

  try {
    const [conv] = await db`
      SELECT whatsapp_chat_id
      FROM conversations
      WHERE id = ${conversation_id} AND organization_id = ${orgId}
    `
    if (!conv) return res.status(404).json({ error: "Conversa não encontrada" })

    if (!req.user) return res.status(401).json({ error: 'Entre como proprietário para enviar mensagens.' })
    const instance = await configuredInstance(postgresDatabase(db),orgId)
    if (!instance) {
      return res.status(503).json({ error: "WhatsApp não configurado para esta organização" })
    }

    const number = /^(\d{7,15})@(s\.whatsapp\.net|c\.us)$/.exec(String(conv.whatsapp_chat_id))?.[1]
    if (!number) return res.status(409).json({error:'Esta conversa não tem um número direto do WhatsApp confirmado.'})

    await sendText(
      instance.api_url as string,
      instance.instance_name as string,
      instance.api_key as string,
      number,
      content
    )

    const [message] = await db`
      INSERT INTO messages (organization_id, conversation_id, direction, content)
      VALUES (${orgId}, ${conversation_id}, 'out', ${content})
      RETURNING id, conversation_id, organization_id, whatsapp_message_id, content, direction, created_at
    `

    await db`
      UPDATE conversations
      SET last_message_at = NOW()
      WHERE id = ${conversation_id} AND organization_id = ${orgId}
    `

    const payload = {
      id:                message.id,
      conversationId:    message.conversation_id,
      organizationId:    message.organization_id,
      whatsappMessageId: null,
      content:           message.content,
      direction:         message.direction,
      createdAt:         message.created_at,
    }

    emit(orgId, "new_message", { conversation_id, message: payload })

    res.status(201).json(payload)
  } catch (err) {
    if(err instanceof InputError) return res.status(err.status).json({error:err.message})
    console.error("[messages] não foi possível registrar o envio")
    res.status(500).json({ error: "Erro interno" })
  }
})

export default router
