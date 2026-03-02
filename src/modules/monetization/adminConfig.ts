import AsyncStorage from "@react-native-async-storage/async-storage"

export const ADMIN_CONFIG_STORAGE_KEY = "womio:adminConfigV1"

export type PermissionKey =
  | "admin.access_panel"
  | "admin.dashboard.view"
  | "admin.members.view"
  | "admin.members.block"
  | "admin.members.delete"
  | "admin.moderation.view"
  | "admin.moderation.manage"
  | "admin.support.view"
  | "admin.support.reply"
  | "admin.support.status"
  | "admin.audit.view"
  | "admin.modules.manage"
  | "admin.ads.manage"
  | "admin.reward.manage"
  | "admin.roles.manage"
  | "admin.finance.view"

export type RoleDefinition = {
  id: string
  name: string
  permissions: PermissionKey[]
}

export type AdPlacementKey =
  | "homeTop"
  | "homeBottom"
  | "shoppingCompare"
  | "shoppingSell"

export type AdPlacement = {
  enabled: boolean
  title: string
  subtitle: string
  ctaLabel: string
}

export type AdminConfig = {
  auth: {
    adminPin: string
    sessionMinutes: number
    masterAdminEmail: string
    masterAdminPassword: string
  }
  roles: RoleDefinition[]
  adsEnabled: boolean
  modules: {
    home: boolean
    health: boolean
    services: boolean
    shopping: boolean
    food: boolean
    messages: boolean
    astrology: boolean
    profile: boolean
  }
  placements: Record<AdPlacementKey, AdPlacement>
  reward: {
    fixedAmountTl: number
    dynamicEnabled: boolean
    dailyLimit: number
    cooldownSec: number
    maxAttemptsIn10Min: number
    spamLockMinutes: number
    clockDriftLockMinutes: number
  }
}

export const defaultAdminConfig: AdminConfig = {
  auth: {
    adminPin: "1234",
    sessionMinutes: 30,
    masterAdminEmail: "kayhankyp@gmail.com",
    masterAdminPassword: "naz20082010",
  },
  roles: [
    {
      id: "support_staff",
      name: "Müşteri Hizmetleri",
      permissions: [
        "admin.access_panel",
        "admin.support.view",
        "admin.support.reply",
        "admin.support.status",
        "admin.members.view",
        "admin.members.block",
      ],
    },
    {
      id: "accounting_staff",
      name: "Muhasebe",
      permissions: ["admin.access_panel", "admin.dashboard.view", "admin.finance.view", "admin.audit.view"],
    },
    {
      id: "moderator_staff",
      name: "Moderatör",
      permissions: [
        "admin.access_panel",
        "admin.moderation.view",
        "admin.moderation.manage",
        "admin.members.view",
        "admin.members.block",
      ],
    },
  ],
  adsEnabled: true,
  modules: {
    home: true,
    health: true,
    services: true,
    shopping: true,
    food: true,
    messages: true,
    astrology: true,
    profile: true,
  },
  placements: {
    homeTop: {
      enabled: true,
      title: "WOMIO Reklam Alanı",
      subtitle: "Google reklam entegrasyonu için hazır alan",
      ctaLabel: "Sponsorlu",
    },
    homeBottom: {
      enabled: true,
      title: "Önerilen Markalar",
      subtitle: "Bu alan dinamik sponsorlu kartlar için kullanılacak",
      ctaLabel: "Sponsorlu",
    },
    shoppingCompare: {
      enabled: true,
      title: "Google Alışveriş Reklamı",
      subtitle: "Arama niyetine göre sponsorlu ürünler burada gösterilecek",
      ctaLabel: "Reklam",
    },
    shoppingSell: {
      enabled: true,
      title: "Satış Reklam Alanı",
      subtitle: "Google reklamları ve öne çıkan kampanyalar burada yayınlanır",
      ctaLabel: "Kampanya",
    },
  },
  reward: {
    fixedAmountTl: 5,
    dynamicEnabled: false,
    dailyLimit: 5,
    cooldownSec: 30,
    maxAttemptsIn10Min: 8,
    spamLockMinutes: 20,
    clockDriftLockMinutes: 10,
  },
}

const clampInt = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Number(v)
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, Math.round(n)))
}

const sanitizePlacement = (input: Partial<AdPlacement> | undefined, fallback: AdPlacement): AdPlacement => ({
  enabled: typeof input?.enabled === "boolean" ? input.enabled : fallback.enabled,
  title: `${input?.title ?? fallback.title}`.trim() || fallback.title,
  subtitle: `${input?.subtitle ?? fallback.subtitle}`.trim() || fallback.subtitle,
  ctaLabel: `${input?.ctaLabel ?? fallback.ctaLabel}`.trim() || fallback.ctaLabel,
})

const ALL_PERMISSIONS: PermissionKey[] = [
  "admin.access_panel",
  "admin.dashboard.view",
  "admin.members.view",
  "admin.members.block",
  "admin.members.delete",
  "admin.moderation.view",
  "admin.moderation.manage",
  "admin.support.view",
  "admin.support.reply",
  "admin.support.status",
  "admin.audit.view",
  "admin.modules.manage",
  "admin.ads.manage",
  "admin.reward.manage",
  "admin.roles.manage",
  "admin.finance.view",
]

