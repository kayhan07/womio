import AsyncStorage from "@react-native-async-storage/async-storage"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { Image } from "expo-image"
import * as ImagePicker from "expo-image-picker"
import { useEffect, useMemo, useRef, useState } from "react"
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import { t, useAppLanguage } from "@/src/core/i18n"
import {
  CHAT_CURRENT_USER_ID,
  CHAT_CURRENT_USER_NAME,
  openConversationForPost,
  sendMessageToConversation,
} from "@/src/modules/chat/storage"
import { loadSalePosts, loadSalesQuota, saveSalePosts, saveSalesQuota } from "@/src/modules/shopping/storage"
import { SalePost, SalesQuota } from "@/src/modules/shopping/types"
import { moduleStyles, moduleTheme } from "@/src/theme/moduleStyles"
import { tc } from "@/src/theme/tokens"
import { AdSlot } from "@/src/components/monetization/AdSlot"

const BRAND = moduleTheme.colors.brand
const FREE_POST_LIMIT = 5
const FEATURED_DAYS = 7
const FEATURED_PACKAGES = [
  { count: 1, price: 49 },
  { count: 5, price: 199 },
] as const
const CART_KEY = "shoppingCommunityV3:salesCart"
const ORDER_KEY = "shoppingCommunityV3:salesOrders"
const FAV_KEY = "shoppingCommunityV3:salesFavorites"
const TRUST_BANNER =
  "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1600&q=80"

const CATEGORIES = ["Telefon", "Bilgisayar", "Ev Esyasi", "Elektronik", "Moda", "Anne-Bebek", "Spor", "Arac", "Diger"] as const
const CATEGORY_META: Record<(typeof CATEGORIES)[number] | "Tüm", { icon: string; color: string }> = {
  Tüm: { icon: "grid-outline", color: tc("#CFCFCF") },
  Telefon: { icon: "phone-portrait-outline", color: tc("#9C7DFF") },
  Bilgisayar: { icon: "laptop-outline", color: tc("#4CC9F0") },
  "Ev Esyasi": { icon: "home-outline", color: tc("#FFD166") },
  Elektronik: { icon: "flash-outline", color: tc("#06D6A0") },
  Moda: { icon: "shirt-outline", color: tc("#F15BB5") },
  "Anne-Bebek": { icon: "happy-outline", color: tc("#FF9F1C") },
  Spor: { icon: "football-outline", color: tc("#2EC4B6") },
  Arac: { icon: "car-outline", color: tc("#4D96FF") },
  Diger: { icon: "apps-outline", color: tc("#B8B8B8") },
}

type PaymentMethod = "transfer" | "cod"
type Mode = "feed" | "create" | "inbox" | "cart" | "my"
type PriceFilter = "all" | "2500" | "5000" | "10000" | "50000"
type SortMode = "newest" | "priceAsc" | "priceDesc" | "featured"
type CartItem = { id: string; postId: string; title: string; priceRaw: string; price: number; paymentMethods: PaymentMethod[]; selectedPayment: PaymentMethod }
type Order = { id: string; postId: string; buyer: string; phone: string; address: string; payment: PaymentMethod; status: "pending" | "approved" | "rejected"; createdAt: string }

const toPrice = (raw: string) => Number(`${raw}`.replace(/\./g, "").replace(",", ".").replace(/[^0-9.]/g, "")) || 0
const payLabel = (v: PaymentMethod) => (v === "cod" ? "Kapida Ödeme" : "EFT/Havale")
const money = (n: number) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(n)
const isFeatured = (p: SalePost) => Boolean(p.featuredUntil && new Date(p.featuredUntil).getTime() > Date.now())

