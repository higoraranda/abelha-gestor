export interface PricingItem {
  id?: string
  code: string
  name: string
  description?: string | null
  itemType: string
  category: string
  basePrice: number
  setupPrice?: number | null
  monthlyPrice?: number | null
  premiumMonthlyPrice?: number | null
  weight?: number | null
  pagesIncluded?: number | null
  extraPagePrice?: number | null
  multiplier?: number | null
  perPage?: boolean
  featured?: boolean
  includedItemCodes?: string[]
  attributes?: Record<string, any>
}

export interface PricingInput {
  mode: "automation" | "site" | "combo"
  cityName: string
  multiplier: number
  automation?: {
    mode: "package" | "package_custom" | "custom"
    packageCode?: string
    serviceCodes?: string[]
    extraServiceCodes?: string[]
  }
  site?: {
    typeCode: string
    totalPages: number
    designCode?: string
    featureCodes?: string[]
    contentCode?: string
    imageBank?: boolean
    deadlineCode?: string
    planCode?: string
  }
}

export function roundToTen(value: number) {
  return Math.round(value / 10) * 10
}

export function siteMonthlyMultiplier(setup: number) {
  return 1 + Math.min(Math.floor(setup / 1000), 50) * 0.5
}

function itemMap(items: PricingItem[]) {
  return new Map(items.map((item) => [item.code, item]))
}

function need(map: Map<string, PricingItem>, code: string | undefined, label: string) {
  const item = code ? map.get(code) : undefined
  if (!item) throw new Error(`${label} não encontrado`)
  return item
}

export function calculateAutomation(items: PricingItem[], multiplier: number, input: NonNullable<PricingInput["automation"]>) {
  const map = itemMap(items)
  const services = items.filter((item) => item.category === "automacao" && item.itemType === "service")
  const packageItem = input.packageCode ? need(map, input.packageCode, "Pacote") : null

  if ((input.mode === "package" || input.mode === "package_custom") && packageItem) {
    const packageCodes = packageItem.includedItemCodes ?? []
    const baseServices = packageCodes.map((code) => need(map, code, "Serviço do pacote"))
    const baseRetail = baseServices.reduce((total, service) => total + roundToTen(service.basePrice * multiplier), 0)
    const baseSetup = roundToTen(Number(packageItem.setupPrice ?? 0) * multiplier)
    let selected = [...baseServices]
    let retail = baseRetail
    let setup = baseSetup

    if (input.mode === "package_custom") {
      const packageSet = new Set(packageCodes)
      const extras = (input.extraServiceCodes ?? [])
        .filter((code) => !packageSet.has(code))
        .map((code) => need(map, code, "Serviço extra"))
      selected = [...selected, ...extras]
      retail += extras.reduce((total, service) => total + roundToTen(service.basePrice * multiplier), 0)
      const ratio = baseRetail > 0 ? baseSetup / baseRetail : 1
      setup = roundToTen(retail * ratio)
    }

    const monthlyBase = multiplier >= 1.4
      ? Number(packageItem.premiumMonthlyPrice ?? packageItem.monthlyPrice ?? 0)
      : Number(packageItem.monthlyPrice ?? 0)
    return {
      mode: input.mode,
      packageName: `${packageItem.name}${input.mode === "package_custom" ? " personalizado" : ""}`,
      services: selected.map((item) => item.name),
      setup,
      monthly: roundToTen(monthlyBase * multiplier),
      savings: Math.max(0, retail - setup),
      details: { baseSetup, retail, packageCode: packageItem.code },
    }
  }

  if (input.mode === "custom") {
    const selected = (input.serviceCodes ?? []).map((code) => need(map, code, "Serviço"))
    if (!selected.length) throw new Error("Selecione ao menos um serviço de automação")
    const baseSetup = selected.reduce((total, service) => total + service.basePrice, 0)
    const weight = selected.reduce((total, service) => total + Number(service.weight ?? 0), 0)
    const baseMonthly = multiplier >= 1.4 ? (weight <= 3 ? 600 : 950) : (weight <= 3 ? 500 : 800)
    return {
      mode: "custom" as const,
      packageName: "Personalizado",
      services: selected.map((item) => item.name),
      setup: roundToTen(baseSetup * multiplier),
      monthly: roundToTen(baseMonthly * multiplier),
      savings: 0,
      details: { baseSetup, weight },
    }
  }

  throw new Error("Configuração de automação inválida")
}

