import { Router } from "express"
import { processIncomingMessage } from "../services/webhookProcessor"

const router = Router()

// POST /webhooks/evolution
// Recebido da Evolution API quando chega uma mensagem.
// Não usa JWT — autenticado pelo EVOLUTION_WEBHOOK_SECRET no header.
router.post("/evolution", async (req, res) => {
  const secret = req.headers["x-evolution-secret"]
  if (!secret || secret !== process.env.EVOLUTION_WEBHOOK_SECRET) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  // Responde imediatamente para a Evolution API não retentar
  res.status(200).json({ ok: true })

  const { event } = req.body
  if (event !== "messages.upsert") return

  try {
    await processIncomingMessage(req.body)
  } catch (err) {
    console.error("[webhook] erro ao processar mensagem:", err)
  }
})

export default router
