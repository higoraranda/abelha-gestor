import type { ExpressAuthConfig } from "@auth/express"
import Credentials from "@auth/core/providers/credentials"
import type { JWT } from "@auth/core/jwt"
import type { Session, User } from "@auth/core/types"
import bcrypt from "bcryptjs"
import { db } from "./db/index"

export const authConfig: ExpressAuthConfig = {
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      authorize: async (credentials) => {
        try {
          const email = credentials?.email as string
          const password = credentials?.password as string

          if (!email || !password) return null

          const users = await db`
            SELECT id, organization_id, name, email, password_hash
            FROM users
            WHERE email = ${email}
          `

          const user = users[0]
          if (!user || !user.password_hash) return null

          const isValid = await bcrypt.compare(password, user.password_hash as string)
          if (!isValid) return null

          return {
            id: user.id as string,
            email: user.email as string,
            name: user.name as string,
            organizationId: user.organization_id as string,
          }
        } catch (err) {
          console.error("[auth] erro no authorize:", err)
          return null
        }
      },
    }),
  ],
  callbacks: {
    // Chamado toda vez que um JWT é criado ou atualizado
    // Na criação (user existe), adicionamos os campos customizados
    jwt({ token, user }: { token: JWT; user?: User }) {
      if (user) {
        token.userId = user.id as string
        token.organizationId = (user as any).organizationId
        token.role = (user as any).role
      }
      return token
    },
    // Chamado quando o frontend chama GET /api/auth/session
    // Expõe os campos do JWT para o cliente
    session({ session, token }: { session: Session; token: JWT }) {
      if (session.user) {
        const u = session.user as any
        u.id = token.userId as string
        u.organizationId = token.organizationId as string
        u.role = token.role as string
      }
      return session
    },
  },
  session: { strategy: "jwt" },
  // Necessário para funcionar sem HTTPS em desenvolvimento
  trustHost: true,
}
