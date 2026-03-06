import AsyncStorage from "@react-native-async-storage/async-storage"
import { Ionicons } from "@expo/vector-icons"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  Alert,
  Animated,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native"
import * as Speech from "expo-speech"
import { moduleStyles, moduleTheme } from "../../../src/theme/moduleStyles"
import { tc } from "../../../src/theme/tokens"

type TarotType = "daily" | "love" | "career"
type DrawMode = "single" | "spread"

type TarotCard = {
  id: string
  name: string
  keywords: string
  imageUri: string
  messages: Record<TarotType, string>
}

type SpreadCard = {
  role: "past" | "present" | "advice"
  card: TarotCard
  isReversed: boolean
  deckIndex: number
}

type DrawRecord = {
  id: string
  date: string
  type: TarotType
  cardName: string
  isReversed: boolean
  mode: DrawMode
  intention?: string
}

type ChatMessage = { id: string; role: "user" | "assistant"; text: string }

const TAROT_HISTORY_KEY = "womio:astrology:tarotHistory"
const TAROT_DAILY_DRAW_KEY = "womio:astrology:tarotDailyDraw"
const TAROT_CHAT_DAILY_KEY = "womio:astrology:tarotChatDaily"
const TAROT_CHAT_CREDITS_KEY = "womio:astrology:tarotChatCredits"

// Used only inside the deck panel (not full page) to keep the app feeling consistent.
const TAROT_PANEL_IMAGE_URI =
  "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1400&q=80"

