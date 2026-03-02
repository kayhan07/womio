import AsyncStorage from "@react-native-async-storage/async-storage"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useEffect, useMemo, useRef, useState } from "react"
import { Animated, ImageBackground, Linking, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native"
import { useAppLanguage } from "@/src/core/i18n"
import { FOOD_RECIPES, type Cat, type Meal, type FoodRecipe, normalizeFoodText } from "@/src/modules/food/recipes"
import { FOOD_LOCAL_IMAGE_MAP } from "@/src/modules/food/localImageMap"
import { loadMarketItems, saveMarketItems } from "@/src/modules/shopping/storage"
import { MarketItem } from "@/src/modules/shopping/types"
import { moduleStyles, moduleTheme } from "@/src/theme/moduleStyles"
import { tc } from "@/src/theme/tokens"
import { cardMotionStyle, ensureEnterAnimArray, getOrCreatePressAnim, pressIn, pressOut, runStaggerEnter } from "@/src/ui/motion"

const STORAGE = "foodModuleV5"
const HERO = "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1400&q=80"
const RECIPE_IMAGE_KEY_BY_ID: Record<string, string> = {
  menemen: "kahvalti",
  omlet: "kahvalti",
  mercimek: "corba",
  ezogelin: "corba",
  tavuk: "ana",
  firin: "firin",
  musakka: "patlican",
  makarna: "makarna",
  pilav: "pilav",
  "firin-makarna": "firin",
  "yogurtlu-makarna": "makarna",
  penne: "makarna",
  yayla: "corba",
  "domates-c": "corba",
  tarhana: "corba",
  "brokoli-c": "corba",
  kofte: "ana",
  "izgara-balik": "balik",
  "kuru-fasulye": "ana",
  "etli-nohut": "ana",
}
const RECIPE_IMAGE_URI_BY_ID: Record<string, string> = {
  // Manual hard-fixes for currently wrong cards.
  musakka: "https://commons.wikimedia.org/wiki/Special:FilePath/MussakasMeMelitsanesKePatates01.JPG?width=1200",
  karniyarik: "https://commons.wikimedia.org/wiki/Special:FilePath/Karn%C4%B1yar%C4%B1k.JPG?width=1200",
}
const LOCAL_COVER_META: Record<string, { label: string; a: string; b: string; uri: string }> = {
  kahvalti: { label: "Kahvaltı", a: tc("#FDEFD8"), b: tc("#F8D69A"), uri: "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=1200&q=80" },
  corba: { label: "Çorba", a: tc("#F9E9D4"), b: tc("#F3CF9B"), uri: "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=1200&q=80" },
  ana: { label: "Ana Yemek", a: tc("#F7E6DF"), b: tc("#EAC4B4"), uri: "https://images.unsplash.com/photo-1603360946369-dc9bb6258143?auto=format&fit=crop&w=1200&q=80" },
  firin: { label: "Fırın", a: tc("#F8E8DE"), b: tc("#EDC8B1"), uri: "https://images.unsplash.com/photo-1518492104633-130d0cc84637?auto=format&fit=crop&w=1200&q=80" },
  patlican: { label: "Patlıcan", a: tc("#ECE2F7"), b: tc("#D2BCEB"), uri: "https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?auto=format&fit=crop&w=1200&q=80" },
  makarna: { label: "Makarna", a: tc("#FBEAD6"), b: tc("#F2C99C"), uri: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=1200&q=80" },
  pilav: { label: "Pilav", a: tc("#F2F0DE"), b: tc("#E0DBB3"), uri: "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=1200&q=80" },
  balik: { label: "Balık", a: tc("#E1EEF8"), b: tc("#BDD8EE"), uri: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=1200&q=80" },
  salata: { label: "Salata", a: tc("#E3F3E8"), b: tc("#BEE4C7"), uri: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80" },
  tatli: { label: "Tatlı", a: tc("#FBE2EC"), b: tc("#F4BED6"), uri: "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=1200&q=80" },
  yemek: { label: "Yemek", a: tc("#EFE8E2"), b: tc("#D8C7BC"), uri: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80" },
}
const POPULAR_CARD_W = 276
const POPULAR_GAP = 10
const API_BASE = `${process.env.EXPO_PUBLIC_API_BASE_URL || "https://womio.net/api"}`.trim().replace(/\/+$/, "")
type Difficulty = "all" | "easy" | "medium" | "hard"
type WeeklyMenuDay = { soupId: string; mainId: string; sideId: string; saladId: string }
type MarketUnit = "adet" | "g" | "ml" | "yemek kaşığı" | "su bardağı" | "çay kaşığı"
type MarketStoreUnit = "adet" | "g" | "ml"
type MarketDraftLine = { key: string; name: string; qty: number; unit: MarketStoreUnit }
const FOOD_WIKI_ENDPOINT =
  process.env.EXPO_PUBLIC_FOOD_WIKI_ENDPOINT ||
  `${API_BASE}/food/wiki-image`

const norm = normalizeFoodText
const recipeDifficulty = (prep: number): Exclude<Difficulty, "all"> => (prep <= 20 ? "easy" : prep <= 40 ? "medium" : "hard")
const expandStepTr = (step: string) => {
  const s = norm(step)
  if (s.includes("sos yap")) return "domatesi rendeleyip az zeytinyağı ve bir diş ezilmiş sarımsakla 6-8 dakika kısık ateşte pişirerek sosu hazırla"
  if (s.includes("hasla")) return "makarnayı kaynayan tuzlu suda paket süresinden 1 dakika daha kısa haşla"
  if (s.includes("karistir")) return "haşlanmış makarnayı sosa alıp 1-2 dakika birlikte çevirerek birbirine güzelce yedir"
  if (s.includes("kavur")) return "malzemeleri orta ateşte 2-3 dakika kokusu çıkana kadar kavur"
  if (s.includes("pisir")) return "malzemeyi orta-kısık ateşte kontrollü şekilde pişir"
  if (s.includes("servis")) return "ocaktan aldıktan sonra 1 dakika dinlendirip servis et"
  return step.replace(/\.$/, "")
}
const ingredientAmountTr = (name: string, servings: number) => {
  const n = norm(name)
  if (n.includes("domates sos") || n.includes("besamel")) return `${Math.max(80, servings * 80)} ml`
  if (n.includes("su")) return `${Math.max(1, Math.round(servings))} su bardağı`
  if (n.includes("tarhana")) return `${Math.max(1, Math.round(servings))} yemek kaşığı`
  if (n.includes("nar eksisi")) return `${Math.max(1, Math.ceil(servings / 2))} yemek kaşığı`
  if (n.includes("tahin")) return `${Math.max(20, servings * 20)} g`
  if (n.includes("parmesan")) return `${Math.max(20, servings * 20)} g`
  if (n.includes("seker") || n.includes("irmik") || n.includes("kakao") || n.includes("yulaf") || n.includes("granola")) return `${Math.max(30, servings * 30)} g`
  if (n.includes("ceviz") || n.includes("fistik") || n.includes("kusuzumu")) return `${Math.max(20, servings * 20)} g`
  if (n.includes("pirinc unu") || n.includes("un")) return `${Math.max(30, servings * 30)} g`
  if (n.includes("baharat") || n.includes("kimyon") || n.includes("karabiber") || n.includes("kirmizi biber") || n.includes("kurubiber") || n.includes("kekik") || n.includes("nane") || n.includes("feslegen")) return `${Math.max(1, Math.ceil(servings / 2))} çay kaşığı`
  if (n.includes("tuz")) return `${Math.max(1, Math.ceil(servings / 2))} çay kaşığı`
  if (n.includes("sarmisak")) return `${Math.max(1, Math.round(servings))} diş`
  if (n.includes("yumurta")) return `${Math.max(1, Math.round(servings))} adet`
  if (n.includes("domates")) return `${Math.max(1, Math.round(servings))} adet`
  if (n.includes("sogan")) return `${Math.max(1, Math.ceil(servings / 2))} adet`
  if (n.includes("biber")) return `${Math.max(1, Math.ceil(servings / 2))} adet`
  if (n.includes("misir")) return `${Math.max(40, servings * 40)} g`
  if (n.includes("patlican")) return `${Math.max(1, Math.round(servings))} adet`
  if (n.includes("patates")) return `${Math.max(1, Math.round(servings))} adet`
  if (
    n.includes("mercimek") ||
    n.includes("nohut") ||
    n.includes("fasulye") ||
    n.includes("bezelye") ||
    n.includes("barbunya") ||
    n.includes("bakla")
  ) return `${Math.max(60, servings * 60)} g`
  if (n.includes("mantar")) return `${Math.max(80, servings * 80)} g`
  if (n.includes("kiyma") || n.includes("tavuk") || n.includes("et") || n.includes("balik") || n.includes("somon") || n.includes("hamsi") || n.includes("palamut") || n.includes("hindi") || n.includes("sucuk")) return `${Math.max(90, servings * 90)} g`
  if (n.includes("makarna") || n.includes("pirinc") || n.includes("bulgur") || n.includes("kinoa") || n.includes("kuskus") || n.includes("sehriye") || n.includes("penne") || n.includes("fettuccine") || n.includes("lazanya") || n.includes("manti")) return `${Math.max(70, servings * 70)} g`
  if (n.includes("yogurt")) return `${Math.max(80, servings * 80)} g`
  if (n.includes("sut")) return `${Math.max(100, servings * 100)} ml`
  if (n.includes("krema")) return `${Math.max(80, servings * 80)} ml`
  if (n.includes("salca")) return `${Math.max(1, Math.ceil(servings / 2))} yemek kaşığı`
  if (n === "yag" || n.includes(" zeytinyagi") || n.includes("zeytinyagi") || n.includes("tereyagi")) return `${Math.max(1, Math.ceil(servings / 2))} yemek kaşığı`
  if (n.includes("peynir") || n.includes("kasar")) return `${Math.max(50, servings * 50)} g`
  if (n.includes("yufka") || n.includes("hamur") || n.includes("lava") || n.includes("ekmek") || n.includes("simit") || n.includes("yapragi") || n.includes("burger ekmegi")) return `${Math.max(1, Math.ceil(servings / 2))} adet`
  if (n.includes("yesillik") || n.includes("maydanoz") || n.includes("dereotu") || n.includes("marul")) return `${Math.max(1, Math.ceil(servings / 2))} demet`
  return `${Math.max(1, Math.round(servings))} adet`
}
const ingredientDisplayAmountTr = (name: string, servings: number) => {
  const base = ingredientAmountTr(name, servings)
  const n = norm(name)
  const perPieceGram: Array<[string, number]> = [
    ["domates", 120],
    ["sogan", 100],
    ["biber", 80],
    ["patates", 180],
    ["patlican", 250],
    ["kabak", 180],
    ["havuc", 70],
    ["salatalik", 120],
    ["enginar", 160],
  ]
  if (!base.includes("adet")) return base
  const num = Math.max(1, Math.round(Number(base.match(/\d+/)?.[0] || "1")))
  const found = perPieceGram.find(([k]) => n.includes(k))
  if (!found) return base
  const approx = num * found[1]
  return `${num} adet (~${formatGramAsKg(approx)})`
}
const formatGramAsKg = (grams: number) => {
  if (grams < 1000) return `${grams} g`
  const kg = grams / 1000
  const text = Number.isInteger(kg) ? `${kg}` : kg.toFixed(1).replace(".", ",")
  return `${text} kg`
}
const formatQtyUnitDisplay = (name: string, qty: number, unit: string) => {
  if (unit === "g") return formatGramAsKg(qty)
  if (unit !== "adet") return `${qty} ${unit}`.trim()
  const n = norm(name)
  const perPieceGram: Array<[string, number]> = [
    ["domates", 120],
    ["sogan", 100],
    ["biber", 80],
    ["patates", 180],
    ["patlican", 250],
    ["kabak", 180],
    ["havuc", 70],
    ["salatalik", 120],
    ["enginar", 160],
  ]
  const found = perPieceGram.find(([k]) => n.includes(k))
  if (!found) return `${qty} adet`
  return `${qty} adet (~${formatGramAsKg(qty * found[1])})`
}
const stepDurationTr = (step: string, totalPrep: number, stepCount: number) => {
  const s = norm(step)
  const base = Math.max(2, Math.round(totalPrep / Math.max(1, stepCount)))
  if (s.includes("hasla")) return Math.max(base, 10)
  if (s.includes("kizart")) return Math.max(base, 12)
  if (s.includes("firin")) return Math.max(base, 18)
  if (s.includes("sos")) return Math.max(base, 8)
  if (s.includes("kavur")) return Math.max(base, 6)
  if (s.includes("karistir")) return Math.max(2, Math.round(base * 0.5))
  return base
}

const imageKind = (r: FoodRecipe) => {
  const t = norm(r.title)
  if (t.includes("corba") || r.cat.includes("soup")) return "Corba"
  if (t.includes("salata") || t.includes("cacik") || t.includes("haydari") || t.includes("piyaz")) return "Salata"
  if (t.includes("balik") || t.includes("somon") || t.includes("hamsi") || t.includes("palamut")) return "Balik"
  if (t.includes("borek") || t.includes("gozleme") || t.includes("pide") || t.includes("lahmacun")) return "Hamur işi"
  if (t.includes("makarna") || t.includes("penne") || t.includes("lazanya")) return "Makarna"
  if (t.includes("pilav") || t.includes("bulgur") || t.includes("kuskus") || t.includes("risotto")) return "Pilav"
  if (t.includes("sutlac") || t.includes("helva") || t.includes("revani") || t.includes("waffle") || t.includes("pankek") || t.includes("mug cake")) return "Tatli"
  if (t.includes("karniyarik") || t.includes("musakka") || t.includes("imam bayildi") || t.includes("patlican")) return "Patlican"
  if (t.includes("menemen") || t.includes("omlet") || t.includes("yumurta") || t.includes("kahvalti")) return "Kahvalti"
  if (t.includes("tavuk") || t.includes("et") || t.includes("kofte") || t.includes("kebap") || t.includes("kavurma")) return "Ana yemek"
  return "Yemek"
}

const imagePalette = (kind: string): { a: string; b: string } => {
  if (kind === "Corba") return { a: tc("#F9E9D4"), b: tc("#F3CF9B") }
  if (kind === "Salata") return { a: tc("#E3F3E8"), b: tc("#BEE4C7") }
  if (kind === "Balik") return { a: tc("#E1EEF8"), b: tc("#BDD8EE") }
  if (kind === "Hamur işi") return { a: tc("#F8E8DE"), b: tc("#EDC8B1") }
  if (kind === "Makarna") return { a: tc("#FBEAD6"), b: tc("#F2C99C") }
  if (kind === "Pilav") return { a: tc("#F2F0DE"), b: tc("#E0DBB3") }
  if (kind === "Tatli") return { a: tc("#FBE2EC"), b: tc("#F4BED6") }
  if (kind === "Patlican") return { a: tc("#ECE2F7"), b: tc("#D2BCEB") }
  if (kind === "Kahvalti") return { a: tc("#FDEFD8"), b: tc("#F8D69A") }
  if (kind === "Ana yemek") return { a: tc("#F7E6DF"), b: tc("#EAC4B4") }
  return { a: tc("#EFE8E2"), b: tc("#D8C7BC") }
}

const getRecipeCoverStyle = (r: FoodRecipe) => {
  const p = imagePalette(imageKind(r))
  return { backgroundColor: p.a, borderColor: p.b }
}
const getRecipeImageKey = (r: FoodRecipe) => {
  if (RECIPE_IMAGE_KEY_BY_ID[r.id]) return RECIPE_IMAGE_KEY_BY_ID[r.id]
  const kind = imageKind(r)
  if (kind === "Corba") return "corba"
  if (kind === "Salata") return "salata"
  if (kind === "Balik") return "balik"
  if (kind === "Makarna") return "makarna"
  if (kind === "Pilav") return "pilav"
  if (kind === "Tatli") return "tatli"
  if (kind === "Patlican") return "patlican"
  if (kind === "Kahvalti") return "kahvalti"
  if (kind === "Hamur işi") return "firin"
  if (kind === "Ana yemek") return "ana"
  return "yemek"
}
const getRecipeCoverMeta = (r: FoodRecipe) => LOCAL_COVER_META[getRecipeImageKey(r)] || LOCAL_COVER_META.yemek
const getRecipeCoverUri = (r: FoodRecipe) => {
  if (FOOD_LOCAL_IMAGE_MAP[r.id]) return FOOD_LOCAL_IMAGE_MAP[r.id]
  if (RECIPE_IMAGE_URI_BY_ID[r.id]) return RECIPE_IMAGE_URI_BY_ID[r.id]
  return r.img?.trim() || getRecipeCoverMeta(r).uri
}
const asImageSource = (s: any) => (typeof s === "string" ? { uri: s } : s)
const TR_WORD_FIXES: Record<string, string> = {
  corbasi: "çorbası",
  corba: "çorba",
  sogan: "soğan",
  sarmisak: "sarımsak",
  patlican: "patlıcan",
  yogurt: "yoğurt",
  suzme: "süzme",
  kasar: "kaşar",
  kiyma: "kıyma",
  yesil: "yeşil",
  kirmizi: "kırmızı",
  havuc: "havuç",
  misir: "mısır",
  feslegen: "fesleğen",
  cilek: "çilek",
  nar: "nar",
  eksisi: "ekşisi",
  zeytinyagli: "zeytinyağlı",
  firin: "fırın",
  firinda: "fırında",
  bugulama: "buğulama",
  acili: "acılı",
  yapimi: "yapımı",
  karisik: "karışık",
  kisir: "kısır",
  kahvalti: "kahvaltı",
  tabagi: "tabağı",
}
const TR_PHRASE_FIXES: Array<[string, string]> = [
  ["didik tavuk", "tavuk göğsü didiklenmiş"],
  ["kusbasi et", "dana kuşbaşı"],
  ["hindi", "hindi göğüs"],
  ["balik", "balık fileto"],
]
const toTrTitle = (raw: string) => {
  let lowered = raw.trim().toLocaleLowerCase("tr-TR")
  TR_PHRASE_FIXES.forEach(([from, to]) => {
    lowered = lowered.replaceAll(from, to)
  })
  const fixed = lowered
    .split(/\s+/)
    .map((w) => TR_WORD_FIXES[w] ?? w)
    .join(" ")
  return fixed
    .split(" ")
    .map((w) => (w ? w[0]!.toLocaleUpperCase("tr-TR") + w.slice(1) : w))
    .join(" ")
}
const normalizeIngredientLabel = (name: string) =>
  name
    .replace(/\([^)]*\)/g, " ")
    .replace(/[.,;:!?]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
const parseAmount = (amountText: string): { qty: number; unit: MarketUnit } => {
  const t = norm(amountText)
  const numMatch = t.match(/(\d+([.,]\d+)?)/)
  const qty = Math.max(1, Math.round(Number((numMatch?.[1] ?? "1").replace(",", ".")) || 1))
  if (t.includes("su bardagi")) return { qty, unit: "su bardağı" }
  if (t.includes("yemek kasigi")) return { qty, unit: "yemek kaşığı" }
  if (t.includes("cay kasigi")) return { qty, unit: "çay kaşığı" }
  if (t.includes(" ml")) return { qty, unit: "ml" }
  if (t.includes(" g")) return { qty, unit: "g" }
  return { qty, unit: "adet" }
}
const toMarketAmount = (name: string, qty: number, unit: MarketUnit): { qty: number; unit: MarketStoreUnit } => {
  const n = norm(name)
  const isLiquid =
    n.includes("su") ||
    n.includes("sut") ||
    n.includes("zeytinyagi") ||
    n.includes("aycicek yagi") ||
    n.includes("sivi yag") ||
    n.includes("sirke") ||
    n.includes("limon suyu")
  if (unit === "su bardağı") return { qty: Math.max(50, qty * 200), unit: "ml" }
  if (unit === "yemek kaşığı") {
    if (isLiquid) return { qty: Math.max(5, qty * 15), unit: "ml" }
    return { qty: Math.max(5, qty * 15), unit: "g" }
  }
  if (unit === "çay kaşığı") {
    if (isLiquid) return { qty: Math.max(1, qty * 5), unit: "ml" }
    return { qty: Math.max(1, qty * 4), unit: "g" }
  }
  return { qty, unit: unit === "adet" ? "adet" : unit }
}

export default function FoodScreen() {
  const { language } = useAppLanguage()
  const tr = language === "tr"
  const router = useRouter()
  const popularRef = useRef<ScrollView | null>(null)
  const pageRef = useRef<ScrollView | null>(null)

  const [meal, setMeal] = useState<Meal>("dinner")
  const [cat, setCat] = useState<Cat>("all")
  const [difficulty, setDifficulty] = useState<Difficulty>("all")
  const [servings, setServings] = useState(2)
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [history, setHistory] = useState<string[]>([])
  const [weeklyMenu, setWeeklyMenu] = useState<WeeklyMenuDay[]>([])
  const [checks, setChecks] = useState<Record<string, boolean>>({})
  const [wChecks, setWChecks] = useState<Record<string, boolean>>({})
  const [marketDraft, setMarketDraft] = useState<MarketDraftLine[]>([])
  const [marketDraftFrom, setMarketDraftFrom] = useState<"current" | "weekly" | null>(null)
  const [toast, setToast] = useState("")
  const [popularIndex, setPopularIndex] = useState(0)
  const [todayY, setTodayY] = useState(0)
  const displayText = (value: string) => (tr ? toTrTitle(value) : value)

  useEffect(() => {
    void (async () => {
      const raw = await AsyncStorage.getItem(STORAGE)
      if (!raw) return
      try {
        const d = JSON.parse(raw)
        setMeal(d.meal ?? "dinner")
        setCat(d.cat ?? "all")
        setDifficulty(d.difficulty ?? "all")
        setServings(Math.max(1, Math.min(8, Number(d.servings) || 2)))
        setCurrentId(d.currentId ?? null)
        setHistory(Array.isArray(d.history) ? d.history : [])
        setWeeklyMenu(Array.isArray(d.weeklyMenu) ? d.weeklyMenu : [])
        setChecks(d.checks ?? {})
        setWChecks(d.wChecks ?? {})
      } catch {}
    })()
  }, [])

  useEffect(() => {
    void AsyncStorage.setItem(STORAGE, JSON.stringify({ meal, cat, difficulty, servings, currentId, history, weeklyMenu, checks, wChecks }))
  }, [meal, cat, difficulty, servings, currentId, history, weeklyMenu, checks, wChecks])

  const filtered = useMemo(
    () =>
      [...FOOD_RECIPES.filter((r) => r.meal.includes(meal)).filter((r) => cat === "all" || r.cat.includes(cat))]
        .filter((r) => difficulty === "all" || recipeDifficulty(r.prep) === difficulty)
        .sort((a, b) => a.prep - b.prep),
    [meal, cat, difficulty]
  )
  const current = useMemo(() => FOOD_RECIPES.find((r) => r.id === currentId) ?? filtered[0] ?? null, [currentId, filtered])
  const popular = useMemo(() => [...FOOD_RECIPES].sort((a, b) => b.pop - a.pop).slice(0, 6), [])
  const popularEnterAnims = useRef<Animated.Value[]>([])
  const popularPressAnims = useRef<Record<string, Animated.Value>>({})
  const getPopularPressAnim = (id: string) => {
    return getOrCreatePressAnim(popularPressAnims, id)
  }
  useMemo(() => {
    return ensureEnterAnimArray(popularEnterAnims, popular.length)
  }, [popular.length])
  useEffect(() => {
    runStaggerEnter(popularEnterAnims)
  }, [popular.length])
  const quick = useMemo(() => FOOD_RECIPES.filter((r) => r.prep <= 20).slice(0, 8), [])
  const weekPlan = useMemo(
    () =>
      weeklyMenu.map((d) => ({
        soup: FOOD_RECIPES.find((r) => r.id === d.soupId) ?? null,
        main: FOOD_RECIPES.find((r) => r.id === d.mainId) ?? null,
        side: FOOD_RECIPES.find((r) => r.id === d.sideId) ?? null,
        salad: FOOD_RECIPES.find((r) => r.id === d.saladId) ?? null,
      })),
    [weeklyMenu]
  )
  const weekNeeds = useMemo(() => {
    const m = new Map<string, { name: string; qty: number; unit: MarketUnit }>()
    weekPlan.forEach((d) =>
      [d.soup, d.main, d.side, d.salad].forEach((r) =>
        r?.ing.forEach((i) => {
          const cleanName = normalizeIngredientLabel(i)
          const amount = parseAmount(ingredientAmountTr(i, servings))
          const k = `${norm(cleanName)}|${amount.unit}`
          const prev = m.get(k)
          if (prev) prev.qty += amount.qty
          else m.set(k, { name: cleanName, qty: amount.qty, unit: amount.unit })
        })
      )
    )
    return [...m.entries()].map(([k, v]) => ({ k, ...v }))
  }, [weekPlan, servings])
  const weekNeedsMarket = useMemo(() => {
    const map = new Map<string, { k: string; name: string; qty: number; unit: MarketStoreUnit }>()
    weekNeeds.forEach((i) => {
      const converted = toMarketAmount(i.name, i.qty, i.unit)
      const key = `${norm(i.name)}|${converted.unit}`
      const prev = map.get(key)
      if (prev) prev.qty += converted.qty
      else map.set(key, { k: key, name: i.name, qty: converted.qty, unit: converted.unit })
    })
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "tr"))
  }, [weekNeeds])

  const note = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2000) }

  const openWeekRecipe = (recipe: FoodRecipe | null) => {
    if (!recipe) return
    setCurrentId(recipe.id)
    setHistory((prev) => [recipe.id, ...prev.filter((h) => h !== recipe.id)].slice(0, 8))
    note(tr ? "Tarif detayda açıldı." : "Recipe opened in detail.")
  }

  const addMarket = async (lines: MarketDraftLine[]) => {
    const base = await loadMarketItems()
    const next: MarketItem[] = [...base]
    lines.forEach((l) => {
      const ex = next.find((i) => norm(i.name) === norm(l.name) && i.unit === l.unit)
      const q = Math.max(1, Math.round(l.qty))
      if (ex) ex.qty = (ex.qty || 1) + q
      else next.unshift({ id: `f-${Date.now()}-${Math.floor(Math.random() * 9999)}`, name: l.name, qty: q, unit: l.unit, price: 0, checked: false, createdAt: new Date().toISOString() })
    })
    await saveMarketItems(next)
    note(tr ? "Eksikler market listesine eklendi." : "Missing items added.")
  }

  const buildMarketDraft = (rows: Array<{ name: string; servingsCount: number }>) => {
    const map = new Map<string, MarketDraftLine>()
    rows.forEach((row) => {
      const cleanName = normalizeIngredientLabel(row.name)
      if (!cleanName) return
      const amountText = ingredientAmountTr(row.name, row.servingsCount)
      const parsed = parseAmount(amountText)
      const market = toMarketAmount(cleanName, parsed.qty, parsed.unit)
      const key = `${norm(cleanName)}|${market.unit}`
      const prev = map.get(key)
      if (prev) prev.qty += market.qty
      else map.set(key, { key, name: cleanName, qty: market.qty, unit: market.unit })
    })
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "tr"))
  }
  const prepareCurrentMissing = () => {
    if (!current) return
    const rows = current.ing
      .filter((i) => !checks[`c:${norm(i)}`])
      .map((name) => ({ name, servingsCount: servings }))
    const draft = buildMarketDraft(rows)
    if (!draft.length) return note(tr ? "Eklenebilecek eksik malzeme yok." : "No missing items to add.")
    setMarketDraft(draft)
    setMarketDraftFrom("current")
  }
  const prepareWeeklyMissing = () => {
    const draft = weekNeedsMarket
      .filter((i) => !wChecks[`w:${i.k}`])
      .map((i) => ({ key: i.k, name: i.name, qty: i.qty, unit: i.unit }))
    if (!draft.length) return note(tr ? "Eklenebilecek eksik malzeme yok." : "No missing items to add.")
    setMarketDraft(draft)
    setMarketDraftFrom("weekly")
  }
  const confirmDraftAdd = async () => {
    if (!marketDraft.length) return
    await addMarket(marketDraft)
    setMarketDraft([])
    setMarketDraftFrom(null)
  }
  const cancelDraft = () => {
    setMarketDraft([])
    setMarketDraftFrom(null)
  }

  const getWeeklyPools = () => {
    const base = FOOD_RECIPES.filter((r) => r.meal.includes(meal))
    const normTitle = (r: FoodRecipe) => norm(r.title)
    const isSoup = (r: FoodRecipe) => r.cat.includes("soup")
    const isSalad = (r: FoodRecipe) => {
      const t = normTitle(r)
      return t.includes("salata") || t.includes("cacik") || t.includes("haydari") || t.includes("piyaz")
    }
    const isSide = (r: FoodRecipe) => {
      const t = normTitle(r)
      return t.includes("pilav") || t.includes("makarna") || t.includes("kisir") || t.includes("kuskus") || t.includes("pure")
    }

    return {
      soupPool: FOOD_RECIPES.filter((r) => isSoup(r)),
      mainPool: base.filter((r) => !isSoup(r) && !isSalad(r) && !isSide(r)),
      sidePool: FOOD_RECIPES.filter((r) => isSide(r)),
      saladPool: FOOD_RECIPES.filter((r) => isSalad(r)),
    }
  }

  const pickFromPool = (pool: FoodRecipe[], used: Set<string>, excludeId?: string) => {
    const fresh = pool.filter((r) => !used.has(r.id) && r.id !== excludeId)
    const set = fresh.length ? fresh : pool.filter((r) => r.id !== excludeId)
    const safe = set.length ? set : pool
    const picked = safe[Math.floor(Math.random() * safe.length)]!
    used.add(picked.id)
    return picked.id
  }

  const createWeekly = () => {
    const { soupPool, mainPool, sidePool, saladPool } = getWeeklyPools()
    if (!soupPool.length || !mainPool.length || !sidePool.length || !saladPool.length) return setWeeklyMenu([])

    const used = new Set<string>()
    const next: WeeklyMenuDay[] = []
    for (let i = 0; i < 7; i += 1) {
      next.push({
        soupId: pickFromPool(soupPool, used),
        mainId: pickFromPool(mainPool, used),
        sideId: pickFromPool(sidePool, used),
        saladId: pickFromPool(saladPool, used),
      })
    }
    setWeeklyMenu(next)
  }

  const refreshWeeklyItem = (dayIndex: number, key: keyof WeeklyMenuDay) => {
    const { soupPool, mainPool, sidePool, saladPool } = getWeeklyPools()
    const pool = key === "soupId" ? soupPool : key === "mainId" ? mainPool : key === "sideId" ? sidePool : saladPool
    setWeeklyMenu((prev) => {
      if (!prev[dayIndex]) return prev
      const used = new Set<string>(prev.flatMap((d) => [d.soupId, d.mainId, d.sideId, d.saladId]))
      const currentId = prev[dayIndex]![key]
      const nextId = pickFromPool(pool, used, currentId)
      const next = [...prev]
      next[dayIndex] = { ...next[dayIndex]!, [key]: nextId }
      return next
    })
  }

  const removeWeeklyItem = (dayIndex: number, key: keyof WeeklyMenuDay) => {
    setWeeklyMenu((prev) => {
      if (!prev[dayIndex]) return prev
      const next = [...prev]
      next[dayIndex] = { ...next[dayIndex]!, [key]: "" as string }
      return next
    })
  }

  const weeklyText = () => {
    const days = tr ? ["Pzt", "Salı", "Çarş", "Perş", "Cuma", "Ctesi", "Pazar"] : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    const lines = [tr ? "Haftalık Yemek Planı" : "Weekly Meal Plan", `(${servings} kişi)`]
    weekPlan.forEach((d, i) => {
      lines.push(`${days[i]}:`)
      lines.push(`  - ${tr ? "Çorba" : "Soup"}: ${d.soup ? `${d.soup.title} (${d.soup.prep} dk)` : "-"}`)
      lines.push(`  - ${tr ? "Ana Yemek" : "Main"}: ${d.main ? `${d.main.title} (${d.main.prep} dk)` : "-"}`)
      lines.push(`  - ${tr ? "Ek Yemek" : "Side"}: ${d.side ? `${d.side.title} (${d.side.prep} dk)` : "-"}`)
      lines.push(`  - ${tr ? "Salata" : "Salad"}: ${d.salad ? `${d.salad.title} (${d.salad.prep} dk)` : "-"}`)
    })
    lines.push("", tr ? "Gerekli Malzemeler" : "Needed Ingredients")
    weekNeedsMarket.forEach((i) => lines.push(`- ${displayText(i.name)}: ${formatQtyUnitDisplay(i.name, i.qty, i.unit)}`))
    return lines.join("\n")
  }

  const recipeOneLine = (r: FoodRecipe) => {
    const ing = r.ing.slice(0, 10).map((i) => `${displayText(i)} (${ingredientDisplayAmountTr(i, servings)})`).join(", ")
    const steps = r.steps
      .map((s, idx) => `${idx + 1}. adım (${stepDurationTr(s, r.prep, r.steps.length)} dk): ${expandStepTr(s)}`)
      .join("; ")
    if (tr) {
      return `${r.title} için ${servings} kişilik gerekli malzemeler: ${ing}. Toplam tahmini hazırlama ve pişirme süresi ${r.prep} dakika. Hazırlığa başlamadan önce tüm malzemeleri tezgaha çıkarıp yıkama-doğrama işlemlerini tamamlaman tarifi çok daha rahat ilerletir. Pişirme aşamaları: ${steps}. Bu sırada tavanın/tencerenin ateşini çok yüksek tutmamak, malzemenin içini daha iyi pişirirken dışının kurumasını da önler. Eğer tarifte soğan, sarımsak ya da domates kullanıyorsan bu malzemeleri aşama aşama eklemek aromayı belirginleştirir; baharatı da en başta fazla vermek yerine sona doğru kontrollü eklemek daha dengeli bir tat sağlar. Kıvam gerektiren tariflerde (sos, çorba, püre gibi) küçük aralıklarla karıştırmak ve gerekirse bir miktar sıcak su eklemek tarifi kurtarır. Servis öncesi son bir tadım yapıp tuz-baharat-limon dengesini kendi zevkine göre ayarladığında, aynı tarifi her yaptığında daha da güzel bir sonuca ulaşırsın.`
    }
    return `For ${servings} servings of ${r.title}, you can use: ${ing}. Estimated total prep and cook time is ${r.prep} minutes. Before cooking, place and prep all ingredients so the flow stays easy and consistent. Cooking steps: ${steps}. Keep the heat at a controlled medium level so ingredients cook through without drying out, and build flavor gradually by adding aromatics and seasoning in stages instead of all at once. For texture-focused dishes (soups, sauces, purees), stir in short intervals and add small amounts of hot water if needed to reach the right consistency. Right before serving, do a final taste check and balance salt, spice, and acidity to your preference for a softer, more complete result.`
  }
  const shareWA = async () => {
    const text = weeklyText()
    const e = encodeURIComponent(text)
    const appUrl = `whatsapp://send?text=${e}`
    const webUrl = `https://wa.me/?text=${e}`
    try {
      if (Platform.OS !== "web" && await Linking.canOpenURL(appUrl)) return void (await Linking.openURL(appUrl))
      if (await Linking.canOpenURL(webUrl)) return void (await Linking.openURL(webUrl))
      await Share.share({ message: text })
    } catch {
      await Share.share({ message: text })
    }
  }

  const exportPdf = async () => {
    const text = weeklyText()
    if (Platform.OS === "web") {
      const w = (globalThis as any).open?.("", "_blank")
      if (w?.document) {
        w.document.write(`<html><body style="font-family:Arial;padding:24px;white-space:pre-wrap;">${text.replaceAll("\n", "<br/>")}</body></html>`)
        w.document.close()
        w.focus()
        w.print()
        return note(tr ? "Yazdır ekranında PDF seç." : "Use print > PDF.")
      }
    }
    await Share.share({ message: text })
  }

  const mealLabel = (m: Meal) => (tr ? (m === "breakfast" ? "Kahvaltı" : m === "lunch" ? "Öğle" : m === "dinner" ? "Akşam" : "Ara Öğün") : m)
  const catLabel = (c: Cat) => (tr ? (c === "all" ? "Hepsi" : c === "soup" ? "Sulu" : c === "oven" ? "Fırın" : c === "quick" ? "Pratik 20 dk" : "Çocuk") : c)
  const diffLabel = (d: Difficulty) => (tr ? (d === "all" ? "Hepsi" : d === "easy" ? "Kolay" : d === "medium" ? "Orta" : "Zor") : d)
  const recipeDiffLabel = (prep: number) => diffLabel(recipeDifficulty(prep))
  const goPopular = (delta: number) => {
    if (!popular.length) return
    const next = Math.max(0, Math.min(popular.length - 1, popularIndex + delta))
    setPopularIndex(next)
    popularRef.current?.scrollTo({ x: next * (POPULAR_CARD_W + POPULAR_GAP), animated: true })
  }
  const openRecipeFromPopular = (r: FoodRecipe, i: number) => {
    setCurrentId(r.id)
    setPopularIndex(i)
    popularRef.current?.scrollTo({ x: i * (POPULAR_CARD_W + POPULAR_GAP), animated: true })
    setHistory((prev) => [r.id, ...prev.filter((h) => h !== r.id)].slice(0, 8))
    setTimeout(() => pageRef.current?.scrollTo({ y: Math.max(0, todayY - 10), animated: true }), 70)
  }

  return (
    <ScrollView ref={pageRef} style={s.page} contentContainerStyle={s.content}>
      <View style={s.card}>
        <ImageBackground source={{ uri: HERO }} style={s.bg} imageStyle={s.bgImage} />
        <View style={s.overlay} pointerEvents="none" />
        <Text style={s.title}>{tr ? "Yemek Kesfi" : "Food Discovery"}</Text>

        <Text style={s.section}>{tr ? "Popüler Tarifler" : "Popular"}</Text>
        <ScrollView ref={popularRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.popularRow} snapToInterval={POPULAR_CARD_W + POPULAR_GAP} decelerationRate="fast" snapToAlignment="start" onScroll={(e) => { const x = e.nativeEvent.contentOffset.x; const idx = Math.round(x / (POPULAR_CARD_W + POPULAR_GAP)); if (idx !== popularIndex) setPopularIndex(Math.max(0, Math.min(popular.length - 1, idx))) }} scrollEventThrottle={16}>
          {popular.map((r, i) => (
            <Animated.View
              key={r.id}
              style={cardMotionStyle(popularEnterAnims.current[i]!, getPopularPressAnim(r.id), 12)}
            >
            <Pressable
              style={[s.popularCard, i === popularIndex ? s.popularCardActive : s.popularCardPassive]}
              onPressIn={() => pressIn(getPopularPressAnim(r.id))}
              onPressOut={() => pressOut(getPopularPressAnim(r.id))}
              onPress={() => openRecipeFromPopular(r, i)}
            >
              <ImageBackground source={asImageSource(getRecipeCoverUri(r))} style={[s.popularImage, s.localCover]} imageStyle={s.popularImageInner}>
                <View style={s.currentImgOverlay} />
                <View style={s.popularBadge}><Text style={s.popularBadgeText}>{r.prep} dk</Text></View>
                <View style={[s.popularBadge, s.popularDiffBadge]}><Text style={s.popularBadgeText}>{recipeDiffLabel(r.prep)}</Text></View>
                <View style={[s.coverTextWrap, getRecipeCoverStyle(r), s.coverTextWrapFloat]}>
                  <Text style={s.coverTitle} numberOfLines={2}>{displayText(r.title)}</Text>
                  <Text style={s.coverKind}>{getRecipeCoverMeta(r).label}</Text>
                </View>
              </ImageBackground>
              <View style={s.popularBody}>
                <Text style={s.listTitle}>{displayText(r.title)}</Text>
                <View style={s.popularMetaRow}>
                  <Text style={s.meta}>{tr ? "Popüler" : "Popular"} %{r.pop}</Text>
                  <Ionicons name="chevron-forward" size={16} color={tc("#5B4033")} />
                </View>
              </View>
            </Pressable>
            </Animated.View>
          ))}
        </ScrollView>
        <View style={s.dotRow}>{popular.map((_, i) => <View key={`popular-dot-${i}`} style={[s.dotItem, i === popularIndex && s.dotItemActive]} />)}</View>
        <View style={s.carouselControls}><Pressable style={[s.carouselBtn, popularIndex === 0 && s.carouselBtnDisabled]} onPress={() => goPopular(-1)} disabled={popularIndex === 0}><Ionicons name="chevron-back" size={16} color={popularIndex === 0 ? tc("#B8A59A") : moduleTheme.colors.textStrong} /></Pressable><Pressable style={[s.carouselBtn, popularIndex >= popular.length - 1 && s.carouselBtnDisabled]} onPress={() => goPopular(1)} disabled={popularIndex >= popular.length - 1}><Ionicons name="chevron-forward" size={16} color={popularIndex >= popular.length - 1 ? tc("#B8A59A") : moduleTheme.colors.textStrong} /></Pressable></View>

        <Text style={s.section}>{tr ? "Kişi Sayısı" : "Servings"}</Text>
        <View style={s.servRow}><Pressable style={s.servBtn} onPress={() => setServings((v) => Math.max(1, v - 1))}><Text style={s.servTxt}>-</Text></Pressable><Text style={s.servVal}>{servings}</Text><Pressable style={s.servBtn} onPress={() => setServings((v) => Math.min(8, v + 1))}><Text style={s.servTxt}>+</Text></Pressable></View>
        <View onLayout={(e) => setTodayY(e.nativeEvent.layout.y)}>
        <Text style={s.section}>{tr ? "Bugünün Önerisi" : "Today"}</Text>
        {current ? <View style={s.box}><ImageBackground source={asImageSource(getRecipeCoverUri(current))} style={[s.currentImg, s.localCover]} imageStyle={s.currentImgInner}><View style={s.currentImgOverlay} /><View style={[s.coverTextWrap, s.coverTextWrapLg, getRecipeCoverStyle(current)]}><Text style={s.coverTitle} numberOfLines={2}>{displayText(current.title)}</Text><Text style={s.coverKind}>{getRecipeCoverMeta(current).label}</Text></View></ImageBackground><Text style={s.h}>{displayText(current.title)}</Text><View style={s.metaLine}><Text style={s.meta}>{current.prep} dk | x{servings}</Text><View style={s.diffPill}><Text style={s.diffPillTxt}>{recipeDiffLabel(current.prep)}</Text></View></View>{current.ing.map((i) => { const k = `c:${norm(i)}`; const ch = !!checks[k]; return <Pressable key={k} style={[s.iRow, ch && s.iRowA]} onPress={() => setChecks((p) => ({ ...p, [k]: !ch }))}><Ionicons name={ch ? "checkbox" : "square-outline"} size={18} color={ch ? moduleTheme.colors.brand : moduleTheme.colors.textMuted} /><Text style={s.iTxt}>{displayText(i)}</Text><Text style={s.meta}>{ingredientDisplayAmountTr(i, servings)}</Text></Pressable> })}<Text style={s.measureHint}>{tr ? "Ölçü notu: 1 su bardağı ? 200 ml, 1 yemek kaşığı ? 15 ml, 1 çay kaşığı ? 5 ml." : "Measure note: 1 cup ? 200 ml, 1 tbsp ? 15 ml, 1 tsp ? 5 ml."}</Text><Pressable style={s.sBtn} onPress={prepareCurrentMissing}><Text style={s.sTxt}>{tr ? "Eksikleri Önizle ve Markete Ekle" : "Preview Missing"}</Text></Pressable><Text style={s.section}>{tr ? "Detaylı Tarif (Tek Satır)" : "Detailed Recipe (One Line)"}</Text><Text style={s.body}>{recipeOneLine(current)}</Text></View> : <Text style={s.body}>{tr ? "Tarif bulunamadı." : "No result."}</Text>}
        </View>

        <Text style={s.section}>{tr ? "Son Seçimler" : "Recent"}</Text>
        <View style={s.row}>{history.length ? history.map((id) => FOOD_RECIPES.find((r) => r.id === id)).filter(Boolean).map((r) => <Pressable key={r!.id} style={s.smallChip} onPress={() => setCurrentId(r!.id)}><Text style={s.smallTxt}>{displayText(r!.title)}</Text></Pressable>) : <Text style={s.body}>{tr ? "Henüz seçim yok." : "No picks yet."}</Text>}</View>

        <Text style={s.section}>{tr ? "Haftalık Menü" : "Weekly Menu"}</Text>
        <Pressable style={s.pBtn} onPress={createWeekly}><Text style={s.pTxt}>{weeklyMenu.length ? (tr ? "Menüyü Yenile" : "Refresh Menu") : (tr ? "Haftalık Menü Oluştur" : "Create Weekly Menu")}</Text></Pressable>
        {weekPlan.map((d, i) => (
          <View key={`menu-${i}`} style={s.weekMenu}>
            <View style={s.weekTop}><Text style={s.weekDay}>{(tr ? ["Pzt", "Salı", "Çarş", "Perş", "Cuma", "Ctesi", "Pazar"] : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"])[i]}</Text></View>
            <View style={s.weekLine}><Text style={s.weekLabel}>{tr ? "Çorba" : "Soup"}</Text><Pressable style={s.weekRecipeTap} onPress={() => openWeekRecipe(d.soup)} disabled={!d.soup}><Text style={[s.iTxt, !d.soup && s.iTxtMuted]}>{d.soup ? displayText(d.soup.title) : "-"}</Text></Pressable>{d.soup ? <View style={s.diffPill}><Text style={s.diffPillTxt}>{recipeDiffLabel(d.soup.prep)}</Text></View> : null}<Pressable style={s.weekActionBtn} onPress={() => refreshWeeklyItem(i, "soupId")}><Text style={s.weekActionTxt}>{tr ? "Yenile" : "Refresh"}</Text></Pressable><Pressable style={s.dayRemoveBtn} onPress={() => removeWeeklyItem(i, "soupId")}><Text style={s.dayRemoveTxt}>{tr ? "Kaldır" : "Remove"}</Text></Pressable></View>
            <View style={s.weekLine}><Text style={s.weekLabel}>{tr ? "Ana" : "Main"}</Text><Pressable style={s.weekRecipeTap} onPress={() => openWeekRecipe(d.main)} disabled={!d.main}><Text style={[s.iTxt, !d.main && s.iTxtMuted]}>{d.main ? displayText(d.main.title) : "-"}</Text></Pressable>{d.main ? <View style={s.diffPill}><Text style={s.diffPillTxt}>{recipeDiffLabel(d.main.prep)}</Text></View> : null}<Pressable style={s.weekActionBtn} onPress={() => refreshWeeklyItem(i, "mainId")}><Text style={s.weekActionTxt}>{tr ? "Yenile" : "Refresh"}</Text></Pressable><Pressable style={s.dayRemoveBtn} onPress={() => removeWeeklyItem(i, "mainId")}><Text style={s.dayRemoveTxt}>{tr ? "Kaldır" : "Remove"}</Text></Pressable></View>
            <View style={s.weekLine}><Text style={s.weekLabel}>{tr ? "Ek" : "Side"}</Text><Pressable style={s.weekRecipeTap} onPress={() => openWeekRecipe(d.side)} disabled={!d.side}><Text style={[s.iTxt, !d.side && s.iTxtMuted]}>{d.side ? displayText(d.side.title) : "-"}</Text></Pressable>{d.side ? <View style={s.diffPill}><Text style={s.diffPillTxt}>{recipeDiffLabel(d.side.prep)}</Text></View> : null}<Pressable style={s.weekActionBtn} onPress={() => refreshWeeklyItem(i, "sideId")}><Text style={s.weekActionTxt}>{tr ? "Yenile" : "Refresh"}</Text></Pressable><Pressable style={s.dayRemoveBtn} onPress={() => removeWeeklyItem(i, "sideId")}><Text style={s.dayRemoveTxt}>{tr ? "Kaldır" : "Remove"}</Text></Pressable></View>
            <View style={s.weekLine}><Text style={s.weekLabel}>{tr ? "Salata" : "Salad"}</Text><Pressable style={s.weekRecipeTap} onPress={() => openWeekRecipe(d.salad)} disabled={!d.salad}><Text style={[s.iTxt, !d.salad && s.iTxtMuted]}>{d.salad ? displayText(d.salad.title) : "-"}</Text></Pressable>{d.salad ? <View style={s.diffPill}><Text style={s.diffPillTxt}>{recipeDiffLabel(d.salad.prep)}</Text></View> : null}<Pressable style={s.weekActionBtn} onPress={() => refreshWeeklyItem(i, "saladId")}><Text style={s.weekActionTxt}>{tr ? "Yenile" : "Refresh"}</Text></Pressable><Pressable style={s.dayRemoveBtn} onPress={() => removeWeeklyItem(i, "saladId")}><Text style={s.dayRemoveTxt}>{tr ? "Kaldır" : "Remove"}</Text></Pressable></View>
          </View>
        ))}
        {!!weekPlan.length && <><Text style={s.section}>{tr ? "Haftalık Gerekli Malzemeler" : "Weekly Needed"}</Text>{weekNeedsMarket.map((i) => { const k = `w:${i.k}`; const ch = !!wChecks[k]; return <Pressable key={k} style={[s.iRow, ch && s.iRowA]} onPress={() => setWChecks((p) => ({ ...p, [k]: !ch }))}><Ionicons name={ch ? "checkbox" : "square-outline"} size={18} color={ch ? moduleTheme.colors.brand : moduleTheme.colors.textMuted} /><Text style={s.iTxt}>{displayText(i.name)}</Text><Text style={s.meta}>{formatQtyUnitDisplay(i.name, i.qty, i.unit)}</Text></Pressable> })}<Pressable style={s.sBtn} onPress={prepareWeeklyMissing}><Text style={s.sTxt}>{tr ? "Haftalık Eksikleri Önizle ve Markete Ekle" : "Preview Weekly Missing"}</Text></Pressable></>}
        {!!marketDraft.length && (
          <View style={s.box}>
            <Text style={s.section}>{tr ? "Market Önizleme" : "Market Preview"}</Text>
            <Text style={s.body}>
              {tr
                ? `${marketDraftFrom === "weekly" ? "Haftalık menüden" : "Bugünün tarifinden"} eklenecekler:`
                : `${marketDraftFrom === "weekly" ? "From weekly plan" : "From current recipe"}:`}
            </Text>
            {marketDraft.map((i) => (
              <View key={i.key} style={s.iRow}>
                <Ionicons name="add-circle-outline" size={18} color={moduleTheme.colors.textMuted} />
                <Text style={s.iTxt}>{displayText(i.name)}</Text>
                <Text style={s.meta}>{formatQtyUnitDisplay(i.name, i.qty, i.unit)}</Text>
              </View>
            ))}
            <View style={s.row}>
              <Pressable style={s.pBtn} onPress={() => void confirmDraftAdd()}>
                <Text style={s.pTxt}>{tr ? "Onayla ve Ekle" : "Confirm & Add"}</Text>
              </Pressable>
              <Pressable style={s.sBtn} onPress={cancelDraft}>
                <Text style={s.sTxt}>{tr ? "Vazgeç" : "Cancel"}</Text>
              </Pressable>
            </View>
          </View>
        )}
        <Pressable style={s.sBtn} onPress={() => router.push("/shopping/market")}><Text style={s.sTxt}>{tr ? "Market Listeme Git" : "Go Market List"}</Text></Pressable>
        {!!toast && <Text style={s.toast}>{toast}</Text>}
      </View>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  page: { ...moduleStyles.page, flex: 1 },
  content: { ...moduleStyles.content, maxWidth: 520, paddingBottom: 48 },
  card: {
    width: "100%",
    maxWidth: 540,
    alignSelf: "center",
    borderRadius: 22,
    overflow: "hidden",
    padding: 16,
    borderWidth: 1,
    borderColor: tc("#E8D9CE"),
    backgroundColor: tc("#FFF9F5"),
    shadowColor: tc("#3D2418"),
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  bg: { ...StyleSheet.absoluteFillObject },
  bgImage: { opacity: 0.56 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,248,241,0.63)" },
  title: { color: tc("#3F2A20"), fontSize: 31, lineHeight: 38, fontWeight: "600", letterSpacing: 0.2, marginBottom: 2 },
  subtitle: { color: moduleTheme.colors.textMuted, fontSize: 15, lineHeight: 22, marginTop: 4, marginBottom: 10 },
  section: {
    color: tc("#4C3125"),
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "600",
    marginTop: 10,
    marginBottom: 8,
    backgroundColor: "rgba(255,255,255,0.78)",
    borderWidth: 1,
    borderColor: tc("#F1E2D8"),
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {
    borderWidth: 1,
    borderColor: tc("#DDCBE9"),
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 42,
    justifyContent: "center",
    backgroundColor: tc("#F8F3FB"),
  },
  chipA: { borderColor: tc("#D7A89B"), backgroundColor: tc("#E8C3B9") },
  chipT: { color: tc("#3D2A4F"), fontSize: 14, fontWeight: "600" },
  input: {
    backgroundColor: "rgba(255,255,255,0.97)",
    borderWidth: 1,
    borderColor: tc("#DEC9B9"),
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 48,
    color: tc("#2F1E16"),
    fontSize: 16,
    zIndex: 2,
  },
  listTitle: { flex: 1, color: tc("#3F2D24"), fontSize: 15, fontWeight: "600" },
  popularRow: { paddingVertical: 3, paddingRight: 16, gap: 14 },
  popularCard: {
    width: 282,
    borderWidth: 1,
    borderColor: tc("#E8D8CB"),
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.98)",
    shadowColor: tc("#3E2618"),
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  popularCardActive: { opacity: 1, transform: [{ scale: 1 }] },
  popularCardPassive: { opacity: 0.78, transform: [{ scale: 0.97 }] },
  popularImage: { height: 178, justifyContent: "space-between" },
  popularImageInner: { borderTopLeftRadius: 18, borderTopRightRadius: 18, resizeMode: "cover" },
  popularOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.08)" },
  popularBadge: {
    alignSelf: "flex-start",
    marginTop: 10,
    marginLeft: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: tc("#EFE1D6"),
  },
  popularBadgeText: { color: moduleTheme.colors.textStrong, fontSize: 11, fontWeight: "600" },
  popularBody: { padding: 13, gap: 4 },
  popularMetaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  popularDiffBadge: { marginTop: 2, backgroundColor: "rgba(255,230,242,0.96)", borderWidth: 1, borderColor: tc("#F4BED6") },
  localCover: { borderTopLeftRadius: 16, borderTopRightRadius: 16, borderWidth: 1, borderColor: tc("#E8D8CB"), overflow: "hidden" },
  coverFallback: { alignItems: "flex-start", justifyContent: "flex-end", padding: 12, backgroundColor: tc("#F3E4D8"), borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  coverTextWrap: {
    alignSelf: "flex-start",
    margin: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.94)",
  },
  coverTextWrapLg: { marginBottom: 12 },
  coverTextWrapFloat: { marginTop: "auto", marginBottom: 10 },
  coverTitle: { color: moduleTheme.colors.textStrong, fontSize: 16, fontWeight: "600" },
  coverKind: { color: moduleTheme.colors.textMuted, fontSize: 12, fontWeight: "600", marginTop: 3 },
  dotRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 9, marginBottom: 5 },
  dotItem: { width: 7, height: 7, borderRadius: 99, backgroundColor: tc("#D9C7BD") },
  dotItemActive: { width: 19, backgroundColor: moduleTheme.colors.brand },
  carouselControls: { flexDirection: "row", justifyContent: "center", gap: 10, marginBottom: 7 },
  carouselBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: tc("#E4D1C7"),
    backgroundColor: tc("#F7ECE4"),
    alignItems: "center",
    justifyContent: "center",
  },
  carouselBtnDisabled: { backgroundColor: tc("#F1E7E0") },
  servRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  servBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: tc("#E4D1C7"),
    backgroundColor: tc("#F7ECE4"),
  },
  servTxt: { color: tc("#3D2A4F"), fontSize: 21, fontWeight: "600" },
  servVal: { minWidth: 32, textAlign: "center", color: moduleTheme.colors.textStrong, fontSize: 19, fontWeight: "600" },
  pBtn: {
    flex: 1,
    minHeight: 50,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 13,
    backgroundColor: moduleTheme.colors.brand,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    shadowColor: tc("#B2004A"),
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  pTxt: { color: tc("#FFF"), fontSize: 16, fontWeight: "600" },
  sBtn: {
    flex: 1,
    minHeight: 50,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: tc("#E4D1C7"),
    backgroundColor: "rgba(255,252,248,0.95)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  sTxt: { color: tc("#3D2A4F"), fontSize: 15, fontWeight: "600" },
  box: {
    borderWidth: 1,
    borderColor: tc("#E6D4C6"),
    borderRadius: 18,
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.93)",
    marginTop: 10,
    shadowColor: tc("#3E2A1E"),
    shadowOpacity: 0.11,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  h: { color: tc("#352019"), fontSize: 21, fontWeight: "600" },
  meta: { color: moduleTheme.colors.textMuted, fontSize: 12, fontWeight: "600" },
  body: { color: tc("#5F463A"), fontSize: 14, lineHeight: 21 },
  measureHint: {
    marginTop: 8,
    color: moduleTheme.colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
    backgroundColor: "rgba(255,255,255,0.78)",
    borderWidth: 1,
    borderColor: tc("#EEDFD5"),
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  currentImg: { height: 208, borderRadius: 14, overflow: "hidden", marginBottom: 10, justifyContent: "flex-end" },
  currentImgInner: { borderRadius: 14, resizeMode: "cover" },
  currentImgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.08)" },
  metaLine: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 3, gap: 8 },
  diffPill: { borderWidth: 1, borderColor: tc("#F4BED6"), backgroundColor: tc("#FFEAF3"), borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  diffPillTxt: { color: tc("#8D315B"), fontSize: 11, fontWeight: "600" },
  iRow: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: tc("#E8D8CB"),
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: tc("#FFFCF8"),
  },
  iRowA: { backgroundColor: tc("#FFEAF3"), borderColor: tc("#F4BED6") },
  iTxt: { flex: 1, color: tc("#3F2D24"), fontSize: 14, fontWeight: "600" },
  smallChip: {
    borderWidth: 1,
    borderColor: tc("#E5D4C7"),
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  smallTxt: { color: tc("#4F392F"), fontSize: 12, fontWeight: "600" },
  week: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: tc("#E8D8CB"),
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  weekMenu: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: tc("#E8D8CB"),
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.94)",
  },
  weekTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  weekDay: { color: moduleTheme.colors.textStrong, fontSize: 13, fontWeight: "600" },
  weekLine: { flexDirection: "row", alignItems: "center", gap: 8 },
  weekLabel: { width: 48, color: moduleTheme.colors.textMuted, fontSize: 12, fontWeight: "600" },
  weekRecipeTap: { flex: 1 },
  iTxtMuted: { opacity: 0.55 },
  weekActionBtn: { borderWidth: 1, borderColor: tc("#F4BED6"), backgroundColor: tc("#FFEAF3"), borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  weekActionTxt: { color: tc("#8D315B"), fontSize: 11, fontWeight: "600" },
  dayRemoveBtn: { borderWidth: 1, borderColor: tc("#E7D2C6"), backgroundColor: tc("#F8EEE7"), borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  dayRemoveTxt: { color: tc("#6B4A3C"), fontSize: 11, fontWeight: "600" },
  toast: { marginTop: 10, color: tc("#7A2F4D"), fontSize: 13, fontWeight: "600" },
})
















