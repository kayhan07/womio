import AsyncStorage from "@react-native-async-storage/async-storage"
import { Experience, MarketItem, MarketReceipt, SalePost, SalesQuota } from "./types"

const PREFIX = "shoppingCommunityV3"

export const SHOPPING_STORAGE_KEYS = {
  experiences: `${PREFIX}:experiences`,
  market: `${PREFIX}:market`,
  marketReceipts: `${PREFIX}:marketReceipts`,
  sales: `${PREFIX}:sales`,
  salesQuota: `${PREFIX}:salesQuota`,
} as const

const safeParse = <T>(raw: string | null): T[] => {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as T[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export const loadExperiences = async () =>
  safeParse<Experience>(await AsyncStorage.getItem(SHOPPING_STORAGE_KEYS.experiences))

export const saveExperiences = async (next: Experience[]) => {
  await AsyncStorage.setItem(SHOPPING_STORAGE_KEYS.experiences, JSON.stringify(next))
}

export const loadMarketItems = async () =>
  safeParse<any>(await AsyncStorage.getItem(SHOPPING_STORAGE_KEYS.market)).map((it, idx) => {
    const nowIso = new Date().toISOString()
    const name = `${it?.name ?? ""}`.trim()
    const qty = Number(it?.qty)
    const price = Number(it?.price)
    const checked = Boolean(it?.checked)
    return {
      id: `${it?.id ?? `m-${Date.now()}-${idx}`}`,
      name,
      qty: Number.isFinite(qty) && qty > 0 ? qty : 1,
      unit: `${it?.unit ?? ""}`.trim(),
      price: Number.isFinite(price) && price >= 0 ? price : 0,
      checked,
      createdAt: `${it?.createdAt ?? nowIso}`,
      checkedAt: it?.checkedAt ? `${it.checkedAt}` : checked ? nowIso : undefined,
    } as MarketItem
  }).filter((it) => it.name.length > 0)

export const saveMarketItems = async (next: MarketItem[]) => {
  await AsyncStorage.setItem(SHOPPING_STORAGE_KEYS.market, JSON.stringify(next))
}

export const loadMarketReceipts = async () =>
  safeParse<MarketReceipt>(await AsyncStorage.getItem(SHOPPING_STORAGE_KEYS.marketReceipts))

export const saveMarketReceipts = async (next: MarketReceipt[]) => {
  await AsyncStorage.setItem(SHOPPING_STORAGE_KEYS.marketReceipts, JSON.stringify(next))
}

export const loadSalePosts = async () =>
  safeParse<any>(await AsyncStorage.getItem(SHOPPING_STORAGE_KEYS.sales)).map((it, idx) => {
    const photos = Array.isArray(it?.photos)
      ? it.photos.map((p: unknown) => `${p ?? ""}`.trim()).filter((p: string) => p.length > 0).slice(0, 3)
      : []
    const paymentMethods = Array.isArray(it?.paymentMethods)
      ? it.paymentMethods
          .map((m: unknown) => `${m ?? ""}`)
          .filter((m: string) => m === "transfer" || m === "cod")
      : []
    const qa = Array.isArray(it?.qa)
      ? it.qa
          .map((q: any, qIdx: number) => ({
            id: `${q?.id ?? `qa-${Date.now()}-${qIdx}`}`,
            question: `${q?.question ?? ""}`.trim(),
            answer: q?.answer ? `${q.answer}`.trim() : undefined,
            createdAt: `${q?.createdAt ?? new Date().toISOString()}`,
            answeredAt: q?.answeredAt ? `${q.answeredAt}` : undefined,
            unreadForSeller: Boolean(q?.unreadForSeller),
            unreadForBuyer: Boolean(q?.unreadForBuyer),
          }))
          .filter((q: any) => q.question.length > 0)
      : []
    return {
      id: `${it?.id ?? `s-${Date.now()}-${idx}`}`,
      ownerId: `${it?.ownerId ?? ""}`.trim() || undefined,
      ownerName: `${it?.ownerName ?? ""}`.trim() || undefined,
      ownerAvatar: it?.ownerAvatar
        ? {
            mode: it.ownerAvatar.mode === "photo" ? "photo" : "preset",
            photoUri: it.ownerAvatar.photoUri ? `${it.ownerAvatar.photoUri}`.trim() : undefined,
            presetId: it.ownerAvatar.presetId ? `${it.ownerAvatar.presetId}`.trim() : undefined,
          }
        : undefined,
      category: `${it?.category ?? "Diger"}`.trim() || "Diger",
      city: `${it?.city ?? "Antalya"}`.trim() || "Antalya",
      featuredUntil: it?.featuredUntil ? `${it.featuredUntil}` : undefined,
      title: `${it?.title ?? ""}`.trim(),
      brand: `${it?.brand ?? ""}`.trim(),
      model: `${it?.model ?? ""}`.trim(),
      price: `${it?.price ?? ""}`.trim(),
      description: `${it?.description ?? ""}`.trim(),
      photos,
      paymentMethods: paymentMethods.length ? paymentMethods : ["transfer"],
      qa,
      status: it?.status === "sold" ? "sold" : it?.status === "pending" ? "pending" : "active",
      createdAt: `${it?.createdAt ?? new Date().toISOString()}`,
    } as SalePost
  }).filter((it) => it.title.length > 0)

export const saveSalePosts = async (next: SalePost[]) => {
  await AsyncStorage.setItem(SHOPPING_STORAGE_KEYS.sales, JSON.stringify(next))
}

export const loadSalesQuota = async (): Promise<SalesQuota> => {
  const raw = await AsyncStorage.getItem(SHOPPING_STORAGE_KEYS.salesQuota)
  if (!raw) return { freeUsed: 0, paidCredits: 0, featuredCredits: 0, purchases: [], featuredPurchases: [] }
  try {
    const parsed = JSON.parse(raw) as Partial<SalesQuota>
    return {
      freeUsed: Number.isFinite(Number(parsed?.freeUsed)) ? Math.max(0, Number(parsed?.freeUsed)) : 0,
      paidCredits: Number.isFinite(Number(parsed?.paidCredits)) ? Math.max(0, Number(parsed?.paidCredits)) : 0,
      featuredCredits: Number.isFinite(Number(parsed?.featuredCredits)) ? Math.max(0, Number(parsed?.featuredCredits)) : 0,
      purchases: Array.isArray(parsed?.purchases)
        ? parsed!.purchases
            .map((it: any, idx: number) => ({
              id: `${it?.id ?? `sp-${Date.now()}-${idx}`}`,
              count: Number.isFinite(Number(it?.count)) ? Math.max(0, Number(it?.count)) : 0,
              price: Number.isFinite(Number(it?.price)) ? Math.max(0, Number(it?.price)) : 0,
              createdAt: `${it?.createdAt ?? new Date().toISOString()}`,
            }))
            .filter((it) => it.count > 0)
        : [],
      featuredPurchases: Array.isArray(parsed?.featuredPurchases)
        ? parsed!.featuredPurchases
            .map((it: any, idx: number) => ({
              id: `${it?.id ?? `fp-${Date.now()}-${idx}`}`,
              count: Number.isFinite(Number(it?.count)) ? Math.max(0, Number(it?.count)) : 0,
              price: Number.isFinite(Number(it?.price)) ? Math.max(0, Number(it?.price)) : 0,
              createdAt: `${it?.createdAt ?? new Date().toISOString()}`,
            }))
            .filter((it) => it.count > 0)
        : [],
    }
  } catch {
    return { freeUsed: 0, paidCredits: 0, featuredCredits: 0, purchases: [], featuredPurchases: [] }
  }
}

export const saveSalesQuota = async (next: SalesQuota) => {
  await AsyncStorage.setItem(SHOPPING_STORAGE_KEYS.salesQuota, JSON.stringify(next))
}

