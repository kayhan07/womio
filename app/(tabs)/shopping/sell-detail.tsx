import { Ionicons } from "@expo/vector-icons"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { useLocalSearchParams } from "expo-router"
import { Image } from "expo-image"
import { useEffect, useMemo, useState } from "react"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { loadSalePosts } from "@/src/modules/shopping/storage"
import { SalePost } from "@/src/modules/shopping/types"
import { moduleStyles, moduleTheme } from "@/src/theme/moduleStyles"
import { tc } from "@/src/theme/tokens"

type PaymentMethod = "transfer" | "cod"
type Order = { id: string; postId: string; status: "pending" | "approved" | "rejected"; createdAt: string }
const payLabel = (v: PaymentMethod) => (v === "cod" ? "Kapida Ödeme" : "EFT / Havale")
const ORDER_KEY = "shoppingCommunityV3:salesOrders"

export default function ShoppingSellDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>()
  const [posts, setPosts] = useState<SalePost[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [photoIdx, setPhotoIdx] = useState(0)

  useEffect(() => {
    const run = async () => {
      const loadedPosts = await loadSalePosts()
      setPosts(loadedPosts)
      try {
        const raw = await AsyncStorage.getItem(ORDER_KEY)
        const parsed = raw ? JSON.parse(raw) : []
        setOrders(Array.isArray(parsed) ? parsed : [])
      } catch {
        setOrders([])
      }
    }
    void run()
  }, [])

  const post = useMemo(() => posts.find((p) => p.id === params.id), [posts, params.id])
  const photos = post?.photos?.length ? post.photos : []
  const activePhoto = photos[photoIdx] || photos[0]
  const methods = (post?.paymentMethods?.length ? post.paymentMethods : ["transfer"]) as PaymentMethod[]
  const responseRate = Math.min(100, 68 + (post?.qa?.filter((q) => q.answer).length || 0) * 8)
  const avgReply = (post?.qa?.length || 0) > 0 ? "2-6 saat" : "Ayni gun"
  const approvedCount = orders.filter((o) => o.status === "approved").length
  const rejectedCount = orders.filter((o) => o.status === "rejected").length
  const totalDecided = approvedCount + rejectedCount
  const completionRate = totalDecided > 0 ? Math.round((approvedCount / totalDecided) * 100) : 100
  const activeListingCount = posts.filter((p) => p.status === "active").length
  const soldListingCount = posts.filter((p) => p.status === "sold").length
  const lastActiveAt = posts.length ? posts.map((p) => new Date(p.createdAt).getTime()).sort((a, b) => b - a)[0] : Date.now()
  const trustScore = Math.max(52, Math.min(99, Math.round(completionRate * 0.45 + responseRate * 0.35 + Math.min(20, soldListingCount * 2) + 18)))
  const isVerifiedSeller = soldListingCount >= 3 || approvedCount >= 3
  const hasFastResponse = responseRate >= 80
  const hasSecurePayment = methods.includes("transfer") || methods.includes("cod")
  const hasStrongCompletion = completionRate >= 75

  if (!post) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyTitle}>İlan bulunamadı</Text>
        <Text style={styles.emptySub}>Bu Ürün silinmis veya link gecersiz olabilir.</Text>
      </View>
    )
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.content}>
        <View style={styles.card}>
          {!!activePhoto ? (
            <Image source={{ uri: activePhoto }} style={styles.heroImage} contentFit="cover" />
          ) : (
            <View style={styles.heroImageEmpty}><Ionicons name="image-outline" size={28} color={tc("#7A5B4E")} /></View>
          )}
          {!!photos.length && (
            <View style={styles.thumbRow}>
              {photos.map((uri, idx) => (
                <Pressable key={`${uri}-${idx}`} style={[styles.thumbWrap, idx === photoIdx && styles.thumbWrapActive]} onPress={() => setPhotoIdx(idx)}>
                  <Image source={{ uri }} style={styles.thumb} contentFit="cover" />
                </Pressable>
              ))}
            </View>
          )}
          <Text style={styles.title}>{post.title}</Text>
          <Text style={styles.sub}>{post.brand} {post.model}</Text>
          <Text style={styles.price}>{post.price}</Text>
          <View style={styles.statusRow}>
            <View style={[styles.pill, post.status === "sold" && styles.pillSold, post.status === "pending" && styles.pillPending]}>
              <Text style={[styles.pillText, post.status === "sold" && styles.pillTextSold]}>{post.status === "active" ? "Aktif" : post.status === "pending" ? "Beklemede" : "Satildi"}</Text>
            </View>
            <Text style={styles.date}>Yayin: {new Date(post.createdAt).toLocaleDateString("tr-TR")}</Text>
          </View>
          <View style={styles.badgeRow}>
            <View style={[styles.trustBadge, isVerifiedSeller && styles.trustBadgeOn]}>
              <Ionicons name={isVerifiedSeller ? "shield-checkmark" : "shield-outline"} size={13} color={isVerifiedSeller ? tc("#2B7A4B") : tc("#7A5B4E")} />
              <Text style={[styles.trustBadgeText, isVerifiedSeller && styles.trustBadgeTextOn]}>{isVerifiedSeller ? "Dogrulanmis Satici" : "Temel Profil"}</Text>
            </View>
            <View style={[styles.trustBadge, hasFastResponse && styles.trustBadgeOn]}>
              <Ionicons name={hasFastResponse ? "flash" : "flash-outline"} size={13} color={hasFastResponse ? tc("#2B7A4B") : tc("#7A5B4E")} />
              <Text style={[styles.trustBadgeText, hasFastResponse && styles.trustBadgeTextOn]}>{hasFastResponse ? "Hizli Yanit" : "Standart Yanit"}</Text>
            </View>
            <View style={[styles.trustBadge, hasSecurePayment && styles.trustBadgeOn]}>
              <Ionicons name={hasSecurePayment ? "card" : "card-outline"} size={13} color={hasSecurePayment ? tc("#2B7A4B") : tc("#7A5B4E")} />
              <Text style={[styles.trustBadgeText, hasSecurePayment && styles.trustBadgeTextOn]}>Guvenli Ödeme</Text>
            </View>
            <View style={[styles.trustBadge, hasStrongCompletion && styles.trustBadgeOn]}>
              <Ionicons name={hasStrongCompletion ? "checkmark-done-circle" : "ellipse-outline"} size={13} color={hasStrongCompletion ? tc("#2B7A4B") : tc("#7A5B4E")} />
              <Text style={[styles.trustBadgeText, hasStrongCompletion && styles.trustBadgeTextOn]}>Tamamlanan Islem</Text>
            </View>
          </View>
          <Text style={styles.desc}>{post.description}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.blockTitle}>Ödeme Yontemleri</Text>
          <View style={styles.tagRow}>
            {methods.map((m) => <View key={m} style={styles.tag}><Text style={styles.tagText}>{payLabel(m)}</Text></View>)}
          </View>
          <Text style={styles.helper}>Satın alma ekranında sadece bu yöntemler seçilebilir.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.blockTitle}>Satici Guven Karti</Text>
          <View style={styles.sellerTop}>
            <View style={styles.avatar}><Text style={styles.avatarText}>WK</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sellerName}>WOMIO Satici</Text>
              <Text style={styles.sellerSub}>Son aktif: {new Date(lastActiveAt).toLocaleDateString("tr-TR")}</Text>
            </View>
            <View style={[styles.verifyPill, isVerifiedSeller && styles.verifyPillOn]}>
              <Ionicons name={isVerifiedSeller ? "shield-checkmark" : "shield-outline"} size={13} color={isVerifiedSeller ? tc("#2B7A4B") : tc("#7A5B4E")} />
              <Text style={[styles.verifyText, isVerifiedSeller && styles.verifyTextOn]}>{isVerifiedSeller ? "Dogrulanmis" : "Temel"}</Text>
            </View>
          </View>

          <View style={styles.scoreWrap}>
            <Text style={styles.scoreLabel}>Guven Skoru</Text>
            <Text style={styles.scoreValue}>{trustScore}/100</Text>
          </View>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${trustScore}%` }]} />
          </View>

          <View style={styles.metricRow}>
            <View style={styles.metric}><Text style={styles.metricValue}>{responseRate}%</Text><Text style={styles.metricLabel}>Yaniti</Text></View>
            <View style={styles.metric}><Text style={styles.metricValue}>{avgReply}</Text><Text style={styles.metricLabel}>Ortalama Donus</Text></View>
            <View style={styles.metric}><Text style={styles.metricValue}>{completionRate}%</Text><Text style={styles.metricLabel}>Tamamlama</Text></View>
          </View>
          <View style={styles.metricRow}>
            <View style={styles.metric}><Text style={styles.metricValue}>{soldListingCount}</Text><Text style={styles.metricLabel}>Satİlan İlan</Text></View>
            <View style={styles.metric}><Text style={styles.metricValue}>{activeListingCount}</Text><Text style={styles.metricLabel}>Aktif İlan</Text></View>
            <View style={styles.metric}><Text style={styles.metricValue}>{(post.qa || []).length}</Text><Text style={styles.metricLabel}>Soru Sayisi</Text></View>
          </View>
          <View style={styles.trustNote}>
            <Ionicons name="shield-checkmark-outline" size={16} color={tc("#7A2D4F")} />
            <Text style={styles.trustText}>Iletisim ve Ödeme sadece uygulama ici akisla ilerler.</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { ...moduleStyles.page, padding: 14 },
  content: { ...moduleStyles.content, gap: 12 },
  card: { borderRadius: 16, borderWidth: 1, borderColor: tc("#E8D9CC"), backgroundColor: tc("#FFFDF9"), padding: 12 },
  heroImage: { width: "100%", height: 210, borderRadius: 12, borderWidth: 1, borderColor: tc("#E9DCD1") },
  heroImageEmpty: { width: "100%", height: 210, borderRadius: 12, borderWidth: 1, borderColor: tc("#E9DCD1"), alignItems: "center", justifyContent: "center", backgroundColor: tc("#FFF") },
  thumbRow: { flexDirection: "row", gap: 8, marginTop: 10, flexWrap: "wrap" },
  thumbWrap: { borderRadius: 10, borderWidth: 1, borderColor: tc("#E9DCD1"), padding: 2, backgroundColor: tc("#FFF") },
  thumbWrapActive: { borderColor: moduleTheme.colors.brand },
  thumb: { width: 56, height: 56, borderRadius: 8 },
  title: { marginTop: 10, fontSize: 20, lineHeight: 26, fontWeight: "600", color: tc("#3F2B23") },
  sub: { marginTop: 2, fontSize: 13, color: tc("#6D5043"), fontWeight: "600" },
  price: { marginTop: 8, fontSize: 24, lineHeight: 30, fontWeight: "600", color: tc("#2F1E16") },
  statusRow: { marginTop: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  pill: { borderRadius: 999, borderWidth: 1, borderColor: "rgba(28,165,100,0.25)", backgroundColor: "rgba(28,165,100,0.10)", paddingHorizontal: 10, paddingVertical: 5 },
  pillPending: { borderColor: "rgba(234,164,40,0.35)", backgroundColor: "rgba(234,164,40,0.10)" },
  pillSold: { borderColor: "rgba(255,0,102,0.26)", backgroundColor: "rgba(255,0,102,0.10)" },
  pillText: { color: tc("#2E6A53"), fontWeight: "600", fontSize: 11 },
  pillTextSold: { color: tc("#7A2F4D") },
  date: { fontSize: 11, color: tc("#8A6B5D"), fontWeight: "600" },
  desc: { marginTop: 10, color: tc("#4A342A"), fontSize: 14, lineHeight: 20, fontWeight: "600" },
  badgeRow: { marginTop: 8, flexDirection: "row", gap: 7, flexWrap: "wrap" },
  trustBadge: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 999, borderWidth: 1, borderColor: tc("#E9DCD1"), backgroundColor: tc("#FFF"), paddingHorizontal: 9, paddingVertical: 5 },
  trustBadgeOn: { borderColor: "rgba(43,122,75,0.28)", backgroundColor: "rgba(43,122,75,0.10)" },
  trustBadgeText: { color: tc("#7A5B4E"), fontWeight: "600", fontSize: 11 },
  trustBadgeTextOn: { color: tc("#2B7A4B") },
  blockTitle: { fontSize: 16, lineHeight: 22, fontWeight: "600", color: tc("#3F2B23"), marginBottom: 8 },
  sellerTop: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  avatar: { width: 44, height: 44, borderRadius: 999, backgroundColor: tc("#FFE9F2"), borderWidth: 1, borderColor: tc("#F5C7DB"), alignItems: "center", justifyContent: "center" },
  avatarText: { color: tc("#7A2D4F"), fontWeight: "600" },
  sellerName: { color: tc("#3F2B23"), fontSize: 15, fontWeight: "600" },
  sellerSub: { color: tc("#7A5B4E"), fontSize: 11, marginTop: 2, fontWeight: "600" },
  verifyPill: { borderRadius: 999, borderWidth: 1, borderColor: tc("#E9DCD1"), backgroundColor: tc("#FFF"), flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 5 },
  verifyPillOn: { borderColor: "rgba(43,122,75,0.28)", backgroundColor: "rgba(43,122,75,0.10)" },
  verifyText: { color: tc("#7A5B4E"), fontSize: 11, fontWeight: "600" },
  verifyTextOn: { color: tc("#2B7A4B") },
  scoreWrap: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  scoreLabel: { color: tc("#5B4338"), fontSize: 12, fontWeight: "600" },
  scoreValue: { color: tc("#3F2B23"), fontSize: 14, fontWeight: "600" },
  progressBg: { marginTop: 6, height: 8, borderRadius: 999, backgroundColor: tc("#F1E7DE"), overflow: "hidden", marginBottom: 10 },
  progressFill: { height: "100%", backgroundColor: moduleTheme.colors.brand },
  tagRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  tag: { borderRadius: 999, backgroundColor: tc("#FFF4F9"), borderWidth: 1, borderColor: tc("#F0CADC"), paddingHorizontal: 10, paddingVertical: 6 },
  tagText: { color: tc("#7A2D4F"), fontWeight: "600", fontSize: 12 },
  helper: { marginTop: 8, color: tc("#6D5043"), fontSize: 12, lineHeight: 17, fontWeight: "600" },
  metricRow: { flexDirection: "row", gap: 8 },
  metric: { flex: 1, borderWidth: 1, borderColor: tc("#E9DCD1"), backgroundColor: tc("#FFF"), borderRadius: 12, padding: 8 },
  metricValue: { color: tc("#3F2B23"), fontSize: 16, fontWeight: "600" },
  metricLabel: { color: tc("#7A5B4E"), fontSize: 11, marginTop: 2, fontWeight: "600" },
  trustNote: { marginTop: 10, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: tc("#FFF4F9"), borderColor: tc("#F0CADC"), borderWidth: 1, borderRadius: 10, padding: 8 },
  trustText: { color: tc("#7A2D4F"), fontSize: 12, fontWeight: "600", flex: 1 },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "transparent" },
  emptyTitle: { color: tc("#3F2B23"), fontSize: 20, fontWeight: "600" },
  emptySub: { marginTop: 6, color: tc("#6D5043"), fontSize: 14, textAlign: "center" },
})