export default function ShoppingSellScreen() {
  const router = useRouter()
  const { language, ready } = useAppLanguage()
  const [mode, setMode] = useState<Mode>("feed")

  const [posts, setPosts] = useState<SalePost[]>([])
  const [quota, setQuota] = useState<SalesQuota>({ freeUsed: 0, paidCredits: 0, featuredCredits: 0, purchases: [], featuredPurchases: [] })
  const [orders, setOrders] = useState<Order[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [favorites, setFavorites] = useState<string[]>([])
  const [feedback, setFeedback] = useState("")

  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<(typeof CATEGORIES)[number] | "Tüm">("Tüm")
  const [selectedPriceFilter, setSelectedPriceFilter] = useState<PriceFilter>("all")
  const [sortMode, setSortMode] = useState<SortMode>("newest")
  const [cityFilter, setCityFilter] = useState("")
  const [questionInputs, setQuestionInputs] = useState<Record<string, string>>({})
  const [answerInputs, setAnswerInputs] = useState<Record<string, string>>({})

  const [title, setTitle] = useState(""); const [brand, setBrand] = useState(""); const [model, setModel] = useState("")
  const [price, setPrice] = useState(""); const [desc, setDesc] = useState(""); const [photos, setPhotos] = useState<string[]>([])
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("Diger")
  const [city, setCity] = useState("Antalya")
  const [allowTransfer, setAllowTransfer] = useState(true); const [allowCod, setAllowCod] = useState(false)
  const [buyer, setBuyer] = useState(""); const [phone, setPhone] = useState(""); const [address, setAddress] = useState("")
  const searchInputRef = useRef<any>(null)
  const cityFilterInputRef = useRef<any>(null)

  const notify = (m: string) => { setFeedback(m); setTimeout(() => setFeedback(""), 2200) }
  const savePosts = async (n: SalePost[]) => { setPosts(n); await saveSalePosts(n) }
  const saveOrders = async (n: Order[]) => { setOrders(n); await AsyncStorage.setItem(ORDER_KEY, JSON.stringify(n)) }
  const saveCart = async (n: CartItem[]) => { setCart(n); await AsyncStorage.setItem(CART_KEY, JSON.stringify(n)) }
  const saveFav = async (n: string[]) => { setFavorites(n); await AsyncStorage.setItem(FAV_KEY, JSON.stringify(n)) }

  useEffect(() => {
    const load = async () => {
      const [p, q, ro, rc, rf] = await Promise.all([loadSalePosts(), loadSalesQuota(), AsyncStorage.getItem(ORDER_KEY), AsyncStorage.getItem(CART_KEY), AsyncStorage.getItem(FAV_KEY)])
      setPosts(p); setQuota(q)
      try { setOrders(Array.isArray(JSON.parse(ro || "[]")) ? JSON.parse(ro || "[]") : []) } catch { setOrders([]) }
      try { setFavorites(Array.isArray(JSON.parse(rf || "[]")) ? JSON.parse(rf || "[]").map((x: unknown) => `${x}`) : []) } catch { setFavorites([]) }
      try {
        const parsed = Array.isArray(JSON.parse(rc || "[]")) ? JSON.parse(rc || "[]") : []
        const normalized: CartItem[] = parsed.map((c: any, idx: number) => {
          const pm = Array.isArray(c?.paymentMethods) ? c.paymentMethods.filter((x: unknown) => x === "transfer" || x === "cod") : []
          const paymentMethods: PaymentMethod[] = pm.length ? pm : ["transfer"]
          return { id: `${c?.id ?? `c-${Date.now()}-${idx}`}`, postId: `${c?.postId ?? ""}`, title: `${c?.title ?? ""}`, priceRaw: `${c?.priceRaw ?? ""}`, price: Number(c?.price) || 0, paymentMethods, selectedPayment: c?.selectedPayment === "cod" ? "cod" : paymentMethods[0] }
        }).filter((c: CartItem) => c.postId && c.title)
        setCart(normalized)
      } catch { setCart([]) }
    }
    void load()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      searchInputRef.current?.blur?.()
      cityFilterInputRef.current?.blur?.()
    }, 60)
    return () => clearTimeout(timer)
  }, [])

  const feed = useMemo(() => {
    const filtered = posts.filter((p) => {
      const textMatch = `${p.title} ${p.brand} ${p.model} ${p.category ?? ""} ${p.city ?? ""}`.toLowerCase().includes(search.toLowerCase())
      const categoryMatch = selectedCategory === "Tüm" || (p.category ?? "Diger") === selectedCategory
      const cityMatch = !cityFilter.trim() || (p.city ?? "").toLowerCase().includes(cityFilter.trim().toLowerCase())
      const priceMatch = selectedPriceFilter === "all" || toPrice(p.price) <= Number(selectedPriceFilter)
      return textMatch && categoryMatch && cityMatch && priceMatch
    })
    if (sortMode === "priceAsc") return [...filtered].sort((a, b) => toPrice(a.price) - toPrice(b.price))
    if (sortMode === "priceDesc") return [...filtered].sort((a, b) => toPrice(b.price) - toPrice(a.price))
    if (sortMode === "featured") {
      return [...filtered].sort((a, b) => {
        const af = isFeatured(a) ? 1 : 0
        const bf = isFeatured(b) ? 1 : 0
        if (bf !== af) return bf - af
        return ((b.qa?.length || 0) + (favorites.includes(b.id) ? 2 : 0)) - ((a.qa?.length || 0) + (favorites.includes(a.id) ? 2 : 0))
      })
    }
    return [...filtered].sort((a, b) => {
      const af = isFeatured(a) ? 1 : 0
      const bf = isFeatured(b) ? 1 : 0
      if (bf !== af) return bf - af
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }, [posts, search, selectedCategory, cityFilter, selectedPriceFilter, sortMode, favorites])

  const pendingOrders = orders.filter((o) => o.status === "pending")
  const freeLeft = Math.max(0, FREE_POST_LIMIT - quota.freeUsed)
  const totalCart = cart.reduce((s, i) => s + i.price, 0)
  const unreadSeller = posts.reduce((s, p) => s + (p.qa || []).filter((q) => q.unreadForSeller).length, 0)
  const unreadBuyer = posts.reduce((s, p) => s + (p.qa || []).filter((q) => q.answer && q.unreadForBuyer).length, 0)
  const activeCount = posts.filter((p) => p.status === "active").length
  const soldCount = posts.filter((p) => p.status === "sold").length
  const totalQuestions = posts.reduce((s, p) => s + (p.qa || []).length, 0)
  const answeredQuestions = posts.reduce((s, p) => s + (p.qa || []).filter((q) => !!q.answer).length, 0)
  const answerRate = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 100
  const featuredActiveCount = posts.filter((p) => isFeatured(p)).length

  const consumeQuota = async () => {
    const free = quota.freeUsed < FREE_POST_LIMIT
    const paid = quota.paidCredits > 0
    if (!free && !paid) return false
    const next = free ? { ...quota, freeUsed: quota.freeUsed + 1 } : { ...quota, paidCredits: quota.paidCredits - 1 }
    setQuota(next); await saveSalesQuota(next); return true
  }

  const buyFeaturedPackage = async (count: number, price: number) => {
    const next: SalesQuota = {
      ...quota,
      featuredCredits: quota.featuredCredits + count,
      featuredPurchases: [{ id: `fp-${Date.now()}`, count, price, createdAt: new Date().toISOString() }, ...(quota.featuredPurchases || [])],
    }
    setQuota(next)
    await saveSalesQuota(next)
    notify(`Öne Çıkar paketi alindi: +${count} kredi`)
  }

  const featurePost = async (postId: string) => {
    if (quota.featuredCredits <= 0) return notify("Öne Çıkarma kredin yok. Paket satin al.")
    const target = posts.find((p) => p.id === postId)
    if (!target) return
    if (target.status !== "active") return notify("Sadece aktif ilan Öne Çıkarilabilir.")
    const until = new Date(Date.now() + FEATURED_DAYS * 24 * 60 * 60 * 1000).toISOString()
    const nextPosts = posts.map((p) => (p.id === postId ? { ...p, featuredUntil: until } : p))
    const nextQuota: SalesQuota = { ...quota, featuredCredits: Math.max(0, quota.featuredCredits - 1) }
    await savePosts(nextPosts)
    setQuota(nextQuota)
    await saveSalesQuota(nextQuota)
    notify(`İlan ${FEATURED_DAYS} gün öne çıkarıldı.`)
  }

  const pickPhoto = async (camera: boolean) => {
    if (photos.length >= 3) return
    const perm = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) { Alert.alert(t("shoppingPhotoPermissionTitle", language), t("shoppingPhotoPermissionDesc", language)); return }
    const res = camera ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8 }) : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: true, selectionLimit: 3 - photos.length, quality: 0.8 })
    if (!res.canceled) setPhotos((x) => [...x, ...res.assets.map((a) => a.uri)].slice(0, 3))
  }

  const createPost = async () => {
    if (!title.trim() || !price.trim() || !desc.trim()) return notify(t("shoppingSalesErrorRequired", language))
    if (!photos.length) return notify(t("shoppingSalesPhotoMinError", language))
    if (!allowTransfer && !allowCod) return notify("En az bir ödeme yöntemi seç.")
    if (!(await consumeQuota())) return notify("Limit dolu. Paket satın alman gerekiyor.")
    const methods: PaymentMethod[] = []; if (allowTransfer) methods.push("transfer"); if (allowCod) methods.push("cod")
    const p: SalePost = { id: `${Date.now()}`, ownerId: CHAT_CURRENT_USER_ID, ownerName: CHAT_CURRENT_USER_NAME, category, city: city.trim() || "Antalya", title: title.trim(), brand: brand.trim(), model: model.trim(), price: price.trim(), description: desc.trim(), photos, paymentMethods: methods, qa: [], status: "active", createdAt: new Date().toISOString() }
    await savePosts([p, ...posts]); setTitle(""); setBrand(""); setModel(""); setPrice(""); setDesc(""); setPhotos([]); setCategory("Diger"); setCity("Antalya"); setAllowTransfer(true); setAllowCod(false); setMode("my")
  }

  const addToCart = async (p: SalePost) => {
    if (p.status !== "active") return notify("Ürün aktif değil.")
    if (cart.some((c) => c.postId === p.id)) return notify("Ürün zaten sepette.")
    const paymentMethods = (p.paymentMethods?.length ? p.paymentMethods : ["transfer"]) as PaymentMethod[]
    await saveCart([{ id: `c-${Date.now()}`, postId: p.id, title: p.title, priceRaw: p.price, price: toPrice(p.price), paymentMethods, selectedPayment: paymentMethods[0] }, ...cart])
    setMode("cart")
  }

  const setCartPayment = async (id: string, method: PaymentMethod) => await saveCart(cart.map((c) => c.id === id ? { ...c, selectedPayment: method } : c))
  const toggleFav = async (id: string) => await saveFav(favorites.includes(id) ? favorites.filter((x) => x !== id) : [id, ...favorites])
  const ask = async (postId: string) => {
    const q = (questionInputs[postId] || "").trim()
    if (!q) return
    const post = posts.find((p) => p.id === postId)
    if (!post) return
    const otherUserId = post.ownerId || `seller:${post.id}`
    const otherUserName = post.ownerName || "Satici"
    const conv = await openConversationForPost({
      source: "shopping",
      postId: post.id,
      postTitle: post.title,
      currentUserId: CHAT_CURRENT_USER_ID,
      currentUserName: CHAT_CURRENT_USER_NAME,
      otherUserId,
      otherUserName,
    })
    await sendMessageToConversation({
      conversationId: conv.id,
      senderId: CHAT_CURRENT_USER_ID,
      senderName: CHAT_CURRENT_USER_NAME,
      text: q,
    })
    setQuestionInputs((prev) => ({ ...prev, [postId]: "" }))
    router.push({ pathname: "/(tabs)/messages", params: { conversationId: conv.id } })
  }
  const answer = async (postId: string, qaId: string) => { const key = `${postId}:${qaId}`; const a = (answerInputs[key] || "").trim(); if (!a) return; await savePosts(posts.map((p) => p.id !== postId ? p : { ...p, qa: (p.qa || []).map((q) => q.id === qaId ? { ...q, answer: a, answeredAt: new Date().toISOString(), unreadForSeller: false, unreadForBuyer: true } : q) })); setAnswerInputs((prev) => ({ ...prev, [key]: "" })) }

  const checkout = async () => {
    if (!cart.length) return notify("Sepet bos.")
    if (!buyer.trim() || !phone.trim() || !address.trim()) return notify("Alici, telefon ve adres zorunlu.")
    const now = new Date().toISOString()
    const nextOrders = [...cart.map((c, idx) => ({ id: `o-${Date.now()}-${idx}`, postId: c.postId, buyer: buyer.trim(), phone: phone.trim(), address: address.trim(), payment: c.selectedPayment, status: "pending" as const, createdAt: now })), ...orders]
    await saveOrders(nextOrders)
    const ids = new Set(cart.map((c) => c.postId))
    await savePosts(posts.map((p) => ids.has(p.id) ? { ...p, status: "pending" } : p))
    await saveCart([]); setMode("inbox")
  }

  const approve = async (id: string) => { const tOrder = orders.find((o) => o.id === id); if (!tOrder) return; await saveOrders(orders.map((o) => o.id === id ? { ...o, status: "approved" } : o.postId === tOrder.postId && o.status === "pending" ? { ...o, status: "rejected" } : o)); await savePosts(posts.map((p) => p.id === tOrder.postId ? { ...p, status: "sold" } : p)) }
  const reject = async (id: string) => { const tOrder = orders.find((o) => o.id === id); if (!tOrder) return; await saveOrders(orders.map((o) => o.id === id ? { ...o, status: "rejected" } : o)); await savePosts(posts.map((p) => p.id === tOrder.postId ? { ...p, status: "active" } : p)) }
  const removePost = async (postId: string) => {
    Alert.alert("İlanı Kaldır", "Bu ilan tamamen kaldırılacak. Devam edilsin mi?", [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Kaldır",
        style: "destructive",
        onPress: () => {
          const nextPosts = posts.filter((p) => p.id !== postId)
          const nextOrders = orders.filter((o) => o.postId !== postId)
          const nextCart = cart.filter((c) => c.postId !== postId)
          const nextFav = favorites.filter((f) => f !== postId)
          void Promise.all([savePosts(nextPosts), saveOrders(nextOrders), saveCart(nextCart), saveFav(nextFav)])
          notify("İlan kaldırıldı.")
        },
      },
    ])
  }

  if (!ready) return <View style={styles.page} />

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.container}>
        <View style={styles.topBar}>
          <View style={styles.topSpacer} />
          <View style={styles.location}><Ionicons name="location" size={13} color={tc("#FF5B8A")} /><Text style={styles.locationText}>Antalya</Text></View>
          <Pressable style={styles.iconBtn}><Ionicons name="cart-outline" size={16} color={tc("#FFF")} /></Pressable>
          <Pressable style={styles.iconBtn}><Ionicons name="notifications-outline" size={16} color={tc("#FFF")} /></Pressable>
        </View>

        <View style={styles.sellerCard}>
          <View style={styles.sellerHead}>
            <View style={styles.sellerAvatar}>
              <Ionicons name="shield-checkmark" size={18} color={moduleTheme.colors.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sellerName}>WOMIO Satici Profili</Text>
              <Text style={styles.sellerMeta}>Guvenli alisveris rozetli hesap</Text>
            </View>
            <View style={styles.sellerBadge}>
              <Ionicons name="checkmark-circle" size={12} color={moduleTheme.colors.brand} />
              <Text style={styles.sellerBadgeText}>Dogrulandi</Text>
            </View>
          </View>
          <View style={styles.sellerStats}>
            <View style={styles.sellerStatBox}>
              <Text style={styles.sellerStatValue}>{activeCount}</Text>
              <Text style={styles.sellerStatLabel}>Aktif İlan</Text>
            </View>
            <View style={styles.sellerStatBox}>
              <Text style={styles.sellerStatValue}>{soldCount}</Text>
              <Text style={styles.sellerStatLabel}>Satİlan</Text>
            </View>
            <View style={styles.sellerStatBox}>
              <Text style={styles.sellerStatValue}>%{answerRate}</Text>
              <Text style={styles.sellerStatLabel}>Yanıt Oranı</Text>
            </View>
          </View>
        </View>

        <View style={styles.search}><Ionicons name="search-outline" size={16} color={tc("#A8A8A8")} /><TextInput ref={searchInputRef} value={search} onChangeText={setSearch} placeholder="Ürün, marka, kategori, satıcı ara" placeholderTextColor={tc("#9A9A9A")} style={styles.searchInput} /></View>
        <View style={styles.filterWrap}>
          <TextInput
            ref={cityFilterInputRef}
            value={cityFilter}
            onChangeText={setCityFilter}
            placeholder="Şehir filtrele"
            placeholderTextColor={tc("#9A9A9A")}
            style={styles.filterCityInput}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipRow}>
            {[
              { id: "all", label: "Tüm Fiyatlar" },
              { id: "2500", label: "<= 2.500" },
              { id: "5000", label: "<= 5.000" },
              { id: "10000", label: "<= 10.000" },
              { id: "50000", label: "<= 50.000" },
            ].map((f) => (
              <Pressable
                key={f.id}
                style={[styles.filterChip, selectedPriceFilter === (f.id as PriceFilter) && styles.filterChipActive]}
                onPress={() => setSelectedPriceFilter(f.id as PriceFilter)}
              >
                <Text style={[styles.filterChipText, selectedPriceFilter === (f.id as PriceFilter) && styles.filterChipTextActive]}>{f.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipRow}>
            {[
              { id: "newest", label: "En Yeni" },
              { id: "priceAsc", label: "En Ucuz" },
              { id: "priceDesc", label: "En Pahalı" },
              { id: "featured", label: "Öne Çıkan" },
            ].map((s) => (
              <Pressable
                key={s.id}
                style={[styles.sortChip, sortMode === (s.id as SortMode) && styles.sortChipActive]}
                onPress={() => setSortMode(s.id as SortMode)}
              >
                <Text style={[styles.sortChipText, sortMode === (s.id as SortMode) && styles.sortChipTextActive]}>{s.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
          {(["Tüm", ...CATEGORIES] as const).map((cat) => (
            <Pressable key={cat} style={styles.categoryItem} onPress={() => setSelectedCategory(cat)}>
              <View style={[styles.categoryIcon, selectedCategory === cat && styles.categoryIconActive]}>
                <Ionicons name={CATEGORY_META[cat].icon as any} size={16} color={CATEGORY_META[cat].color} />
              </View>
              <Text style={[styles.categoryLabel, selectedCategory === cat && styles.categoryLabelActive]}>{cat === "Tüm" ? "Tüm" : cat}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.brandHero}>
          <Image source={{ uri: TRUST_BANNER }} style={styles.brandHeroBg} contentFit="cover" />
          <View style={styles.brandHeroOverlay} />
          <View style={styles.brandHeroContent}>
            <Text style={styles.brandHeroTitle}>Güvenli Alışveriş Pazarı</Text>
            <Text style={styles.brandHeroSubtitle}>Gerçek kullanıcılardan ilanlar, mesajlaşma ve sepet akışı</Text>
          </View>
        </View>
        <AdSlot
          placementKey="shoppingSell"
          title="Satış Reklam Alanı"
          subtitle="Google reklamları ve öne çıkan kampanyalar bu blokta yayınlanır"
        />
        <Text style={styles.meta}>Ücretsiz: {freeLeft} | Kredi: {quota.paidCredits} | Öne Çıkar Kredi: {quota.featuredCredits} | Aktif Öne Çıkan: {featuredActiveCount}</Text>

        <View style={styles.modeRow}>
          {([
            { id: "feed", text: "Keşfet", badge: unreadBuyer + unreadSeller },
            { id: "create", text: "Sat", badge: 0 },
            { id: "inbox", text: "Sohbet", badge: pendingOrders.length + unreadSeller },
            { id: "cart", text: "Sepet", badge: cart.length },
            { id: "my", text: "İlanlarım", badge: unreadSeller },
          ] as const).map((m) => (
            <Pressable key={m.id} style={[styles.modeChip, mode === m.id && styles.modeChipActive]} onPress={() => setMode(m.id)}>
              <Text style={[styles.modeText, mode === m.id && styles.modeTextActive]}>{m.text}</Text>
              {m.badge > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{m.badge}</Text></View>}
            </Pressable>
          ))}
        </View>

        {mode === "feed" && (
          <View style={styles.feedGrid}>
            {feed.map((p) => (
              <View key={p.id} style={styles.card}>
                {isFeatured(p) && (
                  <View style={styles.featuredBadge}>
                    <Ionicons name="flash" size={11} color={moduleTheme.colors.textInverted} />
                    <Text style={styles.featuredBadgeText}>Öne Çıkan</Text>
                  </View>
                )}
                <Pressable style={styles.favBtn} onPress={() => void toggleFav(p.id)}>
                  <Ionicons name={favorites.includes(p.id) ? "heart" : "heart-outline"} size={15} color={favorites.includes(p.id) ? BRAND : tc("#D0D0D0")} />
                </Pressable>
                {p.photos?.[0] ? <Image source={{ uri: p.photos[0] }} style={styles.cardImage} contentFit="cover" /> : <View style={styles.cardImageEmpty}><Text style={styles.cardImageEmptyText}>No Image</Text></View>}
                <View style={styles.cardBody}>
                  <Text style={styles.cardPrice}>{p.price}</Text>
                  <Text style={styles.cardTitle}>{p.title}</Text>
                  <Text style={styles.cardMeta}>{p.category ?? "Diğer"} | {p.brand} | {p.city ?? "Antalya"}</Text>
                  <TextInput value={questionInputs[p.id] || ""} onChangeText={(v) => setQuestionInputs((x) => ({ ...x, [p.id]: v }))} placeholder="Mesaj yaz" placeholderTextColor={tc("#8A8A8A")} style={styles.cardInput} />
                  <View style={styles.cardActionRow}>
                    <Pressable style={styles.cardAction} onPress={() => void ask(p.id)}><Text style={styles.cardActionText}>Mesaj</Text></Pressable>
                    <Pressable style={styles.cardAction} onPress={() => router.push({ pathname: "/(tabs)/shopping/sell-detail", params: { id: p.id } })}><Text style={styles.cardActionText}>Detay</Text></Pressable>
                    <Pressable style={styles.cardActionPrimary} onPress={() => void addToCart(p)}><Text style={styles.cardActionPrimaryText}>Sepete Ekle</Text></Pressable>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {mode === "create" && (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>İlan Ver</Text>
            <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder={t("shoppingSalesTitlePlaceholder", language)} placeholderTextColor={tc("#A1A1A1")} />
            <TextInput style={styles.input} value={brand} onChangeText={setBrand} placeholder={t("shoppingBrandPlaceholder", language)} placeholderTextColor={tc("#A1A1A1")} />
            <TextInput style={styles.input} value={model} onChangeText={setModel} placeholder={t("shoppingModelPlaceholder", language)} placeholderTextColor={tc("#A1A1A1")} />
            <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="Şehir (Örn: Antalya)" placeholderTextColor={tc("#A1A1A1")} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryCreateRow}>
              {CATEGORIES.map((cat) => (
                <Pressable key={cat} style={[styles.modeChip, category === cat && styles.modeChipActive]} onPress={() => setCategory(cat)}>
                  <Text style={[styles.modeText, category === cat && styles.modeTextActive]}>{cat}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <TextInput style={styles.input} value={price} onChangeText={setPrice} placeholder={t("shoppingSalesPricePlaceholder", language)} placeholderTextColor={tc("#A1A1A1")} keyboardType="number-pad" />
            <View style={styles.row}>
              <Pressable style={[styles.modeChip, allowTransfer && styles.modeChipActive]} onPress={() => setAllowTransfer((v) => !v)}><Text style={[styles.modeText, allowTransfer && styles.modeTextActive]}>EFT/Havale</Text></Pressable>
              <Pressable style={[styles.modeChip, allowCod && styles.modeChipActive]} onPress={() => setAllowCod((v) => !v)}><Text style={[styles.modeText, allowCod && styles.modeTextActive]}>Kapıda</Text></Pressable>
            </View>
            <View style={styles.row}>
              <Pressable style={styles.modeChip} onPress={() => void pickPhoto(true)}><Text style={styles.modeText}>Kamera</Text></Pressable>
              <Pressable style={styles.modeChip} onPress={() => void pickPhoto(false)}><Text style={styles.modeText}>Galeri</Text></Pressable>
            </View>
            <View style={styles.row}>{photos.map((u, i) => <Image key={`${u}-${i}`} source={{ uri: u }} style={styles.thumb} contentFit="cover" />)}</View>
            <TextInput style={[styles.input, { minHeight: 70 }]} multiline value={desc} onChangeText={setDesc} placeholder={t("shoppingSalesDescPlaceholder", language)} placeholderTextColor={tc("#A1A1A1")} />
            <Pressable style={styles.primary} onPress={() => void createPost()}><Text style={styles.primaryText}>{t("shoppingSalesSave", language)}</Text></Pressable>
          </View>
        )}

        {mode === "inbox" && (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Sohbet ve Talepler</Text>
            {posts.flatMap((p) => (p.qa || []).filter((q) => !q.answer).map((q) => ({ p, q }))).map(({ p, q }) => (
              <View key={q.id} style={styles.msgCard}>
                <Text style={styles.msgTitle}>{p.title}</Text>
                <Text style={styles.msgText}>S: {q.question}</Text>
                <TextInput style={styles.input} value={answerInputs[`${p.id}:${q.id}`] || ""} onChangeText={(v) => setAnswerInputs((x) => ({ ...x, [`${p.id}:${q.id}`]: v }))} placeholder="Cevap yaz" placeholderTextColor={tc("#A1A1A1")} />
                <Pressable style={styles.modeChip} onPress={() => void answer(p.id, q.id)}><Text style={styles.modeText}>Cevapla</Text></Pressable>
              </View>
            ))}
            {pendingOrders.map((o) => (
              <View key={o.id} style={styles.msgCard}>
                <Text style={styles.msgTitle}>{o.buyer} - {o.phone}</Text>
                <Text style={styles.msgText}>{o.address}</Text>
                <Text style={styles.msgText}>Ödeme: {payLabel(o.payment)}</Text>
                <View style={styles.row}>
                  <Pressable style={styles.modeChip} onPress={() => void approve(o.id)}><Text style={styles.modeText}>Onayla</Text></Pressable>
                  <Pressable style={styles.modeChip} onPress={() => void reject(o.id)}><Text style={styles.modeText}>Reddet</Text></Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        {mode === "cart" && (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Sepet</Text>
            {cart.map((c) => (
              <View key={c.id} style={styles.msgCard}>
                <Text style={styles.msgTitle}>{c.title}</Text>
                <Text style={styles.msgText}>{c.priceRaw}</Text>
                <View style={styles.row}>
                  {c.paymentMethods.map((pm) => (
                    <Pressable key={pm} style={[styles.modeChip, c.selectedPayment === pm && styles.modeChipActive]} onPress={() => void setCartPayment(c.id, pm)}>
                      <Text style={[styles.modeText, c.selectedPayment === pm && styles.modeTextActive]}>{payLabel(pm)}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}
            <Text style={styles.meta}>Toplam: {money(totalCart)}</Text>
            <TextInput style={styles.input} value={buyer} onChangeText={setBuyer} placeholder="Alıcı adı" placeholderTextColor={tc("#A1A1A1")} />
            <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Telefon" placeholderTextColor={tc("#A1A1A1")} />
            <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="Adres" placeholderTextColor={tc("#A1A1A1")} multiline />
            <Pressable style={styles.primary} onPress={() => void checkout()}><Text style={styles.primaryText}>Talep Gönder</Text></Pressable>
          </View>
        )}

        {mode === "my" && (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>İlanlarım</Text>
            <View style={styles.featuredPackBox}>
              <Text style={styles.featuredPackTitle}>Öne Çıkar Paketleri (Ücretli)</Text>
              <Text style={styles.featuredPackSub}>Bir ilan 7 gün öne çıkar. Kalan kredi: {quota.featuredCredits}</Text>
              <View style={styles.row}>
                {FEATURED_PACKAGES.map((pack) => (
                  <Pressable key={`${pack.count}-${pack.price}`} style={styles.modeChip} onPress={() => void buyFeaturedPackage(pack.count, pack.price)}>
                    <Text style={styles.modeText}>{pack.count} İlan / {pack.price} TL</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            {feed.map((p) => (
              <View key={p.id} style={styles.msgCard}>
                <Text style={styles.msgTitle}>{p.title}</Text>
                <Text style={styles.msgText}>{p.category ?? "Diğer"} | {p.city ?? "Antalya"} | {p.price}</Text>
                {!!p.featuredUntil && <Text style={styles.msgText}>Öne Çıkar Bitiş: {new Date(p.featuredUntil).toLocaleDateString("tr-TR")}</Text>}
                <View style={styles.row}>
                  <Pressable style={styles.modeChip} onPress={() => router.push({ pathname: "/(tabs)/shopping/sell-detail", params: { id: p.id } })}><Text style={styles.modeText}>Detay</Text></Pressable>
                  <Pressable style={styles.modeChip} onPress={() => void savePosts(posts.map((x) => x.id === p.id ? { ...x, status: "sold" } : x))}><Text style={styles.modeText}>Satıldı</Text></Pressable>
                  <Pressable style={styles.modeChipFeatured} onPress={() => void featurePost(p.id)}><Text style={styles.modeChipFeaturedText}>Öne Çıkar</Text></Pressable>
                  <Pressable style={styles.modeChipDanger} onPress={() => void removePost(p.id)}><Text style={styles.modeChipDangerText}>Kaldır</Text></Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        {!!feedback && <Text style={styles.meta}>{feedback}</Text>}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  page: { ...moduleStyles.page, padding: 10 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  container: { ...moduleStyles.content },
  topBar: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  topSpacer: { flex: 1 },
  sellerCard: { marginBottom: 10, borderRadius: 14, borderWidth: 1, borderColor: tc("#E4D2C4"), backgroundColor: moduleTheme.colors.surface, padding: 10 },
  sellerHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  sellerAvatar: { width: 36, height: 36, borderRadius: 999, backgroundColor: "rgba(255,0,102,0.14)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,0,102,0.35)" },
  sellerName: { color: moduleTheme.colors.textStrong, fontSize: 13, fontWeight: "600" },
  sellerMeta: { color: moduleTheme.colors.textMuted, fontSize: 11, marginTop: 1 },
  sellerBadge: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 999, backgroundColor: tc("#FFF5F9"), borderWidth: 1, borderColor: tc("#F0CADC"), paddingHorizontal: 8, paddingVertical: 4 },
  sellerBadgeText: { color: tc("#7A2D4F"), fontSize: 10, fontWeight: "600" },
  sellerStats: { flexDirection: "row", gap: 8, marginTop: 10 },
  sellerStatBox: { flex: 1, borderRadius: 10, backgroundColor: tc("#FFF9F3"), borderWidth: 1, borderColor: moduleTheme.colors.border, paddingVertical: 8, alignItems: "center" },
  sellerStatValue: { color: moduleTheme.colors.textStrong, fontSize: 14, fontWeight: "600" },
  sellerStatLabel: { color: moduleTheme.colors.textMuted, fontSize: 10, fontWeight: "600", marginTop: 2 },
  location: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: tc("#FFF5F9"), borderRadius: 999, borderWidth: 1, borderColor: tc("#F0CADC"), paddingHorizontal: 10, paddingVertical: 7 },
  locationText: { color: tc("#7A2D4F"), fontSize: 12, fontWeight: "600" },
  iconBtn: { width: 34, height: 34, borderRadius: 999, backgroundColor: moduleTheme.colors.surface, borderWidth: 1, borderColor: moduleTheme.colors.border, alignItems: "center", justifyContent: "center" },
  search: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, backgroundColor: moduleTheme.colors.surface, borderWidth: 1, borderColor: moduleTheme.colors.border, paddingHorizontal: 10, paddingVertical: 9, marginBottom: 10 },
  searchInput: { flex: 1, color: moduleTheme.colors.textStrong, fontSize: 14, paddingVertical: 0 },
  filterWrap: { marginBottom: 10 },
  filterCityInput: { backgroundColor: moduleTheme.colors.surface, borderWidth: 1, borderColor: moduleTheme.colors.border, borderRadius: 10, color: moduleTheme.colors.textStrong, paddingHorizontal: 10, paddingVertical: 9, fontSize: 13 },
  filterChipRow: { gap: 8, paddingTop: 8, paddingBottom: 2 },
  filterChip: { borderRadius: 999, borderWidth: 1, borderColor: tc("#E0CFC2"), backgroundColor: tc("#FFF9F3"), paddingHorizontal: 10, paddingVertical: 6 },
  filterChipActive: { borderColor: BRAND, backgroundColor: tc("#3A2A33") },
  filterChipText: { color: tc("#6E5549"), fontSize: 11, fontWeight: "600" },
  filterChipTextActive: { color: moduleTheme.colors.textInverted },
  sortChip: { borderRadius: 999, borderWidth: 1, borderColor: tc("#E0CFC2"), backgroundColor: tc("#FFF9F3"), paddingHorizontal: 10, paddingVertical: 6 },
  sortChipActive: { borderColor: tc("#FF4B93"), backgroundColor: "rgba(255,0,102,0.18)" },
  sortChipText: { color: tc("#6E5549"), fontSize: 11, fontWeight: "600" },
  sortChipTextActive: { color: moduleTheme.colors.textInverted },
  categoryRow: { gap: 10, paddingBottom: 8 },
  categoryItem: { width: 66, alignItems: "center" },
  categoryIcon: { width: 38, height: 38, borderRadius: 999, backgroundColor: tc("#FFF9F3"), borderWidth: 1, borderColor: tc("#E0CFC2"), alignItems: "center", justifyContent: "center" },
  categoryIconActive: { borderColor: BRAND, backgroundColor: tc("#3A2A33") },
  categoryLabel: { marginTop: 4, color: moduleTheme.colors.textMuted, fontSize: 11, fontWeight: "600", textAlign: "center" },
  categoryLabelActive: { color: moduleTheme.colors.textStrong },
  brandHero: {
    width: "100%",
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: moduleTheme.colors.border,
    backgroundColor: moduleTheme.colors.surface,
    overflow: "hidden",
    minHeight: 118,
    position: "relative",
  },
  brandHeroBg: { ...StyleSheet.absoluteFillObject },
  brandHeroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,248,241,0.78)" },
  brandHeroContent: { paddingHorizontal: 12, paddingVertical: 12 },
  brandHeroTitle: { color: moduleTheme.colors.textStrong, fontSize: 15, fontWeight: "600" },
  brandHeroSubtitle: { color: tc("#6E5549"), fontSize: 12, marginTop: 2 },
  meta: { color: moduleTheme.colors.textMuted, fontSize: 12, marginBottom: 8 },
  modeRow: { flexDirection: "row", gap: 7, flexWrap: "wrap", marginBottom: 10 },
  modeChip: { borderRadius: 999, borderWidth: 1, borderColor: tc("#E0CFC2"), backgroundColor: tc("#FFF9F3"), paddingHorizontal: 10, paddingVertical: 7, flexDirection: "row", alignItems: "center", gap: 5 },
  modeChipActive: { borderColor: BRAND, backgroundColor: tc("#3A2A33") },
  modeChipFeatured: { borderRadius: 999, borderWidth: 1, borderColor: "rgba(255,176,32,0.7)", backgroundColor: "rgba(255,176,32,0.16)", paddingHorizontal: 10, paddingVertical: 7, flexDirection: "row", alignItems: "center", gap: 5 },
  modeChipDanger: { borderRadius: 999, borderWidth: 1, borderColor: "rgba(255,95,136,0.55)", backgroundColor: "rgba(255,0,102,0.18)", paddingHorizontal: 10, paddingVertical: 7, flexDirection: "row", alignItems: "center", gap: 5 },
  modeText: { color: tc("#6E5549"), fontSize: 12, fontWeight: "600" },
  modeTextActive: { color: tc("#FFF") },
  modeChipFeaturedText: { color: tc("#FFECC2"), fontSize: 12, fontWeight: "600" },
  modeChipDangerText: { color: tc("#FFD5E6"), fontSize: 12, fontWeight: "600" },
  badge: { minWidth: 17, height: 17, borderRadius: 999, backgroundColor: BRAND, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  badgeText: { color: tc("#FFF"), fontSize: 10, fontWeight: "600" },
  feedGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 10 },
  card: { width: "48.7%", backgroundColor: moduleTheme.colors.surface, borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: tc("#E4D2C4") },
  featuredBadge: { position: "absolute", top: 7, left: 7, zIndex: 2, borderRadius: 999, backgroundColor: "rgba(255,176,32,0.88)", paddingHorizontal: 7, paddingVertical: 4, flexDirection: "row", alignItems: "center", gap: 4 },
  featuredBadgeText: { color: moduleTheme.colors.textInverted, fontSize: 10, fontWeight: "600" },
  favBtn: { position: "absolute", top: 7, right: 7, zIndex: 2, width: 28, height: 28, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.9)", borderWidth: 1, borderColor: tc("#E7D4C4"), alignItems: "center", justifyContent: "center" },
  cardImage: { width: "100%", height: 120 },
  cardImageEmpty: { width: "100%", height: 120, backgroundColor: tc("#FFF4EC"), alignItems: "center", justifyContent: "center" },
  cardImageEmptyText: { color: tc("#8A6B5D"), fontSize: 10, fontWeight: "600" },
  cardBody: { padding: 8 },
  cardPrice: { color: moduleTheme.colors.textStrong, fontSize: 14, fontWeight: "600" },
  cardTitle: { color: tc("#3F2B23"), fontSize: 12, fontWeight: "600", marginTop: 2 },
  cardMeta: { color: moduleTheme.colors.textMuted, fontSize: 11, marginTop: 2 },
  cardInput: { marginTop: 6, backgroundColor: tc("#FFF9F3"), borderWidth: 1, borderColor: moduleTheme.colors.border, borderRadius: 8, color: moduleTheme.colors.textStrong, paddingHorizontal: 8, paddingVertical: 7, fontSize: 12 },
  cardActionRow: { marginTop: 6, flexDirection: "row", gap: 6, flexWrap: "wrap" },
  cardAction: { borderRadius: 999, borderWidth: 1, borderColor: tc("#E0CFC2"), backgroundColor: tc("#FFF4EC"), paddingHorizontal: 8, paddingVertical: 6 },
  cardActionText: { color: tc("#6E5549"), fontSize: 11, fontWeight: "600" },
  cardActionPrimary: { borderRadius: 999, borderWidth: 1, borderColor: tc("#FF4B93"), backgroundColor: "rgba(255,0,102,0.2)", paddingHorizontal: 8, paddingVertical: 6 },
  cardActionPrimaryText: { color: tc("#FFF"), fontSize: 11, fontWeight: "600" },
  panel: { backgroundColor: moduleTheme.colors.surface, borderRadius: 12, borderWidth: 1, borderColor: tc("#E4D2C4"), padding: 10 },
  panelTitle: { color: moduleTheme.colors.textStrong, fontSize: 16, fontWeight: "600", marginBottom: 8 },
  featuredPackBox: { marginBottom: 8, borderRadius: 10, borderWidth: 1, borderColor: tc("#E0CFC2"), backgroundColor: tc("#FFF4EC"), padding: 9 },
  featuredPackTitle: { color: tc("#F6E2AE"), fontSize: 13, fontWeight: "600" },
  featuredPackSub: { color: moduleTheme.colors.textMuted, fontSize: 11, marginTop: 3, marginBottom: 7 },
  input: { backgroundColor: tc("#FFF9F3"), borderWidth: 1, borderColor: moduleTheme.colors.border, borderRadius: 10, color: moduleTheme.colors.textStrong, paddingHorizontal: 10, paddingVertical: 10, marginTop: 8 },
  categoryCreateRow: { gap: 8, paddingBottom: 6 },
  thumb: { width: 52, height: 52, borderRadius: 8, borderWidth: 1, borderColor: tc("#4A4A4A") },
  primary: { marginTop: 10, minHeight: 44, borderRadius: 11, backgroundColor: BRAND, alignItems: "center", justifyContent: "center" },
  primaryText: { color: tc("#FFF"), fontSize: 14, fontWeight: "600" },
  msgCard: { marginTop: 8, backgroundColor: tc("#FFF9F3"), borderWidth: 1, borderColor: tc("#E4D2C4"), borderRadius: 10, padding: 9 },
  msgTitle: { color: moduleTheme.colors.textStrong, fontSize: 13, fontWeight: "600" },
  msgText: { color: moduleTheme.colors.textMuted, fontSize: 12, marginTop: 2 },
})















