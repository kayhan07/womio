import AsyncStorage from "@react-native-async-storage/async-storage"
import * as Notifications from "expo-notifications"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  Animated,
  ImageBackground,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  Linking,
  Modal,
  View,
  useWindowDimensions,
} from "react-native"
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons"
import { Calendar, LocaleConfig } from "react-native-calendars"
import type { DateData } from "react-native-calendars"
import { useAppLanguage } from "@/src/core/i18n"
import { moduleStyles, moduleTheme } from "@/src/theme/moduleStyles"
import { tc } from "@/src/theme/tokens"

const STORAGE_KEY = "healthModuleV2"
const DEFAULT_CYCLE_LENGTH = 28
const PERIOD_LENGTH = 5
const DAY_MS = 1000 * 60 * 60 * 24
const PANIC_BREATH_TOTAL_ROUNDS = 3
const DIET_MEALS = ["breakfast", "lunch", "dinner", "snack"] as const
const HERO_IMAGE_URI =
  "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=1200&q=80"
const CYCLE_IMAGE_URI =
  "https://images.unsplash.com/photo-1460672985063-6764ac8b9c74?auto=format&fit=crop&w=1200&q=80"
const PREGNANCY_IMAGE_URI =
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=1200&q=80"
const MEDICINE_IMAGE_URI =
  "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=1200&q=80"
const WATER_IMAGE_URI =
  "https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=1200&q=80"
const DIET_IMAGE_URI =
  "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1200&q=80"
const STEPS_IMAGE_URI =
  "https://images.unsplash.com/photo-1538805060514-97d9cc17730c?auto=format&fit=crop&w=1200&q=80"
const BLOOD_PRESSURE_IMAGE_URI =
  "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1200&q=80"
const PANIC_IMAGE_URI =
  "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80"
const PANIC_MODAL_IMAGE_URI =
  "https://images.unsplash.com/photo-1508672019048-805c876b67e2?auto=format&fit=crop&w=1600&q=80"
const GROUNDING_MODAL_IMAGE_URI =
  "https://images.unsplash.com/photo-1472396961693-142e6e269027?auto=format&fit=crop&w=1600&q=80"

LocaleConfig.locales.tr = {
  monthNames: [
    "Ocak",
    "Şubat",
    "Mart",
    "Nisan",
    "Mayıs",
    "Haziran",
    "Temmuz",
    "Ağustos",
    "Eylül",
    "Ekim",
    "Kasım",
    "Aralık",
  ],
  monthNamesShort: ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"],
  dayNames: ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"],
  dayNamesShort: ["Paz", "Pts", "Sal", "Çar", "Per", "Cum", "Cts"],
  today: "Bugün",
}
LocaleConfig.locales.en = LocaleConfig.locales.en ?? {
  monthNames: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ],
  monthNamesShort: [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ],
  dayNames: [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ],
  dayNamesShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  today: "Today",
}

LocaleConfig.locales.de = {
  monthNames: [
    "Januar",
    "Februar",
    "Maerz",
    "April",
    "Mai",
    "Juni",
    "Juli",
    "August",
    "September",
    "Oktober",
    "November",
    "Dezember",
  ],
  monthNamesShort: [
    "Jan",
    "Feb",
    "Mrz",
    "Apr",
    "Mai",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Okt",
    "Nov",
    "Dez",
  ],
  dayNames: [
    "Sonntag",
    "Montag",
    "Dienstag",
    "Mittwoch",
    "Donnerstag",
    "Freitag",
    "Samstag",
  ],
  dayNamesShort: ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"],
  today: "Heute",
}

LocaleConfig.locales.ru = {
  monthNames: ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr"],
  monthNamesShort: ["Yan", "Fev", "Mar", "Apr", "May", "Iyn", "Iyl", "Avg", "Sen", "Okt", "Noy", "Dek"],
  dayNames: ["Voskresenye", "Ponedelnik", "Vtornik", "Sreda", "Chetverg", "Pyatnitsa", "Subbota"],
  dayNamesShort: ["Vs", "Pn", "Vt", "Sr", "Ch", "Pt", "Sb"],
  today: "Segodnya",
}

type MarkedDateMap = Record<string, { selected: boolean; selectedColor: string }>
type TestMarkedDateMap = Record<
  string,
  { selected?: boolean; selectedColor?: string; marked?: boolean; dotColor?: string }
>
type DayValueMap = Record<string, number>
type MealPart = (typeof DIET_MEALS)[number]
type MealChecks = Record<MealPart, boolean>
type MealChecksByDate = Record<string, MealChecks>
type MealSwapIndices = Record<string, number>
type DietGoal = "lose" | "maintain" | "gain"
type ActivityLevel = "low" | "medium" | "high"
type HealthTab = "cycle" | "pregnancy" | "medicine" | "water" | "steps" | "bloodPressure" | "panic" | "diet"
type MedicineItem = {
  id: string
  name: string
  time: string
  notificationId?: string
}
type BloodPressureEntry = {
  id: string
  systolic: number
  diastolic: number
  pulse?: number
  recordedAt: string
}
type PanicLogEntry = {
  id: string
  severity: number
  trigger: string
  helped: string
  recordedAt: string
}
type MedicineTakenByDate = Record<string, Record<string, boolean>>
type PregnancyChecklist = {
  water: boolean
  walk: boolean
  vitamin: boolean
  rest: boolean
  checkup: boolean
}
type PregnancyChecklistByDate = Record<string, PregnancyChecklist>
type PregnancySymptomKey = "nausea" | "sleep" | "energy" | "mood"
type PregnancySymptoms = Record<PregnancySymptomKey, number>
type PregnancySymptomsByDate = Record<string, PregnancySymptoms>
type PregnancyTestDoneMap = Record<string, boolean>
type PregnancyTestDateMap = Record<string, string>
type PregnancyTestNotificationMap = Record<string, string>
type PregnancyTestItem = {
  id: string
  title: string
  window: string
  note: string
}

type StoredData = {
  cycleHistory?: string[]
  pregnant?: boolean
  pregnancyWeek?: number
  medicines?: MedicineItem[]
  medicineTakenByDate?: MedicineTakenByDate
  medicineDailyCheckNotificationId?: string
  medicineDailyCheckTime?: string
  bloodPressureEntries?: BloodPressureEntry[]
  panicLogs?: PanicLogEntry[]
  panicEmergencyName?: string
  panicEmergencyPhone?: string
  waterTargetMl?: number
  waterDailyMl?: DayValueMap
  stepsTarget?: number
  pregnancyChecklistByDate?: PregnancyChecklistByDate
  pregnancySymptomsByDate?: PregnancySymptomsByDate
  pregnancyTestDone?: PregnancyTestDoneMap
  pregnancyTestDates?: PregnancyTestDateMap
  pregnancyTestNotificationIds?: PregnancyTestNotificationMap
  pregnancyAppointmentDate?: string
  pregnancyAppointmentTime?: string
  diet?: {
    age?: string
    heightCm?: string
    weightKg?: string
    goal?: DietGoal
    activity?: ActivityLevel
    mealChecks?: MealChecksByDate
    adherenceDaily?: DayValueMap
    mealSwapIndices?: MealSwapIndices
  }
}

const parseDateKey = (dateKey: string) => {
  const [year, month, day] = dateKey.split("-").map(Number)
  return new Date(year, month - 1, day, 12)
}

const formatDateKey = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

const addDays = (dateKey: string, days: number) => {
  const date = parseDateKey(dateKey)
  date.setDate(date.getDate() + days)
  return formatDateKey(date)
}

const getTodayKey = () => formatDateKey(new Date())

const getLastDateKeys = (count: number) => {
  const reSult: string[] = []
  const now = new Date()
  for (let i = count - 1; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(now.getDate() - i)
    reSult.push(formatDateKey(date))
  }
  return reSult
}

const weekdayShortMap = {
  tr: ["Pz", "Pt", "Sa", "Ca", "Pe", "Cu", "Ct"],
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  de: ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"],
  ru: ["Vs", "Pn", "Vt", "Sr", "Ct", "Pt", "Sb"],
} as const

const getShortDayLabel = (dateKey: string, language: "tr" | "en" | "de" | "ru") => {
  const labels = weekdayShortMap[language] ?? weekdayShortMap.tr
  return labels[parseDateKey(dateKey).getDay()]
}

const localeByLanguage: Record<"tr" | "en" | "de" | "ru", string> = {
  tr: "tr-TR",
  en: "en-US",
  de: "de-DE",
  ru: "ru-RU",
}

const groundingIdeasByLanguage: Record<"tr" | "en" | "de" | "ru", string[][]> = {
  tr: [
    ["Pencere", "Duvar", "Saat", "Kapı", "Tavan"],
    ["Koltuk", "Masanın kenarı", "Kıyafetin", "Telefon", "Yastık"],
    ["Kuş sesi", "Araba sesi", "Saat tik takı", "Rüzgar", "Kendi nefesin"],
    ["Kahve kokusu", "Sabun kokusu", "Parfüm", "Temiz hava", "Yemek kokusu"],
    ["Su", "Nane", "Meyve", "Sakız", "Çay"],
  ],
  en: [
    ["Window", "Wall", "Clock", "Door", "Ceiling"],
    ["Sofa", "Table edge", "Your clothes", "Phone", "Pillow"],
    ["Bird sound", "Car sound", "Clock tick", "Wind", "Your breath"],
    ["Coffee", "Soap", "Perfume", "Fresh air", "Food aroma"],
    ["Water", "Mint", "Fruit", "Gum", "Tea"],
  ],
  de: [
    ["Fenster", "Wand", "Uhr", "Tuer", "Decke"],
    ["Sofa", "Tischkante", "Kleidung", "Telefon", "Kissen"],
    ["Vogel", "Auto", "Uhr", "Wind", "Atem"],
    ["Kaffee", "Seife", "Parfuem", "Frische Luft", "Essen"],
    ["Wasser", "Minze", "Obst", "Kaugummi", "Tee"],
  ],
  ru: [
    ["Okno", "Stena", "Chasy", "Dver", "Potolok"],
    ["Divan", "Kraya stola", "Odezhda", "Telefon", "Podushka"],
    ["Ptitsy", "Mashina", "Tikanie chasov", "Veter", "Dykhanie"],
    ["Kofe", "Mylo", "Parfyum", "Svezhiy vozduh", "Zapah edy"],
    ["Voda", "Myata", "Frukt", "Zhevatelnaya rezinka", "Chay"],
  ],
}

const formatDateByLanguage = (dateKey: string, language: "tr" | "en" | "de" | "ru") =>
  parseDateKey(dateKey).toLocaleDateString(localeByLanguage[language] ?? "tr-TR")

const sortAndDedupeHistory = (history: string[]) =>
  Array.from(new Set(history)).sort(
    (a, b) => parseDateKey(b).getTime() - parseDateKey(a).getTime()
  )

const getPregnancyMilestone = (
  week: number,
  language: "tr" | "en" | "de" | "ru"
) => {
  if (language === "en") {
    if (week < 6) return "Early weeks. Rest and regular follow-up are important."
    if (week < 12) return "Baby heartbeat may have started."
    if (week < 20) return "Organ development speeds up."
    if (week < 28) return "Movements may become clearer."
    if (week < 36) return "Birth preparation period."
    return "Birth is getting close."
  }
  if (language === "de") {
    if (week < 6) return "Fruehe Wochen. Ruhe und regelmaessige Kontrolle sind wichtig."
    if (week < 12) return "Der Herzschlag des Babys kann begonnen haben."
    if (week < 20) return "Die Organentwicklung beschleunigt sich."
    if (week < 28) return "Bewegungen koennen deutlicher werden."
    if (week < 36) return "Vorbereitungsphase auf die Geburt."
    return "Die Geburt rueckt naeher."
  }
  if (language === "ru") {
    if (week < 6) return "Rannie nedeli. Vazhny otdykh i regulyarnyy kontrol."
    if (week < 12) return "Serdechko rebenka moglo uzhe nachat bitsya."
    if (week < 20) return "Razvitie organov uskorayetsya."
    if (week < 28) return "Dvizheniya mogut stat zametnee."
    if (week < 36) return "Period podgotovki k rodam."
    return "Rody uzhe blizko."
  }
  if (week < 6) return "Ilk haftalar. Dinlenme ve duzenli takip onemli."
  if (week < 12) return "Bebegin kalp atislari baslamis olabilir."
  if (week < 20) return "Organ gelisimi hizlanir."
  if (week < 28) return "Hareketler belirginlesebilir."
  if (week < 36) return "Doguma hazirlik donemi."
  return "Dogum yaklasiyor."
}

const getPregnancyDevelopmentDetail = (
  week: number,
  language: "tr" | "en" | "de" | "ru"
) => {
  if (language === "en") {
    if (week < 8) return "These are very early days. Keep water close, rest often and stick with folic acid."
    if (week < 14) return "You are closing the first trimester. Appetite can settle and gentle meals feel easier."
    if (week < 21) return "Energy often returns here. You may begin to notice soft movements."
    if (week < 29) return "Growth speeds up. Support your posture and give your back small breaks."
    if (week < 37) return "Preparation season. Build your hospital bag and breathing routine calmly."
    return "Final stretch. Slow down, breathe, and keep check-ins steady."
  }
  if (language === "de") {
    if (week < 8) return "Ganz am Anfang. Viel trinken, ruhen und Folsaeure hilft dir sehr."
    if (week < 14) return "Das 1. Trimester endet. Essen wird oft leichter und ruhiger."
    if (week < 21) return "Im 2. Trimester kommt haeufig mehr Energie. Bewegungen werden spuerbar."
    if (week < 29) return "Das WachsTüm nimmt zu. Achte auf Haltung und kleine Rueckenpausen."
    if (week < 37) return "Zeit der Vorbereitung. Kliniktasche und Atemroutine in Ruhe planen."
    return "Letzte Wochen. Tempo reduzieren, atmen, Kontrollen einhalten."
  }
  if (language === "ru") {
    if (week < 8) return "Sovsem ranniy period. Voda, otdyh i folievaya kislota tebe v pomoshch."
    if (week < 14) return "Konets 1 trimestra. Toksikoz mozhno pochuvstvovat menshe, est legche."
    if (week < 21) return "Vo 2 trimestre obychno bolshe energii, dvizheniya stanut zametnee."
    if (week < 29) return "Rost uskorayetsya. Beregi spinu i delai korotkie pereryvy."
    if (week < 37) return "Vremya podgotovki. Spokoyno sobiray Sumku i dyshi glubzhe."
    return "Финальные недели. Снизь темп, больше спокойствия и контроля."
  }
  if (week < 8) return "En baştaki hassas dönem. Su ve dinlenmeyi bol tut; folik asit de güzel destek olur."
  if (week < 14) return "İlk trimester kapanıyor. Miden rahatlayabilir; küçük ve dengeli öğünler iyi gelir."
  if (week < 21) return "İkinci trimesterde enerji toparlanır; minik hareketleri hissetmeye başlayabilirsin."
  if (week < 29) return "Büyüme hızlanır. Duruşuna nazik ol, beline sık sık mola ver."
  if (week < 37) return "Doğuma hazırlık zamanı. Çantanı yavaş yavaş toparla, nefesine güven."
  return "Son haftalar. Temponu düşür, nefesini dinle ve kontrollerini ihmal etme."
}

const getPregnancyDailyTips = (
  week: number,
  language: "tr" | "en" | "de" | "ru"
) => {
  const dayFactor = new Date().getDate() % 3
  if (language === "en") {
    const tips = [
      "Sip water through the day, not all at once.",
      "A short walk after meals can feel really good.",
      "Side sleeping with a pillow helps night comfort."
    ]
    const extra = week < 14 ? "Small, frequent meals can be kinder on your stomach." : week < 29 ? "Add a few gentle stretches for your back." : "Pick one small thing to prep for birth today."
    return [tips[dayFactor], tips[(dayFactor + 1) % 3], extra]
  }
  if (language === "de") {
    const tips = [
      "Wasser ueber den Tag verteilt trinken.",
      "Ein kurzer Spaziergang nach dem Essen tut gut.",
      "Seitenschlaf mit Kissen macht die Nacht bequemer."
    ]
    const extra = week < 14 ? "Kleine, haeufige Mahlzeiten helfen dem Magen." : week < 29 ? "Ein paar leichte Dehnungen entlasten den Ruecken." : "Heute eine kleine Geburtsvorbereitung machen."
    return [tips[dayFactor], tips[(dayFactor + 1) % 3], extra]
  }
  if (language === "ru") {
    const tips = [
      "Peyte vodu ravnomerno v techenie dnya.",
      "Korotkaya progulka posle edy byvaet ochen polezna.",
      "Son na boku s podushkoy uluchshaet komfort."
    ]
    const extra = week < 14 ? "Chashche i malenkiye porcii legche dlya zheludka." : week < 29 ? "Dobavte paru myagkikh rastyazheniy dlya spiny." : "Sdelayte odin malenkij shag k podgotovke k rodam."
    return [tips[dayFactor], tips[(dayFactor + 1) % 3], extra]
  }
  const tips = [
    "Suyu gün içine yayarak iç; kendine nazik ol.",
    "Yemekten sonra kısa bir yürüyüş sana iyi gelebilir.",
    "Yan yatış için bir destek yastığı geceni rahatlatır."
  ]
  const extra = week < 14 ? "Az ama sık, keyifli öğün miden için daha nazik olur." : week < 29 ? "Bel için birkaç hafif esneme çok iyi gelir." : "Bugün doğum hazırlığından küçük bir adım at, yeter."
  return [tips[dayFactor], tips[(dayFactor + 1) % 3], extra]
}

const getPregnancySizeEstimate = (week: number) => {
  if (week <= 8) return { lengthCm: "1.5 - 2.5", weightG: "1 - 2" }
  if (week <= 12) return { lengthCm: "5 - 7", weightG: "14 - 20" }
  if (week <= 16) return { lengthCm: "10 - 12", weightG: "90 - 120" }
  if (week <= 20) return { lengthCm: "16 - 20", weightG: "250 - 350" }
  if (week <= 24) return { lengthCm: "27 - 30", weightG: "550 - 700" }
  if (week <= 28) return { lengthCm: "34 - 37", weightG: "900 - 1200" }
  if (week <= 32) return { lengthCm: "39 - 42", weightG: "1400 - 1900" }
  if (week <= 36) return { lengthCm: "44 - 47", weightG: "2200 - 2800" }
  return { lengthCm: "48 - 52", weightG: "3000 - 3800" }
}

const getPregnancySizeDetail = (
  week: number,
  language: "tr" | "en" | "de" | "ru"
) => {
  if (language === "en") {
    if (week <= 8) return { compare: "A grape", note: "Tiny beginnings, the foundations are forming." }
    if (week <= 12) return { compare: "A lime", note: "Fingers and features are showing up one by one." }
    if (week <= 16) return { compare: "An avocado", note: "Bones strengthen and swallowing practice begins." }
    if (week <= 20) return { compare: "A banana", note: "Movements feel steadier and hearing develops." }
    if (week <= 24) return { compare: "An ear of corn", note: "Lungs keep maturing and skin reacts more." }
    if (week <= 28) return { compare: "An eggplant", note: "Eyes open and close; brain growth picks up." }
    if (week <= 32) return { compare: "A pineapple", note: "Breathing practice and sleep cycles appear." }
    if (week <= 36) return { compare: "A papaya", note: "Fat stores grow and baby settles lower." }
    return { compare: "A small watermelon", note: "Final growth and getting into birth position." }
  }
  if (language === "de") {
    if (week <= 8) return { compare: "Eine Traube", note: "Die Grundlagen entstehen gerade." }
    if (week <= 12) return { compare: "Eine Limette", note: "Finger und Gesichtszuege werden klarer." }
    if (week <= 16) return { compare: "Eine Avocado", note: "Knochen staerken sich, Schlucken beginnt." }
    if (week <= 20) return { compare: "Eine Banane", note: "Bewegungen werden regelmaessiger, Gehoer reift." }
    if (week <= 24) return { compare: "Ein Maiskolben", note: "Lungen reifen weiter, Haut reagiert mehr." }
    if (week <= 28) return { compare: "Eine Aubergine", note: "Augen bewegen sich, Gehirn waechst schneller." }
    if (week <= 32) return { compare: "Eine Ananas", note: "Atemuebungen und Schlafzyklen zeigen sich." }
    if (week <= 36) return { compare: "Eine Papaya", note: "Fettreserven nehmen zu, Baby senkt sich." }
    return { compare: "Eine kleine Wassermelone", note: "Letzter WachsTümsschub und Geburtsposition." }
  }
  if (language === "ru") {
    if (week <= 8) return { compare: "Vinograd", note: "Samye pervye shagi, osnova formiruetsya." }
    if (week <= 12) return { compare: "Laim", note: "Paltsy i cherty litsa stanovitsya zametnee." }
    if (week <= 16) return { compare: "Avokado", note: "Kosti ukreplyayutsya, nachinayetsya glotanie." }
    if (week <= 20) return { compare: "Banan", note: "Dvizheniya bolee stabilnye, slukh razvivaetsya." }
    if (week <= 24) return { compare: "Kukuruznyy pochatok", note: "Legkie zreyut, kozha stala chuvstvitelnee." }
    if (week <= 28) return { compare: "Baklazhan", note: "Glaza dvigayutsya, mozg rastet bystree." }
    if (week <= 32) return { compare: "Ananas", note: "Poyavlyayutsya uprazhneniya dykhaniya i sna." }
    if (week <= 36) return { compare: "Papayya", note: "Uvelichivayutsya zapasy zhira, rebenok opuskaetsya." }
    return { compare: "Malenkaya arbuz", note: "Finalnyy rost i podgotovka k pozu dlya rodov." }
  }
  if (week <= 8) return { compare: "Üzüm tanesi", note: "Minik ama çok hızlı bir başlangıç dönemi. Kalp ve sinir sistemi temelleri atılırken senin dinlenme, su ve folik asit rutinin çok kıymetli." }
  if (week <= 12) return { compare: "Limon", note: "Yüz hatları, kollar ve bacaklar belirginleşmeye başlar. İlk trimesterin sonuna yaklaşırken bulantılar azalabilir; az ama sık öğünler rahatlatır." }
  if (week <= 16) return { compare: "Avokado", note: "Kemik yapısı güçlenir, kas koordinasyonu artar. Bu dönemde hafif yürüyüşler ve düzenli uyku hem enerji hem bel rahatlığına destek olur." }
  if (week <= 20) return { compare: "Muz", note: "Bebek sesleri daha iyi algılamaya başlar ve hareketler belirginleşebilir. İlk tekmeleri hissetmek seni heyecanlandırabilir; küçük notlar almak güzel olur." }
  if (week <= 24) return { compare: "Mısır koçanı", note: "Akciğer gelişimi düzenli ilerler, cilt yapısı olgunlaşır. Su tüketimini artırmak ve duruşunu desteklemek gün içinde daha rahat hissettirebilir." }
  if (week <= 28) return { compare: "Patlıcan", note: "Beyin gelişimi hızlanır, uyku-uyanıklık döngüsü netleşir. Kısa dinlenme molaları ve nefes egzersizleri bu haftalarda iyi gelir." }
  if (week <= 32) return { compare: "Ananas", note: "Bebek büyümeye devam ederken hareketleri daha güçlü hissedebilirsin. Günlük ritmini sade tutup belini desteklemek konforunu artırır." }
  if (week <= 36) return { compare: "Papaya", note: "Yağ depoları artar ve bebek doğum pozisyonuna yaklaşır. Hastane çantası, ev planı ve destek listeni tamamlamak için ideal dönem." }
  return { compare: "Küçük karpuz", note: "Son haftalardasın; artık her gün bir adım daha yakınsın. Dinlenmeyi önceliklendirip belirtilerini takip ederek kendini güvende hissetmeye odaklan." }
}

const getPregnancyTrimester = (week: number) => {
  if (week <= 12) return 1
  if (week <= 27) return 2
  return 3
}

