import AsyncStorage from "@react-native-async-storage/async-storage"
import { CHAT_CONVERSATIONS_KEY, CHAT_MESSAGES_KEY, CHAT_REPORTS_KEY } from "@/src/modules/chat/storage"
import { SHOPPING_STORAGE_KEYS } from "@/src/modules/shopping/storage"

export const WOMIO_MEMBERS_KEY = "womio:membersV1"
export const ADMIN_AUDIT_LOGS_KEY = "womio:adminAuditLogsV1"
const SERVICES_POSTS_KEY = "servicesV1:posts"
const SERVICES_QUOTA_KEY = "servicesV1:quota"
const WALLET_KEY = "profileWalletV1"

export type WomioMember = {
  id: string
  username: string
  email: string
  fullName?: string
  country?: string
  city?: string
  birthDate?: string
  phone?: string
  roleIds?: string[]
  createdAt: string
  blocked: boolean
  blockedReason?: string
  blockedAt?: string
  blockedUntil?: string
}

export type AdminSystemStats = {
  membersTotal: number
  membersBlocked: number
  shoppingPosts: number
  shoppingExperiences: number
  shoppingMarketItems: number
  servicesPosts: number
  conversations: number
  messages: number
  reports: number
  walletBalanceTotal: number
  shoppingPackageRevenue: number
  shoppingPackageSalesCount: number
  servicesPackageRevenue: number
  servicesPackageSalesCount: number
}

export type AdminAuditLog = {
  id: string
  action: string
  targetType: "member" | "listing" | "system"
  targetId?: string
  targetLabel?: string
  note?: string
  createdAt: string
}

const safeParse = <T>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export const loadMembers = async (): Promise<WomioMember[]> => {
  const [raw, currentRaw, detailsRaw] = await Promise.all([
    AsyncStorage.getItem(WOMIO_MEMBERS_KEY),
    AsyncStorage.getItem("womio:userProfile"),
    AsyncStorage.getItem("profileDetailsV1"),
  ])
  const parsed = safeParse<any[]>(raw, [])
  let members = parsed
    .map((m, idx) => ({
      id: `${m?.id ?? `member-${idx}`}`,
      username: `${m?.username ?? ""}`,
      email: `${m?.email ?? ""}`.toLowerCase(),
      fullName: m?.fullName ? `${m.fullName}` : undefined,
      country: m?.country ? `${m.country}` : undefined,
      city: m?.city ? `${m.city}` : undefined,
      birthDate: m?.birthDate ? `${m.birthDate}` : undefined,
      phone: m?.phone ? `${m.phone}` : undefined,
      roleIds: Array.isArray(m?.roleIds) ? m.roleIds.map((x: unknown) => `${x}`.trim().toLowerCase()).filter((x: string) => x.length > 0) : [],
      createdAt: `${m?.createdAt ?? new Date().toISOString()}`,
      blocked: Boolean(m?.blocked),
      blockedReason: m?.blockedReason ? `${m.blockedReason}` : undefined,
      blockedAt: m?.blockedAt ? `${m.blockedAt}` : undefined,
      blockedUntil: m?.blockedUntil ? `${m.blockedUntil}` : undefined,
    }))
    .filter((m) => m.email.length > 0)
  if (members.length === 0 && currentRaw) {
    let current: any = null
    let details: any = null
    try { current = JSON.parse(currentRaw) } catch {}
    try { details = detailsRaw ? JSON.parse(detailsRaw) : null } catch {}
    const email = `${current?.email ?? ""}`.trim().toLowerCase()
    if (email) {
      members = [{
        id: `member-${Date.now()}`,
        username: `${current?.username ?? details?.username ?? email.split("@")[0]}`,
        email,
        fullName: details?.fullName ? `${details.fullName}` : undefined,
        country: details?.country ? `${details.country}` : undefined,
        city: details?.city ? `${details.city}` : undefined,
        birthDate: `${current?.birthDate ?? details?.birthDate ?? ""}` || undefined,
        phone: details?.phone ? `${details.phone}` : undefined,
        roleIds: [],
        createdAt: new Date().toISOString(),
        blocked: false,
        blockedReason: undefined,
        blockedAt: undefined,
        blockedUntil: undefined,
      }]
      await saveMembers(members)
    }
  }
  return members
}

export const saveMembers = async (members: WomioMember[]) => {
  await AsyncStorage.setItem(WOMIO_MEMBERS_KEY, JSON.stringify(members))
}