export function calculateSite(items: PricingItem[], multiplier: number, input: NonNullable<PricingInput["site"]>) {
  const map = itemMap(items)
  const type = need(map, input.typeCode, "Tipo de site")
  if (type.code === "linktree" || type.attributes?.fixedPrice) {
    return {
      typeName: type.name,
      totalPages: 1,
      pagesIncluded: 1,
      extraPages: 0,
      designName: "Design personalizado",
      features: [] as string[],
      contentName: "Conteúdo do cliente",
      deadline: "3 a 5 dias",
      planName: "Sem plano mensal",
      planDescription: "Sem mensalidade",
      setup: type.basePrice,
      monthly: 0,
      isLinktree: true,
      details: { fixedPrice: true },
    }
  }

  const design = need(map, input.designCode, "Nível de design")
  const content = need(map, input.contentCode, "Opção de conteúdo")
  const deadline = need(map, input.deadlineCode, "Prazo")
  const plan = need(map, input.planCode, "Plano mensal")
  const totalPages = Math.max(1, Math.round(Number(input.totalPages)))
  const pagesIncluded = Number(type.pagesIncluded ?? 1)
  const extraPages = Math.max(0, totalPages - pagesIncluded)
  const extraPagesPrice = extraPages * Number(type.extraPagePrice ?? 0)
  const features = (input.featureCodes ?? []).filter((code) => code !== "banco_imagens").map((code) => need(map, code, "Funcionalidade"))
  const featuresPrice = features.reduce((total, feature) => total + feature.basePrice, 0)
  const contentPrice = content.perPage ? content.basePrice * totalPages : content.basePrice
  const imageBankPrice = input.imageBank ? Number(map.get("banco_imagens")?.basePrice ?? 200) : 0
  const subtotal = type.basePrice + extraPagesPrice + featuresPrice + contentPrice + imageBankPrice
  const setup = roundToTen(subtotal * Number(design.multiplier ?? 1) * Number(deadline.multiplier ?? 1) * multiplier)
  const monthlyMultiplier = siteMonthlyMultiplier(setup)
  const monthly = roundToTen(Number(plan.monthlyPrice ?? 0) * multiplier * monthlyMultiplier)

  return {
    typeName: type.name,
    totalPages,
    pagesIncluded,
    extraPages,
    designName: design.name,
    features: features.map((item) => item.name),
    contentName: content.name,
    imageBank: Boolean(input.imageBank),
    deadline: String(deadline.attributes?.delivery ?? deadline.description ?? deadline.name),
    planName: plan.name,
    planDescription: plan.description ?? "",
    setup,
    monthly,
    isLinktree: false,
    details: { extraPagesPrice, featuresPrice, contentPrice, imageBankPrice, subtotal, monthlyMultiplier },
  }
}

export function calculatePricing(items: PricingItem[], input: PricingInput) {
  if (!Number.isFinite(input.multiplier) || input.multiplier < 0.5 || input.multiplier > 3) {
    throw new Error("Multiplicador regional inválido")
  }
  const base = { mode: input.mode, cityName: input.cityName, multiplier: input.multiplier }
  if (input.mode === "automation") {
    if (!input.automation) throw new Error("Configuração de automação obrigatória")
    return { ...base, automation: calculateAutomation(items, input.multiplier, input.automation) }
  }
  if (input.mode === "site") {
    if (!input.site) throw new Error("Configuração de site obrigatória")
    return { ...base, site: calculateSite(items, input.multiplier, input.site) }
  }
  if (!input.automation || !input.site) throw new Error("O combo exige automação e site")
  const automation = calculateAutomation(items, input.multiplier, input.automation)
  const site = calculateSite(items, input.multiplier, input.site)
  const subtotalSetup = automation.setup + site.setup
  const discount = roundToTen(subtotalSetup * 0.1)
  return {
    ...base,
    automation,
    site,
    combo: {
      subtotalSetup,
      discount,
      totalSetup: subtotalSetup - discount,
      monthly: automation.monthly + site.monthly,
    },
  }
}

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
}

export function buildProposal(result: any, customer: { name?: string; company?: string } = {}) {
  const greeting = customer.name ? `Olá, ${customer.name}. Segue a proposta comercial da Abelha.\n\n` : "Proposta comercial — Abelha\n\n"
  const location = `Cidade: ${result.cityName}\n`
  if (result.mode === "automation") {
    const automation = result.automation
    return `${greeting}AUTOMAÇÃO\n${location}Pacote: ${automation.packageName}\n\nServiços inclusos:\n${automation.services.map((item: string) => `- ${item}`).join("\n")}\n\nInvestimento:\n- Desenvolvimento: ${money(automation.setup)}\n- Mensalidade: ${money(automation.monthly)}\n\nPrazo estimado: 30 dias.\nPagamento: 50% no início e 50% na entrega.`
  }
  if (result.mode === "site") {
    const site = result.site
    if (site.isLinktree) return `${greeting}LINK EM BIO\n${location}\nInvestimento único: ${money(site.setup)}\nSem mensalidade.\nPrazo estimado: ${site.deadline}.`
    return `${greeting}SITE PROFISSIONAL\n${location}Tipo: ${site.typeName}\nPáginas: ${site.totalPages}\nDesign: ${site.designName}\nFuncionalidades:\n${site.features.length ? site.features.map((item: string) => `- ${item}`).join("\n") : "- Nenhuma funcionalidade extra"}\n\nInvestimento:\n- Desenvolvimento: ${money(site.setup)}\n- ${site.planName}: ${money(site.monthly)} por mês\n\nPrazo estimado: ${site.deadline}.\nPagamento: 50% no início e 50% na entrega.`
  }
  return `${greeting}COMBO AUTOMAÇÃO + SITE\n${location}\nAutomação: ${result.automation.packageName}\nSite: ${result.site.typeName}\n\nInvestimento:\n- Setup automação: ${money(result.automation.setup)}\n- Setup site: ${money(result.site.setup)}\n- Desconto combo: ${money(result.combo.discount)}\n- Total de desenvolvimento: ${money(result.combo.totalSetup)}\n- Total mensal: ${money(result.combo.monthly)}\n\nPrazo estimado: 45 dias.\nPagamento: 50% no início e 50% na entrega.`
}
