// Estende os tipos padrão do Auth.js para incluir nossos campos customizados
// Isso evita erros de TypeScript ao acessar session.user.organizationId, etc.
import type { DefaultSession } from "@auth/core/types"

declare module "@auth/core/types" {
  interface Session {
    user: {
      organizationId: string
      role: string
    } & DefaultSession["user"]
  }

  interface User {
    organizationId?: string
    role?: string
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    userId: string
    organizationId: string
    role: string
  }
}
