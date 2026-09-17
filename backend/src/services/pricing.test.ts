import test from "node:test"
import assert from "node:assert/strict"
import { calculatePricing, siteMonthlyMultiplier, type PricingItem } from "./pricing"

const items: PricingItem[] = [
  { code: "atendimento_ia", name: "Atendimento IA", itemType: "service", category: "automacao", basePrice: 1000, weight: 2 },
  { code: "lembretes", name: "Lembretes", itemType: "service", category: "automacao", basePrice: 400, weight: 1 },
  { code: "extra", name: "Extra", itemType: "service", category: "automacao", basePrice: 500, weight: 1 },
  { code: "basic", name: "BASIC", itemType: "package", category: "automacao", basePrice: 0, setupPrice: 1200, monthlyPrice: 600, premiumMonthlyPrice: 600, includedItemCodes: ["atendimento_ia", "lembretes"] },
  { code: "site", name: "Site", itemType: "service", category: "site", basePrice: 1500, pagesIncluded: 5, extraPagePrice: 250 },
  { code: "linktree", name: "Linktree", itemType: "service", category: "site", basePrice: 150, attributes: { fixedPrice: true } },
  { code: "design", name: "Design", itemType: "option", category: "design", basePrice: 0, multiplier: 1.15 },
  { code: "feature", name: "Blog", itemType: "addon", category: "site_extra", basePrice: 400 },
  { code: "banco_imagens", name: "Banco", itemType: "addon", category: "site_extra", basePrice: 200 },
  { code: "conteudo", name: "Conteúdo", itemType: "option", category: "conteudo", basePrice: 150, perPage: true },
  { code: "prazo", name: "Padrão", description: "30 dias", itemType: "option", category: "prazo", basePrice: 0, multiplier: 1 },
  { code: "plano", name: "Essencial", itemType: "plan", category: "site_mensal", basePrice: 0, monthlyPrice: 100 },
]

test("calcula pacote e personalização mantendo a razão de desconto", () => {
  const result: any = calculatePricing(items, { mode: "automation", cityName: "Salto", multiplier: 1, automation: { mode: "package_custom", packageCode: "basic", extraServiceCodes: ["extra"] } })
  assert.equal(result.automation.setup, 1630)
  assert.equal(result.automation.monthly, 600)
  assert.equal(result.automation.services.length, 3)
})

test("calcula Linktree com preço fixo e sem mensalidade", () => {
  const result: any = calculatePricing(items, { mode: "site", cityName: "Campinas", multiplier: 1.4, site: { typeCode: "linktree", totalPages: 1 } })
  assert.equal(result.site.setup, 150)
  assert.equal(result.site.monthly, 0)
})

test("calcula site completo e mensalidade por faixa", () => {
  const result: any = calculatePricing(items, { mode: "site", cityName: "Salto", multiplier: 1, site: { typeCode: "site", totalPages: 7, designCode: "design", featureCodes: ["feature"], contentCode: "conteudo", imageBank: true, deadlineCode: "prazo", planCode: "plano" } })
  assert.equal(result.site.setup, 4200)
  assert.equal(result.site.monthly, 300)
  assert.equal(siteMonthlyMultiplier(result.site.setup), 3)
})

test("aplica 10% de desconto ao setup do combo", () => {
  const result: any = calculatePricing(items, { mode: "combo", cityName: "Salto", multiplier: 1, automation: { mode: "package", packageCode: "basic" }, site: { typeCode: "linktree", totalPages: 1 } })
  assert.equal(result.combo.subtotalSetup, 1350)
  assert.equal(result.combo.discount, 140)
  assert.equal(result.combo.totalSetup, 1210)
})
