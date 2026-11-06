import "dotenv/config"
import express from "express"
import cors from "cors"
import { ExpressAuth } from "@auth/express"
import { authConfig } from "./auth.config"
import conversationsRouter from "./routes/conversations"
import messagesRouter from "./routes/messages"
import eventsRouter from "./routes/events"
import clientsRouter from "./routes/clients"
import remindersRouter from "./routes/reminders"
import catalogRouter from "./routes/catalog"
import contractsRouter from "./routes/contracts"
import financeRouter from "./routes/finance"
import webhooksRouter from "./routes/webhooks"
import crmRouter from "./routes/crm"

const app = express()
const PORT = process.env.PORT || 3000

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
)

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use("/api/v1", (_req, res, next) => { res.set("Cache-Control", "no-store"); next() })

app.use("/api/auth/*", ExpressAuth(authConfig))

app.use("/api/v1/conversations", conversationsRouter)
app.use("/api/v1/messages", messagesRouter)
app.use("/api/v1/clients", clientsRouter)
app.use("/api/v1/reminders", remindersRouter)
app.use("/api/v1/catalog", catalogRouter)
app.use("/api/v1/contracts", contractsRouter)
app.use("/api/v1/finance", financeRouter)
app.use("/api/v1/crm", crmRouter)
app.use("/api/events", eventsRouter)
app.use("/webhooks", webhooksRouter)

app.get("/health", (_req, res) => {
  res.json({ status: "ok" })
})

const HOST = process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1"
app.listen(Number(PORT), HOST, () => {
  console.log(`Servidor rodando na porta ${PORT}`)
})

export default app
