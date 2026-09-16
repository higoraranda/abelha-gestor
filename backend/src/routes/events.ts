import { Router } from "express"
import { authMiddleware } from "../middleware/auth"
import { tenantMiddleware } from "../middleware/tenant"
import { addClient, removeClient } from "../services/sseManager"

const router = Router()

// GET /api/events — stream SSE por organização
router.get("/", authMiddleware, tenantMiddleware, (req, res) => {
  const orgId = req.organizationId!

  res.setHeader("Content-Type", "text/event-stream")
  res.setHeader("Cache-Control", "no-cache")
  res.setHeader("Connection", "keep-alive")
  res.flushHeaders()

  res.write("event: connected\ndata: {}\n\n")

  addClient(orgId, res)

  // Ping a cada 30s para manter a conexão viva
  const keepAlive = setInterval(() => res.write(": ping\n\n"), 30_000)

  req.on("close", () => {
    clearInterval(keepAlive)
    removeClient(orgId, res)
  })
})

export default router
