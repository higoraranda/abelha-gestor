import { Router } from "express"
import { authMiddleware } from "../middleware/auth"
import { tenantMiddleware } from "../middleware/tenant"
import { db } from "../db/index"
import { buildProposal, calculatePricing, type PricingItem } from "../services/pricing"

const router = Router()
router.use(authMiddleware, tenantMiddleware)

function mapItem(row: Record<string, any>): PricingItem {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    itemType: row.item_type,
    category: row.category,
    basePrice: Number(row.base_price),
    setupPrice: row.setup_price == null ? null : Number(row.setup_price),
    monthlyPrice: row.monthly_price == null ? null : Number(row.monthly_price),
    premiumMonthlyPrice: row.premium_monthly_price == null ? null : Number(row.premium_monthly_price),
    weight: row.weight == null ? null : Number(row.weight),
    pagesIncluded: row.pages_included == null ? null : Number(row.pages_included),
    extraPagePrice: row.extra_page_price == null ? null : Number(row.extra_page_price),
    multiplier: row.multiplier == null ? null : Number(row.multiplier),
    perPage: Boolean(row.per_page),
    featured: Boolean(row.featured),
    includedItemCodes: row.included_item_codes ?? [],
    attributes: row.attributes ?? {},
  }
}

async function getItems(organizationId: string) {
  const rows = await db`
    SELECT * FROM catalog_items
    WHERE organization_id = ${organizationId} AND active = TRUE
    ORDER BY featured DESC, category, name
  `
  return rows.map(mapItem)
}

router.get("/config", async (req, res) => {
  try {
    const items = await getItems(req.organizationId!)
    res.json({
      items,
      cities: items.filter((item) => item.category === "regiao").map((item) => ({
        code: item.code, name: item.name, multiplier: item.multiplier ?? 1,
      })),
      automationServices: items.filter((item) => item.category === "automacao" && item.itemType === "service"),
      automationPackages: items.filter((item) => item.category === "automacao" && item.itemType === "package"),
      siteTypes: items.filter((item) => item.category === "site" && item.itemType === "service"),
      designs: items.filter((item) => item.category === "design"),
      siteFeatures: items.filter((item) => item.category === "site_extra" && item.code !== "banco_imagens"),
      contents: items.filter((item) => item.category === "conteudo"),
      deadlines: items.filter((item) => item.category === "prazo"),
      plans: items.filter((item) => item.category === "site_mensal"),
    })
  } catch (error) {
    console.error("[pricing] GET /config", error)
    res.status(500).json({ error: "Erro ao carregar a calculadora" })
  }
})

router.post("/calculate", async (req, res) => {
  try {
    const items = await getItems(req.organizationId!)
    res.json(calculatePricing(items, req.body))
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Não foi possível calcular" })
  }
})

router.post("/proposal", (req, res) => {
  try {
    res.json({ text: buildProposal(req.body.result, req.body.customer) })
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Não foi possível gerar a proposta" })
  }
})

export default router
