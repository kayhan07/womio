import AsyncStorage from "@react-native-async-storage/async-storage"
import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Animated, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native"
import {
  AdminConfig,
  PermissionKey,
  RoleDefinition,
  defaultAdminConfig,
  loadAdminConfig,
  resolvePermissionsByRoleIds,
  saveAdminConfig,
} from "../src/modules/monetization/adminConfig"
import {
  AdminAuditLog,
  AdminSystemStats,
  WomioMember,
  appendAdminAuditLog,
  deleteMember,
  loadAdminAuditLogs,
  loadAdminSystemStats,
  loadMembers,
  saveMembers,
  setMemberRoles,
  setMemberBlocked,
  setMemberBlockedForMinutes,
} from "../src/modules/admin/system"
import { SHOPPING_STORAGE_KEYS } from "../src/modules/shopping/storage"
import {
  ChatConversation,
  ChatReport,
  loadConversations,
  loadReports,
  saveReports,
} from "../src/modules/chat/storage"
import { moduleStyles } from "../src/theme/moduleStyles"
import { tc } from "../src/theme/tokens"
import {
  SupportTicketCategory,
  SupportTicketPriority,
  SupportTicket,
  loadSupportTickets,
  replySupportTicket,
  setSupportTicketStatus,
} from "../src/modules/support/storage"

const ADMIN_SESSION_KEY = "womio:adminSessionV1"

const emptyStats: AdminSystemStats = {
  membersTotal: 0,
  membersBlocked: 0,
  shoppingPosts: 0,
  shoppingExperiences: 0,
  shoppingMarketItems: 0,
  servicesPosts: 0,
  conversations: 0,
  messages: 0,
  reports: 0,
  walletBalanceTotal: 0,
  shoppingPackageRevenue: 0,
  shoppingPackageSalesCount: 0,
  servicesPackageRevenue: 0,
  servicesPackageSalesCount: 0,
}

type AdminTab = "dashboard" | "members" | "moderation" | "support" | "audit" | "roles" | "modules" | "ads" | "reward" | "finance"
type ModerationStatusFilter = "all" | "active" | "closed" | "sold" | "pending"
type ModerationSourceFilter = "all" | "shopping" | "services"

type ModerationItem = {
  id: string
  source: "shopping" | "services"
  title: string
  status: string
  category?: string
  owner?: string
  city?: string
  createdAt?: string
}

type ReportItem = {
  id: string
  conversationId: string
  conversationTitle?: string
  reportedUserId: string
  reason: string
  createdAt: string
}

const SUPPORT_REPLY_TEMPLATES = [
  "Talebinizi aldık, en kısa sürede detaylı dönüş sağlayacağız.",
  "Sorunu doğruladık, teknik ekibe yönlendirdik. Gelişmeleri paylaşacağız.",
  "İşleminiz tamamlandı. Uygulamayı kapatıp yeniden açarak kontrol edebilir misiniz?",
] as const

