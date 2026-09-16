import { Response } from "express"

// Map de organizationId → conjunto de respostas SSE abertas
const clients = new Map<string, Set<Response>>()

export function addClient(orgId: string, res: Response): void {
  if (!clients.has(orgId)) clients.set(orgId, new Set())
  clients.get(orgId)!.add(res)
}

export function removeClient(orgId: string, res: Response): void {
  clients.get(orgId)?.delete(res)
  if (clients.get(orgId)?.size === 0) clients.delete(orgId)
}

export function emit(orgId: string, event: string, data: unknown): void {
  const orgClients = clients.get(orgId)
  if (!orgClients) return
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  for (const res of orgClients) {
    res.write(payload)
  }
}