export const upsertMember = async (member: Omit<WomioMember, "id" | "createdAt" | "blocked">) => {
  const members = await loadMembers()
  const email = member.email.trim().toLowerCase()
  const existing = members.find((m) => m.email === email)
  if (existing) {
    const next = members.map((m) =>
      m.email === email
        ? {
            ...m,
            username: member.username || m.username,
            fullName: member.fullName || m.fullName,
            country: member.country || m.country,
            city: member.city || m.city,
            birthDate: member.birthDate || m.birthDate,
            phone: member.phone || m.phone,
            roleIds: Array.isArray(member.roleIds) && member.roleIds.length ? member.roleIds : m.roleIds,
          }
        : m
    )
    await saveMembers(next)
    return next.find((m) => m.email === email) ?? existing
  }
  const created: WomioMember = {
    id: `member-${Date.now()}`,
    username: member.username.trim(),
    email,
    fullName: member.fullName?.trim() || undefined,
    country: member.country?.trim() || undefined,
    city: member.city?.trim() || undefined,
    birthDate: member.birthDate?.trim() || undefined,
    phone: member.phone?.trim() || undefined,
    roleIds: Array.isArray(member.roleIds) ? member.roleIds.map((x) => `${x}`.trim().toLowerCase()).filter((x) => x.length > 0) : [],
    createdAt: new Date().toISOString(),
    blocked: false,
  }
  await saveMembers([created, ...members])
  return created
}

export const setMemberBlocked = async (memberId: string, blocked: boolean, reason?: string) => {
  const members = await loadMembers()
  const now = Date.now()
  const next = members.map((m) =>
    m.id === memberId
      ? {
          ...m,
          blocked,
          blockedReason: blocked ? (reason || m.blockedReason || "Admin block") : undefined,
          blockedAt: blocked ? new Date(now).toISOString() : undefined,
          blockedUntil: blocked ? undefined : undefined,
        }
      : m
  )
  await saveMembers(next)
  return next
}

export const setMemberBlockedForMinutes = async (memberId: string, minutes: number, reason?: string) => {
  const members = await loadMembers()
  const now = Date.now()
  const until = new Date(now + Math.max(1, minutes) * 60_000).toISOString()
  const next = members.map((m) =>
    m.id === memberId
      ? {
          ...m,
          blocked: true,
          blockedReason: reason || m.blockedReason || "Admin block",
          blockedAt: new Date(now).toISOString(),
          blockedUntil: until,
        }
      : m
  )
  await saveMembers(next)
  return next
}

export const deleteMember = async (memberId: string) => {
  const members = await loadMembers()
  const next = members.filter((m) => m.id !== memberId)
  await saveMembers(next)
  return next
}

export const setMemberRoles = async (memberId: string, roleIds: string[]) => {
  const members = await loadMembers()
  const clean = Array.from(new Set(roleIds.map((x) => `${x}`.trim().toLowerCase()).filter((x) => x.length > 0)))
  const next = members.map((m) => (m.id === memberId ? { ...m, roleIds: clean } : m))
  await saveMembers(next)
  return next
}

export const findMemberByEmail = async (email: string) => {
  const members = await loadMembers()
  const targetEmail = email.trim().toLowerCase()
  const member = members.find((m) => m.email === targetEmail) || null
  if (!member) return null
  if (member.blocked && member.blockedUntil) {
    const expired = new Date(member.blockedUntil).getTime() <= Date.now()
    if (expired) {
      const next = members.map((m) =>
        m.id === member.id
          ? { ...m, blocked: false, blockedReason: undefined, blockedAt: undefined, blockedUntil: undefined }
          : m
      )
      await saveMembers(next)
      return next.find((m) => m.id === member.id) || null
    }
  }
  return member
}