const PERMISSIONS: PermissionKey[] = [
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

const PERMISSION_LABELS: Record<PermissionKey, string> = {
  "admin.access_panel": "Panele erişim",
  "admin.dashboard.view": "Dashboard görüntüleme",
  "admin.members.view": "Üyeler görüntüleme",
  "admin.members.block": "Üye engelleme",
  "admin.members.delete": "Üye silme",
  "admin.moderation.view": "Moderasyon görüntüleme",
  "admin.moderation.manage": "Moderasyon yönetme",
  "admin.support.view": "Destek talepleri görüntüleme",
  "admin.support.reply": "Destek talebi yanıtlama",
  "admin.support.status": "Destek talebi durum değiştirme",
  "admin.audit.view": "İşlem geçmişi görüntüleme",
  "admin.modules.manage": "Modül yönetimi",
  "admin.ads.manage": "Reklam yönetimi",
  "admin.reward.manage": "İzle kazan yönetimi",
  "admin.roles.manage": "Rol yönetimi",
  "admin.finance.view": "Gelir ekranı görüntüleme",
}

const placementLabels = {
  homeTop: "Ana Sayfa Üst",
  homeBottom: "Ana Sayfa Alt",
  shoppingCompare: "Karşılaştırma",
  shoppingSell: "Satış Yap",
} as const

const moduleLabels: Record<keyof AdminConfig["modules"], string> = {
  home: "Ana Sayfa",
  health: "Sağlık",
  services: "Hizmet/İlanlar",
  shopping: "Akıllı Alışveriş",
  food: "Yemek",
  messages: "Mesajlar",
  astrology: "Astroloji",
  profile: "Profil",
}

const ROLE_TEMPLATES: {
  id: string
  name: string
  permissions: PermissionKey[]
}[] = [
  {
    id: "moderator",
    name: "Moderatör",
    permissions: [
      "admin.access_panel",
      "admin.dashboard.view",
      "admin.members.view",
      "admin.moderation.view",
      "admin.moderation.manage",
      "admin.support.view",
      "admin.audit.view",
    ],
  },
  {
    id: "support_agent",
    name: "Destek Uzmanı",
    permissions: [
      "admin.access_panel",
      "admin.dashboard.view",
      "admin.members.view",
      "admin.support.view",
      "admin.support.reply",
      "admin.support.status",
      "admin.audit.view",
    ],
  },
  {
    id: "finance_manager",
    name: "Finans Sorumlusu",
    permissions: [
      "admin.access_panel",
      "admin.dashboard.view",
      "admin.finance.view",
      "admin.audit.view",
    ],
  },
]

const TAB_PERMISSION_MAP: Record<AdminTab, PermissionKey> = {
  dashboard: "admin.dashboard.view",
  members: "admin.members.view",
  moderation: "admin.moderation.view",
  support: "admin.support.view",
  audit: "admin.audit.view",
  roles: "admin.roles.manage",
  modules: "admin.modules.manage",
  ads: "admin.ads.manage",
  reward: "admin.reward.manage",
  finance: "admin.finance.view",
}

const SERVICES_POSTS_KEY = "servicesV1:posts"
const safeParse = <T,>(raw: string | null): T[] => {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as T[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export default function AdminScreen() {
  const [tab, setTab] = useState<AdminTab>("dashboard")
  const [compactUi, setCompactUi] = useState(false)
  const [cfg, setCfg] = useState<AdminConfig>(defaultAdminConfig)
  const [stats, setStats] = useState<AdminSystemStats>(emptyStats)
  const [prevStats, setPrevStats] = useState<AdminSystemStats>(emptyStats)
  const [members, setMembers] = useState<WomioMember[]>([])
  const [memberSearch, setMemberSearch] = useState("")
  const [selectedMemberIds, setSelectedMemberIds] = useState<Record<string, boolean>>({})
  const [bulkRoleId, setBulkRoleId] = useState("")
  const [memberBlockMinutes, setMemberBlockMinutes] = useState("60")
  const [memberBlockUnit, setMemberBlockUnit] = useState<"minute" | "hour" | "day">("minute")
  const [memberBlockReason, setMemberBlockReason] = useState("Admin kararı")
  const [pinInput, setPinInput] = useState("")
  const [securityPinInput, setSecurityPinInput] = useState("")
  const [securityUnlockedUntil, setSecurityUnlockedUntil] = useState(0)
  const [unlocked, setUnlocked] = useState(false)
  const [pinChangeInput, setPinChangeInput] = useState("")
  const [note, setNote] = useState("")
  const [undoLabel, setUndoLabel] = useState("")
  const [canAccess, setCanAccess] = useState<boolean | null>(null)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [currentPermissions, setCurrentPermissions] = useState<Set<string>>(new Set())
  const [newRoleName, setNewRoleName] = useState("")
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([])
  const [moderationItems, setModerationItems] = useState<ModerationItem[]>([])
  const [selectedModerationIds, setSelectedModerationIds] = useState<Record<string, boolean>>({})
  const [moderationSearch, setModerationSearch] = useState("")
  const [moderationStatusFilter, setModerationStatusFilter] = useState<ModerationStatusFilter>("all")
  const [moderationSourceFilter, setModerationSourceFilter] = useState<ModerationSourceFilter>("all")
  const [reportSearch, setReportSearch] = useState("")
  const [reportItems, setReportItems] = useState<ReportItem[]>([])
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([])
  const [supportSearch, setSupportSearch] = useState("")
  const [supportReplies, setSupportReplies] = useState<Record<string, string>>({})
  const [supportCategoryFilter, setSupportCategoryFilter] = useState<"all" | SupportTicketCategory>("all")
  const [supportPriorityFilter, setSupportPriorityFilter] = useState<"all" | SupportTicketPriority>("all")
  const [supportStatusFilter, setSupportStatusFilter] = useState<"all" | "open" | "closed" | "overdue">("all")
  const [roleMemberSearch, setRoleMemberSearch] = useState("")
  const [selectedRoleMemberId, setSelectedRoleMemberId] = useState("")
  const [rolePermissionSearch, setRolePermissionSearch] = useState("")
  const [roleTransferJson, setRoleTransferJson] = useState("")
  const tabPulseAnim = useRef(new Animated.Value(1)).current
  const tabAccentAnim = useRef(new Animated.Value(1)).current
  const tabScrollRef = useRef<ScrollView | null>(null)
  const tabScrollXRef = useRef(0)
  const undoActionRef = useRef<null | (() => Promise<void>)>(null)

  const refresh = useCallback(async () => {
    const [nextCfg, nextStats, nextMembers, nextAudit, shoppingRaw, servicesRaw, reports, conversations, tickets] =
      await Promise.all([
      loadAdminConfig(),
      loadAdminSystemStats(),
      loadMembers(),
      loadAdminAuditLogs(),
      AsyncStorage.getItem(SHOPPING_STORAGE_KEYS.sales),
      AsyncStorage.getItem(SERVICES_POSTS_KEY),
      loadReports(),
      loadConversations(),
      loadSupportTickets(),
    ])
    const shoppingSales = safeParse<any>(shoppingRaw).map((it, idx) => ({
      id: `${it?.id ?? `shopping-${idx}`}`,
      source: "shopping" as const,
      title: `${it?.title ?? "Başlıksız ilan"}`,
      status: `${it?.status ?? "active"}`,
      category: it?.category ? `${it.category}` : undefined,
      owner: it?.ownerName ? `${it.ownerName}` : undefined,
      city: it?.city ? `${it.city}` : undefined,
      createdAt: it?.createdAt ? `${it.createdAt}` : undefined,
    }))
    const servicesPosts = safeParse<any>(servicesRaw).map((it, idx) => ({
      id: `${it?.id ?? `services-${idx}`}`,
      source: "services" as const,
      title: `${it?.title ?? "Başlıksız ilan"}`,
      status: `${it?.status ?? "active"}`,
      category: it?.category ? `${it.category}` : undefined,
      owner: it?.ownerName ? `${it.ownerName}` : undefined,
      city: it?.city ? `${it.city}` : undefined,
      createdAt: it?.createdAt ? `${it.createdAt}` : undefined,
    }))
    setCfg(nextCfg)
    setStats((current) => {
      setPrevStats(current)
      return nextStats
    })
    setMembers(nextMembers)
    setAuditLogs(nextAudit)
    setModerationItems(
      [...shoppingSales, ...servicesPosts].sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      )
    )
    const convMap = new Map<string, ChatConversation>(conversations.map((c) => [c.id, c]))
    const mappedReports = reports
      .map((r: ChatReport) => ({
        id: r.id,
        conversationId: r.conversationId,
        conversationTitle: convMap.get(r.conversationId)?.postTitle || "Konuşma",
        reportedUserId: r.reportedUserId,
        reason: r.reason,
        createdAt: r.createdAt,
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    setReportItems(mappedReports)
    setSupportTickets(tickets)
  }, [])

  useEffect(() => {
    const init = async () => {
      const nextCfg = await loadAdminConfig()
      setCfg(nextCfg)
      const userRaw = await AsyncStorage.getItem("womio:userProfile")
      let allowed = false
      let superAdmin = false
      let perms = new Set<string>()
      try {
        const u = userRaw ? (JSON.parse(userRaw) as { isAdmin?: boolean; email?: string; roleIds?: string[]; permissions?: string[] }) : null
        const email = `${u?.email ?? ""}`.trim().toLowerCase()
        superAdmin = Boolean(u?.isAdmin) || (!!email && email === nextCfg.auth.masterAdminEmail.trim().toLowerCase())
        if (superAdmin) {
          perms = new Set(["*"])
          allowed = true
        } else {
          const byRole = resolvePermissionsByRoleIds(nextCfg.roles, u?.roleIds || [])
          const merged = new Set<string>([...Array.from(byRole), ...((u?.permissions || []).map((x) => `${x}`))])
          perms = merged
          allowed = merged.has("admin.access_panel")
        }
      } catch {}
      setIsSuperAdmin(superAdmin)
      setCurrentPermissions(perms)
      setCanAccess(allowed)
      if (!allowed) return
      const raw = await AsyncStorage.getItem(ADMIN_SESSION_KEY)
      if (!raw) return
      try {
        const parsed = JSON.parse(raw) as { unlockedAt?: string }
        const unlockedAt = parsed?.unlockedAt ? new Date(parsed.unlockedAt).getTime() : 0
        if (unlockedAt > 0 && Date.now() - unlockedAt < nextCfg.auth.sessionMinutes * 60_000) {
          setUnlocked(true)
        }
      } catch {}
    }
    void init()
  }, [])

  useEffect(() => {
    if (!unlocked) return
    void refresh()
    const timer = setInterval(() => void refresh(), 4000)
    return () => clearInterval(timer)
  }, [unlocked, refresh])

  useEffect(() => {
    const canTab = (id: AdminTab) =>
      isSuperAdmin || currentPermissions.has("*") || currentPermissions.has(TAB_PERMISSION_MAP[id])
    if (canTab(tab)) return
    const first = (Object.keys(TAB_PERMISSION_MAP) as AdminTab[]).find((id) => canTab(id))
    if (first) setTab(first)
  }, [tab, isSuperAdmin, currentPermissions])

  useEffect(() => {
    tabPulseAnim.setValue(0.97)
    tabAccentAnim.setValue(0.2)
    Animated.parallel([
      Animated.spring(tabPulseAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 20,
        bounciness: 10,
      }),
      Animated.timing(tabAccentAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start()
  }, [tab, tabPulseAnim, tabAccentAnim])

  useEffect(() => {
    setSelectedMemberIds((prev) => {
      const valid = new Set(members.map((m) => m.id))
      const next: Record<string, boolean> = {}
      for (const id of Object.keys(prev)) {
        if (prev[id] && valid.has(id)) next[id] = true
      }
      return next
    })
  }, [members])

  useEffect(() => {
    setSelectedModerationIds((prev) => {
      const valid = new Set(moderationItems.map((it) => `${it.source}:${it.id}`))
      const next: Record<string, boolean> = {}
      for (const id of Object.keys(prev)) {
        if (prev[id] && valid.has(id)) next[id] = true
      }
      return next
    })
  }, [moderationItems])

  const save = async () => {
    await saveAdminConfig(cfg)
    const logs = await appendAdminAuditLog({
      action: "admin_config_saved",
      targetType: "system",
      note: "Ayarlar kaydedildi",
    })
    setAuditLogs(logs)
    setNote("Ayarlar kaydedildi.")
    setTimeout(() => setNote(""), 1800)
  }

  const registerUndo = (label: string, action: () => Promise<void>) => {
    undoActionRef.current = action
    setUndoLabel(label)
  }

  const runUndo = async () => {
    if (!undoActionRef.current) return
    await undoActionRef.current()
    undoActionRef.current = null
    setUndoLabel("")
    setNote("Son işlem geri alındı.")
    setTimeout(() => setNote(""), 1800)
  }

  const scrollTabsBy = (delta: number) => {
    const next = Math.max(0, tabScrollXRef.current + delta)
    tabScrollRef.current?.scrollTo({ x: next, animated: true })
  }

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase()
    if (!q) return members
    return members.filter((m) => `${m.username} ${m.email} ${m.fullName || ""}`.toLowerCase().includes(q))
  }, [members, memberSearch])

  const filteredRoleMembers = useMemo(() => {
    const q = roleMemberSearch.trim().toLowerCase()
    if (!q) return members.slice(0, 20)
    return members
      .filter((m) => `${m.username} ${m.email} ${m.fullName || ""}`.toLowerCase().includes(q))
      .slice(0, 20)
  }, [members, roleMemberSearch])

  const selectedRoleMember = useMemo(
    () => members.find((m) => m.id === selectedRoleMemberId) || null,
    [members, selectedRoleMemberId]
  )
  const selectedMembers = useMemo(
    () => members.filter((m) => selectedMemberIds[m.id]),
    [members, selectedMemberIds]
  )
  const selectedMemberCount = selectedMembers.length

  const filteredModeration = useMemo(() => {
    const q = moderationSearch.trim().toLowerCase()
    return moderationItems.filter((it) => {
      const sourceOk = moderationSourceFilter === "all" || it.source === moderationSourceFilter
      const statusOk = moderationStatusFilter === "all" || it.status === moderationStatusFilter
      const textOk =
        !q ||
        `${it.title} ${it.category || ""} ${it.owner || ""} ${it.city || ""}`.toLowerCase().includes(q)
      return sourceOk && statusOk && textOk
    })
  }, [moderationItems, moderationSearch, moderationSourceFilter, moderationStatusFilter])
  const selectedModerationItems = useMemo(
    () =>
      moderationItems.filter(
        (it) => selectedModerationIds[`${it.source}:${it.id}`]
      ),
    [moderationItems, selectedModerationIds]
  )
  const selectedModerationCount = selectedModerationItems.length

  const filteredReports = useMemo(() => {
    const q = reportSearch.trim().toLowerCase()
    if (!q) return reportItems
    return reportItems.filter((r) =>
      `${r.conversationTitle || ""} ${r.reason} ${r.reportedUserId}`.toLowerCase().includes(q)
    )
  }, [reportItems, reportSearch])

  const filteredSupportTickets = useMemo(() => {
    const q = supportSearch.trim().toLowerCase()
    const now = Date.now()
    return supportTickets.filter((t) => {
      const textOk =
        !q ||
        `${t.subject} ${t.message} ${t.userName} ${t.userEmail || ""} ${t.category} ${t.priority}`
          .toLowerCase()
          .includes(q)
      const categoryOk = supportCategoryFilter === "all" || t.category === supportCategoryFilter
      const priorityOk = supportPriorityFilter === "all" || t.priority === supportPriorityFilter
      const overdue = t.status === "open" && now - new Date(t.createdAt).getTime() > 24 * 60 * 60 * 1000
      const statusOk =
        supportStatusFilter === "all" ||
        (supportStatusFilter === "overdue" ? overdue : t.status === supportStatusFilter)
      return textOk && categoryOk && priorityOk && statusOk
    })
  }, [supportTickets, supportSearch, supportCategoryFilter, supportPriorityFilter, supportStatusFilter])
  const filteredRolePermissions = useMemo(() => {
    const q = rolePermissionSearch.trim().toLowerCase()
    if (!q) return PERMISSIONS
    return PERMISSIONS.filter((perm) => {
      const label = PERMISSION_LABELS[perm]?.toLowerCase() || ""
      return perm.toLowerCase().includes(q) || label.includes(q)
    })
  }, [rolePermissionSearch])
  const openSupportCount = useMemo(
    () => supportTickets.filter((t) => t.status === "open").length,
    [supportTickets]
  )
  const overdueSupportCount = useMemo(
    () =>
      supportTickets.filter(
        (t) => t.status === "open" && Date.now() - new Date(t.createdAt).getTime() > 24 * 60 * 60 * 1000
      ).length,
    [supportTickets]
  )
  const dashboardAlerts = useMemo(() => {
    const alerts: { level: "high" | "medium"; text: string }[] = []
    if (overdueSupportCount > 0) alerts.push({ level: "high", text: `${overdueSupportCount} destek talebi SLA aştı.` })
    if (stats.membersBlocked > 20) alerts.push({ level: "medium", text: `Engelli üye sayısı yüksek: ${stats.membersBlocked}` })
    if (stats.reports > 0) alerts.push({ level: "medium", text: `Açık rapor sayısı: ${stats.reports}` })
    return alerts
  }, [overdueSupportCount, stats.membersBlocked, stats.reports])
  const pendingModerationCount = useMemo(
    () => moderationItems.filter((it) => it.status === "pending").length,
    [moderationItems]
  )

  const hasPermission = (perm: PermissionKey) => isSuperAdmin || currentPermissions.has("*") || currentPermissions.has(perm)
  const canSaveSettings =
    isSuperAdmin ||
    hasPermission("admin.modules.manage") ||
    hasPermission("admin.ads.manage") ||
    hasPermission("admin.reward.manage") ||
    hasPermission("admin.roles.manage")

  const verifySensitivePin = () => {
    if (securityPinInput.trim() !== cfg.auth.adminPin) {
      setNote("Hassas işlem için PIN doğrulaması başarısız.")
      setTimeout(() => setNote(""), 1800)
      return false
    }
    setSecurityUnlockedUntil(Date.now() + 2 * 60 * 1000)
    setSecurityPinInput("")
    return true
  }

  const requireSensitiveAuth = () => {
    if (Date.now() < securityUnlockedUntil) return true
    return verifySensitivePin()
  }

  const toggleBlockMember = async (member: WomioMember) => {
    if (!hasPermission("admin.members.block")) return
    const next = await setMemberBlocked(member.id, !member.blocked, member.blocked ? undefined : "Admin kararı")
    setMembers(next)
    const logs = await appendAdminAuditLog({
      action: member.blocked ? "member_unblocked" : "member_blocked_permanent",
      targetType: "member",
      targetId: member.id,
      targetLabel: member.email,
      note: member.blocked ? "Süresiz engel kaldırıldı" : "Süresiz engellendi",
    })
    setAuditLogs(logs)
  }

  const blockMemberTemporarily = async (member: WomioMember) => {
    if (!hasPermission("admin.members.block")) return
    const raw = Math.max(1, Number(memberBlockMinutes) || 1)
    const minutes = memberBlockUnit === "minute" ? raw : memberBlockUnit === "hour" ? raw * 60 : raw * 24 * 60
    const reason = memberBlockReason.trim() || "Admin kararı"
    const next = await setMemberBlockedForMinutes(member.id, minutes, reason)
    setMembers(next)
    const logs = await appendAdminAuditLog({
      action: "member_blocked_temporary",
      targetType: "member",
      targetId: member.id,
      targetLabel: member.email,
      note: `${minutes} dk | ${reason}`,
    })
    setAuditLogs(logs)
    setNote(`Üye ${minutes} dk engellendi.`)
    setTimeout(() => setNote(""), 1800)
  }

  const removeMember = async (member: WomioMember) => {
    if (!hasPermission("admin.members.delete")) return
    if (!requireSensitiveAuth()) return
    const prevMembers = members
    const next = await deleteMember(member.id)
    setMembers(next)
    registerUndo("Üye silme", async () => {
      await saveMembers(prevMembers)
      setMembers(prevMembers)
    })
    const logs = await appendAdminAuditLog({
      action: "member_deleted",
      targetType: "member",
      targetId: member.id,
      targetLabel: member.email,
      note: member.fullName || member.username,
    })
    setAuditLogs(logs)
    setNote("Üye silindi.")
    setTimeout(() => setNote(""), 1800)
  }

  const clearBlocked = async () => {
    if (!hasPermission("admin.members.block")) return
    const next = members.map((m) => ({ ...m, blocked: false, blockedAt: undefined, blockedReason: undefined, blockedUntil: undefined }))
    await saveMembers(next)
    setMembers(next)
    const logs = await appendAdminAuditLog({
      action: "members_unblocked_all",
      targetType: "system",
      note: "Toplu engel kaldırma",
    })
    setAuditLogs(logs)
    setNote("Tüm engeller kaldırıldı.")
    setTimeout(() => setNote(""), 1800)
  }

  const toggleMemberSelection = (memberId: string) => {
    setSelectedMemberIds((prev) => ({ ...prev, [memberId]: !prev[memberId] }))
  }

  const selectAllFilteredMembers = () => {
    const next: Record<string, boolean> = {}
    filteredMembers.forEach((m) => {
      next[m.id] = true
    })
    setSelectedMemberIds(next)
  }

  const clearMemberSelection = () => setSelectedMemberIds({})

  const bulkBlockMembers = async () => {
    if (!hasPermission("admin.members.block") || selectedMemberCount === 0) return
    if (!requireSensitiveAuth()) return
    const prevMembers = members
    const reason = memberBlockReason.trim() || "Admin kararı"
    const now = new Date().toISOString()
    const selectedSet = new Set(selectedMembers.map((m) => m.id))
    const next = members.map((m) =>
      selectedSet.has(m.id)
        ? { ...m, blocked: true, blockedAt: now, blockedReason: reason, blockedUntil: undefined }
        : m
    )
    await saveMembers(next)
    setMembers(next)
    registerUndo("Toplu engelleme", async () => {
      await saveMembers(prevMembers)
      setMembers(prevMembers)
    })
    const logs = await appendAdminAuditLog({
      action: "members_blocked_bulk_permanent",
      targetType: "member",
      note: `${selectedMemberCount} üye süresiz engellendi`,
    })
    setAuditLogs(logs)
    setNote(`${selectedMemberCount} üye süresiz engellendi.`)
    setTimeout(() => setNote(""), 1800)
  }

  const bulkUnblockMembers = async () => {
    if (!hasPermission("admin.members.block") || selectedMemberCount === 0) return
    if (!requireSensitiveAuth()) return
    const prevMembers = members
    const selectedSet = new Set(selectedMembers.map((m) => m.id))
    const next = members.map((m) =>
      selectedSet.has(m.id)
        ? { ...m, blocked: false, blockedAt: undefined, blockedReason: undefined, blockedUntil: undefined }
        : m
    )
    await saveMembers(next)
    setMembers(next)
    registerUndo("Toplu engel kaldırma", async () => {
      await saveMembers(prevMembers)
      setMembers(prevMembers)
    })
    const logs = await appendAdminAuditLog({
      action: "members_unblocked_bulk",
      targetType: "member",
      note: `${selectedMemberCount} üye engeli kaldırıldı`,
    })
    setAuditLogs(logs)
    setNote(`${selectedMemberCount} üyenin engeli kaldırıldı.`)
    setTimeout(() => setNote(""), 1800)
  }

  const bulkDeleteMembers = async () => {
    if (!hasPermission("admin.members.delete") || selectedMemberCount === 0) return
    if (!requireSensitiveAuth()) return
    const prevMembers = members
    const selectedSet = new Set(selectedMembers.map((m) => m.id))
    const next = members.filter((m) => !selectedSet.has(m.id))
    await saveMembers(next)
    setMembers(next)
    setSelectedMemberIds({})
    registerUndo("Toplu üye silme", async () => {
      await saveMembers(prevMembers)
      setMembers(prevMembers)
    })
    const logs = await appendAdminAuditLog({
      action: "members_deleted_bulk",
      targetType: "member",
      note: `${selectedMemberCount} üye silindi`,
    })
    setAuditLogs(logs)
    setNote(`${selectedMemberCount} üye silindi.`)
    setTimeout(() => setNote(""), 1800)
  }

  const bulkAssignRole = async () => {
    if (!hasPermission("admin.roles.manage") || selectedMemberCount === 0 || !bulkRoleId) return
    const prevMembers = members
    const selectedSet = new Set(selectedMembers.map((m) => m.id))
    const next = members.map((m) => {
      if (!selectedSet.has(m.id)) return m
      const current = new Set((m.roleIds || []).map((x) => `${x}`.trim().toLowerCase()))
      current.add(bulkRoleId)
      return { ...m, roleIds: Array.from(current) }
    })
    await saveMembers(next)
    setMembers(next)
    registerUndo("Toplu rol atama", async () => {
      await saveMembers(prevMembers)
      setMembers(prevMembers)
    })
    const logs = await appendAdminAuditLog({
      action: "members_role_assigned_bulk",
      targetType: "member",
      note: `${selectedMemberCount} üyeye rol atandı: ${bulkRoleId}`,
    })
    setAuditLogs(logs)
    setNote(`${selectedMemberCount} üyeye "${bulkRoleId}" rolü atandı.`)
    setTimeout(() => setNote(""), 1800)
  }

  const toggleModerationSelection = (item: ModerationItem) => {
    const key = `${item.source}:${item.id}`
    setSelectedModerationIds((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const selectAllFilteredModeration = () => {
    const next: Record<string, boolean> = {}
    filteredModeration.forEach((it) => {
      next[`${it.source}:${it.id}`] = true
    })
    setSelectedModerationIds(next)
  }

  const clearModerationSelection = () => setSelectedModerationIds({})

  const applyModerationPreset = (preset: "all" | "pending_shopping" | "pending_services" | "active_all") => {
    setModerationSearch("")
    if (preset === "all") {
      setModerationSourceFilter("all")
      setModerationStatusFilter("all")
      return
    }
    if (preset === "pending_shopping") {
      setModerationSourceFilter("shopping")
      setModerationStatusFilter("pending")
      return
    }
    if (preset === "pending_services") {
      setModerationSourceFilter("services")
      setModerationStatusFilter("pending")
      return
    }
    setModerationSourceFilter("all")
    setModerationStatusFilter("active")
  }

  const bulkModerationStatus = async (status: "active" | "closed" | "sold") => {
    if (!hasPermission("admin.moderation.manage") || selectedModerationCount === 0) return
    const prevShoppingRaw = await AsyncStorage.getItem(SHOPPING_STORAGE_KEYS.sales)
    const prevServicesRaw = await AsyncStorage.getItem(SERVICES_POSTS_KEY)
    const shoppingIds = new Set(
      selectedModerationItems.filter((x) => x.source === "shopping").map((x) => x.id)
    )
    const servicesIds = new Set(
      selectedModerationItems.filter((x) => x.source === "services").map((x) => x.id)
    )

    if (shoppingIds.size > 0) {
      const raw = await AsyncStorage.getItem(SHOPPING_STORAGE_KEYS.sales)
      const list = safeParse<any>(raw).map((it) =>
        shoppingIds.has(`${it?.id ?? ""}`) ? { ...it, status } : it
      )
      await AsyncStorage.setItem(SHOPPING_STORAGE_KEYS.sales, JSON.stringify(list))
    }
    if (servicesIds.size > 0) {
      const raw = await AsyncStorage.getItem(SERVICES_POSTS_KEY)
      const list = safeParse<any>(raw).map((it) =>
        servicesIds.has(`${it?.id ?? ""}`) ? { ...it, status } : it
      )
      await AsyncStorage.setItem(SERVICES_POSTS_KEY, JSON.stringify(list))
    }

    const logs = await appendAdminAuditLog({
      action: "listing_status_changed_bulk",
      targetType: "listing",
      note: `${selectedModerationCount} ilan -> ${status}`,
    })
    setAuditLogs(logs)
    setSelectedModerationIds({})
    registerUndo("Toplu ilan durum değişikliği", async () => {
      if (prevShoppingRaw !== null) await AsyncStorage.setItem(SHOPPING_STORAGE_KEYS.sales, prevShoppingRaw)
      else await AsyncStorage.removeItem(SHOPPING_STORAGE_KEYS.sales)
      if (prevServicesRaw !== null) await AsyncStorage.setItem(SERVICES_POSTS_KEY, prevServicesRaw)
      else await AsyncStorage.removeItem(SERVICES_POSTS_KEY)
      await refresh()
    })
    await refresh()
    setNote(`${selectedModerationCount} ilan "${status}" durumuna alındı.`)
    setTimeout(() => setNote(""), 1800)
  }

  const bulkModerationDelete = async () => {
    if (!hasPermission("admin.moderation.manage") || selectedModerationCount === 0) return
    if (!requireSensitiveAuth()) return
    const prevShoppingRaw = await AsyncStorage.getItem(SHOPPING_STORAGE_KEYS.sales)
    const prevServicesRaw = await AsyncStorage.getItem(SERVICES_POSTS_KEY)
    const shoppingIds = new Set(
      selectedModerationItems.filter((x) => x.source === "shopping").map((x) => x.id)
    )
    const servicesIds = new Set(
      selectedModerationItems.filter((x) => x.source === "services").map((x) => x.id)
    )

    if (shoppingIds.size > 0) {
      const raw = await AsyncStorage.getItem(SHOPPING_STORAGE_KEYS.sales)
      const list = safeParse<any>(raw).filter((it) => !shoppingIds.has(`${it?.id ?? ""}`))
      await AsyncStorage.setItem(SHOPPING_STORAGE_KEYS.sales, JSON.stringify(list))
    }
    if (servicesIds.size > 0) {
      const raw = await AsyncStorage.getItem(SERVICES_POSTS_KEY)
      const list = safeParse<any>(raw).filter((it) => !servicesIds.has(`${it?.id ?? ""}`))
      await AsyncStorage.setItem(SERVICES_POSTS_KEY, JSON.stringify(list))
    }

    const logs = await appendAdminAuditLog({
      action: "listing_deleted_bulk",
      targetType: "listing",
      note: `${selectedModerationCount} ilan silindi`,
    })
    setAuditLogs(logs)
    setSelectedModerationIds({})
    registerUndo("Toplu ilan silme", async () => {
      if (prevShoppingRaw !== null) await AsyncStorage.setItem(SHOPPING_STORAGE_KEYS.sales, prevShoppingRaw)
      else await AsyncStorage.removeItem(SHOPPING_STORAGE_KEYS.sales)
      if (prevServicesRaw !== null) await AsyncStorage.setItem(SERVICES_POSTS_KEY, prevServicesRaw)
      else await AsyncStorage.removeItem(SERVICES_POSTS_KEY)
      await refresh()
    })
    await refresh()
    setNote(`${selectedModerationCount} ilan silindi.`)
    setTimeout(() => setNote(""), 1800)
  }

  const toggleMemberRole = async (member: WomioMember, roleId: string) => {
    if (!hasPermission("admin.roles.manage")) return
    const current = new Set((member.roleIds || []).map((x) => `${x}`.trim().toLowerCase()))
    if (current.has(roleId)) current.delete(roleId)
    else current.add(roleId)
    const next = await setMemberRoles(member.id, Array.from(current))
    setMembers(next)
    const logs = await appendAdminAuditLog({
      action: "member_roles_changed",
      targetType: "member",
      targetId: member.id,
      targetLabel: member.email,
      note: `Role: ${roleId}`,
    })
    setAuditLogs(logs)
  }

  const updateRolePermissions = (roleId: string, permission: PermissionKey, enabled: boolean) => {
    if (!hasPermission("admin.roles.manage")) return
    setCfg((prev) => ({
      ...prev,
      roles: prev.roles.map((r) => {
        if (r.id !== roleId) return r
        const set = new Set(r.permissions)
        if (enabled) set.add(permission)
        else set.delete(permission)
        return { ...r, permissions: Array.from(set) }
      }),
    }))
  }

  const setRolePermissionsBulk = (roleId: string, mode: "all" | "panel" | "none") => {
    if (!hasPermission("admin.roles.manage")) return
    setCfg((prev) => ({
      ...prev,
      roles: prev.roles.map((r) => {
        if (r.id !== roleId) return r
        if (mode === "all") return { ...r, permissions: [...PERMISSIONS] }
        if (mode === "panel") return { ...r, permissions: ["admin.access_panel"] }
        return { ...r, permissions: [] }
      }),
    }))
  }

  const clearSelectedMemberRoles = async () => {
    if (!hasPermission("admin.roles.manage") || !selectedRoleMember) return
    const next = await setMemberRoles(selectedRoleMember.id, [])
    setMembers(next)
    const logs = await appendAdminAuditLog({
      action: "member_roles_cleared",
      targetType: "member",
      targetId: selectedRoleMember.id,
      targetLabel: selectedRoleMember.email,
      note: "Tüm roller temizlendi",
    })
    setAuditLogs(logs)
    setNote("Seçili kullanıcının rolleri temizlendi.")
    setTimeout(() => setNote(""), 1800)
  }

  const addRole = () => {
    if (!hasPermission("admin.roles.manage")) return
    const name = newRoleName.trim()
    if (!name) {
      setNote("Rol adı boş olamaz.")
      setTimeout(() => setNote(""), 1800)
      return
    }
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")
    if (!id) {
      setNote("Rol kimliği üretilemedi.")
      setTimeout(() => setNote(""), 1800)
      return
    }
    if (cfg.roles.some((r) => r.id === id)) {
      setNote("Bu rol zaten var.")
      setTimeout(() => setNote(""), 1800)
      return
    }
    setCfg((prev) => ({ ...prev, roles: [...prev.roles, { id, name, permissions: ["admin.access_panel"] }] }))
    setNewRoleName("")
    setNote("Rol eklendi. Kaydetmeyi unutma.")
    setTimeout(() => setNote(""), 1800)
  }

  const removeRole = (role: RoleDefinition) => {
    if (!hasPermission("admin.roles.manage")) return
    if (!requireSensitiveAuth()) return
    setCfg((prev) => ({ ...prev, roles: prev.roles.filter((r) => r.id !== role.id) }))
    setMembers((prev) =>
      prev.map((m) => ({ ...m, roleIds: (m.roleIds || []).filter((x) => x !== role.id) }))
    )
    setNote("Rol kaldırıldı. Kaydetmeyi unutma.")
    setTimeout(() => setNote(""), 1800)
  }

  const getTemplateUpsertedConfig = (prev: AdminConfig, templateId: string) => {
    const tpl = ROLE_TEMPLATES.find((x) => x.id === templateId)
    if (!tpl) return prev
    const exists = prev.roles.some((r) => r.id === tpl.id)
    if (exists) {
      return {
        ...prev,
        roles: prev.roles.map((r) =>
          r.id === tpl.id ? { ...r, name: tpl.name, permissions: [...tpl.permissions] } : r
        ),
      }
    }
    return {
      ...prev,
      roles: [...prev.roles, { id: tpl.id, name: tpl.name, permissions: [...tpl.permissions] }],
    }
  }

  const upsertRoleTemplate = (templateId: string) => {
    if (!hasPermission("admin.roles.manage")) return
    const tpl = ROLE_TEMPLATES.find((x) => x.id === templateId)
    if (!tpl) return
    setCfg((prev) => getTemplateUpsertedConfig(prev, templateId))
    setNote(`"${tpl.name}" şablonu uygulandı. Kaydetmeyi unutma.`)
    setTimeout(() => setNote(""), 1800)
  }

  const upsertRoleTemplateAndSave = async (templateId: string) => {
    if (!hasPermission("admin.roles.manage")) return
    const tpl = ROLE_TEMPLATES.find((x) => x.id === templateId)
    if (!tpl) return
    const nextCfg = getTemplateUpsertedConfig(cfg, templateId)
    setCfg(nextCfg)
    await saveAdminConfig(nextCfg)
    const logs = await appendAdminAuditLog({
      action: "role_template_applied_and_saved",
      targetType: "system",
      targetId: tpl.id,
      targetLabel: tpl.name,
      note: "Rol şablonu uygulanıp kaydedildi",
    })
    setAuditLogs(logs)
    setNote(`"${tpl.name}" şablonu uygulanıp kaydedildi.`)
    setTimeout(() => setNote(""), 1800)
  }

  const duplicateRole = (role: RoleDefinition) => {
    if (!hasPermission("admin.roles.manage")) return
    let idBase = `${role.id}_copy`
    let idx = 1
    while (cfg.roles.some((r) => r.id === idBase)) {
      idBase = `${role.id}_copy_${idx}`
      idx += 1
    }
    setCfg((prev) => ({
      ...prev,
      roles: [...prev.roles, { id: idBase, name: `${role.name} Kopya`, permissions: [...role.permissions] }],
    }))
    setNote(`Rol kopyalandı: ${idBase}`)
    setTimeout(() => setNote(""), 1800)
  }

  const exportRolesJson = () => {
    if (!hasPermission("admin.roles.manage")) return
    setRoleTransferJson(JSON.stringify(cfg.roles, null, 2))
    setNote("Rol JSON hazırlandı.")
    setTimeout(() => setNote(""), 1800)
  }

  const importRolesJson = () => {
    if (!hasPermission("admin.roles.manage")) return
    try {
      const parsed = JSON.parse(roleTransferJson) as { id?: string; name?: string; permissions?: string[] }[]
      if (!Array.isArray(parsed)) throw new Error("invalid")
      const nextRoles: RoleDefinition[] = parsed
        .filter((r) => !!r?.id && !!r?.name)
        .map((r) => ({
          id: `${r.id}`.trim().toLowerCase(),
          name: `${r.name}`.trim(),
          permissions: (r.permissions || [])
            .map((p) => `${p}`)
            .filter((p): p is PermissionKey => (PERMISSIONS as string[]).includes(p)),
        }))
      if (!nextRoles.length) throw new Error("empty")
      setCfg((prev) => ({ ...prev, roles: nextRoles }))
      setNote("Roller JSON'dan yüklendi. Kaydetmeyi unutma.")
      setTimeout(() => setNote(""), 1800)
    } catch {
      setNote("Rol JSON formatı geçersiz.")
      setTimeout(() => setNote(""), 1800)
    }
  }

  const updateModerationStatus = async (item: ModerationItem, status: string) => {
    if (!hasPermission("admin.moderation.manage")) return
    if (item.source === "shopping") {
      const raw = await AsyncStorage.getItem(SHOPPING_STORAGE_KEYS.sales)
      const list = safeParse<any>(raw).map((it) =>
        `${it?.id ?? ""}` === item.id ? { ...it, status } : it
      )
      await AsyncStorage.setItem(SHOPPING_STORAGE_KEYS.sales, JSON.stringify(list))
    } else {
      const raw = await AsyncStorage.getItem(SERVICES_POSTS_KEY)
      const list = safeParse<any>(raw).map((it) =>
        `${it?.id ?? ""}` === item.id ? { ...it, status } : it
      )
      await AsyncStorage.setItem(SERVICES_POSTS_KEY, JSON.stringify(list))
    }
    const logs = await appendAdminAuditLog({
      action: "listing_status_changed",
      targetType: "listing",
      targetId: item.id,
      targetLabel: `${item.source}:${item.title}`,
      note: `Yeni durum: ${status}`,
    })
    setAuditLogs(logs)
    await refresh()
    setNote("İlan durumu güncellendi.")
    setTimeout(() => setNote(""), 1800)
  }

  const deleteModerationItem = async (item: ModerationItem) => {
    if (!hasPermission("admin.moderation.manage")) return
    if (item.source === "shopping") {
      const raw = await AsyncStorage.getItem(SHOPPING_STORAGE_KEYS.sales)
      const list = safeParse<any>(raw).filter((it) => `${it?.id ?? ""}` !== item.id)
      await AsyncStorage.setItem(SHOPPING_STORAGE_KEYS.sales, JSON.stringify(list))
    } else {
      const raw = await AsyncStorage.getItem(SERVICES_POSTS_KEY)
      const list = safeParse<any>(raw).filter((it) => `${it?.id ?? ""}` !== item.id)
      await AsyncStorage.setItem(SERVICES_POSTS_KEY, JSON.stringify(list))
    }
    const logs = await appendAdminAuditLog({
      action: "listing_deleted",
      targetType: "listing",
      targetId: item.id,
      targetLabel: `${item.source}:${item.title}`,
      note: "Admin tarafından kaldırıldı",
    })
    setAuditLogs(logs)
    await refresh()
    setNote("İlan kaldırıldı.")
    setTimeout(() => setNote(""), 1800)
  }

  const resolveMemberForReport = (reportedUserId: string) => {
    const key = reportedUserId.trim().toLowerCase()
    return (
      members.find((m) => m.id.toLowerCase() === key) ||
      members.find((m) => m.username.toLowerCase() === key) ||
      members.find((m) => m.email.toLowerCase() === key) ||
      null
    )
  }

  const dismissReport = async (reportId: string) => {
    if (!hasPermission("admin.moderation.manage")) return
    const next = reportItems.filter((r) => r.id !== reportId)
    setReportItems(next)
    const raw = await loadReports()
    const persist = raw.filter((r) => r.id !== reportId)
    await saveReports(persist)
    const logs = await appendAdminAuditLog({
      action: "report_dismissed",
      targetType: "system",
      targetId: reportId,
      note: "Rapor kapatıldı",
    })
    setAuditLogs(logs)
    setNote("Rapor kapatıldı.")
    setTimeout(() => setNote(""), 1800)
  }

  const takeReportAction = async (
    report: ReportItem,
    action: "block_temp" | "block_permanent" | "delete_member"
  ) => {
    if (!hasPermission("admin.members.block")) return
    const member = resolveMemberForReport(report.reportedUserId)
    if (!member) {
      setNote("Raporlanan kullanıcı üyelerde bulunamadı.")
      setTimeout(() => setNote(""), 1800)
      return
    }
    if (action === "block_temp") {
      const next = await setMemberBlockedForMinutes(member.id, 1440, "Rapor bazlı moderasyon")
      setMembers(next)
    } else if (action === "block_permanent") {
      const next = await setMemberBlocked(member.id, true, "Rapor bazlı moderasyon")
      setMembers(next)
    } else {
      const next = await deleteMember(member.id)
      setMembers(next)
    }

    const logs = await appendAdminAuditLog({
      action:
        action === "block_temp"
          ? "report_action_member_blocked_temporary"
          : action === "block_permanent"
            ? "report_action_member_blocked_permanent"
            : "report_action_member_deleted",
      targetType: "member",
      targetId: member.id,
      targetLabel: member.email,
      note: `Report: ${report.reason}`,
    })
    setAuditLogs(logs)
    await dismissReport(report.id)
    await refresh()
  }

  const sendSupportReply = async (ticket: SupportTicket) => {
    if (!hasPermission("admin.support.reply")) return
    const reply = (supportReplies[ticket.id] || "").trim()
    if (!reply) {
      setNote("Yanıt metni boş olamaz.")
      setTimeout(() => setNote(""), 1800)
      return
    }
    const next = await replySupportTicket(ticket.id, reply)
    setSupportTickets(next)
    setSupportReplies((prev) => ({ ...prev, [ticket.id]: "" }))
    const logs = await appendAdminAuditLog({
      action: "support_ticket_replied",
      targetType: "system",
      targetId: ticket.id,
      targetLabel: ticket.subject,
      note: ticket.userEmail || ticket.userName,
    })
    setAuditLogs(logs)
    setNote("Yanıt gönderildi.")
    setTimeout(() => setNote(""), 1800)
  }

  const toggleSupportStatus = async (ticket: SupportTicket) => {
    if (!hasPermission("admin.support.status")) return
    const nextStatus = ticket.status === "open" ? "closed" : "open"
    const next = await setSupportTicketStatus(ticket.id, nextStatus)
    setSupportTickets(next)
    const logs = await appendAdminAuditLog({
      action: nextStatus === "closed" ? "support_ticket_closed" : "support_ticket_reopened",
      targetType: "system",
      targetId: ticket.id,
      targetLabel: ticket.subject,
      note: ticket.userEmail || ticket.userName,
    })
    setAuditLogs(logs)
    setNote(nextStatus === "closed" ? "Talep kapatıldı." : "Talep yeniden açıldı.")
    setTimeout(() => setNote(""), 1800)
  }

  const unlockAdmin = async () => {
    if (pinInput.trim() !== cfg.auth.adminPin) {
      setNote("PIN hatalı.")
      setTimeout(() => setNote(""), 1800)
      return
    }
    setUnlocked(true)
    await AsyncStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({ unlockedAt: new Date().toISOString() }))
    setPinInput("")
  }

  const lockAdmin = async () => {
    setUnlocked(false)
    await AsyncStorage.removeItem(ADMIN_SESSION_KEY)
  }

  const changePin = () => {
    const next = pinChangeInput.replace(/[^\d]/g, "").slice(0, 8)
    if (next.length < 4) {
      setNote("Yeni PIN en az 4 haneli olmalı.")
      setTimeout(() => setNote(""), 1800)
      return
    }
    setCfg((p) => ({ ...p, auth: { ...p.auth, adminPin: next } }))
    setPinChangeInput("")
    setNote("Yeni PIN kaydetmek için 'Tüm Ayarları Kaydet'.")
    setTimeout(() => setNote(""), 2200)
  }

  if (canAccess === null) {
    return (
      <ScrollView contentContainerStyle={styles.page}>
        <View style={[styles.content, compactUi && styles.contentCompactUi]}>
          <View style={[styles.card, compactUi && styles.cardCompactUi]}>
            <Text style={styles.section}>Yükleniyor...</Text>
          </View>
        </View>
      </ScrollView>
    )
  }

  if (!canAccess) {
    return (
      <ScrollView contentContainerStyle={styles.page}>
        <View style={[styles.content, compactUi && styles.contentCompactUi]}>
          <View style={[styles.card, compactUi && styles.cardCompactUi]}>
            <Text style={styles.section}>Yetkisiz Erişim</Text>
            <Text style={styles.empty}>Bu panel sadece yetkili admin hesabına açıktır.</Text>
            <Pressable style={[styles.actionBtn, { marginTop: 8 }]} onPress={() => router.back()}>
              <Text style={styles.actionText}>Geri Dön</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    )
  }

  if (!unlocked) {
    return (
      <ScrollView contentContainerStyle={styles.page}>
        <View style={[styles.content, compactUi && styles.contentCompactUi]}>
          <View style={[styles.card, compactUi && styles.cardCompactUi]}>
            <Text style={styles.section}>Admin Girişi</Text>
            <Text style={styles.smallLabel}>Admin PIN</Text>
            <TextInput value={pinInput} onChangeText={setPinInput} keyboardType="number-pad" secureTextEntry style={styles.input} placeholder="PIN gir" placeholderTextColor={tc("#8A6A5D")} />
            <Pressable style={styles.save} onPress={() => void unlockAdmin()}><Text style={styles.saveText}>Panele Gir</Text></Pressable>
            <Pressable style={[styles.actionBtn, { marginTop: 8 }]} onPress={() => router.back()}><Text style={styles.actionText}>Geri Dön</Text></Pressable>
            {!!note && <Text style={styles.note}>{note}</Text>}
          </View>
        </View>
      </ScrollView>
    )
  }

  return (
    <ScrollView contentContainerStyle={styles.page} stickyHeaderIndices={[1]}>
      <View style={[styles.content, compactUi && styles.contentCompactUi]}>
        <View pointerEvents="none" style={styles.bgOrbA} />
        <View pointerEvents="none" style={styles.bgOrbB} />
        <View style={styles.top}>
          <Pressable style={styles.back} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={16} color={tc("#4A342A")} />
            <Text style={styles.backText}>Geri</Text>
          </Pressable>
          <Text style={styles.title}>Admin Panel</Text>
          <View style={styles.topActions}>
            <Pressable
              style={[styles.refresh, compactUi && styles.compactToggleActive]}
              onPress={() => setCompactUi((v) => !v)}
            >
              <Ionicons name="resize-outline" size={14} color={compactUi ? tc("#7A2F4D") : tc("#4A342A")} />
              <Text style={[styles.refreshText, compactUi && styles.compactToggleText]}>Compact</Text>
            </Pressable>
            <Pressable style={styles.refresh} onPress={() => void refresh()}>
              <Ionicons name="refresh" size={14} color={tc("#4A342A")} />
              <Text style={styles.refreshText}>Yenile</Text>
            </Pressable>
            <Pressable style={[styles.refresh, styles.lockBtn]} onPress={() => void lockAdmin()}>
              <Ionicons name="lock-closed" size={14} color={tc("#8A2E53")} />
              <Text style={[styles.refreshText, styles.lockBtnText]}>Kilitle</Text>
            </Pressable>
          </View>
        </View>
        <Text style={styles.panelSubtitle}>Yetki, güvenlik ve operasyon akışını tek noktadan yönet.</Text>

        <View style={styles.heroCard}>
          <View pointerEvents="none" style={styles.heroAccent} />
          <Text style={styles.heroTitle}>Operasyon Durumu</Text>
          <Text style={styles.heroSub}>Kritik metrikleri tek bakışta takip et.</Text>
          <View style={styles.heroStatRow}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{stats.membersTotal}</Text>
              <Text style={styles.heroStatLabel}>Toplam Üye</Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{openSupportCount}</Text>
              <Text style={styles.heroStatLabel}>Açık Destek</Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{pendingModerationCount}</Text>
              <Text style={styles.heroStatLabel}>Bekleyen Moderasyon</Text>
            </View>
          </View>
        </View>

        <View style={styles.securityBar}>
          <Text style={styles.securityTitle}>Hassas İşlem Doğrulaması</Text>
          <View style={styles.securityRow}>
            <TextInput
              value={securityPinInput}
              onChangeText={setSecurityPinInput}
              placeholder="PIN"
              placeholderTextColor={tc("#8A6A5D")}
              keyboardType="number-pad"
              secureTextEntry
              style={styles.securityInput}
            />
            <Pressable style={styles.actionBtn} onPress={verifySensitivePin}>
              <Text style={styles.actionText}>Doğrula</Text>
            </Pressable>
            <View style={[styles.securityState, Date.now() < securityUnlockedUntil ? styles.securityStateOk : styles.securityStateOff]}>
              <Text style={styles.securityStateText}>{Date.now() < securityUnlockedUntil ? "Açık" : "Kapalı"}</Text>
            </View>
          </View>
        </View>
        {!!undoLabel && (
          <View style={styles.undoBar}>
            <Text style={styles.undoText}>Geri alınabilir: {undoLabel}</Text>
            <Pressable style={styles.undoBtn} onPress={() => void runUndo()}>
              <Text style={styles.undoBtnText}>Son İşlemi Geri Al</Text>
            </Pressable>
          </View>
        )}

      </View>

      <View style={styles.tabStickyWrap}>
        <View style={[styles.content, compactUi && styles.contentCompactUi]}>
          <View style={styles.tabNavRow}>
            <Pressable style={styles.tabArrowBtn} onPress={() => scrollTabsBy(-180)}>
              <Ionicons name="chevron-back" size={16} color={tc("#6E5549")} />
            </Pressable>
            <ScrollView
              ref={tabScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.tabRow, compactUi && styles.tabRowCompactUi]}
              style={styles.tabScroll}
              onScroll={(e) => {
                tabScrollXRef.current = e.nativeEvent.contentOffset.x
              }}
              scrollEventThrottle={16}
            >
              {[
            { id: "dashboard" as AdminTab, text: "Dashboard", icon: "speedometer-outline", perm: "admin.dashboard.view" as PermissionKey },
            { id: "members" as AdminTab, text: "Üyeler", icon: "people-outline", perm: "admin.members.view" as PermissionKey },
            { id: "moderation" as AdminTab, text: "Moderasyon", icon: "shield-checkmark-outline", perm: "admin.moderation.view" as PermissionKey },
            { id: "support" as AdminTab, text: "Destek", icon: "chatbubbles-outline", perm: "admin.support.view" as PermissionKey },
            { id: "audit" as AdminTab, text: "İşlem Geçmişi", icon: "time-outline", perm: "admin.audit.view" as PermissionKey },
            { id: "roles" as AdminTab, text: "Roller", icon: "key-outline", perm: "admin.roles.manage" as PermissionKey },
            { id: "finance" as AdminTab, text: "Gelir", icon: "cash-outline", perm: "admin.finance.view" as PermissionKey },
            { id: "modules" as AdminTab, text: "Modüller", icon: "grid-outline", perm: "admin.modules.manage" as PermissionKey },
            { id: "ads" as AdminTab, text: "Reklam", icon: "megaphone-outline", perm: "admin.ads.manage" as PermissionKey },
            { id: "reward" as AdminTab, text: "İzle Kazan", icon: "gift-outline", perm: "admin.reward.manage" as PermissionKey },
          ]
            .filter((it) => hasPermission(it.perm))
            .map((it) => (
            <Pressable key={it.id} style={[styles.tabChip, tab === it.id && styles.tabChipActive]} onPress={() => setTab(it.id as AdminTab)}>
              <Animated.View style={[styles.tabChipInner, tab === it.id && { transform: [{ scale: tabPulseAnim }] }]}>
                <Ionicons name={it.icon as any} size={13} color={tab === it.id ? tc("#7A2F4D") : tc("#6E5549")} />
                <Text style={[styles.tabText, tab === it.id && styles.tabTextActive]}>{it.text}</Text>
              </Animated.View>
              {tab === it.id && (
                <Animated.View
                  style={[
                    styles.tabActiveUnderline,
                    { opacity: tabAccentAnim, transform: [{ scaleX: tabAccentAnim }] },
                  ]}
                />
              )}
            </Pressable>
          ))}
            </ScrollView>
            <Pressable style={styles.tabArrowBtn} onPress={() => scrollTabsBy(180)}>
              <Ionicons name="chevron-forward" size={16} color={tc("#6E5549")} />
            </Pressable>
          </View>
        </View>
      </View>

      <View style={[styles.content, compactUi && styles.contentCompactUi]}>

        {tab === "dashboard" && hasPermission("admin.dashboard.view") && (
          <View style={[styles.card, compactUi && styles.cardCompactUi]}>
            <SectionTitle icon="analytics-outline" text="Sistem Özeti" />
            <View style={styles.inlineRowWrap}>
              <TrendChip label="Üye" current={stats.membersTotal} previous={prevStats.membersTotal} />
              <TrendChip label="Konuşma" current={stats.conversations} previous={prevStats.conversations} />
              <TrendChip label="Rapor" current={stats.reports} previous={prevStats.reports} />
              <TrendChip label="Cüzdan" current={Math.round(stats.walletBalanceTotal)} previous={Math.round(prevStats.walletBalanceTotal)} suffix=" TL" />
            </View>
            {dashboardAlerts.length > 0 && (
              <View style={styles.slotBox}>
                <Text style={styles.slotTitle}>Kritik Uyarılar</Text>
                {dashboardAlerts.map((a, i) => (
                  <View key={`alert-${i}`} style={[styles.alertRow, a.level === "high" && styles.alertRowHigh]}>
                    <Text style={[styles.alertText, a.level === "high" && styles.alertTextHigh]}>{a.text}</Text>
                  </View>
                ))}
              </View>
            )}
            <Metric label="Toplam Üye" value={`${stats.membersTotal}`} />
            <Metric label="Engelli Üye" value={`${stats.membersBlocked}`} />
            <Metric label="Shopping İlan" value={`${stats.shoppingPosts}`} />
            <Metric label="Shopping Deneyim" value={`${stats.shoppingExperiences}`} />
            <Metric label="Services İlan" value={`${stats.servicesPosts}`} />
            <Metric label="Konuşma" value={`${stats.conversations}`} />
            <Metric label="Mesaj" value={`${stats.messages}`} />
            <Metric label="Rapor" value={`${stats.reports}`} />
            <Metric label="Toplam Cüzdan" value={`${Math.round(stats.walletBalanceTotal)} TL`} />
            {isSuperAdmin && (
              <View style={styles.slotBox}>
                <Text style={styles.slotTitle}>Admin Güvenliği</Text>
                <LabelInput
                  label="Master Admin E-posta"
                  value={cfg.auth.masterAdminEmail}
                  onChangeText={(v) => setCfg((p) => ({ ...p, auth: { ...p.auth, masterAdminEmail: v.trim().toLowerCase() } }))}
                />
                <Text style={styles.smallLabel}>Master Admin Şifre</Text>
                <TextInput
                  value={cfg.auth.masterAdminPassword}
                  onChangeText={(v) => setCfg((p) => ({ ...p, auth: { ...p.auth, masterAdminPassword: v } }))}
                  style={styles.input}
                  placeholder="Master şifre"
                  placeholderTextColor={tc("#8A6A5D")}
                  secureTextEntry
                />
                <Text style={styles.smallLabel}>Yeni Admin PIN (en az 4)</Text>
                <TextInput value={pinChangeInput} onChangeText={setPinChangeInput} style={styles.input} placeholder="Yeni PIN" placeholderTextColor={tc("#8A6A5D")} keyboardType="number-pad" secureTextEntry />
                <NumberInput label="Admin oturum süresi (dk)" value={cfg.auth.sessionMinutes} onChange={(n) => setCfg((p) => ({ ...p, auth: { ...p.auth, sessionMinutes: Math.max(1, n || 1) } }))} />
                <Pressable style={styles.actionBtn} onPress={changePin}><Text style={styles.actionText}>PIN Güncelle</Text></Pressable>
              </View>
            )}
          </View>
        )}

        {tab === "members" && hasPermission("admin.members.view") && (
          <View style={[styles.card, compactUi && styles.cardCompactUi]}>
            <SectionTitle icon="people-circle-outline" text="Üyelik Yönetimi" />
            <TextInput value={memberSearch} onChangeText={setMemberSearch} placeholder="Kullanıcı adı / e-posta ara" placeholderTextColor={tc("#8A6A5D")} style={styles.input} />
            <View style={styles.inlineRowWrap}>
              <Pressable style={styles.actionBtn} onPress={selectAllFilteredMembers}>
                <Text style={styles.actionText}>Filtredekileri Seç</Text>
              </Pressable>
              <Pressable style={styles.actionBtn} onPress={clearMemberSelection}>
                <Text style={styles.actionText}>Seçimi Temizle</Text>
              </Pressable>
              <View style={styles.bulkCountBadge}>
                <Text style={styles.bulkCountText}>Seçili: {selectedMemberCount}</Text>
              </View>
            </View>
            <View style={styles.inlineRow}>
              <Pressable
                style={[styles.actionBtn, !hasPermission("admin.members.block") && styles.disabledBtn]}
                onPress={() => void clearBlocked()}
                disabled={!hasPermission("admin.members.block")}
              >
                <Text style={styles.actionText}>Tüm Engelleri Kaldır</Text>
              </Pressable>
            </View>
            <LabelInput label="Geçici engel nedeni" value={memberBlockReason} onChangeText={setMemberBlockReason} />
            <NumberInput label="Geçici engel süresi" value={Number(memberBlockMinutes) || 1} onChange={(n) => setMemberBlockMinutes(`${Math.max(1, n || 1)}`)} />
            <View style={styles.inlineRowWrap}>
              <Pressable style={[styles.tabChip, memberBlockUnit === "minute" && styles.tabChipActive]} onPress={() => setMemberBlockUnit("minute")}>
                <Text style={[styles.tabText, memberBlockUnit === "minute" && styles.tabTextActive]}>Dakika</Text>
              </Pressable>
              <Pressable style={[styles.tabChip, memberBlockUnit === "hour" && styles.tabChipActive]} onPress={() => setMemberBlockUnit("hour")}>
                <Text style={[styles.tabText, memberBlockUnit === "hour" && styles.tabTextActive]}>Saat</Text>
              </Pressable>
              <Pressable style={[styles.tabChip, memberBlockUnit === "day" && styles.tabChipActive]} onPress={() => setMemberBlockUnit("day")}>
                <Text style={[styles.tabText, memberBlockUnit === "day" && styles.tabTextActive]}>Gün</Text>
              </Pressable>
            </View>
            <View style={styles.inlineRowWrap}>
              <Pressable style={styles.actionBtn} onPress={() => { setMemberBlockUnit("minute"); setMemberBlockMinutes("30") }}>
                <Text style={styles.actionText}>30 dk</Text>
              </Pressable>
              <Pressable style={styles.actionBtn} onPress={() => { setMemberBlockUnit("hour"); setMemberBlockMinutes("1") }}>
                <Text style={styles.actionText}>1 saat</Text>
              </Pressable>
              <Pressable style={styles.actionBtn} onPress={() => { setMemberBlockUnit("hour"); setMemberBlockMinutes("6") }}>
                <Text style={styles.actionText}>6 saat</Text>
              </Pressable>
              <Pressable style={styles.actionBtn} onPress={() => { setMemberBlockUnit("hour"); setMemberBlockMinutes("24") }}>
                <Text style={styles.actionText}>24 saat</Text>
              </Pressable>
              <Pressable style={styles.actionBtn} onPress={() => { setMemberBlockUnit("day"); setMemberBlockMinutes("3") }}>
                <Text style={styles.actionText}>3 gün</Text>
              </Pressable>
            </View>
            <View style={styles.slotBox}>
              <Text style={styles.slotTitle}>Toplu İşlemler</Text>
              <View style={styles.inlineRowWrap}>
                <Pressable
                  style={[styles.actionBtn, (!hasPermission("admin.members.block") || selectedMemberCount === 0) && styles.disabledBtn]}
                  onPress={() => void bulkBlockMembers()}
                  disabled={!hasPermission("admin.members.block") || selectedMemberCount === 0}
                >
                  <Text style={styles.actionText}>Seçilileri Engelle</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionBtn, (!hasPermission("admin.members.block") || selectedMemberCount === 0) && styles.disabledBtn]}
                  onPress={() => void bulkUnblockMembers()}
                  disabled={!hasPermission("admin.members.block") || selectedMemberCount === 0}
                >
                  <Text style={styles.actionText}>Seçilileri Aç</Text>
                </Pressable>
                <Pressable
                  style={[styles.deleteBtn, (!hasPermission("admin.members.delete") || selectedMemberCount === 0) && styles.disabledBtn]}
                  onPress={() => void bulkDeleteMembers()}
                  disabled={!hasPermission("admin.members.delete") || selectedMemberCount === 0}
                >
                  <Text style={styles.deleteText}>Seçilileri Sil</Text>
                </Pressable>
              </View>
              <Text style={styles.smallLabel}>Toplu rol atama</Text>
              <View style={styles.inlineRowWrap}>
                {cfg.roles.map((r) => (
                  <Pressable
                    key={`bulk-role-${r.id}`}
                    style={[styles.tabChip, bulkRoleId === r.id && styles.tabChipActive]}
                    onPress={() => setBulkRoleId(r.id)}
                  >
                    <Text style={[styles.tabText, bulkRoleId === r.id && styles.tabTextActive]}>{r.name}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable
                style={[styles.actionBtn, (!hasPermission("admin.roles.manage") || selectedMemberCount === 0 || !bulkRoleId) && styles.disabledBtn]}
                onPress={() => void bulkAssignRole()}
                disabled={!hasPermission("admin.roles.manage") || selectedMemberCount === 0 || !bulkRoleId}
              >
                <Text style={styles.actionText}>Seçililere Rol Ata</Text>
              </Pressable>
            </View>
            {filteredMembers.length === 0 ? (
              <Text style={styles.empty}>Üye bulunamadı.</Text>
            ) : (
              filteredMembers.map((m) => (
                <View key={m.id} style={styles.memberCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberName}>{m.fullName || m.username || "Üye"}</Text>
                    <Text style={styles.memberSub}>{m.email}</Text>
                    <Text style={styles.memberSub}>{m.country || "-"} / {m.city || "-"}</Text>
                    {!!(m.roleIds || []).length && (
                      <Text style={styles.memberSub}>Roller: {(m.roleIds || []).join(", ")}</Text>
                    )}
                    {!!m.blocked && (
                      <Text style={styles.memberBlocked}>{`Engelli${m.blockedReason ? `: ${m.blockedReason}` : ""}${m.blockedUntil ? ` (Bitiş: ${new Date(m.blockedUntil).toLocaleString("tr-TR")})` : ""}`}</Text>
                    )}
                    {hasPermission("admin.roles.manage") && (
                      <View style={styles.inlineRowWrap}>
                        {cfg.roles.map((r) => {
                          const selected = (m.roleIds || []).includes(r.id)
                          return (
                            <Pressable
                              key={`${m.id}-${r.id}`}
                              style={[styles.tabChip, selected && styles.tabChipActive]}
                              onPress={() => void toggleMemberRole(m, r.id)}
                            >
                              <Text style={[styles.tabText, selected && styles.tabTextActive]}>{r.name}</Text>
                            </Pressable>
                          )
                        })}
                      </View>
                    )}
                  </View>
                  <View style={{ gap: 6 }}>
                    <Pressable
                      style={[styles.selectBtn, selectedMemberIds[m.id] && styles.selectBtnActive]}
                      onPress={() => toggleMemberSelection(m.id)}
                    >
                      <Text style={[styles.selectBtnText, selectedMemberIds[m.id] && styles.selectBtnTextActive]}>
                        {selectedMemberIds[m.id] ? "Seçili" : "Seç"}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.blockBtn, m.blocked && styles.unblockBtn, !hasPermission("admin.members.block") && styles.disabledBtn]}
                      onPress={() => void toggleBlockMember(m)}
                      disabled={!hasPermission("admin.members.block")}
                    >
                      <Text style={[styles.blockText, m.blocked && styles.unblockText]}>{m.blocked ? "Engeli Kaldır" : "Süresiz Engelle"}</Text>
                    </Pressable>
                    {!m.blocked && (
                      <Pressable
                        style={[styles.actionBtn, !hasPermission("admin.members.block") && styles.disabledBtn]}
                        onPress={() => void blockMemberTemporarily(m)}
                        disabled={!hasPermission("admin.members.block")}
                      >
                        <Text style={styles.actionText}>Geçici Engelle</Text>
                      </Pressable>
                    )}
                    <Pressable
                      style={[styles.deleteBtn, !hasPermission("admin.members.delete") && styles.disabledBtn]}
                      onPress={() => void removeMember(m)}
                      disabled={!hasPermission("admin.members.delete")}
                    >
                      <Text style={styles.deleteText}>Üyeyi Sil</Text>
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {tab === "moderation" && hasPermission("admin.moderation.view") && (
          <View style={[styles.card, compactUi && styles.cardCompactUi]}>
            <SectionTitle icon="shield-outline" text="İlan Moderasyonu" />
            <View style={styles.inlineRowWrap}>
              <Pressable style={styles.actionBtn} onPress={() => applyModerationPreset("all")}>
                <Text style={styles.actionText}>Preset: Tümü</Text>
              </Pressable>
              <Pressable style={styles.actionBtn} onPress={() => applyModerationPreset("pending_shopping")}>
                <Text style={styles.actionText}>Preset: Shopping Bekleyen</Text>
              </Pressable>
              <Pressable style={styles.actionBtn} onPress={() => applyModerationPreset("pending_services")}>
                <Text style={styles.actionText}>Preset: Services Bekleyen</Text>
              </Pressable>
              <Pressable style={styles.actionBtn} onPress={() => applyModerationPreset("active_all")}>
                <Text style={styles.actionText}>Preset: Aktifler</Text>
              </Pressable>
            </View>
            <TextInput
              value={moderationSearch}
              onChangeText={setModerationSearch}
              placeholder="İlan ara (başlık/kategori/şehir)"
              placeholderTextColor={tc("#8A6A5D")}
              style={styles.input}
            />
            <View style={styles.inlineRowWrap}>
              <Pressable style={styles.actionBtn} onPress={selectAllFilteredModeration}>
                <Text style={styles.actionText}>Filtredekileri Seç</Text>
              </Pressable>
              <Pressable style={styles.actionBtn} onPress={clearModerationSelection}>
                <Text style={styles.actionText}>Seçimi Temizle</Text>
              </Pressable>
              <View style={styles.bulkCountBadge}>
                <Text style={styles.bulkCountText}>Seçili: {selectedModerationCount}</Text>
              </View>
            </View>
            <View style={styles.inlineRowWrap}>
              <Pressable
                style={[styles.actionBtn, (!hasPermission("admin.moderation.manage") || selectedModerationCount === 0) && styles.disabledBtn]}
                onPress={() => void bulkModerationStatus("active")}
                disabled={!hasPermission("admin.moderation.manage") || selectedModerationCount === 0}
              >
                <Text style={styles.actionText}>Seçilileri Aktif Yap</Text>
              </Pressable>
              <Pressable
                style={[styles.actionBtn, (!hasPermission("admin.moderation.manage") || selectedModerationCount === 0) && styles.disabledBtn]}
                onPress={() => void bulkModerationStatus("closed")}
                disabled={!hasPermission("admin.moderation.manage") || selectedModerationCount === 0}
              >
                <Text style={styles.actionText}>Seçilileri Kapat</Text>
              </Pressable>
              <Pressable
                style={[styles.actionBtn, (!hasPermission("admin.moderation.manage") || selectedModerationCount === 0) && styles.disabledBtn]}
                onPress={() => void bulkModerationStatus("sold")}
                disabled={!hasPermission("admin.moderation.manage") || selectedModerationCount === 0}
              >
                <Text style={styles.actionText}>Seçilileri Satıldı</Text>
              </Pressable>
              <Pressable
                style={[styles.deleteBtn, (!hasPermission("admin.moderation.manage") || selectedModerationCount === 0) && styles.disabledBtn]}
                onPress={() => void bulkModerationDelete()}
                disabled={!hasPermission("admin.moderation.manage") || selectedModerationCount === 0}
              >
                <Text style={styles.deleteText}>Seçilileri Sil</Text>
              </Pressable>
            </View>
            <View style={styles.inlineRow}>
              {([
                { id: "all", text: "Tümü" },
                { id: "shopping", text: "Shopping" },
                { id: "services", text: "Services" },
              ] as const).map((x) => (
                <Pressable
                  key={x.id}
                  style={[styles.tabChip, moderationSourceFilter === x.id && styles.tabChipActive]}
                  onPress={() => setModerationSourceFilter(x.id)}
                >
                  <Text style={[styles.tabText, moderationSourceFilter === x.id && styles.tabTextActive]}>{x.text}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.inlineRowWrap}>
              {([
                { id: "all", text: "Tüm Durum" },
                { id: "active", text: "Aktif" },
                { id: "pending", text: "Beklemede" },
                { id: "sold", text: "Satıldı" },
                { id: "closed", text: "Kapalı" },
              ] as const).map((x) => (
                <Pressable
                  key={x.id}
                  style={[styles.tabChip, moderationStatusFilter === x.id && styles.tabChipActive]}
                  onPress={() => setModerationStatusFilter(x.id)}
                >
                  <Text style={[styles.tabText, moderationStatusFilter === x.id && styles.tabTextActive]}>{x.text}</Text>
                </Pressable>
              ))}
            </View>

            {filteredModeration.length === 0 ? (
              <Text style={styles.empty}>İlan bulunamadı.</Text>
            ) : (
              filteredModeration.map((it) => (
                <View key={`${it.source}-${it.id}`} style={styles.memberCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberName}>{it.title}</Text>
                    <Text style={styles.memberSub}>
                      {it.source.toUpperCase()} | {it.status} | {it.category || "-"}
                    </Text>
                    <Text style={styles.memberSub}>
                      {it.city || "-"} | {it.owner || "Bilinmiyor"}
                    </Text>
                    {!!it.createdAt && (
                      <Text style={styles.memberSub}>{new Date(it.createdAt).toLocaleString("tr-TR")}</Text>
                    )}
                  </View>
                  <View style={{ gap: 6 }}>
                    <Pressable
                      style={[styles.selectBtn, selectedModerationIds[`${it.source}:${it.id}`] && styles.selectBtnActive]}
                      onPress={() => toggleModerationSelection(it)}
                    >
                      <Text style={[styles.selectBtnText, selectedModerationIds[`${it.source}:${it.id}`] && styles.selectBtnTextActive]}>
                        {selectedModerationIds[`${it.source}:${it.id}`] ? "Seçili" : "Seç"}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.actionBtn, !hasPermission("admin.moderation.manage") && styles.disabledBtn]}
                      onPress={() => void updateModerationStatus(it, "active")}
                      disabled={!hasPermission("admin.moderation.manage")}
                    >
                      <Text style={styles.actionText}>Aktif</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.actionBtn, !hasPermission("admin.moderation.manage") && styles.disabledBtn]}
                      onPress={() => void updateModerationStatus(it, "closed")}
                      disabled={!hasPermission("admin.moderation.manage")}
                    >
                      <Text style={styles.actionText}>Kapat</Text>
                    </Pressable>
                    {it.source === "shopping" && (
                      <Pressable
                        style={[styles.actionBtn, !hasPermission("admin.moderation.manage") && styles.disabledBtn]}
                        onPress={() => void updateModerationStatus(it, "sold")}
                        disabled={!hasPermission("admin.moderation.manage")}
                      >
                        <Text style={styles.actionText}>Satıldı</Text>
                      </Pressable>
                    )}
                    <Pressable
                      style={[styles.deleteBtn, !hasPermission("admin.moderation.manage") && styles.disabledBtn]}
                      onPress={() => void deleteModerationItem(it)}
                      disabled={!hasPermission("admin.moderation.manage")}
                    >
                      <Text style={styles.deleteText}>Kaldır</Text>
                    </Pressable>
                  </View>
                </View>
              ))
            )}

            <View style={styles.slotBox}>
              <Text style={styles.slotTitle}>Mesaj Raporları</Text>
              <TextInput
                value={reportSearch}
                onChangeText={setReportSearch}
                placeholder="Rapor ara (kullanıcı/sebep)"
                placeholderTextColor={tc("#8A6A5D")}
                style={styles.input}
              />
              {filteredReports.length === 0 ? (
                <Text style={styles.empty}>Açık rapor yok.</Text>
              ) : (
                filteredReports.map((r) => {
                  const matched = resolveMemberForReport(r.reportedUserId)
                  return (
                    <View key={r.id} style={styles.memberCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.memberName}>{r.conversationTitle || "Konuşma"}</Text>
                        <Text style={styles.memberSub}>Raporlanan: {r.reportedUserId}</Text>
                        <Text style={styles.memberSub}>Sebep: {r.reason}</Text>
                        <Text style={styles.memberSub}>{new Date(r.createdAt).toLocaleString("tr-TR")}</Text>
                        {!matched && (
                          <Text style={styles.memberBlocked}>Üye kaydı bulunamadı (ID/e-posta eşleşmedi).</Text>
                        )}
                      </View>
                      <View style={{ gap: 6 }}>
                        <Pressable
                          style={[styles.actionBtn, (!matched || !hasPermission("admin.members.block")) && styles.disabledBtn]}
                          onPress={() => void takeReportAction(r, "block_temp")}
                          disabled={!matched || !hasPermission("admin.members.block")}
                        >
                          <Text style={styles.actionText}>24s Engelle</Text>
                        </Pressable>
                        <Pressable
                          style={[styles.actionBtn, (!matched || !hasPermission("admin.members.block")) && styles.disabledBtn]}
                          onPress={() => void takeReportAction(r, "block_permanent")}
                          disabled={!matched || !hasPermission("admin.members.block")}
                        >
                          <Text style={styles.actionText}>Süresiz Engelle</Text>
                        </Pressable>
                        <Pressable
                          style={[styles.deleteBtn, (!matched || !hasPermission("admin.members.delete")) && styles.disabledBtn]}
                          onPress={() => void takeReportAction(r, "delete_member")}
                          disabled={!matched || !hasPermission("admin.members.delete")}
                        >
                          <Text style={styles.deleteText}>Üyeyi Sil</Text>
                        </Pressable>
                        <Pressable
                          style={[styles.actionBtn, !hasPermission("admin.moderation.manage") && styles.disabledBtn]}
                          onPress={() => void dismissReport(r.id)}
                          disabled={!hasPermission("admin.moderation.manage")}
                        >
                          <Text style={styles.actionText}>Raporu Kapat</Text>
                        </Pressable>
                      </View>
                    </View>
                  )
                })
              )}
            </View>
          </View>
        )}

        {tab === "audit" && hasPermission("admin.audit.view") && (
          <View style={[styles.card, compactUi && styles.cardCompactUi]}>
            <SectionTitle icon="document-text-outline" text="İşlem Geçmişi" />
            {auditLogs.length === 0 ? (
              <Text style={styles.empty}>Henüz işlem kaydı yok.</Text>
            ) : (
              auditLogs.map((log) => (
                <View key={log.id} style={styles.metricRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberName}>{log.action}</Text>
                    <Text style={styles.memberSub}>
                      {log.targetType}
                      {log.targetLabel ? ` | ${log.targetLabel}` : ""}
                    </Text>
                    {!!log.targetId && <Text style={styles.memberSub}>ID: {log.targetId}</Text>}
                    {!!log.note && <Text style={styles.memberSub}>{log.note}</Text>}
                  </View>
                  <Text style={styles.metricLabel}>{new Date(log.createdAt).toLocaleString("tr-TR")}</Text>
                </View>
              ))
            )}
          </View>
        )}

        {tab === "support" && hasPermission("admin.support.view") && (
          <View style={[styles.card, compactUi && styles.cardCompactUi]}>
            <SectionTitle icon="headset-outline" text="Müşteri Hizmetleri Talepleri" />
            <View style={styles.inlineRowWrap}>
              <View style={styles.bulkCountBadge}><Text style={styles.bulkCountText}>Açık: {openSupportCount}</Text></View>
              <View style={[styles.bulkCountBadge, overdueSupportCount > 0 && styles.overdueBadge]}>
                <Text style={[styles.bulkCountText, overdueSupportCount > 0 && styles.overdueText]}>SLA Aşımı: {overdueSupportCount}</Text>
              </View>
            </View>
            <TextInput
              value={supportSearch}
              onChangeText={setSupportSearch}
              placeholder="Talep ara (konu/kullanıcı/e-posta)"
              placeholderTextColor={tc("#8A6A5D")}
              style={styles.input}
            />
            <View style={styles.inlineRowWrap}>
              {([
                { id: "all", text: "Kategori: Tümü" },
                { id: "technical", text: "Teknik" },
                { id: "account", text: "Hesap" },
                { id: "payment", text: "Ödeme" },
                { id: "other", text: "Diğer" },
              ] as const).map((x) => (
                <Pressable
                  key={x.id}
                  style={[styles.tabChip, supportCategoryFilter === x.id && styles.tabChipActive]}
                  onPress={() => setSupportCategoryFilter(x.id)}
                >
                  <Text style={[styles.tabText, supportCategoryFilter === x.id && styles.tabTextActive]}>
                    {x.text}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.inlineRowWrap}>
              {([
                { id: "all", text: "Öncelik: Tümü" },
                { id: "low", text: "Düşük" },
                { id: "medium", text: "Orta" },
                { id: "high", text: "Yüksek" },
              ] as const).map((x) => (
                <Pressable
                  key={x.id}
                  style={[styles.tabChip, supportPriorityFilter === x.id && styles.tabChipActive]}
                  onPress={() => setSupportPriorityFilter(x.id)}
                >
                  <Text style={[styles.tabText, supportPriorityFilter === x.id && styles.tabTextActive]}>
                    {x.text}
                  </Text>
                </Pressable>
                ))}
            </View>
            <View style={styles.inlineRowWrap}>
              {([
                { id: "all", text: "Durum: Tümü" },
                { id: "open", text: "Açık" },
                { id: "closed", text: "Kapalı" },
                { id: "overdue", text: "SLA Aşımı" },
              ] as const).map((x) => (
                <Pressable
                  key={x.id}
                  style={[styles.tabChip, supportStatusFilter === x.id && styles.tabChipActive]}
                  onPress={() => setSupportStatusFilter(x.id)}
                >
                  <Text style={[styles.tabText, supportStatusFilter === x.id && styles.tabTextActive]}>
                    {x.text}
                  </Text>
                </Pressable>
              ))}
            </View>
            {filteredSupportTickets.length === 0 ? (
              <Text style={styles.empty}>Henüz destek talebi yok.</Text>
            ) : (
              filteredSupportTickets.map((ticket) => (
                <View key={ticket.id} style={styles.memberCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberName}>{ticket.subject}</Text>
                    <Text style={styles.memberSub}>{ticket.userName}{ticket.userEmail ? ` | ${ticket.userEmail}` : ""}</Text>
                    <Text style={styles.memberSub}>Kategori: {ticket.category} | Öncelik: {ticket.priority}</Text>
                    <Text style={styles.memberSub}>{ticket.message}</Text>
                    <Text style={styles.memberSub}>{new Date(ticket.createdAt).toLocaleString("tr-TR")}</Text>
                    {ticket.status === "open" && Date.now() - new Date(ticket.createdAt).getTime() > 24 * 60 * 60 * 1000 && (
                      <Text style={styles.memberBlocked}>SLA aşıldı (24+ saat)</Text>
                    )}
                    {!!ticket.adminReply && <Text style={styles.memberBlocked}>Yanıt: {ticket.adminReply}</Text>}
                    <Text style={styles.memberSub}>Durum: {ticket.status === "open" ? "Açık" : "Kapalı"}</Text>
                    <View style={styles.inlineRowWrap}>
                      {SUPPORT_REPLY_TEMPLATES.map((tpl) => (
                        <Pressable
                          key={`${ticket.id}-${tpl}`}
                          style={styles.tabChip}
                          onPress={() => setSupportReplies((prev) => ({ ...prev, [ticket.id]: tpl }))}
                        >
                          <Text style={styles.tabText}>Hazır Yanıt</Text>
                        </Pressable>
                      ))}
                    </View>
                    <TextInput
                      value={supportReplies[ticket.id] || ""}
                      onChangeText={(v) => setSupportReplies((prev) => ({ ...prev, [ticket.id]: v }))}
                      placeholder="Yanıt yaz"
                      placeholderTextColor={tc("#8A6A5D")}
                      style={styles.input}
                    />
                  </View>
                  <View style={{ gap: 6 }}>
                    <Pressable
                      style={[styles.actionBtn, !hasPermission("admin.support.reply") && styles.disabledBtn]}
                      onPress={() => void sendSupportReply(ticket)}
                      disabled={!hasPermission("admin.support.reply")}
                    >
                      <Text style={styles.actionText}>Yanıt Gönder</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.actionBtn, !hasPermission("admin.support.status") && styles.disabledBtn]}
                      onPress={() => void toggleSupportStatus(ticket)}
                      disabled={!hasPermission("admin.support.status")}
                    >
                      <Text style={styles.actionText}>{ticket.status === "open" ? "Kapat" : "Yeniden Aç"}</Text>
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {tab === "roles" && hasPermission("admin.roles.manage") && (
          <View style={[styles.card, compactUi && styles.cardCompactUi]}>
            <SectionTitle icon="lock-open-outline" text="Rol ve Yetki Yönetimi" />
            <View style={styles.slotBox}>
              <Text style={styles.slotTitle}>Rol Import / Export</Text>
              <View style={styles.inlineRowWrap}>
                <Pressable style={styles.actionBtn} onPress={exportRolesJson}>
                  <Text style={styles.actionText}>Rolleri JSON&#39;a Çıkar</Text>
                </Pressable>
                <Pressable style={styles.actionBtn} onPress={importRolesJson}>
                  <Text style={styles.actionText}>JSON&#39;dan Yükle</Text>
                </Pressable>
              </View>
              <TextInput
                value={roleTransferJson}
                onChangeText={setRoleTransferJson}
                placeholder="Rol JSON burada"
                placeholderTextColor={tc("#8A6A5D")}
                multiline
                style={styles.textArea}
              />
            </View>
            <View style={styles.slotBox}>
              <Text style={styles.slotTitle}>Hazır Rol Şablonları</Text>
              <View style={styles.inlineRowWrap}>
                {ROLE_TEMPLATES.map((tpl) => (
                  <View key={tpl.id} style={styles.templateActionWrap}>
                    <Pressable style={styles.actionBtn} onPress={() => upsertRoleTemplate(tpl.id)}>
                      <Text style={styles.actionText}>{tpl.name} Şablonu</Text>
                    </Pressable>
                    <Pressable style={styles.saveMiniBtn} onPress={() => void upsertRoleTemplateAndSave(tpl.id)}>
                      <Text style={styles.saveMiniBtnText}>Uygula + Kaydet</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>
            <View style={styles.slotBox}>
              <Text style={styles.slotTitle}>Kullanıcıya Rol Ata</Text>
              <TextInput
                value={roleMemberSearch}
                onChangeText={setRoleMemberSearch}
                placeholder="Kullanıcı ara (ad/e-posta)"
                placeholderTextColor={tc("#8A6A5D")}
                style={styles.input}
              />
              <View style={styles.inlineRowWrap}>
                {filteredRoleMembers.map((m) => (
                  <Pressable
                    key={m.id}
                    style={[styles.tabChip, selectedRoleMemberId === m.id && styles.tabChipActive]}
                    onPress={() => setSelectedRoleMemberId(m.id)}
                  >
                    <Text style={[styles.tabText, selectedRoleMemberId === m.id && styles.tabTextActive]}>
                      {m.fullName || m.username} ({m.email})
                    </Text>
                  </Pressable>
                ))}
              </View>
              {!!selectedRoleMember && (
                <View style={{ marginTop: 6 }}>
                  <Text style={styles.memberSub}>
                    Seçili kullanıcı: {selectedRoleMember.fullName || selectedRoleMember.username}
                  </Text>
                  <Text style={styles.memberSub}>
                    Mevcut roller: {(selectedRoleMember.roleIds || []).join(", ") || "Yok"}
                  </Text>
                  <View style={styles.inlineRowWrap}>
                    {cfg.roles.map((r) => {
                      const selected = (selectedRoleMember.roleIds || []).includes(r.id)
                      return (
                        <Pressable
                          key={`assign-${selectedRoleMember.id}-${r.id}`}
                          style={[styles.tabChip, selected && styles.tabChipActive]}
                          onPress={() => void toggleMemberRole(selectedRoleMember, r.id)}
                        >
                          <Text style={[styles.tabText, selected && styles.tabTextActive]}>{r.name}</Text>
                        </Pressable>
                      )
                    })}
                  </View>
                  <View style={styles.inlineRow}>
                    <Pressable style={styles.actionBtn} onPress={() => void clearSelectedMemberRoles()}>
                      <Text style={styles.actionText}>Seçili Kullanıcı Rolleri Temizle</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
            <LabelInput label="Yeni rol adı" value={newRoleName} onChangeText={setNewRoleName} />
            <Pressable style={styles.actionBtn} onPress={addRole}>
              <Text style={styles.actionText}>Rol Ekle</Text>
            </Pressable>
            <TextInput
              value={rolePermissionSearch}
              onChangeText={setRolePermissionSearch}
              placeholder="Yetki ara (kod/açıklama)"
              placeholderTextColor={tc("#8A6A5D")}
              style={styles.input}
            />
            {cfg.roles.map((role) => (
              <View key={role.id} style={styles.slotBox}>
                <View style={styles.switchRow}>
                  <Text style={styles.slotTitle}>{role.name} ({role.id}) - {role.permissions.length} yetki</Text>
                  <View style={styles.inlineRow}>
                    <Pressable style={styles.actionBtn} onPress={() => duplicateRole(role)}>
                      <Text style={styles.actionText}>Kopyala</Text>
                    </Pressable>
                    <Pressable style={styles.deleteBtn} onPress={() => removeRole(role)}>
                      <Text style={styles.deleteText}>Rolü Sil</Text>
                    </Pressable>
                  </View>
                </View>
                <View style={styles.inlineRowWrap}>
                  <Pressable style={styles.actionBtn} onPress={() => setRolePermissionsBulk(role.id, "all")}>
                    <Text style={styles.actionText}>Tüm Yetkiler</Text>
                  </Pressable>
                  <Pressable style={styles.actionBtn} onPress={() => setRolePermissionsBulk(role.id, "panel")}>
                    <Text style={styles.actionText}>Sadece Panele Giriş</Text>
                  </Pressable>
                  <Pressable style={styles.deleteBtn} onPress={() => setRolePermissionsBulk(role.id, "none")}>
                    <Text style={styles.deleteText}>Hepsini Temizle</Text>
                  </Pressable>
                </View>
                <View style={styles.inlineRowWrap}>
                  {filteredRolePermissions.map((perm) => {
                    const active = role.permissions.includes(perm)
                    return (
                      <Pressable
                        key={`${role.id}-${perm}`}
                        style={[styles.tabChip, active && styles.tabChipActive]}
                        onPress={() => updateRolePermissions(role.id, perm, !active)}
                      >
                        <Text style={[styles.tabText, active && styles.tabTextActive]}>{PERMISSION_LABELS[perm]}</Text>
                      </Pressable>
                    )
                  })}
                </View>
              </View>
            ))}
          </View>
        )}

        {tab === "finance" && hasPermission("admin.finance.view") && (
          <View style={[styles.card, compactUi && styles.cardCompactUi]}>
            <SectionTitle icon="wallet-outline" text="Gelir Özeti" />
            <Metric label="Toplam Cüzdan Bakiyesi" value={`${Math.round(stats.walletBalanceTotal)} TL`} />
            <Metric label="Shopping Paket Satışı (adet)" value={`${stats.shoppingPackageSalesCount || 0}`} />
            <Metric label="Shopping Paket Geliri" value={`${Math.round(stats.shoppingPackageRevenue || 0)} TL`} />
            <Metric label="Services Paket Satışı (adet)" value={`${stats.servicesPackageSalesCount || 0}`} />
            <Metric label="Services Paket Geliri" value={`${Math.round(stats.servicesPackageRevenue || 0)} TL`} />
          </View>
        )}

        {tab === "modules" && hasPermission("admin.modules.manage") && (
          <View style={[styles.card, compactUi && styles.cardCompactUi]}>
            <SectionTitle icon="layers-outline" text="Modül Yönetimi" />
            {(Object.keys(cfg.modules) as (keyof AdminConfig["modules"])[]).map((k) => (
              <View key={k} style={styles.switchRow}>
                <Text style={styles.label}>{moduleLabels[k]}</Text>
                <Switch value={cfg.modules[k]} onValueChange={(v) => setCfg((p) => ({ ...p, modules: { ...p.modules, [k]: v } }))} />
              </View>
            ))}
          </View>
        )}

        {tab === "ads" && hasPermission("admin.ads.manage") && (
          <View style={[styles.card, compactUi && styles.cardCompactUi]}>
            <SectionTitle icon="tv-outline" text="Reklam Yönetimi" />
            <View style={styles.switchRow}>
              <Text style={styles.label}>Global Reklam</Text>
              <Switch value={cfg.adsEnabled} onValueChange={(v) => setCfg((p) => ({ ...p, adsEnabled: v }))} />
            </View>
            {(Object.keys(cfg.placements) as (keyof AdminConfig["placements"])[]).map((k) => (
              <View key={k} style={styles.slotBox}>
                <Text style={styles.slotTitle}>{placementLabels[k]}</Text>
                <View style={styles.switchRow}>
                  <Text style={styles.label}>Aktif</Text>
                  <Switch value={cfg.placements[k].enabled} onValueChange={(v) => setCfg((p) => ({ ...p, placements: { ...p.placements, [k]: { ...p.placements[k], enabled: v } } }))} />
                </View>
                <LabelInput label="Başlık" value={cfg.placements[k].title} onChangeText={(v) => setCfg((p) => ({ ...p, placements: { ...p.placements, [k]: { ...p.placements[k], title: v } } }))} />
                <LabelInput label="Açıklama" value={cfg.placements[k].subtitle} onChangeText={(v) => setCfg((p) => ({ ...p, placements: { ...p.placements, [k]: { ...p.placements[k], subtitle: v } } }))} />
                <LabelInput label="Badge" value={cfg.placements[k].ctaLabel} onChangeText={(v) => setCfg((p) => ({ ...p, placements: { ...p.placements, [k]: { ...p.placements[k], ctaLabel: v } } }))} />
              </View>
            ))}
          </View>
        )}

        {tab === "reward" && hasPermission("admin.reward.manage") && (
          <View style={[styles.card, compactUi && styles.cardCompactUi]}>
            <SectionTitle icon="videocam-outline" text="İzle Kazan Yönetimi" />
            <View style={styles.switchRow}>
              <Text style={styles.label}>Dinamik Kredi</Text>
              <Switch value={cfg.reward.dynamicEnabled} onValueChange={(v) => setCfg((p) => ({ ...p, reward: { ...p.reward, dynamicEnabled: v } }))} />
            </View>
            <NumberInput label="Sabit Kredi (TL)" value={cfg.reward.fixedAmountTl} onChange={(n) => setCfg((p) => ({ ...p, reward: { ...p.reward, fixedAmountTl: n } }))} />
            <NumberInput label="Günlük Limit" value={cfg.reward.dailyLimit} onChange={(n) => setCfg((p) => ({ ...p, reward: { ...p.reward, dailyLimit: n } }))} />
            <NumberInput label="Cooldown (sn)" value={cfg.reward.cooldownSec} onChange={(n) => setCfg((p) => ({ ...p, reward: { ...p.reward, cooldownSec: n } }))} />
            <NumberInput label="10 dk Max Deneme" value={cfg.reward.maxAttemptsIn10Min} onChange={(n) => setCfg((p) => ({ ...p, reward: { ...p.reward, maxAttemptsIn10Min: n } }))} />
            <NumberInput label="Spam Kilidi (dk)" value={cfg.reward.spamLockMinutes} onChange={(n) => setCfg((p) => ({ ...p, reward: { ...p.reward, spamLockMinutes: n } }))} />
            <NumberInput label="Saat Farkı Kilidi (dk)" value={cfg.reward.clockDriftLockMinutes} onChange={(n) => setCfg((p) => ({ ...p, reward: { ...p.reward, clockDriftLockMinutes: n } }))} />
          </View>
        )}

        {canSaveSettings && (
          <Pressable style={styles.save} onPress={() => void save()}><Text style={styles.saveText}>Tüm Ayarları Kaydet</Text></Pressable>
        )}
        {!!note && <Text style={styles.note}>{note}</Text>}
      </View>
    </ScrollView>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  )
}

function SectionTitle({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.sectionHead}>
      <View style={styles.sectionIconWrap}>
        <Ionicons name={icon as any} size={15} color={tc("#7A2F4D")} />
      </View>
      <Text style={styles.section}>{text}</Text>
    </View>
  )
}

function TrendChip({
  label,
  current,
  previous,
  suffix = "",
}: {
  label: string
  current: number
  previous: number
  suffix?: string
}) {
  const delta = current - previous
  const up = delta >= 0
  return (
    <View style={styles.trendChip}>
      <Text style={styles.trendLabel}>{label}</Text>
      <Text style={styles.trendValue}>{`${current}${suffix}`}</Text>
      <Text style={[styles.trendDelta, up ? styles.trendUp : styles.trendDown]}>
        {up ? "▲" : "▼"} {Math.abs(delta)}
      </Text>
    </View>
  )
}

function LabelInput({ label, value, onChangeText }: { label: string; value: string; onChangeText: (v: string) => void }) {
  return (
    <View>
      <Text style={styles.smallLabel}>{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} style={styles.input} placeholderTextColor={tc("#8A6A5D")} />
    </View>
  )
}

function NumberInput({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <View>
      <Text style={styles.smallLabel}>{label}</Text>
      <TextInput
        value={`${value}`}
        onChangeText={(v) => onChange(Number(v.replace(/[^\d]/g, "")) || 0)}
        keyboardType="number-pad"
        style={styles.input}
        placeholderTextColor={tc("#8A6A5D")}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  page: { ...moduleStyles.page, padding: 16, backgroundColor: "rgba(249,240,247,0.78)" },
  content: { ...moduleStyles.content, position: "relative" },
  bgOrbA: { position: "absolute", top: -90, right: -70, width: 190, height: 190, borderRadius: 999, backgroundColor: "rgba(255,0,102,0.07)" },
  bgOrbB: { position: "absolute", top: 110, left: -80, width: 170, height: 170, borderRadius: 999, backgroundColor: "rgba(143,80,182,0.1)" },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 8 },
  topActions: { flexDirection: "row", alignItems: "center", gap: 6 },
  back: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: tc("#E7D4C4"), borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7, backgroundColor: "rgba(255,255,255,0.9)" },
  backText: { color: tc("#4A342A"), fontSize: 12, fontWeight: "700" },
  title: { color: tc("#4A342A"), fontSize: 21, fontWeight: "900", letterSpacing: 0.2, flex: 1, textAlign: "center" },
  panelSubtitle: { color: tc("#7A5B4E"), fontSize: 12, fontWeight: "700", marginBottom: 10, marginTop: -2 },
  refresh: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderColor: tc("#E7D4C4"), borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: "rgba(255,255,255,0.9)" },
  refreshText: { color: tc("#4A342A"), fontSize: 12, fontWeight: "700" },
  compactToggleActive: { borderColor: "rgba(255,95,136,0.55)", backgroundColor: "rgba(255,0,102,0.1)" },
  compactToggleText: { color: tc("#7A2F4D") },
  lockBtn: { borderColor: "rgba(255,95,136,0.55)", backgroundColor: "rgba(255,0,102,0.08)" },
  lockBtnText: { color: tc("#8A2E53") },
  heroCard: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.65)",
    borderRadius: 18,
    backgroundColor: "rgba(255,250,255,0.84)",
    padding: 14,
    marginBottom: 12,
    shadowColor: "#401f3b",
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
    overflow: "hidden",
  },
  heroAccent: { position: "absolute", left: 0, right: 0, top: 0, height: 4, backgroundColor: tc("#FF0066") },
  heroTitle: { color: tc("#4A342A"), fontSize: 14, fontWeight: "900" },
  heroSub: { color: tc("#7A5B4E"), fontSize: 12, fontWeight: "700", marginTop: 2, marginBottom: 8 },
  heroStatRow: { flexDirection: "row", gap: 8 },
  heroStat: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tc("#E8D8CB"),
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  heroStatValue: { color: tc("#2F2018"), fontSize: 18, fontWeight: "900" },
  heroStatLabel: { color: tc("#7A5B4E"), fontSize: 11, fontWeight: "700", marginTop: 2 },
  securityBar: {
    borderWidth: 1,
    borderColor: tc("#E7D4C4"),
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.9)",
    padding: 11,
    marginBottom: 12,
  },
  securityTitle: { color: tc("#4A342A"), fontSize: 12, fontWeight: "900", marginBottom: 6 },
  securityRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  securityInput: {
    flex: 1,
    minHeight: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: tc("#CFAF9A"),
    backgroundColor: tc("#FFFFFF"),
    color: tc("#2F2018"),
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
  },
  securityState: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  securityStateOk: { borderColor: tc("#2EA66F"), backgroundColor: "rgba(46,166,111,0.14)" },
  securityStateOff: { borderColor: tc("#DABFAE"), backgroundColor: tc("#FFF7F2") },
  securityStateText: { color: tc("#4A342A"), fontSize: 11, fontWeight: "800" },
  undoBar: {
    borderWidth: 1,
    borderColor: "rgba(255,95,136,0.55)",
    borderRadius: 14,
    backgroundColor: "rgba(255,0,102,0.08)",
    padding: 11,
    marginBottom: 12,
    gap: 8,
  },
  undoText: { color: tc("#7A2F4D"), fontSize: 12, fontWeight: "800" },
  undoBtn: {
    alignSelf: "flex-start",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: tc("#FF0066"),
    backgroundColor: "rgba(255,0,102,0.16)",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  undoBtnText: { color: tc("#7A2F4D"), fontSize: 12, fontWeight: "900" },
  tabStickyWrap: {
    backgroundColor: "rgba(249,240,247,0.97)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(233,216,200,0.75)",
    marginBottom: 10,
    paddingTop: 6,
    paddingBottom: 2,
    zIndex: 30,
  },
  tabNavRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  tabArrowBtn: {
    width: 30,
    height: 30,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: tc("#E0CFC2"),
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  tabScroll: { width: "100%" },
  tabRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingBottom: 8, paddingRight: 8 },
  tabRowCompactUi: { gap: 6, paddingBottom: 6 },
  tabChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: tc("#E0CFC2"),
    backgroundColor: "rgba(255,255,255,0.94)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    position: "relative",
    overflow: "hidden",
    minHeight: 36,
  },
  tabChipActive: {
    borderColor: tc("#FF0066"),
    backgroundColor: tc("#FFE8F2"),
    shadowColor: tc("#FF4B93"),
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tabChipInner: { flexDirection: "row", alignItems: "center", gap: 5 },
  tabText: { color: tc("#6E5549"), fontSize: 12, fontWeight: "700" },
  tabTextActive: { color: tc("#7A2F4D"), fontWeight: "900" },
  tabActiveUnderline: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: 3,
    height: 2.5,
    borderRadius: 999,
    backgroundColor: tc("#FF0066"),
  },
  card: {
    borderWidth: 1,
    borderColor: "rgba(233,216,200,0.95)",
    borderRadius: 18,
    backgroundColor: "rgba(255,253,249,0.94)",
    padding: 13,
    marginBottom: 11,
    shadowColor: "#5A1E3F",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardCompactUi: { padding: 10, borderRadius: 15, marginBottom: 8 },
  contentCompactUi: { maxWidth: 500 },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: "rgba(233,216,200,0.75)", paddingBottom: 6 },
  sectionIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,95,136,0.45)",
    backgroundColor: "rgba(255,0,102,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  section: { color: tc("#4A342A"), fontSize: 16, fontWeight: "900" },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  label: { color: tc("#5F463A"), fontSize: 13, fontWeight: "700" },
  smallLabel: { color: tc("#6B4D40"), fontSize: 12, fontWeight: "700", marginTop: 4, marginBottom: 4 },
  input: { minHeight: 42, borderRadius: 12, borderWidth: 1, borderColor: tc("#DABFAE"), backgroundColor: "rgba(255,255,255,0.97)", color: tc("#2F2018"), fontSize: 14, paddingHorizontal: 11, paddingVertical: 8, marginBottom: 7 },
  textArea: {
    minHeight: 110,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: tc("#CFAF9A"),
    backgroundColor: tc("#FFFFFF"),
    color: tc("#2F2018"),
    fontSize: 13,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 6,
    textAlignVertical: "top",
  },
  metricRow: { flexDirection: "row", justifyContent: "space-between", borderWidth: 1, borderColor: tc("#E8D8CB"), borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: "rgba(255,249,243,0.96)", marginBottom: 7 },
  metricLabel: { color: tc("#6B4D40"), fontSize: 12, fontWeight: "700" },
  metricValue: { color: tc("#2F2018"), fontSize: 13, fontWeight: "900" },
  trendChip: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: tc("#E8D8CB"),
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 92,
  },
  trendLabel: { color: tc("#6B4D40"), fontSize: 11, fontWeight: "700" },
  trendValue: { color: tc("#2F2018"), fontSize: 13, fontWeight: "900", marginTop: 1 },
  trendDelta: { fontSize: 11, fontWeight: "800", marginTop: 2 },
  trendUp: { color: tc("#2EA66F") },
  trendDown: { color: tc("#8A2E53") },
  slotBox: { borderWidth: 1, borderColor: tc("#E7D4C4"), borderRadius: 12, padding: 9, marginBottom: 8, backgroundColor: "rgba(255,249,243,0.93)" },
  slotTitle: { color: tc("#4A342A"), fontSize: 13, fontWeight: "900", marginBottom: 4 },
  alertRow: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: tc("#E7D4C4"),
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 6,
  },
  alertRowHigh: { borderColor: "rgba(255,95,136,0.6)", backgroundColor: "rgba(255,0,102,0.1)" },
  alertText: { color: tc("#6B4D40"), fontSize: 12, fontWeight: "700" },
  alertTextHigh: { color: tc("#8A2E53") },
  memberCard: {
    flexDirection: "row",
    gap: 10,
    borderWidth: 1,
    borderColor: tc("#E8D8CB"),
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: "rgba(255,0,102,0.28)",
    padding: 10,
    marginBottom: 8,
    backgroundColor: "rgba(255,249,243,0.95)",
  },
  memberName: { color: tc("#2F2018"), fontSize: 13, fontWeight: "800" },
  memberSub: { color: tc("#7A5B4E"), fontSize: 12, marginTop: 2, fontWeight: "700" },
  memberBlocked: { color: tc("#B01E5A"), fontSize: 11, marginTop: 4, fontWeight: "800" },
  blockBtn: { borderRadius: 999, borderWidth: 1, borderColor: tc("#FF4B93"), backgroundColor: "rgba(255,0,102,0.16)", alignSelf: "center", paddingHorizontal: 10, paddingVertical: 7 },
  unblockBtn: { borderColor: tc("#2EA66F"), backgroundColor: "rgba(46,166,111,0.12)" },
  blockText: { color: tc("#8A2E53"), fontSize: 12, fontWeight: "800" },
  unblockText: { color: tc("#226E4D") },
  inlineRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  inlineRowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  templateActionWrap: { gap: 6 },
  actionBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: tc("#E0CFC2"),
    backgroundColor: "rgba(255,244,236,0.95)",
    paddingHorizontal: 10,
    paddingVertical: 8,
    shadowColor: "#7A2F4D",
    shadowOpacity: 0.07,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  disabledBtn: { opacity: 0.45 },
  actionText: { color: tc("#6E5549"), fontSize: 12, fontWeight: "800" },
  bulkCountBadge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: tc("#E0CFC2"),
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  bulkCountText: { color: tc("#5F463A"), fontSize: 12, fontWeight: "800" },
  overdueBadge: { borderColor: "rgba(255,95,136,0.55)", backgroundColor: "rgba(255,0,102,0.12)" },
  overdueText: { color: tc("#8A2E53") },
  selectBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: tc("#DABFAE"),
    backgroundColor: tc("#FFF7F2"),
    alignSelf: "center",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  selectBtnActive: { borderColor: tc("#FF0066"), backgroundColor: tc("#FFE8F2") },
  selectBtnText: { color: tc("#6E5549"), fontSize: 12, fontWeight: "800" },
  selectBtnTextActive: { color: tc("#7A2F4D") },
  saveMiniBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: tc("#FF0066"),
    backgroundColor: "rgba(255,0,102,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  saveMiniBtnText: { color: tc("#7A2F4D"), fontSize: 12, fontWeight: "900" },
  deleteBtn: { borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,95,136,0.6)", backgroundColor: "rgba(255,0,102,0.16)", paddingHorizontal: 10, paddingVertical: 8 },
  deleteText: { color: tc("#8A2E53"), fontSize: 12, fontWeight: "800" },
  empty: { color: tc("#7A5B4E"), fontSize: 12, fontWeight: "700" },
  save: { minHeight: 46, borderRadius: 12, backgroundColor: tc("#FF0066"), alignItems: "center", justifyContent: "center", marginBottom: 8, shadowColor: tc("#FF4B93"), shadowOpacity: 0.22, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  saveText: { color: tc("#FFF"), fontSize: 14, fontWeight: "800" },
  note: { color: tc("#7A2F4D"), fontSize: 12, fontWeight: "800" },
})
