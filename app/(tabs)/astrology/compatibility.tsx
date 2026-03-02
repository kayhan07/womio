import AsyncStorage from "@react-native-async-storage/async-storage"
import { useEffect, useMemo, useState } from "react"
import { Alert, ImageBackground, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { moduleStyles, moduleTheme } from "@/src/theme/moduleStyles"
import { tc } from "@/src/theme/tokens"

const COMPAT_IMAGE_URI = "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1200&q=80"
const USER_PROFILE_KEY = "womio:userProfile"
const COMPAT_HISTORY_KEY = "womio:astrology:compatibilityHistory"

type SignMeta = {
  name: string
  element: "ates" | "toprak" | "hava" | "su"
}

type CompatibilityRecord = {
  id: string
  createdAt: string
  partnerName: string
  mySign: string
  partnerSign: string
  total: number
}

type PairLibraryItem = {
  strengths: string
  caution: string
  dynamicFocus: string
  dynamicPlan: string
  premiumNarratives: string[]
}

const signMeta: SignMeta[] = [
  { name: "Ko\u00e7", element: "ates" },
  { name: "Bo\u011fa", element: "toprak" },
  { name: "\u0130kizler", element: "hava" },
  { name: "Yenge\u00e7", element: "su" },
  { name: "Aslan", element: "ates" },
  { name: "Ba\u015fak", element: "toprak" },
  { name: "Terazi", element: "hava" },
  { name: "Akrep", element: "su" },
  { name: "Yay", element: "ates" },
  { name: "O\u011flak", element: "toprak" },
  { name: "Kova", element: "hava" },
  { name: "Bal\u0131k", element: "su" },
]

const signs = signMeta.map((s) => s.name)

const parseBirthDate = (input: string) => {
  const m = input.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return null
  const day = Number(m[1])
  const month = Number(m[2])
  if (day < 1 || day > 31 || month < 1 || month > 12) return null
  return { day, month }
}

const formatBirthDateInput = (input: string) => {
  const digits = input.replace(/\D/g, "").slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

const signFromDayMonth = (day: number, month: number) => {
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return "Ko\u00e7"
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return "Bo\u011fa"
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return "\u0130kizler"
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return "Yenge\u00e7"
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return "Aslan"
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return "Ba\u015fak"
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return "Terazi"
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return "Akrep"
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return "Yay"
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return "O\u011flak"
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return "Kova"
  return "Bal\u0131k"
}

const complementaryElements = new Set(["ates-hava", "hava-ates", "toprak-su", "su-toprak"])

const summaryHigh = [
  "Y\u00fcksek uyum var; ortak hedef belirledi\u011finizde ili\u015fki h\u0131zla g\u00fc\u00e7lenir.",
  "Do\u011fal bir ak\u0131\u015f yakal\u0131yorsunuz; birbirinize alan tan\u0131d\u0131k\u00e7a denge artar.",
  "Enerji uyumu g\u00fc\u00e7l\u00fc; net ileti\u015fimle uzun vadede sa\u011flam bir ba\u011f kurabilirsiniz.",
]

const summaryMid = [
  "Orta-iyi bir uyum var; k\u00fc\u00e7\u00fck farkl\u0131l\u0131klar do\u011fru y\u00f6netilirse ili\u015fkiyi besler.",
  "Uyum potansiyeli iyi; beklentileri a\u00e7\u0131k konu\u015fmak s\u00fcreci kolayla\u015ft\u0131r\u0131r.",
  "Temel dinamikler dengeli; d\u00fczenli geri bildirimle daha g\u00fc\u00e7l\u00fc bir ritim olu\u015fur.",
]

const summaryLow = [
  "Karakter farklar\u0131 belirgin; sab\u0131rl\u0131 ileti\u015fimle sa\u011fl\u0131kl\u0131 denge kurulabilir.",
  "Uyum i\u00e7in emek gerekiyor; net s\u0131n\u0131rlar ili\u015fkiye g\u00fcven kazand\u0131r\u0131r.",
  "Farkl\u0131 beklentiler var; haftal\u0131k k\u0131sa konu\u015fmalar kopuklu\u011fu azalt\u0131r.",
]

const strengthsByElement: Record<string, string> = {
  "ates-hava": "Birbirinizi motive eden h\u0131zl\u0131 ve yarat\u0131c\u0131 bir ileti\u015fim hatt\u0131n\u0131z var.",
  "hava-ates": "Birbirinizi motive eden h\u0131zl\u0131 ve yarat\u0131c\u0131 bir ileti\u015fim hatt\u0131n\u0131z var.",
  "toprak-su": "G\u00fcven ve sadakat odakl\u0131 ilerledi\u011finiz i\u00e7in ili\u015fki temeli sa\u011flam.",
  "su-toprak": "G\u00fcven ve sadakat odakl\u0131 ilerledi\u011finiz i\u00e7in ili\u015fki temeli sa\u011flam.",
  same: "Benzer ritimde hareket etmeniz, karar alma s\u00fcrecini kolayla\u015ft\u0131r\u0131yor.",
  mixed: "Farkl\u0131 bak\u0131\u015f a\u00e7\u0131lar\u0131n\u0131z birbirinizi tamamlayabilecek bir alan olu\u015fturuyor.",
}

const cautionsByElement: Record<string, string> = {
  "ates-su": "Duygusal ini\u015f \u00e7\u0131k\u0131\u015flarda tepki h\u0131z\u0131n\u0131 yava\u015flatmak ileti\u015fimi korur.",
  "su-ates": "Duygusal ini\u015f \u00e7\u0131k\u0131\u015flarda tepki h\u0131z\u0131n\u0131 yava\u015flatmak ileti\u015fimi korur.",
  "hava-toprak": "Plan odakl\u0131 taraf ile spontane taraf aras\u0131nda ortak tempo belirlemek gerekir.",
  "toprak-hava": "Plan odakl\u0131 taraf ile spontane taraf aras\u0131nda ortak tempo belirlemek gerekir.",
  default: "K\u0131r\u0131lma ya\u015fanmadan konu\u015fmak i\u00e7in haftal\u0131k k\u0131sa bir check-in faydal\u0131 olur.",
}

const signStrengthHints: Record<string, string> = {
  "Ko\u00e7": "kararl\u0131l\u0131k",
  "Bo\u011fa": "istikrar",
  "\u0130kizler": "esnek ileti\u015fim",
  "Yenge\u00e7": "duygusal destek",
  "Aslan": "motivasyon",
  "Ba\u015fak": "detayc\u0131 planlama",
  "Terazi": "denge kurma",
  "Akrep": "derin ba\u011f",
  "Yay": "pozitif enerji",
  "O\u011flak": "sorumluluk",
  "Kova": "yenilik\u00e7i bak\u0131\u015f",
  "Bal\u0131k": "empati",
}

const signCautionHints: Record<string, string> = {
  "Ko\u00e7": "acele karar",
  "Bo\u011fa": "inatla\u015fma",
  "\u0130kizler": "odak da\u011f\u0131n\u0131kl\u0131\u011f\u0131",
  "Yenge\u00e7": "duygusal i\u00e7e kapanma",
  "Aslan": "ego \u00e7at\u0131\u015fmas\u0131",
  "Ba\u015fak": "fazla ele\u015ftirel olma",
  "Terazi": "karars\u0131zl\u0131k",
  "Akrep": "g\u00fcven testleri",
  "Yay": "plans\u0131z hareket",
  "O\u011flak": "kat\u0131 kurallar",
  "Kova": "mesafeli ileti\u015fim",
  "Bal\u0131k": "s\u0131n\u0131r belirsizli\u011fi",
}

const signStyleHints: Record<string, string> = {
  "Ko\u00e7": "h\u0131zl\u0131 ve direkt",
  "Bo\u011fa": "sakin ve g\u00fcven odakl\u0131",
  "\u0130kizler": "merakl\u0131 ve ileti\u015fimci",
  "Yenge\u00e7": "duygusal ve koruyucu",
  "Aslan": "g\u00f6r\u00fcn\u00fcr ve motive edici",
  "Ba\u015fak": "planl\u0131 ve detayc\u0131",
  "Terazi": "dengeli ve uzla\u015ft\u0131r\u0131c\u0131",
  "Akrep": "derin ve yo\u011fun",
  "Yay": "\u00f6zg\u00fcr ve ne\u015feli",
  "O\u011flak": "sorumlu ve hedef odakl\u0131",
  "Kova": "yenilik\u00e7i ve ba\u011f\u0131ms\u0131z",
  "Bal\u0131k": "sezgisel ve \u015fefkatli",
}

const focusTemplates = [
  "{MY}-{PARTNER} e\u015fle\u015fmesinde ana denge, g\u00fcnl\u00fck ileti\u015fim ritmini ayn\u0131 hatta bulu\u015fturmak.",
  "{MY} ile {PARTNER} aras\u0131nda en \u00f6nemli kald\u0131ra\u00e7, beklentileri erken ve net konu\u015fmak.",
  "{MY}-{PARTNER} dinami\u011finde uyumu art\u0131ran nokta, karar anlar\u0131nda birlikte tempo belirlemek.",
  "{MY} ve {PARTNER} birlikteli\u011finde duygusal denge, k\u0131sa ama d\u00fczenli geri bildirimle g\u00fc\u00e7lenir.",
]

const planTemplates = [
  "Haftada 1 kez 20 dakikal\u0131k \"ili\u015fki check-in\" yap\u0131p \u00f6nceliklerinizi g\u00fcncelleyin.",
  "Ayda 2 ortak aktivite planlay\u0131p biri sakin, biri hareketli olacak \u015fekilde denge kÜrün.",
  "Tart\u0131\u015fma an\u0131nda 10 dakika mola + tekrar konu\u015fma kural\u0131 belirleyin.",
  "Haftal\u0131k mini hedef belirleyip (ileti\u015fim, zaman, destek) pazar g\u00fcn\u00fc birlikte de\u011ferlendirin.",
]

const premiumNarrativeTemplates = [
  "{MY} ve {PARTNER} birlikteli\u011finde temel tema, duygusal ritim ile g\u00fcnl\u00fck pratikleri ayn\u0131 hatta bulu\u015fturmak. {MY} taraf\u0131n\u0131n {MY_POWER} g\u00fcc\u00fc, {PARTNER} taraf\u0131n\u0131n {PARTNER_POWER} taraf\u0131yla birle\u015fti\u011finde ili\u015fki daha dengeli ilerliyor. Kritik nokta, {MY_RISK} ve {PARTNER_RISK} tetiklerini erken fark edip sakin bir dille konu\u015fabilmek.",
  "Bu e\u015fle\u015fmede uzun vadeli uyumu belirleyen unsur, beklentileri netle\u015ftirip birlikte karar ritmi olu\u015fturmak. {MY} taraf\u0131 daha \u00e7ok {MY_POWER} ile ili\u015fkiyi ta\u015f\u0131rken, {PARTNER} taraf\u0131 {PARTNER_POWER} ile dengeyi koruyor. Zaman zaman {MY_RISK} ve {PARTNER_RISK} kaynakl\u0131 gerilimler olsa da do\u011fru zamanda verilen k\u0131sa mola ili\u015fki kalitesini art\u0131r\u0131r.",
  "{MY}-{PARTNER} uyumunda g\u00fc\u00e7l\u00fc taraf, farkl\u0131 karakterleri ortak hedefe y\u00f6nlendirebilmeniz. {MY} taraf\u0131n\u0131n {MY_POWER} refleksi ile {PARTNER} taraf\u0131n\u0131n {PARTNER_POWER} refleksi birlikte \u00e7al\u0131\u015ft\u0131\u011f\u0131nda ba\u011f daha sa\u011flam hale gelir. Bu yap\u0131y\u0131 korumak i\u00e7in {MY_RISK} ve {PARTNER_RISK} d\u00f6ng\u00fcs\u00fcnde su\u00e7lama yerine \u00e7\u00f6z\u00fcm dili kullanmak gerekir.",
]

const buildPairLibrary = (): Record<string, PairLibraryItem> => {
  const lib: Record<string, PairLibraryItem> = {}
  signMeta.forEach((mine, i) => {
    signMeta.forEach((partner, j) => {
      const key = `${mine.name}|${partner.name}`
      const pairSeed = i * 29 + j * 17
      const myPower = signStrengthHints[mine.name] ?? "uyum"
      const partnerPower = signStrengthHints[partner.name] ?? "denge"
      const myRisk = signCautionHints[mine.name] ?? "ileti\u015fim kopuklu\u011fu"
      const partnerRisk = signCautionHints[partner.name] ?? "beklenti fark\u0131"
      const myElement = mine.element
      const partnerElement = partner.element
      const elementKey = `${myElement}-${partnerElement}`

      const baseStrength = myElement === partnerElement ? strengthsByElement.same : (strengthsByElement[elementKey] ?? strengthsByElement.mixed)
      const strengthTemplate = strengthTemplates[pairSeed % strengthTemplates.length]
      const strengths = `${baseStrength} ${strengthTemplate
        .replaceAll("{MY}", mine.name)
        .replaceAll("{PARTNER}", partner.name)
        .replaceAll("{MY_POWER}", myPower)
        .replaceAll("{PARTNER_POWER}", partnerPower)}`

      const baseCaution = cautionsByElement[elementKey] ?? cautionsByElement.default
      const cautionTemplate = cautionTemplates[pairSeed % cautionTemplates.length]
      const caution = `${baseCaution} ${cautionTemplate
        .replaceAll("{MY}", mine.name)
        .replaceAll("{PARTNER}", partner.name)
        .replaceAll("{MY_RISK}", myRisk)
        .replaceAll("{PARTNER_RISK}", partnerRisk)}`

      const focusTemplate = focusTemplates[pairSeed % focusTemplates.length]
      const dynamicFocus = focusTemplate
        .replaceAll("{MY}", mine.name)
        .replaceAll("{PARTNER}", partner.name)

      const dynamicPlan = planTemplates[pairSeed % planTemplates.length]
      const premiumNarratives = premiumNarrativeTemplates.map((template) =>
        template
          .replaceAll("{MY}", mine.name)
          .replaceAll("{PARTNER}", partner.name)
          .replaceAll("{MY_POWER}", myPower)
          .replaceAll("{PARTNER_POWER}", partnerPower)
          .replaceAll("{MY_RISK}", myRisk)
          .replaceAll("{PARTNER_RISK}", partnerRisk)
      )

      lib[key] = { strengths, caution, dynamicFocus, dynamicPlan, premiumNarratives }
    })
  })
  return lib
}

const strengthTemplates = [
  "{MY} taraf\u0131n\u0131n {MY_POWER} taraf\u0131 ile {PARTNER} taraf\u0131n\u0131n {PARTNER_POWER} taraf\u0131 birbirini tamamlay\u0131yor.",
  "{MY} ve {PARTNER} e\u015fle\u015fmesinde ili\u015fkinin lokomotifi {MY_POWER} + {PARTNER_POWER} dengesi oluyor.",
  "Bu kombinasyonda {MY} taraf\u0131n\u0131n {MY_POWER} enerjisi, {PARTNER} taraf\u0131n\u0131n {PARTNER_POWER} g\u00fcc\u00fcyle birlikte istikrarl\u0131 bir ak\u0131\u015f sa\u011fl\u0131yor.",
]

const cautionTemplates = [
  "{MY} taraf\u0131ndaki {MY_RISK} ve {PARTNER} taraf\u0131ndaki {PARTNER_RISK} ayn\u0131 anda tetiklenirse ileti\u015fim zorlanabilir.",
  "Bu e\u015fle\u015fmede kritik nokta: {MY_RISK} ile {PARTNER_RISK} d\u00f6ng\u00fcs\u00fcn\u00fc erken fark edip yava\u015flatmak.",
  "{MY} taraf\u0131 {MY_RISK} ya\u015fad\u0131\u011f\u0131nda, {PARTNER} taraf\u0131n\u0131n {PARTNER_RISK} tepkisi b\u00fcy\u00fcyebilir; burada k\u0131sa mola tekni\u011fi iyi \u00e7al\u0131\u015f\u0131r.",
]

const pairLibrary = buildPairLibrary()

const aiLeadTemplates = [
  "Bug\u00fcn enerjinizin ana tonu",
  "Bug\u00fcn ili\u015fkinizin ana oda\u011f\u0131",
  "Bug\u00fcn ba\u011f\u0131n\u0131z\u0131 g\u00fc\u00e7lendiren ba\u015fl\u0131k",
]

const aiActionTemplates = [
  "Ak\u015fam 10 dakikal\u0131k net bir konu\u015fma yap\u0131n.",
  "Birbirinize bug\u00fcn i\u00e7in tek bir net beklenti s\u00f6yleyin.",
  "G\u00fcn bitmeden k\u0131sa bir geri bildirim rutini yap\u0131n.",
]

const getDayOfYear = (date: Date) => {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date.getTime() - start.getTime()
  return Math.floor(diff / 86400000)
}

export default function AstrologyCompatibilityScreen() {
  const { width } = useWindowDimensions()
  const compact = width < 360

  const [mySign, setMySign] = useState(signs[0])
  const [partnerSign, setPartnerSign] = useState(signs[1])
  const [partnerBirthDate, setPartnerBirthDate] = useState("")
  const [partnerName, setPartnerName] = useState("")
  const [history, setHistory] = useState<CompatibilityRecord[]>([])

  useEffect(() => {
    const loadFromProfile = async () => {
      const raw = await AsyncStorage.getItem(USER_PROFILE_KEY)
      if (!raw) return
      try {
        const profile = JSON.parse(raw) as { birthDate?: string }
        if (!profile.birthDate) return
        const parsed = parseBirthDate(profile.birthDate)
        if (!parsed) return
        setMySign(signFromDayMonth(parsed.day, parsed.month))
      } catch {
        // ignore
      }
    }
    void loadFromProfile()
  }, [])

  useEffect(() => {
    const loadHistory = async () => {
      const raw = await AsyncStorage.getItem(COMPAT_HISTORY_KEY)
      if (!raw) return
      try {
        const parsed = JSON.parse(raw) as CompatibilityRecord[]
        setHistory(Array.isArray(parsed) ? parsed : [])
      } catch {
        setHistory([])
      }
    }
    void loadHistory()
  }, [])

  useEffect(() => {
    const parsed = parseBirthDate(partnerBirthDate)
    if (!parsed) return
    setPartnerSign(signFromDayMonth(parsed.day, parsed.month))
  }, [partnerBirthDate])

  const analysis = useMemo(() => {
    const daySeed = getDayOfYear(new Date())
    const a = signs.indexOf(mySign)
    const b = signs.indexOf(partnerSign)
    if (a < 0 || b < 0) {
      return {
        total: 50,
        communication: 50,
        emotion: 50,
        attraction: 50,
        summary: "Bur\u00e7 bilgisi eksik oldu\u011fu i\u00e7in n\u00f6tr bir de\u011ferlendirme g\u00f6steriliyor.",
        strengths: "A\u00e7\u0131k ileti\u015fim kurdu\u011funuzda h\u0131zl\u0131 uyum yakalayabilirsiniz.",
        caution: "Beklentileri ba\u015ftan konu\u015fmak yanl\u0131\u015f anlamalar\u0131 azalt\u0131r.",
        dynamicFocus: "\u00d6nce ileti\u015fim dilinizi, sonra ortak hedeflerinizi netle\u015ftirin.",
        dynamicPlan: "Haftada bir 20 dakikal\u0131k konu\u015fma rutini ili\u015fkiyi dengeler.",
        aiNarrative: "Sizin ba\u011f\u0131n\u0131zda ana tema netlik. Duygu ve beklentiyi ayn\u0131 c\u00fcmlede bulu\u015fturmak, ili\u015fkinin ritmini h\u0131zla toparlar.",
        aiAction: "Bug\u00fcn tek bir konu se\u00e7in ve 10 dakikal\u0131k yarg\u0131s\u0131z bir konu\u015fma yap\u0131n.",
        premiumNarrative: "Bu e\u015fle\u015fmede ili\u015fkiyi b\u00fcy\u00fcten ana unsur, duygu ve hedefleri ayn\u0131 \u00e7izgide tutabilmek. Net konu\u015fma, k\u0131sa geri bildirim ve d\u00fczenli ortak zaman plan\u0131, uyumu belirgin \u00f6l\u00e7\u00fcde g\u00fc\u00e7lendirir.",
      }
    }

    const diff = Math.abs(a - b)
    const ringDiff = Math.min(diff, 12 - diff)
    const myElement = signMeta[a].element
    const partnerElement = signMeta[b].element
    const pairKey = `${myElement}-${partnerElement}`

    const base = 84 - ringDiff * 8
    const elementBonus = myElement === partnerElement ? 8 : complementaryElements.has(pairKey) ? 10 : -4
    const total = Math.max(42, Math.min(96, base + elementBonus))

    const communication = Math.max(40, Math.min(96, total + (myElement === "hava" || partnerElement === "hava" ? 6 : -2)))
    const emotion = Math.max(38, Math.min(96, total + (myElement === "su" || partnerElement === "su" ? 7 : -3)))
    const attraction = Math.max(40, Math.min(96, total + (myElement === "ates" || partnerElement === "ates" ? 6 : 1)))

    const variantIndex = (a * 13 + b * 7) % 3
    const summaryPool = total >= 85 ? summaryHigh : total >= 65 ? summaryMid : summaryLow
    const summary = summaryPool[variantIndex]

    const myRisk = signCautionHints[mySign] ?? "ileti\u015fim kopuklu\u011fu"
    const partnerRisk = signCautionHints[partnerSign] ?? "beklenti fark\u0131"
    const pairSeed = a * 31 + b * 17 + daySeed

    const pairEntry = pairLibrary[`${mySign}|${partnerSign}`]
    const strengths = pairEntry?.strengths ?? "Bu e\u015fle\u015fmede uyum, a\u00e7\u0131k ileti\u015fimle g\u00fc\u00e7lenir."
    const caution = pairEntry?.caution ?? "Beklentileri net konu\u015fmak dengeyi korur."

    const dynamicFocus = pairEntry?.dynamicFocus ?? `${mySign} ve ${partnerSign} i\u00e7in ileti\u015fim ritmini sabitlemek en kritik ad\u0131m.`
    const dynamicPlan =
      (pairEntry?.dynamicPlan ?? "Haftal\u0131k k\u0131sa bir check-in plan\u0131 yap\u0131n.") +
      ` ${myRisk} / ${partnerRisk} tetiklerinde k\u0131sa mola tekni\u011fini kullan\u0131n.`
    const premiumNarrative = pairEntry?.premiumNarratives[pairSeed % 3] ?? `${mySign} ve ${partnerSign} birlikteli\u011finde ileti\u015fim ritmini korumak uzun vadeli uyumu g\u00fc\u00e7lendirir.`

    const myStyle = signStyleHints[mySign] ?? "dengeli"
    const partnerStyle = signStyleHints[partnerSign] ?? "uyumlu"
    const safePartner = partnerName.trim() || "partnerin"
    const intensity = total >= 80 ? "olduk\u00e7a g\u00fc\u00e7l\u00fc" : total >= 65 ? "geli\u015ftimeye a\u00e7\u0131k" : "dikkat isteyen"

    const lead = aiLeadTemplates[pairSeed % aiLeadTemplates.length]
    const dailyActionTail = aiActionTemplates[pairSeed % aiActionTemplates.length]

    const aiNarrative = `${lead}, ${mySign} taraf\u0131n\u0131n ${myStyle} tavr\u0131 ile ${partnerSign} taraf\u0131n\u0131n ${partnerStyle} tavr\u0131n\u0131 dengelemek. ${safePartner} ile arandaki enerji ${intensity} bir uyum veriyor. \u0130li\u015fkide ana kald\u0131ra\u00e7 noktan\u0131z, do\u011fru anda do\u011fru tonda ileti\u015fim kurmak.`
    const baseAction =
      communication >= emotion
        ? `Bug\u00fcn ${safePartner} ile tek bir hedef belirleyin ve bunu 3 net ad\u0131ma ay\u0131r\u0131n.`
        : `Bug\u00fcn ${safePartner} ile duygusal beklentileri konu\u015fup 1 ortak s\u0131n\u0131r belirleyin.`
    const aiAction = `${baseAction} ${dailyActionTail}`

    return { total, communication, emotion, attraction, summary, strengths, caution, dynamicFocus, dynamicPlan, aiNarrative, aiAction, premiumNarrative }
  }, [mySign, partnerSign, partnerName])

  const saveCompatibility = async () => {
    const safeName = partnerName.trim() || "Partner"
    const next: CompatibilityRecord = {
      id: String(Date.now()),
      createdAt: new Date().toISOString(),
      partnerName: safeName,
      mySign,
      partnerSign,
      total: analysis.total,
    }
    const nextList = [next, ...history].slice(0, 20)
    setHistory(nextList)
    await AsyncStorage.setItem(COMPAT_HISTORY_KEY, JSON.stringify(nextList))
    Alert.alert("Kaydedildi", "Uyum sonucu ge\u00e7mi\u015fe eklendi.")
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.container, compact && styles.containerCompact, styles.scrollWithSticky]}>
        <View style={styles.content}>
          <View style={styles.card}>
          <View pointerEvents="none" style={styles.bgWrap}>
            <ImageBackground source={{ uri: COMPAT_IMAGE_URI }} style={styles.bgWrap} imageStyle={styles.bgImage} />
          </View>
          <View pointerEvents="none" style={styles.bgOverlay} />
          <View pointerEvents="none" style={styles.warmBlobOne} />
          <View pointerEvents="none" style={styles.warmBlobTwo} />
          <View pointerEvents="none" style={styles.zodiacMark}>
            <Ionicons name="planet-outline" size={34} color="rgba(255,255,255,0.92)" />
            <Text style={styles.zodiacMarkText}>{"ZODIAC"}</Text>
          </View>

          <View style={styles.headerBadge}>
            <Ionicons name="sparkles" size={13} color={tc("#7A2F4D")} />
            <Text style={styles.headerBadgeText}>{"\u0130L\u0130\u015eK\u0130 ANAL\u0130Z\u0130"}</Text>
          </View>
          <Text style={[styles.title, compact && styles.titleCompact]}>{"Bur\u00e7 Uyumu"}</Text>
          <Text style={styles.subtitle}>{"Kendi burcun profilinden otomatik gelir. Partner i\u00e7in bur\u00e7 se\u00e7 veya do\u011fum tarihi gir."}</Text>

          <View style={styles.metaRow}>
            <View style={styles.metaChip}><Text style={styles.metaLabel}>{"Sen"}</Text><Text style={styles.metaValue}>{mySign}</Text></View>
            <View style={styles.metaChip}><Text style={styles.metaLabel}>{"Partner"}</Text><Text style={styles.metaValue}>{partnerSign}</Text></View>
          </View>

          <Text style={styles.section}>{"Partner Ad\u0131"}</Text>
          <View style={styles.inputWrap}>
            <TextInput value={partnerName} onChangeText={setPartnerName} placeholder={"\u00d6rn: Ahmet"} placeholderTextColor={tc("#8A6A5D")} style={styles.input} />
          </View>

          <Text style={styles.section}>{"Partner Do\u011fum Tarihi (GG/AA/YYYY)"}</Text>
          <View style={styles.inputWrap}>
            <TextInput
              value={partnerBirthDate}
              onChangeText={(text) => setPartnerBirthDate(formatBirthDateInput(text))}
              placeholder={"\u00d6rn: 14/02/1995"}
              placeholderTextColor={tc("#8A6A5D")}
              style={styles.input}
              autoCapitalize="none"
              keyboardType="number-pad"
            />
          </View>

          <Text style={styles.section}>{"Partner Burcu"}</Text>
          <View style={styles.rowWrap}>
            {signs.map((sign) => (
              <Pressable key={`partner-${sign}`} style={[styles.chip, partnerSign === sign && styles.chipActive]} onPress={() => setPartnerSign(sign)}>
                <Text style={[styles.chipText, partnerSign === sign && styles.chipTextActive]}>{sign}</Text>
              </Pressable>
            ))}
          </View>

                    <View style={styles.heroPanel}>
            <View style={styles.scoreBox}>
              <Text style={styles.scoreText}>{`Genel Uyum: %${analysis.total}`}</Text>
              <Text style={styles.scoreSub}>{analysis.summary}</Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${analysis.total}%` }]} />
              </View>
            </View>

            <View style={styles.metricsRow}>
              <View style={[styles.metricCard, styles.metricCardPink]}>
                <View style={styles.metricHead}>
                  <View style={[styles.metricIconWrap, styles.metricIconWrapPink]}>
                    <Ionicons name="chatbubble-ellipses-outline" size={14} color={tc("#7A2F4D")} />
                  </View>
                </View>
                <Text style={styles.metricLabel}>{"\u0130leti\u015fim"}</Text>
                <Text style={styles.metricValue}>{`%${analysis.communication}`}</Text>
              </View>
              <View style={[styles.metricCard, styles.metricCardCream]}>
                <View style={styles.metricHead}>
                  <View style={[styles.metricIconWrap, styles.metricIconWrapCream]}>
                    <Ionicons name="heart-outline" size={14} color={tc("#7A4B2E")} />
                  </View>
                </View>
                <Text style={styles.metricLabel}>{"Duygusal"}</Text>
                <Text style={styles.metricValue}>{`%${analysis.emotion}`}</Text>
              </View>
              <View style={[styles.metricCard, styles.metricCardMint]}>
                <View style={styles.metricHead}>
                  <View style={[styles.metricIconWrap, styles.metricIconWrapMint]}>
                    <Ionicons name="flash-outline" size={14} color={tc("#2E6A53")} />
                  </View>
                </View>
                <Text style={styles.metricLabel}>{"\u00c7ekim"}</Text>
                <Text style={styles.metricValue}>{`%${analysis.attraction}`}</Text>
              </View>
            </View>
          </View>

          <View style={[styles.noteBox, styles.noteBoxRose]}>
            <Text style={styles.noteTitle}>{"G\u00fc\u00e7l\u00fc Y\u00f6n"}</Text>
            <Text style={styles.noteText}>{analysis.strengths}</Text>
          </View>
          <View style={[styles.noteBox, styles.noteBoxAlt, styles.noteBoxSand]}>
            <Text style={styles.noteTitle}>{"Dikkat Noktas\u0131"}</Text>
            <Text style={styles.noteText}>{analysis.caution}</Text>
          </View>
          <View style={[styles.noteBox, styles.noteBoxSky]}>
            <Text style={styles.noteTitle}>{"Detayl\u0131 Analiz"}</Text>
            <Text style={styles.noteText}>{analysis.dynamicFocus}</Text>
          </View>
          <View style={[styles.noteBox, styles.noteBoxAlt]}>
            <Text style={styles.noteTitle}>{"\u00d6nerilen Plan"}</Text>
            <Text style={styles.noteText}>{analysis.dynamicPlan}</Text>
          </View>
          <View style={styles.aiBox}>
            <Text style={styles.aiTitle}>{"AI Yorum"}</Text>
            <Text style={styles.aiText}>{analysis.aiNarrative}</Text>
            <Text style={styles.aiAction}>{analysis.aiAction}</Text>
          </View>
          <View style={styles.premiumBox}>
            <Text style={styles.premiumTitle}>{"Premium Derin Yorum"}</Text>
            <Text style={styles.premiumText}>{analysis.premiumNarrative}</Text>
          </View>

          <View style={styles.historyWrap}>
            <Text style={styles.historyTitle}>{"Uyum Ge\u00e7mi\u015fi"}</Text>
            {history.length === 0 ? (
              <Text style={styles.historyEmpty}>{"Hen\u00fcz kay\u0131t yok. Partner ad\u0131 girip \"Uyumu Ge\u00e7mi\u015fe Kaydet\" butonuna basarak burada saklayabilirsin."}</Text>
            ) : (
              history.slice(0, 5).map((item) => (
                <View key={item.id} style={styles.historyItem}>
                  <Text style={styles.historyLine}>{`${item.partnerName}: %${item.total}`}</Text>
                  <Text style={styles.historySub}>{`${item.mySign} \u2022 ${item.partnerSign} \u2022 ${new Date(item.createdAt).toLocaleDateString("tr-TR")}`}</Text>
                </View>
              ))
            )}
          </View>
          </View>
        </View>
      </ScrollView>
      <View style={styles.stickySaveWrap}>
        <Pressable style={styles.saveButton} onPress={() => void saveCompatibility()}>
          <Ionicons name="sparkles" size={16} color={moduleTheme.colors.textInverted} />
          <Text style={styles.saveButtonText}>{"Uyumu Ge\u00e7mi\u015fe Kaydet"}</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "transparent" },
  container: { ...moduleStyles.page },
  scrollWithSticky: { paddingBottom: 110 },
  containerCompact: { ...moduleStyles.pageCompact },
  content: { ...moduleStyles.content },
  card: {
    backgroundColor: "rgba(255,251,247,0.95)",
    borderWidth: 1,
    borderColor: tc("#E6D2C3"),
    borderRadius: 20,
    padding: 14,
    overflow: "hidden",
    position: "relative",
    shadowColor: tc("#8E5A45"),
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  bgWrap: { ...StyleSheet.absoluteFillObject },
  bgImage: { opacity: 0.44 },
  bgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,236,224,0.52)" },
  warmBlobOne: {
    position: "absolute",
    top: -36,
    right: -28,
    width: 170,
    height: 170,
    borderRadius: 999,
    backgroundColor: "rgba(255,112,167,0.2)",
  },
  warmBlobTwo: {
    position: "absolute",
    bottom: 110,
    left: -36,
    width: 170,
    height: 170,
    borderRadius: 999,
    backgroundColor: "rgba(255,173,102,0.17)",
  },
  zodiacMark: {
    position: "absolute",
    top: 14,
    right: 12,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.72)",
    backgroundColor: "rgba(255,0,102,0.32)",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  zodiacMarkText: {
    color: moduleTheme.colors.textInverted,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "600",
    letterSpacing: 0.8,
  },
  headerBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,0,102,0.24)",
    backgroundColor: "rgba(255,232,243,0.92)",
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  headerBadgeText: { color: tc("#7A2F4D"), fontSize: 10, lineHeight: 14, fontWeight: "600", letterSpacing: 0.5 },
  title: { color: tc("#3F231A"), fontSize: 22, lineHeight: 28, fontWeight: "600" },
  titleCompact: { fontSize: 18, lineHeight: 24 },
  subtitle: { marginTop: 4, marginBottom: 10, color: tc("#744E3F"), fontSize: 13, lineHeight: 18, fontWeight: "600" },
  headerGlow: { height: 8, borderRadius: 999, backgroundColor: "rgba(255,0,102,0.12)", marginBottom: 10, borderWidth: 1, borderColor: "rgba(255,0,102,0.22)" },
  metaRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  metaChip: { flex: 1, borderRadius: 10, borderWidth: 1, borderColor: tc("#EBCFC0"), backgroundColor: "rgba(255,250,247,0.92)", padding: 8 },
  metaLabel: { color: tc("#7F5F52"), fontSize: 11, lineHeight: 16, fontWeight: "600" },
  metaValue: { color: moduleTheme.colors.textStrong, fontSize: 15, lineHeight: 20, fontWeight: "600", marginTop: 2 },
  section: { color: tc("#6F5246"), fontSize: 13, lineHeight: 18, fontWeight: "600", marginBottom: 6 },
  inputWrap: { borderRadius: 11, borderWidth: 1, borderColor: tc("#E9D2C6"), backgroundColor: "rgba(255,255,255,0.94)", paddingHorizontal: 10, marginBottom: 10 },
  input: { minHeight: 42, color: moduleTheme.colors.textStrong, fontSize: 14, lineHeight: 19, fontWeight: "600" },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, backgroundColor: tc("#FFF3EB"), borderWidth: 1, borderColor: tc("#E9D0C1") },
  chipActive: { backgroundColor: tc("#FFD8E9"), borderColor: tc("#FF8EBA") },
  chipText: { color: tc("#5E4032"), fontSize: 13, lineHeight: 18, fontWeight: "600" },
  chipTextActive: { color: tc("#4A2735"), fontWeight: "600" },
  heroPanel: { borderRadius: 16, borderWidth: 1, borderColor: tc("#F0C2D5"), backgroundColor: "rgba(255,241,248,0.97)", padding: 10, marginBottom: 10, shadowColor: tc("#A55A7B"), shadowOpacity: 0.13, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  scoreBox: { borderRadius: 13, borderWidth: 1, borderColor: tc("#FFB2D1"), backgroundColor: "rgba(255,234,244,0.99)", padding: 12, marginBottom: 10 },
  scoreText: { color: tc("#4A2735"), fontSize: 20, lineHeight: 25, fontWeight: "600" },
  scoreSub: { marginTop: 6, color: tc("#5F463A"), fontSize: 13, lineHeight: 18, fontWeight: "600" },
  progressTrack: { marginTop: 10, height: 8, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.7)", overflow: "hidden", borderWidth: 1, borderColor: tc("#F2CCE0") },
  progressFill: { height: "100%", backgroundColor: moduleTheme.colors.brand, borderRadius: 999 },
  metricsRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  metricCard: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: tc("#EBCFC0"), backgroundColor: "rgba(255,255,255,0.98)", paddingVertical: 9, paddingHorizontal: 9 },
  metricCardPink: { backgroundColor: tc("#FFF0F7"), borderColor: tc("#F4BDD8") },
  metricCardCream: { backgroundColor: tc("#FFF4EA"), borderColor: tc("#ECD1BA") },
  metricCardMint: { backgroundColor: tc("#FFF1E8"), borderColor: tc("#EBCDBE") },
  metricHead: { flexDirection: "row", justifyContent: "flex-start", marginBottom: 4 },
  metricIconWrap: { width: 24, height: 24, borderRadius: 999, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  metricIconWrapPink: { backgroundColor: tc("#FFE7F2"), borderColor: tc("#F4BDD8") },
  metricIconWrapCream: { backgroundColor: tc("#FFF2E8"), borderColor: tc("#EED8C7") },
  metricIconWrapMint: { backgroundColor: tc("#FFE9DD"), borderColor: tc("#EBCDBE") },
  metricLabel: { color: tc("#7C5D50"), fontSize: 11, lineHeight: 15, fontWeight: "600" },
  metricValue: { color: tc("#3E2B22"), fontSize: 17, lineHeight: 22, fontWeight: "600", marginTop: 3 },
  saveButton: {
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: moduleTheme.colors.brand,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    shadowColor: tc("#B1004A"),
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  saveButtonText: { color: moduleTheme.colors.textInverted, fontSize: 15, lineHeight: 20, fontWeight: "600" },
  noteBox: { borderRadius: 12, borderWidth: 1, borderColor: tc("#E8D3C5"), backgroundColor: "rgba(255,255,255,0.96)", padding: 10, marginBottom: 8 },
  noteBoxRose: { backgroundColor: "rgba(255,244,250,0.96)", borderColor: tc("#F4BDD8") },
  noteBoxSand: { backgroundColor: "rgba(255,249,240,0.96)", borderColor: tc("#E9D7C7") },
  noteBoxSky: { backgroundColor: "rgba(255,239,232,0.96)", borderColor: tc("#F0D2C0") },
  noteBoxAlt: { marginBottom: 0 },
  noteTitle: { color: tc("#5E4336"), fontSize: 12, lineHeight: 17, fontWeight: "600" },
  noteText: { color: tc("#5F463A"), fontSize: 13, lineHeight: 19, fontWeight: "600", marginTop: 4 },
  aiBox: { marginTop: 10, borderRadius: 12, borderWidth: 1, borderColor: tc("#FFBCD7"), backgroundColor: "rgba(255,244,249,0.99)", padding: 10, shadowColor: tc("#A55A7B"), shadowOpacity: 0.09, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  aiTitle: { color: tc("#4A2735"), fontSize: 12, lineHeight: 17, fontWeight: "600" },
  aiText: { color: tc("#5F463A"), fontSize: 13, lineHeight: 19, fontWeight: "600", marginTop: 4 },
  aiAction: { color: tc("#7A2F4D"), fontSize: 12, lineHeight: 17, fontWeight: "600", marginTop: 6 },
  premiumBox: { marginTop: 10, borderRadius: 12, borderWidth: 1, borderColor: tc("#E6D4C7"), backgroundColor: "rgba(255,255,255,0.99)", padding: 10, shadowColor: tc("#8E5A45"), shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  premiumTitle: { color: tc("#5A3F32"), fontSize: 12, lineHeight: 17, fontWeight: "600" },
  premiumText: { color: tc("#5F463A"), fontSize: 13, lineHeight: 20, fontWeight: "600", marginTop: 4 },
  historyWrap: { marginTop: 12, borderRadius: 12, borderWidth: 1, borderColor: tc("#E8D3C5"), backgroundColor: "rgba(255,250,247,0.98)", padding: 10 },
  historyTitle: { color: tc("#5A3F32"), fontSize: 13, lineHeight: 18, fontWeight: "600", marginBottom: 6 },
  historyEmpty: { color: tc("#7C5D50"), fontSize: 12, lineHeight: 17, fontWeight: "600" },
  historyItem: { paddingVertical: 6, borderTopWidth: 1, borderTopColor: tc("#F0E2D8") },
  historyLine: { color: moduleTheme.colors.textStrong, fontSize: 13, lineHeight: 18, fontWeight: "600" },
  historySub: { color: moduleTheme.colors.textMuted, fontSize: 11, lineHeight: 16, fontWeight: "600", marginTop: 2 },
  stickySaveWrap: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 10,
    backgroundColor: "rgba(251,239,231,0.96)",
    borderRadius: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: "rgba(230,210,195,0.9)",
  },
})















