import { Ionicons } from "@expo/vector-icons"
import { useEffect, useMemo, useState } from "react"
import {
  ImageBackground,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native"
import { t, useAppLanguage } from "../../../src/core/i18n"
import { loadMarketItems, loadMarketReceipts, saveMarketItems, saveMarketReceipts } from "../../../src/modules/shopping/storage"
import { MarketItem, MarketReceipt } from "../../../src/modules/shopping/types"
import { SectionHeader } from "../../../src/modules/shopping/ui/SectionHeader"
import { moduleStyles, moduleTheme } from "../../../src/theme/moduleStyles"
import { tc } from "../../../src/theme/tokens"

const BRAND = moduleTheme.colors.brand
const MARKET_BG_URI =
  "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80"

const parseNumber = (raw: string) => {
  const normalized = raw.replace(",", ".").replace(/[^\d.]/g, "")
  const n = Number(normalized)
  return Number.isFinite(n) ? n : 0
}

const normalizeProductName = (raw: string) => raw.trim().toLocaleLowerCase("tr-TR")
const norm = (raw: string) => raw.trim().toLocaleLowerCase("tr-TR")
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
const TR_PHRASE_FIXES: [string, string][] = [
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
const isLikelyLiquid = (name: string) => {
  const n = norm(name)
  return n.includes("su") || n.includes("süt") || n.includes("sut") || n.includes("yağ") || n.includes("yag") || n.includes("sirke")
}
const normalizeMarketUnit = (raw: string): "adet" | "g" | "ml" => {
  const u = norm(raw)
  if (u === "g" || u === "gr" || u === "gram") return "g"
  if (u === "ml" || u === "mililitre" || u === "mililiter") return "ml"
  if (u.includes("bardak")) return "ml"
  if (u.includes("yemek kaşı") || u.includes("yemek kasi")) return "g"
  if (u.includes("çay kaşı") || u.includes("cay kasi")) return "g"
  return "adet"
}
const convertLegacyAmount = (name: string, qty: number, unit: string): { qty: number; unit: "adet" | "g" | "ml" } => {
  const safeQty = Math.max(0.01, Number(qty) || 1)
  const u = norm(unit)
  if (u.includes("su barda")) return { qty: Math.max(50, Math.round(safeQty * 200)), unit: "ml" }
  if (u.includes("yemek kaşı") || u.includes("yemek kasi")) {
    if (isLikelyLiquid(name)) return { qty: Math.max(5, Math.round(safeQty * 15)), unit: "ml" }
    return { qty: Math.max(5, Math.round(safeQty * 15)), unit: "g" }
  }
  if (u.includes("çay kaşı") || u.includes("cay kasi")) {
    if (isLikelyLiquid(name)) return { qty: Math.max(1, Math.round(safeQty * 5)), unit: "ml" }
    return { qty: Math.max(1, Math.round(safeQty * 4)), unit: "g" }
  }
  return { qty: safeQty, unit: normalizeMarketUnit(unit) }
}
const formatGramAsKg = (grams: number) => {
  if (grams < 1000) return `${grams} g`
  const kg = grams / 1000
  const text = Number.isInteger(kg) ? `${kg}` : kg.toFixed(1).replace(".", ",")
  return `${text} kg`
}
const formatQtyUnit = (name: string, qty: number, unit: string) => {
  if (unit === "g") return formatGramAsKg(qty)
  if (unit !== "adet") return `${qty} ${unit}`.trim()
  const n = norm(name)
  const perPieceGram: [string, number][] = [
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

const formatTry = (value: number) => {
  try {
    return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 2 }).format(value)
  } catch {
    return `${value.toFixed(2)} TL`
  }
}

const monthKey = (iso: string) => {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  return `${y}-${m}`
}

export default function ShoppingMarketScreen() {
  const { width } = useWindowDimensions()
  const compact = width < 360
  const { language, ready } = useAppLanguage()

  const [name, setName] = useState("")
  const [qtyText, setQtyText] = useState("1")
  const [unit, setUnit] = useState("adet")
  const [totalPaidText, setTotalPaidText] = useState("")

  const [marketItems, setMarketItems] = useState<MarketItem[]>([])
  const [receipts, setReceipts] = useState<MarketReceipt[]>([])
  const [toast, setToast] = useState("")

  useEffect(() => {
    const load = async () => {
      const loaded = await loadMarketItems()
      const migrated = loaded.map((it) => {
        const conv = convertLegacyAmount(it.name, it.qty || 1, it.unit || "adet")
        return { ...it, qty: conv.qty, unit: conv.unit }
      })
      setMarketItems(migrated)
      const changed = loaded.some((it, idx) => it.qty !== migrated[idx]?.qty || `${it.unit || ""}` !== `${migrated[idx]?.unit || ""}`)
      if (changed) await saveMarketItems(migrated)
      setReceipts(await loadMarketReceipts())
    }
    void load()
  }, [])

  const notify = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(""), 2200)
  }

  const addMarketItem = async () => {
    const n = name.trim()
    if (!n) return
    const rawQty = Math.max(0.01, parseNumber(qtyText) || 1)
    const converted = convertLegacyAmount(n, rawQty, unit.trim() || "adet")
    const nextItem: MarketItem = {
      id: `${Date.now()}`,
      name: n,
      qty: converted.qty,
      unit: converted.unit,
      price: 0,
      checked: false,
      createdAt: new Date().toISOString(),
    }
    const next = [nextItem, ...marketItems]
    setMarketItems(next)
    await saveMarketItems(next)
    setName("")
    setQtyText("1")
  }

  const toggleMarketItem = async (id: string) => {
    const now = new Date().toISOString()
    const next = marketItems.map((item) =>
      item.id === id ? { ...item, checked: !item.checked, checkedAt: !item.checked ? now : undefined } : item
    )
    setMarketItems(next)
    await saveMarketItems(next)
  }

  const clearMarketList = async () => {
    setMarketItems([])
    await saveMarketItems([])
    notify(t("shoppingMarketCleared", language))
  }

  const checkedCount = useMemo(() => marketItems.filter((i) => i.checked).length, [marketItems])

  const finishShopping = async () => {
    if (checkedCount === 0) return
    const paidTotal = Math.max(0, parseNumber(totalPaidText))
    if (paidTotal <= 0) return

    const now = new Date().toISOString()
    const checkedItems = marketItems.filter((i) => i.checked)
    const receipt: MarketReceipt = {
      id: `${Date.now()}`,
      total: paidTotal,
      currency: "TRY",
      itemsCount: checkedCount,
      lines: checkedItems.map((item) => ({ name: item.name, qty: item.qty || 1 })),
      createdAt: now,
    }

    const nextReceipts = [receipt, ...receipts].slice(0, 200)
    const remaining = marketItems.filter((i) => !i.checked)
    setReceipts(nextReceipts)
    setMarketItems(remaining)
    setTotalPaidText("")
    await saveMarketReceipts(nextReceipts)
    await saveMarketItems(remaining)
    notify(t("shoppingMarketFinishedToast", language))
  }

  const currentMonthTotal = useMemo(() => {
    if (receipts.length === 0) return 0
    const key = monthKey(new Date().toISOString())
    return receipts.filter((r) => monthKey(r.createdAt) === key).reduce((sum, r) => sum + (r.total || 0), 0)
  }, [receipts])

  const currentMonthTopProducts = useMemo(() => {
    if (receipts.length === 0) return []
    const key = monthKey(new Date().toISOString())
    const stats = new Map<string, { label: string; qty: number; orders: number }>()

    receipts
      .filter((r) => monthKey(r.createdAt) === key)
      .forEach((r) => {
        ;(r.lines || []).forEach((line) => {
          const k = normalizeProductName(line.name)
          const prev = stats.get(k)
          if (!prev) {
            stats.set(k, { label: toTrTitle(line.name.trim()), qty: Math.max(0.01, line.qty || 1), orders: 1 })
          } else {
            prev.qty += Math.max(0.01, line.qty || 1)
            prev.orders += 1
            stats.set(k, prev)
          }
        })
      })

    return [...stats.values()].sort((a, b) => (b.qty !== a.qty ? b.qty - a.qty : b.orders - a.orders)).slice(0, 5)
  }, [receipts])

  const shareToWhatsApp = async () => {
    const lines = marketItems.map((i) => {
      const status = i.checked ? "[x]" : "[ ]"
      return `${status} ${toTrTitle(i.name)} (${formatQtyUnit(i.name, i.qty || 1, i.unit || "adet")})`
    })
    const message = ["WOMIO Market Listem", "", ...lines].join("\n")
    const encoded = encodeURIComponent(message)
    const appUrl = `whatsapp://send?text=${encoded}`
    const webUrl = `https://wa.me/?text=${encoded}`

    try {
      if (Platform.OS !== "web") {
        const canOpenApp = await Linking.canOpenURL(appUrl)
        if (canOpenApp) {
          await Linking.openURL(appUrl)
          return
        }
      }

      const canOpenWeb = await Linking.canOpenURL(webUrl)
      if (canOpenWeb) {
        await Linking.openURL(webUrl)
        return
      }

      await Share.share({ message })
    } catch {
      await Share.share({ message })
      notify("WhatsApp acilamadi, normal paylasim acildi.")
    }
  }

  if (!ready) return <View style={styles.container} />

  return (
    <ScrollView contentContainerStyle={[styles.container, compact && styles.containerCompact]} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <View pointerEvents="none" style={styles.decorA} />
        <View pointerEvents="none" style={styles.decorB} />

        <View style={[styles.card, compact && styles.cardCompact]}>
          <View pointerEvents="none" style={styles.cardBgWrap}>
            <ImageBackground source={{ uri: MARKET_BG_URI }} style={styles.cardBgWrap} imageStyle={styles.cardBgImage} />
          </View>
          <View pointerEvents="none" style={styles.cardBgOverlay} />
          <View pointerEvents="none" style={styles.cardAccentTop} />

          <SectionHeader
            title={t("shoppingSectionMarket", language)}
            subtitle={t("shoppingSectionMarketDesc", language)}
            compact={compact}
          />

          <View style={styles.fieldCard}>
            <Ionicons name="bag-outline" size={16} color={tc("#6B4D40")} />
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t("shoppingMarketInput", language)}
              placeholderTextColor="rgba(107,77,64,0.55)"
              style={styles.inputInField}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.fieldCard, styles.rowField]}>
              <Ionicons name="swap-vertical-outline" size={16} color={tc("#6B4D40")} />
              <TextInput
                value={qtyText}
                onChangeText={setQtyText}
                placeholder={t("shoppingMarketQty", language)}
                placeholderTextColor="rgba(107,77,64,0.55)"
                style={styles.inputInField}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={[styles.fieldCard, styles.rowField]}>
              <Ionicons name="cube-outline" size={16} color={tc("#6B4D40")} />
              <TextInput
                value={unit}
                onChangeText={setUnit}
                placeholder={t("shoppingMarketUnit", language)}
                placeholderTextColor="rgba(107,77,64,0.55)"
                style={styles.inputInField}
              />
            </View>
          </View>

          <Pressable style={styles.addBtn} onPress={() => void addMarketItem()}>
            <Ionicons name="add" size={18} color={tc("#FFF")} />
            <Text style={styles.addBtnText}>{t("shoppingMarketAdd", language)}</Text>
          </Pressable>

          <View style={styles.summaryRow}>
            <View style={styles.summaryChip}>
              <Text style={styles.summaryLabel}>{t("shoppingMarketSelectedCount", language)}</Text>
              <Text style={styles.summaryValue}>{checkedCount}</Text>
            </View>
          </View>

          <Pressable style={styles.shareBtn} onPress={() => void shareToWhatsApp()}>
            <Ionicons name="logo-whatsapp" size={18} color={tc("#1F6F4A")} />
            <Text style={styles.shareBtnText}>{t("shoppingMarketShare", language)}</Text>
          </Pressable>

          <Pressable style={styles.clearBtn} onPress={() => void clearMarketList()}>
            <Ionicons name="trash-outline" size={18} color={tc("#8A3A52")} />
            <Text style={styles.clearBtnText}>{t("shoppingMarketClear", language)}</Text>
          </Pressable>

          {marketItems.length === 0 ? (
            <Text style={styles.helper}>{t("shoppingMarketEmpty", language)}</Text>
          ) : (
            marketItems.map((item) => (
              <Pressable key={item.id} style={styles.marketRow} onPress={() => void toggleMarketItem(item.id)}>
                <View style={styles.marketIconWrap}>
                  <Ionicons
                    name={item.checked ? "checkbox" : "square-outline"}
                    size={20}
                    color={item.checked ? BRAND : "rgba(122,91,78,0.55)"}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.marketText, item.checked && styles.marketTextChecked]}>{toTrTitle(item.name)}</Text>
                  <Text style={styles.marketMeta}>{formatQtyUnit(item.name, item.qty || 1, item.unit || "adet")}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="rgba(74,52,42,0.55)" />
              </Pressable>
            ))
          )}

          <View style={styles.finishCard}>
            <Text style={styles.finishTitle}>{t("shoppingMarketFinish", language)}</Text>
            <Text style={styles.finishHint}>{t("shoppingMarketFinishHint", language)}</Text>
            <View style={styles.fieldCard}>
              <Ionicons name="cash-outline" size={16} color={tc("#6B4D40")} />
              <TextInput
                value={totalPaidText}
                onChangeText={setTotalPaidText}
                placeholder={t("shoppingMarketPaidPlaceholder", language)}
                placeholderTextColor="rgba(107,77,64,0.55)"
                style={styles.inputInField}
                keyboardType="decimal-pad"
              />
            </View>
            <Pressable
              style={[styles.finishBtn, (checkedCount === 0 || parseNumber(totalPaidText) <= 0) && styles.btnDisabled]}
              onPress={() => void finishShopping()}
              disabled={checkedCount === 0 || parseNumber(totalPaidText) <= 0}
            >
              <Ionicons name="checkmark-done" size={18} color={tc("#FFF")} />
              <Text style={styles.finishBtnText}>{t("shoppingMarketFinish", language)}</Text>
            </Pressable>
          </View>

          <View style={styles.totalWrap}>
            <Text style={styles.historyTitle}>{t("shoppingMarketMonthTotal", language)}: {formatTry(currentMonthTotal)}</Text>
            <Text style={styles.historySub}>{t("shoppingMarketReceipts", language)}</Text>

            {receipts.length === 0 ? (
              <Text style={styles.helper}>-</Text>
            ) : (
              receipts.slice(0, 8).map((r) => (
                <View key={r.id} style={styles.receiptRow}>
                  <Text style={styles.receiptLine}>{formatTry(r.total)}</Text>
                  <Text style={styles.receiptSub}>
                    {new Date(r.createdAt).toLocaleDateString("tr-TR")} - {r.itemsCount} {t("shoppingMarketItems", language)}
                  </Text>
                </View>
              ))
            )}

            <View style={styles.analysisWrap}>
              <Text style={styles.analysisTitle}>{t("shoppingMarketTopProductsTitle", language)}</Text>
              {currentMonthTopProducts.length === 0 ? (
                <Text style={styles.helper}>{t("shoppingMarketTopProductsEmpty", language)}</Text>
              ) : (
                currentMonthTopProducts.map((item, idx) => (
                  <View key={`${item.label}-${idx}`} style={styles.analysisRow}>
                    <Text style={styles.analysisName}>{`${idx + 1}. ${item.label}`}</Text>
                    <Text style={styles.analysisQty}>{`${item.qty} ${t("shoppingMarketQtyLabel", language)}`}</Text>
                  </View>
                ))
              )}
            </View>
          </View>

          {!!toast && <Text style={styles.toast}>{toast}</Text>}
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { ...moduleStyles.page },
  containerCompact: { ...moduleStyles.pageCompact },
  content: { ...moduleStyles.content, position: "relative" },
  decorA: {
    position: "absolute",
    top: -120,
    right: -120,
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: "transparent",
  },
  decorB: {
    position: "absolute",
    bottom: -140,
    left: -140,
    width: 300,
    height: 300,
    borderRadius: 999,
    backgroundColor: "transparent",
  },

  card: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: tc("#E9D8C8"),
    backgroundColor: tc("#FFFDF9"),
    padding: 14,
    overflow: "hidden",
    position: "relative",
    shadowColor: tc("#000"),
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  cardCompact: { padding: 12 },
  cardBgWrap: { ...StyleSheet.absoluteFillObject },
  cardBgImage: { opacity: 0.44 },
  cardBgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,250,255,0.22)" },
  cardAccentTop: { position: "absolute", left: 0, right: 0, top: 0, height: 4, backgroundColor: BRAND },

  fieldCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderWidth: 1.2,
    borderColor: tc("#E2D2C4"),
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  inputInField: {
    flex: 1,
    paddingVertical: 0,
    paddingHorizontal: 0,
    backgroundColor: "transparent",
    color: tc("#2F1E16"),
    fontSize: 15,
    lineHeight: 20,
    minHeight: 22,
    fontWeight: "600",
  },
  row: { flexDirection: "row", gap: 10, alignItems: "center" },
  rowField: { flex: 1 },
  addBtn: {
    marginBottom: 6,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: BRAND,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    flexDirection: "row",
    gap: 6,
    width: "100%",
    shadowColor: tc("#B1004A"),
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  addBtnText: { color: tc("#FFFFFF"), fontSize: 13, lineHeight: 17, fontWeight: "600" },

  summaryRow: { flexDirection: "row", gap: 10, alignItems: "center", marginTop: 4, marginBottom: 10 },
  summaryChip: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(233,216,200,0.95)",
    backgroundColor: "rgba(255,255,255,0.92)",
    padding: 10,
  },
  summaryLabel: { color: tc("#7A5B4E"), fontSize: 11, lineHeight: 15, fontWeight: "600" },
  summaryValue: { color: tc("#4A342A"), fontSize: 14, lineHeight: 18, fontWeight: "600", marginTop: 4 },
  finishBtn: {
    borderRadius: 14,
    backgroundColor: BRAND,
    minHeight: 46,
    paddingHorizontal: 12,
    width: "100%",
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  finishBtnText: { color: tc("#FFF"), fontSize: 12, lineHeight: 16, fontWeight: "600" },
  btnDisabled: { opacity: 0.55 },

  shareBtn: {
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(233,216,200,0.95)",
    minHeight: 44,
    paddingHorizontal: 12,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  shareBtnText: { color: tc("#2E6A53"), fontSize: 13, lineHeight: 17, fontWeight: "600" },
  clearBtn: {
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(233,216,200,0.95)",
    minHeight: 44,
    paddingHorizontal: 12,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  clearBtnText: { color: tc("#8A3A52"), fontSize: 13, lineHeight: 17, fontWeight: "600" },

  helper: { marginTop: 10, color: tc("#7A5B4E"), fontSize: 14, lineHeight: 21, fontWeight: "600" },
  marketRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(233,216,200,0.95)",
    borderRadius: 16,
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  marketIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.82)",
    borderWidth: 1,
    borderColor: "rgba(61,42,79,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  marketText: { color: tc("#5F463A"), fontSize: 14, lineHeight: 20, fontWeight: "600" },
  marketTextChecked: { textDecorationLine: "line-through", color: "rgba(122,91,78,0.65)" },
  marketMeta: { marginTop: 2, color: tc("#7A5B4E"), fontSize: 12, lineHeight: 16, fontWeight: "600" },

  toast: { marginTop: 10, color: tc("#7A2F4D"), fontSize: 13, lineHeight: 18, fontWeight: "600" },
  finishCard: {
    marginTop: 10,
    marginBottom: 2,
    borderWidth: 1,
    borderColor: "rgba(233,216,200,0.95)",
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.92)",
    padding: 12,
  },
  finishTitle: { color: tc("#4A342A"), fontSize: 14, lineHeight: 18, fontWeight: "600" },
  finishHint: { marginTop: 4, marginBottom: 8, color: tc("#7A5B4E"), fontSize: 12, lineHeight: 17, fontWeight: "600" },

  totalWrap: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(233,216,200,0.95)",
  },
  historyTitle: { color: tc("#4A342A"), fontSize: 16, lineHeight: 22, fontWeight: "600" },
  historySub: { marginTop: 4, color: tc("#7A5B4E"), fontSize: 13, lineHeight: 18, fontWeight: "600" },
  receiptRow: {
    marginTop: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(233,216,200,0.95)",
    backgroundColor: "rgba(255,255,255,0.92)",
    padding: 12,
  },
  receiptLine: { color: tc("#4A342A"), fontSize: 14, lineHeight: 18, fontWeight: "600" },
  receiptSub: { marginTop: 4, color: tc("#7A5B4E"), fontSize: 12, lineHeight: 16, fontWeight: "600" },
  analysisWrap: {
    marginTop: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(233,216,200,0.95)",
    backgroundColor: "rgba(255,255,255,0.92)",
    padding: 12,
  },
  analysisTitle: { color: tc("#4A342A"), fontSize: 14, lineHeight: 18, fontWeight: "600" },
  analysisRow: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(233,216,200,0.75)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: tc("#FFFCF7"),
  },
  analysisName: { flex: 1, color: tc("#5F463A"), fontSize: 13, lineHeight: 17, fontWeight: "600", marginRight: 8 },
  analysisQty: { color: tc("#7A5B4E"), fontSize: 12, lineHeight: 16, fontWeight: "600" },
})














