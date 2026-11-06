import type { IncomingHttpHeaders } from "node:http"

type AccessRequest = {
  socket: { remoteAddress?: string }
  headers: IncomingHttpHeaders
}

function isLocalUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return (url.protocol === "http:" || url.protocol === "https:")
      && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
      && !url.username && !url.password
  } catch {
    return false
  }
}

export function isPersonalRequest(req: AccessRequest, environment = process.env.NODE_ENV): boolean {
  if (environment === "production") return false
  if (!["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.socket.remoteAddress ?? "")) return false
  if (Object.keys(req.headers).some((name) => name === "forwarded" || name.startsWith("x-forwarded-"))) return false
  if (!req.headers.host || !isLocalUrl(`http://${req.headers.host}`)) return false
  const origin = req.headers.origin
  return origin === undefined || isLocalUrl(origin)
}

export function personalOrganizationId(organizations: { id: string }[]): string {
  if (organizations.length !== 1) {
    throw new Error("O acesso pessoal requer uma única organização cadastrada.")
  }
  return organizations[0].id
}
