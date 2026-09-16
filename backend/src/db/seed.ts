import "dotenv/config"
import bcrypt from "bcryptjs"
import { db } from "./index"

const ORG_NAME     = "Minha Organização"
const USER_NAME    = "Admin"
const USER_EMAIL   = "higor.aranda@gmail.com"
const USER_PASSWORD = "teste123"

async function seed() {
  console.log("Iniciando seed...\n")
  try {
    const [org] = await db`
      INSERT INTO organizations (name)
      VALUES (${ORG_NAME})
      RETURNING id, name
    `
    console.log(`✓ Organização: ${org.name} (${org.id})`)

    const passwordHash = await bcrypt.hash(USER_PASSWORD, 12)
    const [user] = await db`
      INSERT INTO users (organization_id, name, email, password_hash)
      VALUES (${org.id}, ${USER_NAME}, ${USER_EMAIL}, ${passwordHash})
      RETURNING id, email
    `
    console.log(`✓ Usuário: ${user.email} (${user.id})`)

    console.log("\n--- Seed concluído ---")
    console.log(`Email: ${USER_EMAIL}`)
    console.log(`Senha: ${USER_PASSWORD}`)
  } catch (err) {
    console.error("Erro no seed:", err)
    process.exit(1)
  } finally {
    await db.end()
  }
}

seed()
