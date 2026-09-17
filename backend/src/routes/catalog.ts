import { Router } from "express"
import { authMiddleware } from "../middleware/auth"
import { tenantMiddleware } from "../middleware/tenant"
import { db } from "../db/index"

const router = Router()
router.use(authMiddleware, tenantMiddleware)

const ITEM_TYPES = new Set(["service", "package", "plan", "addon", "option"])

function numberOrNull(value: unknown) {
  if (value === "" || value === null || value === undefined) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function mapCatalogItem(row: Record<string, any>) {
  const toNumber = (value: unknown) => value === null || value === undefined ? null : Number(value)

  return {
    id: row.id,
    organizationId: row.organization_id,
    code: row.code,
    name: row.name,
    description: row.description,
    itemType: row.item_type,
    category: row.category,
    basePrice: toNumber(row.base_price) ?? 0,
    setupPrice: toNumber(row.setup_price),
    monthlyPrice: toNumber(row.monthly_price),
    premiumMonthlyPrice: toNumber(row.premium_monthly_price),
    weight: toNumber(row.weight),
    pagesIncluded: toNumber(row.pages_included),
    extraPagePrice: toNumber(row.extra_page_price),
    multiplier: toNumber(row.multiplier),
    perPage: Boolean(row.per_page),
    featured: Boolean(row.featured),
    active: Boolean(row.active),
    includedItemCodes: row.included_item_codes ?? [],
    attributes: row.attributes ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function normalizeInput(body: Record<string, any>, current?: Record<string, any>) {
  const value = (camel: string, snake: string) => {
    if (camel in body) return body[camel]
    if (snake in body) return body[snake]
    return current?.[snake]
  }

  const rawType = String(value("itemType", "item_type") ?? "service")
  const itemType = ITEM_TYPES.has(rawType) ? rawType : "service"
  const includedCodes = value("includedItemCodes", "included_item_codes")
  const attributes = value("attributes", "attributes")

  return {
    code: String(value("code", "code") ?? "").trim() || null,
    name: String(value("name", "name") ?? "").trim(),
    description: String(value("description", "description") ?? "").trim() || null,
    item_type: itemType,
    category: String(value("category", "category") ?? "outros").trim() || "outros",
    base_price: numberOrNull(value("basePrice", "base_price")) ?? 0,
    setup_price: numberOrNull(value("setupPrice", "setup_price")),
    monthly_price: numberOrNull(value("monthlyPrice", "monthly_price")),
    premium_monthly_price: numberOrNull(value("premiumMonthlyPrice", "premium_monthly_price")),
    weight: numberOrNull(value("weight", "weight")),
    pages_included: numberOrNull(value("pagesIncluded", "pages_included")),
    extra_page_price: numberOrNull(value("extraPagePrice", "extra_page_price")),
    multiplier: numberOrNull(value("multiplier", "multiplier")),
    per_page: Boolean(value("perPage", "per_page")),
    featured: Boolean(value("featured", "featured")),
    active: value("active", "active") === undefined ? true : Boolean(value("active", "active")),
    included_item_codes: Array.isArray(includedCodes)
      ? includedCodes.map((code) => String(code).trim()).filter(Boolean)
      : [],
    attributes: attributes && typeof attributes === "object" && !Array.isArray(attributes) ? attributes : {},
  }
}

router.get("/", async (req, res) => {
  const orgId = req.organizationId!
  const search = String(req.query.search ?? "").trim()
  const category = String(req.query.category ?? "").trim()
  const activeOnly = req.query.active === "true"

  try {
    const rows = await db`
      SELECT *
      FROM catalog_items
      WHERE organization_id = ${orgId}
        ${search ? db`AND (name ILIKE ${`%${search}%`} OR description ILIKE ${`%${search}%`} OR code ILIKE ${`%${search}%`})` : db``}
        ${category ? db`AND category = ${category}` : db``}
        ${activeOnly ? db`AND active = TRUE` : db``}
      ORDER BY active DESC, featured DESC, category ASC, name ASC
    `
    res.json(rows.map(mapCatalogItem))
  } catch (error) {
    console.error("[catalog] GET /", error)
    res.status(500).json({ error: "Erro ao carregar o catálogo" })
  }
})

router.post("/", async (req, res) => {
  const orgId = req.organizationId!
  const input = normalizeInput(req.body)
  if (!input.name) return res.status(400).json({ error: "Nome é obrigatório" })

  try {
    const [row] = await db`
      INSERT INTO catalog_items (
        organization_id, code, name, description, item_type, category,
        base_price, setup_price, monthly_price, premium_monthly_price,
        weight, pages_included, extra_page_price, multiplier,
        per_page, featured, active, included_item_codes, attributes
      ) VALUES (
        ${orgId}, ${input.code}, ${input.name}, ${input.description}, ${input.item_type}, ${input.category},
        ${input.base_price}, ${input.setup_price}, ${input.monthly_price}, ${input.premium_monthly_price},
        ${input.weight}, ${input.pages_included}, ${input.extra_page_price}, ${input.multiplier},
        ${input.per_page}, ${input.featured}, ${input.active}, ${input.included_item_codes}, ${db.json(input.attributes)}
      )
      RETURNING *
    `
    res.status(201).json(mapCatalogItem(row))
  } catch (error: any) {
    if (error.code === "23505") return res.status(409).json({ error: "Já existe um item com esse código" })
    console.error("[catalog] POST /", error)
    res.status(500).json({ error: "Erro ao criar o item" })
  }
})

router.patch("/:id", async (req, res) => {
  const orgId = req.organizationId!
  const { id } = req.params

  try {
    const [current] = await db`SELECT * FROM catalog_items WHERE id = ${id} AND organization_id = ${orgId}`
    if (!current) return res.status(404).json({ error: "Item não encontrado" })

    const input = normalizeInput(req.body, current)
    if (!input.name) return res.status(400).json({ error: "Nome é obrigatório" })

    const [row] = await db`
      UPDATE catalog_items SET
        code = ${input.code}, name = ${input.name}, description = ${input.description},
        item_type = ${input.item_type}, category = ${input.category}, base_price = ${input.base_price},
        setup_price = ${input.setup_price}, monthly_price = ${input.monthly_price},
        premium_monthly_price = ${input.premium_monthly_price}, weight = ${input.weight},
        pages_included = ${input.pages_included}, extra_page_price = ${input.extra_page_price},
        multiplier = ${input.multiplier}, per_page = ${input.per_page}, featured = ${input.featured},
        active = ${input.active}, included_item_codes = ${input.included_item_codes},
        attributes = ${db.json(input.attributes)}, updated_at = NOW()
      WHERE id = ${id} AND organization_id = ${orgId}
      RETURNING *
    `
    res.json(mapCatalogItem(row))
  } catch (error: any) {
    if (error.code === "23505") return res.status(409).json({ error: "Já existe um item com esse código" })
    console.error("[catalog] PATCH /:id", error)
    res.status(500).json({ error: "Erro ao atualizar o item" })
  }
})

router.delete("/:id", async (req, res) => {
  const orgId = req.organizationId!
  const { id } = req.params

  try {
    const [deleted] = await db`
      DELETE FROM catalog_items WHERE id = ${id} AND organization_id = ${orgId} RETURNING id
    `
    if (!deleted) return res.status(404).json({ error: "Item não encontrado" })
    res.status(204).send()
  } catch (error) {
    console.error("[catalog] DELETE /:id", error)
    res.status(500).json({ error: "Erro ao excluir o item" })
  }
})

export default router
