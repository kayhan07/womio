import { Ionicons } from "@expo/vector-icons"
import { useLocalSearchParams } from "expo-router"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { Image } from "expo-image"
import * as ImagePicker from "expo-image-picker"
import { moduleStyles, moduleTheme } from "@/src/theme/moduleStyles"
import { ModuleInput } from "@/src/components/ui/ModulePrimitives"
import {
  blockUser,
  CHAT_CURRENT_USER_ID,
  CHAT_CURRENT_USER_NAME,
  ChatConversation,
  ChatMessage,
  deleteMessageForSender,
  editMessageText,
  loadBlockedUsers,
  loadConversations,
  loadMessages,
  markConversationRead,
  reportUser,
  sendMessageToConversation,
  unblockUser,
} from "@/src/modules/chat/storage"
import AsyncStorage from "@react-native-async-storage/async-storage"
import {
  SupportTicketCategory,
  SupportTicketPriority,
  SupportTicket,
  createSupportTicket,
  loadSupportTickets,
} from "@/src/modules/support/storage"
import { tc } from "@/src/theme/tokens"

const BRAND = moduleTheme.colors.brand

export default function MessagesScreen() {
  const params = useLocalSearchParams<{ conversationId?: string }>()
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [conversationQuery, setConversationQuery] = useState("")
  const [onlyUnread, setOnlyUnread] = useState(false)
  const [draft, setDraft] = useState("")
  const [blockedUsers, setBlockedUsers] = useState<string[]>([])
  const [notice, setNotice] = useState("")
  const [pendingImageUri, setPendingImageUri] = useState<string | null>(null)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState("")
  const [supportSubject, setSupportSubject] = useState("")
  const [supportMessage, setSupportMessage] = useState("")
  const [supportCategory, setSupportCategory] = useState<SupportTicketCategory>("technical")
  const [supportPriority, setSupportPriority] = useState<SupportTicketPriority>("medium")
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([])

  const reload = useCallback(async () => {
    const [c, m, blocked, tickets, profileRaw] = await Promise.all([
      loadConversations(),
      loadMessages(),
      loadBlockedUsers(),
      loadSupportTickets(),
      AsyncStorage.getItem("womio:userProfile"),
    ])
    setBlockedUsers(blocked)
    const mine = c
      .filter((x) => x.participants.includes(CHAT_CURRENT_USER_ID))
      .filter((x) => {
        const other = x.participants.find((p) => p !== CHAT_CURRENT_USER_ID)
        return other ? !blocked.includes(other) : true
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    setConversations(mine)
    setMessages(m)
    let email = ""
    try {
      const parsed = profileRaw ? JSON.parse(profileRaw) : null
      email = `${parsed?.email ?? ""}`.trim().toLowerCase()
    } catch {}
    const mineTickets = tickets.filter(
      (t) => t.userId === CHAT_CURRENT_USER_ID || (!!email && t.userEmail?.toLowerCase() === email)
    )
    setSupportTickets(mineTickets)
    if (params.conversationId && mine.some((x) => x.id === params.conversationId)) {
      setSelectedConversationId(params.conversationId)
    } else if (!selectedConversationId && mine[0]) {
      setSelectedConversationId(mine[0].id)
    }
  }, [params.conversationId, selectedConversationId])

  const sendSupportTicket = async () => {
    const subject = supportSubject.trim()
    const message = supportMessage.trim()
    if (!subject || !message) {
      setNotice("Konu ve mesaj zorunlu")
      setTimeout(() => setNotice(""), 1500)
      return
    }
    let email = ""
    try {
      const raw = await AsyncStorage.getItem("womio:userProfile")
      const parsed = raw ? JSON.parse(raw) : null
      email = `${parsed?.email ?? ""}`.trim().toLowerCase()
    } catch {}
    await createSupportTicket({
      userId: CHAT_CURRENT_USER_ID,
      userName: CHAT_CURRENT_USER_NAME,
      userEmail: email || undefined,
      subject,
      message,
      category: supportCategory,
      priority: supportPriority,
    })
    setSupportSubject("")
    setSupportMessage("")
    setSupportCategory("technical")
    setSupportPriority("medium")
    await reload()
    setNotice("Talebin müşteri hizmetlerine iletildi")
    setTimeout(() => setNotice(""), 1800)
  }

  useEffect(() => {
    void reload()
  }, [reload])

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.id === selectedConversationId) || null,
    [conversations, selectedConversationId]
  )
  const otherUserId = selectedConversation?.participants.find((p) => p !== CHAT_CURRENT_USER_ID) || null
  const isBlocked = !!otherUserId && blockedUsers.includes(otherUserId)
  const threadMessages = useMemo(
    () =>
      messages
        .filter((m) => m.conversationId === selectedConversationId)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [messages, selectedConversationId]
  )
  const unreadTotal = useMemo(
    () =>
      conversations.reduce((sum, c) => {
        const unread = messages.filter(
          (m) =>
            m.conversationId === c.id &&
            m.senderId !== CHAT_CURRENT_USER_ID &&
            !m.readBy.includes(CHAT_CURRENT_USER_ID)
        ).length
        return sum + unread
      }, 0),
    [conversations, messages]
  )
  const filteredConversations = useMemo(() => {
    const q = conversationQuery.trim().toLowerCase()
    const base = conversations.filter((c) => {
      const unread = messages.filter(
        (m) =>
          m.conversationId === c.id &&
          m.senderId !== CHAT_CURRENT_USER_ID &&
          !m.readBy.includes(CHAT_CURRENT_USER_ID)
      ).length
      if (onlyUnread && unread <= 0) return false
      if (!q) return true
      const other = c.participants.find((p) => p !== CHAT_CURRENT_USER_ID) || CHAT_CURRENT_USER_ID
      const name = `${c.participantNames[other] || "Kullanıcı"}`.toLowerCase()
      const title = `${c.postTitle || ""}`.toLowerCase()
      const last = `${c.lastMessage || ""}`.toLowerCase()
      return name.includes(q) || title.includes(q) || last.includes(q)
    })
    return base
  }, [conversations, conversationQuery, messages, onlyUnread])

  const getConversationUnreadCount = useCallback(
    (conversationId: string) =>
      messages.filter(
        (m) =>
          m.conversationId === conversationId &&
          m.senderId !== CHAT_CURRENT_USER_ID &&
          !m.readBy.includes(CHAT_CURRENT_USER_ID)
      ).length,
    [messages]
  )

  const send = async () => {
    if (!selectedConversationId || (!draft.trim() && !pendingImageUri) || isBlocked) return
    await sendMessageToConversation({
      conversationId: selectedConversationId,
      senderId: CHAT_CURRENT_USER_ID,
      senderName: CHAT_CURRENT_USER_NAME,
      text: draft,
      imageUri: pendingImageUri || undefined,
    })
    setDraft("")
    setPendingImageUri(null)
    await reload()
    setNotice("Mesaj gönderildi")
    setTimeout(() => setNotice(""), 1500)
  }

  const pickImage = async (camera: boolean) => {
    const perm = camera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      setNotice("Fotoğraf izni gerekli")
      setTimeout(() => setNotice(""), 1500)
      return
    }
    const result = camera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.72 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.72 })
    if (!result.canceled) {
      setPendingImageUri(result.assets[0]?.uri || null)
    }
  }

  const startEdit = (m: ChatMessage) => {
    setEditingMessageId(m.id)
    setEditDraft(m.text)
  }

  const saveEdit = async () => {
    if (!editingMessageId) return
    const ok = await editMessageText(editingMessageId, CHAT_CURRENT_USER_ID, editDraft)
    if (ok) {
      setNotice("Mesaj düzenlendi")
      setTimeout(() => setNotice(""), 1500)
      setEditingMessageId(null)
      setEditDraft("")
      await reload()
    }
  }

  const removeMessage = async (messageId: string) => {
    const ok = await deleteMessageForSender(messageId, CHAT_CURRENT_USER_ID)
    if (ok) {
      setNotice("Mesaj silindi")
      setTimeout(() => setNotice(""), 1500)
      await reload()
    }
  }

  const markRead = useCallback(async () => {
    if (!selectedConversationId) return
    await markConversationRead(selectedConversationId, CHAT_CURRENT_USER_ID)
    await reload()
  }, [selectedConversationId, reload])

  useEffect(() => {
    void markRead()
  }, [markRead])

  const onBlockToggle = async () => {
    if (!otherUserId) return
    if (isBlocked) {
      await unblockUser(otherUserId)
      setNotice("Engel kaldırıldı")
    } else {
      await blockUser(otherUserId)
      setNotice("Kullanıcı engellendi")
    }
    setTimeout(() => setNotice(""), 1600)
    await reload()
  }

  const onReport = async () => {
    if (!selectedConversationId || !otherUserId) return
    Alert.alert("Raporla", "Bu kullanıcıyı raporlamak istiyor musun?", [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Raporla",
        style: "destructive",
        onPress: () => {
          void reportUser(selectedConversationId, otherUserId, "Uygunsuz mesaj")
          setNotice("Rapor kaydedildi")
          setTimeout(() => setNotice(""), 1600)
        },
      },
    ])
  }

  const getInitials = (name: string) => {
    const safe = `${name || ""}`.trim()
    if (!safe) return "?"
    const parts = safe.split(" ").filter(Boolean)
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase()
    return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase()
  }

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.title}>Mesaj Kutusu</Text>
            <View style={styles.statusChip}>
              <Ionicons name="chatbubble-ellipses-outline" size={13} color={tc("#7A5367")} />
              <Text style={styles.statusChipText}>Canlı</Text>
            </View>
          </View>
          <Text style={styles.subtitle}>Satış, ilan ve destek mesajların tek ekranda.</Text>
          <View style={styles.metricRow}>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{conversations.length}</Text>
              <Text style={styles.metricLabel}>Sohbet</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{unreadTotal}</Text>
              <Text style={styles.metricLabel}>Okunmamış</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{supportTickets.length}</Text>
              <Text style={styles.metricLabel}>Destek Kaydı</Text>
            </View>
          </View>
        </View>

        <View style={styles.panel}>
          <View style={styles.sectionHeadRow}>
            <Text style={styles.sectionTitle}>Konuşmalar</Text>
            <View style={styles.sectionPill}>
              <Ionicons name="sparkles-outline" size={12} color={tc("#7A5367")} />
              <Text style={styles.sectionPillText}>Premium</Text>
            </View>
          </View>
          <ModuleInput
            value={conversationQuery}
            onChangeText={setConversationQuery}
            placeholder="Konuşma ara: kişi, ilan veya mesaj"
            placeholderTextColor={tc("#A8A8A8")}
            style={[styles.composeInput, styles.searchInput]}
          />
          <Pressable
            style={[styles.filterChip, onlyUnread && styles.filterChipActive]}
            onPress={() => setOnlyUnread((prev) => !prev)}
          >
            <Ionicons
              name={onlyUnread ? "checkmark-circle" : "ellipse-outline"}
              size={14}
              color={onlyUnread ? tc("#FFF") : tc("#7A5367")}
            />
            <Text style={[styles.filterChipText, onlyUnread && styles.filterChipTextActive]}>
              Sadece okunmamışlar
            </Text>
          </Pressable>
          {filteredConversations.map((c) => {
            const other = c.participants.find((p) => p !== CHAT_CURRENT_USER_ID) || CHAT_CURRENT_USER_ID
            const unreadCount = getConversationUnreadCount(c.id)
            return (
              <Pressable
                key={c.id}
                style={[styles.convItem, selectedConversationId === c.id && styles.convItemActive]}
                onPress={() => setSelectedConversationId(c.id)}
              >
                <View style={styles.convRow}>
                  <View style={[styles.avatar, selectedConversationId === c.id && styles.avatarActive]}>
                    <Text style={[styles.avatarText, selectedConversationId === c.id && styles.avatarTextActive]}>
                      {getInitials(c.participantNames[other] || "Kullanıcı")}
                    </Text>
                  </View>
                  <View style={styles.convMain}>
                    <View style={styles.convTop}>
                      <Text style={[styles.convName, selectedConversationId === c.id && styles.convNameActive]}>
                        {c.participantNames[other] || "Kullanıcı"}
                      </Text>
                      <View style={styles.convMetaWrap}>
                        <Text style={[styles.convMeta, selectedConversationId === c.id && styles.convMetaActive]}>
                          {c.source === "shopping" ? "Satış" : "İlan"}
                        </Text>
                        {unreadCount > 0 && (
                          <View style={styles.unreadBadge}>
                            <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <Text style={[styles.convPost, selectedConversationId === c.id && styles.convPostActive]}>
                      {c.postTitle}
                    </Text>
                    <Text style={[styles.convLast, selectedConversationId === c.id && styles.convLastActive]}>
                      {c.lastMessage || "Henüz mesaj yok."}
                    </Text>
                  </View>
                </View>
              </Pressable>
            )
          })}
          {!filteredConversations.length && (
            <Text style={styles.empty}>
              {onlyUnread
                ? "Okunmamış konuşma bulunamadı."
                : "Aramaya uygun konuşma bulunamadı."}
            </Text>
          )}
        </View>

        <View style={styles.panel}>
          <View style={styles.sectionHeadRow}>
            <Text style={styles.sectionTitle}>Mesajlar</Text>
            <Text style={styles.sectionHint}>Canlı sohbet görünümü</Text>
          </View>
          {!!selectedConversation ? (
            <>
              <View style={styles.actionRow}>
                <Pressable style={styles.actionChip} onPress={() => void onBlockToggle()}>
                  <Text style={styles.actionChipText}>{isBlocked ? "Engeli Kaldır" : "Kullanıcıyı Engelle"}</Text>
                </Pressable>
                <Pressable style={styles.actionChipWarn} onPress={() => void onReport()}>
                  <Text style={styles.actionChipWarnText}>Raporla</Text>
                </Pressable>
              </View>
              <View style={styles.threadWrap}>
                {threadMessages.map((m) => (
                  <View
                    key={m.id}
                    style={[styles.msgBubble, m.senderId === CHAT_CURRENT_USER_ID ? styles.msgMine : styles.msgOther]}
                  >
                    <View style={styles.msgHead}>
                      <Text style={styles.msgSender}>{m.senderName}</Text>
                    </View>
                    {!!m.imageUri && <Image source={{ uri: m.imageUri }} style={styles.msgImage} contentFit="cover" />}
                    {!!m.text && <Text style={styles.msgText}>{m.text}</Text>}
                    {!!m.editedAt && !m.deletedAt && <Text style={styles.edited}>düzenlendi</Text>}
                    <View style={styles.msgMetaRow}>
                      <Text style={styles.msgTime}>
                        {new Date(m.createdAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                      </Text>
                      {m.senderId === CHAT_CURRENT_USER_ID && (
                        <Text style={styles.msgRead}>
                          {selectedConversation?.participants
                            .filter((p) => p !== CHAT_CURRENT_USER_ID)
                            .every((p) => m.readBy.includes(p))
                            ? "Okundu"
                            : "Gönderildi"}
                        </Text>
                      )}
                    </View>
                    {m.senderId === CHAT_CURRENT_USER_ID && !m.deletedAt && (
                      <View style={styles.msgActions}>
                        <Pressable style={styles.msgActionBtn} onPress={() => startEdit(m)}>
                          <Text style={styles.msgActionText}>Düzenle</Text>
                        </Pressable>
                        <Pressable style={styles.msgActionBtnDanger} onPress={() => void removeMessage(m.id)}>
                          <Text style={styles.msgActionTextDanger}>Sil</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                ))}
                {!threadMessages.length && <Text style={styles.empty}>Konuşma seçildi, mesaj bekleniyor.</Text>}
              </View>
              <View style={styles.composeRow}>
                <ModuleInput
                  value={draft}
                  onChangeText={setDraft}
                  placeholder="Mesaj yaz"
                  placeholderTextColor={tc("#A8A8A8")}
                  style={styles.composeInput}
                  editable={!isBlocked}
                />
                <Pressable style={styles.iconMini} onPress={() => void pickImage(false)} disabled={isBlocked}>
                  <Ionicons name="image-outline" size={16} color={tc("#FFF")} />
                </Pressable>
                <Pressable style={styles.iconMini} onPress={() => void pickImage(true)} disabled={isBlocked}>
                  <Ionicons name="camera-outline" size={16} color={tc("#FFF")} />
                </Pressable>
                <Pressable
                  style={[styles.sendBtn, isBlocked && styles.sendBtnDisabled]}
                  onPress={() => void send()}
                  disabled={isBlocked}
                >
                  <Ionicons name="send" size={15} color={tc("#FFF")} />
                </Pressable>
              </View>
              {!!pendingImageUri && (
                <View style={styles.pendingWrap}>
                  <Image source={{ uri: pendingImageUri }} style={styles.pendingImage} contentFit="cover" />
                  <Pressable style={styles.msgActionBtnDanger} onPress={() => setPendingImageUri(null)}>
                    <Text style={styles.msgActionTextDanger}>İptal</Text>
                  </Pressable>
                </View>
              )}
              {!!editingMessageId && (
                <View style={styles.editWrap}>
                  <Text style={styles.editTitle}>Mesaj düzenle</Text>
                  <View style={styles.composeRow}>
                    <ModuleInput
                      value={editDraft}
                      onChangeText={setEditDraft}
                      placeholder="Yeni mesaj"
                      placeholderTextColor={tc("#A8A8A8")}
                      style={styles.composeInput}
                    />
                    <Pressable style={styles.sendBtn} onPress={() => void saveEdit()}>
                      <Ionicons name="checkmark" size={16} color={tc("#FFF")} />
                    </Pressable>
                    <Pressable
                      style={styles.iconMini}
                      onPress={() => {
                        setEditingMessageId(null)
                        setEditDraft("")
                      }}
                    >
                      <Ionicons name="close" size={16} color={tc("#FFF")} />
                    </Pressable>
                  </View>
                </View>
              )}
              {isBlocked && <Text style={styles.blockInfo}>Bu kullanıcıyı engelledin. Mesaj gönderemezsin.</Text>}
            </>
          ) : (
            <Text style={styles.empty}>Konuşma seç.</Text>
          )}
        </View>

        <View style={styles.panel}>
          <View style={styles.supportHead}>
            <Text style={styles.sectionTitle}>Müşteri Hizmetleri</Text>
            <View style={styles.supportBadge}>
              <Ionicons name="headset-outline" size={12} color={tc("#7A5367")} />
              <Text style={styles.supportBadgeText}>7/24</Text>
            </View>
          </View>
          <Text style={styles.convPost}>Kategori</Text>
          <View style={styles.actionRow}>
            {([
              { id: "technical", text: "Teknik" },
              { id: "account", text: "Hesap" },
              { id: "payment", text: "Ödeme" },
              { id: "other", text: "Diğer" },
            ] as const).map((x) => (
              <Pressable
                key={x.id}
                style={[styles.actionChip, supportCategory === x.id && styles.actionChipActive]}
                onPress={() => setSupportCategory(x.id)}
              >
                <Text style={[styles.actionChipText, supportCategory === x.id && styles.actionChipTextActive]}>
                  {x.text}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.convPost}>Öncelik</Text>
          <View style={styles.actionRow}>
            {([
              { id: "low", text: "Düşük" },
              { id: "medium", text: "Orta" },
              { id: "high", text: "Yüksek" },
            ] as const).map((x) => (
              <Pressable
                key={x.id}
                style={[styles.actionChip, supportPriority === x.id && styles.actionChipActive]}
                onPress={() => setSupportPriority(x.id)}
              >
                <Text style={[styles.actionChipText, supportPriority === x.id && styles.actionChipTextActive]}>
                  {x.text}
                </Text>
              </Pressable>
            ))}
          </View>
          <ModuleInput
            value={supportSubject}
            onChangeText={setSupportSubject}
            placeholder="Konu"
            placeholderTextColor={tc("#A8A8A8")}
            style={styles.composeInput}
          />
          <ModuleInput
            value={supportMessage}
            onChangeText={setSupportMessage}
            placeholder="Sorununu veya talebini yaz"
            placeholderTextColor={tc("#A8A8A8")}
            style={[styles.composeInput, { minHeight: 72 }]}
            multiline
          />
          <Pressable style={styles.sendSupportBtn} onPress={() => void sendSupportTicket()}>
            <Text style={styles.sendSupportText}>Müşteri Hizmetlerine Gönder</Text>
          </Pressable>

          {!!supportTickets.length && (
            <View style={{ marginTop: 8 }}>
              {supportTickets.slice(0, 5).map((t) => (
                <View key={t.id} style={styles.convItem}>
                  <View style={styles.convTop}>
                    <Text style={styles.convName}>{t.subject}</Text>
                    <Text style={styles.convMeta}>{t.status === "open" ? "Açık" : "Kapalı"}</Text>
                  </View>
                  <Text style={styles.convPost}>
                    Kategori: {t.category} | Öncelik: {t.priority}
                  </Text>
                  <Text style={styles.convPost}>{new Date(t.createdAt).toLocaleString("tr-TR")}</Text>
                  <Text style={styles.convLast}>{t.message}</Text>
                  {!!t.adminReply && <Text style={styles.adminReply}>Yanıt: {t.adminReply}</Text>}
                </View>
              ))}
            </View>
          )}
        </View>

        {!!notice && <Text style={styles.notice}>{notice}</Text>}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  page: { ...moduleStyles.page, padding: 10 },
  container: { ...moduleStyles.content, position: "relative" },
  header: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: tc("#E4D2C4"),
    backgroundColor: tc("rgba(255,248,242,0.94)"),
    padding: 12,
    marginBottom: 10,
  },
  headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: tc("#EFD1DF"),
    backgroundColor: tc("rgba(255,230,241,0.7)"),
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusChipText: { color: tc("#7A5367"), fontSize: 11, fontWeight: "600" },
  title: { color: moduleTheme.colors.textStrong, fontSize: 18, fontWeight: "600" },
  subtitle: { color: moduleTheme.colors.textMuted, fontSize: 12, marginTop: 4 },
  metricRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  metricCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tc("#E7D2C4"),
    backgroundColor: tc("rgba(255,255,255,0.72)"),
    paddingVertical: 8,
    alignItems: "center",
  },
  metricValue: { color: moduleTheme.colors.textStrong, fontSize: 16, fontWeight: "700" },
  metricLabel: { color: moduleTheme.colors.textMuted, fontSize: 11, marginTop: 2 },
  panel: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: tc("#E4D2C4"),
    backgroundColor: tc("rgba(255,248,242,0.94)"),
    padding: 11,
    marginBottom: 10,
    shadowColor: "#311124",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  sectionHeadRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 },
  sectionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: tc("#EFD1DF"),
    backgroundColor: tc("rgba(255,230,241,0.7)"),
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sectionPillText: { color: tc("#7A5367"), fontSize: 10, fontWeight: "600" },
  sectionHint: { color: tc("#8A6478"), fontSize: 11, fontWeight: "600" },
  sectionTitle: { color: moduleTheme.colors.textStrong, fontSize: 14, fontWeight: "600", marginBottom: 8 },
  convItem: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tc("#E4D2C4"),
    backgroundColor: tc("rgba(255,252,249,0.92)"),
    padding: 10,
    marginBottom: 8,
  },
  convItemActive: { borderColor: BRAND, backgroundColor: tc("rgba(255,0,102,0.14)") },
  convRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  convMain: { flex: 1 },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: tc("#E6D2C6"),
    backgroundColor: tc("#FFF4EC"),
    alignItems: "center",
    justifyContent: "center",
  },
  avatarActive: { borderColor: BRAND, backgroundColor: tc("rgba(255,0,102,0.14)") },
  avatarText: { color: tc("#6E5549"), fontSize: 11, fontWeight: "700" },
  avatarTextActive: { color: tc("#6F3453") },
  convTop: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  convMetaWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
  convName: { color: moduleTheme.colors.textStrong, fontSize: 13, fontWeight: "600" },
  convNameActive: { color: tc("#572E45") },
  convMeta: { color: tc("#8A6478"), fontSize: 11, fontWeight: "600" },
  convMetaActive: { color: tc("#6F3453") },
  convPost: { color: moduleTheme.colors.textMuted, fontSize: 11, marginTop: 2 },
  convPostActive: { color: tc("#6D5561") },
  convLast: { color: tc("#8D7367"), fontSize: 11, marginTop: 4 },
  convLastActive: { color: tc("#6D5561") },
  unreadBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: BRAND,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  unreadBadgeText: { color: tc("#FFF"), fontSize: 10, fontWeight: "700" },
  threadWrap: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tc("#E9DACE"),
    backgroundColor: tc("rgba(255,255,255,0.82)"),
    padding: 10,
  },
  msgBubble: { borderRadius: 12, padding: 9, marginBottom: 8, maxWidth: "92%" },
  msgMine: {
    alignSelf: "flex-end",
    backgroundColor: "rgba(255,0,102,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,0,102,0.42)",
  },
  msgOther: {
    alignSelf: "flex-start",
    backgroundColor: tc("#FFF9F3"),
    borderWidth: 1,
    borderColor: tc("#E4D2C4"),
  },
  msgHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 },
  msgSender: { color: tc("#7A5367"), fontSize: 10, fontWeight: "600" },
  msgImage: {
    width: 160,
    height: 120,
    borderRadius: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: tc("#E4D2C4"),
  },
  msgText: { color: moduleTheme.colors.textStrong, fontSize: 12, marginTop: 2 },
  edited: { color: tc("#8D7367"), fontSize: 10, marginTop: 3, fontStyle: "italic" },
  msgMetaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  msgTime: { color: tc("#8D7367"), fontSize: 10 },
  msgRead: { color: tc("#7A5367"), fontSize: 10, fontWeight: "600" },
  msgActions: { flexDirection: "row", gap: 6, marginTop: 6 },
  msgActionBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: tc("#E0CFC2"),
    backgroundColor: tc("#FFF4EC"),
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  msgActionText: { color: tc("#6E5549"), fontSize: 10, fontWeight: "600" },
  msgActionBtnDanger: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,95,136,0.55)",
    backgroundColor: "rgba(255,0,102,0.16)",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  msgActionTextDanger: { color: tc("#7A2F55"), fontSize: 10, fontWeight: "600" },
  actionRow: { flexDirection: "row", gap: 8, marginBottom: 8, flexWrap: "wrap" },
  actionChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: tc("#E0CFC2"),
    backgroundColor: tc("#FFF4EC"),
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  actionChipText: { color: tc("#6E5549"), fontSize: 11, fontWeight: "600" },
  actionChipActive: { borderColor: BRAND, backgroundColor: tc("rgba(255,0,102,0.14)") },
  actionChipTextActive: { color: tc("#6F3453") },
  actionChipWarn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,95,136,0.55)",
    backgroundColor: "rgba(255,0,102,0.16)",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  actionChipWarnText: { color: tc("#7A2F55"), fontSize: 11, fontWeight: "600" },
  composeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  composeInput: {
    flex: 1,
    backgroundColor: tc("rgba(255,255,255,0.86)"),
    borderWidth: 1,
    borderColor: moduleTheme.colors.border,
    borderRadius: 12,
    color: moduleTheme.colors.textStrong,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  searchInput: { marginBottom: 8 },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: tc("#E0CFC2"),
    backgroundColor: tc("#FFF4EC"),
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 8,
  },
  filterChipActive: {
    borderColor: BRAND,
    backgroundColor: BRAND,
  },
  filterChipText: {
    color: tc("#6E5549"),
    fontSize: 11,
    fontWeight: "600",
  },
  filterChipTextActive: {
    color: tc("#FFF"),
  },
  iconMini: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: tc("#FFF4EC"),
    borderWidth: 1,
    borderColor: moduleTheme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: BRAND, alignItems: "center", justifyContent: "center" },
  sendBtnDisabled: { opacity: 0.34 },
  pendingWrap: { marginTop: 8, flexDirection: "row", alignItems: "center", gap: 8 },
  pendingImage: { width: 72, height: 56, borderRadius: 8, borderWidth: 1, borderColor: tc("#E4D2C4") },
  editWrap: {
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: tc("#E4D2C4"),
    backgroundColor: tc("#FFF9F3"),
    padding: 8,
  },
  editTitle: { color: tc("#7A5367"), fontSize: 11, fontWeight: "600", marginBottom: 6 },
  empty: { color: tc("#7A6D65"), fontSize: 12 },
  blockInfo: { color: tc("#A13D67"), fontSize: 11, marginTop: 6 },
  notice: { color: tc("#7A2F55"), fontSize: 12, fontWeight: "600", marginTop: 4 },
  supportHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 4 },
  supportBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: tc("#EFD1DF"),
    backgroundColor: tc("rgba(255,230,241,0.7)"),
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  supportBadgeText: { color: tc("#7A5367"), fontSize: 11, fontWeight: "600" },
  sendSupportBtn: {
    minHeight: 40,
    borderRadius: 10,
    backgroundColor: BRAND,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  sendSupportText: { color: tc("#FFF"), fontSize: 12, fontWeight: "600" },
  adminReply: { color: tc("#7A2F55"), fontSize: 11, marginTop: 5, fontWeight: "600" },
})