const formatDateDisplay = (date: Date) => {
  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

const getPregnancyFocus = (week: number, language: "tr" | "en" | "de" | "ru") => {
  if (language === "en") {
    if (week <= 12) return ["Hydration and folic acid routine", "Gentle protein-focused meals", "Calm sleep rhythm"]
    if (week <= 27) return ["Balanced carbs + protein", "Daily gentle walks", "Posture and back Support"]
    return ["Birth prep and breathing", "Smaller but frequent meals", "Rest and pelvic Support"]
  }
  if (language === "de") {
    if (week <= 12) return ["Wasser und Folsäure-Routine", "Leichte proteinreiche Mahlzeiten", "Ruhiger Schlafrhythmus"]
    if (week <= 27) return ["Ausgewogene Kohlenhydrate + Protein", "Taegliche leichte Spaziergaenge", "Haltung und Rueckenstuetze"]
    return ["Geburtsvorbereitung und Atmung", "Kleinere, haeufige Mahlzeiten", "Ruhe und Beckenentlastung"]
  }
  if (language === "ru") {
    if (week <= 12) return ["Voda i folievaya kislota", "Legkie belkovye priemy pishchi", "Spokoynyy rezhim sna"]
    if (week <= 27) return ["Balans uglevodov i belka", "Ezhednevnye legkie progulki", "Podderzhka osanki i spiny"]
    return ["Podgotovka k rodam i dyhanie", "Malenkie no chastye priemy pishchi", "Otdyh i podderzhka taza"]
  }
  if (week <= 12) return ["Su ve folik asit düzeni", "Hafif ve besleyici öğünler", "Sakin bir uyku ritmi"]
  if (week <= 27) return ["Dengeli karbonhidrat ve protein", "Her gün kısa bir yürüyüş", "Duruşuna ve beline destek"]
  return ["Doğuma hazırlık ve sakin nefes", "Az ama sık, keyifli öğün", "Dinlenme ve bedenine destek"]
}

const getPregnancyMomChanges = (week: number, language: "tr" | "en" | "de" | "ru") => {
  if (language === "en") {
    if (week <= 12) return ["Sensitivity and mild nausea can show up", "Energy can swing day to day", "Smell and taste changes are common"]
    if (week <= 27) return ["Energy often feels steadier", "Bump becomes more noticeable", "Skin may feel a bit drier"]
    return ["Shortness of breath can increase", "Back presSure grows", "Sleep becomes lighter"]
  }
  if (language === "de") {
    if (week <= 12) return ["Empfindlichkeit und leichte Uebelkeit moeglich", "Energie schwankt von Tag zu Tag", "Geruchs- und Geschmackssinn veraendern sich"]
    if (week <= 27) return ["Energie wird oft stabiler", "Der Bauch wird deutlicher", "Haut kann trockener sein"]
    return ["Atem wird kuerzer", "Rueckendruck nimmt zu", "Schlaf wird leichter"]
  }
  if (language === "ru") {
    if (week <= 12) return ["Chuvstvitelnost i legkaya toshnota vozmozhny", "Energiya mozhet kolebat'sya", "Zapah i vkus mogut menyatsya"]
    if (week <= 27) return ["Energiya chasto stabil'nee", "Zhivot stanovitssya zametnee", "Kozha mozhet byt Suhe"]
    return ["Mozhet byt otdyshka", "Davlenie na spinu raste", "Son stanovitsya bolee poverkhnostnym"]
  }
  if (week <= 12) return ["Hassasiyet ve hafif bulantı olabilir", "Enerjin gün gün değişebilir", "Koku ve tat değişimleri çok normaldir"]
  if (week <= 27) return ["Enerjin daha dengeli hissedilebilir", "Karın daha belirginleşir", "Cilt biraz daha kuru hissedilebilir"]
  return ["Nefes darlığı biraz artabilir", "Bel baskısı artabilir", "Uyku daha hafif olabilir"]
}

const getPregnancyNutritionTips = (week: number, language: "tr" | "en" | "de" | "ru") => {
  if (language === "en") {
    if (week <= 12) {
      return {
        prefer: ["Small frequent meals may ease nausea.", "Add folate-rich greens and eggs.", "Pair snacks with protein to keep energy stable."],
        avoid: ["Skipping long hours without food.", "Very spicy or heavy oily meals.", "Too much caffeine in a single day."],
      }
    }
    if (week <= 27) {
      return {
        prefer: ["Balance meals with protein + complex carbs.", "Include calcium sources like yogurt or kefir.", "Spread water intake across the day."],
        avoid: ["High-sugar snacks as a main meal.", "Very salty packaged foods.", "Low-water days."],
      }
    }
    return {
      prefer: ["Prefer lighter but nutrient-dense meals.", "Add fiber-rich foods to support digestion.", "Keep portions smaller but regular."],
      avoid: ["Excess salt and heavily processed food.", "Large late-night meals.", "Long periods of inactivity after eating."],
    }
  }
  if (language === "de") {
    if (week <= 12) {
      return {
        prefer: ["Kleine haeufige Mahlzeiten koennen Uebelkeit lindern.", "Folatreiche Gruenblaetter und Eier einbauen.", "Snacks mit Protein kombinieren fuer stabile Energie."],
        avoid: ["Lange Essenspausen.", "Sehr scharfe oder fettige Mahlzeiten.", "Zu viel Koffein pro Tag."],
      }
    }
    if (week <= 27) {
      return {
        prefer: ["Mahlzeiten mit Protein + komplexen Kohlenhydraten ausgleichen.", "Kalziumquellen wie Joghurt oder Kefir nutzen.", "Wasseraufnahme ueber den Tag verteilen."],
        avoid: ["Zuckerreiche Snacks als Hauptmahlzeit.", "Sehr salzige Fertigprodukte.", "Zu wenig Wasser."],
      }
    }
    return {
      prefer: ["Leichte aber naehrstoffreiche Mahlzeiten bevorzugen.", "Ballaststoffreiche Lebensmittel fuer die Verdauung einbauen.", "Kleinere aber regelmaessige Portionen essen."],
      avoid: ["Zu viel Salz und stark verarbeitete Produkte.", "Sehr spaete grosse Mahlzeiten.", "Langes Sitzen direkt nach dem Essen."],
    }
  }
  if (language === "ru") {
    if (week <= 12) {
      return {
        prefer: ["Chastye nebolshie priemy pishchi mogut snizit toshnotu.", "Dobavte produkty s folatami: zelen i yaytsa.", "Soedinyayte perekusy s belkom dlya stabilnoy energii."],
        avoid: ["Dolgih pereryvov bez edy.", "Ochen ostroy i tyazheloy pishchi.", "Izbytka kofeina za den."],
      }
    }
    if (week <= 27) {
      return {
        prefer: ["Balansiruyte obedy: belok + slozhnye uglevody.", "Dobavlyayte istochniki kaltsiya: yogurt ili kefir.", "Peyte vodu ravnomerno v techenie dnya."],
        avoid: ["Sladkih perekusov vmesto osnovnogo priema pishchi.", "Ochen solenykh gotovykh produktov.", "Nedostatka vody."],
      }
    }
    return {
      prefer: ["Predpochitayte legkuyu, no pitatelnuyu edu.", "Dobavte bolshe kletchatki dlya pishchevareniya.", "Est menshimi, no regulyarnymi porciyami."],
      avoid: ["Izbytka soli i pererabotannykh produktov.", "Pozdnikh tyazhelykh priemov pishchi.", "Dlitel'nogo sideniya posle edy."],
    }
  }
  if (week <= 12) {
    return {
      prefer: ["Bulantıyı azaltmak için az ama sık öğün tercih et.", "Folattan zengin yeşillik ve yumurta ekle.", "Ara öğüne protein ekleyerek enerjini dengede tut."],
      avoid: ["Uzun süre aç kalmak.", "Aşırı yağlı ve çok baharatlı öğünler.", "Günlük aşırı kafein tüketimi."],
    }
  }
  if (week <= 27) {
    return {
      prefer: ["Öğünlerini protein + kompleks karbonhidrat ile dengele.", "Yoğurt veya kefir gibi kalsiyum kaynaklarını düzenli tüket.", "Suyu gün içine yayarak iç."],
      avoid: ["Şekerli atıştırmalıkları ana öğün gibi tüketmek.", "Aşırı tuzlu paketli ürünler.", "Yetersiz su tüketimi."],
    }
  }
  return {
    prefer: ["Hafif ama besleyici öğünleri önceliklendir.", "Sindirim için lifli besinleri artır.", "Porsiyonları küçültüp düzenli aralıklarla tüket."],
    avoid: ["Fazla tuz ve işlenmiş ürünler.", "Gece geç ve ağır yemekler.", "Yemekten sonra uzun süre hareketsiz kalmak."],
  }
}

const getPregnancyTestPlan = (week: number, language: "tr" | "en" | "de" | "ru"): PregnancyTestItem[] => {
  const first: PregnancyTestItem[] = [
    {
      id: "first-blood",
      title: language === "tr" ? "Ilk kan tahlilleri" : language === "en" ? "Initial blood tests" : language === "de" ? "Erste Bluttests" : "Pervichnye analizy krovi",
      window: "8-12",
      note: language === "tr" ? "Kan grubu, hemogram ve temel degerler kontrol edilir." : language === "en" ? "Blood type, CBC and baseline values are checked." : language === "de" ? "Blutgruppe, Blutbild und Basiswerte werden geprueft." : "Proveryayutsya gruppa krovi, gemogramma i bazovye pokazateli.",
    },
    {
      id: "nt-screen",
      title: language === "tr" ? "Ilk trimester tarama" : language === "en" ? "First trimester screening" : language === "de" ? "Ersttrimester-Screening" : "Skrining pervogo trimestra",
      window: "11-14",
      note: language === "tr" ? "USG ve gerekli gorulurse ikili tarama ile risk degerlendirilir." : language === "en" ? "Ultrasound and optional double test for risk assessment." : language === "de" ? "Ultraschall und ggf. Ersttrimester-Test zur Risikoeinschaetzung." : "UZI i pri neobkhodimosti dvoynoy test dlya otsenki riskov.",
    },
  ]
  const second: PregnancyTestItem[] = [
    {
      id: "detailed-usg",
      title: language === "tr" ? "Detayli ultrason" : language === "en" ? "Detailed anatomy scan" : language === "de" ? "Feindiagnostischer Ultraschall" : "Detalnoye UZI",
      window: "18-22",
      note: language === "tr" ? "Bebegin organ gelisimi detayli olarak degerlendirilir." : language === "en" ? "Detailed review of organ development." : language === "de" ? "Detaillierte Beurteilung der Organentwicklung." : "Podrobno otsenivaetsya razvitie organov rebenka.",
    },
    {
      id: "glucose-test",
      title: language === "tr" ? "Gebelik seker taramasi" : language === "en" ? "Glucose screening" : language === "de" ? "Glukose-Screening" : "Skrining glyukozy",
      window: "24-28",
      note: language === "tr" ? "Gebelik sekeri riski icin OGTT planlanabilir." : language === "en" ? "OGTT may be planned for gestational diabetes risk." : language === "de" ? "OGTT kann fuer Schwangerschaftsdiabetes geplant werden." : "Mozhet byt zaplanirovan OGTT dlya riska gestatsionnogo diabeta.",
    },
  ]
  const third: PregnancyTestItem[] = [
    {
      id: "growth-follow",
      title: language === "tr" ? "Buyume ve pozisyon kontrolu" : language === "en" ? "Growth and position follow-up" : language === "de" ? "WachsTüms- und Lagekontrolle" : "Kontrol rosta i polozheniya",
      window: "32-36",
      note: language === "tr" ? "Bebegin kilo tahmini, pozisyonu ve amniyon degerlendirilir." : language === "en" ? "Estimated weight, position and amniotic fluid are checked." : language === "de" ? "Gewichtsschaetzung, Lage und Fruchtwasser werden kontrolliert." : "Otsenivayutsya ves, polozhenie i okoloplodnye vody.",
    },
    {
      id: "birth-plan",
      title: language === "tr" ? "Dogum plani gorusmesi" : language === "en" ? "Birth plan review" : language === "de" ? "Geburtsplan-Besprechung" : "Obsuzhdeniye plana rodov",
      window: "36-40",
      note: language === "tr" ? "Dogum belirtileri ve hastaneye basvuru zamani netlestirilir." : language === "en" ? "Labor signs and when to go to hospital are clarified." : language === "de" ? "Geburtsanzeichen und Klinikzeitpunkt werden geklaert." : "Utochnyayutsya priznaki rodov i vremya obrashcheniya v bolnitsu.",
    },
  ]
  if (week <= 13) return first
  if (week <= 27) return second
  return third
}

const getPregnancyDoctorQuestions = (week: number, language: "tr" | "en" | "de" | "ru") => {
  if (language === "en") {
    if (week <= 13) return ["Are my blood test values in expected range?", "Do I need any supplement adjustment?", "How can I better manage nausea and fatigue?"]
    if (week <= 27) return ["Is baby growth on track for this week?", "Do I need glucose screening now?", "What activity level is safest for me now?"]
    return ["Are there signs to watch for pre-labor?", "When should I go to hospital immediately?", "Is my birth plan realistic for current status?"]
  }
  if (language === "de") {
    if (week <= 13) return ["Liegen meine Blutwerte im erwarteten Bereich?", "Brauche ich eine Anpassung der Supplemente?", "Wie kann ich Uebelkeit und Muedigkeit besser steuern?"]
    if (week <= 27) return ["Ist das WachsTüm fuer diese Woche im Rahmen?", "Sollte jetzt ein Glukose-Screening erfolgen?", "Welches Aktivitaetsniveau ist jetzt sicher?"]
    return ["Welche Anzeichen sprechen fuer den Geburtsbeginn?", "Wann sollte ich sofort in die Klinik?", "Passt mein Geburtsplan zum aktuellen Verlauf?"]
  }
  if (language === "ru") {
    if (week <= 13) return ["V norme li moi analizy krovi?", "Nuzhna li korrektsiya dobavok?", "Kak luchshe spravlyatsya s toshnotoy i ustalostyu?"]
    if (week <= 27) return ["Sootvetstvuet li rost rebenka sroku?", "Nuzhen li mne skrining glyukozy seychas?", "Kakoy uroven aktivnosti seychas bezopasen?"]
    return ["Kakie priznaki ukazyvayut na nachalo rodov?", "Kogda nuzhno srochno ekhat v bolnitsu?", "Realen li moy plan rodov pri tekushchem sostoyanii?"]
  }
  if (week <= 13) return ["Kan tahlillerim beklenen aralikta mi?", "Takviyelerde degisiklik gerekiyor mu?", "Bulanti ve yorgunlugu nasil daha iyi yonetebilirim?"]
  if (week <= 27) return ["Bebegin buyumesi bu hafta icin uygun mu?", "Seker taramasi zamani geldi mi?", "Bu donemde en guvenli aktivite seviyesi nedir?"]
  return ["Dogumun yaklastigini gosteren belirtiler neler?", "Hangi durumda hemen hastaneye gitmeliyim?", "Dogum planim mevcut duruma uygun mu?"]
}

const getPregnancyMiniSuggestion = (week: number, language: "tr" | "en" | "de" | "ru") => {
  const dayFactor = new Date().getDate() % 3
  if (language === "en") {
    const early = ["Drink a glass of water right after waking up.", "Choose a lighter breakfast and eat slowly.", "Take a 10-minute gentle walk today."]
    const mid = ["Add a short stretching break for your back.", "Keep your posture soft while sitting.", "Pause for 2 minutes and breathe deeply."]
    const late = ["Prepare one small item for your birth bag.", "Rest with side support for 15 minutes.", "Track baby movements at a calm moment."]
    const pool = week <= 12 ? early : week <= 27 ? mid : late
    return pool[dayFactor]
  }
  if (language === "de") {
    const early = ["Nach dem Aufstehen ein Glas Wasser trinken.", "Leichtes Fruehstueck waehlen und langsam essen.", "Heute 10 Minuten sanft spazieren."]
    const mid = ["Eine kurze Ruecken-Dehnung einbauen.", "Beim Sitzen die Haltung weich halten.", "2 Minuten ruhig und tief atmen."]
    const late = ["Einen kleinen Punkt fuer die Kliniktasche vorbereiten.", "15 Minuten mit Seitenstuetze ausruhen.", "Bewegungen in ruhigem Moment beobachten."]
    const pool = week <= 12 ? early : week <= 27 ? mid : late
    return pool[dayFactor]
  }
  if (language === "ru") {
    const early = ["Srazu posle probuzhdeniya vypi stakan vody.", "Vybiraysya legkiy zavtrak i esh medlenno.", "Sdelai segodnya 10 minut myagkoy progulki."]
    const mid = ["Dobav korotkuyu rastyazhku dlya spiny.", "Derzhi myagkuyu osanku vo vremya sideniya.", "Sdelay 2 minuty glubokogo spokojnogo dyhaniya."]
    const late = ["Podgotov odin malenkij punkt dlya sumki v rod dom.", "Otdokhni 15 minut s oporoy na bok.", "Spokoyno otsledi dvizheniya rebenka."]
    const pool = week <= 12 ? early : week <= 27 ? mid : late
    return pool[dayFactor]
  }
  const early = ["Sabah uyanınca bir bardak su iç.", "Kahvaltıyı hafif seç ve yavaş ye.", "Bugün 10 dakikalık nazik bir yürüyüş yap."]
  const mid = ["Belin için kısa bir esneme molası ekle.", "Otururken duruşunu yumuşak tut.", "2 dakika sakin nefes egzersizi yap."]
  const late = ["Doğum çantası için küçük bir parça hazırla.", "Yan destekle 15 dakika dinlen.", "Sakin bir anda bebek hareketlerini takip et."]
  const pool = week <= 12 ? early : week <= 27 ? mid : late
  return pool[dayFactor]
}

const getPregnancySafetyNote = (language: "tr" | "en" | "de" | "ru") => {
  if (language === "en") {
    return "This is friendly guidance. If something feels unuSual or worrying, it is always okay to reach out to a healthcare professional."
  }
  if (language === "de") {
    return "Nur eine freundliche Orientierung. Wenn sich etwas ungewoehnlich oder beunruhigend anfuehlt, wende dich an medizinisches Fachpersonal."
  }
  if (language === "ru") {
    return "Eto druzheskoe orientirovanie. Esli chto-to kazhetsya neobychnym ili trevozhit, obratites k vrachu."
  }
  return "Bu bölüm dostça bir rehber. İçini huzurSuz eden bir şey olursa çekinmeden bir sağlık profesyoneline danışabilirsin."
}

const getPregnancySizeBadge = (week: number) => {
  if (week <= 8) return { icon: "fruit-grapes", color: tc("#F1D7F0") }
  if (week <= 12) return { icon: "fruit-citrus", color: tc("#F8F1C6") }
  if (week <= 16) return { icon: "avocado", color: tc("#D7F0D5") }
  if (week <= 20) return { icon: "food-apple", color: tc("#FBE8A6") }
  if (week <= 24) return { icon: "corn", color: tc("#F8E8C8") }
  if (week <= 28) return { icon: "eggplant", color: tc("#E6D8F6") }
  if (week <= 32) return { icon: "fruit-pineapple", color: tc("#F8E2B6") }
  if (week <= 36) return { icon: "fruit-cherries", color: tc("#FFE0B3") }
  return { icon: "fruit-watermelon", color: tc("#F9D6D6") }
}

const avgFromRangeText = (rangeText: string) => {
  const nums = rangeText.match(/\d+(\.\d+)?/g)?.map(Number) ?? []
  if (!nums.length) return 0
  if (nums.length === 1) return nums[0]
  return (nums[0] + nums[1]) / 2
}

const parseTime = (time: string) => {
  const [hourText, minuteText] = time.split(":")
  const hour = Number(hourText)
  const minute = Number(minuteText)
  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null
  }
  return { hour, minute }
}

const parseDateInput = (value: string) => {
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return null
  const day = Number(match[1])
  const month = Number(match[2])
  const year = Number(match[3])
  if (Number.isNaN(day) || Number.isNaN(month) || Number.isNaN(year)) return null
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const date = new Date(year, month - 1, day, 12)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }
  return date
}

const getDateKeyFromInput = (value: string) => {
  const parsed = parseDateInput(value)
  return parsed ? formatDateKey(parsed) : null
}

const formatDateInput = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

