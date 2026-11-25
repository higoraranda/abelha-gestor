import type { RequestHandler } from "express"
import { getSession } from "@auth/express"
import { authConfig } from "../auth.config"
import { db } from "../db/index"
import { isPersonalRequest, personalOrganizationId } from "../services/personal-access"

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

type SessionUser = { id:string; organizationId:string; role:string }

export function createAuthMiddleware(config = authConfig, database = db): RequestHandler {
  return async (req,res,next) => {
    try {
      const session = await getSession(req,config)
      const user = session?.user as SessionUser | undefined
      if (user?.id && user.organizationId && ['owner','member'].includes(user.role)) {
        req.user = {userId:user.id,organizationId:user.organizationId,role:user.role}
        return next()
      }
      if (!req.headers.cookie && process.env.ABELHA_REQUIRE_LOGIN !== 'true' && isPersonalRequest(req)) {
        const organizations = await database<{id:string}[]>`SELECT id FROM organizations LIMIT 2`
        req.organizationId = personalOrganizationId(organizations)
        return next()
      }
      return res.status(401).json({error:"Não autorizado"})
    } catch {
      return res.status(503).json({error:"Não foi possível verificar o acesso. O modo local sem login exige uma única organização."})
    }
  }
}

export const authMiddleware = createAuthMiddleware()

export const requireOwner:RequestHandler = (req,res,next) => {
  if (req.user?.role === 'owner' || (!req.user && req.organizationId && isPersonalRequest(req))) return next()
  return res.status(403).json({error:"Acesso exclusivo do proprietário."})
}

export const ownerAuthMiddleware:RequestHandler = (req,res,next) =>
  authMiddleware(req,res,err => err ? next(err) : requireOwner(req,res,next))
