import { db } from "../db/index"
import { emit } from "./sseManager"

interface WebhookPayload {
  event: string
  instance: string
  data: {
    key: {
      remoteJid: string
      fromMe: boolean
      id: string
    }
    message?: {
      conversation?: string
      extendedTextMessage?: { text: string }
    }
    messageTimestamp: number
    pushName?: string
  }
}

function extractPhone(remoteJid: string): string {
  return remoteJid.replace(/@.*$/, "")
}

function extractTextContent(payload: WebhookPayload): string | null {
  const msg = payload.data.message
  if (!msg) return null
  return msg.conversation ?? msg.extendedTextMessage?.text ?? null
}

export async function processIncomingMessage(payload: WebhookPayload): Promise<void> {
  // Ignora mensagens enviadas pelo próprio número (evita duplicatas com /api/v1/messages)
  if (payload.data.key.fromMe) return

  const content = extractTextContent(payload)
  if (!content) return // Ignora mensagens sem texto (áudio, imagem, etc.)

  const instanceName = payload.instance
  const whatsappMessageId = payload.data.key.id
  const remoteJid = payload.data.key.remoteJid
  const phone = extractPhone(remoteJid)
  const pushName = payload.data.pushName ?? null

  // 1. Busca o tenant pelo instanceName
  const [instance] = await db`
    SELECT organization_id
    FROM evolution_instances
    WHERE instance_name = ${instanceName}
  `
  if (!instance) {
    console.warn(`[webhook] instância desconhecida: ${instanceName}`)
    return
  }
  const orgId = instance.organization_id as string

  // 2. UPSERT do cliente — cria se não existir, mantém dados se já existir
  const [client] = await db`
    INSERT INTO clients (organization_id, whatsapp, name)
    VALUES (${orgId}, ${phone}, ${pushName})
    ON CONFLICT (organization_id, whatsapp)
    DO UPDATE SET name = COALESCE(clients.name, EXCLUDED.name)
    RETURNING id
  `

  // 3. UPSERT da conversa
  const [conversation] = await db`
    INSERT INTO conversations (organization_id, client_id, whatsapp_chat_id)
    VALUES (${orgId}, ${client.id}, ${remoteJid})
    ON CONFLICT (organization_id, whatsapp_chat_id)
    DO UPDATE SET client_id = EXCLUDED.client_id
    RETURNING id
  `
  const conversationId = conversation.id as string

  // 4. INSERT da mensagem — ON CONFLICT DO NOTHING previne duplicatas de webhook
  const [message] = await db`
    INSERT INTO messages (organization_id, conversation_id, whatsapp_message_id, direction, content)
    VALUES (${orgId}, ${conversationId}, ${whatsappMessageId}, 'in', ${content})
    ON CONFLICT DO NOTHING
    RETURNING id, conversation_id, direction, content, created_at
  `
  if (!message) return // Mensagem duplicada, encerra silenciosamente

  // 5. Atualiza last_message_at e incrementa unread_count
  await db`
    UPDATE conversations
    SET last_message_at = NOW(),
        unread_count = unread_count + 1
    WHERE id = ${conversationId}
  `

  // 6. Emite evento SSE para o frontend
  emit(orgId, "new_message", {
    conversation_id: conversationId,
    message: {
      id:           message.id,
      direction:    message.direction,
      content:      message.content,
      created_at:   message.created_at,
    },
  })

  emit(orgId, "conversation_updated", {
    conversation_id: conversationId,
  })
}
