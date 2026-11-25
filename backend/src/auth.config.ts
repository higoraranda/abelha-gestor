import type { ExpressAuthConfig } from "@auth/express"
import Credentials from "@auth/core/providers/credentials"
import type { JWT } from "@auth/core/jwt"
import type { Session, User } from "@auth/core/types"
import bcrypt from "bcryptjs"
import { db } from "./db/index"
import { canonicalEmail } from "./services/account-email"
import { createCredentialBudget } from "./services/credential-budget"
import { configuredSharedBudget } from './services/shared-credential-budget'
import { postgresDatabase } from './services/platform-db'

const dummyHash="$2a$12$XBgwfxX7w4K4sMU/eU89O.DvfntoR03XdiH8Vz.jeV07cy7rTt.ve"

// Dependency injection keeps the production configuration unchanged while exercising
// the real credential flow against an isolated database in compatibility tests.
export function createAuthConfig(database:typeof db=db,isProduction=process.env.NODE_ENV === "production"):ExpressAuthConfig {
  const attempts=createCredentialBudget()
  return {
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      authorize: async (credentials) => {
        try {
          const email = canonicalEmail(credentials?.email)
          const password = credentials?.password

          if (!email || typeof password!=='string' || !password || password.length>1024 || !attempts.reserve(email)) return null
          const shared=configuredSharedBudget(postgresDatabase(database),'login')
          if(shared && !await shared.reserve(email))return null

          const users = await database`
            SELECT id, organization_id, name, email, password_hash,
              to_jsonb(users)->>'password_reset_version' AS password_reset_version,
              to_jsonb(users)->>'account_access_version' AS account_access_version,
              account_role, to_jsonb(users)->>'account_disabled_at' AS account_disabled_at,
              to_jsonb(users) ? 'member_last_sign_in_at' AS tracks_member_login
            FROM users
            WHERE lower(btrim(email)) = ${email}
          `

          const user = users[0]
          const hash=typeof user?.password_hash==='string'&&user.password_hash?user.password_hash:null
          const isValid=await bcrypt.compare(password,hash??dummyHash)
          if (!hash||!isValid||(user.account_role === "member" && user.account_disabled_at)) return null
          if (user.account_role === "member" && user.tracks_member_login) {
            const [logged] = await database`
              UPDATE users SET member_last_sign_in_at=now()
              WHERE id = ${user.id} AND organization_id = ${user.organization_id} AND account_role='member'
                AND account_disabled_at IS NULL AND account_access_version IS NOT DISTINCT FROM ${user.account_access_version}::uuid
              RETURNING id
            `
            if (!logged) return null
          }

          if(shared)await shared.success(email)
          attempts.success(email)
          return {
            id: user.id as string,
            email: user.email as string,
            name: user.name as string,
            organizationId: user.organization_id as string,
            passwordResetVersion: user.password_reset_version as string | null,
            accountAccessVersion: user.account_access_version as string | null,
          }
        } catch {
          // Do not convert a database failure into an invalid-password response.
          throw new Error("Falha ao consultar a conta.")
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
        token.passwordResetVersion = (user as {passwordResetVersion?: string | null}).passwordResetVersion ?? null
        token.accountAccessVersion = (user as {accountAccessVersion?: string | null}).accountAccessVersion ?? null
      }
      return token
    },
    // Chamado quando o frontend chama GET /api/auth/session
    // Expõe os campos do JWT para o cliente
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user && typeof token.userId === "string" && typeof token.organizationId === "string") {
        const [account] = await database`
          SELECT account_role, to_jsonb(users)->>'password_reset_version' AS password_reset_version,
            to_jsonb(users)->>'account_access_version' AS account_access_version,
            to_jsonb(users)->>'account_disabled_at' AS account_disabled_at FROM users
          WHERE id = ${token.userId} AND organization_id = ${token.organizationId}
        `
        if ((account?.account_role === "owner" || account?.account_role === "member") &&
            (account.password_reset_version ?? null) === (token.passwordResetVersion ?? null) &&
            (account.account_role === "owner" || (!account.account_disabled_at &&
              (account.account_access_version ?? null) === (token.accountAccessVersion ?? null)))) {
          Object.assign(session.user,{id:token.userId,organizationId:token.organizationId,role:account.account_role})
          return session
        }
      }
      return {expires:session.expires}
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
