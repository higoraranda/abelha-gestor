import { Request, Response, NextFunction } from "express"
import { getSession } from "@auth/express"
import { authConfig } from "../auth.config"

// Adiciona o campo "user" ao tipo Request do Express
// Isso permite acessar req.user em qualquer rota sem erros de TypeScript
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string
        organizationId: string
        role: string
      }
    }
  }
}

// Middleware que protege todas as rotas da API
// Lê o cookie de sessão do Auth.js, valida e injeta req.user
type SessionUser = {
  id: string
  organizationId: string
  role: string
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const session = await getSession(req, authConfig)
  const user = session?.user as SessionUser | undefined

  if (!user?.id || !user.organizationId) {
    return res.status(401).json({ error: "Não autorizado" })
  }

  req.user = {
    userId: user.id,
    organizationId: user.organizationId,
    role: user.role,
  }

  next()
}
