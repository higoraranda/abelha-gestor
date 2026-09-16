import postgres from "postgres"
import dotenv from "dotenv"

dotenv.config()

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL não definida nas variáveis de ambiente")
}

// Cria o pool de conexões com o banco Neon usando postgres.js
// ssl: 'require' é obrigatório para conectar no Neon
export const db = postgres(process.env.DATABASE_URL, {
  ssl: "require",
  max: 10,
})
