import type { ExpressAuthConfig } from "@auth/express"
import Credentials from "@auth/core/providers/credentials"
import type { JWT } from "@auth/core/jwt"
import type { Session, User } from "@auth/core/types"
import bcrypt from "bcryptjs"
import { db } from "./db/index"
import { canonicalEmail } from "./services/account-email"

// Dependency injection keeps the production configuration unchanged while exercising
// the real credential flow against an isolated database in compatibility tests.
export function createAuthConfig(database:typeof db=db,isProduction=process.env.NODE_ENV === "production"):ExpressAuthConfig { return {
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      authorize: async (credentials) => {
        try {
          const email = canonicalEmail(credentials?.email)
          const password = credentials?.password as string

          if (!email || !password) return null

          const users = await database`
            SELECT id, organization_id, name, email, password_hash
            FROM users
            WHERE lower(btrim(email)) = ${email}
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
      }
      return token
    },
    // Chamado quando o frontend chama GET /api/auth/session
    // Expõe os campos do JWT para o cliente
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user && typeof token.userId === "string" && typeof token.organizationId === "string") {
        const [account] = await database`
          SELECT account_role FROM users
          WHERE id = ${token.userId} AND organization_id = ${token.organizationId}
        `
        if (account?.account_role === "owner" || account?.account_role === "member") {
          Object.assign(session.user,{id:token.userId,organizationId:token.organizationId,role:account.account_role})
        }
      }
      return session
    },
  },
  session: { strategy: "jwt" },
  // Em produção, o frontend encaminha /api pelo mesmo domínio da Vercel.
  // Assim o cookie continua sendo first-party e pode usar SameSite=Lax.
  cookies: {
    sessionToken: {
      name: isProduction ? "__Secure-authjs.session-token" : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProduction,
      },
    },
  },
  // Necessário para funcionar sem HTTPS em desenvolvimento
  trustHost: true,
} }

export const authConfig = createAuthConfig()