const formatTimeInput = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}:${digits.slice(2)}`
}

const clampTimeInput = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 4)
  if (digits.length === 3) {
    let hour = Number(digits.slice(0, 1))
    let minute = Number(digits.slice(1))
    if (Number.isNaN(hour)) hour = 0
    if (Number.isNaN(minute)) minute = 0
    hour = Math.min(Math.max(hour, 0), 23)
    minute = Math.min(Math.max(minute, 0), 59)
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
  }
  if (digits.length < 4) return formatTimeInput(value)
  let hour = Number(digits.slice(0, 2))
  let minute = Number(digits.slice(2))
  if (Number.isNaN(hour)) hour = 0
  if (Number.isNaN(minute)) minute = 0
  hour = Math.min(Math.max(hour, 0), 23)
  minute = Math.min(Math.max(minute, 0), 59)
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
}

const finalizeTimeInput = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 4)
  if (!digits) return ""
  if (digits.length <= 2) {
    let hour = Number(digits)
    if (Number.isNaN(hour)) hour = 0
    hour = Math.min(Math.max(hour, 0), 23)
    return `${String(hour).padStart(2, "0")}:00`
  }
  return clampTimeInput(digits)
}

const defaultMeals = (): MealChecks => ({
  breakfast: false,
  lunch: false,
  dinner: false,
  snack: false,
})
const defaultPregnancyChecklist = (): PregnancyChecklist => ({
  water: false,
  walk: false,
  vitamin: false,
  rest: false,
  checkup: false,
})
const defaultPregnancySymptoms = (): PregnancySymptoms => ({
  nausea: 3,
  sleep: 3,
  energy: 3,
  mood: 3,
})

const calcDiet = (
  age: number,
  heightCm: number,
  weightKg: number,
  activity: ActivityLevel,
  goal: DietGoal
) => {
  const heightM = heightCm / 100
  const bmi = weightKg / (heightM * heightM)
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161
  const mult = activity === "low" ? 1.35 : activity === "medium" ? 1.55 : 1.75
  const tdee = bmr * mult
  const target = Math.max(1200, Math.round(tdee + (goal === "lose" ? -400 : goal === "gain" ? 300 : 0)))
  const protein = Math.round(weightKg * (goal === "lose" ? 1.8 : goal === "gain" ? 1.7 : 1.5))
  const fat = Math.round((target * 0.28) / 9)
  const carbs = Math.round((target - protein * 4 - fat * 9) / 4)
  return { bmi, bmr: Math.round(bmr), tdee: Math.round(tdee), target, protein, fat, carbs }
}

const weeklyPlan = (goal: DietGoal) => {
  const base = [
    ["Yulaf + yogurt", "Tavuk salata", "Sebze corba", "Elma + badem"],
    ["Omlet", "Ton balikli salata", "Firin sebze", "Kefir"],
    ["Lor omlet", "Hindi durum", "Zeytinyagli sebze", "Armut"],
    ["Chia puding", "Etli nohut", "Izgara balik", "Yogurt"],
    ["Menemen", "Mercimek corba", "Tavuk sote", "Ceviz"],
    ["Muzlu smoothie", "Kinoa salata", "Kabak + yogurt", "Ayran"],
    ["Peynir tabagi", "Izgara kofte", "Sebze omlet", "Kivi"],
  ]
  if (goal === "lose") return base
  if (goal === "maintain") return base.map((d) => [d[0], `${d[1]} + tam tahil`, d[2], `${d[3]} + ek porsiyon`])
  return base.map((d) => [`${d[0]} + ekmek`, `${d[1]} + bulgur`, `${d[2]} + tahil`, `${d[3]} + Sut`])
}
const mealAlternatives: Record<DietGoal, Record<MealPart, string[]>> = {
  lose: {
    breakfast: ["Lor omlet + roka", "Yulaf + kefir", "Haslanmis yumurta + salata"],
    lunch: ["Izgara tavuk + salata", "Ton balikli yesil salata", "Mercimek corba + yogurt"],
    dinner: ["Sebze corba + yogurt", "Izgara balik + roka", "Zeytinyagli sebze + ayran"],
    snack: ["Elma + badem", "Kefir", "Yogurt + tarcin"],
  },
  maintain: {
    breakfast: ["Omlet + tam bugday", "Yulaf + meyve", "Peynir tabagi + ceviz"],
    lunch: ["Tavuk salata + bulgur", "Etli sebze + yogurt", "Hindi durum + ayran"],
    dinner: ["Balik + salata", "Tavuk sote + pilav", "Sebze + tam tahil"],
    snack: ["Meyve + kuruyemis", "Ayran + grissini", "Yogurt + granola"],
  },
  gain: {
    breakfast: ["Omlet + peynir + ekmek", "Yulaf + Sut + muz", "Menemen + avokado"],
    lunch: ["Tavuk + bulgur + salata", "Etli nohut + pilav", "Kofte + patates"],
    dinner: ["Balik + tam tahil", "Tavuk + makarna", "Sebze + bakliyat + yogurt"],
    snack: ["Kefir + muz", "Sut + yulaf bar", "Yogurt + fistik ezmesi"],
  },
}
const mealLabelsByLanguage = {
  tr: {
    breakfast: "Kahvaltı",
    lunch: "Öğle",
    dinner: "Akşam",
    snack: "Ara öğün",
  },
  en: {
    breakfast: "Breakfast",
    lunch: "Lunch",
    dinner: "Dinner",
    snack: "Snack",
  },
  de: {
    breakfast: "Fruehstueck",
    lunch: "Mittag",
    dinner: "Abendessen",
    snack: "Snack",
  },
  ru: {
    breakfast: "Zavtrak",
    lunch: "Obed",
    dinner: "Uzhin",
    snack: "Perekus",
  },
} as const

const pregnancyUiByLanguage = {
  tr: {
    countdown: "Doğuma kalan",
    weeks: "hafta",
    days: "gün",
    development: "Haftalık Gelişim",
    tips: "Günlük Öneriler",
    checklist: "Günlük Kontrol Listesi",
    checklistDone: "Tamamlanan",
    appointment: "Sonraki doktor randevuSu",
    appointmentPlaceholder: "GG/AA/YYYY",
    appointmentTimePlaceholder: "HH:MM",
    saveAppointment: "Randevuyu Kaydet",
    weekTimeline: "Haftalık Zaman Çizelgesi",
    thisWeek: "Bu hafta",
    taskWater: "Su",
    taskWalk: "Yürüyüş",
    taskVitamin: "Vitamin",
    taskRest: "Dinlenme",
    taskCheckup: "Kontrol",
    babyEstimate: "Bebek Boy/Kilo Tahmini",
    babyLength: "Tahmini boy",
    babyWeight: "Tahmini kilo",
    babyCompare: "Yaklasik boyut",
    babyNote: "Haftalik not",
    dueDate: "Tahmini dogum tarihi",
    trimester: "Trimester",
    babyFocus: "Bu hafta odak",
    nutrition: "Beslenme onerileri",
    nutritionPrefer: "Tercih et",
    nutritionAvoid: "Azalt/Kacin",
    weeklySummary: "Haftalik kontrol ozeti",
    weeklyWater: "Su",
    weeklyWalk: "Yuruyus",
    weeklyNutrition: "Beslenme",
    weeklySleep: "Uyku",
    weeklyStatusGood: "Haftan iyi gidiyor.",
    weeklyStatusFocus: "Biraz daha duzenli takip iyi gelir.",
    symptomDiary: "Belirti gunlugu",
    symptomNausea: "Bulanti",
    symptomSleep: "Uyku",
    symptomEnergy: "Enerji",
    symptomMood: "Ruh hali",
    symptomScaleHint: "Her belirtiyi bugun icin 1-5 arasi puanla",
    symptomWeeklyTrend: "7 gun belirti trendi",
    symptomWeeklyAverages: "Haftalik ortalamalar",
    testTimeline: "Randevu ve test takvimi",
    testWindow: "Hafta",
    testDone: "Tamamlandi",
    testPending: "Bekliyor",
    testDate: "Test tarihi",
    testDatePlaceholder: "GG/AA/YYYY",
    testSaveDate: "Tarihi kaydet",
    testCalendar: "Takvim gorunumu",
    testOnDate: "Secilen gun testleri",
    testNoDate: "Bu gunde test yok.",
    doctorQuestions: "Doktora sorulacak 3 soru",
    momChanges: "Anne vucudunda",
    safetyNote: "Icini rahatlatan not",
  },
  en: {
    countdown: "Time to birth",
    weeks: "weeks",
    days: "days",
    development: "Weekly Development",
    tips: "Daily Tips",
    checklist: "Daily Checklist",
    checklistDone: "Completed",
    appointment: "Next doctor appointment",
    appointmentPlaceholder: "DD/MM/YYYY",
    appointmentTimePlaceholder: "HH:MM",
    saveAppointment: "Save appointment",
    weekTimeline: "Weekly Timeline",
    thisWeek: "This week",
    taskWater: "Water",
    taskWalk: "Walk",
    taskVitamin: "Vitamin",
    taskRest: "Rest",
    taskCheckup: "Checkup",
    babyEstimate: "Baby Size Estimate",
    babyLength: "Estimated length",
    babyWeight: "Estimated weight",
    babyCompare: "Size comparison",
    babyNote: "Weekly note",
    dueDate: "Estimated due date",
    trimester: "Trimester",
    babyFocus: "Focus this week",
    nutrition: "Nutrition tips",
    nutritionPrefer: "Prefer",
    nutritionAvoid: "Limit/Avoid",
    weeklySummary: "Weekly check summary",
    weeklyWater: "Water",
    weeklyWalk: "Walk",
    weeklyNutrition: "Nutrition",
    weeklySleep: "Sleep",
    weeklyStatusGood: "Your week is going well.",
    weeklyStatusFocus: "A bit more consistency will help.",
    symptomDiary: "Symptom diary",
    symptomNausea: "Nausea",
    symptomSleep: "Sleep",
    symptomEnergy: "Energy",
    symptomMood: "Mood",
    symptomScaleHint: "Rate each symptom from 1 to 5 for today",
    symptomWeeklyTrend: "7-day symptom trend",
    symptomWeeklyAverages: "Weekly averages",
    testTimeline: "Appointment and test timeline",
    testWindow: "Week",
    testDone: "Completed",
    testPending: "Pending",
    testDate: "Test date",
    testDatePlaceholder: "DD/MM/YYYY",
    testSaveDate: "Save date",
    testCalendar: "Calendar view",
    testOnDate: "Tests on selected day",
    testNoDate: "No tests on this day.",
    doctorQuestions: "3 questions to ask your doctor",
    momChanges: "In mom's body",
    safetyNote: "Warm note",
  },
  de: {
    countdown: "Bis zur Geburt",
    weeks: "Wochen",
    days: "Tage",
    development: "Woechentliche Entwicklung",
    tips: "Taegliche Tipps",
    checklist: "Taegliche Checkliste",
    checklistDone: "Erledigt",
    appointment: "Naechster Arzttermin",
    appointmentPlaceholder: "TT/MM/JJJJ",
    appointmentTimePlaceholder: "HH:MM",
    saveAppointment: "Termin speichern",
    weekTimeline: "Woechentliche Zeitlinie",
    thisWeek: "Diese Woche",
    taskWater: "Wasser",
    taskWalk: "Spaziergang",
    taskVitamin: "Vitamin",
    taskRest: "Erholung",
    taskCheckup: "Kontrolle",
    babyEstimate: "Baby-Groesse Schaetzung",
    babyLength: "Geschaetzte Laenge",
    babyWeight: "Geschaetztes Gewicht",
    babyCompare: "Groessenvergleich",
    babyNote: "Wochenhinweis",
    dueDate: "Voraussichtlicher Geburtstermin",
    trimester: "Trimester",
    babyFocus: "Wochenfokus",
    nutrition: "Ernaehrungstipps",
    nutritionPrefer: "Bevorzugen",
    nutritionAvoid: "Reduzieren/Meiden",
    weeklySummary: "Woechentliche Uebersicht",
    weeklyWater: "Wasser",
    weeklyWalk: "Spaziergang",
    weeklyNutrition: "Ernaehrung",
    weeklySleep: "Schlaf",
    weeklyStatusGood: "Deine Woche laeuft gut.",
    weeklyStatusFocus: "Etwas mehr Regelmaessigkeit hilft.",
    symptomDiary: "Symptomtagebuch",
    symptomNausea: "Uebelkeit",
    symptomSleep: "Schlaf",
    symptomEnergy: "Energie",
    symptomMood: "Stimmung",
    symptomScaleHint: "Bewerte jedes Symptom fuer heute mit 1-5",
    symptomWeeklyTrend: "7-Tage Symptomtrend",
    symptomWeeklyAverages: "Woechentliche Durchschnitte",
    testTimeline: "Termin- und Testzeitplan",
    testWindow: "Woche",
    testDone: "Erledigt",
    testPending: "Offen",
    testDate: "TestdaTüm",
    testDatePlaceholder: "TT/MM/JJJJ",
    testSaveDate: "DaTüm speichern",
    testCalendar: "Kalenderansicht",
    testOnDate: "Tests am gewaehlten Tag",
    testNoDate: "Kein Test an diesem Tag.",
    doctorQuestions: "3 Fragen fuer den Arzttermin",
    momChanges: "Im Koerper der Mutter",
    safetyNote: "Freundlicher Hinweis",
  },
  ru: {
    countdown: "Do rodov ostalos",
    weeks: "nedel",
    days: "dney",
    development: "Razvitie po nedelyam",
    tips: "Sovety na den",
    checklist: "Dnevnoi chek-list",
    checklistDone: "Vypolneno",
    appointment: "Sleduyushchiy priem vracha",
    appointmentPlaceholder: "DD/MM/YYYY",
    appointmentTimePlaceholder: "HH:MM",
    saveAppointment: "Sohranit priem",
    weekTimeline: "Nedelnaya shkala",
    thisWeek: "Eta nedelya",
    taskWater: "Voda",
    taskWalk: "Progulka",
    taskVitamin: "Vitaminy",
    taskRest: "Otdyh",
    taskCheckup: "Kontrol",
    babyEstimate: "Оценка роста и веса ребенка",
    babyLength: "Primernyy rost",
    babyWeight: "Primernyy ves",
    babyCompare: "Sravneniye razmera",
    babyNote: "Zametka nedeli",
    dueDate: "Predpolagaemaya data rodov",
    trimester: "Trimestr",
    babyFocus: "Fokus etoy nedeli",
    nutrition: "Sovety po pitaniyu",
    nutritionPrefer: "Predpochitat",
    nutritionAvoid: "Ограничить/Избегать",
    weeklySummary: "Ezhenedelnyy obzor",
    weeklyWater: "Voda",
    weeklyWalk: "Progulka",
    weeklyNutrition: "Pitanie",
    weeklySleep: "Son",
    weeklyStatusGood: "Nedelya idet khorosho.",
    weeklyStatusFocus: "Nemnogo bolshe regulyarnosti budet polezno.",
    symptomDiary: "Dnevnik simptomov",
    symptomNausea: "Toshnota",
    symptomSleep: "Son",
    symptomEnergy: "Energiya",
    symptomMood: "Nastroenie",
    symptomScaleHint: "Otsenite kazhdyy simptom za segodnya po shkale 1-5",
    symptomWeeklyTrend: "Trend simptomov za 7 dney",
    symptomWeeklyAverages: "Srednie za nedelyu",
    testTimeline: "График приемов и анализов",
    testWindow: "Nedeli",
    testDone: "Vypolneno",
    testPending: "Ожидает",
    testDate: "Data analiza",
    testDatePlaceholder: "DD/MM/YYYY",
    testSaveDate: "Sohranit datu",
    testCalendar: "Kalendarnyy vid",
    testOnDate: "Analizy na vybrannyy den",
    testNoDate: "Na etot den analizov net.",
    doctorQuestions: "3 voprosa dlya vracha",
    momChanges: "В организме мамы",
    safetyNote: "Druzhestvennaya zametka",
  },
} as const

const healthUiText = {
  tr: {
    title: "Sağlık Modülü",
    Subtitle: "Kilo ve Diyet motoru dahil güncel takip ekranı",
    waterShort: "Su",
    dietShort: "Diyet",
    medicineShort: "İlaç",
    stepsShort: "Adım",
    cycleShort: "Regl",
    pregnancyShort: "Hamilelik",
    bloodPressureShort: "Tansiyon",
    cycleTitle: "Regl Takibi",
    cycleStartToday: "Bugün adet başladı",
    cycleSummary: "Döngü özeti",
    cycleLastPeriod: "Son adet",
    cycleNextPeriod: "Tahmini sonraki adet",
    cycleUpcomingTitle: "Yaklaşan döngüler",
    cycleUpcomingEmpty: "Yaklaşan döngü için kayıt gerekli.",
    cycleSymptomDiary: "Regl belirti gunlugu",
    cycleSymptomHint: "Bugunku belirtileri 1-5 arasi puanla",
    cycleSymptomPain: "Agri",
    cycleSymptomDischarge: "Akinti",
    cycleSymptomMood: "Ruh hali",
    cycleSymptomWeekly: "7 gun belirti trendi",
    cycleSymptomAverages: "Haftalik belirti ortalamasi",
    pregnancyTitle: "Hamilelik Takibi",
    pregnancyActionOff: "Hamile değilim",
    pregnancyActionOn: "Hamileyim",
    remainingLabel: "Kalan",
    dayLabel: "Gün",
    periodLabel: "Adet",
    lateLabel: "Geçti",
    todayLabel: "Bugün",
    weekPlaceholder: "Hafta",
    pregnancyOff: "Hamilelik modu kapalı.",
    waterTitle: "Su Takibi",
    waterToday: "Bugün",
    waterLeft: "Kalan",
    save: "Kaydet",
    dietTitle: "Kilo ve Diyet",
    goal: "Hedef",
    goalLose: "Kilo Ver",
    goalMaintain: "Koru",
    goalGain: "Kilo Al",
    activity: "Aktivite",
    low: "Düşük",
    medium: "Orta",
    high: "Yüksek",
    calculate: "Planı hesapla",
    enterForCalc: "Hesap için yaş, boy, kilo gir.",
    todayAdherence: "Bugünkü Uyum",
    dietAdherenceLabel: "Bugünkü Diyet uyumu",
    weekPlan: "7 Günlük Örnek Plan",
    day: "Gün",
    total: "Toplam",
    approx: "Yaklaşık",
    change: "Değiştir",
    waterTrend: "7 gün Su trendi",
    dietTrend: "7 gün Diyet uyumu",
    medicineTitle: "İlaç Takibi",
    medicineNamePlaceholder: "İlaç adı",
    medicineTimePlaceholder: "Saat (HH:MM)",
    medicineAdd: "Hatırlatma ekle",
    medicineDelete: "Sil",
    medicineSaved: "İlaç hatırlatması eklendi.",
    medicineRemoved: "İlaç hatırlatması silindi.",
    medicineInvalid: "Saat formatı HH:MM olmalı.",
    medicineQuickTimes: "Hızlı saat seçimi",
    medicineActiveCount: "Aktif hatırlatma",
    medicineNextDose: "Sıradaki doz",
    medicineEmpty: "Henüz ilaç hatırlatması yok.",
    medicineTomorrow: "Yarın",
    medicineTakenToday: "Bugünkü ilaç uyumu",
    medicineTaken: "Alındı",
    medicinePending: "Bekliyor",
    medicineMarkTaken: "Aldım",
    medicineMarkUntaken: "Geri al",
    medicineDayEndTimeTitle: "Gün sonu hatırlatma saati",
    medicineDayEndReminderTitle: "WOMIO - İlac Hatırlatma",
    medicineDayEndReminderBody: "Bugün işaretlenmeyen ilac(lar)ın var. Kontrol etmeyi unutma.",
    fertileWindowTitle: "Hamile kalma olasılığı yüksek günler",
    fertileWindowEmpty: "Tahmini verimli günler için en az 1 kayıt gerekli.",
    noRecord: "Henüz kayıt yok.",
    daySuntil: "Adete {n} gün kaldı.",
    todayMayStart: "Adetin bugün başlayabilir.",
    delayed: "Adetin {n} gün gecikti.",
    alreadyExists: "Bu tarih zaten kayıtlı.",
    savedCycle: "Adet başlangıcı kaydedildi.",
    savedDiet: "Diyet verileri kaydedildi.",
    stepsTitle: "Adım Sayar",
    stepsTodayLine: "Bugün {steps} adım | Hedef {goal} | Kalan {left}",
    stepsGoalPlaceholder: "Günlük hedef (adım)",
    stepSunavailable: "Adım sayar bu cihazda desteklenmiyor veya izin verilmedi.",
    stepsSaved: "Adım hedefi kaydedildi.",
    stepsLiveOn: "Canlı takip aktif",
    stepsLiveOff: "Canlı takip kapalı",
    bloodPressureTitle: "Tansiyon Takibi",
    bloodPressureSystolic: "Büyük (mmHg)",
    bloodPressureDiastolic: "Küçük (mmHg)",
    bloodPressurePulse: "Nabız (opsiyonel)",
    bloodPressureAdd: "Ölçümü Kaydet",
    bloodPressureSaved: "Tansiyon ölçümü kaydedildi.",
    bloodPressureInvalid: "Geçerli bir tansiyon değeri gir.",
    bloodPressureLast: "Son Ölçüm",
    bloodPressureWeekly: "7 Günlük Ortalama",
    bloodPressureNoData: "Henüz ölçüm yok.",
    bloodPressureStatus: "Durum",
    bpNormal: "Normal",
    bpElevated: "Yukselmis",
    bpHigh1: "Yuksek (Evre 1)",
    bpHigh2: "Yuksek (Evre 2)",
    bpCrisis: "Kritik",
    bpLow: "Dusuk",
    panicTitle: "Panik Atak Destek",
    panicShort: "Panik",
    panicStart: "Sakinlesmeyi Baslat",
    panicStop: "Durdur",
    panicBreathGuide: "Nefese odaklan: 4 sn al, 4 sn tut, 6 sn ver.",
    panicPhaseIn: "Nefes al",
    panicPhaseHold: "Tut",
    panicPhaseOut: "Nefes ver",
    panicRound: "Tur",
    panicFullscreenTitle: "Nefes Egzersizi",
    panicFullscreenHint: "Egzersiz bitince otomatik kapanir.",
    panicContinueInFullscreen: "Egzersiz tam ekranda suruyor",
    panicGroundingTitle: "5-4-3-2-1 Topraklama",
    panicGroundingHint: "Etrafinda bunlari fark et ve isaretle:",
    panicGroundingStart: "Topraklama Modunu Baslat",
    panicGroundingPrev: "Geri",
    panicGroundingNext: "Ileri",
    panicGroundingDone: "Tamamladim",
    panicGroundingCompleteTitle: "Topraklama Tamamlandi",
    panicGroundingCompleteHint: "Harika, nefesini sakin tut ve kendini guvende hissetmeye odaklan.",
    panicGroundingIdeas: "Yardimci ornekler",
    panicStepProgress: "Adim",
    panicGrounding5: "5 sey gor",
    panicGrounding4: "4 seye dokun",
    panicGrounding3: "3 ses duy",
    panicGrounding2: "2 koku fark et",
    panicGrounding1: "1 tat fark et",
    panicSeverity: "Siddet (1-10)",
    panicTrigger: "Tetikleyici (opsiyonel)",
    panicHelped: "Ne iyi geldi? (opsiyonel)",
    panicSaveLog: "Atak Kaydi Ekle",
    panicSaved: "Panik atak kaydi eklendi.",
    panicInvalid: "Lutfen 1-10 arasi siddet gir.",
    panicWeekly: "7 gun ozet",
    panicAvgSeverity: "Ortalama siddet",
    panicNoData: "Henüz kayıt yok.",
    panicCalmScore: "Gunluk Sakinlik Skoru",
    panicTodayEpisodes: "Bugunku atak",
    panicEmergencyTitle: "Acil Kisi",
    panicEmergencyName: "Kisi adi",
    panicEmergencyPhone: "Telefon",
    panicEmergencySave: "Kisiyi Kaydet",
    panicEmergencySaved: "Acil kisi kaydedildi.",
    panicEmergencyCall: "Acil Kisiyi Ara",
    panicEmergencyMissing: "Acil kisi adi ve telefon gir.",
    panicEmergencyInvalid: "Bu cihazda arama acilamadi.",
    bloodPressureAdviceTitle: "Ne yapabilirsin?",
    bloodPressureAdviceNormal: "Degerler dengeli görünüyor. Düzenli takip, su tüketimi ve rutinini koru.",
    bloodPressureAdviceElevated: "Tuzu azalt, kafeini sınırla, 10-15 dakika dinlenip tekrar ölç.",
    bloodPressureAdviceHigh1: "Sakin bir ortamda 5-10 dakika dinlen. Ölçümü tekrar et ve gün içinde takip et.",
    bloodPressureAdviceHigh2: "Dinlenip tekrar ölç. Değerler sürerse kısa sürede sağlık profesyoneline danış.",
    bloodPressureAdviceCrisis: "Çok yüksek değer. Şikayet (gögüs ağrısı, nefes darlığı, şiddetli baş ağrısı) varsa acil yardım al.",
    bloodPressureAdviceLow: "Su iç, ani ayağa kalkma. Baş dönmesi/halsizlik sürerse sağlık profesyoneline danış.",
  },
  en: {
    title: "Health Module",
    Subtitle: "Updated tracking screen with weight and diet engine",
    waterShort: "Water",
    dietShort: "Diet",
    medicineShort: "Medicine",
    stepsShort: "Steps",
    cycleShort: "Cycle",
    pregnancyShort: "Pregnancy",
    bloodPressureShort: "BP",
    cycleTitle: "Cycle Tracking",
    cycleStartToday: "Period started today",
    cycleSummary: "Cycle summary",
    cycleLastPeriod: "Last period",
    cycleNextPeriod: "Estimated next period",
    cycleUpcomingTitle: "Upcoming cycles",
    cycleUpcomingEmpty: "A record is required to show upcoming cycles.",
    cycleSymptomDiary: "Cycle symptom diary",
    cycleSymptomHint: "Rate today's symptoms from 1 to 5",
    cycleSymptomPain: "Pain",
    cycleSymptomDischarge: "Discharge",
    cycleSymptomMood: "Mood",
    cycleSymptomWeekly: "7-day symptom trend",
    cycleSymptomAverages: "Weekly symptom averages",
    pregnancyTitle: "Pregnancy Tracking",
    pregnancyActionOff: "Not pregnant",
    pregnancyActionOn: "Expecting",
    remainingLabel: "Remaining",
    dayLabel: "Day",
    periodLabel: "Period",
    lateLabel: "Late",
    todayLabel: "Today",
    weekPlaceholder: "Week",
    pregnancyOff: "Pregnancy mode is off.",
    waterTitle: "Water Tracking",
    waterToday: "Today",
    waterLeft: "Left",
    save: "Save",
    dietTitle: "Weight and Diet",
    goal: "Goal",
    goalLose: "Lose",
    goalMaintain: "Maintain",
    goalGain: "Gain",
    activity: "Activity",
    low: "Low",
    medium: "Medium",
    high: "High",
    calculate: "Calculate plan",
    enterForCalc: "Enter age, height and weight for calculation.",
    todayAdherence: "Today Adherence",
    dietAdherenceLabel: "Today diet adherence",
    weekPlan: "7-Day Sample Plan",
    day: "Day",
    total: "Total",
    approx: "Approx.",
    change: "Change",
    waterTrend: "7-day water trend",
    dietTrend: "7-day diet adherence",
    medicineTitle: "Medicine Tracking",
    medicineNamePlaceholder: "Medicine name",
    medicineTimePlaceholder: "Time (HH:MM)",
    medicineAdd: "Add reminder",
    medicineDelete: "Delete",
    medicineSaved: "Medicine reminder added.",
    medicineRemoved: "Medicine reminder removed.",
    medicineInvalid: "Time format must be HH:MM.",
    medicineQuickTimes: "Quick time picker",
    medicineActiveCount: "Active reminders",
    medicineNextDose: "Next dose",
    medicineEmpty: "No medicine reminders yet.",
    medicineTomorrow: "Tomorrow",
    medicineTakenToday: "Today's medicine adherence",
    medicineTaken: "Taken",
    medicinePending: "Pending",
    medicineMarkTaken: "Mark taken",
    medicineMarkUntaken: "Undo",
    medicineDayEndTimeTitle: "End-of-day reminder time",
    medicineDayEndReminderTitle: "WOMIO - Medicine Reminder",
    medicineDayEndReminderBody: "You still have unchecked medicine reminders for today.",
    fertileWindowTitle: "High fertility days",
    fertileWindowEmpty: "At least 1 record is required for estimated fertile days.",
    noRecord: "No record yet.",
    daySuntil: "{n} days until period.",
    todayMayStart: "Your period may start today.",
    delayed: "Your period is {n} days late.",
    alreadyExists: "This date is already saved.",
    savedCycle: "Period start saved.",
    savedDiet: "Diet data saved.",
    stepsTitle: "Step Counter",
    stepsTodayLine: "Today {steps} steps | Goal {goal} | Left {left}",
    stepsGoalPlaceholder: "Daily goal (steps)",
    stepSunavailable: "Step counter is not available or permission is missing.",
    stepsSaved: "Step goal saved.",
    stepsLiveOn: "Live tracking is active",
    stepsLiveOff: "Live tracking is off",
    bloodPressureTitle: "Blood Pressure Tracking",
    bloodPressureSystolic: "Systolic (mmHg)",
    bloodPressureDiastolic: "Diastolic (mmHg)",
    bloodPressurePulse: "Pulse (optional)",
    bloodPressureAdd: "Save Reading",
    bloodPressureSaved: "Blood pressure saved.",
    bloodPressureInvalid: "Enter valid blood pressure values.",
    bloodPressureLast: "Last Reading",
    bloodPressureWeekly: "7-Day Average",
    bloodPressureNoData: "No readings yet.",
    bloodPressureStatus: "Status",
    bpNormal: "Normal",
    bpElevated: "Elevated",
    bpHigh1: "High (Stage 1)",
    bpHigh2: "High (Stage 2)",
    bpCrisis: "Crisis",
    bpLow: "Low",
    panicTitle: "Panic Support",
    panicShort: "Panic",
    panicStart: "Start Calm Mode",
    panicStop: "Stop",
    panicBreathGuide: "Follow breath: inhale 4s, hold 4s, exhale 6s.",
    panicPhaseIn: "Inhale",
    panicPhaseHold: "Hold",
    panicPhaseOut: "Exhale",
    panicRound: "Round",
    panicFullscreenTitle: "Breathing Exercise",
    panicFullscreenHint: "It will close automatically when done.",
    panicContinueInFullscreen: "Exercise is running in full screen",
    panicGroundingTitle: "5-4-3-2-1 Grounding",
    panicGroundingHint: "Notice these around you and mark them:",
    panicGroundingStart: "Start Grounding Mode",
    panicGroundingPrev: "Back",
    panicGroundingNext: "Next",
    panicGroundingDone: "Mark done",
    panicGroundingCompleteTitle: "Grounding Complete",
    panicGroundingCompleteHint: "Great. Keep your breath steady and focus on safety.",
    panicGroundingIdeas: "Helpful examples",
    panicStepProgress: "Step",
    panicGrounding5: "5 things you see",
    panicGrounding4: "4 things you touch",
    panicGrounding3: "3 sounds you hear",
    panicGrounding2: "2 smells you notice",
    panicGrounding1: "1 taste you notice",
    panicSeverity: "Severity (1-10)",
    panicTrigger: "Trigger (optional)",
    panicHelped: "What helped? (optional)",
    panicSaveLog: "Add Episode Log",
    panicSaved: "Panic episode saved.",
    panicInvalid: "Please enter severity between 1 and 10.",
    panicWeekly: "7-day summary",
    panicAvgSeverity: "Average severity",
    panicNoData: "No logs yet.",
    panicCalmScore: "Daily Calm Score",
    panicTodayEpisodes: "Today's episodes",
    panicEmergencyTitle: "Emergency Contact",
    panicEmergencyName: "Contact name",
    panicEmergencyPhone: "Phone",
    panicEmergencySave: "Save Contact",
    panicEmergencySaved: "Emergency contact saved.",
    panicEmergencyCall: "Call Emergency Contact",
    panicEmergencyMissing: "Enter contact name and phone.",
    panicEmergencyInvalid: "Cannot start a call on this device.",
    bloodPressureAdviceTitle: "What can you do?",
    bloodPressureAdviceNormal: "Values look balanced. Keep routine tracking, hydration, and daily habits.",
    bloodPressureAdviceElevated: "Reduce salt, limit caffeine, rest 10-15 minutes, then re-check.",
    bloodPressureAdviceHigh1: "Rest in a calm place for 5-10 minutes. Measure again and monitor during the day.",
    bloodPressureAdviceHigh2: "Rest and re-check. If values persist, contact a healthcare professional soon.",
    bloodPressureAdviceCrisis: "Very high reading. If you have chest pain, shortness of breath, or severe headache, seek urgent care.",
    bloodPressureAdviceLow: "Hydrate and avoid sudden standing. If dizziness/weakness continues, contact a healthcare professional.",
  },
  de: {
    title: "GeSundheitsmodul",
    Subtitle: "Aktueller Tracking-Bildschirm mit Gewicht und Diaet",
    waterShort: "Wasser",
    dietShort: "Diaet",
    medicineShort: "Medizin",
    stepsShort: "Schritte",
    cycleShort: "Zyklus",
    pregnancyShort: "Schwanger",
    bloodPressureShort: "Blutdruck",
    cycleTitle: "Zyklus-Tracking",
    cycleStartToday: "Periode hat heute begonnen",
    cycleSummary: "Zyklusuebersicht",
    cycleLastPeriod: "Letzte Periode",
    cycleNextPeriod: "Naechste geschaetzte Periode",
    cycleUpcomingTitle: "Kommende Zyklen",
    cycleUpcomingEmpty: "Eintrag erforderlich fuer kommende Zyklen.",
    cycleSymptomDiary: "Zyklus-Symptomtagebuch",
    cycleSymptomHint: "Bewerte heutige Symptome von 1 bis 5",
    cycleSymptomPain: "Schmerz",
    cycleSymptomDischarge: "Ausfluss",
    cycleSymptomMood: "Stimmung",
    cycleSymptomWeekly: "7-Tage Symptomtrend",
    cycleSymptomAverages: "Woechentliche Symptomdurchschnitte",
    pregnancyTitle: "Schwangerschaft",
    pregnancyActionOff: "Nicht schwanger",
    pregnancyActionOn: "Schwanger",
    remainingLabel: "Verbleibend",
    dayLabel: "Tag",
    periodLabel: "Periode",
    lateLabel: "Verspaetet",
    todayLabel: "Heute",
    weekPlaceholder: "Woche",
    pregnancyOff: "Schwangerschaftsmodus ist aus.",
    waterTitle: "Wasser-Tracking",
    waterToday: "Heute",
    waterLeft: "Uebrig",
    save: "Speichern",
    dietTitle: "Gewicht und Diaet",
    goal: "Ziel",
    goalLose: "Abnehmen",
    goalMaintain: "Halten",
    goalGain: "Zunehmen",
    activity: "Aktivitaet",
    low: "Niedrig",
    medium: "Mittel",
    high: "Hoch",
    calculate: "Plan berechnen",
    enterForCalc: "Alter, Groesse und Gewicht eingeben.",
    todayAdherence: "Heutige Einhaltung",
    dietAdherenceLabel: "Heutige Diaet-Einhaltung",
    weekPlan: "7-Tage-Beispielplan",
    day: "Tag",
    total: "Gesamt",
    approx: "Ca.",
    change: "Aendern",
    waterTrend: "7-Tage Wassertrend",
    dietTrend: "7-Tage Diaet-Einhaltung",
    medicineTitle: "Medikamenten-Tracking",
    medicineNamePlaceholder: "Medikament",
    medicineTimePlaceholder: "Zeit (HH:MM)",
    medicineAdd: "Erinnerung hinzufuegen",
    medicineDelete: "Loeschen",
    medicineSaved: "Medikamenten-Erinnerung hinzugefuegt.",
    medicineRemoved: "Medikamenten-Erinnerung entfernt.",
    medicineInvalid: "Zeitformat muss HH:MM sein.",
    medicineQuickTimes: "Schnelle Zeitauswahl",
    medicineActiveCount: "Aktive Erinnerungen",
    medicineNextDose: "Naechste Dosis",
    medicineEmpty: "Noch keine Medikamentenerinnerung.",
    medicineTomorrow: "Morgen",
    medicineTakenToday: "Heutige Medikamenten-Treue",
    medicineTaken: "Eingenommen",
    medicinePending: "Ausstehend",
    medicineMarkTaken: "Als genommen markieren",
    medicineMarkUntaken: "Rueckgaengig",
    medicineDayEndTimeTitle: "Uhrzeit fuer Tagesende-Erinnerung",
    medicineDayEndReminderTitle: "WOMIO - Medikament Erinnerung",
    medicineDayEndReminderBody: "Du hast noch offene Medikamenten-Erinnerungen fuer heute.",
    fertileWindowTitle: "Hohe Fruchtbarkeitstage",
    fertileWindowEmpty: "Mindestens 1 Eintrag ist fuer die Schaetzung noetig.",
    noRecord: "Noch kein Eintrag.",
    daySuntil: "{n} Tage bis zur Periode.",
    todayMayStart: "Periode kann heute beginnen.",
    delayed: "Periode ist {n} Tage verspaetet.",
    alreadyExists: "Dieses DaTüm ist bereits gespeichert.",
    savedCycle: "Periodenstart gespeichert.",
    savedDiet: "Diaetdaten gespeichert.",
    stepsTitle: "Schrittzaehler",
    stepsTodayLine: "Heute {steps} Schritte | Ziel {goal} | Rest {left}",
    stepsGoalPlaceholder: "Tagesziel (Schritte)",
    stepSunavailable: "Schrittzaehler nicht verfuegbar oder keine Berechtigung.",
    stepsSaved: "Schrittziel gespeichert.",
    stepsLiveOn: "Live-Tracking ist aktiv",
    stepsLiveOff: "Live-Tracking ist aus",
    bloodPressureTitle: "Blutdruck-Tracking",
    bloodPressureSystolic: "Systolisch (mmHg)",
    bloodPressureDiastolic: "Diastolisch (mmHg)",
    bloodPressurePulse: "Puls (optional)",
    bloodPressureAdd: "Messung speichern",
    bloodPressureSaved: "Blutdruck gespeichert.",
    bloodPressureInvalid: "Gueltige Blutdruckwerte eingeben.",
    bloodPressureLast: "Letzte Messung",
    bloodPressureWeekly: "7-Tage Durchschnitt",
    bloodPressureNoData: "Noch keine Messung.",
    bloodPressureStatus: "Status",
    bpNormal: "Normal",
    bpElevated: "Erhoeht",
    bpHigh1: "Hoch (Stufe 1)",
    bpHigh2: "Hoch (Stufe 2)",
    bpCrisis: "Kritisch",
    bpLow: "Niedrig",
    panicTitle: "Panik-Unterstuetzung",
    panicShort: "Panik",
    panicStart: "Beruhigung Starten",
    panicStop: "Stoppen",
    panicBreathGuide: "Atmung folgen: 4s ein, 4s halten, 6s aus.",
    panicPhaseIn: "Einatmen",
    panicPhaseHold: "Halten",
    panicPhaseOut: "Ausatmen",
    panicRound: "Runde",
    panicFullscreenTitle: "Atemuebung",
    panicFullscreenHint: "Schliesst automatisch nach dem Ablauf.",
    panicContinueInFullscreen: "Uebung laeuft im Vollbild",
    panicGroundingTitle: "5-4-3-2-1 Grounding",
    panicGroundingHint: "Nimm dies wahr und markiere:",
    panicGroundingStart: "Grounding Starten",
    panicGroundingPrev: "Zurueck",
    panicGroundingNext: "Weiter",
    panicGroundingDone: "Als fertig markieren",
    panicGroundingCompleteTitle: "Grounding Abgeschlossen",
    panicGroundingCompleteHint: "Sehr gut. Ruhig weiteratmen und Sicherheit fokussieren.",
    panicGroundingIdeas: "Hilfreiche Beispiele",
    panicStepProgress: "Schritt",
    panicGrounding5: "5 Dinge sehen",
    panicGrounding4: "4 Dinge beruehren",
    panicGrounding3: "3 Geraeusche hoeren",
    panicGrounding2: "2 Gerueche wahrnehmen",
    panicGrounding1: "1 Geschmack wahrnehmen",
    panicSeverity: "Staerke (1-10)",
    panicTrigger: "Ausloeser (optional)",
    panicHelped: "Was hat geholfen? (optional)",
    panicSaveLog: "Episode speichern",
    panicSaved: "Panik-Episode gespeichert.",
    panicInvalid: "Bitte Staerke zwischen 1 und 10 eingeben.",
    panicWeekly: "7-Tage Uebersicht",
    panicAvgSeverity: "Durchschnittliche Staerke",
    panicNoData: "Noch keine Eintraege.",
    panicCalmScore: "Taeglicher Ruhe-Score",
    panicTodayEpisodes: "Heutige Episoden",
    panicEmergencyTitle: "Notfallkontakt",
    panicEmergencyName: "Name",
    panicEmergencyPhone: "Telefon",
    panicEmergencySave: "Kontakt speichern",
    panicEmergencySaved: "Notfallkontakt gespeichert.",
    panicEmergencyCall: "Notfallkontakt anrufen",
    panicEmergencyMissing: "Name und Telefon eingeben.",
    panicEmergencyInvalid: "Anruf auf diesem Geraet nicht moeglich.",
    bloodPressureAdviceTitle: "Was kannst du tun?",
    bloodPressureAdviceNormal: "Werte wirken stabil. Weiter regelmäßig messen und gut hydriert bleiben.",
    bloodPressureAdviceElevated: "Weniger Salz, Koffein begrenzen, 10-15 Minuten ruhen und erneut messen.",
    bloodPressureAdviceHigh1: "5-10 Minuten ruhig sitzen. Erneut messen und tagsüber beobachten.",
    bloodPressureAdviceHigh2: "Ruhen und erneut messen. Bei anhaltenden Werten zeitnah medizinisch abklären.",
    bloodPressureAdviceCrisis: "Sehr hoher Wert. Bei Brustschmerz, Atemnot oder starkem Kopfschmerz sofort Notfallhilfe holen.",
    bloodPressureAdviceLow: "Wasser trinken, langsamer aufstehen. Bei anhaltendem Schwindel/Schwäche medizinisch abklären.",
  },
  ru: {
    title: "Modul zdorovya",
    Subtitle: "Актуальный экран отслеживания с весом и диетой",
    waterShort: "Voda",
    dietShort: "Dieta",
    medicineShort: "Lekarstvo",
    stepsShort: "Shagi",
    cycleShort: "Tsikl",
    pregnancyShort: "Berem.",
    bloodPressureShort: "Davlenie",
    cycleTitle: "Tsikl",
    cycleStartToday: "Tsikl nachalsya segodnya",
    cycleSummary: "Svodka tsikla",
    cycleLastPeriod: "Posledniy tsikl",
    cycleNextPeriod: "Predpolagaemyy sleduyushchiy tsikl",
    cycleUpcomingTitle: "Blizhayshie tsikly",
    cycleUpcomingEmpty: "Nuzhen zapis dlya prognoza sleduyushchikh tsiklov.",
    cycleSymptomDiary: "Dnevnik simptomov tsikla",
    cycleSymptomHint: "Otsenite segodnyashnie simptomy po shkale 1-5",
    cycleSymptomPain: "Bol",
    cycleSymptomDischarge: "Vydeleniya",
    cycleSymptomMood: "Nastroenie",
    cycleSymptomWeekly: "Trend simptomov za 7 dney",
    cycleSymptomAverages: "Srednie simptomy za nedelyu",
    pregnancyTitle: "Beremennost",
    pregnancyActionOff: "Ne beremenna",
    pregnancyActionOn: "Beremenna",
    remainingLabel: "Ostalos",
    dayLabel: "Den",
    periodLabel: "Tsikl",
    lateLabel: "Prosrochen",
    todayLabel: "Segodnya",
    weekPlaceholder: "Nedelya",
    pregnancyOff: "Rezhim beremennosti vyklyuchen.",
    waterTitle: "Voda",
    waterToday: "Segodnya",
    waterLeft: "Ostalos",
    save: "Sohranit",
    dietTitle: "Вес и диета",
    goal: "Tsel",
    goalLose: "Snizit",
    goalMaintain: "Derzhat",
    goalGain: "Nabrat",
    activity: "Aktivnost",
    low: "Nizkaya",
    medium: "Srednyaya",
    high: "Vysokaya",
    calculate: "Rasschitat plan",
    enterForCalc: "Введите возраст, рост и вес.",
    todayAdherence: "Segodnya",
    dietAdherenceLabel: "Sledovanie diete segodnya",
    weekPlan: "Plan na 7 dney",
    day: "Den",
    total: "Итого",
    approx: "Primerno",
    change: "Изменить",
    waterTrend: "Trend vody za 7 dney",
    dietTrend: "Sledovanie diete za 7 dney",
    medicineTitle: "Kontrol lekarstv",
    medicineNamePlaceholder: "Nazvanie lekarstva",
    medicineTimePlaceholder: "Vremya (HH:MM)",
    medicineAdd: "Dobavit napominanie",
    medicineDelete: "Udalit",
    medicineSaved: "Напоминание о лекарстве добавлено.",
    medicineRemoved: "Напоминание о лекарстве удалено.",
    medicineInvalid: "Format vremeni dolzhen byt HH:MM.",
    medicineQuickTimes: "Bystryy vybor vremeni",
    medicineActiveCount: "Aktivnye napominaniya",
    medicineNextDose: "Sleduyushchiy priem",
    medicineEmpty: "Напоминаний о лекарствах пока нет.",
    medicineTomorrow: "Zavtra",
    medicineTakenToday: "Segodnyashnee soblyudenie priema",
    medicineTaken: "Prinyato",
    medicinePending: "В ожидании",
    medicineMarkTaken: "Otmetit kak prinyato",
    medicineMarkUntaken: "Otmenit",
    medicineDayEndTimeTitle: "Vremya vechernego napominaniya",
    medicineDayEndReminderTitle: "WOMIO - Напоминание о лекарстве",
    medicineDayEndReminderBody: "На сегодня остались неотмеченные напоминания о лекарствах.",
    fertileWindowTitle: "Dni vysokoy veroyatnosti beremennosti",
    fertileWindowEmpty: "Nuzhen minimum 1 zapis dlya rascheta.",
    noRecord: "Zapisey poka net.",
    daySuntil: "До цикла осталось {n} дней.",
    todayMayStart: "Tsikl mozhet nachatsya segodnya.",
    delayed: "Цикл задерживается на {n} дней.",
    alreadyExists: "Эта дата уже сохранена.",
    savedCycle: "Начало цикла сохранено.",
    savedDiet: "Данные диеты сохранены.",
    stepsTitle: "Shagomer",
    stepsTodayLine: "Segodnya {steps} shagov | Tsel {goal} | Ostalos {left}",
    stepsGoalPlaceholder: "Dnevnaya tsel (shagi)",
    stepSunavailable: "Shagomer nedostupen ili net razresheniya.",
    stepsSaved: "Цель по шагам сохранена.",
    stepsLiveOn: "Onlayn-otslezhivanie aktivno",
    stepsLiveOff: "Onlayn-otslezhivanie vyklyucheno",
    bloodPressureTitle: "Kontrol davleniya",
    bloodPressureSystolic: "Sistolicheskoe (mmHg)",
    bloodPressureDiastolic: "Diastolicheskoe (mmHg)",
    bloodPressurePulse: "Puls (neobyazatelno)",
    bloodPressureAdd: "Sohranit izmerenie",
    bloodPressureSaved: "Измерение давления сохранено.",
    bloodPressureInvalid: "Введите корректные значения давления.",
    bloodPressureLast: "Poslednee izmerenie",
    bloodPressureWeekly: "Srednee za 7 dney",
    bloodPressureNoData: "Измерений пока нет.",
    bloodPressureStatus: "Status",
    bpNormal: "Normalno",
    bpElevated: "Povyshennoe",
    bpHigh1: "Vysokoe (etap 1)",
    bpHigh2: "Vysokoe (etap 2)",
    bpCrisis: "Krizis",
    bpLow: "Nizkoe",
    panicTitle: "Podderzhka pri panike",
    panicShort: "Panika",
    panicStart: "Nachat uspokoenie",
    panicStop: "Ostanovit",
    panicBreathGuide: "Дыхание: вдох 4с, задержка 4с, выдох 6с.",
    panicPhaseIn: "Vdoh",
    panicPhaseHold: "Zaderzhka",
    panicPhaseOut: "Vydoh",
    panicRound: "Krug",
    panicFullscreenTitle: "Dykhatelnoye uprazhnenie",
    panicFullscreenHint: "Zakroetsya avtomaticheski posle zaversheniya.",
    panicContinueInFullscreen: "Упражнение выполняется в полном экране",
    panicGroundingTitle: "5-4-3-2-1 Grounding",
    panicGroundingHint: "Otmet eti punkty vokrug sebya:",
    panicGroundingStart: "Nachat Grounding",
    panicGroundingPrev: "Nazad",
    panicGroundingNext: "Dalshe",
    panicGroundingDone: "Otmetit kak vypolneno",
    panicGroundingCompleteTitle: "Grounding Zavershen",
    panicGroundingCompleteHint: "Отлично. Сохраняй ровное дыхание и фокус на безопасности.",
    panicGroundingIdeas: "Poleznye primery",
    panicStepProgress: "Shag",
    panicGrounding5: "5 veshchey, kotorye vidish",
    panicGrounding4: "4 veshchi, kotorye tragaesh",
    panicGrounding3: "3 zvuka, kotorye slyshish",
    panicGrounding2: "2 zapaha, kotorye chuvstvuesh",
    panicGrounding1: "1 vkus, kotoryy chuvstvuesh",
    panicSeverity: "Sila (1-10)",
    panicTrigger: "Trigger (neobyazatelno)",
    panicHelped: "Chto pomoglo? (neobyazatelno)",
    panicSaveLog: "Dobavit epizod",
    panicSaved: "Эпизод паники сохранен.",
    panicInvalid: "Введите силу от 1 до 10.",
    panicWeekly: "Svodka za 7 dney",
    panicAvgSeverity: "Srednyaya sila",
    panicNoData: "Zapisey poka net.",
    panicCalmScore: "Дневной индекс спокойствия",
    panicTodayEpisodes: "Epizody segodnya",
    panicEmergencyTitle: "Экстренный контакт",
    panicEmergencyName: "Имя контакта",
    panicEmergencyPhone: "Telefon",
    panicEmergencySave: "Sohranit kontakt",
    panicEmergencySaved: "Экстренный контакт сохранен.",
    panicEmergencyCall: "Pozvonit kontaktu",
    panicEmergencyMissing: "Введите имя и телефон.",
    panicEmergencyInvalid: "Na etom ustroystve nelzya nachat zvonok.",
    bloodPressureAdviceTitle: "Chto mozhno sdelat?",
    bloodPressureAdviceNormal: "Показатели близки к норме. Продолжай регулярный контроль и пей воду.",
    bloodPressureAdviceElevated: "Уменьши соль и кофеин, отдохни 10-15 минут и измерь повторно.",
    bloodPressureAdviceHigh1: "Посиди спокойно 5-10 минут. Повтори измерение и наблюдай в течение дня.",
    bloodPressureAdviceHigh2: "Отдохни и повтори измерение. Если держится, обратись к специалисту в ближайшее время.",
    bloodPressureAdviceCrisis: "Очень высокое значение. При боли в груди, одышке или сильной головной боли срочно обратитесь за помощью.",
    bloodPressureAdviceLow: "Попейте воды, не вставайте резко. При длительной слабости или головокружении обратитесь к врачу.",
  },
} as const

const mealCalories: Record<MealPart, number[]> = {
  breakfast: [340, 320, 330, 300],
  lunch: [500, 470, 450, 430],
  dinner: [460, 430, 420, 400],
  snack: [180, 160, 150, 140],
}

const dayPastels = [
  { bg: tc("#FDF3F8"), border: tc("#EECFDD") },
  { bg: tc("#F3F7FF"), border: tc("#CDDDF7") },
  { bg: tc("#F2FBF4"), border: tc("#CDEAD3") },
  { bg: tc("#FFF8EF"), border: tc("#F1DFC2") },
  { bg: tc("#F7F2FF"), border: tc("#DDCFF3") },
  { bg: tc("#EFFAF9"), border: tc("#C7E9E5") },
  { bg: tc("#FFF3F2"), border: tc("#F1D1CE") },
]

const dietSummaryByLanguage = {
  tr: {
    body: "Vucut Analizi",
    energy: "Gunluk Enerji Ihtiyaci",
    macros: "Makro Dagilimi",
    weight: "Kilo Durumu",
    bmiLine: "BMI {bmi} | BMR {bmr} | TDEE {tdee}",
    calorieLine: "Kalori hedefi: {target} kcal/gun",
    macroLine: "Protein {protein}g | Karbonhidrat {carbs}g | Yag {fat}g",
    idealLine: "Ideal kilo: {ideal} kg",
    rangeLine: "Saglikli aralik: {min} - {max} kg",
    overLine: "{diff} kg fazlan var",
    underLine: "{diff} kg alman gerekiyor",
    normalLine: "Ideal araliktasin",
  },
  en: {
    body: "Body Analysis",
    energy: "Daily Energy Need",
    macros: "Macro Split",
    weight: "Weight Status",
    bmiLine: "BMI {bmi} | BMR {bmr} | TDEE {tdee}",
    calorieLine: "Calorie target: {target} kcal/day",
    macroLine: "Protein {protein}g | Carbs {carbs}g | Fat {fat}g",
    idealLine: "Ideal weight: {ideal} kg",
    rangeLine: "Healthy range: {min} - {max} kg",
    overLine: "{diff} kg above target",
    underLine: "Need to gain {diff} kg",
    normalLine: "You are in the ideal range",
  },
  de: {
    body: "Koerperanalyse",
    energy: "Taeglicher Energiebedarf",
    macros: "Makroverteilung",
    weight: "Gewichtsstatus",
    bmiLine: "BMI {bmi} | BMR {bmr} | TDEE {tdee}",
    calorieLine: "Kalorienziel: {target} kcal/Tag",
    macroLine: "Protein {protein}g | Kohlenhydrate {carbs}g | Fett {fat}g",
    idealLine: "Idealgewicht: {ideal} kg",
    rangeLine: "GeSunder Bereich: {min} - {max} kg",
    overLine: "{diff} kg ueber dem Ziel",
    underLine: "{diff} kg zunehmen noetig",
    normalLine: "Im Idealbereich",
  },
  ru: {
    body: "Analiz tela",
    energy: "Sutochnaya energiya",
    macros: "Balans makro",
    weight: "Status ves",
    bmiLine: "ИМТ {bmi} | BMR {bmr} | TDEE {tdee}",
    calorieLine: "Tsel kaloriy: {target} kcal/den",
    macroLine: "Белок {protein}г | Углеводы {carbs}г | Жир {fat}г",
    idealLine: "Идеальный вес: {ideal} кг",
    rangeLine: "Zdorovyy diapazon: {min} - {max} kg",
    overLine: "{diff} kg vyshe tseli",
    underLine: "Nuzhno dobavit {diff} kg",
    normalLine: "В норме",
  },
} as const

function WeeklyBars({
  title,
  values,
  labels,
  maxValue,
  unit,
  color,
}: {
  title: string
  values: number[]
  labels: string[]
  maxValue: number
  unit: string
  color: string
}) {
  return (
    <View style={styles.chart}>
      <Text style={styles.chartTitle}>{title}</Text>
      <View style={styles.chartRow}>
        {values.map((value, i) => {
          const h = Math.max(6, Math.round((value / Math.max(1, maxValue)) * 64))
          return (
            <View key={`${labels[i]}-${i}`} style={styles.chartCol}>
              <View style={styles.track}>
                <View style={[styles.bar, { height: h, backgroundColor: color }]} />
              </View>
              <Text style={styles.small}>{value}</Text>
              <Text style={styles.small}>{labels[i]}</Text>
              <Text style={styles.small}>{unit}</Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

export default function Health() {
  const { language } = useAppLanguage()
  const { width } = useWindowDimensions()
  const compact = width < 360
  const L = language as "tr" | "en" | "de" | "ru"
  const HT = healthUiText[L]
  const DST = dietSummaryByLanguage[L]
  const mealLabels = mealLabelsByLanguage[L]

  const [history, setHistory] = useState<string[]>([])
  const [markedDates, setMarkedDates] = useState<MarkedDateMap>({})
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [statusText, setStatusText] = useState("")
  const [snackbarText, setSnackbarText] = useState("")
  const [snackbarVisible, setSnackbarVisible] = useState(false)

  const [pregnant, setPregnant] = useState(false)
  const [pregnancyWeek, setPregnancyWeek] = useState("1")
  const [pregnancyChecklistByDate, setPregnancyChecklistByDate] = useState<PregnancyChecklistByDate>({})
  const [pregnancySymptomsByDate, setPregnancySymptomsByDate] = useState<PregnancySymptomsByDate>({})
  const [pregnancyTestDone, setPregnancyTestDone] = useState<PregnancyTestDoneMap>({})
  const [pregnancyTestDates, setPregnancyTestDates] = useState<PregnancyTestDateMap>({})
  const [pregnancyTestNotificationIds, setPregnancyTestNotificationIds] = useState<PregnancyTestNotificationMap>({})
  const [selectedPregnancyTestDate, setSelectedPregnancyTestDate] = useState("")
  const [pregnancyAppointmentDate, setPregnancyAppointmentDate] = useState("")
  const [pregnancyAppointmentTime, setPregnancyAppointmentTime] = useState("")
  const [medicineName, setMedicineName] = useState("")
  const [medicineTime, setMedicineTime] = useState("")
  const [medicines, setMedicines] = useState<MedicineItem[]>([])
  const [medicineTakenByDate, setMedicineTakenByDate] = useState<MedicineTakenByDate>({})
  const [medicineDailyCheckNotificationId, setMedicineDailyCheckNotificationId] = useState<string | undefined>(undefined)
  const [medicineDailyCheckTime, setMedicineDailyCheckTime] = useState("21:00")
  const [bpSystolic, setBpSystolic] = useState("")
  const [bpDiastolic, setBpDiastolic] = useState("")
  const [bpPulse, setBpPulse] = useState("")
  const [bloodPressureEntries, setBloodPressureEntries] = useState<BloodPressureEntry[]>([])
  const [panicLogs, setPanicLogs] = useState<PanicLogEntry[]>([])
  const [panicSeverity, setPanicSeverity] = useState("5")
  const [panicTrigger, setPanicTrigger] = useState("")
  const [panicHelped, setPanicHelped] = useState("")
  const [panicEmergencyName, setPanicEmergencyName] = useState("")
  const [panicEmergencyPhone, setPanicEmergencyPhone] = useState("")
  const [panicBreathing, setPanicBreathing] = useState(false)
  const [panicFullscreen, setPanicFullscreen] = useState(false)
  const [panicGroundingFullscreen, setPanicGroundingFullscreen] = useState(false)
  const [panicGroundingStep, setPanicGroundingStep] = useState(0)
  const [panicPhaseIndex, setPanicPhaseIndex] = useState(0)
  const [panicPhaseRemaining, setPanicPhaseRemaining] = useState(4)
  const [panicCycleCount, setPanicCycleCount] = useState(0)
  const [panicGroundingChecks, setPanicGroundingChecks] = useState<Record<number, boolean>>({})
  const panicBreathScale = useRef(new Animated.Value(1)).current

  const [waterTargetMl, setWaterTargetMl] = useState("2000")
  const [waterDailyMl, setWaterDailyMl] = useState<DayValueMap>({})

  const [stepsTarget, setStepsTarget] = useState("8000")
  const [stepsAvailable, setStepsAvailable] = useState<boolean | null>(null)
  const [stepsToday, setStepsToday] = useState(0)
  const stepsBaseRef = useRef(0)
  const stepsSubRef = useRef<{ remove?: () => void } | null>(null)
  const pedometerRef = useRef<any>(null)

  const [age, setAge] = useState("")
  const [heightCm, setHeightCm] = useState("")
  const [weightKg, setWeightKg] = useState("")
  const [dietGoal, setDietGoal] = useState<DietGoal>("maintain")
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>("medium")
  const [mealChecks, setMealChecks] = useState<MealChecksByDate>({})
  const [adherenceDaily, setAdherenceDaily] = useState<DayValueMap>({})
  const [mealSwapIndices, setMealSwapIndices] = useState<MealSwapIndices>({})
  const [activeTab, setActiveTab] = useState<HealthTab>("cycle")
  const pregThumbPulse = useRef(new Animated.Value(1)).current

  const snackRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    void load()
  }, [])

  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    })
  }, [])

  useEffect(() => {
    setStatusText(buildStatusText(history, selectedDate, L))
    setMarkedDates(buildMarkedDates(history, selectedDate))
  }, [history, selectedDate, L])

  useEffect(() => () => {
    if (snackRef.current) clearTimeout(snackRef.current)
  }, [])

  useEffect(() => {
    if (!pregnant || activeTab !== "pregnancy") {
      pregThumbPulse.setValue(1)
      return
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pregThumbPulse, {
          toValue: 1.06,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pregThumbPulse, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    )

    loop.start()
    return () => loop.stop()
  }, [pregnant, activeTab, pregThumbPulse])

  useEffect(() => {
    LocaleConfig.defaultLocale = language
  }, [language])

  useEffect(() => {
    if (!panicBreathing) return
    const phaseDurations = [4, 4, 6]
    const timer = setInterval(() => {
      setPanicPhaseRemaining((prev) => {
        if (prev > 1) return prev - 1
        setPanicPhaseIndex((idx) => (idx + 1) % 3)
        return 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [panicBreathing])

  useEffect(() => {
    if (!panicBreathing) return
    const phaseDurations = [4, 4, 6]
    setPanicPhaseRemaining(phaseDurations[panicPhaseIndex] ?? 4)
    if (panicPhaseIndex === 0) setPanicCycleCount((c) => c + 1)
  }, [panicPhaseIndex, panicBreathing])

  useEffect(() => {
    if (!panicBreathing) return
    if (panicCycleCount <= PANIC_BREATH_TOTAL_ROUNDS) return
    setPanicBreathing(false)
    setPanicFullscreen(false)
    setPanicPhaseIndex(0)
    setPanicPhaseRemaining(4)
    setPanicCycleCount(0)
  }, [panicCycleCount, panicBreathing])

  useEffect(() => {
    if (!panicBreathing || !panicFullscreen) return
    const toValue = panicPhaseIndex === 2 ? 0.9 : 1.14
    Animated.timing(panicBreathScale, {
      toValue,
      duration: 900,
      useNativeDriver: true,
    }).start()
  }, [panicPhaseIndex, panicBreathing, panicFullscreen, panicBreathScale])

  useEffect(() => {
    // Live step counter (best-effort). Web is not Supported.
    if (Platform.OS === "web") {
      setStepsAvailable(false)
      return
    }

    let cancelled = false
    const setup = async () => {
      try {
        // Lazy-load to avoid bundler/lint isSues if expo-sensors is not installed yet.
        if (!pedometerRef.current) {
          const moduleName = "expo" + "-sensors"
          const Sensors = await import(moduleName)
          pedometerRef.current = (Sensors as any)?.Pedometer ?? null
        }
        const Pedometer = pedometerRef.current
        if (!Pedometer) {
          setStepsAvailable(false)
          return
        }

        const available = await Pedometer.isAvailableAsync()
        if (cancelled) return
        setStepsAvailable(Boolean(available))
        if (!available) return

        const now = new Date()
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)

        const res = await Pedometer.getStepCountAsync(start, now)
        if (cancelled) return

        const base = Number(res?.steps) || 0
        stepsBaseRef.current = base
        setStepsToday(base)

        stepsSubRef.current?.remove?.()
        stepsSubRef.current = Pedometer.watchStepCount((r: { steps: number }) => {
          const delta = Number(r?.steps) || 0
          setStepsToday(stepsBaseRef.current + delta)
        }) as unknown as { remove?: () => void }
      } catch {
        if (cancelled) return
        setStepsAvailable(false)
      }
    }

    void setup()
    return () => {
      cancelled = true
      stepsSubRef.current?.remove?.()
      stepsSubRef.current = null
    }
  }, [])

  const showSnack = (msg: string) => {
    setSnackbarText(msg)
    setSnackbarVisible(true)
    if (snackRef.current) clearTimeout(snackRef.current)
    snackRef.current = setTimeout(() => setSnackbarVisible(false), 2000)
  }
  const todayKey = getTodayKey()

  useEffect(() => {
    if (!selectedPregnancyTestDate) setSelectedPregnancyTestDate(todayKey)
  }, [selectedPregnancyTestDate, todayKey])

  const persist = async (override?: Partial<StoredData>) => {
    const data: StoredData = {
      cycleHistory: history,
      pregnant,
      pregnancyWeek: Number(pregnancyWeek) || 1,
      pregnancyChecklistByDate,
      pregnancySymptomsByDate,
      pregnancyTestDone,
      pregnancyTestDates,
      pregnancyTestNotificationIds,
      pregnancyAppointmentDate,
      pregnancyAppointmentTime,
      medicines,
      medicineTakenByDate,
      medicineDailyCheckNotificationId,
      medicineDailyCheckTime,
      bloodPressureEntries,
      panicLogs,
      panicEmergencyName,
      panicEmergencyPhone,
      waterTargetMl: Number(waterTargetMl) || 2000,
      waterDailyMl,
      stepsTarget: Math.max(1000, Number(stepsTarget) || 8000),
      diet: {
        age,
        heightCm,
        weightKg,
        goal: dietGoal,
        activity: activityLevel,
        mealChecks,
        adherenceDaily,
        mealSwapIndices,
      },
      ...override,
    }
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }

  const load = async () => {
    const saved = await AsyncStorage.getItem(STORAGE_KEY)
    if (!saved) return
    const data: StoredData = JSON.parse(saved)
    setHistory(sortAndDedupeHistory(data.cycleHistory ?? []))
    setPregnant(Boolean(data.pregnant))
    setPregnancyWeek(String(data.pregnancyWeek ?? 1))
    setPregnancyChecklistByDate(data.pregnancyChecklistByDate ?? {})
    setPregnancySymptomsByDate(data.pregnancySymptomsByDate ?? {})
    setPregnancyTestDone(data.pregnancyTestDone ?? {})
    setPregnancyTestDates(data.pregnancyTestDates ?? {})
    setPregnancyTestNotificationIds(data.pregnancyTestNotificationIds ?? {})
    setPregnancyAppointmentDate(data.pregnancyAppointmentDate ?? "")
    setPregnancyAppointmentTime(data.pregnancyAppointmentTime ?? "")
    setMedicines(data.medicines ?? [])
    setMedicineTakenByDate(data.medicineTakenByDate ?? {})
    setMedicineDailyCheckNotificationId(data.medicineDailyCheckNotificationId)
    setMedicineDailyCheckTime(data.medicineDailyCheckTime ?? "21:00")
    setBloodPressureEntries(data.bloodPressureEntries ?? [])
    setPanicLogs(data.panicLogs ?? [])
    setPanicEmergencyName(data.panicEmergencyName ?? "")
    setPanicEmergencyPhone(data.panicEmergencyPhone ?? "")
    setWaterTargetMl(String(data.waterTargetMl ?? 2000))
    setWaterDailyMl(data.waterDailyMl ?? {})
    setStepsTarget(String(data.stepsTarget ?? 8000))
    setAge(data.diet?.age ?? "")
    setHeightCm(data.diet?.heightCm ?? "")
    setWeightKg(data.diet?.weightKg ?? "")
    setDietGoal(data.diet?.goal ?? "maintain")
    setActivityLevel(data.diet?.activity ?? "medium")
    setMealChecks(data.diet?.mealChecks ?? {})
    setAdherenceDaily(data.diet?.adherenceDaily ?? {})
    setMealSwapIndices(data.diet?.mealSwapIndices ?? {})
  }

  const upsertPeriodStart = async (dateKey: string) => {
    if (history.includes(dateKey)) {
      setSelectedDate(dateKey)
      showSnack(HT.alreadyExists)
      return
    }
    const next = sortAndDedupeHistory([dateKey, ...history])
    setHistory(next)
    setSelectedDate(dateKey)
    await persist({ cycleHistory: next })
    showSnack(HT.savedCycle)
  }

  const onDayPress = (day: DateData) => void upsertPeriodStart(day.dateString)

  const waterToday = waterDailyMl[getTodayKey()] ?? 0
  const waterLeft = Math.max(0, (Number(waterTargetMl) || 2000) - waterToday)
  const waterPct = Math.min(100, Math.round((waterToday / Math.max(500, Number(waterTargetMl) || 2000)) * 100))
  const sortedMedicines = useMemo(
    () =>
      [...medicines].sort((a, b) => toTimeMinutes(a.time) - toTimeMinutes(b.time)),
    [medicines]
  )
  const todayMedicineTaken = medicineTakenByDate[todayKey] ?? {}
  const medicineTakenCount = useMemo(
    () => sortedMedicines.reduce((sum, item) => sum + (todayMedicineTaken[item.id] ? 1 : 0), 0),
    [sortedMedicines, todayMedicineTaken]
  )
  const medicinePendingCount = Math.max(0, sortedMedicines.length - medicineTakenCount)
  const medicinePct =
    sortedMedicines.length > 0 ? Math.round((medicineTakenCount / sortedMedicines.length) * 100) : 0
  const nextMedicineLabel = useMemo(() => {
    if (sortedMedicines.length === 0) return "-"
    const now = new Date()
    const nowMinutes = now.getHours() * 60 + now.getMinutes()
    const todayNext = sortedMedicines.find((item) => toTimeMinutes(item.time) >= nowMinutes)
    if (todayNext) return `${todayNext.name} • ${todayNext.time}`
    const firstTomorrow = sortedMedicines[0]
    return `${firstTomorrow.name} • ${firstTomorrow.time} (${HT.medicineTomorrow})`
  }, [sortedMedicines, HT.medicineTomorrow])
  useEffect(() => {
    void syncMedicineDayEndReminder()
  }, [medicinePendingCount, sortedMedicines.length, HT.medicineDayEndReminderTitle, HT.medicineDayEndReminderBody, medicineDailyCheckTime])
  const stepsGoal = Math.max(1000, Number(stepsTarget) || 8000)
  const stepsLeft = Math.max(0, stepsGoal - stepsToday)

  const addWater = async (ml: number) => {
    const today = getTodayKey()
    const next = (waterDailyMl[today] ?? 0) + ml
    const nextMap = { ...waterDailyMl, [today]: next }
    setWaterDailyMl(nextMap)
    await persist({ waterDailyMl: nextMap })
  }

  const updatePregnancy = async (enabled: boolean) => {
    setPregnant(enabled)
    await persist({ pregnant: enabled })
  }

  const savePregnancyWeek = async (value: string) => {
    const normalized = String(Math.max(1, Math.min(40, Number(value) || 1)))
    setPregnancyWeek(normalized)
    await persist({ pregnancyWeek: Number(normalized) })
  }

  const togglePregnancyChecklist = async (key: keyof PregnancyChecklist) => {
    const today = getTodayKey()
    const todayChecklist = pregnancyChecklistByDate[today] ?? defaultPregnancyChecklist()
    const nextToday = { ...todayChecklist, [key]: !todayChecklist[key] }
    const next = { ...pregnancyChecklistByDate, [today]: nextToday }
    setPregnancyChecklistByDate(next)
    await persist({ pregnancyChecklistByDate: next })
  }

  const setPregnancySymptomScore = async (key: PregnancySymptomKey, score: number) => {
    const today = getTodayKey()
    const todaySymptoms = pregnancySymptomsByDate[today] ?? defaultPregnancySymptoms()
    const nextToday = { ...todaySymptoms, [key]: Math.max(1, Math.min(5, score)) }
    const next = { ...pregnancySymptomsByDate, [today]: nextToday }
    setPregnancySymptomsByDate(next)
    await persist({ pregnancySymptomsByDate: next })
  }

  const togglePregnancyTestDone = async (testId: string) => {
    const next = { ...pregnancyTestDone, [testId]: !pregnancyTestDone[testId] }
    setPregnancyTestDone(next)
    await persist({ pregnancyTestDone: next })
  }

  const savePregnancyTestDate = async (testId: string, testTitle: string) => {
    const dateText = (pregnancyTestDates[testId] ?? "").trim()
    const parsedDate = parseDateInput(dateText)
    if (!parsedDate) {
      showSnack(HT.medicineInvalid)
      return
    }

    const nextDates = { ...pregnancyTestDates, [testId]: dateText }
    const nextNotificationIds = { ...pregnancyTestNotificationIds }

    const oldNotificationId = nextNotificationIds[testId]
    if (oldNotificationId) {
      try {
        await Notifications.cancelScheduledNotificationAsync(oldNotificationId)
      } catch {}
      delete nextNotificationIds[testId]
    }

    const hasPermission = await requestNotificationPermission()
    if (hasPermission) {
      const reminderDate = new Date(parsedDate)
      reminderDate.setDate(reminderDate.getDate() - 1)
      reminderDate.setHours(20, 0, 0, 0)

      if (reminderDate.getTime() > Date.now()) {
        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: "WOMIO",
            body: `${testTitle} - ${dateText}`,
          },
          trigger: reminderDate as unknown as Notifications.NotificationTriggerInput,
        })
        nextNotificationIds[testId] = notificationId
      }
    }

    setPregnancyTestDates(nextDates)
    setPregnancyTestNotificationIds(nextNotificationIds)
    await persist({ pregnancyTestDates: nextDates, pregnancyTestNotificationIds: nextNotificationIds })
    showSnack(HT.save)
  }

  const savePregnancyAppointment = async () => {
    const dateText = pregnancyAppointmentDate.trim()
    const timeText = pregnancyAppointmentTime.trim()
    const parsedDate = parseDateInput(dateText)
    const parsedTime = timeText ? parseTime(timeText) : null
    if (!parsedDate || !parsedTime) {
      showSnack(HT.medicineInvalid)
      return
    }
    const scheduleDate = new Date(parsedDate)
    scheduleDate.setHours(parsedTime.hour, parsedTime.minute, 0, 0)
    if (Number.isNaN(scheduleDate.getTime()) || scheduleDate.getTime() < Date.now()) {
      showSnack(HT.medicineInvalid)
      return
    }
    await persist({ pregnancyAppointmentDate: dateText, pregnancyAppointmentTime: timeText })
    const hasPermission = await requestNotificationPermission()
    if (hasPermission) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "WOMIO",
          body: `${HT.pregnancyTitle}: ${dateText} ${timeText}`,
        },
        trigger: scheduleDate as unknown as Notifications.NotificationTriggerInput,
      })
    }
    showSnack(HT.save)
  }

  const requestNotificationPermission = async () => {
    const permission = await Notifications.getPermissionsAsync()
    if (permission.status === "granted") return true
    const reSult = await Notifications.requestPermissionsAsync()
    return reSult.status === "granted"
  }

  async function syncMedicineDayEndReminder() {
    if (medicineDailyCheckNotificationId) {
      await Notifications.cancelScheduledNotificationAsync(medicineDailyCheckNotificationId)
      setMedicineDailyCheckNotificationId(undefined)
      await persist({ medicineDailyCheckNotificationId: undefined })
    }

    if (sortedMedicines.length === 0 || medicinePendingCount <= 0) return

    const hasPermission = await requestNotificationPermission()
    if (!hasPermission) return

    const parsedTime = parseTime(medicineDailyCheckTime)
    if (!parsedTime) return
    const now = new Date()
    const notifyAt = new Date(now)
    notifyAt.setHours(parsedTime.hour, parsedTime.minute, 0, 0)
    if (notifyAt.getTime() <= now.getTime()) return

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: HT.medicineDayEndReminderTitle,
        body: HT.medicineDayEndReminderBody,
      },
      trigger: notifyAt as unknown as Notifications.NotificationTriggerInput,
    })
    setMedicineDailyCheckNotificationId(notificationId)
    await persist({ medicineDailyCheckNotificationId: notificationId })
  }

  const setQuickMedicineTime = (time: string) => {
    setMedicineTime(time)
  }
  const setMedicineDayEndTimeValue = async (time: string) => {
    const parsed = parseTime(time)
    if (!parsed) {
      showSnack(HT.medicineInvalid)
      return
    }
    setMedicineDailyCheckTime(time)
    await persist({ medicineDailyCheckTime: time })
  }

  const addMedicineReminder = async () => {
    if (!medicineName.trim()) return

    const parsed = parseTime(medicineTime)
    if (!parsed) {
      showSnack(HT.medicineInvalid)
      return
    }

    const hasPermission = await requestNotificationPermission()
    let notificationId: string | undefined

    if (hasPermission) {
      notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: "WOMIO",
          body: `${medicineName.trim()} reminder`,
        },
        trigger: {
          hour: parsed.hour,
          minute: parsed.minute,
          repeats: true,
        } as Notifications.NotificationTriggerInput,
      })
    }

    const item: MedicineItem = {
      id: `${Date.now()}`,
      name: medicineName.trim(),
      time: medicineTime,
      notificationId,
    }

    const next = [item, ...medicines]
    setMedicines(next)
    setMedicineName("")
    setMedicineTime("")
    await persist({ medicines: next })
    showSnack(HT.medicineSaved)
  }

  const toggleMedicineTaken = async (medicineId: string) => {
    const today = getTodayKey()
    const todayMap = medicineTakenByDate[today] ?? {}
    const nextToday = { ...todayMap, [medicineId]: !todayMap[medicineId] }
    const next = { ...medicineTakenByDate, [today]: nextToday }
    setMedicineTakenByDate(next)
    await persist({ medicineTakenByDate: next })
  }

  const removeMedicineReminder = async (item: MedicineItem) => {
    if (item.notificationId) {
      await Notifications.cancelScheduledNotificationAsync(item.notificationId)
    }
    const next = medicines.filter((medicine) => medicine.id !== item.id)
    setMedicines(next)
    const nextTakenByDate: MedicineTakenByDate = {}
    Object.entries(medicineTakenByDate).forEach(([dateKey, map]) => {
      const cleaned = { ...map }
      delete cleaned[item.id]
      nextTakenByDate[dateKey] = cleaned
    })
    setMedicineTakenByDate(nextTakenByDate)
    await persist({ medicines: next, medicineTakenByDate: nextTakenByDate })
    showSnack(HT.medicineRemoved)
  }

  const saveStepsGoal = async () => {
    const normalized = String(Math.max(1000, Number(stepsTarget) || 8000))
    setStepsTarget(normalized)
    await persist({ stepsTarget: Number(normalized) })
    showSnack(HT.stepsSaved)
  }

  const classifyBloodPressure = (s: number, d: number) => {
    if (s >= 180 || d >= 120) return HT.bpCrisis
    if (s >= 140 || d >= 90) return HT.bpHigh2
    if (s >= 130 || d >= 80) return HT.bpHigh1
    if (s < 90 || d < 60) return HT.bpLow
    if (s >= 120 && d < 80) return HT.bpElevated
    return HT.bpNormal
  }

  const getBloodPressureAdvice = (s: number, d: number) => {
    const state = classifyBloodPressure(s, d)
    if (state === HT.bpCrisis) return HT.bloodPressureAdviceCrisis
    if (state === HT.bpHigh2) return HT.bloodPressureAdviceHigh2
    if (state === HT.bpHigh1) return HT.bloodPressureAdviceHigh1
    if (state === HT.bpElevated) return HT.bloodPressureAdviceElevated
    if (state === HT.bpLow) return HT.bloodPressureAdviceLow
    return HT.bloodPressureAdviceNormal
  }

  const addBloodPressure = async () => {
    const systolic = Number(bpSystolic)
    const diastolic = Number(bpDiastolic)
    const pulse = bpPulse.trim() ? Number(bpPulse) : undefined

    const validBase =
      Number.isFinite(systolic) &&
      Number.isFinite(diastolic) &&
      systolic >= 70 &&
      systolic <= 250 &&
      diastolic >= 40 &&
      diastolic <= 150
    const validPulse = pulse === undefined || (Number.isFinite(pulse) && pulse >= 30 && pulse <= 220)

    if (!validBase || !validPulse) {
      showSnack(HT.bloodPressureInvalid)
      return
    }

    const item: BloodPressureEntry = {
      id: `${Date.now()}`,
      systolic: Math.round(systolic),
      diastolic: Math.round(diastolic),
      pulse: pulse === undefined ? undefined : Math.round(pulse),
      recordedAt: new Date().toISOString(),
    }

    const next = [item, ...bloodPressureEntries]
    setBloodPressureEntries(next)
    setBpSystolic("")
    setBpDiastolic("")
    setBpPulse("")
    await persist({ bloodPressureEntries: next })
    showSnack(HT.bloodPressureSaved)
  }

  const togglePanicBreathing = () => {
    if (panicBreathing) {
      setPanicBreathing(false)
      setPanicFullscreen(false)
      setPanicPhaseIndex(0)
      setPanicPhaseRemaining(4)
      setPanicCycleCount(0)
      return
    }
    setPanicCycleCount(0)
    setPanicPhaseIndex(0)
    setPanicPhaseRemaining(4)
    setPanicFullscreen(true)
    setPanicBreathing(true)
  }

  const toggleGroundingCheck = (index: number) => {
    setPanicGroundingChecks((prev) => ({ ...prev, [index]: !prev[index] }))
  }

  const startGroundingMode = () => {
    setPanicGroundingStep(0)
    setPanicGroundingFullscreen(true)
  }

  const closeGroundingMode = () => {
    setPanicGroundingFullscreen(false)
    setPanicGroundingStep(0)
  }

  const addPanicLog = async () => {
    const severity = Number(panicSeverity)
    if (!Number.isFinite(severity) || severity < 1 || severity > 10) {
      showSnack(HT.panicInvalid)
      return
    }
    const item: PanicLogEntry = {
      id: `${Date.now()}`,
      severity: Math.round(severity),
      trigger: panicTrigger.trim(),
      helped: panicHelped.trim(),
      recordedAt: new Date().toISOString(),
    }
    const next = [item, ...panicLogs]
    setPanicLogs(next)
    setPanicSeverity("5")
    setPanicTrigger("")
    setPanicHelped("")
    setPanicGroundingChecks({})
    await persist({ panicLogs: next })
    showSnack(HT.panicSaved)
  }

  const savePanicEmergencyContact = async () => {
    const name = panicEmergencyName.trim()
    const phone = normalizePhoneForTel(panicEmergencyPhone.trim())
    if (!name || !phone) {
      showSnack(HT.panicEmergencyMissing)
      return
    }
    await persist({ panicEmergencyName: name, panicEmergencyPhone: phone })
    showSnack(HT.panicEmergencySaved)
  }

  const callPanicEmergencyContact = async () => {
    const phone = normalizePhoneForTel(panicEmergencyPhone.trim())
    if (!phone) {
      showSnack(HT.panicEmergencyMissing)
      return
    }
    const telUrl = `tel:${phone}`
    const supported = await Linking.canOpenURL(telUrl)
    if (!supported) {
      showSnack(HT.panicEmergencyInvalid)
      return
    }
    await Linking.openURL(telUrl)
  }

  const saveDietBase = async () => {
    await persist({
      diet: {
        age,
        heightCm,
        weightKg,
        goal: dietGoal,
        activity: activityLevel,
        mealChecks,
        adherenceDaily,
        mealSwapIndices,
      },
    })
      showSnack(HT.savedDiet)
  }

  const todayMeals = mealChecks[todayKey] ?? defaultMeals()
  const toggleMeal = async (meal: MealPart) => {
    const nextDay = { ...todayMeals, [meal]: !todayMeals[meal] }
    const nextChecks = { ...mealChecks, [todayKey]: nextDay }
    const done = DIET_MEALS.filter((m) => nextDay[m]).length
    const pct = Math.round((done / DIET_MEALS.length) * 100)
    const nextAdherence = { ...adherenceDaily, [todayKey]: pct }
    setMealChecks(nextChecks)
    setAdherenceDaily(nextAdherence)
    await persist({
      diet: {
        age,
        heightCm,
        weightKg,
        goal: dietGoal,
        activity: activityLevel,
        mealChecks: nextChecks,
        adherenceDaily: nextAdherence,
        mealSwapIndices,
      },
    })
  }

  const diet = useMemo(() => {
    const a = Number(age)
    const h = Number(heightCm)
    const w = Number(weightKg)
    if (!a || !h || !w) return null
    return calcDiet(a, h, w, activityLevel, dietGoal)
  }, [age, heightCm, weightKg, activityLevel, dietGoal])
  const idealWeightInfo = useMemo(() => {
    const h = Number(heightCm)
    const w = Number(weightKg)
    if (!h || !w) return null
    const hm = h / 100
    const ideal = 22 * hm * hm
    const min = 18.5 * hm * hm
    const max = 24.9 * hm * hm
    const diff = w - ideal
    return { ideal, min, max, diff }
  }, [heightCm, weightKg])

  const plan7 = useMemo(() => weeklyPlan(dietGoal), [dietGoal])

  const getMealSwapKey = (dayIndex: number, meal: MealPart) => `${dayIndex}-${meal}`

  const getMealText = (dayIndex: number, meal: MealPart, fallback: string) => {
    const options = [fallback, ...mealAlternatives[dietGoal][meal]]
    const idx = mealSwapIndices[getMealSwapKey(dayIndex, meal)] ?? 0
    return options[idx % options.length]
  }

  const getMealCalories = (dayIndex: number, meal: MealPart) => {
    const idx = mealSwapIndices[getMealSwapKey(dayIndex, meal)] ?? 0
    const list = mealCalories[meal]
    return list[idx % list.length]
  }

  const getDayTotalCalories = (dayIndex: number) => {
    return DIET_MEALS.reduce((Sum, meal) => Sum + getMealCalories(dayIndex, meal), 0)
  }

  const fertileWindowDates = useMemo(() => {
    if (history.length === 0) return []
    const lastStart = history[0]
    const ovulationDay = addDays(lastStart, DEFAULT_CYCLE_LENGTH - 14)
    const reSult: string[] = []
    for (let i = -3; i <= 1; i++) {
      reSult.push(addDays(ovulationDay, i))
    }
    return reSult
  }, [history])

  const rotateMealOption = async (dayIndex: number, meal: MealPart, fallback: string) => {
    const options = [fallback, ...mealAlternatives[dietGoal][meal]]
    const key = getMealSwapKey(dayIndex, meal)
    const current = mealSwapIndices[key] ?? 0
    const nextIndex = (current + 1) % options.length
    const next = { ...mealSwapIndices, [key]: nextIndex }
    setMealSwapIndices(next)
    await persist({
      diet: {
        age,
        heightCm,
        weightKg,
        goal: dietGoal,
        activity: activityLevel,
        mealChecks,
        adherenceDaily,
        mealSwapIndices: next,
      },
    })
  }

  const weekKeys = useMemo(() => getLastDateKeys(7), [])
  const weekLabels = useMemo(() => weekKeys.map((key) => getShortDayLabel(key, L)), [weekKeys, L])
  const waterWeek = useMemo(() => weekKeys.map((k) => waterDailyMl[k] ?? 0), [weekKeys, waterDailyMl])
  const dietWeek = useMemo(() => weekKeys.map((k) => adherenceDaily[k] ?? 0), [weekKeys, adherenceDaily])
  const cycleDaysDelta = useMemo(() => getCycleDaysDelta(history, selectedDate), [history, selectedDate])
  const cycleLastPeriodDate = useMemo(
    () => (history.length > 0 ? formatDateByLanguage(history[0], L) : "-"),
    [history, L]
  )
  const cycleNextPeriodDate = useMemo(
    () => (history.length > 0 ? formatDateByLanguage(addDays(history[0], DEFAULT_CYCLE_LENGTH), L) : "-"),
    [history, L]
  )
  const cycleDeltaValueText = useMemo(() => {
    if (history.length === 0) return "-"
    if (cycleDaysDelta === 0) return HT.todayLabel
    return `${Math.abs(cycleDaysDelta)} ${HT.dayLabel}`
  }, [history.length, cycleDaysDelta, HT.todayLabel, HT.dayLabel])
  const cycleDeltaLabelText = useMemo(() => {
    if (history.length === 0) return HT.noRecord
    if (cycleDaysDelta > 0) return HT.remainingLabel
    if (cycleDaysDelta < 0) return HT.lateLabel
    return HT.todayLabel
  }, [history.length, cycleDaysDelta, HT.noRecord, HT.remainingLabel, HT.lateLabel, HT.todayLabel])
  const cycleUpcomingDates = useMemo(() => {
    if (history.length === 0) return []
    return [1, 2, 3].map((i) => addDays(history[0], DEFAULT_CYCLE_LENGTH * i))
  }, [history])
  const pregnancyWeekNum = Math.max(0, Number(pregnancyWeek) || 0)
  const pregnancyProgress = Math.min(100, Math.max(0, Math.round((pregnancyWeekNum / 40) * 100)))
  const remainingWeeks = Math.max(0, 40 - pregnancyWeekNum)
  const dueDays = remainingWeeks * 7
  const PUI = pregnancyUiByLanguage[L]
  const todayPregnancyChecklist = pregnancyChecklistByDate[todayKey] ?? defaultPregnancyChecklist()
  const todayPregnancySymptoms = pregnancySymptomsByDate[todayKey] ?? defaultPregnancySymptoms()
  const pregnancySymptomRows: { key: PregnancySymptomKey; label: string }[] = [
    { key: "nausea", label: PUI.symptomNausea },
    { key: "sleep", label: PUI.symptomSleep },
    { key: "energy", label: PUI.symptomEnergy },
    { key: "mood", label: PUI.symptomMood },
  ]
  const pregnancyChecklistDone = Object.values(todayPregnancyChecklist).filter(Boolean).length
  const pregnancyChecklistPct = Math.round((pregnancyChecklistDone / 5) * 100)
  const pregnancyTips = useMemo(() => getPregnancyDailyTips(pregnancyWeekNum || 1, L), [pregnancyWeekNum, L])
  const pregnancyDetail = useMemo(() => getPregnancyDevelopmentDetail(pregnancyWeekNum || 1, L), [pregnancyWeekNum, L])
  const pregnancySize = useMemo(() => getPregnancySizeEstimate(pregnancyWeekNum || 1), [pregnancyWeekNum])
  const pregnancySizeBadge = useMemo(() => getPregnancySizeBadge(pregnancyWeekNum || 1), [pregnancyWeekNum])
  const pregnancySizeDetail = useMemo(
    () => getPregnancySizeDetail(pregnancyWeekNum || 1, L),
    [pregnancyWeekNum, L]
  )
  const avgWeekScore = (values: number[]) =>
    values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0
  const pregnancyTrimester = useMemo(() => getPregnancyTrimester(pregnancyWeekNum || 1), [pregnancyWeekNum])
  const pregnancyFocus = useMemo(() => getPregnancyFocus(pregnancyWeekNum || 1, L), [pregnancyWeekNum, L])
  const pregnancyNutrition = useMemo(
    () => getPregnancyNutritionTips(pregnancyWeekNum || 1, L),
    [pregnancyWeekNum, L]
  )
  const pregnancyTests = useMemo(
    () => getPregnancyTestPlan(pregnancyWeekNum || 1, L),
    [pregnancyWeekNum, L]
  )
  const pregnancyTestsMarkedDates = useMemo(() => {
    const marks: TestMarkedDateMap = {}
    const summaryByDate: Record<string, { done: number; total: number }> = {}

    pregnancyTests.forEach((test) => {
      const key = getDateKeyFromInput(pregnancyTestDates[test.id] ?? "")
      if (!key) return
      summaryByDate[key] = {
        done: (summaryByDate[key]?.done ?? 0) + (pregnancyTestDone[test.id] ? 1 : 0),
        total: (summaryByDate[key]?.total ?? 0) + 1,
      }
    })

    Object.entries(summaryByDate).forEach(([key, summary]) => {
      const allDone = summary.total > 0 && summary.done === summary.total
      marks[key] = {
        ...(marks[key] ?? {}),
        marked: true,
        dotColor: allDone ? tc("#3E6A2E") : moduleTheme.colors.brand,
      }
    })

    if (selectedPregnancyTestDate) {
      marks[selectedPregnancyTestDate] = {
        ...(marks[selectedPregnancyTestDate] ?? {}),
        selected: true,
        selectedColor: moduleTheme.colors.brand,
      }
    }
    return marks
  }, [pregnancyTests, pregnancyTestDates, pregnancyTestDone, selectedPregnancyTestDate])
  const pregnancyTestsOnSelectedDay = useMemo(() => {
    if (!selectedPregnancyTestDate) return []
    return pregnancyTests.filter((test) => {
      const key = getDateKeyFromInput(pregnancyTestDates[test.id] ?? "")
      return key === selectedPregnancyTestDate
    })
  }, [pregnancyTests, pregnancyTestDates, selectedPregnancyTestDate])
  const pregnancyDoctorQuestions = useMemo(
    () => getPregnancyDoctorQuestions(pregnancyWeekNum || 1, L),
    [pregnancyWeekNum, L]
  )
  const pregnancyTestDoneCount = useMemo(
    () => pregnancyTests.filter((test) => pregnancyTestDone[test.id]).length,
    [pregnancyTests, pregnancyTestDone]
  )
  const pregnancyMomChanges = useMemo(() => getPregnancyMomChanges(pregnancyWeekNum || 1, L), [pregnancyWeekNum, L])
  const pregnancySafetyNote = useMemo(() => getPregnancySafetyNote(L), [L])
  const pregnancyWaterWeekly = useMemo(
    () =>
      avgWeekScore(
        weekKeys.map((k) => {
          const target = Math.max(500, Number(waterTargetMl) || 2000)
          const value = Number(waterDailyMl[k] ?? 0)
          return Math.min(100, Math.round((value / target) * 100))
        })
      ),
    [weekKeys, waterDailyMl, waterTargetMl]
  )
  const pregnancyWalkWeekly = useMemo(
    () =>
      avgWeekScore(
        weekKeys.map((k) => ((pregnancyChecklistByDate[k] ?? defaultPregnancyChecklist()).walk ? 100 : 35))
      ),
    [weekKeys, pregnancyChecklistByDate]
  )
  const pregnancyNutritionWeekly = useMemo(
    () => avgWeekScore(weekKeys.map((k) => adherenceDaily[k] ?? 40)),
    [weekKeys, adherenceDaily]
  )
  const pregnancySleepWeekly = useMemo(
    () =>
      avgWeekScore(
        weekKeys.map((k) => ((pregnancyChecklistByDate[k] ?? defaultPregnancyChecklist()).rest ? 100 : 35))
      ),
    [weekKeys, pregnancyChecklistByDate]
  )
  const pregnancyWeeklyOverall = Math.round(
    (pregnancyWaterWeekly + pregnancyWalkWeekly + pregnancyNutritionWeekly + pregnancySleepWeekly) / 4
  )
  const pregnancyWeeklySummaryData = [
    { label: PUI.weeklyWater, value: pregnancyWaterWeekly },
    { label: PUI.weeklyWalk, value: pregnancyWalkWeekly },
    { label: PUI.weeklyNutrition, value: pregnancyNutritionWeekly },
    { label: PUI.weeklySleep, value: pregnancySleepWeekly },
  ]
  const pregnancySymptomAverages = useMemo(() => {
    const avgFor = (key: PregnancySymptomKey) =>
      Math.round(
        (weekKeys.reduce((sum, dateKey) => {
          const day = pregnancySymptomsByDate[dateKey] ?? defaultPregnancySymptoms()
          return sum + (day[key] ?? 3)
        }, 0) /
          Math.max(1, weekKeys.length)) *
          10
      ) / 10

    return [
      { label: PUI.symptomNausea, value: avgFor("nausea") },
      { label: PUI.symptomSleep, value: avgFor("sleep") },
      { label: PUI.symptomEnergy, value: avgFor("energy") },
      { label: PUI.symptomMood, value: avgFor("mood") },
    ]
  }, [weekKeys, pregnancySymptomsByDate, PUI.symptomNausea, PUI.symptomSleep, PUI.symptomEnergy, PUI.symptomMood])
  const pregnancySymptomTrend = useMemo(
    () =>
      weekKeys.map((dateKey) => {
        const day = pregnancySymptomsByDate[dateKey] ?? defaultPregnancySymptoms()
        return Math.round(((day.nausea + day.sleep + day.energy + day.mood) / 4) * 10) / 10
      }),
    [weekKeys, pregnancySymptomsByDate]
  )
  const pregnancyDueDate = useMemo(() => {
    const base = new Date()
    const daysLeft = Math.max(0, (40 - (pregnancyWeekNum || 1)) * 7)
    base.setDate(base.getDate() + daysLeft)
    return formatDateDisplay(base)
  }, [pregnancyWeekNum])
  const pregnancyTimelineWeeks = useMemo(() => {
    const start = Math.max(1, (pregnancyWeekNum || 1) - 2)
    const end = Math.min(40, start + 4)
    const list: number[] = []
    for (let w = start; w <= end; w++) list.push(w)
    return list
  }, [pregnancyWeekNum])
  const babyLengthAvg = useMemo(() => avgFromRangeText(pregnancySize.lengthCm), [pregnancySize.lengthCm])
  const babyWeightAvg = useMemo(() => avgFromRangeText(pregnancySize.weightG), [pregnancySize.weightG])
  const babyLengthPct = Math.min(100, Math.round((babyLengthAvg / 52) * 100))
  const babyWeightPct = Math.min(100, Math.round((babyWeightAvg / 3800) * 100))
  const bpLast = bloodPressureEntries[0]
  const bpWeeklyAvg = useMemo(() => {
    const now = Date.now()
    const weekItems = bloodPressureEntries.filter(
      (x) => now - new Date(x.recordedAt).getTime() <= 7 * DAY_MS
    )
    if (weekItems.length === 0) return null
    const s = Math.round(weekItems.reduce((sum, x) => sum + x.systolic, 0) / weekItems.length)
    const d = Math.round(weekItems.reduce((sum, x) => sum + x.diastolic, 0) / weekItems.length)
    const pVals = weekItems.map((x) => x.pulse).filter((x): x is number => typeof x === "number")
    const p = pVals.length > 0 ? Math.round(pVals.reduce((sum, x) => sum + x, 0) / pVals.length) : undefined
    return { systolic: s, diastolic: d, pulse: p }
  }, [bloodPressureEntries])
  const panicWeeklyLogs = useMemo(() => {
    const now = Date.now()
    return panicLogs.filter((x) => now - new Date(x.recordedAt).getTime() <= 7 * DAY_MS)
  }, [panicLogs])
  const panicWeeklyAvg = useMemo(() => {
    if (panicWeeklyLogs.length === 0) return 0
    return Math.round((panicWeeklyLogs.reduce((sum, x) => sum + x.severity, 0) / panicWeeklyLogs.length) * 10) / 10
  }, [panicWeeklyLogs])
  const panicTodayLogs = useMemo(() => {
    const today = getTodayKey()
    return panicLogs.filter((x) => formatDateKey(new Date(x.recordedAt)) === today)
  }, [panicLogs])
  const panicTodayAvg = useMemo(() => {
    if (panicTodayLogs.length === 0) return 0
    return Math.round((panicTodayLogs.reduce((sum, x) => sum + x.severity, 0) / panicTodayLogs.length) * 10) / 10
  }, [panicTodayLogs])
  const panicCalmScore = useMemo(() => {
    if (panicTodayLogs.length === 0) return 100
    const raw = 100 - panicTodayAvg * 7 - panicTodayLogs.length * 4
    return Math.max(0, Math.min(100, Math.round(raw)))
  }, [panicTodayLogs.length, panicTodayAvg])
  const panicPhases = [HT.panicPhaseIn, HT.panicPhaseHold, HT.panicPhaseOut]
  const panicPhaseDurations = [4, 4, 6]
  const panicCurrentDuration = panicPhaseDurations[panicPhaseIndex] ?? 4
  const panicPhaseProgress = Math.round(
    ((panicCurrentDuration - panicPhaseRemaining) / Math.max(1, panicCurrentDuration)) * 100
  )
  const groundingItems = [
    HT.panicGrounding5,
    HT.panicGrounding4,
    HT.panicGrounding3,
    HT.panicGrounding2,
    HT.panicGrounding1,
  ]
  const groundingIdeas = groundingIdeasByLanguage[L] ?? groundingIdeasByLanguage.tr
  const groundingStepIdeas = groundingIdeas[panicGroundingStep] ?? []
  const groundingCompletedCount = groundingItems.reduce(
    (sum, _, idx) => sum + (panicGroundingChecks[idx] ? 1 : 0),
    0
  )
  const healthTabs: { id: HealthTab; label: string }[] = [
    { id: "cycle", label: HT.cycleShort },
    { id: "pregnancy", label: HT.pregnancyShort },
    { id: "panic", label: HT.panicShort },
    { id: "medicine", label: HT.medicineShort },
    { id: "water", label: HT.waterShort },
    { id: "steps", label: HT.stepsShort },
    { id: "bloodPressure", label: HT.bloodPressureShort },
    { id: "diet", label: HT.dietShort },
  ]

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, compact && styles.contentCompact]}
    >
      <View style={styles.hero}>
        <View pointerEvents="none" style={styles.heroImage}><ImageBackground source={{ uri: HERO_IMAGE_URI }} style={styles.heroImage} imageStyle={styles.heroImageInner} /></View>
        <View pointerEvents="none" style={styles.heroOverlayStrong} />
        <View pointerEvents="none" style={styles.heroOverlaySoft} />
        <View pointerEvents="none" style={styles.heroGlowOne} />
        <View pointerEvents="none" style={styles.heroGlowTwo} />
        <View style={styles.heroTopRow}>
          <Text style={styles.heroBadge}>{HT.pregnancyTitle}</Text>
          <Text style={styles.heroBadgeSoft}>
            {pregnant ? `${HT.weekPlaceholder} ${pregnancyWeekNum}` : HT.pregnancyOff}
          </Text>
        </View>
        <Text style={[styles.title, compact && styles.titleCompact]}>{HT.title}</Text>
        <Text style={[styles.Subtitle, compact && styles.SubtitleCompact]}>
          {HT.Subtitle}
        </Text>
        <View style={styles.progressWrap}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pregnancyProgress}%` }]} />
          </View>
          <Text style={styles.progressText}>%{pregnancyProgress}</Text>
        </View>
        <View style={styles.heroStatsRow}>
          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatValue}>
              {pregnant ? pregnancyWeekNum : Math.abs(cycleDaysDelta)}
            </Text>
            <Text style={styles.heroStatLabel}>
              {pregnant ? HT.weekPlaceholder : HT.dayLabel}
            </Text>
          </View>
          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatValue}>
              {pregnant ? remainingWeeks : Math.abs(cycleDaysDelta)}
            </Text>
            <Text style={styles.heroStatLabel}>
              {pregnant
                ? HT.remainingLabel
                : cycleDaysDelta > 0
                  ? HT.remainingLabel
                  : cycleDaysDelta < 0
                    ? HT.lateLabel
                    : HT.todayLabel}
            </Text>
          </View>
        </View>
        <View style={styles.heroActions}>
          <Pressable style={[styles.heroAction, !pregnant && styles.heroActionActive]} onPress={() => void updatePregnancy(false)}>
            <Text style={[styles.heroActionText, !pregnant && styles.heroActionTextActive]}>{HT.pregnancyActionOff}</Text>
          </Pressable>
          <Pressable style={[styles.heroAction, pregnant && styles.heroActionActive]} onPress={() => void updatePregnancy(true)}>
            <Text style={[styles.heroActionText, pregnant && styles.heroActionTextActive]}>{HT.pregnancyActionOn}</Text>
          </Pressable>
        </View>
        <View style={styles.metricBoxes}>
          <View style={styles.metricBox}>
            <Text style={[styles.metricLabel, compact && styles.metricLabelCompact]}>
              {HT.waterShort}
            </Text>
            <Text style={[styles.metricValue, compact && styles.metricValueCompact]}>
              %{waterPct}
            </Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={[styles.metricLabel, compact && styles.metricLabelCompact]}>
              {HT.dietShort}
            </Text>
            <Text style={[styles.metricValue, compact && styles.metricValueCompact]}>
              %{adherenceDaily[todayKey] ?? 0}
            </Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={[styles.metricLabel, compact && styles.metricLabelCompact]}>
              {HT.medicineShort}
            </Text>
            <Text style={[styles.metricValue, compact && styles.metricValueCompact]}>
              %{medicinePct}
            </Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={[styles.metricLabel, compact && styles.metricLabelCompact]}>
              {HT.stepsShort}
            </Text>
            <Text style={[styles.metricValue, compact && styles.metricValueCompact]}>
              {stepsAvailable ? stepsToday : 0}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.tabWrap}>
        <Text style={[styles.tabTitle, compact && styles.tabTitleCompact]}>Modul Sekmeleri</Text>
        <View style={styles.tabRowWrap}>
          {healthTabs.map((tab) => (
            <Pressable
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={[styles.tabChip, activeTab === tab.id && styles.tabChipActive]}
            >
              <View style={styles.tabChipInner}>
                <View style={[styles.tabChipDot, activeTab === tab.id && styles.tabChipDotActive]} />
                <Text style={[styles.tabChipText, activeTab === tab.id && styles.tabChipTextActive]}>
                  {tab.label}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      {activeTab === "cycle" ? (
      <View style={[styles.card, compact && styles.cardCompact]}>
        <View pointerEvents="none" style={styles.cardBgImage}><ImageBackground source={{ uri: CYCLE_IMAGE_URI }} style={styles.cardBgImage} imageStyle={styles.cardBgImageInner} /></View>
        <View pointerEvents="none" style={styles.cardBgOverlay} />
        <Text style={[styles.cardTitle, compact && styles.cardTitleCompact]}>
          {HT.cycleTitle}
        </Text>
        <Pressable style={styles.button} onPress={() => void upsertPeriodStart(getTodayKey())}>
          <Text style={[styles.buttonText, compact && styles.buttonTextCompact]}>
            {HT.cycleStartToday}
          </Text>
        </Pressable>
        <Text style={[styles.section, compact && styles.sectionCompact]}>{HT.cycleSummary}</Text>
        <View style={styles.cycleSummaryRow}>
          <View style={[styles.cycleSummaryCard, compact && styles.cycleSummaryCardCompact]}>
            <View style={styles.cycleSummaryHead}>
              <Ionicons name="calendar-clear-outline" size={14} color={tc("#D14A82")} />
              <Text style={[styles.smallText, compact && styles.smallTextCompact]}>{HT.cycleLastPeriod}</Text>
            </View>
            <Text style={[styles.textStrong, compact && styles.textStrongCompact]}>{cycleLastPeriodDate}</Text>
          </View>
          <View style={[styles.cycleSummaryCard, compact && styles.cycleSummaryCardCompact]}>
            <View style={styles.cycleSummaryHead}>
              <Ionicons name="calendar-outline" size={14} color={tc("#D14A82")} />
              <Text style={[styles.smallText, compact && styles.smallTextCompact]}>{HT.cycleNextPeriod}</Text>
            </View>
            <Text style={[styles.textStrong, compact && styles.textStrongCompact]}>{cycleNextPeriodDate}</Text>
          </View>
          <View style={[styles.cycleSummaryCard, styles.cycleSummaryCardAccent, compact && styles.cycleSummaryCardCompact]}>
            <View style={styles.cycleSummaryHead}>
              <MaterialCommunityIcons name="calendar-clock-outline" size={14} color={moduleTheme.colors.brand} />
              <Text style={[styles.smallText, compact && styles.smallTextCompact]}>{cycleDeltaLabelText}</Text>
            </View>
            <Text style={[styles.textStrong, compact && styles.textStrongCompact]}>{cycleDeltaValueText}</Text>
          </View>
        </View>
        <Text style={[styles.text, compact && styles.textCompact, styles.cycleStatusLine]}>{statusText}</Text>
        <Calendar key={language} onDayPress={onDayPress} markedDates={markedDates} />
        <Text style={[styles.section, compact && styles.sectionCompact]}>{HT.cycleUpcomingTitle}</Text>
        {cycleUpcomingDates.length > 0 ? (
          <View style={styles.cycleDateGrid}>
            {cycleUpcomingDates.map((date) => (
              <View key={`cycle-upcoming-${date}`} style={[styles.cycleDateCard, compact && styles.cycleDateCardCompact]}>
                <View style={styles.cycleDateHead}>
                  <Ionicons name="calendar-outline" size={14} color={moduleTheme.colors.textMuted} />
                  <Text style={[styles.cycleDateMain, compact && styles.cycleDateMainCompact]}>
                    {formatDateByLanguage(date, L)}
                  </Text>
                </View>
                <Text style={[styles.cycleDateSub, compact && styles.cycleDateSubCompact]}>
                  {getShortDayLabel(date, L)}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={[styles.text, compact && styles.textCompact]}>{HT.cycleUpcomingEmpty}</Text>
        )}
        <Text style={[styles.section, compact && styles.sectionCompact]}>
          {HT.fertileWindowTitle}
        </Text>
        {fertileWindowDates.length > 0 ? (
          <View style={styles.cycleDateGrid}>
            {fertileWindowDates.map((date) => (
              <View key={date} style={[styles.cycleDateCard, styles.cycleDateCardFertile, compact && styles.cycleDateCardCompact]}>
                <View style={styles.cycleDateHead}>
                  <MaterialCommunityIcons name="baby-face-outline" size={14} color={tc("#A2643D")} />
                  <Text style={[styles.cycleDateMain, compact && styles.cycleDateMainCompact]}>
                    {formatDateByLanguage(date, L)}
                  </Text>
                </View>
                <Text style={[styles.cycleDateSub, compact && styles.cycleDateSubCompact]}>
                  {getShortDayLabel(date, L)}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={[styles.text, compact && styles.textCompact]}>
            {HT.fertileWindowEmpty}
          </Text>
        )}
      </View>
      ) : null}

      {activeTab === "pregnancy" ? (
      <View style={[styles.card, compact && styles.cardCompact]}>
        <View pointerEvents="none" style={styles.cardBgImage}><ImageBackground source={{ uri: PREGNANCY_IMAGE_URI }} style={styles.cardBgImage} imageStyle={styles.cardBgImageInner} /></View>
        <View pointerEvents="none" style={styles.cardBgOverlay} />
        <View style={styles.rowBetween}>
          <Text style={[styles.cardTitle, compact && styles.cardTitleCompact]}>
            {HT.pregnancyTitle}
          </Text>
          <Switch value={pregnant} onValueChange={(v) => void updatePregnancy(v)} />
        </View>
        {pregnant ? (
          <>
            <View style={styles.fieldCard}>
              <TextInput
                value={pregnancyWeek}
                onChangeText={(v) => void savePregnancyWeek(v)}
                style={[styles.input, styles.inputInField]}
                placeholder={HT.weekPlaceholder}
                placeholderTextColor={tc("#8C6F5F")}
              />
            </View>
            <Text style={[styles.text, compact && styles.textCompact]}>
              {HT.weekPlaceholder} {pregnancyWeek} | {getPregnancyMilestone(Number(pregnancyWeek) || 1, L)}
            </Text>
            <Text style={[styles.textStrong, compact && styles.textStrongCompact]}>
              {PUI.countdown}: {remainingWeeks} {PUI.weeks} / {dueDays} {PUI.days}
            </Text>
            <View style={styles.miniProgressTrack}>
              <View style={[styles.miniProgressFill, { width: `${pregnancyProgress}%` }]} />
            </View>
            <View style={styles.rowBetween}>
              <Text style={[styles.smallText, compact && styles.smallTextCompact]}>
                {PUI.trimester}: {pregnancyTrimester}
              </Text>
              <Text style={[styles.smallText, compact && styles.smallTextCompact]}>
                {PUI.dueDate}: {pregnancyDueDate}
              </Text>
            </View>
            <Text style={[styles.section, compact && styles.sectionCompact]}>{PUI.development}</Text>
            <View style={styles.block}>
              <Text style={[styles.text, compact && styles.textCompact]}>{pregnancyDetail}</Text>
            </View>

            <Text style={[styles.section, compact && styles.sectionCompact]}>{PUI.babyEstimate}</Text>
            <View style={styles.pregViSualCard}>
              <View style={styles.pregViSualTop}>
                <View style={styles.pregViSualLeft}>
                  <Animated.View
                    style={[
                      styles.pregThumb,
                      { backgroundColor: pregnancySizeBadge.color },
                      { transform: [{ scale: pregThumbPulse }] },
                    ]}
                  >
                    <View style={styles.pregThumbInner}>
                      <MaterialCommunityIcons name={pregnancySizeBadge.icon as any} size={22} color={tc("#7A2D4F")} />
                    </View>
                  </Animated.View>
                </View>
                <View style={styles.pregViSualMeta}>
                  <Text style={[styles.textStrong, compact && styles.textStrongCompact]}>
                    {PUI.thisWeek}: {pregnancyWeekNum}
                  </Text>
                  <Text style={[styles.smallText, compact && styles.smallTextCompact]}>
                    {PUI.babyCompare}: {pregnancySizeDetail.compare}
                  </Text>
                </View>
              </View>
              <Text style={[styles.textStrong, compact && styles.textStrongCompact]}>
                {PUI.babyLength}: {pregnancySize.lengthCm} cm
              </Text>
              <View style={styles.pregMiniTrack}>
                <View style={[styles.pregMiniFill, { width: `${babyLengthPct}%` }]} />
              </View>
              <Text style={[styles.textStrong, compact && styles.textStrongCompact]}>
                {PUI.babyWeight}: {pregnancySize.weightG} g
              </Text>
              <View style={styles.pregMiniTrack}>
                <View style={[styles.pregMiniFill, { width: `${babyWeightPct}%` }]} />
              </View>
              <Text style={[styles.smallText, compact && styles.smallTextCompact]}>
                {PUI.babyNote}: {pregnancySizeDetail.note}
              </Text>
            </View>
            <Text style={[styles.section, compact && styles.sectionCompact]}>{PUI.babyFocus}</Text>
            <View style={styles.block}>
              {pregnancyFocus.map((item, idx) => (
                <Text key={`focus-${idx}`} style={[styles.text, compact && styles.textCompact]}>
                  - {item}
                </Text>
              ))}
            </View>

            <Text style={[styles.section, compact && styles.sectionCompact]}>{PUI.nutrition}</Text>
            <View style={styles.block}>
              <Text style={[styles.textStrong, compact && styles.textStrongCompact]}>
                {PUI.nutritionPrefer}
              </Text>
              {pregnancyNutrition.prefer.map((item, idx) => (
                <Text key={`nutrition-${idx}`} style={[styles.text, compact && styles.textCompact]}>
                  - {item}
                </Text>
              ))}
              <Text style={[styles.textStrong, compact && styles.textStrongCompact, { marginTop: 4 }]}>
                {PUI.nutritionAvoid}
              </Text>
              {pregnancyNutrition.avoid.map((item, idx) => (
                <Text key={`nutrition-avoid-${idx}`} style={[styles.text, compact && styles.textCompact]}>
                  - {item}
                </Text>
              ))}
            </View>

            <Text style={[styles.section, compact && styles.sectionCompact]}>{PUI.momChanges}</Text>
            <View style={styles.block}>
              {pregnancyMomChanges.map((item, idx) => (
                <Text key={`mom-${idx}`} style={[styles.text, compact && styles.textCompact]}>
                  - {item}
                </Text>
              ))}
            </View>

            <Text style={[styles.section, compact && styles.sectionCompact]}>{PUI.tips}</Text>
            <View style={styles.block}>
              {pregnancyTips.map((tip, idx) => (
                <Text key={`tip-${idx}`} style={[styles.text, compact && styles.textCompact]}>
                  - {tip}
                </Text>
              ))}
            </View>

            <Text style={[styles.section, compact && styles.sectionCompact]}>{PUI.checklist}</Text>
            <Text style={[styles.smallText, compact && styles.smallTextCompact]}>
              {PUI.checklistDone}: %{pregnancyChecklistPct}
            </Text>
            <View style={styles.row}>
              <Pressable style={[styles.chip, compact && styles.chipCompact, todayPregnancyChecklist.water && styles.mealDone]} onPress={() => void togglePregnancyChecklist("water")}><Text style={[styles.chipText, compact && styles.chipTextCompact]}>{PUI.taskWater}</Text></Pressable>
              <Pressable style={[styles.chip, compact && styles.chipCompact, todayPregnancyChecklist.walk && styles.mealDone]} onPress={() => void togglePregnancyChecklist("walk")}><Text style={[styles.chipText, compact && styles.chipTextCompact]}>{PUI.taskWalk}</Text></Pressable>
              <Pressable style={[styles.chip, compact && styles.chipCompact, todayPregnancyChecklist.vitamin && styles.mealDone]} onPress={() => void togglePregnancyChecklist("vitamin")}><Text style={[styles.chipText, compact && styles.chipTextCompact]}>{PUI.taskVitamin}</Text></Pressable>
              <Pressable style={[styles.chip, compact && styles.chipCompact, todayPregnancyChecklist.rest && styles.mealDone]} onPress={() => void togglePregnancyChecklist("rest")}><Text style={[styles.chipText, compact && styles.chipTextCompact]}>{PUI.taskRest}</Text></Pressable>
              <Pressable style={[styles.chip, compact && styles.chipCompact, todayPregnancyChecklist.checkup && styles.mealDone]} onPress={() => void togglePregnancyChecklist("checkup")}><Text style={[styles.chipText, compact && styles.chipTextCompact]}>{PUI.taskCheckup}</Text></Pressable>
            </View>

            <Text style={[styles.section, compact && styles.sectionCompact]}>{PUI.weeklySummary}</Text>
            <View style={styles.pregSummaryGrid}>
              {pregnancyWeeklySummaryData.map((item) => (
                <View key={item.label} style={[styles.pregSummaryCard, compact && styles.pregSummaryCardCompact]}>
                  <Text style={[styles.smallText, compact && styles.smallTextCompact]}>{item.label}</Text>
                  <Text style={[styles.textStrong, compact && styles.textStrongCompact]}>%{item.value}</Text>
                </View>
              ))}
            </View>
            <Text style={[styles.text, compact && styles.textCompact]}>
              {pregnancyWeeklyOverall >= 75 ? PUI.weeklyStatusGood : PUI.weeklyStatusFocus}
            </Text>

            <Text style={[styles.section, compact && styles.sectionCompact]}>{PUI.symptomDiary}</Text>
            <Text style={[styles.smallText, compact && styles.smallTextCompact]}>{PUI.symptomScaleHint}</Text>
            {pregnancySymptomRows.map((row) => (
              <View key={`symptom-${row.key}`} style={styles.symptomRow}>
                <Text style={[styles.textStrong, compact && styles.textStrongCompact]}>{row.label}</Text>
                <View style={styles.symptomScoreRow}>
                  {[1, 2, 3, 4, 5].map((score) => (
                    <Pressable
                      key={`${row.key}-${score}`}
                      style={[
                        styles.symptomScoreChip,
                        todayPregnancySymptoms[row.key] === score && styles.symptomScoreChipActive,
                      ]}
                      onPress={() => void setPregnancySymptomScore(row.key, score)}
                    >
                      <Text
                        style={[
                          styles.symptomScoreText,
                          todayPregnancySymptoms[row.key] === score && styles.symptomScoreTextActive,
                        ]}
                      >
                        {score}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}
            <Text style={[styles.section, compact && styles.sectionCompact]}>{PUI.symptomWeeklyAverages}</Text>
            <View style={styles.pregSummaryGrid}>
              {pregnancySymptomAverages.map((item) => (
                <View key={`symptom-avg-${item.label}`} style={[styles.pregSummaryCard, compact && styles.pregSummaryCardCompact]}>
                  <Text style={[styles.smallText, compact && styles.smallTextCompact]}>{item.label}</Text>
                  <Text style={[styles.textStrong, compact && styles.textStrongCompact]}>{item.value}/5</Text>
                </View>
              ))}
            </View>
            <WeeklyBars
              title={PUI.symptomWeeklyTrend}
              values={pregnancySymptomTrend}
              labels={weekLabels}
              maxValue={5}
              unit=""
              color={tc("#E58D7C")}
            />

            <Text style={[styles.section, compact && styles.sectionCompact]}>{PUI.testTimeline}</Text>
            <Text style={[styles.smallText, compact && styles.smallTextCompact]}>
              {pregnancyTestDoneCount}/{pregnancyTests.length} {PUI.testDone}
            </Text>
            {pregnancyTests.map((test) => {
              const done = Boolean(pregnancyTestDone[test.id])
              return (
                <View key={test.id} style={styles.testCard}>
                  <View style={styles.rowBetween}>
                    <Text style={[styles.textStrong, compact && styles.textStrongCompact]}>{test.title}</Text>
                    <Pressable
                      style={[styles.testBadge, done && styles.testBadgeDone]}
                      onPress={() => void togglePregnancyTestDone(test.id)}
                    >
                      <Text style={[styles.testBadgeText, done && styles.testBadgeTextDone]}>
                        {done ? PUI.testDone : PUI.testPending}
                      </Text>
                    </Pressable>
                  </View>
                  <Text style={[styles.smallText, compact && styles.smallTextCompact]}>
                    {PUI.testWindow}: {test.window}
                  </Text>
                  <Text style={[styles.text, compact && styles.textCompact]}>{test.note}</Text>
                  <TextInput
                    value={pregnancyTestDates[test.id] ?? ""}
                    onChangeText={(value) =>
                      setPregnancyTestDates((prev) => ({ ...prev, [test.id]: formatDateInput(value) }))
                    }
                    style={[styles.input, styles.inputInField]}
                    placeholder={PUI.testDatePlaceholder}
                    placeholderTextColor={tc("#8C6F5F")}
                  />
                  <View style={styles.rowBetween}>
                    <Text style={[styles.smallText, compact && styles.smallTextCompact]}>
                      {PUI.testDate}: {pregnancyTestDates[test.id] || "-"}
                    </Text>
                    <Pressable style={styles.testSaveBtn} onPress={() => void savePregnancyTestDate(test.id, test.title)}>
                      <Text style={styles.testSaveBtnText}>{PUI.testSaveDate}</Text>
                    </Pressable>
                  </View>
                </View>
              )
            })}
            <Text style={[styles.section, compact && styles.sectionCompact]}>{PUI.testCalendar}</Text>
            <View style={styles.testCalendarWrap}>
              <Calendar
                key={`${language}-preg-tests`}
                onDayPress={(day) => setSelectedPregnancyTestDate(day.dateString)}
                markedDates={pregnancyTestsMarkedDates}
              />
            </View>
            <Text style={[styles.smallText, compact && styles.smallTextCompact]}>
              {PUI.testOnDate}: {selectedPregnancyTestDate || "-"}
            </Text>
            {pregnancyTestsOnSelectedDay.length === 0 ? (
              <Text style={[styles.text, compact && styles.textCompact]}>{PUI.testNoDate}</Text>
            ) : (
              <View style={styles.block}>
                {pregnancyTestsOnSelectedDay.map((test) => (
                  <Text key={`on-day-${test.id}`} style={[styles.text, compact && styles.textCompact]}>
                    - {test.title}
                  </Text>
                ))}
              </View>
            )}
            <Text style={[styles.section, compact && styles.sectionCompact]}>{PUI.doctorQuestions}</Text>
            <View style={styles.block}>
              {pregnancyDoctorQuestions.map((q, idx) => (
                <Text key={`doctor-q-${idx}`} style={[styles.text, compact && styles.textCompact]}>
                  - {q}
                </Text>
              ))}
            </View>

            <Text style={[styles.section, compact && styles.sectionCompact]}>{PUI.appointment}</Text>
            <View style={styles.fieldCard}>
              <TextInput
                value={pregnancyAppointmentDate}
                onChangeText={(value) => setPregnancyAppointmentDate(formatDateInput(value))}
                style={[styles.input, styles.inputInField]}
                placeholder={PUI.appointmentPlaceholder}
                placeholderTextColor={tc("#8C6F5F")}
              />
            </View>
            <View style={styles.fieldCard}>
              <TextInput
                value={pregnancyAppointmentTime}
                onChangeText={(value) => setPregnancyAppointmentTime(formatTimeInput(value))}
                onBlur={() => setPregnancyAppointmentTime((prev) => finalizeTimeInput(prev))}
                style={[styles.input, styles.inputInField]}
                placeholder={PUI.appointmentTimePlaceholder}
                placeholderTextColor={tc("#8C6F5F")}
                keyboardType="number-pad"
              />
            </View>
            <Pressable style={styles.buttonSoft} onPress={() => void savePregnancyAppointment()}>
              <Text style={[styles.buttonText, compact && styles.buttonTextCompact]}>
                {PUI.saveAppointment}
              </Text>
            </Pressable>
            <Text style={[styles.section, compact && styles.sectionCompact]}>{PUI.weekTimeline}</Text>
            <View style={styles.timelineRow}>
              {pregnancyTimelineWeeks.map((w) => (
                <View
                  key={`tw-${w}`}
                  style={[
                    styles.timelineChip,
                    w < pregnancyWeekNum && styles.timelineChipDone,
                    w === pregnancyWeekNum && styles.timelineChipNow,
                  ]}
                >
                  <Text
                    style={[
                      styles.timelineText,
                      w === pregnancyWeekNum && styles.timelineTextNow,
                    ]}
                  >
                    {w}
                  </Text>
                </View>
              ))}
            </View>

            <Text style={[styles.section, compact && styles.sectionCompact]}>{PUI.safetyNote}</Text>
            <View style={styles.block}>
              <Text style={[styles.text, compact && styles.textCompact]}>{pregnancySafetyNote}</Text>
            </View>
          </>
        ) : (
          <Text style={[styles.text, compact && styles.textCompact]}>
            {HT.pregnancyOff}
          </Text>
        )}
      </View>
      ) : null}

      {activeTab === "medicine" ? (
      <View style={[styles.card, compact && styles.cardCompact]}>
        <View pointerEvents="none" style={styles.cardBgImage}><ImageBackground source={{ uri: MEDICINE_IMAGE_URI }} style={styles.cardBgImage} imageStyle={styles.cardBgImageInner} /></View>
        <View pointerEvents="none" style={styles.cardBgOverlay} />
        <Text style={[styles.cardTitle, compact && styles.cardTitleCompact]}>
          {HT.medicineTitle}
        </Text>
        <View style={styles.cycleSummaryRow}>
          <View style={[styles.cycleSummaryCard, compact && styles.cycleSummaryCardCompact]}>
            <View style={styles.cycleSummaryHead}>
              <Ionicons name="notifications-outline" size={14} color={tc("#D14A82")} />
              <Text style={[styles.smallText, compact && styles.smallTextCompact]}>{HT.medicineActiveCount}</Text>
            </View>
            <Text style={[styles.textStrong, compact && styles.textStrongCompact]}>{sortedMedicines.length}</Text>
          </View>
          <View style={[styles.cycleSummaryCard, styles.cycleSummaryCardAccent, compact && styles.cycleSummaryCardCompact, { width: compact ? "100%" : "65.5%" }]}>
            <View style={styles.cycleSummaryHead}>
              <Ionicons name="time-outline" size={14} color={moduleTheme.colors.brand} />
              <Text style={[styles.smallText, compact && styles.smallTextCompact]}>{HT.medicineNextDose}</Text>
            </View>
            <Text numberOfLines={1} style={[styles.textStrong, compact && styles.textStrongCompact]}>{nextMedicineLabel}</Text>
          </View>
        </View>
        <View style={styles.miniProgressTrack}>
          <View style={[styles.miniProgressFill, { width: `${medicinePct}%` }]} />
        </View>
        <Text style={[styles.smallText, compact && styles.smallTextCompact]}>
          {HT.medicineTakenToday}: %{medicinePct} ({medicineTakenCount}/{sortedMedicines.length || 0})
        </Text>
        <View style={styles.fieldCard}>
          <TextInput
            value={medicineName}
            onChangeText={setMedicineName}
            style={[styles.input, styles.inputInField]}
            placeholder={HT.medicineNamePlaceholder}
            placeholderTextColor={tc("#8C6F5F")}
          />
        </View>
        <View style={styles.fieldCard}>
          <TextInput
            value={medicineTime}
            onChangeText={(value) => setMedicineTime(formatTimeInput(value))}
            onBlur={() => setMedicineTime((prev) => finalizeTimeInput(prev))}
            style={[styles.input, styles.inputInField]}
            placeholder={HT.medicineTimePlaceholder}
            placeholderTextColor={tc("#8C6F5F")}
            keyboardType="number-pad"
          />
        </View>
        <Text style={[styles.section, compact && styles.sectionCompact]}>{HT.medicineQuickTimes}</Text>
        <View style={styles.row}>
          {["08:00", "13:00", "18:00", "22:00"].map((t) => (
            <Pressable
              key={`qt-${t}`}
              style={[styles.chip, compact && styles.chipCompact, medicineTime === t && styles.quickTimeChipActive]}
              onPress={() => setQuickMedicineTime(t)}
            >
              <Text style={[styles.chipText, compact && styles.chipTextCompact, medicineTime === t && styles.quickTimeChipTextActive]}>{t}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={[styles.section, compact && styles.sectionCompact]}>{HT.medicineDayEndTimeTitle}</Text>
        <View style={styles.row}>
          {["20:00", "21:00", "22:00", "23:00"].map((t) => (
            <Pressable
              key={`dt-${t}`}
              style={[styles.chip, compact && styles.chipCompact, medicineDailyCheckTime === t && styles.quickTimeChipActive]}
              onPress={() => void setMedicineDayEndTimeValue(t)}
            >
              <Text style={[styles.chipText, compact && styles.chipTextCompact, medicineDailyCheckTime === t && styles.quickTimeChipTextActive]}>{t}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable style={styles.buttonSoft} onPress={() => void addMedicineReminder()}>
          <Text style={[styles.buttonText, compact && styles.buttonTextCompact]}>
            {HT.medicineAdd}
          </Text>
        </Pressable>
        {sortedMedicines.length === 0 ? (
          <Text style={[styles.text, compact && styles.textCompact]}>{HT.medicineEmpty}</Text>
        ) : (
          sortedMedicines.map((item) => (
            <View
              key={item.id}
              style={[styles.medicineCard, todayMedicineTaken[item.id] && styles.medicineCardTaken]}
            >
              <View style={styles.medicineCardLeft}>
                <View style={styles.medicineTimeBadge}>
                  <Text style={styles.medicineTimeText}>{item.time}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.textStrong, compact && styles.textStrongCompact]}>{item.name}</Text>
                  <Text style={[styles.smallText, compact && styles.smallTextCompact]}>
                    {todayMedicineTaken[item.id] ? HT.medicineTaken : HT.medicinePending}
                  </Text>
                </View>
              </View>
              <Pressable
                style={[styles.takePill, todayMedicineTaken[item.id] && styles.takePillDone]}
                onPress={() => void toggleMedicineTaken(item.id)}
              >
                <Text style={[styles.takePillText, todayMedicineTaken[item.id] && styles.takePillTextDone]}>
                  {todayMedicineTaken[item.id] ? HT.medicineMarkUntaken : HT.medicineMarkTaken}
                </Text>
              </Pressable>
              <Pressable style={styles.removePill} onPress={() => void removeMedicineReminder(item)}>
                <Text style={styles.removeText}>{HT.medicineDelete}</Text>
              </Pressable>
            </View>
          ))
        )}
      </View>
      ) : null}

      {activeTab === "water" ? (
      <View style={[styles.card, compact && styles.cardCompact]}>
        <View pointerEvents="none" style={styles.cardBgImage}><ImageBackground source={{ uri: WATER_IMAGE_URI }} style={styles.cardBgImage} imageStyle={styles.cardBgImageInner} /></View>
        <View pointerEvents="none" style={styles.cardBgOverlay} />
        <Text style={[styles.cardTitle, compact && styles.cardTitleCompact]}>
          {HT.waterTitle}
        </Text>
        <Text style={[styles.text, compact && styles.textCompact]}>
          {HT.waterToday} {waterToday} ml | {HT.waterLeft} {waterLeft} ml
        </Text>
        <View style={styles.row}>
          <Pressable style={[styles.chip, compact && styles.chipCompact]} onPress={() => void addWater(200)}><Text style={[styles.chipText, compact && styles.chipTextCompact]}>+200</Text></Pressable>
          <Pressable style={[styles.chip, compact && styles.chipCompact]} onPress={() => void addWater(300)}><Text style={[styles.chipText, compact && styles.chipTextCompact]}>+300</Text></Pressable>
          <Pressable style={[styles.chip, compact && styles.chipCompact]} onPress={() => void addWater(500)}><Text style={[styles.chipText, compact && styles.chipTextCompact]}>+500</Text></Pressable>
        </View>
        <View style={styles.fieldCard}>
          <TextInput
            value={waterTargetMl}
            onChangeText={setWaterTargetMl}
            style={[styles.input, styles.inputInField]}
            placeholder={"G\u00fcnl\u00fck hedef (ml)"}
            placeholderTextColor={tc("#8C6F5F")}
            keyboardType="number-pad"
          />
        </View>
        <Pressable style={styles.buttonSoft} onPress={() => void saveDietBase()}><Text style={[styles.buttonText, compact && styles.buttonTextCompact]}>{HT.save}</Text></Pressable>
        <WeeklyBars title={HT.waterTrend} values={waterWeek} labels={weekLabels} maxValue={Math.max(1, ...waterWeek, Number(waterTargetMl) || 2000)} unit="ml" color={tc("#D59A7A")} />
      </View>
      ) : null}

      {activeTab === "steps" ? (
      <View style={[styles.card, compact && styles.cardCompact]}>
        <View pointerEvents="none" style={styles.cardBgImage}><ImageBackground source={{ uri: STEPS_IMAGE_URI }} style={styles.cardBgImage} imageStyle={styles.cardBgImageInner} /></View>
        <View pointerEvents="none" style={styles.cardBgOverlay} />
        <Text style={[styles.cardTitle, compact && styles.cardTitleCompact]}>
          {HT.stepsTitle}
        </Text>
        {stepsAvailable ? (
          <>
            <Text style={[styles.text, compact && styles.textCompact]}>
              {HT.stepsTodayLine
                .replace("{steps}", String(stepsToday))
                .replace("{goal}", String(stepsGoal))
                .replace("{left}", String(stepsLeft))}
            </Text>
            <Text style={[styles.smallText, compact && styles.smallTextCompact]}>
              {stepsAvailable ? HT.stepsLiveOn : HT.stepsLiveOff}
            </Text>
            <View style={styles.cycleSummaryRow}>
              <View style={[styles.cycleSummaryCard, compact && styles.cycleSummaryCardCompact]}>
                <View style={styles.cycleSummaryHead}>
                  <Ionicons name="walk-outline" size={14} color={tc("#D14A82")} />
                  <Text style={[styles.smallText, compact && styles.smallTextCompact]}>{HT.todayLabel}</Text>
                </View>
                <Text style={[styles.textStrong, compact && styles.textStrongCompact]}>{stepsToday}</Text>
              </View>
              <View style={[styles.cycleSummaryCard, compact && styles.cycleSummaryCardCompact]}>
                <View style={styles.cycleSummaryHead}>
                  <Ionicons name="flag-outline" size={14} color={tc("#D14A82")} />
                  <Text style={[styles.smallText, compact && styles.smallTextCompact]}>{HT.goal}</Text>
                </View>
                <Text style={[styles.textStrong, compact && styles.textStrongCompact]}>{stepsGoal}</Text>
              </View>
              <View style={[styles.cycleSummaryCard, styles.cycleSummaryCardAccent, compact && styles.cycleSummaryCardCompact]}>
                <View style={styles.cycleSummaryHead}>
                  <Ionicons name="trending-up-outline" size={14} color={moduleTheme.colors.brand} />
                  <Text style={[styles.smallText, compact && styles.smallTextCompact]}>{HT.remainingLabel}</Text>
                </View>
                <Text style={[styles.textStrong, compact && styles.textStrongCompact]}>{stepsLeft}</Text>
              </View>
            </View>
          </>
        ) : (
          <Text style={[styles.text, compact && styles.textCompact]}>
            {HT.stepSunavailable}
          </Text>
        )}
        <View style={styles.fieldCard}>
          <Ionicons name="walk-outline" size={18} color={moduleTheme.colors.textStrong} />
          <TextInput
            value={stepsTarget}
            onChangeText={setStepsTarget}
            style={[styles.input, styles.inputInField]}
            placeholder={HT.stepsGoalPlaceholder}
            placeholderTextColor={tc("#8C6F5F")}
            keyboardType="number-pad"
          />
        </View>
        <Pressable style={styles.buttonSoft} onPress={() => void saveStepsGoal()}>
          <Text style={[styles.buttonText, compact && styles.buttonTextCompact]}>
            {HT.save}
          </Text>
        </Pressable>
      </View>
      ) : null}

      {activeTab === "bloodPressure" ? (
      <View style={[styles.card, compact && styles.cardCompact]}>
        <View pointerEvents="none" style={styles.cardBgImage}><ImageBackground source={{ uri: BLOOD_PRESSURE_IMAGE_URI }} style={styles.cardBgImage} imageStyle={styles.cardBgImageInner} /></View>
        <View pointerEvents="none" style={styles.cardBgOverlay} />
        <Text style={[styles.cardTitle, compact && styles.cardTitleCompact]}>
          {HT.bloodPressureTitle}
        </Text>
        <View style={styles.fieldCard}>
          <TextInput
            value={bpSystolic}
            onChangeText={setBpSystolic}
            style={[styles.input, styles.inputInField]}
            placeholder={HT.bloodPressureSystolic}
            placeholderTextColor={tc("#8C6F5F")}
            keyboardType="number-pad"
          />
        </View>
        <View style={styles.fieldCard}>
          <TextInput
            value={bpDiastolic}
            onChangeText={setBpDiastolic}
            style={[styles.input, styles.inputInField]}
            placeholder={HT.bloodPressureDiastolic}
            placeholderTextColor={tc("#8C6F5F")}
            keyboardType="number-pad"
          />
        </View>
        <View style={styles.fieldCard}>
          <TextInput
            value={bpPulse}
            onChangeText={setBpPulse}
            style={[styles.input, styles.inputInField]}
            placeholder={HT.bloodPressurePulse}
            placeholderTextColor={tc("#8C6F5F")}
            keyboardType="number-pad"
          />
        </View>
        <Pressable style={styles.buttonSoft} onPress={() => void addBloodPressure()}>
          <Text style={[styles.buttonText, compact && styles.buttonTextCompact]}>
            {HT.bloodPressureAdd}
          </Text>
        </Pressable>

        <Text style={[styles.section, compact && styles.sectionCompact]}>{HT.bloodPressureLast}</Text>
        {bpLast ? (
          <View style={styles.cycleSummaryRow}>
            <View style={[styles.cycleSummaryCard, compact && styles.cycleSummaryCardCompact]}>
              <Text style={[styles.smallText, compact && styles.smallTextCompact]}>mmHg</Text>
              <Text style={[styles.textStrong, compact && styles.textStrongCompact]}>
                {bpLast.systolic}/{bpLast.diastolic}
              </Text>
            </View>
            <View style={[styles.cycleSummaryCard, compact && styles.cycleSummaryCardCompact]}>
              <Text style={[styles.smallText, compact && styles.smallTextCompact]}>BPM</Text>
              <Text style={[styles.textStrong, compact && styles.textStrongCompact]}>
                {bpLast.pulse ?? "-"}
              </Text>
            </View>
            <View style={[styles.cycleSummaryCard, styles.cycleSummaryCardAccent, compact && styles.cycleSummaryCardCompact]}>
              <Text style={[styles.smallText, compact && styles.smallTextCompact]}>{HT.bloodPressureStatus}</Text>
              <Text style={[styles.textStrong, compact && styles.textStrongCompact]}>
                {classifyBloodPressure(bpLast.systolic, bpLast.diastolic)}
              </Text>
            </View>
          </View>
        ) : (
          <Text style={[styles.text, compact && styles.textCompact]}>{HT.bloodPressureNoData}</Text>
        )}

        <Text style={[styles.section, compact && styles.sectionCompact]}>{HT.bloodPressureWeekly}</Text>
        {bpWeeklyAvg ? (
          <Text style={[styles.text, compact && styles.textCompact]}>
            {bpWeeklyAvg.systolic}/{bpWeeklyAvg.diastolic} mmHg
            {typeof bpWeeklyAvg.pulse === "number" ? ` | BPM ${bpWeeklyAvg.pulse}` : ""}
          </Text>
        ) : (
          <Text style={[styles.text, compact && styles.textCompact]}>{HT.bloodPressureNoData}</Text>
        )}
        <Text style={[styles.section, compact && styles.sectionCompact]}>{HT.bloodPressureAdviceTitle}</Text>
        <View style={styles.block}>
          <Text style={[styles.text, compact && styles.textCompact]}>
            {bpLast ? getBloodPressureAdvice(bpLast.systolic, bpLast.diastolic) : HT.bloodPressureNoData}
          </Text>
        </View>

        {bloodPressureEntries.slice(0, 7).map((item) => (
          <View key={item.id} style={styles.medicineCard}>
            <View style={styles.medicineCardLeft}>
              <View style={styles.medicineTimeBadge}>
                <Text style={styles.medicineTimeText}>{item.systolic}/{item.diastolic}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.textStrong, compact && styles.textStrongCompact]}>
                  {classifyBloodPressure(item.systolic, item.diastolic)}
                </Text>
                <Text style={[styles.smallText, compact && styles.smallTextCompact]}>
                  {new Date(item.recordedAt).toLocaleString(localeByLanguage[L])}
                  {typeof item.pulse === "number" ? ` • BPM ${item.pulse}` : ""}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>
      ) : null}

      {activeTab === "panic" ? (
      <View style={[styles.card, compact && styles.cardCompact]}>
        <View pointerEvents="none" style={styles.cardBgImage}><ImageBackground source={{ uri: PANIC_IMAGE_URI }} style={styles.cardBgImage} imageStyle={styles.cardBgImageInner} /></View>
        <View pointerEvents="none" style={[styles.cardBgOverlay, styles.cardBgOverlayLight]} />
        <Text style={[styles.cardTitle, compact && styles.cardTitleCompact]}>
          {HT.panicTitle}
        </Text>
        <View style={styles.panicBreathCard}>
          <View style={styles.panicSectionHead}>
            <View style={styles.panicHeadIconWrap}>
              <Ionicons name="flower-outline" size={14} color={tc("#C01765")} />
            </View>
            <Text style={[styles.section, compact && styles.sectionCompact, styles.panicSectionTitle]}>
              {HT.panicFullscreenTitle}
            </Text>
          </View>
          <Text style={[styles.text, compact && styles.textCompact]}>{HT.panicBreathGuide}</Text>
          <View style={styles.panicCalmScoreCard}>
            <View style={styles.panicCalmScoreLeft}>
              <Text style={[styles.smallText, compact && styles.smallTextCompact]}>{HT.panicCalmScore}</Text>
              <Text style={styles.panicCalmScoreValue}>{panicCalmScore}</Text>
            </View>
            <View style={styles.panicCalmScoreRight}>
              <Text style={[styles.smallText, compact && styles.smallTextCompact]}>
                {HT.panicTodayEpisodes}: {panicTodayLogs.length}
              </Text>
              <Text style={[styles.smallText, compact && styles.smallTextCompact]}>
                {HT.panicAvgSeverity}: {panicTodayAvg}/10
              </Text>
            </View>
          </View>
          <View style={styles.cycleSummaryRow}>
            <View style={[styles.cycleSummaryCard, compact && styles.cycleSummaryCardCompact]}>
              <Text style={[styles.smallText, compact && styles.smallTextCompact]}>{panicPhases[panicPhaseIndex]}</Text>
              <Text style={[styles.textStrong, compact && styles.textStrongCompact]}>{panicPhaseRemaining}s</Text>
            </View>
            <View style={[styles.cycleSummaryCard, compact && styles.cycleSummaryCardCompact]}>
              <Text style={[styles.smallText, compact && styles.smallTextCompact]}>{HT.panicRound}</Text>
              <Text style={[styles.textStrong, compact && styles.textStrongCompact]}>
                {Math.max(1, panicCycleCount)}
              </Text>
            </View>
          </View>
          <View style={styles.panicPhasePills}>
            {panicPhases.map((phase, idx) => (
              <View key={`phase-${idx}`} style={[styles.panicPhasePill, idx === panicPhaseIndex && styles.panicPhasePillActive]}>
                <Text style={[styles.panicPhasePillText, idx === panicPhaseIndex && styles.panicPhasePillTextActive]}>
                  {phase}
                </Text>
              </View>
            ))}
          </View>
          <View style={styles.miniProgressTrack}>
            <View style={[styles.miniProgressFill, { width: `${panicBreathing ? panicPhaseProgress : 0}%` }]} />
          </View>
          {panicBreathing ? (
            <Text style={[styles.smallText, compact && styles.smallTextCompact]}>
              {HT.panicContinueInFullscreen}
            </Text>
          ) : null}
          <Pressable style={styles.button} onPress={togglePanicBreathing}>
            <Text style={[styles.buttonText, compact && styles.buttonTextCompact]}>
              {panicBreathing ? HT.panicStop : HT.panicStart}
            </Text>
          </Pressable>
        </View>

        <View style={styles.panicSectionCard}>
          <View style={styles.panicSectionHead}>
            <View style={styles.panicHeadIconWrap}>
              <Ionicons name="leaf-outline" size={14} color={tc("#C01765")} />
            </View>
            <Text style={[styles.section, compact && styles.sectionCompact, styles.panicSectionTitle]}>{HT.panicGroundingTitle}</Text>
          </View>
          <Text style={[styles.smallText, compact && styles.smallTextCompact]}>{HT.panicGroundingHint}</Text>
          <View style={styles.cycleSummaryRow}>
            <View style={[styles.cycleSummaryCard, compact && styles.cycleSummaryCardCompact]}>
              <Text style={[styles.smallText, compact && styles.smallTextCompact]}>{HT.panicStepProgress}</Text>
              <Text style={[styles.textStrong, compact && styles.textStrongCompact]}>
                {groundingCompletedCount}/{groundingItems.length}
              </Text>
            </View>
            <View style={[styles.cycleSummaryCard, styles.cycleSummaryCardAccent, compact && styles.cycleSummaryCardCompact, { width: compact ? "100%" : "65.5%" }]}>
              <Pressable style={styles.buttonSoft} onPress={startGroundingMode}>
                <Text style={[styles.buttonText, compact && styles.buttonTextCompact]}>
                  {HT.panicGroundingStart}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.panicSectionCard}>
          <View style={styles.panicSectionHead}>
            <View style={styles.panicHeadIconWrap}>
              <Ionicons name="call-outline" size={14} color={tc("#C01765")} />
            </View>
            <Text style={[styles.section, compact && styles.sectionCompact, styles.panicSectionTitle]}>{HT.panicEmergencyTitle}</Text>
          </View>
          <View style={styles.fieldCard}>
            <TextInput
              value={panicEmergencyName}
              onChangeText={setPanicEmergencyName}
              style={[styles.input, styles.inputInField]}
              placeholder={HT.panicEmergencyName}
              placeholderTextColor={tc("#8C6F5F")}
            />
          </View>
          <View style={styles.fieldCard}>
            <TextInput
              value={panicEmergencyPhone}
              onChangeText={setPanicEmergencyPhone}
              style={[styles.input, styles.inputInField]}
              placeholder={HT.panicEmergencyPhone}
              placeholderTextColor={tc("#8C6F5F")}
              keyboardType="phone-pad"
            />
          </View>
          <View style={styles.row}>
            <Pressable style={[styles.buttonSoft, { flex: 1 }]} onPress={() => void savePanicEmergencyContact()}>
              <Text style={[styles.buttonText, compact && styles.buttonTextCompact]}>
                {HT.panicEmergencySave}
              </Text>
            </Pressable>
            <Pressable style={[styles.button, { flex: 1 }]} onPress={() => void callPanicEmergencyContact()}>
              <Text style={[styles.buttonText, compact && styles.buttonTextCompact]}>
                {HT.panicEmergencyCall}
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.panicSectionCard}>
          <View style={styles.panicSectionHead}>
            <View style={styles.panicHeadIconWrap}>
              <Ionicons name="journal-outline" size={14} color={tc("#C01765")} />
            </View>
            <Text style={[styles.section, compact && styles.sectionCompact, styles.panicSectionTitle]}>{HT.panicWeekly}</Text>
          </View>
          <View style={styles.fieldCard}>
            <TextInput
              value={panicSeverity}
              onChangeText={setPanicSeverity}
              style={[styles.input, styles.inputInField]}
              placeholder={HT.panicSeverity}
              placeholderTextColor={tc("#8C6F5F")}
              keyboardType="number-pad"
            />
          </View>
          <View style={styles.fieldCard}>
            <TextInput
              value={panicTrigger}
              onChangeText={setPanicTrigger}
              style={[styles.input, styles.inputInField]}
              placeholder={HT.panicTrigger}
              placeholderTextColor={tc("#8C6F5F")}
            />
          </View>
          <View style={styles.fieldCard}>
            <TextInput
              value={panicHelped}
              onChangeText={setPanicHelped}
              style={[styles.input, styles.inputInField]}
              placeholder={HT.panicHelped}
              placeholderTextColor={tc("#8C6F5F")}
            />
          </View>
          <Pressable style={styles.buttonSoft} onPress={() => void addPanicLog()}>
            <Text style={[styles.buttonText, compact && styles.buttonTextCompact]}>
              {HT.panicSaveLog}
            </Text>
          </Pressable>

          {panicWeeklyLogs.length > 0 ? (
            <View style={styles.panicInfoChip}>
              <Text style={[styles.smallText, compact && styles.smallTextCompact]}>
                {HT.panicAvgSeverity}: {panicWeeklyAvg}/10 | {panicWeeklyLogs.length}
              </Text>
            </View>
          ) : (
            <View style={styles.panicEmptyCard}>
              <Text style={[styles.text, compact && styles.textCompact]}>{HT.panicNoData}</Text>
            </View>
          )}

          {panicLogs.slice(0, 5).map((log) => (
            <View key={log.id} style={styles.medicineCard}>
              <View style={styles.medicineCardLeft}>
                <View style={styles.medicineTimeBadge}>
                  <Text style={styles.medicineTimeText}>{log.severity}/10</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.textStrong, compact && styles.textStrongCompact]}>
                    {new Date(log.recordedAt).toLocaleString(localeByLanguage[L])}
                  </Text>
                  <Text style={[styles.smallText, compact && styles.smallTextCompact]}>
                    {log.trigger || "-"} | {log.helped || "-"}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>
      ) : null}

      <Modal visible={panicFullscreen} transparent animationType="fade" onRequestClose={togglePanicBreathing}>
        <View style={styles.panicModalBackdrop}>
          <View style={styles.panicModalCard}>
            <View pointerEvents="none" style={styles.panicModalCardBg}>
              <ImageBackground
                source={{ uri: PANIC_MODAL_IMAGE_URI }}
                style={styles.panicModalCardBg}
                imageStyle={styles.panicModalCardBgImage}
              >
                <View style={styles.panicModalCardOverlay} />
              </ImageBackground>
            </View>
            <Text style={styles.panicModalHint}>{HT.panicFullscreenHint}</Text>
            <View style={styles.panicModalPhaseRow}>
              {panicPhases.map((phase, idx) => (
                <View key={`modal-phase-${idx}`} style={[styles.panicModalPhasePill, idx === panicPhaseIndex && styles.panicModalPhasePillActive]}>
                  <Text style={[styles.panicModalPhasePillText, idx === panicPhaseIndex && styles.panicModalPhasePillTextActive]}>
                    {phase}
                  </Text>
                </View>
              ))}
            </View>
            <View style={styles.panicModalBreathArea}>
              <ImageBackground source={{ uri: PANIC_MODAL_IMAGE_URI }} style={styles.panicModalCircleOuter} imageStyle={styles.panicModalCircleOuterImage}>
                <View style={styles.panicModalCircleOuterOverlay} />
                <Animated.View style={[styles.panicModalCircle, { transform: [{ scale: panicBreathScale }] }]}>
                  <Text style={styles.panicModalPhase}>{panicPhases[panicPhaseIndex]}</Text>
                  <Text style={styles.panicModalTime}>{panicPhaseRemaining}s</Text>
                </Animated.View>
              </ImageBackground>
            </View>
            <View style={styles.miniProgressTrack}>
              <View style={[styles.miniProgressFill, { width: `${panicPhaseProgress}%` }]} />
            </View>
            <Text style={styles.panicModalRound}>
              {HT.panicRound} {Math.min(panicCycleCount, PANIC_BREATH_TOTAL_ROUNDS)}/{PANIC_BREATH_TOTAL_ROUNDS}
            </Text>
            <Pressable style={styles.button} onPress={togglePanicBreathing}>
              <Text style={styles.buttonText}>{HT.panicStop}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={panicGroundingFullscreen} transparent animationType="fade" onRequestClose={closeGroundingMode}>
        <View style={styles.panicModalBackdrop}>
          <View style={styles.panicModalCard}>
            <View pointerEvents="none" style={styles.panicModalCardBg}>
              <ImageBackground
                source={{ uri: GROUNDING_MODAL_IMAGE_URI }}
                style={styles.panicModalCardBg}
                imageStyle={styles.panicModalCardBgImage}
              >
                <View style={styles.panicModalCardOverlay} />
              </ImageBackground>
            </View>
            <Text style={styles.panicModalHint}>{HT.panicGroundingHint}</Text>
            <ImageBackground source={{ uri: GROUNDING_MODAL_IMAGE_URI }} style={styles.panicModalBreathArea} imageStyle={styles.panicModalBreathAreaImage}>
              <View style={styles.panicModalBreathAreaOverlay} />
              <View style={[styles.panicModalCircleOuter, { width: 220, height: 220 }]}>
                <Text style={styles.panicModalPhase}>{groundingItems[panicGroundingStep]}</Text>
                <Text style={styles.panicModalRound}>
                  {panicGroundingStep + 1}/{groundingItems.length}
                </Text>
              </View>
            </ImageBackground>
            <Text style={[styles.section, styles.groundingIdeasTitle]}>{HT.panicGroundingIdeas}</Text>
            <View style={styles.groundingIdeasWrap}>
              {groundingStepIdeas.map((idea) => (
                <View key={`ground-idea-${panicGroundingStep}-${idea}`} style={styles.groundingIdeaChip}>
                  <Text style={styles.groundingIdeaText}>{idea}</Text>
                </View>
              ))}
            </View>
            {panicGroundingChecks[panicGroundingStep] ? (
              <Text style={styles.panicModalRound}>{HT.panicGroundingDone}</Text>
            ) : null}
            <View style={styles.row}>
              <Pressable style={[styles.buttonSoft, { flex: 1 }]} onPress={() => toggleGroundingCheck(panicGroundingStep)}>
                <Text style={styles.buttonText}>{HT.panicGroundingDone}</Text>
              </Pressable>
            </View>
            <View style={styles.row}>
              <Pressable
                style={[styles.buttonSoft, { flex: 1, opacity: panicGroundingStep === 0 ? 0.5 : 1 }]}
                onPress={() => setPanicGroundingStep((s) => Math.max(0, s - 1))}
              >
                <Text style={styles.buttonText}>{HT.panicGroundingPrev}</Text>
              </Pressable>
              <Pressable
                style={[styles.button, { flex: 1 }]}
                onPress={() => {
                  if (panicGroundingStep >= groundingItems.length - 1) {
                    closeGroundingMode()
                    return
                  }
                  setPanicGroundingStep((s) => Math.min(groundingItems.length - 1, s + 1))
                }}
              >
                <Text style={styles.buttonText}>
                  {panicGroundingStep >= groundingItems.length - 1 ? HT.panicGroundingCompleteTitle : HT.panicGroundingNext}
                </Text>
              </Pressable>
            </View>
            {groundingCompletedCount >= groundingItems.length ? (
              <View style={styles.block}>
                <Text style={styles.text}>{HT.panicGroundingCompleteHint}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>

      {activeTab === "diet" ? (
      <View style={[styles.card, compact && styles.cardCompact]}>
        <View pointerEvents="none" style={styles.cardBgImage}><ImageBackground source={{ uri: DIET_IMAGE_URI }} style={styles.cardBgImage} imageStyle={styles.cardBgImageInner} /></View>
        <View pointerEvents="none" style={styles.cardBgOverlay} />
        <Text style={[styles.cardTitle, compact && styles.cardTitleCompact]}>{HT.dietTitle}</Text>
        <View style={styles.fieldCard}>
          <TextInput
            value={age}
            onChangeText={setAge}
            style={[styles.input, styles.inputInField]}
            placeholder={"Ya\u015f"}
            placeholderTextColor={tc("#8C6F5F")}
            keyboardType="number-pad"
          />
        </View>
        <View style={styles.fieldCard}>
          <TextInput
            value={heightCm}
            onChangeText={setHeightCm}
            style={[styles.input, styles.inputInField]}
            placeholder="Boy (cm)"
            placeholderTextColor={tc("#8C6F5F")}
            keyboardType="number-pad"
          />
        </View>
        <View style={styles.fieldCard}>
          <TextInput
            value={weightKg}
            onChangeText={setWeightKg}
            style={[styles.input, styles.inputInField]}
            placeholder="Kilo (kg)"
            placeholderTextColor={tc("#8C6F5F")}
            keyboardType="number-pad"
          />
        </View>

        <Text style={[styles.section, compact && styles.sectionCompact]}>{HT.goal}</Text>
        <View style={styles.row}>
          <Pressable style={[styles.chip, compact && styles.chipCompact, dietGoal === "lose" && styles.chipActive]} onPress={() => setDietGoal("lose")}><Text style={[styles.chipText, compact && styles.chipTextCompact]}>{HT.goalLose}</Text></Pressable>
          <Pressable style={[styles.chip, compact && styles.chipCompact, dietGoal === "maintain" && styles.chipActive]} onPress={() => setDietGoal("maintain")}><Text style={[styles.chipText, compact && styles.chipTextCompact]}>{HT.goalMaintain}</Text></Pressable>
          <Pressable style={[styles.chip, compact && styles.chipCompact, dietGoal === "gain" && styles.chipActive]} onPress={() => setDietGoal("gain")}><Text style={[styles.chipText, compact && styles.chipTextCompact]}>{HT.goalGain}</Text></Pressable>
        </View>

        <Text style={[styles.section, compact && styles.sectionCompact]}>{HT.activity}</Text>
        <View style={styles.row}>
          <Pressable style={[styles.chip, compact && styles.chipCompact, activityLevel === "low" && styles.chipActive]} onPress={() => setActivityLevel("low")}><Text style={[styles.chipText, compact && styles.chipTextCompact]}>{HT.low}</Text></Pressable>
          <Pressable style={[styles.chip, compact && styles.chipCompact, activityLevel === "medium" && styles.chipActive]} onPress={() => setActivityLevel("medium")}><Text style={[styles.chipText, compact && styles.chipTextCompact]}>{HT.medium}</Text></Pressable>
          <Pressable style={[styles.chip, compact && styles.chipCompact, activityLevel === "high" && styles.chipActive]} onPress={() => setActivityLevel("high")}><Text style={[styles.chipText, compact && styles.chipTextCompact]}>{HT.high}</Text></Pressable>
        </View>

        <Pressable style={styles.buttonSoft} onPress={() => void saveDietBase()}><Text style={[styles.buttonText, compact && styles.buttonTextCompact]}>{HT.calculate}</Text></Pressable>

        {diet ? (
          <View style={styles.block}>
            <View style={styles.reSultGrid}>
              <View style={[styles.reSultCard, compact && styles.reSultCardCompact]}>
                <Text style={[styles.reSultTitle, compact && styles.reSultTitleCompact]}>{DST.body}</Text>
                <Text style={[styles.reSultLine, compact && styles.reSultLineCompact]}>
                  {DST.bmiLine
                    .replace("{bmi}", diet.bmi.toFixed(1))
                    .replace("{bmr}", String(diet.bmr))
                    .replace("{tdee}", String(diet.tdee))}
                </Text>
              </View>

              <View style={[styles.reSultCard, compact && styles.reSultCardCompact]}>
                <Text style={[styles.reSultTitle, compact && styles.reSultTitleCompact]}>{DST.energy}</Text>
                <Text style={[styles.reSultLine, compact && styles.reSultLineCompact]}>
                  {DST.calorieLine.replace("{target}", String(diet.target))}
                </Text>
              </View>

              <View style={[styles.reSultCard, compact && styles.reSultCardCompact]}>
                <Text style={[styles.reSultTitle, compact && styles.reSultTitleCompact]}>{DST.macros}</Text>
                <Text style={[styles.reSultLine, compact && styles.reSultLineCompact]}>
                  {DST.macroLine
                    .replace("{protein}", String(diet.protein))
                    .replace("{carbs}", String(diet.carbs))
                    .replace("{fat}", String(diet.fat))}
                </Text>
              </View>

              <View style={[styles.reSultCard, compact && styles.reSultCardCompact]}>
                <Text style={[styles.reSultTitle, compact && styles.reSultTitleCompact]}>{DST.weight}</Text>
                {idealWeightInfo ? (
                  <>
                    <Text style={[styles.reSultLine, compact && styles.reSultLineCompact]}>
                      {DST.idealLine.replace("{ideal}", idealWeightInfo.ideal.toFixed(1))}
                    </Text>
                    <Text style={[styles.reSultLine, compact && styles.reSultLineCompact]}>
                      {DST.rangeLine
                        .replace("{min}", idealWeightInfo.min.toFixed(1))
                        .replace("{max}", idealWeightInfo.max.toFixed(1))}
                    </Text>
                    <Text style={[styles.reSultLine, compact && styles.reSultLineCompact]}>
                      {idealWeightInfo.diff > 0.3
                        ? DST.overLine.replace("{diff}", idealWeightInfo.diff.toFixed(1))
                        : idealWeightInfo.diff < -0.3
                          ? DST.underLine.replace("{diff}", Math.abs(idealWeightInfo.diff).toFixed(1))
                          : DST.normalLine}
                    </Text>
                  </>
                ) : null}
              </View>
            </View>
          </View>
        ) : (
          <Text style={[styles.text, compact && styles.textCompact]}>{HT.enterForCalc}</Text>
        )}

        <Text style={[styles.section, compact && styles.sectionCompact]}>{HT.todayAdherence}</Text>
        <View style={styles.row}>
          <Pressable style={[styles.chip, compact && styles.chipCompact, todayMeals.breakfast && styles.mealDone]} onPress={() => void toggleMeal("breakfast")}><Text style={[styles.chipText, compact && styles.chipTextCompact]}>{mealLabels.breakfast}</Text></Pressable>
          <Pressable style={[styles.chip, compact && styles.chipCompact, todayMeals.lunch && styles.mealDone]} onPress={() => void toggleMeal("lunch")}><Text style={[styles.chipText, compact && styles.chipTextCompact]}>{mealLabels.lunch}</Text></Pressable>
          <Pressable style={[styles.chip, compact && styles.chipCompact, todayMeals.dinner && styles.mealDone]} onPress={() => void toggleMeal("dinner")}><Text style={[styles.chipText, compact && styles.chipTextCompact]}>{mealLabels.dinner}</Text></Pressable>
          <Pressable style={[styles.chip, compact && styles.chipCompact, todayMeals.snack && styles.mealDone]} onPress={() => void toggleMeal("snack")}><Text style={[styles.chipText, compact && styles.chipTextCompact]}>{mealLabels.snack}</Text></Pressable>
        </View>
        <Text style={[styles.text, compact && styles.textCompact]}>
          {HT.dietAdherenceLabel}: %{adherenceDaily[todayKey] ?? 0}
        </Text>
        <WeeklyBars title={HT.dietTrend} values={dietWeek} labels={weekLabels} maxValue={100} unit="%" color={tc("#C8A97E")} />

        <Text style={[styles.section, compact && styles.sectionCompact]}>{HT.weekPlan}</Text>
        <View style={styles.planGrid}>
          {plan7.map((d, i) => (
            <View
              key={`p-${i}`}
              style={[
                styles.planDayCard,
                compact && styles.planDayCardCompact,
                {
                  backgroundColor: dayPastels[i % dayPastels.length].bg,
                  borderColor: dayPastels[i % dayPastels.length].border,
                },
              ]}
            >
              <Text style={styles.textStrong}>{HT.day} {i + 1}</Text>
              <Text style={[styles.dayTotalCal, compact && styles.dayTotalCalCompact]}>
                {HT.total}: {getDayTotalCalories(i)} kcal
              </Text>
              {([
                ["breakfast", d[0]],
                ["lunch", d[1]],
                ["dinner", d[2]],
                ["snack", d[3]],
              ] as [MealPart, string][]).map(([meal, fallback]) => (
                <View key={`${i}-${meal}`} style={styles.mealRow}>
                  <Text style={[styles.smallText, compact && styles.smallTextCompact]}>
                    {mealLabels[meal]}: {getMealText(i, meal, fallback)}
                  </Text>
                  <Text style={[styles.mealCalText, compact && styles.mealCalTextCompact]}>
                    {HT.approx} {getMealCalories(i, meal)} kcal
                  </Text>
                  <Pressable
                    style={styles.swapBtn}
                    onPress={() => void rotateMealOption(i, meal, fallback)}
                  >
                    <Text style={[styles.swapBtnText, compact && styles.swapBtnTextCompact]}>
                      {HT.change}
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ))}
        </View>
      </View>
      ) : null}

      {snackbarVisible ? (
        <View style={styles.snack}>
          <Text style={[styles.textStrong, compact && styles.textStrongCompact]}>
            {snackbarText}
          </Text>
        </View>
      ) : null}
    </ScrollView>
  )
}

const fillCount = (template: string, n: number) => template.replace("{n}", String(n))
const toTimeMinutes = (timeText: string) => {
  const parsed = parseTime(timeText)
  if (!parsed) return 24 * 60
  return parsed.hour * 60 + parsed.minute
}
const normalizePhoneForTel = (value: string) => value.replace(/[^\d+]/g, "")

const getCycleDaysDelta = (history: string[], selectedDate: string | null) => {
  if (history.length === 0) return 0
  const lastStart = selectedDate ?? history[0]
  const nextPeriod = addDays(lastStart, DEFAULT_CYCLE_LENGTH)
  const today = getTodayKey()
  return Math.floor((parseDateKey(nextPeriod).getTime() - parseDateKey(today).getTime()) / DAY_MS)
}

const buildStatusText = (
  history: string[],
  selectedDate: string | null,
  language: "tr" | "en" | "de" | "ru"
) => {
  const HT = healthUiText[language]
  if (history.length === 0) return HT.noRecord
  const daySuntil = getCycleDaysDelta(history, selectedDate)
  if (daySuntil > 0) return fillCount(HT.daySuntil, daySuntil)
  if (daySuntil === 0) return HT.todayMayStart
  return fillCount(HT.delayed, Math.abs(daySuntil))
}

const buildMarkedDates = (history: string[], selectedDate: string | null): MarkedDateMap => {
  const marks: MarkedDateMap = {}
  if (history.length > 0) {
    const lastStart = history[0]
    for (let i = 0; i < PERIOD_LENGTH; i++) {
      marks[addDays(lastStart, i)] = { selected: true, selectedColor: tc("#E58D7C") }
    }
    const ovulationDay = addDays(lastStart, DEFAULT_CYCLE_LENGTH - 14)
    for (let i = -3; i <= 1; i++) {
      marks[addDays(ovulationDay, i)] = { selected: true, selectedColor: tc("#E9BD7A") }
    }
  }
  if (selectedDate) marks[selectedDate] = { selected: true, selectedColor: moduleTheme.colors.brand }
  return marks
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" },
  content: { ...moduleStyles.page, paddingBottom: 40, position: "relative" },
  contentCompact: { ...moduleStyles.pageCompact, paddingBottom: 28 },
  hero: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    backgroundColor: tc("#FFF7F1"),
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: moduleTheme.colors.border,
    position: "relative",
    overflow: "hidden",
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
  },
  heroImageInner: { opacity: 0.5 },
  heroOverlayStrong: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,246,238,0.45)",
  },
  heroOverlaySoft: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,220,203,0.12)",
  },
  heroGlowOne: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: "rgba(236,111,200,0.14)",
    right: -38,
    top: -46,
  },
  heroGlowTwo: {
    position: "absolute",
    width: 130,
    height: 130,
    borderRadius: 999,
    backgroundColor: "rgba(255,170,129,0.18)",
    left: -26,
    bottom: -34,
  },
  heroTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 },
  heroBadge: {
    backgroundColor: tc("#F6E8DD"),
    color: tc("#6E4E41"),
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    overflow: "hidden",
  },
  heroBadgeSoft: {
    backgroundColor: "rgba(255,255,255,0.72)",
    color: moduleTheme.colors.textMuted,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    overflow: "hidden",
    maxWidth: "62%",
  },
  title: { fontSize: 28, fontWeight: "600", color: moduleTheme.colors.textStrong, lineHeight: 34 },
  titleCompact: { fontSize: 24, lineHeight: 18 },
  Subtitle: { color: moduleTheme.colors.textMuted, marginTop: 4, marginBottom: 10, fontSize: 16, lineHeight: 24 },
  SubtitleCompact: { fontSize: 15, lineHeight: 22 },
  progressWrap: { marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 8 },
  progressTrack: {
    flex: 1,
    height: 10,
    backgroundColor: tc("#F2DED1"),
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: moduleTheme.colors.brand,
    borderRadius: 999,
  },
  progressText: { color: tc("#6D5144"), fontWeight: "600", fontSize: 12, lineHeight: 16, minWidth: 34, textAlign: "right" },
  miniProgressTrack: {
    marginTop: 8,
    height: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.68)",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: tc("#E8D5C7"),
  },
  miniProgressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: moduleTheme.colors.brand,
  },
  panicBreathCard: {
    backgroundColor: "rgba(255,255,255,0.82)",
    borderWidth: 1,
    borderColor: tc("#E8D2C2"),
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    shadowColor: tc("#7A5A49"),
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  panicCalmScoreCard: {
    marginTop: 2,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: tc("#E8D2C2"),
    backgroundColor: tc("#FFF7F2"),
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  panicCalmScoreLeft: {
    minWidth: 90,
  },
  panicCalmScoreValue: {
    color: tc("#B4004A"),
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "600",
    marginTop: 2,
  },
  panicCalmScoreRight: {
    flex: 1,
    alignItems: "flex-end",
    gap: 2,
  },
  panicSectionCard: {
    backgroundColor: "rgba(255,255,255,0.82)",
    borderWidth: 1,
    borderColor: tc("#E8D2C2"),
    borderLeftWidth: 3,
    borderLeftColor: tc("#FF8FBE"),
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    shadowColor: tc("#7A5A49"),
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  panicSectionHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  panicHeadIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: tc("#F3BBD3"),
    backgroundColor: tc("#FFEAF4"),
    alignItems: "center",
    justifyContent: "center",
  },
  panicSectionTitle: {
    marginTop: 0,
    marginBottom: 0,
  },
  panicInfoChip: {
    borderWidth: 1,
    borderColor: tc("#E8D2C2"),
    backgroundColor: tc("#FFF7F2"),
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
  },
  panicEmptyCard: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: tc("#E8D2C2"),
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
  },
  panicPhasePills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 2,
    marginBottom: 8,
  },
  panicPhasePill: {
    borderWidth: 1,
    borderColor: tc("#E3D2C5"),
    backgroundColor: tc("#FFFDFB"),
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  panicPhasePillActive: {
    borderColor: moduleTheme.colors.brand,
    backgroundColor: tc("#FFEAF4"),
  },
  panicPhasePillText: {
    color: tc("#6E5549"),
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
  },
  panicPhasePillTextActive: {
    color: tc("#B4004A"),
  },
  panicModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(33,22,31,0.46)",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  panicModalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "rgba(255,248,244,0.86)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
    borderRadius: 18,
    padding: 18,
    alignItems: "center",
    gap: 10,
    shadowColor: tc("#2F2231"),
    shadowOpacity: 0.26,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 7,
    overflow: "hidden",
  },
  panicModalCardBg: {
    ...StyleSheet.absoluteFillObject,
  },
  panicModalCardBgImage: { resizeMode: "cover", opacity: 0 },
  panicModalCardOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "transparent" },
  panicModalTitle: {
    color: tc("#4A2D3B"),
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "600",
    textAlign: "center",
  },
  panicModalHint: {
    color: tc("#6E5549"),
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  panicModalPhaseRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 2,
    marginBottom: 2,
  },
  panicModalPhasePill: {
    borderWidth: 1,
    borderColor: tc("#E7D4C6"),
    backgroundColor: tc("#FFFDFB"),
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  panicModalPhasePillActive: {
    borderColor: tc("#FF4D92"),
    backgroundColor: tc("#FFE8F2"),
  },
  panicModalPhasePillText: {
    color: tc("#6E5549"),
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
  },
  panicModalPhasePillTextActive: {
    color: tc("#B4004A"),
  },
  panicModalBreathArea: {
    width: 250,
    height: 250,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    overflow: "hidden",
  },
  panicModalBreathAreaImage: { resizeMode: "cover", opacity: 0 },
  panicModalBreathAreaOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "transparent" },
  panicModalCircleOuter: {
    width: 232,
    height: 232,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: tc("#F6B8D5"),
    backgroundColor: tc("#FFF3F9"),
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  panicModalCircleOuterImage: { resizeMode: "cover", borderRadius: 999, opacity: 0 },
  panicModalCircleOuterOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "transparent" },
  panicModalCircle: {
    marginTop: 2,
    width: 196,
    height: 196,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: tc("#FF8FBE"),
    backgroundColor: tc("#FFEAF4"),
    alignItems: "center",
    justifyContent: "center",
  },
  panicModalPhase: {
    color: tc("#6E2B4A"),
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "600",
    marginBottom: 2,
  },
  panicModalTime: {
    color: tc("#B4004A"),
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "600",
  },
  panicModalRound: {
    color: tc("#6E5549"),
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    marginTop: -2,
  },
  groundingModalScreenBg: {
    flex: 1,
    justifyContent: "center",
  },
  groundingModalScreenBgImage: {
    resizeMode: "cover",
  },
  groundingModalScreenOverlay: {
    flex: 1,
    backgroundColor: "rgba(33,22,31,0.42)",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  groundingIdeasTitle: {
    marginTop: 4,
    marginBottom: 6,
  },
  groundingIdeasWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 6,
    marginBottom: 6,
  },
  groundingIdeaChip: {
    borderWidth: 1,
    borderColor: tc("#E7D4C6"),
    backgroundColor: "rgba(255,255,255,0.82)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  groundingIdeaText: {
    color: tc("#5B4438"),
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
  },
  heroStatsRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  heroStatCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(226,201,184,0.9)",
    backgroundColor: "rgba(255,255,255,0.68)",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  heroStatValue: { color: moduleTheme.colors.textStrong, fontSize: 20, lineHeight: 24, fontWeight: "600" },
  heroStatLabel: { color: moduleTheme.colors.textMuted, fontSize: 12, lineHeight: 16, fontWeight: "600" },
  heroActions: { flexDirection: "row", gap: 8, marginBottom: 8 },
  heroAction: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: tc("#E8D5C7"),
    backgroundColor: "rgba(255,255,255,0.7)",
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  heroActionActive: {
    backgroundColor: moduleTheme.colors.brand,
    borderColor: moduleTheme.colors.brand,
  },
  heroActionText: { color: tc("#5F463A"), fontSize: 12, lineHeight: 16, fontWeight: "600" },
  heroActionTextActive: { color: moduleTheme.colors.textInverted },
  metric: { color: tc("#4A355C"), fontWeight: "600", fontSize: 16, lineHeight: 22 },
  metricCompact: { fontSize: 14, lineHeight: 20 },
  metricBoxes: {
    flexDirection: "row",
    gap: 8,
  },
  tabWrap: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    marginBottom: 8,
    backgroundColor: tc("#FFF6EF"),
    borderWidth: 1,
    borderColor: tc("#E5CFC0"),
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 6,
    shadowColor: tc("#7A5A49"),
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  tabTitle: {
    color: tc("#6B4D40"),
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    marginBottom: 6,
    marginLeft: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tabTitleCompact: {
    fontSize: 11,
    lineHeight: 14,
  },
  tabScroll: {
    width: "100%",
  },
  tabRowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingBottom: 4,
    paddingRight: 4,
  },
  tabRow: {
    gap: 6,
    paddingBottom: 4,
    paddingRight: 4,
  },
  tabChip: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tc("#E3D2C5"),
    backgroundColor: moduleTheme.colors.textInverted,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 40,
    minWidth: 96,
    justifyContent: "center",
    shadowColor: tc("#6B4D40"),
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  tabChipActive: {
    borderColor: moduleTheme.colors.brand,
    borderWidth: 1.5,
    backgroundColor: moduleTheme.colors.brand,
    shadowColor: tc("#FF4D92"),
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  tabChipInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  tabChipDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: tc("#CAB8AA"),
  },
  tabChipDotActive: {
    backgroundColor: moduleTheme.colors.textInverted,
    width: 8,
    height: 8,
  },
  tabChipText: {
    color: tc("#6B5246"),
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
  },
  tabChipTextActive: {
    color: moduleTheme.colors.textInverted,
    fontWeight: "600",
  },
  metricBox: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.74)",
    borderWidth: 1,
    borderColor: tc("#E7D5C7"),
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 8,
    minHeight: 56,
    justifyContent: "center",
    alignItems: "center",
  },
  metricTable: {
    marginTop: 2,
    borderWidth: 1,
    borderColor: tc("#E6D9EF"),
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: tc("#FCF8FF"),
  },
  metricTableHeader: {
    flexDirection: "row",
    backgroundColor: tc("#F1E6F8"),
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  metricHeadCell: {
    flex: 1,
    color: tc("#5A486B"),
    fontWeight: "600",
    fontSize: 14,
    lineHeight: 18,
  },
  metricHeadCellCompact: {
    fontSize: 13,
    lineHeight: 16,
  },
  metricRow: {
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: tc("#EDE2F4"),
  },
  metricLabel: {
    flex: 1,
    color: tc("#4A355C"),
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  metricLabelCompact: {
    fontSize: 13,
    lineHeight: 18,
  },
  metricValue: {
    flex: 1,
    color: tc("#342046"),
    fontWeight: "600",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  metricValueCompact: {
    fontSize: 13,
    lineHeight: 18,
  },
  card: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    backgroundColor: tc("#FFF"),
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: moduleTheme.colors.border,
    position: "relative",
    overflow: "hidden",
  },
  cardBgImage: {
    ...StyleSheet.absoluteFillObject,
  },
  cardBgImageInner: { opacity: 0.44 },
  cardBgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,250,255,0.22)" },
  cardBgOverlayLight: { backgroundColor: "transparent" },
  cardCompact: { padding: 12, borderRadius: 14 },
  cardTitle: { color: moduleTheme.colors.textStrong, fontSize: 20, fontWeight: "600", marginBottom: 10, lineHeight: 26 },
  cardTitleCompact: { fontSize: 18, lineHeight: 24 },
  section: { color: tc("#6B4D40"), fontWeight: "600", marginTop: 10, marginBottom: 8, fontSize: 17, lineHeight: 24 },
  sectionCompact: { fontSize: 16, lineHeight: 22 },
  text: { color: tc("#3B2A22"), marginBottom: 8, fontSize: 16, lineHeight: 24 },
  textCompact: { fontSize: 15, lineHeight: 22 },
  textStrong: { color: tc("#342046"), fontWeight: "600" },
  pregKicker: { color: tc("#7A2D4F"), fontWeight: "600", fontSize: 16, lineHeight: 22, marginTop: 4, marginBottom: 4 },
  textStrongCompact: { fontSize: 15, lineHeight: 20 },
  dayTotalCal: { color: tc("#6C4E84"), fontWeight: "600", marginTop: 4, marginBottom: 6, fontSize: 15, lineHeight: 22 },
  dayTotalCalCompact: { fontSize: 14, lineHeight: 20 },
  smallText: { color: tc("#4A355C"), fontSize: 15, lineHeight: 22 },
  smallTextCompact: { fontSize: 14, lineHeight: 20 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  listRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: tc("#FCF8FF"),
    borderWidth: 1,
    borderColor: tc("#EEE2F5"),
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 6,
  },
  removeText: { color: tc("#A14E7A"), fontWeight: "600" },
  input: { backgroundColor: "rgba(255,255,255,0.96)", borderWidth: 1, borderColor: tc("#DFC8B6"), borderRadius: 10, padding: 12, marginBottom: 10, color: tc("#2F1E16"), fontSize: 16, lineHeight: 22 },
  fieldCard: {
    backgroundColor: "rgba(255,255,255,0.97)",
    borderWidth: 1.4,
    borderColor: tc("#E2D2C4"),
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
    shadowColor: tc("#7A6556"),
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 1,
  },
  inputInField: {
    backgroundColor: "transparent",
    borderWidth: 0,
    marginBottom: 0,
    paddingHorizontal: 2,
    paddingVertical: 8,
  },
  button: { backgroundColor: moduleTheme.colors.brand, borderRadius: 10, padding: 13, alignItems: "center", marginBottom: 10, minHeight: 48, justifyContent: "center" },
  buttonSoft: { backgroundColor: tc("#F4E7DD"), borderRadius: 10, padding: 13, alignItems: "center", marginBottom: 10, minHeight: 48, justifyContent: "center" },
  buttonText: { color: tc("#3D2A4F"), fontWeight: "600", fontSize: 16, lineHeight: 22 },
  buttonTextCompact: { fontSize: 15, lineHeight: 20 },
  chip: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999, backgroundColor: tc("#F8F3FB"), borderWidth: 1, borderColor: tc("#DDCBE9"), minHeight: 42, justifyContent: "center" },
  chipCompact: { paddingVertical: 8, paddingHorizontal: 12, minHeight: 38 },
  chipText: { color: tc("#3D2A4F"), fontSize: 15, lineHeight: 20, fontWeight: "600" },
  chipTextCompact: { fontSize: 14, lineHeight: 18 },
  quickTimeChipActive: { backgroundColor: tc("#FFE6F2"), borderColor: tc("#FF8FBE") },
  quickTimeChipTextActive: { color: tc("#B4004A"), fontWeight: "600" },
  chipActive: { backgroundColor: tc("#E8C3B9"), borderColor: tc("#D7A89B") },
  medicineCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,251,247,0.95)",
    borderWidth: 1,
    borderColor: tc("#E7CCBA"),
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  medicineCardTaken: {
    backgroundColor: "rgba(239,252,242,0.95)",
    borderColor: tc("#BFD9AD"),
  },
  medicineCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  medicineTimeBadge: {
    minWidth: 58,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: tc("#FFB3D2"),
    backgroundColor: tc("#FFF0F7"),
    paddingVertical: 5,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  medicineTimeText: {
    color: tc("#AA2C63"),
    fontWeight: "600",
    fontSize: 13,
    lineHeight: 18,
  },
  removePill: {
    borderWidth: 1,
    borderColor: tc("#E7CCBA"),
    backgroundColor: tc("#FFF7F2"),
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  takePill: {
    borderWidth: 1,
    borderColor: tc("#F3B2D0"),
    backgroundColor: tc("#FFF0F7"),
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  takePillDone: {
    borderColor: tc("#BFD9AD"),
    backgroundColor: tc("#E8F4E1"),
  },
  takePillText: {
    color: tc("#B4004A"),
    fontWeight: "600",
    fontSize: 12,
    lineHeight: 16,
  },
  takePillTextDone: {
    color: tc("#3F6E3B"),
  },
  mealDone: { backgroundColor: tc("#D5EAC8"), borderColor: tc("#BFD9AD") },
  block: { backgroundColor: tc("#FCF8FF"), borderWidth: 1, borderColor: tc("#EEE2F5"), borderRadius: 10, padding: 10, marginBottom: 8 },
  pregViSualCard: {
    backgroundColor: tc("#FFF4F8"),
    borderWidth: 1,
    borderColor: tc("#F0CADC"),
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  pregViSualTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  pregViSualLeft: {
    width: 56,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  pregViSualMeta: {
    flex: 1,
  },
  pregThumb: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(240,202,220,0.9)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: tc("#7A2D4F"),
    shadowOpacity: 0.14,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 2,
  },
  pregThumbInner: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.88)",
    borderWidth: 1,
    borderColor: "rgba(244,224,235,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  pregMiniTrack: {
    marginTop: 6,
    marginBottom: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: tc("#F3E2EA"),
    overflow: "hidden",
  },
  pregMiniFill: {
    height: "100%",
    backgroundColor: moduleTheme.colors.brand,
    borderRadius: 999,
  },
  timelineRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
    marginBottom: 4,
  },
  timelineChip: {
    minWidth: 36,
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: tc("#E0CFC2"),
    backgroundColor: tc("#FFF9F3"),
    alignItems: "center",
    justifyContent: "center",
  },
  timelineChipDone: {
    backgroundColor: tc("#E8F4E1"),
    borderColor: tc("#C8DEB8"),
  },
  timelineChipNow: {
    backgroundColor: moduleTheme.colors.brand,
    borderColor: moduleTheme.colors.brand,
  },
  timelineText: {
    color: tc("#6E5549"),
    fontSize: 13,
    fontWeight: "600",
  },
  timelineTextNow: {
    color: moduleTheme.colors.textInverted,
  },
  reSultGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
  },
  reSultCard: {
    width: "48.5%",
    minHeight: 106,
    backgroundColor: tc("#FFFDFB"),
    borderWidth: 1,
    borderColor: tc("#EAD7C9"),
    borderRadius: 12,
    padding: 10,
  },
  reSultCardCompact: {
    width: "100%",
    minHeight: 92,
    padding: 8,
  },
  reSultTitle: {
    color: tc("#5A3D31"),
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
    marginBottom: 6,
  },
  reSultTitleCompact: {
    fontSize: 13,
    lineHeight: 16,
  },
  reSultLine: {
    color: tc("#3D2A1F"),
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  reSultLineCompact: {
    fontSize: 13,
    lineHeight: 18,
  },
  pregSummaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 8,
  },
  pregSummaryCard: {
    width: "48.5%",
    backgroundColor: "rgba(255,255,255,0.82)",
    borderWidth: 1,
    borderColor: moduleTheme.colors.border,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  pregSummaryCardCompact: {
    width: "100%",
  },
  cycleSummaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 8,
  },
  cycleSummaryCard: {
    width: "31.5%",
    minHeight: 74,
    backgroundColor: "rgba(255,249,244,0.95)",
    borderWidth: 1,
    borderColor: tc("#E7C9B3"),
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    justifyContent: "space-between",
    shadowColor: tc("#8A5A44"),
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  cycleSummaryCardAccent: {
    backgroundColor: tc("#FFEADF"),
    borderColor: tc("#E7B68E"),
  },
  cycleSummaryCardCompact: {
    width: "100%",
  },
  cycleSummaryHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cycleStatusLine: {
    marginBottom: 8,
  },
  cycleDateGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 6,
  },
  cycleDateCard: {
    width: "48.5%",
    backgroundColor: "rgba(255,255,255,0.86)",
    borderWidth: 1,
    borderColor: moduleTheme.colors.border,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  cycleDateCardFertile: {
    backgroundColor: tc("#FFF4EC"),
    borderColor: tc("#E9CFA8"),
  },
  cycleDateCardCompact: {
    width: "100%",
  },
  cycleDateHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cycleDateMain: {
    color: moduleTheme.colors.textStrong,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },
  cycleDateMainCompact: {
    fontSize: 13,
    lineHeight: 18,
  },
  cycleDateSub: {
    marginTop: 2,
    color: moduleTheme.colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
  },
  cycleDateSubCompact: {
    fontSize: 11,
    lineHeight: 14,
  },
  symptomRow: {
    marginTop: 6,
    marginBottom: 2,
  },
  symptomScoreRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  symptomScoreChip: {
    minWidth: 34,
    height: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: tc("#E3D1C4"),
    backgroundColor: "rgba(255,255,255,0.86)",
    alignItems: "center",
    justifyContent: "center",
  },
  symptomScoreChipActive: {
    borderColor: moduleTheme.colors.brand,
    backgroundColor: tc("#FFE4F0"),
  },
  symptomScoreText: {
    color: tc("#6B4D40"),
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
  },
  symptomScoreTextActive: {
    color: tc("#5A1E3F"),
  },
  testCard: {
    backgroundColor: "rgba(255,255,255,0.86)",
    borderWidth: 1,
    borderColor: moduleTheme.colors.border,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  testBadge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: tc("#DABFAE"),
    backgroundColor: tc("#FFF5EE"),
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  testBadgeDone: {
    borderColor: tc("#B7D8A9"),
    backgroundColor: tc("#EAF6E2"),
  },
  testBadgeText: {
    color: moduleTheme.colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
  },
  testBadgeTextDone: {
    color: tc("#3E6A2E"),
  },
  testCalendarWrap: {
    borderWidth: 1,
    borderColor: moduleTheme.colors.border,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.92)",
    marginBottom: 8,
  },
  testSaveBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: tc("#DABFAE"),
    backgroundColor: tc("#FFF5EE"),
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  testSaveBtnText: {
    color: moduleTheme.colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
  },
  mealRow: { marginTop: 6, backgroundColor: moduleTheme.colors.textInverted, borderWidth: 1, borderColor: tc("#E9DEF0"), borderRadius: 10, padding: 8 },
  mealCalText: { color: tc("#7A668A"), fontSize: 13, marginTop: 4, lineHeight: 18 },
  mealCalTextCompact: { fontSize: 12, lineHeight: 16 },
  swapBtn: { alignSelf: "flex-start", marginTop: 6, backgroundColor: tc("#E9DBF6"), borderRadius: 999, paddingVertical: 7, paddingHorizontal: 12, minHeight: 36, justifyContent: "center" },
  swapBtnText: { color: tc("#4A355C"), fontSize: 14, fontWeight: "600", lineHeight: 18 },
  swapBtnTextCompact: { fontSize: 13, lineHeight: 16 },
  chart: { backgroundColor: tc("#FCF8FF"), borderWidth: 1, borderColor: tc("#EEE2F5"), borderRadius: 12, padding: 10, marginTop: 4 },
  chartTitle: { color: tc("#5A486B"), fontWeight: "600", marginBottom: 8, fontSize: 15, lineHeight: 20 },
  chartRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  chartCol: { width: 34, alignItems: "center" },
  track: { width: 16, height: 70, borderRadius: 999, backgroundColor: tc("#EEE4F3"), justifyContent: "flex-end", overflow: "hidden" },
  bar: { width: "100%", borderRadius: 999 },
  small: { fontSize: 11, color: tc("#6C5C79"), lineHeight: 14 },
  planGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  planDayCard: {
    width: "48.5%",
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    minHeight: 360,
  },
  planDayCardCompact: {
    width: "48%",
    padding: 8,
    minHeight: 340,
  },
  snack: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    backgroundColor: tc("#E9DBF6"),
    borderWidth: 1,
    borderColor: tc("#D8BEEA"),
    borderRadius: 12,
    padding: 10,
  },
})


