export const loadAdminSystemStats = async (): Promise<AdminSystemStats> => {
  const keys = [
    WOMIO_MEMBERS_KEY,
    SHOPPING_STORAGE_KEYS.sales,
    SHOPPING_STORAGE_KEYS.experiences,
    SHOPPING_STORAGE_KEYS.market,
    SHOPPING_STORAGE_KEYS.salesQuota,
    SERVICES_POSTS_KEY,
    SERVICES_QUOTA_KEY,
    CHAT_CONVERSATIONS_KEY,
    CHAT_MESSAGES_KEY,
    CHAT_REPORTS_KEY,
    WALLET_KEY,
  ]
  const raw = await AsyncStorage.multiGet(keys)
  const map = new Map(raw)

  const members = safeParse<WomioMember[]>(map.get(WOMIO_MEMBERS_KEY) ?? null, [])
  const shoppingPosts = safeParse<any[]>(map.get(SHOPPING_STORAGE_KEYS.sales) ?? null, [])
  const shoppingExperiences = safeParse<any[]>(map.get(SHOPPING_STORAGE_KEYS.experiences) ?? null, [])
  const shoppingMarketItems = safeParse<any[]>(map.get(SHOPPING_STORAGE_KEYS.market) ?? null, [])
  const servicesPosts = safeParse<any[]>(map.get(SERVICES_POSTS_KEY) ?? null, [])
  const shoppingQuota = safeParse<any>(map.get(SHOPPING_STORAGE_KEYS.salesQuota) ?? null, {})
  const servicesQuota = safeParse<any>(map.get(SERVICES_QUOTA_KEY) ?? null, {})
  const conversations = safeParse<any[]>(map.get(CHAT_CONVERSATIONS_KEY) ?? null, [])
  const messages = safeParse<any[]>(map.get(CHAT_MESSAGES_KEY) ?? null, [])
  const reports = safeParse<any[]>(map.get(CHAT_REPORTS_KEY) ?? null, [])
  const wallet = safeParse<{ balance?: number }>(map.get(WALLET_KEY) ?? null, {})
  const shoppingPurchases = Array.isArray((shoppingQuota as any)?.purchases) ? (shoppingQuota as any).purchases : []
  const servicesPurchases = Array.isArray((servicesQuota as any)?.purchases) ? (servicesQuota as any).purchases : []
  const shoppingPackageRevenue = shoppingPurchases.reduce((sum: number, x: any) => sum + (Number(x?.price) || 0), 0)
  const shoppingPackageSalesCount = shoppingPurchases.reduce((sum: number, x: any) => sum + (Number(x?.count) || 0), 0)
  const servicesPackageRevenue = servicesPurchases.reduce((sum: number, x: any) => sum + (Number(x?.price) || 0), 0)
  const servicesPackageSalesCount = servicesPurchases.reduce((sum: number, x: any) => sum + (Number(x?.count) || 0), 0)

  return {
    membersTotal: members.length,
    membersBlocked: members.filter((m) => m.blocked).length,
    shoppingPosts: shoppingPosts.length,
    shoppingExperiences: shoppingExperiences.length,
    shoppingMarketItems: shoppingMarketItems.length,
    servicesPosts: servicesPosts.length,
    conversations: conversations.length,
    messages: messages.length,
    reports: reports.length,
    walletBalanceTotal: Number(wallet?.balance) || 0,
    shoppingPackageRevenue,
    shoppingPackageSalesCount,
    servicesPackageRevenue,
    servicesPackageSalesCount,
  }
}

export const loadAdminAuditLogs = async (): Promise<AdminAuditLog[]> => {
  const raw = await AsyncStorage.getItem(ADMIN_AUDIT_LOGS_KEY)
  const parsed = safeParse<any[]>(raw, [])
  return parsed
    .map((x, idx) => ({
      id: `${x?.id ?? `audit-${Date.now()}-${idx}`}`,
      action: `${x?.action ?? ""}`.trim() || "unknown",
      targetType:
        x?.targetType === "member" || x?.targetType === "listing" || x?.targetType === "system"
          ? x.targetType
          : "system",
      targetId: x?.targetId ? `${x.targetId}` : undefined,
      targetLabel: x?.targetLabel ? `${x.targetLabel}` : undefined,
      note: x?.note ? `${x.note}` : undefined,
      createdAt: `${x?.createdAt ?? new Date().toISOString()}`,
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export const appendAdminAuditLog = async (
  input: Omit<AdminAuditLog, "id" | "createdAt">
): Promise<AdminAuditLog[]> => {
  const logs = await loadAdminAuditLogs()
  const nextLog: AdminAuditLog = {
    id: `audit-${Date.now()}`,
    createdAt: new Date().toISOString(),
    ...input,
  }
  const next = [nextLog, ...logs].slice(0, 500)
  await AsyncStorage.setItem(ADMIN_AUDIT_LOGS_KEY, JSON.stringify(next))
  return next
}