const sanitizeRoles = (input: unknown): RoleDefinition[] => {
  const list = Array.isArray(input) ? input : []
  const next = list
    .map((r, idx) => {
      const role = r as Partial<RoleDefinition>
      const id = `${role?.id ?? `role_${idx}`}`
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "_")
      const name = `${role?.name ?? "Yeni Rol"}`.trim() || "Yeni Rol"
      const permissions = Array.isArray(role?.permissions)
        ? role.permissions.filter((p): p is PermissionKey => ALL_PERMISSIONS.includes(p as PermissionKey))
        : []
      return { id, name, permissions: Array.from(new Set(permissions)) }
    })
    .filter((r) => r.id.length > 0)
  return next.length ? next : defaultAdminConfig.roles
}

export const sanitizeAdminConfig = (input?: Partial<AdminConfig> | null): AdminConfig => {
  const auth: Partial<AdminConfig["auth"]> = input?.auth ?? {}
  const reward: Partial<AdminConfig["reward"]> = input?.reward ?? {}
  const placements: Partial<Record<AdPlacementKey, Partial<AdPlacement>>> = input?.placements ?? {}
  const modules: Partial<AdminConfig["modules"]> = input?.modules ?? {}
  return {
    auth: {
      adminPin: `${auth.adminPin ?? defaultAdminConfig.auth.adminPin}`.replace(/[^\d]/g, "").slice(0, 8) || defaultAdminConfig.auth.adminPin,
      sessionMinutes: clampInt(auth.sessionMinutes, 1, 240, defaultAdminConfig.auth.sessionMinutes),
      masterAdminEmail:
        `${auth.masterAdminEmail ?? defaultAdminConfig.auth.masterAdminEmail}`.trim().toLowerCase() ||
        defaultAdminConfig.auth.masterAdminEmail,
      masterAdminPassword:
        `${auth.masterAdminPassword ?? defaultAdminConfig.auth.masterAdminPassword}`.trim() ||
        defaultAdminConfig.auth.masterAdminPassword,
    },
    roles: sanitizeRoles(input?.roles),
    adsEnabled: typeof input?.adsEnabled === "boolean" ? input.adsEnabled : defaultAdminConfig.adsEnabled,
    modules: {
      home: typeof modules.home === "boolean" ? modules.home : defaultAdminConfig.modules.home,
      health: typeof modules.health === "boolean" ? modules.health : defaultAdminConfig.modules.health,
      services: typeof modules.services === "boolean" ? modules.services : defaultAdminConfig.modules.services,
      shopping: typeof modules.shopping === "boolean" ? modules.shopping : defaultAdminConfig.modules.shopping,
      food: typeof modules.food === "boolean" ? modules.food : defaultAdminConfig.modules.food,
      messages: typeof modules.messages === "boolean" ? modules.messages : defaultAdminConfig.modules.messages,
      astrology: typeof modules.astrology === "boolean" ? modules.astrology : defaultAdminConfig.modules.astrology,
      profile: typeof modules.profile === "boolean" ? modules.profile : defaultAdminConfig.modules.profile,
    },
    placements: {
      homeTop: sanitizePlacement(placements.homeTop, defaultAdminConfig.placements.homeTop),
      homeBottom: sanitizePlacement(placements.homeBottom, defaultAdminConfig.placements.homeBottom),
      shoppingCompare: sanitizePlacement(placements.shoppingCompare, defaultAdminConfig.placements.shoppingCompare),
      shoppingSell: sanitizePlacement(placements.shoppingSell, defaultAdminConfig.placements.shoppingSell),
    },
    reward: {
      fixedAmountTl: clampInt(reward.fixedAmountTl, 1, 500, defaultAdminConfig.reward.fixedAmountTl),
      dynamicEnabled: typeof reward.dynamicEnabled === "boolean" ? reward.dynamicEnabled : defaultAdminConfig.reward.dynamicEnabled,
      dailyLimit: clampInt(reward.dailyLimit, 1, 50, defaultAdminConfig.reward.dailyLimit),
      cooldownSec: clampInt(reward.cooldownSec, 0, 600, defaultAdminConfig.reward.cooldownSec),
      maxAttemptsIn10Min: clampInt(reward.maxAttemptsIn10Min, 1, 60, defaultAdminConfig.reward.maxAttemptsIn10Min),
      spamLockMinutes: clampInt(reward.spamLockMinutes, 1, 180, defaultAdminConfig.reward.spamLockMinutes),
      clockDriftLockMinutes: clampInt(reward.clockDriftLockMinutes, 1, 180, defaultAdminConfig.reward.clockDriftLockMinutes),
    },
  }
}

export async function loadAdminConfig(): Promise<AdminConfig> {
  const raw = await AsyncStorage.getItem(ADMIN_CONFIG_STORAGE_KEY)
  if (!raw) return defaultAdminConfig
  try {
    const parsed = JSON.parse(raw) as Partial<AdminConfig>
    return sanitizeAdminConfig(parsed)
  } catch {
    return defaultAdminConfig
  }
}

export async function saveAdminConfig(config: AdminConfig): Promise<void> {
  const safe = sanitizeAdminConfig(config)
  await AsyncStorage.setItem(ADMIN_CONFIG_STORAGE_KEY, JSON.stringify(safe))
}

export const resolvePermissionsByRoleIds = (
  roles: RoleDefinition[],
  roleIds: string[] | undefined
): Set<PermissionKey> => {
  const ids = new Set((roleIds || []).map((x) => `${x}`.trim().toLowerCase()))
  const perms = new Set<PermissionKey>()
  roles.forEach((r) => {
    if (!ids.has(r.id)) return
    r.permissions.forEach((p) => perms.add(p))
  })
  return perms
}
