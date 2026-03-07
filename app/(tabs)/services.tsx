import AsyncStorage from "@react-native-async-storage/async-storage"
import { Ionicons } from "@expo/vector-icons"
import { Image } from "expo-image"
import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "expo-router"
import { Animated, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import { useAppLanguage } from "../../src/core/i18n"
import type { AppLanguage } from "../../src/core/i18n/types"
import { moduleStyles, moduleTheme } from "../../src/theme/moduleStyles"
import { AppAvatar } from "../../src/components/ui/AppAvatar"
import {
  CHAT_CURRENT_USER_ID,
  CHAT_CURRENT_USER_NAME,
  openConversationForPost,
  sendMessageToConversation,
} from "../../src/modules/chat/storage"
import { tc } from "../../src/theme/tokens"
import { cardMotionStyle, ensureEnterAnimArray, runStaggerEnter } from "../../src/ui/motion"
import { loadProfileAvatarConfig, normalizeAvatarConfig, ProfileAvatarConfig } from "../../src/modules/profile/avatar"

const BRAND = moduleTheme.colors.brand
const HERO = "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1400&q=80"
const POSTS_KEY = "servicesV1:posts"
const QUOTA_KEY = "servicesV1:quota"
const MAX_DAYS = 30

type ServiceCategory = "cleaning" | "childcare" | "eldercare"
type ListingType = "job" | "worker"
type PostStatus = "active" | "closed"
type Mode = "discover" | "create" | "mine" | "packages"

type ServicePost = {
  id: string
  ownerId?: string
  ownerName?: string
  ownerAvatar?: {
    mode: "photo" | "preset"
    photoUri?: string
    presetId?: string
  }
  title: string
  description: string
  category: ServiceCategory
  listingType: ListingType
  city: string
  district: string
  budget: string
  days: number
  createdAt: string
  expiresAt: string
  status: PostStatus
  closeReason?: "jobFound" | "workerFound" | "expired"
  qa?: {
    id: string
    question: string
    answer?: string
    createdAt: string
    answeredAt?: string
  }[]
}

type QuotaPurchase = {
  id: string
  count: number
  price: number
  createdAt: string
}

type ServicesQuota = {
  freeUsed: number
  paidCredits: number
  purchases: QuotaPurchase[]
}

type LocalText = {
  title: string
  subtitle: string
  searchPlaceholder: string
  cityFilterPlaceholder: string
  districtFilterPlaceholder: string
  modeDiscover: string
  modeCreate: string
  modeMine: string
  modePackages: string
  onlyCategories: string
  categoryCleaning: string
  categoryChildcare: string
  categoryEldercare: string
  typeJob: string
  typeWorker: string
  active: string
  closed: string
  expires: string
  closeJobFound: string
  closeWorkerFound: string
  remove: string
  details: string
  askQuestion: string
  askPlaceholder: string
  sendQuestion: string
  qaTitle: string
  noQuestion: string
  answerPlaceholder: string
  sendAnswer: string
  closeDetail: string
  noResult: string
  myEmpty: string
  createTitle: string
  inputTitle: string
  inputDesc: string
  inputCity: string
  inputDistrict: string
  inputBudget: string
  duration: string
  save: string
  required: string
  maxDays: string
  saved: string
  freeLeft: string
  paidCredits: string
  packageTitle: string
  packageDesc: string
  buy3: string
  buy10: string
  packageBought: string
  closeReasonExpired: string
  closeReasonJobFound: string
  closeReasonWorkerFound: string
}

const I18N: Record<AppLanguage, LocalText> = {
  tr: {
    title: "Hizmet ve İş İlanları",
    subtitle: "Sadece 3 kategori: Ev Temizliği, Çocuk Bakıcılığı, Yaşlı Bakımı",
    searchPlaceholder: "İlan ara (başlık/açıklama)",
    cityFilterPlaceholder: "Şehir filtrele",
    districtFilterPlaceholder: "İlçe filtrele",
    modeDiscover: "Keşfet",
    modeCreate: "İlan Ver",
    modeMine: "İlanlarım",
    modePackages: "Paketler",
    onlyCategories: "İzinli Kategoriler",
    categoryCleaning: "Ev Temizliği",
    categoryChildcare: "Çocuk Bakıcılığı",
    categoryEldercare: "Yaşlı Bakımı",
    typeJob: "İş Arıyorum",
    typeWorker: "Eleman Arıyorum",
    active: "Aktif",
    closed: "Kapalı",
    expires: "Bitiş",
    closeJobFound: "İş Buldum",
    closeWorkerFound: "Eleman Buldum",
    remove: "Kaldır",
    details: "Detay",
    askQuestion: "Satıcıya Soru Sor",
    askPlaceholder: "Sorunu yaz",
    sendQuestion: "Gönder",
    qaTitle: "Soru ve Cevaplar",
    noQuestion: "Henüz soru yok.",
    answerPlaceholder: "Cevap yaz",
    sendAnswer: "Cevapla",
    closeDetail: "Kapat",
    noResult: "Eşleşen ilan yok.",
    myEmpty: "Henüz ilanın yok.",
    createTitle: "Yeni Hizmet İlanı",
    inputTitle: "İlan başlığı",
    inputDesc: "Açıklama",
    inputCity: "Şehir",
    inputDistrict: "İlçe",
    inputBudget: "Ücret / Bütçe (TL)",
    duration: "Yayın süresi (gün)",
    save: "İlanı Yayınla",
    required: "Başlık, açıklama, şehir, ilçe ve bütçe zorunlu.",
    maxDays: "İlan süresi 30 günden uzun olamaz.",
    saved: "İlan yayına alındı.",
    freeLeft: "Ücretsiz Hak",
    paidCredits: "Paket Kredisi",
    packageTitle: "İlan Paketleri",
    packageDesc: "Her yeni ilan 1 kredi tüketir. İlk 1 ilan ücretsizdir.",
    buy3: "3 ilan kredisi / 99 TL",
    buy10: "10 ilan kredisi / 249 TL",
    packageBought: "Paket alındı, kredi eklendi.",
    closeReasonExpired: "Süresi doldu",
    closeReasonJobFound: "İş buldu",
    closeReasonWorkerFound: "Eleman buldu",
  },
  en: {
    title: "Services and Job Listings",
    subtitle: "Only 3 categories: Home Cleaning, Childcare, Elderly Care",
    searchPlaceholder: "Search listing (title/description)",
    cityFilterPlaceholder: "Filter by city",
    districtFilterPlaceholder: "Filter by district",
    modeDiscover: "Discover",
    modeCreate: "Post",
    modeMine: "My Listings",
    modePackages: "Packages",
    onlyCategories: "Allowed Categories",
    categoryCleaning: "Home Cleaning",
    categoryChildcare: "Childcare",
    categoryEldercare: "Elderly Care",
    typeJob: "Looking for Job",
    typeWorker: "Looking for Worker",
    active: "Active",
    closed: "Closed",
    expires: "Expires",
    closeJobFound: "I Found a Job",
    closeWorkerFound: "I Found a Worker",
    remove: "Remove",
    details: "Details",
    askQuestion: "Ask Seller",
    askPlaceholder: "Write your question",
    sendQuestion: "Send",
    qaTitle: "Q&A",
    noQuestion: "No questions yet.",
    answerPlaceholder: "Write answer",
    sendAnswer: "Reply",
    closeDetail: "Close",
    noResult: "No matching listing.",
    myEmpty: "You do not have any listing yet.",
    createTitle: "New Service Listing",
    inputTitle: "Listing title",
    inputDesc: "Description",
    inputCity: "City",
    inputDistrict: "District",
    inputBudget: "Fee / Budget (TRY)",
    duration: "Publish duration (days)",
    save: "Publish Listing",
    required: "Title, description, city, district and budget are required.",
    maxDays: "Listing duration cannot exceed 30 days.",
    saved: "Listing published.",
    freeLeft: "Free Quota",
    paidCredits: "Package Credits",
    packageTitle: "Listing Packages",
    packageDesc: "Each new listing uses 1 credit. First listing is free.",
    buy3: "3 listing credits / 99 TRY",
    buy10: "10 listing credits / 249 TRY",
    packageBought: "Package purchased, credits added.",
    closeReasonExpired: "Expired",
    closeReasonJobFound: "Job found",
    closeReasonWorkerFound: "Worker found",
  },
  de: {
    title: "Service- und Jobanzeigen",
    subtitle: "Nur 3 Kategorien: Hausreinigung, Kinderbetreuung, Altenpflege",
    searchPlaceholder: "Anzeige suchen (Titel/Beschreibung)",
    cityFilterPlaceholder: "Nach Stadt filtern",
    districtFilterPlaceholder: "Nach Bezirk filtern",
    modeDiscover: "Entdecken",
    modeCreate: "Inserieren",
    modeMine: "Meine Anzeigen",
    modePackages: "Pakete",
    onlyCategories: "Erlaubte Kategorien",
    categoryCleaning: "Hausreinigung",
    categoryChildcare: "Kinderbetreuung",
    categoryEldercare: "Altenpflege",
    typeJob: "Suche Arbeit",
    typeWorker: "Suche Personal",
    active: "Aktiv",
    closed: "Geschlossen",
    expires: "Ende",
    closeJobFound: "Arbeit gefunden",
    closeWorkerFound: "Personal gefunden",
    remove: "Entfernen",
    details: "Details",
    askQuestion: "Frage an Anbieter",
    askPlaceholder: "Frage eingeben",
    sendQuestion: "Senden",
    qaTitle: "Fragen und Antworten",
    noQuestion: "Noch keine Fragen.",
    answerPlaceholder: "Antwort eingeben",
    sendAnswer: "Antworten",
    closeDetail: "Schliessen",
    noResult: "Keine passenden Anzeigen.",
    myEmpty: "Noch keine Anzeige vorhanden.",
    createTitle: "Neue Service-Anzeige",
    inputTitle: "Anzeigentitel",
    inputDesc: "Beschreibung",
    inputCity: "Stadt",
    inputDistrict: "Bezirk",
    inputBudget: "Preis / Budget (TRY)",
    duration: "Laufzeit (Tage)",
    save: "Anzeige veroffentlichen",
    required: "Titel, Beschreibung, Stadt, Bezirk und Budget sind Pflicht.",
    maxDays: "Die Laufzeit darf 30 Tage nicht uberschreiten.",
    saved: "Anzeige veroffentlicht.",
    freeLeft: "Freie Quote",
    paidCredits: "Paketguthaben",
    packageTitle: "Anzeigenpakete",
    packageDesc: "Jede neue Anzeige verbraucht 1 Kredit. Erste Anzeige ist kostenlos.",
    buy3: "3 Anzeigenkredite / 99 TRY",
    buy10: "10 Anzeigenkredite / 249 TRY",
    packageBought: "Paket gekauft, Guthaben hinzugefugt.",
    closeReasonExpired: "Abgelaufen",
    closeReasonJobFound: "Arbeit gefunden",
    closeReasonWorkerFound: "Personal gefunden",
  },
  ru: {
    title: "Услуги и вакансии",
    subtitle: "Только 3 категории: уборка дома, няня, уход за пожилыми",
    searchPlaceholder: "Поиск объявления (заголовок/описание)",
    cityFilterPlaceholder: "Фильтр по городу",
    districtFilterPlaceholder: "Фильтр по району",
    modeDiscover: "Лента",
    modeCreate: "Добавить",
    modeMine: "Мои объявления",
    modePackages: "Пакеты",
    onlyCategories: "Разрешенные категории",
    categoryCleaning: "Уборка дома",
    categoryChildcare: "Няня",
    categoryEldercare: "Уход за пожилыми",
    typeJob: "Ищу работу",
    typeWorker: "Ищу сотрудника",
    active: "Активно",
    closed: "Закрыто",
    expires: "До",
    closeJobFound: "Работу нашла",
    closeWorkerFound: "Сотрудника нашла",
    remove: "Удалить",
    details: "Детали",
    askQuestion: "Задать вопрос",
    askPlaceholder: "Напишите вопрос",
    sendQuestion: "Отправить",
    qaTitle: "Вопросы и ответы",
    noQuestion: "Пока нет вопросов.",
    answerPlaceholder: "Напишите ответ",
    sendAnswer: "Ответить",
    closeDetail: "Закрыть",
    noResult: "Ничего не найдено.",
    myEmpty: "У вас пока нет объявлений.",
    createTitle: "Новое объявление",
    inputTitle: "Заголовок",
    inputDesc: "Описание",
    inputCity: "Город",
    inputDistrict: "Район",
    inputBudget: "Оплата / Бюджет (TRY)",
    duration: "Срок публикации (дни)",
    save: "Опубликовать",
    required: "Нужны заголовок, описание, город, район и бюджет.",
    maxDays: "Срок не может превышать 30 дней.",
    saved: "Объявление опубликовано.",
    freeLeft: "Бесплатный лимит",
    paidCredits: "Кредиты пакета",
    packageTitle: "Пакеты объявлений",
    packageDesc: "Каждое новое объявление списывает 1 кредит. Первое бесплатно.",
    buy3: "3 кредита / 99 TRY",
    buy10: "10 кредитов / 249 TRY",
    packageBought: "Пакет куплен, кредиты добавлены.",
    closeReasonExpired: "Истекло",
    closeReasonJobFound: "Нашла работу",
    closeReasonWorkerFound: "Нашла сотрудника",
  },
}

const categoryLabel = (category: ServiceCategory, l: LocalText) =>
  category === "cleaning" ? l.categoryCleaning : category === "childcare" ? l.categoryChildcare : l.categoryEldercare

export default function ServicesScreen() {
  const router = useRouter()
  const { language, ready } = useAppLanguage()
  const l = I18N[language]
  const photoLabText =
    language === "tr"
      ? { title: "Güzellik Stüdyosu", desc: "Selfie düzenle, görünüm dene, indir ve paylaş." }
      : language === "de"
        ? { title: "Beauty Studio", desc: "Optimiere dein Selfie und teile es direkt." }
        : language === "ru"
          ? { title: "Бьюти-студия", desc: "Редактируй селфи, сохраняй и делись." }
          : { title: "Beauty Studio", desc: "Refine selfies, save the result and share it." }
  const [mode, setMode] = useState<Mode>("discover")
  const [posts, setPosts] = useState<ServicePost[]>([])
  const [quota, setQuota] = useState<ServicesQuota>({ freeUsed: 0, paidCredits: 0, purchases: [] })
  const [feedback, setFeedback] = useState("")
  const [detailPostId, setDetailPostId] = useState<string | null>(null)
  const cardEnterAnims = useRef<Animated.Value[]>([])

  const [search, setSearch] = useState("")
  const [cityFilter, setCityFilter] = useState("")
  const [districtFilter, setDistrictFilter] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<ServiceCategory | "all">("all")

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [city, setCity] = useState("Antalya")
  const [district, setDistrict] = useState("")
  const [budget, setBudget] = useState("")
  const [days, setDays] = useState(30)
  const [category, setCategory] = useState<ServiceCategory>("cleaning")
  const [listingType, setListingType] = useState<ListingType>("job")
  const [questionInput, setQuestionInput] = useState("")
  const [answerInputs, setAnswerInputs] = useState<Record<string, string>>({})
  const [currentAvatar, setCurrentAvatar] = useState<ProfileAvatarConfig | null>(null)

  const notify = (value: string) => {
    setFeedback(value)
    setTimeout(() => setFeedback(""), 2200)
  }

  const savePosts = async (next: ServicePost[]) => {
    setPosts(next)
    await AsyncStorage.setItem(POSTS_KEY, JSON.stringify(next))
  }

  const saveQuota = async (next: ServicesQuota) => {
    setQuota(next)
    await AsyncStorage.setItem(QUOTA_KEY, JSON.stringify(next))
  }

  useEffect(() => {
    const load = async () => {
      const [rawPosts, rawQuota] = await Promise.all([AsyncStorage.getItem(POSTS_KEY), AsyncStorage.getItem(QUOTA_KEY)])
      let loadedPosts: ServicePost[] = []
      let loadedQuota: ServicesQuota = { freeUsed: 0, paidCredits: 0, purchases: [] }
      try {
        const parsed = rawPosts ? JSON.parse(rawPosts) : []
        loadedPosts = Array.isArray(parsed)
          ? parsed.map((p: any, idx: number) => {
              const expiresAt = `${p?.expiresAt ?? new Date().toISOString()}`
              const expired = new Date(expiresAt).getTime() < Date.now()
              return {
                id: `${p?.id ?? `svc-${Date.now()}-${idx}`}`,
                ownerId: `${p?.ownerId ?? ""}`.trim() || undefined,
                ownerName: `${p?.ownerName ?? ""}`.trim() || undefined,
                ownerAvatar: p?.ownerAvatar
                  ? {
                      mode: p.ownerAvatar.mode === "photo" ? "photo" : "preset",
                      photoUri: p.ownerAvatar.photoUri ? `${p.ownerAvatar.photoUri}` : undefined,
                      presetId: p.ownerAvatar.presetId ? `${p.ownerAvatar.presetId}` : undefined,
                    }
                  : undefined,
                title: `${p?.title ?? ""}`.trim(),
                description: `${p?.description ?? ""}`.trim(),
                category: p?.category === "childcare" ? "childcare" : p?.category === "eldercare" ? "eldercare" : "cleaning",
                listingType: p?.listingType === "worker" ? "worker" : "job",
                city: `${p?.city ?? "Antalya"}`.trim() || "Antalya",
                district: `${p?.district ?? ""}`.trim(),
                budget: `${p?.budget ?? ""}`.trim(),
                days: Math.min(MAX_DAYS, Math.max(1, Number(p?.days) || 30)),
                createdAt: `${p?.createdAt ?? new Date().toISOString()}`,
                expiresAt,
                status: expired ? "closed" : p?.status === "closed" ? "closed" : "active",
                closeReason: expired ? "expired" : p?.closeReason,
                qa: Array.isArray(p?.qa)
                  ? p.qa
                      .map((q: any, qIdx: number) => ({
                        id: `${q?.id ?? `svc-qa-${Date.now()}-${qIdx}`}`,
                        question: `${q?.question ?? ""}`.trim(),
                        answer: q?.answer ? `${q.answer}`.trim() : undefined,
                        createdAt: `${q?.createdAt ?? new Date().toISOString()}`,
                        answeredAt: q?.answeredAt ? `${q.answeredAt}` : undefined,
                      }))
                      .filter((q: any) => q.question.length > 0)
                  : [],
              } as ServicePost
            }).filter((p: ServicePost) => p.title.length > 0)
          : []
      } catch {
        loadedPosts = []
      }
      try {
        const parsed = rawQuota ? JSON.parse(rawQuota) : {}
        loadedQuota = {
          freeUsed: Math.max(0, Number(parsed?.freeUsed) || 0),
          paidCredits: Math.max(0, Number(parsed?.paidCredits) || 0),
          purchases: Array.isArray(parsed?.purchases) ? parsed.purchases : [],
        }
      } catch {
        loadedQuota = { freeUsed: 0, paidCredits: 0, purchases: [] }
      }
      setPosts(loadedPosts)
      setQuota(loadedQuota)
      setCurrentAvatar(await loadProfileAvatarConfig())
    }
    void load()
  }, [])

  const discover = useMemo(
    () =>
      posts
        .filter((p) => {
          const textMatch = `${p.title} ${p.description}`.toLowerCase().includes(search.toLowerCase())
          const cityMatch = !cityFilter.trim() || p.city.toLowerCase().includes(cityFilter.trim().toLowerCase())
          const districtMatch = !districtFilter.trim() || p.district.toLowerCase().includes(districtFilter.trim().toLowerCase())
          const categoryMatch = categoryFilter === "all" || p.category === categoryFilter
          return textMatch && cityMatch && districtMatch && categoryMatch
        })
        .sort((a, b) => {
          if (a.status !== b.status) return a.status === "active" ? -1 : 1
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        }),
    [posts, search, cityFilter, districtFilter, categoryFilter]
  )

  const mine = useMemo(() => posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [posts])
  const detailPost = useMemo(() => posts.find((p) => p.id === detailPostId) || null, [posts, detailPostId])
  const freeLeft = Math.max(0, 1 - quota.freeUsed)

  useMemo(() => {
    const targetLen = Math.max(discover.length, mine.length, 1)
    return ensureEnterAnimArray(cardEnterAnims, targetLen)
  }, [discover.length, mine.length])

  useEffect(() => {
    runStaggerEnter(cardEnterAnims)
  }, [mode, discover.length, mine.length])

  const buyPackage = async (count: number, price: number) => {
    const next: ServicesQuota = {
      freeUsed: quota.freeUsed,
      paidCredits: quota.paidCredits + count,
      purchases: [{ id: `svc-pack-${Date.now()}`, count, price, createdAt: new Date().toISOString() }, ...quota.purchases],
    }
    await saveQuota(next)
    notify(l.packageBought)
  }

  const canPublish = async () => {
    if (quota.freeUsed < 1) {
      await saveQuota({ ...quota, freeUsed: quota.freeUsed + 1 })
      return true
    }
    if (quota.paidCredits > 0) {
      await saveQuota({ ...quota, paidCredits: quota.paidCredits - 1 })
      return true
    }
    return false
  }

  const publish = async () => {
    if (!title.trim() || !description.trim() || !city.trim() || !district.trim() || !budget.trim()) {
      notify(l.required)
      return
    }
    if (days > MAX_DAYS) {
      notify(l.maxDays)
      return
    }
    if (!(await canPublish())) {
      notify(`${l.paidCredits}: 0`)
      setMode("packages")
      return
    }
    const now = new Date()
    const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString()
    const post: ServicePost = {
      id: `svc-${Date.now()}`,
      ownerId: CHAT_CURRENT_USER_ID,
      ownerName: CHAT_CURRENT_USER_NAME,
      ownerAvatar: currentAvatar ?? undefined,
      title: title.trim(),
      description: description.trim(),
      category,
      listingType,
      city: city.trim(),
      district: district.trim(),
      budget: budget.trim(),
      days,
      createdAt: now.toISOString(),
      expiresAt,
      status: "active",
    }
    await savePosts([post, ...posts])
    setTitle("")
    setDescription("")
    setCity("Antalya")
    setDistrict("")
    setBudget("")
    setDays(30)
    setCategory("cleaning")
    setListingType("job")
    setMode("mine")
    notify(l.saved)
  }

  const closePost = async (id: string, reason: "jobFound" | "workerFound") => {
    await savePosts(posts.map((p) => (p.id === id ? { ...p, status: "closed", closeReason: reason } : p)))
  }

  const removePost = async (id: string) => {
    await savePosts(posts.filter((p) => p.id !== id))
    if (detailPostId === id) setDetailPostId(null)
  }

  const askQuestion = async (postId: string) => {
    const q = questionInput.trim()
    if (!q) return
    const post = posts.find((p) => p.id === postId)
    if (!post) return
    const otherUserId = post.ownerId || `services-owner:${post.id}`
    const otherUserName = post.ownerName || "İlan Sahibi"
    const conv = await openConversationForPost({
      source: "services",
      postId: post.id,
      postTitle: post.title,
      currentUserId: CHAT_CURRENT_USER_ID,
      currentUserName: CHAT_CURRENT_USER_NAME,
      currentUserAvatar: currentAvatar ?? undefined,
      otherUserId,
      otherUserName,
      otherUserAvatar: post.ownerAvatar,
    })
    await sendMessageToConversation({
      conversationId: conv.id,
      senderId: CHAT_CURRENT_USER_ID,
      senderName: CHAT_CURRENT_USER_NAME,
      text: q,
    })
    await savePosts(
      posts.map((p) =>
        p.id === postId
          ? {
              ...p,
              qa: [{ id: `svc-qa-${Date.now()}`, question: q, createdAt: new Date().toISOString() }, ...(p.qa || [])],
            }
          : p
      )
    )
    setQuestionInput("")
    router.push({ pathname: "/(tabs)/messages", params: { conversationId: conv.id } })
  }

  const answerQuestion = async (postId: string, qaId: string) => {
    const key = `${postId}:${qaId}`
    const answer = (answerInputs[key] || "").trim()
    if (!answer) return
    const post = posts.find((p) => p.id === postId)
    if (!post) return
    const otherUserId = post.ownerId || `services-owner:${post.id}`
    const otherUserName = post.ownerName || "İlan Sahibi"
    const conv = await openConversationForPost({
      source: "services",
      postId: post.id,
      postTitle: post.title,
      currentUserId: CHAT_CURRENT_USER_ID,
      currentUserName: CHAT_CURRENT_USER_NAME,
      currentUserAvatar: currentAvatar ?? undefined,
      otherUserId,
      otherUserName,
      otherUserAvatar: post.ownerAvatar,
    })
    await sendMessageToConversation({
      conversationId: conv.id,
      senderId: CHAT_CURRENT_USER_ID,
      senderName: CHAT_CURRENT_USER_NAME,
      text: answer,
    })
    await savePosts(
      posts.map((p) =>
        p.id === postId
          ? {
              ...p,
              qa: (p.qa || []).map((q) =>
                q.id === qaId ? { ...q, answer, answeredAt: new Date().toISOString() } : q
              ),
            }
          : p
      )
    )
    setAnswerInputs((prev) => ({ ...prev, [key]: "" }))
    router.push({ pathname: "/(tabs)/messages", params: { conversationId: conv.id } })
  }

  if (!ready) return <View style={styles.page} />

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.container}>
        <View style={styles.hero}>
          <Image source={{ uri: HERO }} style={styles.heroBg} contentFit="cover" />
          <View style={styles.heroOverlay} />
          <View style={styles.heroGradientTop} />
          <View style={styles.heroGradientBottom} />
          <View style={styles.heroTopLine} />
          <Text style={styles.heroTitle}>{l.title}</Text>
          <Text style={styles.heroSubtitle}>{l.subtitle}</Text>
          <Text style={styles.heroMeta}>{l.freeLeft}: {freeLeft} | {l.paidCredits}: {quota.paidCredits}</Text>
        </View>
        <Pressable style={styles.photoLabCard} onPress={() => router.push("/photo-lab" as any)}>
          <View style={styles.photoLabIcon}>
            <Ionicons name="sparkles-outline" size={16} color={tc("#FFFFFF")} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.photoLabTitle}>{photoLabText.title}</Text>
            <Text style={styles.photoLabDesc}>{photoLabText.desc}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={tc("#8C3F66")} />
        </Pressable>

        <View style={styles.modeRow}>
          {([
            { id: "discover", text: l.modeDiscover, icon: "compass-outline" },
            { id: "create", text: l.modeCreate, icon: "add-circle-outline" },
            { id: "mine", text: l.modeMine, icon: "list-outline" },
            { id: "packages", text: l.modePackages, icon: "card-outline" },
          ] as const).map((m) => (
            <Pressable key={m.id} style={[styles.modeChip, mode === m.id && styles.modeChipActive]} onPress={() => setMode(m.id)}>
              <Ionicons name={m.icon} size={14} color={mode === m.id ? tc("#FFFFFF") : tc("#D3D3D3")} />
              <Text style={[styles.modeText, mode === m.id && styles.modeTextActive]}>{m.text}</Text>
            </Pressable>
          ))}
        </View>

        {mode === "discover" && (
          <View style={styles.panel}>
            <TextInput style={styles.input} value={search} onChangeText={setSearch} placeholder={l.searchPlaceholder} placeholderTextColor={tc("#A5A5A5")} />
            <View style={styles.row}>
              <TextInput style={[styles.input, styles.rowInput]} value={cityFilter} onChangeText={setCityFilter} placeholder={l.cityFilterPlaceholder} placeholderTextColor={tc("#A5A5A5")} />
              <TextInput style={[styles.input, styles.rowInput]} value={districtFilter} onChangeText={setDistrictFilter} placeholder={l.districtFilterPlaceholder} placeholderTextColor={tc("#A5A5A5")} />
            </View>
            <Text style={styles.sectionLabel}>{l.onlyCategories}</Text>
            <View style={styles.categoryRow}>
              {([
                { id: "all", label: "Tüm" },
                { id: "cleaning", label: l.categoryCleaning },
                { id: "childcare", label: l.categoryChildcare },
                { id: "eldercare", label: l.categoryEldercare },
              ] as const).map((c) => (
                <Pressable key={c.id} style={[styles.categoryChip, categoryFilter === c.id && styles.categoryChipActive]} onPress={() => setCategoryFilter(c.id)}>
                  <Text style={[styles.categoryText, categoryFilter === c.id && styles.categoryTextActive]}>{c.label}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.cardsWrap}>
              {discover.map((p, idx) => (
                <Animated.View
                  key={p.id}
                  style={cardMotionStyle(cardEnterAnims.current[idx]!, undefined, 12)}
                >
                <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]} onPress={() => setDetailPostId(p.id)}>
                  <View pointerEvents="none" style={styles.cardGradientTop} />
                  <View pointerEvents="none" style={styles.cardGradientBottom} />
                  <View pointerEvents="none" style={styles.cardShine} />
                  <View style={styles.cardTop}>
                    <View style={styles.cardOwnerWrap}>
                      <AppAvatar avatar={p.ownerAvatar ? normalizeAvatarConfig(p.ownerAvatar) : null} name={p.ownerName || "İlan Sahibi"} size={24} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle}>{p.title}</Text>
                        <Text style={styles.cardOwnerName}>{p.ownerName || "İlan Sahibi"}</Text>
                      </View>
                    </View>
                    <View style={[styles.statusPill, p.status === "closed" && styles.statusPillClosed]}>
                      <Text style={[styles.statusText, p.status === "closed" && styles.statusTextClosed]}>{p.status === "active" ? l.active : l.closed}</Text>
                    </View>
                  </View>
                  <Text style={styles.cardMeta}>{categoryLabel(p.category, l)} | {p.listingType === "job" ? l.typeJob : l.typeWorker}</Text>
                  <Text style={styles.cardMeta}>{p.city} / {p.district}</Text>
                  <Text style={styles.cardBudget}>{p.budget}</Text>
                  <Text style={styles.cardDesc}>{p.description}</Text>
                  <Text style={styles.cardExpire}>{l.expires}: {new Date(p.expiresAt).toLocaleDateString()}</Text>
                  <Pressable style={styles.detailAction} onPress={() => setDetailPostId(p.id)}>
                    <Text style={styles.detailActionText}>{l.details}</Text>
                  </Pressable>
                  {p.status === "closed" && (
                    <Text style={styles.closedReason}>
                      {p.closeReason === "expired" ? l.closeReasonExpired : p.closeReason === "jobFound" ? l.closeReasonJobFound : l.closeReasonWorkerFound}
                    </Text>
                  )}
                </Pressable>
                </Animated.View>
              ))}
              {!discover.length && <Text style={styles.emptyText}>{l.noResult}</Text>}
            </View>
          </View>
        )}

        {mode === "create" && (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>{l.createTitle}</Text>
            <View style={styles.row}>
              <Pressable style={[styles.typeChip, listingType === "job" && styles.typeChipActive]} onPress={() => setListingType("job")}><Text style={[styles.typeText, listingType === "job" && styles.typeTextActive]}>{l.typeJob}</Text></Pressable>
              <Pressable style={[styles.typeChip, listingType === "worker" && styles.typeChipActive]} onPress={() => setListingType("worker")}><Text style={[styles.typeText, listingType === "worker" && styles.typeTextActive]}>{l.typeWorker}</Text></Pressable>
            </View>
            <View style={styles.categoryRow}>
              {([
                { id: "cleaning", label: l.categoryCleaning },
                { id: "childcare", label: l.categoryChildcare },
                { id: "eldercare", label: l.categoryEldercare },
              ] as const).map((c) => (
                <Pressable key={c.id} style={[styles.categoryChip, category === c.id && styles.categoryChipActive]} onPress={() => setCategory(c.id)}>
                  <Text style={[styles.categoryText, category === c.id && styles.categoryTextActive]}>{c.label}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder={l.inputTitle} placeholderTextColor={tc("#A5A5A5")} />
            <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} placeholder={l.inputDesc} placeholderTextColor={tc("#A5A5A5")} multiline />
            <View style={styles.row}>
              <TextInput style={[styles.input, styles.rowInput]} value={city} onChangeText={setCity} placeholder={l.inputCity} placeholderTextColor={tc("#A5A5A5")} />
              <TextInput style={[styles.input, styles.rowInput]} value={district} onChangeText={setDistrict} placeholder={l.inputDistrict} placeholderTextColor={tc("#A5A5A5")} />
            </View>
            <TextInput style={styles.input} value={budget} onChangeText={setBudget} placeholder={l.inputBudget} placeholderTextColor={tc("#A5A5A5")} keyboardType="number-pad" />
            <Text style={styles.sectionLabel}>{l.duration}</Text>
            <View style={styles.row}>
              {[7, 14, 30].map((d) => (
                <Pressable key={d} style={[styles.typeChip, days === d && styles.typeChipActive]} onPress={() => setDays(d)}>
                  <Text style={[styles.typeText, days === d && styles.typeTextActive]}>{d} Gun</Text>
                </Pressable>
              ))}
            </View>
            <Pressable style={styles.primary} onPress={() => void publish()}>
              <Text style={styles.primaryText}>{l.save}</Text>
            </Pressable>
          </View>
        )}

        {mode === "mine" && (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>{l.modeMine}</Text>
            {mine.map((p, idx) => (
              <Animated.View
                key={p.id}
                style={cardMotionStyle(cardEnterAnims.current[idx]!, undefined, 12)}
              >
              <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]} onPress={() => setDetailPostId(p.id)}>
                <View pointerEvents="none" style={styles.cardGradientTop} />
                <View pointerEvents="none" style={styles.cardGradientBottom} />
                <View pointerEvents="none" style={styles.cardShine} />
                <View style={styles.cardTop}>
                  <View style={styles.cardOwnerWrap}>
                    <AppAvatar avatar={p.ownerAvatar ? normalizeAvatarConfig(p.ownerAvatar) : null} name={p.ownerName || "İlan Sahibi"} size={24} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{p.title}</Text>
                      <Text style={styles.cardOwnerName}>{p.ownerName || "İlan Sahibi"}</Text>
                    </View>
                  </View>
                  <View style={[styles.statusPill, p.status === "closed" && styles.statusPillClosed]}>
                    <Text style={[styles.statusText, p.status === "closed" && styles.statusTextClosed]}>{p.status === "active" ? l.active : l.closed}</Text>
                  </View>
                </View>
                <Text style={styles.cardMeta}>{categoryLabel(p.category, l)} | {p.city} / {p.district}</Text>
                <Text style={styles.cardBudget}>{p.budget}</Text>
                <View style={styles.row}>
                  <Pressable style={styles.detailAction} onPress={() => setDetailPostId(p.id)}><Text style={styles.detailActionText}>{l.details}</Text></Pressable>
                  {p.status === "active" && p.listingType === "job" && (
                    <Pressable style={styles.action} onPress={() => void closePost(p.id, "jobFound")}><Text style={styles.actionText}>{l.closeJobFound}</Text></Pressable>
                  )}
                  {p.status === "active" && p.listingType === "worker" && (
                    <Pressable style={styles.action} onPress={() => void closePost(p.id, "workerFound")}><Text style={styles.actionText}>{l.closeWorkerFound}</Text></Pressable>
                  )}
                  <Pressable style={styles.removeAction} onPress={() => void removePost(p.id)}><Text style={styles.removeActionText}>{l.remove}</Text></Pressable>
                </View>
              </Pressable>
              </Animated.View>
            ))}
            {!mine.length && <Text style={styles.emptyText}>{l.myEmpty}</Text>}
          </View>
        )}

        {mode === "packages" && (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>{l.packageTitle}</Text>
            <Text style={styles.panelDesc}>{l.packageDesc}</Text>
            <View style={styles.row}>
              <Pressable style={styles.action} onPress={() => void buyPackage(3, 99)}><Text style={styles.actionText}>{l.buy3}</Text></Pressable>
              <Pressable style={styles.action} onPress={() => void buyPackage(10, 249)}><Text style={styles.actionText}>{l.buy10}</Text></Pressable>
            </View>
          </View>
        )}

        {!!feedback && <Text style={styles.feedback}>{feedback}</Text>}

        {!!detailPost && (
          <View style={styles.detailPanel}>
            <View style={styles.detailPanelTop}>
              <View style={styles.detailOwnerWrap}>
                <AppAvatar avatar={detailPost.ownerAvatar ? normalizeAvatarConfig(detailPost.ownerAvatar) : null} name={detailPost.ownerName || "İlan Sahibi"} size={28} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailTitle}>{detailPost.title}</Text>
                  <Text style={styles.cardOwnerName}>{detailPost.ownerName || "İlan Sahibi"}</Text>
                </View>
              </View>
              <Pressable style={styles.removeAction} onPress={() => setDetailPostId(null)}>
                <Text style={styles.removeActionText}>{l.closeDetail}</Text>
              </Pressable>
            </View>
            <Text style={styles.cardMeta}>
              {categoryLabel(detailPost.category, l)} | {detailPost.city} / {detailPost.district}
            </Text>
            <Text style={styles.cardDesc}>{detailPost.description}</Text>
            <Text style={styles.cardExpire}>{l.expires}: {new Date(detailPost.expiresAt).toLocaleDateString()}</Text>

            <Text style={styles.sectionLabel}>{l.askQuestion}</Text>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.rowInput]}
                value={questionInput}
                onChangeText={setQuestionInput}
                placeholder={l.askPlaceholder}
                placeholderTextColor={tc("#A5A5A5")}
              />
              <Pressable style={styles.action} onPress={() => void askQuestion(detailPost.id)}>
                <Text style={styles.actionText}>{l.sendQuestion}</Text>
              </Pressable>
            </View>

            <Text style={styles.sectionLabel}>{l.qaTitle}</Text>
            {(detailPost.qa || []).map((qa) => (
              <View key={qa.id} style={styles.qaCard}>
                <Text style={styles.qaQ}>S: {qa.question}</Text>
                {!!qa.answer && <Text style={styles.qaA}>C: {qa.answer}</Text>}
                {!qa.answer && (
                  <View style={styles.row}>
                    <TextInput
                      style={[styles.input, styles.rowInput]}
                      value={answerInputs[`${detailPost.id}:${qa.id}`] || ""}
                      onChangeText={(v) => setAnswerInputs((prev) => ({ ...prev, [`${detailPost.id}:${qa.id}`]: v }))}
                      placeholder={l.answerPlaceholder}
                      placeholderTextColor={tc("#A5A5A5")}
                    />
                    <Pressable style={styles.action} onPress={() => void answerQuestion(detailPost.id, qa.id)}>
                      <Text style={styles.actionText}>{l.sendAnswer}</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            ))}
            {!(detailPost.qa || []).length && <Text style={styles.emptyText}>{l.noQuestion}</Text>}
          </View>
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  page: { ...moduleStyles.page, padding: 10 },
  container: { ...moduleStyles.content, position: "relative" },
  hero: { borderRadius: 14, borderWidth: 1, borderColor: tc("#E9D8C8"), minHeight: 126, overflow: "hidden", marginBottom: 10, position: "relative", padding: 12 },
  heroBg: { ...StyleSheet.absoluteFillObject },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,248,241,0.78)" },
  heroGradientTop: { ...StyleSheet.absoluteFillObject, top: 0, bottom: "54%", backgroundColor: "rgba(255,255,255,0.14)" },
  heroGradientBottom: { ...StyleSheet.absoluteFillObject, top: "54%", bottom: 0, backgroundColor: "rgba(88,48,109,0.10)" },
  heroTopLine: { position: "absolute", left: 0, right: 0, top: 0, height: 4, backgroundColor: BRAND },
  heroTitle: { color: tc("#4A342A"), fontSize: 20, fontWeight: "600" },
  heroSubtitle: { color: tc("#6E5549"), fontSize: 12, marginTop: 5, lineHeight: 18 },
  heroMeta: { color: tc("#7A2D4F"), fontSize: 12, marginTop: 8, fontWeight: "600" },
  photoLabCard: {
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,0,102,0.32)",
    backgroundColor: "rgba(255,0,102,0.10)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  photoLabIcon: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tc("#FF007A"),
  },
  photoLabTitle: { color: tc("#5A3148"), fontSize: 13, fontWeight: "700" },
  photoLabDesc: { color: tc("#6E5549"), fontSize: 11, lineHeight: 15, marginTop: 2 },
  modeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  modeChip: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, borderWidth: 1, borderColor: tc("#E0CFC2"), backgroundColor: tc("#FFF9F3"), paddingHorizontal: 10, paddingVertical: 7 },
  modeChipActive: { borderColor: BRAND, backgroundColor: tc("#3A2A33") },
  modeText: { color: tc("#6E5549"), fontSize: 12, fontWeight: "600" },
  modeTextActive: { color: tc("#FFFFFF") },
  panel: { borderRadius: 12, borderWidth: 1, borderColor: tc("#E4D2C4"), backgroundColor: tc("#FFFDF9"), padding: 10 },
  panelTitle: { color: tc("#4A342A"), fontSize: 16, fontWeight: "600", marginBottom: 8 },
  panelDesc: { color: tc("#7A5B4E"), fontSize: 12, lineHeight: 18, marginBottom: 8 },
  input: { backgroundColor: tc("#FFF9F3"), borderWidth: 1, borderColor: tc("#E9D8C8"), borderRadius: 10, color: tc("#4A342A"), paddingHorizontal: 10, paddingVertical: 10, marginBottom: 8 },
  textArea: { minHeight: 86, textAlignVertical: "top" },
  row: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  rowInput: { flex: 1, minWidth: 130 },
  sectionLabel: { color: tc("#7A5B4E"), fontSize: 12, fontWeight: "600", marginBottom: 6, marginTop: 2 },
  categoryRow: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 8 },
  categoryChip: { borderRadius: 999, borderWidth: 1, borderColor: tc("#E0CFC2"), backgroundColor: tc("#FFF9F3"), paddingHorizontal: 10, paddingVertical: 6 },
  categoryChipActive: { borderColor: BRAND, backgroundColor: tc("#3A2A33") },
  categoryText: { color: tc("#6E5549"), fontSize: 12, fontWeight: "600" },
  categoryTextActive: { color: tc("#FFFFFF") },
  typeChip: { borderRadius: 999, borderWidth: 1, borderColor: tc("#E0CFC2"), backgroundColor: tc("#FFF9F3"), paddingHorizontal: 10, paddingVertical: 7 },
  typeChipActive: { borderColor: BRAND, backgroundColor: tc("#3A2A33") },
  typeText: { color: tc("#6E5549"), fontSize: 12, fontWeight: "600" },
  typeTextActive: { color: tc("#FFFFFF") },
  primary: { marginTop: 4, minHeight: 44, borderRadius: 10, backgroundColor: BRAND, alignItems: "center", justifyContent: "center" },
  primaryText: { color: tc("#FFFFFF"), fontSize: 14, fontWeight: "600" },
  cardsWrap: { marginTop: 4 },
  card: { borderRadius: 12, borderWidth: 1, borderColor: tc("#E4D2C4"), backgroundColor: tc("#FFF9F3"), padding: 10, marginBottom: 8, position: "relative", overflow: "hidden" },
  cardPressed: { transform: [{ scale: 0.992 }] },
  cardGradientTop: { ...StyleSheet.absoluteFillObject, top: 0, bottom: "56%", backgroundColor: "rgba(255,255,255,0.16)" },
  cardGradientBottom: { ...StyleSheet.absoluteFillObject, top: "56%", bottom: 0, backgroundColor: "rgba(88,48,109,0.08)" },
  cardShine: { position: "absolute", top: -30, right: -22, width: 96, height: 96, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.18)" },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  cardOwnerWrap: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  cardOwnerName: { color: tc("#7A5B4E"), fontSize: 11, marginTop: 2, fontWeight: "600" },
  cardTitle: { flex: 1, color: tc("#4A342A"), fontSize: 14, fontWeight: "600" },
  statusPill: { borderRadius: 999, borderWidth: 1, borderColor: "rgba(28,165,100,0.28)", backgroundColor: "rgba(28,165,100,0.12)", paddingHorizontal: 8, paddingVertical: 4 },
  statusPillClosed: { borderColor: "rgba(255,0,102,0.36)", backgroundColor: "rgba(255,0,102,0.14)" },
  statusText: { color: tc("#74D49B"), fontSize: 10, fontWeight: "600" },
  statusTextClosed: { color: tc("#FF9CC5") },
  cardMeta: { color: tc("#7A5B4E"), fontSize: 12, marginTop: 4 },
  cardBudget: { color: tc("#FFD7E9"), fontSize: 13, fontWeight: "600", marginTop: 5 },
  cardDesc: { color: tc("#4A342A"), fontSize: 12, marginTop: 5, lineHeight: 18 },
  cardExpire: { color: tc("#7A5B4E"), fontSize: 11, marginTop: 7 },
  closedReason: { color: tc("#FFB2D1"), fontSize: 11, marginTop: 3, fontWeight: "600" },
  action: { borderRadius: 999, borderWidth: 1, borderColor: tc("#E0CFC2"), backgroundColor: tc("#FFF4EC"), paddingHorizontal: 10, paddingVertical: 7 },
  actionText: { color: tc("#6E5549"), fontSize: 12, fontWeight: "600" },
  detailAction: { marginTop: 8, alignSelf: "flex-start", borderRadius: 999, borderWidth: 1, borderColor: "rgba(255,0,102,0.55)", backgroundColor: "rgba(255,0,102,0.18)", paddingHorizontal: 10, paddingVertical: 7 },
  detailActionText: { color: tc("#FFD6E8"), fontSize: 12, fontWeight: "600" },
  removeAction: { borderRadius: 999, borderWidth: 1, borderColor: "rgba(255,95,136,0.55)", backgroundColor: "rgba(255,0,102,0.18)", paddingHorizontal: 10, paddingVertical: 7 },
  removeActionText: { color: tc("#FFD2E3"), fontSize: 12, fontWeight: "600" },
  emptyText: { color: tc("#7A5B4E"), fontSize: 13, paddingVertical: 8 },
  feedback: { color: tc("#7A2D4F"), fontSize: 12, marginTop: 8, fontWeight: "600" },
  detailPanel: { marginTop: 10, borderRadius: 12, borderWidth: 1, borderColor: tc("#E4D2C4"), backgroundColor: tc("#FFFDF9"), padding: 10 },
  detailPanelTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  detailOwnerWrap: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  detailTitle: { flex: 1, color: tc("#4A342A"), fontSize: 15, fontWeight: "600" },
  qaCard: { marginTop: 6, borderRadius: 10, borderWidth: 1, borderColor: tc("#E4D2C4"), backgroundColor: tc("#FFF9F3"), padding: 8 },
  qaQ: { color: tc("#4A342A"), fontSize: 12, fontWeight: "600" },
  qaA: { color: tc("#FFD6E8"), fontSize: 12, marginTop: 4, lineHeight: 18 },
})









