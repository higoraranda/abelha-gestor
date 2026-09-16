import { Request, Response, NextFunction } from "express"

// Adiciona o campo organizationId como atalho direto no Request
declare global {
  namespace Express {
    interface Request {
      organizationId?: string
    }
  }
}

// Deve ser usado DEPOIS do authMiddleware
// Extrai o organizationId do req.user e expõe como req.organizationId
// para facilitar o uso nas queries: WHERE organization_id = ${req.organizationId}
export function tenantMiddleware(req: Request, _res: Response, next: NextFunction) {
  req.organizationId = req.user?.organizationId
  next()
}
