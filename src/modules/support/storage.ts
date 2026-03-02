import AsyncStorage from "@react-native-async-storage/async-storage"

export const SUPPORT_TICKETS_KEY = "supportV1:tickets"

export type SupportTicketStatus = "open" | "closed"
export type SupportTicketPriority = "low" | "medium" | "high"
export type SupportTicketCategory = "technical" | "account" | "payment" | "other"

export type SupportTicket = {
  id: string
  userId: string
  userName: string
  userEmail?: string
  subject: string
  message: string
  priority: SupportTicketPriority
  category: SupportTicketCategory
  status: SupportTicketStatus
  createdAt: string
  updatedAt: string
  adminReply?: string
  repliedAt?: string
}

const safeParse = <T>(raw: string | null): T[] => {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as T[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export const loadSupportTickets = async (): Promise<SupportTicket[]> => {
  const raw = await AsyncStorage.getItem(SUPPORT_TICKETS_KEY)
  return safeParse<any>(raw)
    .map((x, idx) => ({
      id: `${x?.id ?? `ticket-${Date.now()}-${idx}`}`,
      userId: `${x?.userId ?? ""}`.trim() || "user:local",
      userName: `${x?.userName ?? ""}`.trim() || "Kullanıcı",
      userEmail: x?.userEmail ? `${x.userEmail}` : undefined,
      subject: `${x?.subject ?? ""}`.trim(),
      message: `${x?.message ?? ""}`.trim(),
      priority: (x?.priority === "high" ? "high" : x?.priority === "low" ? "low" : "medium") as SupportTicketPriority,
      category: (
        x?.category === "technical"
          ? "technical"
          : x?.category === "account"
            ? "account"
            : x?.category === "payment"
              ? "payment"
              : "other"
      ) as SupportTicketCategory,
      status: (x?.status === "closed" ? "closed" : "open") as SupportTicketStatus,
      createdAt: `${x?.createdAt ?? new Date().toISOString()}`,
      updatedAt: `${x?.updatedAt ?? x?.createdAt ?? new Date().toISOString()}`,
      adminReply: x?.adminReply ? `${x.adminReply}` : undefined,
      repliedAt: x?.repliedAt ? `${x.repliedAt}` : undefined,
    }))
    .filter((x) => x.subject.length > 0 && x.message.length > 0)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
}

export const saveSupportTickets = async (tickets: SupportTicket[]) => {
  await AsyncStorage.setItem(SUPPORT_TICKETS_KEY, JSON.stringify(tickets))
}

export const createSupportTicket = async (input: {
  userId: string
  userName: string
  userEmail?: string
  subject: string
  message: string
  priority?: SupportTicketPriority
  category?: SupportTicketCategory
}) => {
  const list = await loadSupportTickets()
  const now = new Date().toISOString()
  const ticket: SupportTicket = {
    id: `ticket-${Date.now()}`,
    userId: input.userId,
    userName: input.userName,
    userEmail: input.userEmail,
    subject: input.subject.trim(),
    message: input.message.trim(),
    priority: input.priority ?? "medium",
    category: input.category ?? "other",
    status: "open",
    createdAt: now,
    updatedAt: now,
  }
  const next = [ticket, ...list]
  await saveSupportTickets(next)
  return next
}

export const replySupportTicket = async (ticketId: string, reply: string) => {
  const list = await loadSupportTickets()
  const now = new Date().toISOString()
  const next = list.map((t) =>
    t.id === ticketId
      ? { ...t, adminReply: reply.trim(), repliedAt: now, updatedAt: now, status: "open" as const }
      : t
  )
  await saveSupportTickets(next)
  return next
}

export const setSupportTicketStatus = async (ticketId: string, status: SupportTicketStatus) => {
  const list = await loadSupportTickets()
  const now = new Date().toISOString()
  const next = list.map((t) => (t.id === ticketId ? { ...t, status, updatedAt: now } : t))
  await saveSupportTickets(next)
  return next
}
