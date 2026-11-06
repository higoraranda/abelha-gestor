import test from "node:test"
import assert from "node:assert/strict"
import { isPersonalRequest, personalOrganizationId } from "./personal-access"
import type { Request, Response } from "express"
import { tenantMiddleware } from "../middleware/tenant"

const localRequest = {
  socket: { remoteAddress: "127.0.0.1" },
  headers: { host: "127.0.0.1:3000", origin: "http://127.0.0.1:5173" },
}

test("permite acesso pessoal direto somente pela própria máquina", () => {
  assert.equal(isPersonalRequest(localRequest, "development"), true)
  assert.equal(isPersonalRequest({ ...localRequest, socket: { remoteAddress: "::1" } }, "development"), true)
  assert.equal(isPersonalRequest({ ...localRequest, socket: { remoteAddress: "::ffff:127.0.0.1" } }, "development"), true)
  assert.equal(isPersonalRequest({ socket: localRequest.socket, headers: { host: "localhost:3000" } }, "development"), true)
})

test("mantém autenticação em produção, conexões remotas, proxies e origens externas", () => {
  assert.equal(isPersonalRequest(localRequest, "production"), false)
  assert.equal(isPersonalRequest({ ...localRequest, socket: { remoteAddress: "192.168.1.20" } }, "development"), false)
  for (const extra of [
    { origin: "https://example.com" },
    { origin: "null" },
    { origin: "invalid" },
    { host: "example.com:3000" },
    { "x-forwarded-for": "192.168.1.20" },
    { "x-forwarded-host": "example.com" },
    { forwarded: "for=192.168.1.20" },
  ]) {
    assert.equal(isPersonalRequest({ ...localRequest, headers: { ...localRequest.headers, ...extra } }, "development"), false)
  }
})

test("usa a organização existente e recusa escolher entre carteiras diferentes", () => {
  assert.equal(personalOrganizationId([{ id: "personal-org" }]), "personal-org")
  assert.throws(() => personalOrganizationId([]), /única organização/)
  assert.throws(() => personalOrganizationId([{ id: "first" }, { id: "second" }]), /única organização/)
})

test("preserva o filtro da carteira pessoal ao passar pelo middleware de organização", () => {
  const req = { organizationId: "personal-org" } as Request
  let proceeded = false
  tenantMiddleware(req, {} as Response, () => { proceeded = true })
  assert.equal(req.organizationId, "personal-org")
  assert.equal(proceeded, true)
})