const rws = (fileName: string, width = 900) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}?width=${width}`

const TAROT_BACK_IMAGE_URI = "https://images.unsplash.com/photo-1615634262417-2f00a8f2a6c1?auto=format&fit=crop&w=1200&q=80"
const API_BASE = `${process.env.EXPO_PUBLIC_API_BASE_URL || "https://womio.net/api"}`.trim().replace(/\/+$/, "")
const TAROT_AI_ENDPOINT =
  process.env.EXPO_PUBLIC_TAROT_AI_ENDPOINT ||
  `${API_BASE}/astrology/tarot-chat`

const FREE_CHAT_DAILY_LIMIT = 5
const SPREAD_DECK_SIZE = 12

const categoryLabels: Record<TarotType, string> = {
  daily: "G\u00fcnl\u00fck",
  love: "A\u015fk",
  career: "Kariyer",
}

const spreadRoleLabels: Record<SpreadCard["role"], string> = {
  past: "Ge\u00e7mi\u015f",
  present: "\u015eimdi",
  advice: "\u00d6neri",
}

const tarotDeck: TarotCard[] = [
  {
    id: "sun",
    name: "G\u00fcne\u015f",
    keywords: "Canl\u0131l\u0131k \u2022 Netlik \u2022 Ne\u015fe",
    imageUri: rws("RWS_Tarot_19_Sun.jpg"),
    messages: {
      daily:
        "Bug\u00fcn zihinsel sis da\u011f\u0131l\u0131yor; neyi neden yapt\u0131\u011f\u0131n daha net. Planlar\u0131 ertelemek yerine k\u00fc\u00e7\u00fck bir ba\u015flang\u0131\u00e7 yap\u0131p ivme kazanabilirsin. Bir konuyu a\u00e7\u0131k ve sakin bir dille konu\u015fman, g\u00fcn\u00fcn enerjisini y\u00fckseltir.",
      love:
        "\u0130li\u015fkide a\u00e7\u0131kl\u0131k ve i\u00e7tenlik \u00f6ne \u00e7\u0131k\u0131yor. Duygular\u0131n\u0131 saklamadan ama acele etmeden payla\u015fmak, g\u00fcven hissini art\u0131r\u0131r. Bug\u00fcn k\u00fc\u00e7\u00fck bir jest, b\u00fcy\u00fck bir rahatlama yaratabilir.",
      career:
        "Kariyerde g\u00f6r\u00fcn\u00fcr olma ve takdir alma potansiyelin y\u00fcksek. Sunum, g\u00f6r\u00fc\u015fme veya yeni bir ad\u0131m i\u00e7in iyi bir zaman. Kendini abartmadan net anlat\u0131rsan, do\u011fru ki\u015filerden do\u011fru geri bildirim gelir.",
    },
  },
  {
    id: "star",
    name: "Y\u0131ld\u0131z",
    keywords: "Umut \u2022 \u0130yile\u015fme \u2022 \u0130lham",
    imageUri: rws("RWS_Tarot_17_Star.jpg"),
    messages: {
      daily:
        "Bug\u00fcn toparlanma ve i\u00e7ini ferahlatma g\u00fcn\u00fc. Kafandaki b\u00fcy\u00fck hedefleri bir kenara b\u0131rak\u0131p, s\u00fcrekli yapabilece\u011fin ufak bir rutin se\u00e7. D\u00fczenli ilerleme, umudu ger\u00e7ek sonuca d\u00f6n\u00fc\u015ft\u00fcr\u00fcr.",
      love:
        "A\u015fk taraf\u0131nda yumu\u015fak, \u015fefkatli bir ileti\u015fim iyile\u015ftirici olur. K\u0131r\u0131lgan bir konu varsa, savunmaya ge\u00e7meden anlatmak \u00e7ok i\u015fe yarar. Bug\u00fcn 'anla\u015f\u0131lmak' ihtiyac\u0131 \u00f6n planda.",
      career:
        "Kariyerde uzun vadeli yol haritas\u0131n\u0131 g\u00fcncellemek i\u00e7in g\u00fczel bir g\u00fcn. Ne yapmak istedi\u011fini netle\u015ftirince, 'nas\u0131l' k\u0131sm\u0131 kendili\u011finden kolayla\u015f\u0131r. Bir mentor veya tecr\u00fcbeli birinden fikir almak kap\u0131 a\u00e7abilir.",
    },
  },
  {
    id: "world",
    name: "D\u00fcnya",
    keywords: "Tamamlanma \u2022 Sonu\u00e7 \u2022 Olgunluk",
    imageUri: rws("RWS_Tarot_21_World.jpg"),
    messages: {
      daily:
        "Bug\u00fcn yar\u0131m kalan bir i\u015fi bitirip zihninde alan a\u00e7ma enerjisi var. K\u00fc\u00e7\u00fck bir kapan\u0131\u015f bile, yeni bir ba\u015flang\u0131c\u0131 kolayla\u015ft\u0131r\u0131r. Tamamlad\u0131k\u00e7a kendine g\u00fcvenin artar ve g\u00fcn daha ak\u0131\u015fkan ilerler.",
      love:
        "\u0130li\u015fkide bir d\u00f6ng\u00fc kapan\u0131yor: ya daha olgun bir seviyeye ge\u00e7i\u015f ya da gereksiz y\u00fckleri b\u0131rakma. Bug\u00fcn netlik ve sayg\u0131l\u0131 s\u0131n\u0131rlar, yak\u0131nl\u0131\u011f\u0131 g\u00fc\u00e7lendirir. \u0130ki taraf\u0131n da g\u00f6r\u00fcld\u00fc\u011f\u00fc bir konu\u015fma iyi gelir.",
      career:
        "Kariyerde sonu\u00e7 alma, teslim etme ve kapan\u0131\u015f enerjisi y\u00fcksek. Bir proje, rapor veya karar s\u00fcrecini tamamlay\u0131p \u00fcst\u00fcnden kalkabilirsin. Bitirdi\u011fin \u015feyleri k\u0131saca belgelemek (not, dosya, check-list) seni bir sonraki ad\u0131mda h\u0131zland\u0131r\u0131r.",
    },
  },
  {
    id: "lovers",
    name: "A\u015f\u0131klar",
    keywords: "Se\u00e7im \u2022 Uyum \u2022 Ba\u011f",
    imageUri: rws("RWS_Tarot_06_Lovers.jpg"),
    messages: {
      daily:
        "Bug\u00fcn kararlar\u0131n\u0131 de\u011ferlerinle hizalamak \u00f6nemli. Karars\u0131z kald\u0131\u011f\u0131n yerde 'k\u0131sa vadede kolay' olana de\u011fil, 'uzun vadede do\u011fru' olana yakla\u015f. Mant\u0131k ve kalbi ayn\u0131 masaya oturtursan netlik gelir.",
      love:
        "A\u015fk alan\u0131nda yak\u0131nl\u0131k ve uyum ihtiyac\u0131 art\u0131yor. Bug\u00fcn net bir niyet belirtmek (ne istiyorum, ne istemiyorum) ili\u015fkiyi bir ad\u0131m ileri ta\u015f\u0131r. Kar\u015f\u0131 taraf\u0131 'okumaya' \u00e7al\u0131\u015fmak yerine a\u00e7\u0131k soru sorman iyi gelir.",
      career:
        "Kariyerde do\u011fru i\u015fbirli\u011fi ve ekip uyumu g\u00fc\u00e7leniyor. Tek ba\u015f\u0131na y\u00fcr\u00fcmek yerine, do\u011fru ki\u015fiyle ayn\u0131 hedefe bakmak h\u0131z kazand\u0131r\u0131r. Bug\u00fcn ileti\u015fimde netlik, yanl\u0131\u015f anla\u015f\u0131lmalar\u0131 azalt\u0131r.",
    },
  },
  {
    id: "justice",
    name: "Adalet",
    keywords: "Denge \u2022 Objektiflik \u2022 Sorumluluk",
    imageUri: rws("RWS_Tarot_11_Justice.jpg"),
    messages: {
      daily:
        "Bug\u00fcn ger\u00e7eklerle y\u00fczle\u015fme ve d\u00fczeni kurma g\u00fcn\u00fc. H\u0131zl\u0131 karar yerine, kan\u0131ta ve net kurallara dayal\u0131 karar seni korur. Bir konuyu adilçe de\u011ferlendirince i\u00e7in rahat eder.",
      love:
        "\u0130li\u015fkide verme-alma dengesi belirginle\u015fiyor. Beklentiler s\u00f6ylenmedi\u011finde k\u00fc\u00e7\u00fck k\u0131r\u0131l\u0131\u015flar b\u00fcy\u00fcyebilir; bug\u00fcn net ve sayg\u0131l\u0131 konu\u015fmak \u015fart. 'Hakl\u0131l\u0131k' yerine 'adil olma' taraf\u0131na ge\u00e7mek rahatlat\u0131r.",
      career:
        "Kariyerde teklif, s\u00f6zle\u015fme veya resmi bir karar g\u00fcndeme gelebilir. Detaylar\u0131 kontrol etmek, sonradan pi\u015fmanl\u0131\u011f\u0131 \u00f6nler. Bug\u00fcn 'do\u011fru olan\u0131 yapma' motivasyonu, performans\u0131n\u0131 g\u00fc\u00e7lendirir.",
    },
  },
  {
    id: "moon",
    name: "Ay",
    keywords: "Sezgi \u2022 Belirsizlik \u2022 Derinlik",
    imageUri: rws("RWS_Tarot_18_Moon.jpg"),
    messages: {
      daily:
        "Bug\u00fcn sezgilerin g\u00fc\u00e7l\u00fc ama zihin kolayca senaryoya kayabilir. Netlik i\u00e7in yava\u015fla, g\u00f6zlem yap ve kesin bilgiye tutun. Gece saatlerinde duygusal dalgalanma artabilir; rutinin (su, uyku, hareket) \u00e7ok fark ettirir.",
      love:
        "A\u015fk taraf\u0131nda hassasiyet artabilir; yanl\u0131\u015f anlamalar kolayla\u015f\u0131r. Varsaymak yerine k\u0131sa bir soru sorman ili\u015fkiyi korur. Bug\u00fcn sakin bir ton, duyguyu g\u00fcvende hissettirir.",
      career:
        "Kariyerde belirsiz bir konu g\u00fcndeme gelebilir. Acele karar yerine veri toplay\u0131p ad\u0131m ad\u0131m ilerlemek daha g\u00fcvenli. 'Bug\u00fcn hemen bitireyim' bask\u0131s\u0131 yerine 'bug\u00fcn netle\u015ftireyim' hedefi koy.",
    },
  },
  {
    id: "tower",
    name: "Kule",
    keywords: "K\u0131r\u0131lma \u2022 Ger\u00e7ek \u2022 Yeniden Yap\u0131lanma",
    imageUri: rws("RWS_Tarot_16_Tower.jpg"),
    messages: {
      daily:
        "Bug\u00fcn bir plan beklenmedik \u015fekilde de\u011fi\u015febilir. Bu kart 'y\u0131k\u0131m' gibi g\u00f6r\u00fcnse de, asl\u0131nda ger\u00e7e\u011fe alan a\u00e7ar. Esnek kal\u0131p \u00f6ncelik belirledi\u011finde, yeni bir yol daha do\u011fru hissettirebilir.",
      love:
        "\u0130li\u015fkide bir konu a\u00e7\u0131\u011fa \u00e7\u0131kabilir: saklanan bir duygu, bast\u0131r\u0131lan bir ihtiya\u00e7, ertelenen bir konu. Netlik, ilk anda zor olsa da uzun vadede iyile\u015ftirir. Bug\u00fcn savunmaya ge\u00e7meden dinlemek k\u0131ymetli.",
      career:
        "Kariyerde ani bir g\u00fcndem veya \u00f6ncelik de\u011fi\u015fikli\u011fi olabilir. Panik yerine liste yap: \u015fimdi / sonra / devret. Krizi f\u0131rsata \u00e7eviren \u015fey, sakin ve net organizasyondur.",
    },
  },
  {
    id: "strength",
    name: "G\u00fc\u00e7",
    keywords: "Sab\u0131r \u2022 Cesaret \u2022 \u00d6z Kontrol",
    imageUri: rws("RWS_Tarot_08_Strength.jpg"),
    messages: {
      daily:
        "Bug\u00fcn en b\u00fcy\u00fck g\u00fcc\u00fcn sakinli\u011fin. H\u0131zl\u0131 tepki vermek yerine derin nefes al\u0131p net ilerlemek seni kazand\u0131r\u0131r. Zor bir konu varsa, \u00f6nce ritmini toparla; sonra ad\u0131m ad\u0131m \u00e7\u00f6z\u00fcm gelir.",
      love:
        "\u0130li\u015fkide \u015fefkatli ama s\u0131n\u0131r\u0131 belli bir duru\u015f \u00f6ne \u00e7\u0131k\u0131yor. S\u0131cakl\u0131k, g\u00fcveni art\u0131r\u0131r; sakinlik, tansiyonu d\u00fc\u015f\u00fcr\u00fcr. Bug\u00fcn 'hakl\u0131 \u00e7\u0131kmak' yerine 'anla\u015f\u0131lmak' daha de\u011ferli.",
      career:
        "Kariyerde bask\u0131y\u0131 iyi y\u00f6netebilece\u011fin bir g\u00fcn. Zor bir g\u00f6revi par\u00e7alara b\u00f6l, en kolay ad\u0131mdan ba\u015fla. \u0130stikrar, bug\u00fcn performans\u0131n\u0131 parlat\u0131r.",
    },
  },
  {
    id: "temperance",
    name: "Denge",
    keywords: "Uyum \u2022 \u00d6l\u00e7\u00fc \u2022 \u0130yile\u015fme",
    imageUri: rws("RWS_Tarot_14_Temperance.jpg"),
    messages: {
      daily:
        "Bug\u00fcn anahtar kelime \u00f6l\u00e7\u00fc: az ama d\u00fczenli. A\u015f\u0131r\u0131ya ka\u00e7madan, g\u00fcn\u00fc dengede tutarsan her \u015fey daha kolay akar. V\u00fccuduna iyi gelen \u015feyleri (su, y\u00fcr\u00fcy\u00fc\u015f, uyku) \u00f6ncelemek g\u00fcn\u00fc kurtar\u0131r.",
      love:
        "\u0130li\u015fkide orta yolu bulmak, tansiyonu d\u00fc\u015f\u00fcr\u00fcr. Bug\u00fcn yumu\u015fak bir ton, kar\u015f\u0131 taraf\u0131 savunmadan \u00e7\u0131kar\u0131r. Ufak bir uzla\u015fma, b\u00fcy\u00fck bir rahatl\u0131k getirir.",
      career:
        "Kariyerde plan\u0131 sadele\u015ftirip \u00f6ncelikleri dengede tutarsan verim artar. Her \u015feyi ayn\u0131 anda \u00e7\u00f6zmek yerine, 2-3 ana i\u015fe odaklan. Bug\u00fcn 'd\u00fczen' kazan\u00e7 getirir.",
    },
  },
  {
    id: "magician",
    name: "B\u00fcy\u00fcc\u00fc",
    keywords: "Ba\u015flang\u0131\u00e7 \u2022 \u0130nisiyatif \u2022 Yarat\u0131m",
    imageUri: rws("RWS_Tarot_01_Magician.jpg"),
    messages: {
      daily:
        "Bug\u00fcn ba\u015flatma enerjin y\u00fcksek; elindeki imkanlar\u0131 daha iyi g\u00f6r\u00fcyorsun. Erteledi\u011fin bir konu varsa, minik bir ad\u0131m bile kontrol hissini geri getirir. 'Yapamam' yerine 'deneyeyim' dedi\u011finde kap\u0131lar a\u00e7\u0131l\u0131r.",
      love:
        "A\u015fk taraf\u0131nda cesur ama sayg\u0131l\u0131 bir a\u00e7\u0131l\u0131m ili\u015fkiyi canland\u0131r\u0131r. Bug\u00fcn bir mesaj, bir teklif veya bir bulu\u015fma fikri iyi gelebilir. Niyetini net s\u00f6yledi\u011finde belirsizlik azal\u0131r.",
      career:
        "Kariyerde yeni bir fikir, teklif ya da 'bunu ben yapar\u0131m' diyebilece\u011fin bir alan \u00f6ne \u00e7\u0131kabilir. Kontrol sende; \u00f6nemli olan ilk ad\u0131m\u0131 atmak. Bug\u00fcn yar\u0131m saatlik odak bile b\u00fcy\u00fck fark yarat\u0131r.",
    },
  },
  {
    id: "highpriestess",
    name: "Azize",
    keywords: "Sezgi \u2022 Gizli Bilgi \u2022 Sakinlik",
    imageUri: rws("RWS_Tarot_02_High_Priestess.jpg"),
    messages: {
      daily:
        "Bug\u00fcn i\u00e7 sesin g\u00fc\u00e7l\u00fc; acele karar yerine g\u00f6zlem yapman daha do\u011fru. Bir konu i\u00e7ine sinmiyorsa, biraz daha bilgi topla. Sakinlik, sana en do\u011fru cevab\u0131 f\u0131s\u0131ldar.",
      love:
        "A\u015fk taraf\u0131nda duygular derinle\u015febilir. S\u00f6ylemeden \u00f6nce hissetmek ve anlamak bug\u00fcn daha k\u0131ymetli. Sessizlik so\u011fukluk de\u011fil; do\u011fru zamanda do\u011fru c\u00fcmle kurmak i\u00e7in bir alan olabilir.",
      career:
        "Kariyerde her detaya hemen a\u00e7\u0131lmak yerine, bilgiyi toplay\u0131p sonra hamle yapmak ak\u0131ll\u0131ca. Bug\u00fcn sezgilerin do\u011fru sinyal verebilir; yine de veriyi kontrol et. \u0130kiyi dengeledi\u011finde en iyi sonucu al\u0131rs\u0131n.",
    },
  },
  {
    id: "empress",
    name: "\u0130mparatori\u00e7e",
    keywords: "Bereket \u2022 Bak\u0131m \u2022 \u00dcretkenlik",
    imageUri: rws("RWS_Tarot_03_Empress.jpg"),
    messages: {
      daily:
        "Bug\u00fcn kendine iyi bakmak, enerjini do\u011frudan y\u00fckseltir. V\u00fccudunun ihtiyac\u0131n\u0131 fark et: su, beslenme, dinlenme ve yumu\u015fak bir tempo. \u00dcretkenlik; kendini zorlayarak de\u011fil, do\u011fru ortam\u0131 kurarak gelir.",
      love:
        "A\u015fk taraf\u0131nda \u015fefkat, yak\u0131nl\u0131k ve 'g\u00fcvende hissetme' ihtiyac\u0131 artar. Bug\u00fcn sevgi dilini basit \u015feylerle g\u00f6stermek etkili olur: ilgi, zaman ay\u0131rma, g\u00fczel bir s\u00f6z. \u0130li\u015fkide besleyen bir tav\u0131r ba\u011f\u0131 g\u00fc\u00e7lendirir.",
      career:
        "Kariyerde b\u00fcy\u00fctme ve bereket enerjisi var: bir fikri geli\u015ftirme, bir projeyi olgunla\u015ft\u0131rma, d\u00fczen kurma. Bug\u00fcn k\u0131sa vadeli ko\u015fturmadan \u00e7ok, s\u00fcrekli ilerleme sa\u011flayan sistemler kurmak kazand\u0131r\u0131r. Eme\u011fini g\u00f6r\u00fcn\u00fcr k\u0131lman iyi olur.",
    },
  },
]

const analysisThemes: Record<TarotType, { focus: string[]; caution: string[] }> = {
  daily: {
    focus: [
      "Bugün küçük ama net adımlar sana ivme kazandırır.",
      "Ritmini korumak için öncelik listesini sadeleştir.",
      "Dış etkiler yerine kendi planına dönmek faydalı olur.",
    ],
    caution: [
      "Aynı anda fazla konuya dağılmak verimini düşürebilir.",
      "Hızlı tepki yerine bir adım geri çekilip netlik ara.",
      "Ertelediğin bir konu bugün daha fazla stres yaratabilir.",
    ],
  },
  love: {
    focus: [
      "Duyguyu net cümleyle ifade etmek bağı güçlendirir.",
      "Karşı tarafı dinleyip sonra yanıtlamak bugün altın anahtar.",
      "Yakınlık için küçük bir jest büyük etki yaratabilir.",
    ],
    caution: [
      "Varsayım yapmak yerine sorup netleştir.",
      "Eski bir konuyu bugüne taşımak tansiyonu artırabilir.",
      "Aşırı beklenti dili yerine işbirliği dili kullan.",
    ],
  },
  career: {
    focus: [
      "Bugün somut sonuç getirecek işlere odaklan.",
      "Planını 3 adıma ayırman hız kazandırır.",
      "Görünür bir işi tamamlamak motivasyonu artırır.",
    ],
    caution: [
      "Detaylarda kaybolmak teslim tarihini zorlayabilir.",
      "Acele karar yerine kısa bir kontrol turu yap.",
      "Her şeyi tek başına taşımak yerine destek iste.",
    ],
  },
}

const getDateStamp = (date = new Date()) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

const shuffle = <T,>(arr: T[]) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = a[i]
    a[i] = a[j]
    a[j] = tmp
  }
  return a
}

export default function AstrologyTarotScreen() {
  const { width } = useWindowDimensions()

  const [tarotType, setTarotType] = useState<TarotType>("daily")
  const [drawMode, setDrawMode] = useState<DrawMode>("spread")
  const [intention, setIntention] = useState("")

  const [drawnCard, setDrawnCard] = useState<TarotCard | null>(tarotDeck[0])
  const [isReversed, setIsReversed] = useState(false)

  const [spreadDeck, setSpreadDeck] = useState<TarotCard[]>([])
  const [spreadCards, setSpreadCards] = useState<SpreadCard[]>([])

  const [dailyDrawUsed, setDailyDrawUsed] = useState(false)
  const [, setDailyDrawStamp] = useState("")
  const [history, setHistory] = useState<DrawRecord[]>([])

  const [aiInput, setAiInput] = useState("")
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null)
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [chatDailyUsed, setChatDailyUsed] = useState(0)
  const [chatDailyStamp, setChatDailyStamp] = useState("")
  const [chatCredits, setChatCredits] = useState(0)
  const [chat, setChat] = useState<ChatMessage[]>([
    {
      id: "intro",
      role: "assistant",
      text: "Ben WOMIO Tarot Asistanıyım. Kartınla ilgili soru sor, sana sohbet eder gibi yorumlayayım.",
    },
  ])

  const flipAnims = useRef<Animated.Value[]>([])
  if (flipAnims.current.length !== SPREAD_DECK_SIZE) {
    flipAnims.current = Array.from({ length: SPREAD_DECK_SIZE }, () => new Animated.Value(0))
  }

  useEffect(() => {
    const loadInitial = async () => {
      const raw = await AsyncStorage.getItem(TAROT_HISTORY_KEY)
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as DrawRecord[]
          setHistory(Array.isArray(parsed) ? parsed : [])
        } catch {
          setHistory([])
        }
      }

       const drawRaw = await AsyncStorage.getItem(TAROT_DAILY_DRAW_KEY)
       const today = getDateStamp()
       if (!drawRaw) {
         setDailyDrawUsed(false)
       } else {
         try {
           const parsed = JSON.parse(drawRaw) as { date?: string; used?: boolean }
           const sameDay = parsed?.date === today
           setDailyDrawUsed(Boolean(sameDay && parsed?.used))
         } catch {
           setDailyDrawUsed(false)
         }
       }

      const chatRaw = await AsyncStorage.getItem(TAROT_CHAT_DAILY_KEY)
      const chatToday = getDateStamp()
      if (!chatRaw) {
        setChatDailyStamp(chatToday)
        setChatDailyUsed(0)
      } else {
        try {
          const parsed = JSON.parse(chatRaw) as { date?: string; used?: number }
          const sameDay = parsed?.date === chatToday
          setChatDailyStamp(chatToday)
          setChatDailyUsed(sameDay ? Number(parsed?.used ?? 0) : 0)
        } catch {
          setChatDailyStamp(chatToday)
          setChatDailyUsed(0)
        }
      }

      const creditsRaw = await AsyncStorage.getItem(TAROT_CHAT_CREDITS_KEY)
      if (!creditsRaw) {
        setChatCredits(0)
      } else {
        const n = Number(creditsRaw)
        setChatCredits(Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0)
      }
    }

    void loadInitial()
  }, [])

  useEffect(() => {
    return () => {
      void Speech.stop()
    }
  }, [])

  const ensureSpreadDeck = () => {
    if (spreadDeck.length === SPREAD_DECK_SIZE) return
    const nextDeck = shuffle(tarotDeck).slice(0, SPREAD_DECK_SIZE)
    setSpreadDeck(nextDeck)
    setSpreadCards([])
    flipAnims.current.forEach((a) => a.setValue(0))
    setDrawnCard(nextDeck[0] ?? null)
    setIsReversed(false)
  }

  useEffect(() => {
    if (drawMode !== "spread") return
    ensureSpreadDeck()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawMode])

  const drawSingleTarot = async () => {
    if (dailyDrawUsed) return
    const nextCard = tarotDeck[Math.floor(Math.random() * tarotDeck.length)]
    const reversed = Math.random() < 0.38
    setDrawnCard(nextCard)
    setIsReversed(reversed)
    setSpreadCards([])

    const record: DrawRecord = {
      id: String(Date.now()),
      date: new Date().toISOString(),
      type: tarotType,
      cardName: nextCard.name,
      isReversed: reversed,
      mode: "single",
      intention: intention.trim() || undefined,
    }
    const nextHistory = [record, ...history].slice(0, 8)
    setHistory(nextHistory)
    await AsyncStorage.setItem(TAROT_HISTORY_KEY, JSON.stringify(nextHistory))

    const today = getDateStamp()
    setDailyDrawUsed(true)
    setDailyDrawStamp(today)
    await AsyncStorage.setItem(TAROT_DAILY_DRAW_KEY, JSON.stringify({ date: today, used: true }))
  }

  const resetSpread = () => {
    const nextDeck = shuffle(tarotDeck).slice(0, SPREAD_DECK_SIZE)
    setSpreadDeck(nextDeck)
    setSpreadCards([])
    flipAnims.current.forEach((a) => a.setValue(0))
    setDrawnCard(nextDeck[0] ?? null)
    setIsReversed(false)
  }

  const selectSpreadCard = (index: number) => {
    if (drawMode !== "spread") return
    if (spreadCards.length >= 3) return
    const card = spreadDeck[index]
    if (!card) return
    if (spreadCards.some((s) => s.deckIndex === index)) return

    const roles: SpreadCard["role"][] = ["past", "present", "advice"]
    const role = roles[spreadCards.length]
    const reversed = Math.random() < 0.34

    const next = [...spreadCards, { role, card, isReversed: reversed, deckIndex: index }]
    setSpreadCards(next)

    Animated.timing(flipAnims.current[index], {
      toValue: 1,
      duration: 380,
      useNativeDriver: true,
    }).start()

    if (role === "present") {
      setDrawnCard(card)
      setIsReversed(reversed)
    }

    if (next.length === 3) {
      const record: DrawRecord = {
        id: String(Date.now()),
        date: new Date().toISOString(),
        type: tarotType,
        cardName: `${next[0].card.name} / ${next[1].card.name} / ${next[2].card.name}`,
        isReversed: next.some((p) => p.isReversed),
        mode: "spread",
        intention: intention.trim() || undefined,
      }
      const nextHistory = [record, ...history].slice(0, 8)
      setHistory(nextHistory)
      void AsyncStorage.setItem(TAROT_HISTORY_KEY, JSON.stringify(nextHistory))
    }
  }

  const selectedMessage = useMemo(() => {
    if (!drawnCard) return ""
    const base = drawnCard.messages[tarotType]
    if (!isReversed) return base
    return `${base} (Ters) Bu kart ters geldiğinde tema genelde içe dönüş, gecikme veya aşırı tepkiyi yönetmek olur. Bugün acele karar yerine bir adım geri çekilip netleşmen daha iyi sonuç verir.`
  }, [drawnCard, tarotType, isReversed])

  const analysis = useMemo(() => {
    const focusPool = analysisThemes[tarotType].focus
    const cautionPool = analysisThemes[tarotType].caution
    const seed = (drawnCard?.name.length ?? 0) + (isReversed ? 7 : 2)
    const focus = focusPool[seed % focusPool.length]
    const caution = cautionPool[(seed + 1) % cautionPool.length]
    const energyScore = Math.max(40, Math.min(97, 72 + (isReversed ? -12 : 8)))
    return { focus, caution, energyScore }
  }, [drawnCard, tarotType, isReversed])

  const spreadSummary = useMemo(() => {
    if (spreadCards.length !== 3) return ""
    const [past, present, advice] = spreadCards
    const intent = intention.trim() ? `Niyetin: "${intention.trim()}". ` : ""
    const rev = (x: SpreadCard) => (x.isReversed ? " (Ters)" : " (Düz)")
    return (
      `${intent}` +
      `${spreadRoleLabels[past.role]}: ${past.card.name}${rev(past)} geçmişten taşıdığın kalıbı ve kök nedeni anlatır. ` +
      `${spreadRoleLabels[present.role]}: ${present.card.name}${rev(present)} bugün hangi duygunun/konunun merkezde olduğunu gösterir. ` +
      `${spreadRoleLabels[advice.role]}: ${advice.card.name}${rev(advice)} ise bir sonraki adımda neyi seçersen rahatlayacağını söyler. ` +
      `Üç kartın ortak mesajı: hız değil netlik; tepki değil yön belirlemek.`
    )
  }, [spreadCards, intention])

  const quickPrompts = ["Bu hafta nelere odaklanayım?", "Ne yapmamam gerekiyor?", "Aşk hayatım için özet ver"]

  const buildAiAnswerLocal = (question: string) => {
    const normalized = question.trim().toLocaleLowerCase("tr-TR")
    const isGreeting = ["selam", "merhaba", "hey", "slm", "günaydın", "iyi akşamlar"].some((w) => normalized === w || normalized.startsWith(`${w} `))
    const isThanks = ["teşekkür", "sağ ol", "eyvallah", "thanks"].some((w) => normalized.includes(w))
    const isHowAreYou = normalized.includes("nasılsın") || normalized.includes("naber")
    const isOk = ["tamam", "ok", "oke", "anladım", "anladim", "peki"].some((w) => normalized === w)

    if (isGreeting) return "Selam. İstersen bugün için net bir soru sor, kartlara göre yorumlayayım."
    if (isThanks) return "Rica ederim. İstersen bir örnek senaryo ver, daha nokta atışı yorum yapayım."
    if (isHowAreYou) return "İyiyim, teşekkür ederim. Kartlarına göre yorumlamaya hazırım."
    if (isOk) return "Tamam. Neyi netleştirmek istiyorsun: aşk mı kariyer mi, yoksa günün enerjisi mi?"

    const cardSummary =
      drawMode === "spread" && spreadCards.length === 3
        ? spreadCards.map((x) => `${spreadRoleLabels[x.role]}:${x.card.name}${x.isReversed ? " (Ters)" : ""}`).join(" | ")
        : `${drawnCard?.name ?? "Kart yok"}${isReversed ? " (Ters)" : " (Düz)"}`

    const intentPart = intention.trim() ? `Niyetin (${intention.trim()}) üzerinden bakınca` : "Genel enerjiye göre"
    return `${intentPart}, kart sinyalin: ${cardSummary}. Odak: ${analysis.focus} Dikkat: ${analysis.caution} İstersen sorunu biraz daha spesifik yaz, daha net konuşalım.`
  }

  const toggleSpeak = async (message: ChatMessage) => {
    if (message.role !== "assistant") return
    if (speakingMessageId === message.id) {
      await Speech.stop()
      setSpeakingMessageId(null)
      return
    }
    await Speech.stop()
    setSpeakingMessageId(message.id)
    Speech.speak(message.text, {
      language: "tr-TR",
      pitch: 1.0,
      rate: 0.95,
      onDone: () => setSpeakingMessageId(null),
      onStopped: () => setSpeakingMessageId(null),
      onError: () => setSpeakingMessageId(null),
    })
  }

  const sendAiMessage = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || isAiLoading) return

    const today = getDateStamp()
    if (chatDailyStamp !== today) {
      setChatDailyStamp(today)
      setChatDailyUsed(0)
      await AsyncStorage.setItem(TAROT_CHAT_DAILY_KEY, JSON.stringify({ date: today, used: 0 }))
    }

    const hasFree = chatDailyUsed < FREE_CHAT_DAILY_LIMIT
    const hasCredit = chatCredits > 0
    const willUseCredit = !hasFree

    if (!hasFree && !hasCredit) {
      Alert.alert("Günlük Limit Doldu", "Bugün 5 ücretsiz soru hakkını kullandın. Kredi alarak devam edebilirsin. (Yakında)")
      setChat((prev) =>
        [
          ...prev,
          {
            id: `a-${Date.now()}-${Math.random()}`,
            role: "assistant" as const,
            text: "Bugün ücretsiz soru hakkın doldu. Kredi ile devam etmek için 'Kredi Al' özelliğini aktive edeceğiz. Şimdilik yarın tekrar deneyebilirsin.",
          },
        ].slice(-10)
      )
      return
    }

    if (willUseCredit) {
      const nextCredits = Math.max(0, chatCredits - 1)
      setChatCredits(nextCredits)
      await AsyncStorage.setItem(TAROT_CHAT_CREDITS_KEY, String(nextCredits))
    } else {
      const nextUsed = chatDailyUsed + 1
      setChatDailyUsed(nextUsed)
      await AsyncStorage.setItem(TAROT_CHAT_DAILY_KEY, JSON.stringify({ date: today, used: nextUsed }))
    }

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", text: trimmed }
    setChat((prev) => [...prev, userMsg].slice(-10))
    setAiInput("")
    setIsAiLoading(true)

    const cardSummary =
      drawMode === "spread" && spreadCards.length === 3
        ? spreadCards.map((x) => `${spreadRoleLabels[x.role]}:${x.card.name}${x.isReversed ? " (Ters)" : ""}`).join(" | ")
        : `${drawnCard?.name ?? "Kart yok"}${isReversed ? " (Ters)" : " (Düz)"}`

    try {
      const response = await fetch(TAROT_AI_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: trimmed,
          context: {
            tarotType,
            drawMode,
            intention,
            cardSummary,
            focus: analysis.focus,
            caution: analysis.caution,
          },
          history: chat.slice(-6).map((item) => ({ role: item.role, text: item.text })),
        }),
      })

      if (!response.ok) throw new Error(`AI endpoint failed: ${response.status}`)
      const data = (await response.json()) as { answer?: string }
      const aiText = `${data.answer ?? ""}`.trim()
      if (!aiText) throw new Error("Empty answer")

      const aiMsg: ChatMessage = { id: `a-${Date.now()}-${Math.random()}`, role: "assistant", text: aiText }
      setChat((prev) => [...prev, aiMsg].slice(-10))
    } catch {
      const aiMsg: ChatMessage = { id: `a-${Date.now()}-${Math.random()}`, role: "assistant", text: buildAiAnswerLocal(trimmed) }
      setChat((prev) => [...prev, aiMsg].slice(-10))
    } finally {
      setIsAiLoading(false)
    }
  }

  const onBuyCredits = async () => {
    Alert.alert("Yakında", "Kredi satın alma ekranını sonraki adımda ekleyeceğiz.")
  }

  const deckGrid = useMemo(() => {
    // 3-up grid with proportional spacing. Use % widths + padding so spacing stays even on all platforms.
    const usable = Math.min(width, 520) - 32
    const gap = Math.round(Math.max(10, Math.min(14, usable * 0.03)))
    return { gap }
  }, [width])

  const selectedOrderForIndex = (idx: number) => {
    const found = spreadCards.findIndex((c) => c.deckIndex === idx)
    return found >= 0 ? found + 1 : null
  }

  const renderSpreadCard = (card: TarotCard, index: number) => {
    const anim = flipAnims.current[index]
    const backRotate = anim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] })
    const frontRotate = anim.interpolate({ inputRange: [0, 1], outputRange: ["180deg", "360deg"] })

    const order = selectedOrderForIndex(index)
    const picked = order !== null
    const locked = spreadCards.length >= 3 && !picked

    const chosen = spreadCards.find((c) => c.deckIndex === index)
    const showFront = Boolean(chosen)

    return (
      <View key={`${card.id}-${index}`} style={{ width: "33.3333%", paddingHorizontal: deckGrid.gap / 2, paddingBottom: deckGrid.gap }}>
        <Pressable onPress={() => selectSpreadCard(index)} disabled={locked || picked} style={{ width: "100%", aspectRatio: 1 / 1.45 }}>
          <View style={[styles.cardWrap, picked && styles.cardWrapPicked, locked && styles.cardWrapLocked]}>
            {order ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{order}</Text>
              </View>
            ) : null}

            <Animated.View
              style={[
                styles.flipCard,
                {
                  transform: [{ perspective: 900 }, { rotateY: backRotate }],
                },
              ]}
            >
              <ImageBackground
                source={{ uri: TAROT_BACK_IMAGE_URI }}
                style={[styles.cardFace, styles.cardBack]}
                imageStyle={styles.cardImageInner}
              >
                <View style={styles.cardImageOverlayDark} />
                <Ionicons name="sparkles" size={18} color="rgba(255,255,255,0.92)" />
                <Text style={styles.cardBackTitle}>WOMIO</Text>
                <Text style={styles.cardBackSub}>Tarot</Text>
              </ImageBackground>
            </Animated.View>

            <Animated.View
              style={[
                styles.flipCard,
                styles.flipCardFront,
                {
                  transform: [{ perspective: 900 }, { rotateY: frontRotate }],
                  opacity: showFront ? 1 : 0,
                },
              ]}
            >
              <ImageBackground
                source={{ uri: card.imageUri }}
                style={[styles.cardFace, styles.cardFront]}
                imageStyle={styles.cardImageInner}
              >
                <View style={styles.cardImageOverlay} />
                <View style={styles.cardFrontLabel}>
                  <Text style={styles.cardFrontName} numberOfLines={2}>
                    {card.name}
                  </Text>
                  <Text style={styles.cardFrontKeywords} numberOfLines={2}>
                    {card.keywords}
                  </Text>
                </View>
                {chosen ? (
                  <View style={styles.cardFrontMeta}>
                    <Text style={styles.cardFrontMetaText}>
                      {spreadRoleLabels[chosen.role]}
                      {chosen.isReversed ? " (Ters)" : ""}
                    </Text>
                  </View>
                ) : null}
              </ImageBackground>
            </Animated.View>
          </View>
        </Pressable>
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Tarot Falı</Text>
            <Text style={styles.subtitle}>Arkası kapalı kartlardan 3 kart seç, seçtiklerin dönerek açılır.</Text>
          </View>
          <View style={styles.creditsPill}>
            <Ionicons name="chatbubble-ellipses" size={16} color={moduleTheme.colors.brand} />
            <Text style={styles.creditsText}>
              {Math.max(0, FREE_CHAT_DAILY_LIMIT - chatDailyUsed)} free â€¢ {chatCredits} kredi
            </Text>
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Kategori</Text>
          <View style={styles.segmentContainer}>
            {(Object.keys(categoryLabels) as TarotType[]).map((k) => {
              const active = tarotType === k
              return (
                <Pressable
                  key={k}
                  onPress={() => setTarotType(k)}
                  style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                >
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{categoryLabels[k]}</Text>
                </Pressable>
              )
            })}
          </View>

          <Text style={[styles.panelTitle, { marginTop: 12 }]}>Çekim</Text>
          <View style={styles.segmentContainer}>
            {[
              { key: "single" as const, label: "1 Kart" },
              { key: "spread" as const, label: "3 Kart" },
            ].map((x) => {
              const active = drawMode === x.key
              return (
                <Pressable
                  key={x.key}
                  onPress={() => setDrawMode(x.key)}
                  style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                >
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{x.label}</Text>
                </Pressable>
              )
            })}
          </View>

          <Text style={[styles.panelTitle, { marginTop: 12 }]}>Niyet (opsiyonel)</Text>
          <TextInput
            value={intention}
            onChangeText={setIntention}
            placeholder="Örn: Bu hafta işimle ilgili neye odaklanmalıyım?"
            placeholderTextColor="rgba(33,18,23,0.45)"
            style={styles.input}
          />
        </View>

        {drawMode === "single" ? (
          <View style={styles.panel}>
            <View style={styles.rowBetween}>
              <Text style={styles.panelTitle}>Günlük Tek Kart</Text>
              <View style={styles.smallPill}>
                <Ionicons name={dailyDrawUsed ? "lock-closed" : "gift"} size={14} color={moduleTheme.colors.brand} />
                <Text style={styles.smallPillText}>{dailyDrawUsed ? "Bugün kullanıldı" : "Günde 1 ücretsiz"}</Text>
              </View>
            </View>

            <Pressable
              onPress={() => void drawSingleTarot()}
              disabled={dailyDrawUsed}
              style={[styles.primaryBtn, dailyDrawUsed && styles.primaryBtnDisabled]}
            >
              <Text style={styles.primaryBtnText}>{dailyDrawUsed ? "Yarın tekrar" : "Kart Çek"}</Text>
            </Pressable>

            {drawnCard ? (
              <View style={styles.resultCard}>
                <ImageBackground
                  source={{ uri: drawnCard.imageUri }}
                  style={styles.singleImage}
                  imageStyle={styles.singleImageInner}
                >
                  <View style={styles.singleImageOverlay} />
                  <Text style={styles.singleImageTitle}>
                    {drawnCard.name} {isReversed ? "(Ters)" : "(Düz)"}
                  </Text>
                </ImageBackground>
                <View style={styles.resultHead}>
                  <Text style={styles.resultSub}>{drawnCard.keywords}</Text>
                </View>
                <Text style={styles.resultText}>{selectedMessage}</Text>
                <View style={styles.metricsRow}>
                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>Enerji</Text>
                    <Text style={styles.metricValue}>%{analysis.energyScore}</Text>
                  </View>
                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>Odak</Text>
                    <Text style={styles.metricValue2} numberOfLines={2}>
                      {analysis.focus}
                    </Text>
                  </View>
                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>Dikkat</Text>
                    <Text style={styles.metricValue2} numberOfLines={2}>
                      {analysis.caution}
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}
          </View>
        ) : (
          <ImageBackground
            source={{ uri: TAROT_PANEL_IMAGE_URI }}
            resizeMode="cover"
            style={[styles.panel, styles.panelWithImage]}
            imageStyle={styles.panelWithImageInner}
          >
            <View style={styles.panelWithImageOverlay} />
            <View style={styles.rowBetween}>
              <Text style={styles.panelTitle}>3 Kart Seç (Geçmiş / Şimdi / Öneri)</Text>
              <Pressable onPress={resetSpread} style={styles.ghostBtn}>
                <Ionicons name="refresh" size={16} color={moduleTheme.colors.brand} />
                <Text style={styles.ghostBtnText}>Kar</Text>
              </Pressable>
            </View>

            <View style={styles.stepsRow}>
              {["1: Geçmiş", "2: Şimdi", "3: Öneri"].map((s, idx) => {
                const done = spreadCards.length > idx
                const active = spreadCards.length === idx
                return (
                  <View key={s} style={[styles.stepPill, done && styles.stepPillDone, active && styles.stepPillActive]}>
                    <Text style={[styles.stepText, (done || active) && styles.stepTextOn]}>{s}</Text>
                  </View>
                )
              })}
            </View>

            <Text style={styles.help}>
              Kartların arkası kapalı. Üç kart seç: 1) Geçmiş, 2) Şimdi, 3) Öneri. Seçtiğin kartlar dönerek açılacak.
            </Text>

            <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 10, marginHorizontal: -(deckGrid.gap / 2) }}>
              {spreadDeck.map((c, i) => renderSpreadCard(c, i))}
            </View>

            {spreadCards.length === 3 ? (
              <View style={styles.resultCard}>
                <Text style={styles.resultTitle}>Yorum</Text>
                <Text style={styles.resultText}>{spreadSummary}</Text>

                <View style={{ marginTop: 12 }}>
                  {spreadCards.map((s, idx) => (
                    <View key={s.role} style={[styles.spreadLine, idx > 0 && { marginTop: 10 }]}>
                      <Text style={styles.spreadRole}>
                        {spreadRoleLabels[s.role]}: {s.card.name}
                        {s.isReversed ? " (Ters)" : ""}
                      </Text>
                      <Text style={styles.spreadMsg}>{s.card.messages[tarotType]}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </ImageBackground>
        )}

        <View style={styles.panel}>
          <View style={styles.rowBetween}>
            <Text style={styles.panelTitle}>Sohbet (Günde {FREE_CHAT_DAILY_LIMIT} Ücretsiz)</Text>
            <Pressable onPress={() => void onBuyCredits()} style={styles.ghostBtn}>
              <Ionicons name="add-circle" size={16} color={moduleTheme.colors.brand} />
              <Text style={styles.ghostBtnText}>Kredi Al</Text>
            </Pressable>
          </View>

          <View style={styles.quickRow}>
            {quickPrompts.map((p) => (
              <Pressable key={p} onPress={() => void sendAiMessage(p)} style={styles.quickChip}>
                <Text style={styles.quickChipText} numberOfLines={1}>
                  {p}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.chatBox}>
            {chat.map((m) => {
              const mine = m.role === "user"
              return (
                <View key={m.id} style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleAi]}>
                  <Text style={[styles.bubbleText, mine ? styles.bubbleTextMine : styles.bubbleTextAi]}>{m.text}</Text>
                  {m.role === "assistant" ? (
                    <Pressable onPress={() => void toggleSpeak(m)} style={styles.listenBtn} hitSlop={10}>
                      <Ionicons name={speakingMessageId === m.id ? "stop" : "volume-high"} size={16} color={moduleTheme.colors.brand} />
                    </Pressable>
                  ) : null}
                </View>
              )
            })}
          </View>

          <View style={styles.chatInputRow}>
            <TextInput
              value={aiInput}
              onChangeText={setAiInput}
              placeholder="Sorunu yaz..."
              placeholderTextColor="rgba(33,18,23,0.45)"
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
            />
            <Pressable onPress={() => void sendAiMessage(aiInput)} disabled={isAiLoading} style={styles.sendBtn}>
              <Ionicons name={isAiLoading ? "hourglass" : "send"} size={18} color={tc("#FFF")} />
            </Pressable>
          </View>
        </View>

        <View style={[styles.panel, { marginBottom: 20 }]}>
          <Text style={styles.panelTitle}>Son Çekimler</Text>
          {history.length === 0 ? (
            <Text style={styles.help}>Henüz kayıt yok.</Text>
          ) : (
            history.map((h) => (
              <View key={h.id} style={styles.historyRow}>
                <Text style={styles.historyTitle} numberOfLines={1}>
                  {categoryLabels[h.type]} â€¢ {h.mode === "spread" ? "3 Kart" : "1 Kart"}
                </Text>
                <Text style={styles.historySub} numberOfLines={1}>
                  {h.cardName}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "transparent" },
  page: {
    ...moduleStyles.page,
    ...moduleStyles.content,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "600",
    color: tc("#24151C"),
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(36, 21, 28, 0.7)",
  },
  creditsPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "rgba(255,255,255,0.75)",
    borderWidth: 1,
    borderColor: "rgba(255,0,102,0.18)",
    borderRadius: 999,
  },
  creditsText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    color: tc("#24151C"),
  },
  panel: {
    backgroundColor: "rgba(255,255,255,0.72)",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.55)",
    shadowColor: tc("#000"),
    shadowOpacity: 0.10,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  panelWithImage: {
    overflow: "hidden",
  },
  panelWithImageInner: {
    borderRadius: 18,
  },
  panelWithImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(253, 245, 248, 0.80)",
  },
  panelTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "600",
    color: tc("#24151C"),
  },
  segmentContainer: {
    flexDirection: "row",
    gap: 6,
    marginTop: 10,
    padding: 6,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.55)",
    borderWidth: 1,
    borderColor: "rgba(36,21,28,0.08)",
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(36,21,28,0.08)",
    backgroundColor: "rgba(255,255,255,0.70)",
    alignItems: "center",
  },
  segmentBtnActive: {
    borderColor: "rgba(255,0,102,0.28)",
    backgroundColor: "rgba(255,0,102,0.12)",
  },
  segmentText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
    color: "rgba(36,21,28,0.75)",
  },
  segmentTextActive: {
    color: tc("#24151C"),
  },
  input: {
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(36,21,28,0.10)",
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    lineHeight: 20,
    color: tc("#24151C"),
    backgroundColor: "rgba(255,255,255,0.80)",
  },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  smallPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(255,0,102,0.10)",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,0,102,0.18)",
  },
  smallPillText: { fontSize: 12, lineHeight: 16, fontWeight: "600", color: tc("#24151C") },
  primaryBtn: {
    marginTop: 12,
    backgroundColor: moduleTheme.colors.brand,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  primaryBtnDisabled: {
    opacity: 0.55,
  },
  primaryBtnText: {
    color: tc("#FFF"),
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "600",
  },
  ghostBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,0,102,0.24)",
    backgroundColor: "rgba(255,255,255,0.65)",
  },
  ghostBtnText: { fontSize: 13, lineHeight: 16, fontWeight: "600", color: tc("#24151C") },
  help: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 18,
    color: "rgba(36,21,28,0.7)",
  },
  resultCard: {
    marginTop: 12,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(36,21,28,0.08)",
    backgroundColor: "rgba(255,255,255,0.82)",
  },
  resultHead: { marginBottom: 8 },
  resultTitle: { fontSize: 16, lineHeight: 22, fontWeight: "600", color: tc("#24151C") },
  resultSub: { marginTop: 2, fontSize: 13, lineHeight: 18, color: "rgba(36,21,28,0.7)", fontWeight: "600" },
  resultText: { marginTop: 6, fontSize: 14, lineHeight: 20, color: "rgba(36,21,28,0.86)" },
  metricsRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  metric: {
    flex: 1,
    borderRadius: 14,
    padding: 10,
    backgroundColor: "rgba(255,0,102,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,0,102,0.12)",
  },
  metricLabel: { fontSize: 12, lineHeight: 16, fontWeight: "600", color: "rgba(36,21,28,0.62)" },
  metricValue: { marginTop: 4, fontSize: 16, lineHeight: 20, fontWeight: "600", color: tc("#24151C") },
  metricValue2: { marginTop: 4, fontSize: 12, lineHeight: 16, fontWeight: "600", color: "rgba(36,21,28,0.86)" },

  cardWrap: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(36,21,28,0.10)",
    shadowColor: tc("#000"),
    shadowOpacity: 0.10,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },
  cardWrapPicked: {
    borderColor: "rgba(255,0,102,0.65)",
    shadowColor: moduleTheme.colors.brand,
    shadowOpacity: 0.24,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  cardWrapLocked: {
    opacity: 0.55,
  },
  badge: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 5,
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: moduleTheme.colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: tc("#FFF"), fontSize: 12, lineHeight: 14, fontWeight: "600" },
  flipCard: {
    width: "100%",
    height: "100%",
    backfaceVisibility: "hidden",
  },
  flipCardFront: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  cardImageInner: {
    borderRadius: 16,
  },
  cardFace: {
    flex: 1,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBack: {
    backgroundColor: tc("#24151C"),
  },
  cardBackTitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: 2,
    fontWeight: "600",
    color: "rgba(255,255,255,0.92)",
  },
  cardBackSub: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    color: "rgba(255,255,255,0.72)",
  },
  cardFront: {
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  cardImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(18,10,14,0.18)",
  },
  cardImageOverlayDark: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(18,10,14,0.42)",
  },
  cardFrontLabel: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: 10,
    padding: 8,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.84)",
    borderWidth: 1,
    borderColor: "rgba(36,21,28,0.10)",
  },
  cardFrontName: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    color: tc("#24151C"),
    textAlign: "center",
  },
  cardFrontKeywords: {
    marginTop: 6,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "600",
    color: "rgba(36,21,28,0.68)",
    textAlign: "center",
  },
  cardFrontMeta: {
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,0,102,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,0,102,0.18)",
  },
  cardFrontMetaText: { fontSize: 11, lineHeight: 14, fontWeight: "600", color: tc("#24151C") },
  spreadLine: {
    borderRadius: 14,
    padding: 10,
    backgroundColor: "rgba(36,21,28,0.04)",
    borderWidth: 1,
    borderColor: "rgba(36,21,28,0.06)",
  },
  spreadRole: { fontSize: 13, lineHeight: 18, fontWeight: "600", color: tc("#24151C") },
  spreadMsg: { marginTop: 4, fontSize: 13, lineHeight: 18, fontWeight: "600", color: "rgba(36,21,28,0.80)" },

  quickRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  quickChip: {
    maxWidth: "100%",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,0,102,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,0,102,0.16)",
  },
  quickChipText: { fontSize: 12, lineHeight: 16, fontWeight: "600", color: tc("#24151C") },
  chatBox: {
    marginTop: 12,
    gap: 8,
  },
  bubble: {
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
  },
  bubbleMine: {
    alignSelf: "flex-end",
    backgroundColor: "rgba(255,0,102,0.12)",
    borderColor: "rgba(255,0,102,0.16)",
  },
  bubbleAi: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.84)",
    borderColor: "rgba(36,21,28,0.08)",
  },
  bubbleText: { fontSize: 14, lineHeight: 20, fontWeight: "600" },
  bubbleTextMine: { color: tc("#24151C") },
  bubbleTextAi: { color: "rgba(36,21,28,0.86)" },
  listenBtn: { position: "absolute", right: 10, bottom: 8 },
  chatInputRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12 },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: moduleTheme.colors.brand,
  },
  stepsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  stepPill: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "rgba(36,21,28,0.10)",
    backgroundColor: "rgba(255,255,255,0.62)",
    alignItems: "center",
  },
  stepPillActive: {
    borderColor: "rgba(255,0,102,0.28)",
    backgroundColor: "rgba(255,0,102,0.10)",
  },
  stepPillDone: {
    borderColor: "rgba(255,0,102,0.22)",
    backgroundColor: "rgba(255,0,102,0.08)",
  },
  stepText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    color: "rgba(36,21,28,0.66)",
  },
  stepTextOn: {
    color: tc("#24151C"),
  },
  historyRow: {
    marginTop: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(36,21,28,0.06)",
  },
  historyTitle: { fontSize: 13, lineHeight: 18, fontWeight: "600", color: tc("#24151C") },
  historySub: { marginTop: 2, fontSize: 12, lineHeight: 16, fontWeight: "600", color: "rgba(36,21,28,0.68)" },
  singleImage: {
    height: 180,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 10,
    justifyContent: "flex-end",
    padding: 12,
  },
  singleImageInner: { borderRadius: 16 },
  singleImageOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(18,10,14,0.22)" },
  singleImageTitle: { color: tc("#FFF"), fontSize: 18, lineHeight: 24, fontWeight: "600" },
})















