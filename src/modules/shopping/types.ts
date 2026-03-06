export type Experience = {
  id: string
  brand: string
  model: string
  productName: string
  photoUrl: string
  rating: number
  comment: string
  createdAt: string
}

export type MarketItem = {
  id: string
  name: string
  qty: number
  unit: string
  price: number
  checked: boolean
  createdAt: string
  checkedAt?: string
}

export type MarketReceipt = {
  id: string
  total: number
  currency: "TRY"
  itemsCount: number
  lines?: {
    name: string
    qty: number
  }[]
  createdAt: string
}

export type SalePost = {
  id: string
  ownerId?: string
  ownerName?: string
  ownerAvatar?: {
    mode: "photo" | "preset"
    photoUri?: string
    presetId?: string
  }
  category?: string
  city?: string
  featuredUntil?: string
  title: string
  brand: string
  model: string
  price: string
  description: string
  photos?: string[]
  paymentMethods?: ("transfer" | "cod")[]
  qa?: {
    id: string
    question: string
    answer?: string
    createdAt: string
    answeredAt?: string
    unreadForSeller?: boolean
    unreadForBuyer?: boolean
  }[]
  status: "active" | "pending" | "sold"
  createdAt: string
}

export type SalesQuotaPurchase = {
  id: string
  count: number
  price: number
  createdAt: string
}

export type FeaturedQuotaPurchase = {
  id: string
  count: number
  price: number
  createdAt: string
}

export type SalesQuota = {
  freeUsed: number
  paidCredits: number
  featuredCredits: number
  purchases: SalesQuotaPurchase[]
  featuredPurchases: FeaturedQuotaPurchase[]
}

