import AsyncStorage from "@react-native-async-storage/async-storage"

export const CHAT_CONVERSATIONS_KEY = "chatV1:conversations"
export const CHAT_MESSAGES_KEY = "chatV1:messages"
export const CHAT_BLOCKED_USERS_KEY = "chatV1:blockedUsers"
export const CHAT_REPORTS_KEY = "chatV1:reports"
export const CHAT_CURRENT_USER_ID = "user:local"
export const CHAT_CURRENT_USER_NAME = "Sen"

export type ChatSource = "shopping" | "services"

export type ChatConversation = {
  id: string
  source: ChatSource
  postId: string
  postTitle: string
  participants: string[]
  participantNames: Record<string, string>
  updatedAt: string
  lastMessage: string
}

export type ChatMessage = {
  id: string
  conversationId: string
  senderId: string
  senderName: string
  text: string
  imageUri?: string
  createdAt: string
  editedAt?: string
  deletedAt?: string
  readBy: string[]
}

export type ChatReport = {
  id: string
  conversationId: string
  reportedUserId: string
  reason: string
  createdAt: string
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

export const loadConversations = async () =>
  safeParse<ChatConversation>(await AsyncStorage.getItem(CHAT_CONVERSATIONS_KEY))

export const saveConversations = async (next: ChatConversation[]) => {
  await AsyncStorage.setItem(CHAT_CONVERSATIONS_KEY, JSON.stringify(next))
}

export const loadMessages = async () =>
  safeParse<any>(await AsyncStorage.getItem(CHAT_MESSAGES_KEY)).map((m, idx) => ({
    id: `${m?.id ?? `msg-${Date.now()}-${idx}`}`,
    conversationId: `${m?.conversationId ?? ""}`,
    senderId: `${m?.senderId ?? ""}`,
    senderName: `${m?.senderName ?? ""}`,
    text: `${m?.text ?? ""}`,
    imageUri: m?.imageUri ? `${m.imageUri}` : undefined,
    createdAt: `${m?.createdAt ?? new Date().toISOString()}`,
    editedAt: m?.editedAt ? `${m.editedAt}` : undefined,
    deletedAt: m?.deletedAt ? `${m.deletedAt}` : undefined,
    readBy: Array.isArray(m?.readBy) ? m.readBy.map((x: unknown) => `${x}`) : [],
  })) as ChatMessage[]

export const saveMessages = async (next: ChatMessage[]) => {
  await AsyncStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify(next))
}

export const loadBlockedUsers = async () =>
  safeParse<string>(await AsyncStorage.getItem(CHAT_BLOCKED_USERS_KEY)).map((x) => `${x}`)

export const saveBlockedUsers = async (next: string[]) => {
  await AsyncStorage.setItem(CHAT_BLOCKED_USERS_KEY, JSON.stringify(next))
}

export const blockUser = async (userId: string) => {
  const list = await loadBlockedUsers()
  if (list.includes(userId)) return list
  const next = [userId, ...list]
  await saveBlockedUsers(next)
  return next
}

export const unblockUser = async (userId: string) => {
  const list = await loadBlockedUsers()
  const next = list.filter((x) => x !== userId)
  await saveBlockedUsers(next)
  return next
}

export const loadReports = async () =>
  safeParse<ChatReport>(await AsyncStorage.getItem(CHAT_REPORTS_KEY))

export const saveReports = async (next: ChatReport[]) => {
  await AsyncStorage.setItem(CHAT_REPORTS_KEY, JSON.stringify(next))
}

export const reportUser = async (conversationId: string, reportedUserId: string, reason: string) => {
  const reports = await loadReports()
  const next: ChatReport[] = [
    {
      id: `rep:${Date.now()}`,
      conversationId,
      reportedUserId,
      reason: reason.trim() || "Uygunsuz mesaj",
      createdAt: new Date().toISOString(),
    },
    ...reports,
  ]
  await saveReports(next)
  return next
}

const buildConversationId = (source: ChatSource, postId: string, a: string, b: string) => {
  const pair = [a, b].sort().join("|")
  return `conv:${source}:${postId}:${pair}`
}

export const openConversationForPost = async (params: {
  source: ChatSource
  postId: string
  postTitle: string
  currentUserId: string
  currentUserName: string
  otherUserId: string
  otherUserName: string
}) => {
  const conversations = await loadConversations()
  const id = buildConversationId(params.source, params.postId, params.currentUserId, params.otherUserId)
  const existing = conversations.find((c) => c.id === id)
  if (existing) {
    return existing
  }
  const now = new Date().toISOString()
  const created: ChatConversation = {
    id,
    source: params.source,
    postId: params.postId,
    postTitle: params.postTitle,
    participants: [params.currentUserId, params.otherUserId],
    participantNames: {
      [params.currentUserId]: params.currentUserName,
      [params.otherUserId]: params.otherUserName,
    },
    updatedAt: now,
    lastMessage: "",
  }
  await saveConversations([created, ...conversations])
  return created
}

export const sendMessageToConversation = async (params: {
  conversationId: string
  senderId: string
  senderName: string
  text: string
  imageUri?: string
}) => {
  const text = params.text.trim()
  const imageUri = params.imageUri?.trim()
  if (!text && !imageUri) return null
  const now = new Date().toISOString()
  const msg: ChatMessage = {
    id: `msg:${Date.now()}`,
    conversationId: params.conversationId,
    senderId: params.senderId,
    senderName: params.senderName,
    text,
    imageUri,
    createdAt: now,
    readBy: [params.senderId],
  }
  const [messages, conversations] = await Promise.all([loadMessages(), loadConversations()])
  await Promise.all([
    saveMessages([...messages, msg]),
    saveConversations(
      conversations.map((c) =>
        c.id === params.conversationId
          ? { ...c, updatedAt: now, lastMessage: text || (imageUri ? "Fotograf" : "") }
          : c
      )
    ),
  ])
  return msg
}

export const editMessageText = async (messageId: string, senderId: string, nextText: string) => {
  const text = nextText.trim()
  if (!text) return false
  const messages = await loadMessages()
  let changed = false
  const next = messages.map((m) => {
    if (m.id !== messageId || m.senderId !== senderId || m.deletedAt) return m
    changed = true
    return { ...m, text, editedAt: new Date().toISOString() }
  })
  if (!changed) return false
  await saveMessages(next)
  return true
}

export const deleteMessageForSender = async (messageId: string, senderId: string) => {
  const messages = await loadMessages()
  let changed = false
  const next = messages.map((m) => {
    if (m.id !== messageId || m.senderId !== senderId || m.deletedAt) return m
    changed = true
    return {
      ...m,
      text: "Mesaj silindi",
      imageUri: undefined,
      deletedAt: new Date().toISOString(),
      editedAt: undefined,
    }
  })
  if (!changed) return false
  await saveMessages(next)
  return true
}

export const markConversationRead = async (conversationId: string, userId: string) => {
  const messages = await loadMessages()
  const next = messages.map((m) => {
    if (m.conversationId !== conversationId) return m
    if (m.readBy.includes(userId)) return m
    return { ...m, readBy: [...m.readBy, userId] }
  })
  await saveMessages(next)
}

export const getUnreadCountForUser = async (userId: string) => {
  const messages = await loadMessages()
  return messages.filter((m) => m.senderId !== userId && !m.readBy.includes(userId)).length
}

