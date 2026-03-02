import AsyncStorage from "@react-native-async-storage/async-storage"
import { Ionicons } from "@expo/vector-icons"
import { useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native"
import { t, useAppLanguage } from "@/src/core/i18n"
import { SectionHeader } from "@/src/modules/shopping/ui/SectionHeader"
import { AdSlot } from "@/src/components/monetization/AdSlot"
import { moduleStyles, moduleTheme } from "@/src/theme/moduleStyles"
import { ModuleButton, ModuleInput } from "@/src/components/ui/ModulePrimitives"
import { tc } from "@/src/theme/tokens"

const BRAND = moduleTheme.colors.brand
const BG = "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1200&q=80"
const FAVORITES_KEY = "shoppingCommunityV3:compareFavoritesV1"
const ALARMS_KEY = "shoppingCommunityV3:compareAlarmsV1"
const API_BASE = `${process.env.EXPO_PUBLIC_API_BASE_URL || "https://womio.net/api"}`.trim().replace(/\/+$/, "")

type ComparePrice = { store: string; price: number; oldPrice?: number; delivery?: string; url?: string }
type CompareProduct = { id: string; name: string; image?: string; rating?: number; reviewCount?: number; prices: ComparePrice[] }
type Enriched = CompareProduct & { best?: ComparePrice }

const deriveSearchEndpoints = () => {
  const fromEnv = [
    process.env.EXPO_PUBLIC_SHOPPING_SEARCH_PROXY,
    process.env.EXPO_PUBLIC_SHOPPING_YANDEX_PROXY?.replace("/shopping/yandex", "/shopping/search"),
    process.env.EXPO_PUBLIC_SHOPPING_AFFILIATE_PROXY?.replace("/shopping/affiliate", "/shopping/search"),
    `${API_BASE}/shopping/search`,
  ]
  return [...new Set(fromEnv.filter(Boolean).map((u) => `${u}`))]
}

const formatTry = (value: number) => {
  try {
    return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(value)
  } catch {
    return `${Math.round(value)} TL`
  }
}

const parseNumber = (raw: string) => {
  const normalized = raw.replace(",", ".").replace(/[^\d.]/g, "")
  const n = Number(normalized)
  return Number.isFinite(n) ? n : 0
}

export default function ShoppingCompareScreen() {
  const { width } = useWindowDimensions()
  const useTwoColumns = false
  const isDesktop = useTwoColumns
  const compact = width < 360
  const contentMaxWidth = 520
  const { language, ready } = useAppLanguage()

  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState<CompareProduct[]>([])
  const [error, setError] = useState("")
  const [info, setInfo] = useState("")
  const [offline, setOffline] = useState(false)

  const [maxPrice, setMaxPrice] = useState<number | null>(null)
  const [minRating, setMinRating] = useState<number | null>(null)
  const [sortBy, setSortBy] = useState<"best" | "low" | "high">("best")
  const [onlyFav, setOnlyFav] = useState(false)

  const [favorites, setFavorites] = useState<Record<string, boolean>>({})
  const [alarms, setAlarms] = useState<Record<string, number>>({})
  const [selected, setSelected] = useState<Enriched | null>(null)
  const [alarmInput, setAlarmInput] = useState("")

  const cardWidth = useTwoColumns ? "48.7%" : "100%"

  useEffect(() => {
    const load = async () => {
      try {
        const [favRaw, alarmRaw] = await Promise.all([AsyncStorage.getItem(FAVORITES_KEY), AsyncStorage.getItem(ALARMS_KEY)])
        setFavorites(favRaw ? JSON.parse(favRaw) : {})
        setAlarms(alarmRaw ? JSON.parse(alarmRaw) : {})
      } catch {
        setFavorites({})
        setAlarms({})
      }
    }
    void load()
  }, [])

  useEffect(() => { void AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites)) }, [favorites])
  useEffect(() => { void AsyncStorage.setItem(ALARMS_KEY, JSON.stringify(alarms)) }, [alarms])

  const enriched: Enriched[] = useMemo(() => {
    return products.map((p) => ({ ...p, prices: [...p.prices].sort((a, b) => a.price - b.price), best: [...p.prices].sort((a, b) => a.price - b.price)[0] }))
  }, [products])

  const visible = useMemo(() => {
    let list = [...enriched]
    if (onlyFav) list = list.filter((p) => !!favorites[p.id])
    if (maxPrice) list = list.filter((p) => (p.best?.price ?? Number.MAX_SAFE_INTEGER) <= maxPrice)
    if (minRating) list = list.filter((p) => (p.rating ?? 0) >= minRating)
    if (sortBy === "low") list.sort((a, b) => (a.best?.price ?? Number.MAX_SAFE_INTEGER) - (b.best?.price ?? Number.MAX_SAFE_INTEGER))
    if (sortBy === "high") list.sort((a, b) => (b.best?.price ?? 0) - (a.best?.price ?? 0))
    if (sortBy === "best") list.sort((a, b) => (favorites[b.id] ? 1 : 0) - (favorites[a.id] ? 1 : 0))
    return list
  }, [enriched, onlyFav, favorites, maxPrice, minRating, sortBy])

  const activeFilterCount = (maxPrice ? 1 : 0) + (minRating ? 1 : 0) + (onlyFav ? 1 : 0)

  const triggeredAlarms = useMemo(() => {
    return enriched.filter((p) => {
      const alarm = alarms[p.id]
      return !!alarm && !!p.best && p.best.price <= alarm
    })
  }, [enriched, alarms])

  const search = async () => {
    const q = query.trim()
    if (!q) return
    setLoading(true)
    setError("")
    setInfo("")
    try {
      let ok = false
      let lastError = ""
      for (const endpoint of deriveSearchEndpoints()) {
        try {
          const r = await fetch(`${endpoint}?q=${encodeURIComponent(q)}`)
          if (!r.ok) { lastError = `HTTP ${r.status}`; continue }
          const data = await r.json()
          const list = Array.isArray(data?.products) ? data.products : []
          setProducts(list)
          if (list.length === 0) setError(t("shoppingCompareNoResult", language))
          ok = true
          break
        } catch (e) {
          lastError = `${e}`
        }
      }
      if (!ok) throw new Error(lastError || "all endpoints failed")
      setOffline(false)
    } catch {
      setProducts([])
      setError(t("shoppingCompareFetchError", language))
      setOffline(true)
    } finally {
      setLoading(false)
    }
  }

  const openOffer = async (url?: string) => {
    if (!url) return
    const target = `${url}`
    if (await Linking.canOpenURL(target)) await Linking.openURL(target)
  }

  const toggleFavorite = (id: string) => setFavorites((p) => ({ ...p, [id]: !p[id] }))

  const openDetails = (p: Enriched) => {
    setSelected(p)
    setAlarmInput(alarms[p.id] ? String(alarms[p.id]) : "")
  }

  const saveAlarm = () => {
    if (!selected) return
    const amount = Math.max(0, parseNumber(alarmInput))
    if (amount <= 0) return
    setAlarms((p) => ({ ...p, [selected.id]: amount }))
    setInfo(t("shoppingCompareAlarmSaved", language))
  }

  const clearAlarm = () => {
    if (!selected) return
    setAlarms((p) => {
      const n = { ...p }
      delete n[selected.id]
      return n
    })
    setAlarmInput("")
  }

  const resetFilters = () => {
    setMaxPrice(null)
    setMinRating(null)
    setOnlyFav(false)
    setSortBy("best")
  }

  if (!ready) return <View style={styles.container} />

  return (
    <ScrollView contentContainerStyle={[styles.container, compact && styles.containerCompact]} showsVerticalScrollIndicator={false}>
      <View style={[styles.content, { maxWidth: contentMaxWidth }]}>
        <View pointerEvents="none" style={styles.decorA} />
        <View pointerEvents="none" style={styles.decorB} />

        <View style={[styles.card, compact && styles.cardCompact]}>
          <View pointerEvents="none" style={styles.cardBgWrap}><ImageBackground source={{ uri: BG }} style={styles.cardBgWrap} imageStyle={styles.cardBgImage} /></View>
          <View pointerEvents="none" style={styles.cardBgOverlay} />
          <View pointerEvents="none" style={styles.cardAccentTop} />

          <SectionHeader title={t("shoppingSectionCompare", language)} subtitle={t("shoppingCompareLiveSubtitle", language)} compact={compact} />

          <View style={styles.kpiRow}>
            <View style={[styles.kpiCard, styles.kpiCardPrimary]}>
              <Ionicons name="sparkles-outline" size={13} color={tc("#FFFFFF")} />
              <Text style={styles.kpiValue}>{visible.length}</Text>
              <Text style={styles.kpiLabel}>Ürün</Text>
            </View>
            <View style={styles.kpiCard}>
              <Ionicons name="options-outline" size={13} color={tc("#7A5B4E")} />
              <Text style={styles.kpiValueMuted}>{activeFilterCount}</Text>
              <Text style={styles.kpiLabelMuted}>Filtre</Text>
            </View>
            <View style={styles.kpiCard}>
              <Ionicons name="notifications-outline" size={13} color={tc("#7A5B4E")} />
              <Text style={styles.kpiValueMuted}>{triggeredAlarms.length}</Text>
              <Text style={styles.kpiLabelMuted}>Alarm</Text>
            </View>
          </View>

          <View style={styles.searchShell}>
            <View style={styles.searchField}><Ionicons name="search-outline" size={16} color={tc("#6B4D40")} /><ModuleInput value={query} onChangeText={setQuery} placeholder={t("shoppingCompareSearchPlaceholder", language)} placeholderTextColor="rgba(107,77,64,0.55)" style={styles.searchInput} returnKeyType="search" onSubmitEditing={() => void search()} /></View>
            {loading ? (
              <View style={[styles.searchBtn, styles.btnDisabled]}><ActivityIndicator size="small" color={tc("#FFF")} /></View>
            ) : (
              <ModuleButton text={t("shoppingCompareSearchButton", language)} onPress={() => void search()} style={styles.searchBtn} />
            )}
            <View style={styles.quickInfoRow}><View style={styles.quickInfoChip}><Ionicons name="sparkles-outline" size={12} color={tc("#7A5B4E")} /><Text style={styles.quickInfoText}>{`${visible.length} ürün`}</Text></View><View style={styles.quickInfoChip}><Ionicons name="pricetags-outline" size={12} color={tc("#7A5B4E")} /><Text style={styles.quickInfoText}>Canlı fiyat akışı</Text></View></View>
          </View>

          <AdSlot
            placementKey="shoppingCompare"
            compact={compact}
            title="Google Alışveriş Reklamı"
            subtitle="Arama niyetine göre sponsorlu ürünler burada gösterilecek"
          />

          {!!error && <Text style={styles.errorText}>{error}</Text>}
          {!!info && <Text style={styles.infoText}>{info}</Text>}

          {triggeredAlarms.length > 0 && (
            <View style={styles.triggeredCard}>
              <View style={styles.triggeredHead}>
                <Ionicons name="notifications" size={16} color={tc("#FFF")} />
                <Text style={styles.triggeredTitle}>{t("shoppingCompareTriggeredTitle", language)}</Text>
              </View>
              {triggeredAlarms.slice(0, 4).map((p) => (
                <View key={`alarm-${p.id}`} style={styles.triggeredRow}>
                  <Text numberOfLines={1} style={styles.triggeredName}>{p.name}</Text>
                  <Text style={styles.triggeredPrice}>{formatTry(p.best?.price || 0)}</Text>
                </View>
              ))}
            </View>
          )}

          {offline && (
            <View style={styles.offlineCard}>
              <View style={styles.offlineHead}><Ionicons name="alert-circle-outline" size={18} color={tc("#8A3A52")} /><Text style={styles.offlineTitle}>{t("shoppingCompareBackendTitle", language)}</Text></View>
              <Text style={styles.offlineText}>{t("shoppingCompareBackendStep1", language)}</Text>
              <Text style={styles.offlineCmd}>cd c:\Users\Kayhan\Desktop\womio\backend</Text>
              <Text style={styles.offlineCmd}>npm start</Text>
              <Text style={styles.offlineText}>{t("shoppingCompareBackendStep2", language)}</Text>
            </View>
          )}

          <View style={styles.layoutRow}>
            {isDesktop && (
              <View style={styles.sidePanel}>
                <Text style={styles.sideTitle}>{t("shoppingCompareFilterTitle", language)}</Text>
                <Text style={styles.sideSubTitle}>{t("shoppingCompareFilterPrice", language)}</Text>
                <View style={styles.sideBlock}>{[2500, 5000, 10000].map((limit) => { const active = maxPrice === limit; return <Pressable key={limit} style={[styles.filterPill, active && styles.filterPillActive]} onPress={() => setMaxPrice(active ? null : limit)}><Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>{`<= ${formatTry(limit)}`}</Text></Pressable> })}</View>
                <Text style={styles.sideSubTitle}>{t("shoppingCompareFilterRating", language)}</Text>
                <View style={styles.sideBlock}>{[4, 4.5].map((r) => { const active = minRating === r; return <Pressable key={r} style={[styles.filterPill, active && styles.filterPillActive]} onPress={() => setMinRating(active ? null : r)}><Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>{`${r}+`}</Text></Pressable> })}</View>
                <Text style={styles.sideSubTitle}>{t("shoppingCompareFilterFavorites", language)}</Text>
                <Pressable style={[styles.filterPill, onlyFav && styles.filterPillActive]} onPress={() => setOnlyFav((v) => !v)}><Text style={[styles.filterPillText, onlyFav && styles.filterPillTextActive]}>{t("shoppingCompareOnlyFavorites", language)}</Text></Pressable>
              </View>
            )}

            <View style={styles.mainArea}>
              {!isDesktop && (
                <>
                  <View style={styles.chipsRow}>{[2500, 5000, 10000].map((limit) => { const active = maxPrice === limit; return <Pressable key={limit} style={[styles.chip, active && styles.chipActive]} onPress={() => setMaxPrice(active ? null : limit)}><Text style={[styles.chipText, active && styles.chipTextActive]}>{`<= ${formatTry(limit)}`}</Text></Pressable> })}</View>
                  <View style={styles.chipsRow}>{[4, 4.5].map((r) => { const active = minRating === r; return <Pressable key={r} style={[styles.chip, active && styles.chipActive]} onPress={() => setMinRating(active ? null : r)}><Text style={[styles.chipText, active && styles.chipTextActive]}>{`${r}+`}</Text></Pressable> })}<Pressable style={[styles.chip, onlyFav && styles.chipActive]} onPress={() => setOnlyFav((v) => !v)}><Text style={[styles.chipText, onlyFav && styles.chipTextActive]}>{t("shoppingCompareOnlyFavorites", language)}</Text></Pressable></View>
                </>
              )}

              <View style={styles.chipsRow}>{[{ key: "best", label: t("shoppingCompareSortBest", language) }, { key: "low", label: t("shoppingCompareSortLow", language) }, { key: "high", label: t("shoppingCompareSortHigh", language) }].map((o) => { const active = sortBy === o.key; return <Pressable key={o.key} style={[styles.chip, active && styles.chipActive]} onPress={() => setSortBy(o.key as "best" | "low" | "high")}><Text style={[styles.chipText, active && styles.chipTextActive]}>{o.label}</Text></Pressable> })}</View>

              <View style={styles.resultsHead}>
                <Text style={styles.resultsTitle}>{t("shoppingCompareResultsTitle", language)} ({visible.length})</Text>
                {activeFilterCount > 0 && (
                  <Pressable style={styles.resetBtn} onPress={resetFilters}>
                    <Ionicons name="refresh-outline" size={12} color={tc("#7A5B4E")} />
                    <Text style={styles.resetBtnText}>{t("shoppingCompareResetFilters", language)}</Text>
                  </Pressable>
                )}
              </View>

              <View style={[styles.grid, useTwoColumns && styles.gridDesktop]}>
                {loading && Array.from({ length: width >= 760 ? 4 : 3 }).map((_, i) => (
                  <View key={`skeleton-${i}`} style={[styles.resultCard, styles.skeletonCard, { width: cardWidth }]}>
                    <View style={styles.skeletonImage} />
                    <View style={styles.skeletonLineLg} />
                    <View style={styles.skeletonLineMd} />
                    <View style={styles.skeletonPill} />
                    <View style={styles.skeletonLineLg} />
                    <View style={styles.skeletonRow}>
                      <View style={styles.skeletonBtn} />
                      <View style={styles.skeletonBtnPrimary} />
                    </View>
                  </View>
                ))}

                {!loading && visible.length === 0 && !error && (
                  <View style={styles.emptyCard}>
                    <View style={styles.emptyIconWrap}>
                      <Ionicons name="sparkles-outline" size={20} color={tc("#FFFFFF")} />
                    </View>
                    <Text style={styles.emptyTitle}>{t("shoppingCompareNoResult", language)}</Text>
                    <Text style={styles.emptyText}>
                      {t("shoppingCompareSearchPlaceholder", language)}
                    </Text>
                  </View>
                )}

                {!loading && visible.map((p) => {
                  const alarm = alarms[p.id]
                  const alarmHit = !!alarm && !!p.best && p.best.price <= alarm
                  return (
                    <View key={p.id} style={[styles.resultCard, { width: cardWidth }]}>
                      <View pointerEvents="none" style={styles.resultCardGlow} />
                      <Pressable style={styles.imageTopAction} onPress={() => toggleFavorite(p.id)}><Ionicons name={favorites[p.id] ? "heart" : "heart-outline"} size={14} color={favorites[p.id] ? BRAND : tc("#6E4C3A")} /></Pressable>
                      {p.image ? <Image source={{ uri: p.image }} style={styles.productImage} resizeMode="cover" /> : <View style={styles.productImagePlaceholder}><Ionicons name="image-outline" size={20} color={tc("#7A5B4E")} /></View>}
                      <Text numberOfLines={2} style={styles.productName}>{p.name}</Text>
                      <View style={styles.ratingRow}><Ionicons name="star" size={13} color={tc("#F5A623")} /><Text style={styles.ratingText}>{p.rating ? p.rating.toFixed(1) : "-"}</Text><Text style={styles.reviewText}>{p.reviewCount ? `(${p.reviewCount})` : ""}</Text></View>
                      {p.best && <>
                        <View style={styles.bestWrap}><View style={styles.bestBadge}><Ionicons name="trophy-outline" size={12} color={tc("#FFF")} /><Text style={styles.bestBadgeText}>{t("shoppingCompareBestPrice", language)}</Text></View><Text style={styles.bestPrice}>{formatTry(p.best.price)}</Text></View>
                        {!!alarm && <View style={[styles.alarmChip, alarmHit && styles.alarmChipTriggered]}><Ionicons name={alarmHit ? "notifications" : "notifications-outline"} size={11} color={alarmHit ? tc("#FFF") : tc("#7A5B4E")} /><Text style={[styles.alarmChipText, alarmHit && styles.alarmChipTextTriggered]}>{alarmHit ? t("shoppingCompareAlarmTriggered", language) : `${t("shoppingComparePriceAlarm", language)}: ${formatTry(alarm)}`}</Text></View>}
                        <View style={styles.offerRow}><View style={{ flex: 1 }}><Text numberOfLines={1} style={styles.offerStore}>{p.best.store}</Text><Text numberOfLines={1} style={styles.offerMeta}>{p.best.delivery || "-"}</Text></View><View style={styles.offerPriceWrap}>{!!p.best.oldPrice && p.best.oldPrice > p.best.price && <Text style={styles.offerOldPrice}>{formatTry(p.best.oldPrice)}</Text>}<Text style={styles.offerPrice}>{formatTry(p.best.price)}</Text></View></View>
                        <View style={styles.cardActions}><Pressable style={styles.secondaryBtn} onPress={() => openDetails(p)}><Ionicons name="information-circle-outline" size={13} color={tc("#5F463A")} /><Text style={styles.secondaryBtnText}>{t("shoppingCompareOpenDetails", language)}</Text></Pressable><Pressable style={styles.gotoBtn} onPress={() => void openOffer(p.best?.url)}><Ionicons name="open-outline" size={14} color={tc("#FFF")} /><Text style={styles.gotoBtnText}>{t("shoppingCompareGoStore", language)}</Text></Pressable></View>
                      </>}
                    </View>
                  )
                })}
              </View>
            </View>
          </View>
        </View>
      </View>

      <Modal visible={!!selected} animationType="slide" transparent onRequestClose={() => setSelected(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {selected && <>
              <View style={styles.modalHead}><Text style={styles.modalTitle}>{t("shoppingCompareDetailsTitle", language)}</Text><Pressable onPress={() => setSelected(null)}><Ionicons name="close" size={20} color={tc("#5F463A")} /></Pressable></View>
              {!!selected.image && <Image source={{ uri: selected.image }} style={styles.modalImage} resizeMode="cover" />}
              <Text style={styles.modalProductName}>{selected.name}</Text>
              <View style={styles.modalAlarmRow}>
                <Text style={styles.modalSectionTitle}>{t("shoppingComparePriceAlarm", language)}</Text>
                <TextInput value={alarmInput} onChangeText={setAlarmInput} keyboardType="decimal-pad" placeholder={t("shoppingCompareAlarmPlaceholder", language)} placeholderTextColor="rgba(107,77,64,0.55)" style={styles.modalInput} />
                <View style={styles.modalBtns}><Pressable style={styles.modalPrimaryBtn} onPress={saveAlarm}><Text style={styles.modalPrimaryBtnText}>{t("shoppingCompareAlarmSave", language)}</Text></Pressable><Pressable style={styles.modalGhostBtn} onPress={clearAlarm}><Text style={styles.modalGhostBtnText}>{t("shoppingCompareAlarmClear", language)}</Text></Pressable></View>
              </View>
              <Text style={styles.modalSectionTitle}>{t("shoppingCompareOffersTitle", language)}</Text>
              <ScrollView style={{ maxHeight: 240 }}>
                {selected.prices.length === 0 ? <Text style={styles.modalEmpty}>{t("shoppingCompareNoOffers", language)}</Text> : [...selected.prices].sort((a, b) => a.price - b.price).map((o, i) => <View key={`${selected.id}-${o.store}-${i}`} style={styles.modalOfferRow}><View style={{ flex: 1 }}><Text style={styles.modalOfferStore}>{o.store}</Text><Text style={styles.modalOfferMeta}>{o.delivery || "-"}</Text></View><Text style={styles.modalOfferPrice}>{formatTry(o.price)}</Text><Pressable style={styles.modalOpenBtn} onPress={() => void openOffer(o.url)}><Ionicons name="open-outline" size={14} color={tc("#FFF")} /></Pressable></View>)}
              </ScrollView>
            </>}
          </View>
        </View>
      </Modal>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { ...moduleStyles.page },
  containerCompact: { ...moduleStyles.pageCompact },
  content: { width: "100%", alignSelf: "center", position: "relative" },
  decorA: { position: "absolute", top: -120, right: -120, width: 260, height: 260, borderRadius: 999, backgroundColor: "transparent" },
  decorB: { position: "absolute", bottom: -140, left: -140, width: 300, height: 300, borderRadius: 999, backgroundColor: "transparent" },
  card: {
    marginTop: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.72)",
    backgroundColor: "rgba(255,253,249,0.92)",
    padding: 15,
    overflow: "hidden",
    position: "relative",
    shadowColor: "#401f3b",
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  cardCompact: { padding: 12 },
  cardBgWrap: { ...StyleSheet.absoluteFillObject },
  cardBgImage: { opacity: 0.34 },
  cardBgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(251,243,248,0.34)" },
  cardAccentTop: { position: "absolute", left: 0, right: 0, top: 0, height: 6, backgroundColor: BRAND },
  kpiRow: { marginTop: 8, marginBottom: 10, flexDirection: "row", gap: 8 },
  kpiCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(233,216,200,0.95)",
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 58,
  },
  kpiCardPrimary: { backgroundColor: BRAND, borderColor: "rgba(255,255,255,0.35)" },
  kpiValue: { marginTop: 2, color: tc("#FFFFFF"), fontSize: 16, lineHeight: 20, fontWeight: "700" },
  kpiLabel: { color: "rgba(255,255,255,0.92)", fontSize: 10, lineHeight: 13, fontWeight: "600" },
  kpiValueMuted: { marginTop: 2, color: tc("#4A342A"), fontSize: 16, lineHeight: 20, fontWeight: "700" },
  kpiLabelMuted: { color: tc("#7A5B4E"), fontSize: 10, lineHeight: 13, fontWeight: "600" },
  searchShell: {
    marginTop: 2,
    marginBottom: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(233,216,200,0.95)",
    backgroundColor: "rgba(255,255,255,0.76)",
    padding: 10,
  },
  searchField: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "rgba(255,255,255,0.98)", borderWidth: 1.2, borderColor: tc("#E2D2C4"), borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8 },
  searchInput: { flex: 1, color: tc("#2F1E16"), fontSize: 14, lineHeight: 18, minHeight: 22, fontWeight: "600" },
  searchBtn: { minHeight: 44, borderRadius: 14, backgroundColor: BRAND, alignItems: "center", justifyContent: "center", paddingHorizontal: 14 },
  searchBtnText: { color: tc("#FFFFFF"), fontSize: 13, lineHeight: 17, fontWeight: "600" },
  btnDisabled: { opacity: 0.6 },
  quickInfoRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 6 },
  quickInfoChip: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 999, borderWidth: 1, borderColor: "rgba(233,216,200,0.95)", backgroundColor: "rgba(255,255,255,0.95)", paddingHorizontal: 8, paddingVertical: 4 },
  quickInfoText: { color: tc("#7A5B4E"), fontSize: 10, lineHeight: 13, fontWeight: "600" },
  errorText: { color: tc("#8A3A52"), fontSize: 13, lineHeight: 18, fontWeight: "600", marginBottom: 8 },
  infoText: { color: tc("#2D7A56"), fontSize: 12, lineHeight: 16, fontWeight: "600", marginBottom: 8 },
  triggeredCard: {
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,0,102,0.35)",
    backgroundColor: "rgba(255,0,102,0.10)",
    padding: 10,
  },
  triggeredHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 10,
    backgroundColor: BRAND,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 8,
  },
  triggeredTitle: { color: tc("#FFF"), fontSize: 11, lineHeight: 14, fontWeight: "600" },
  triggeredRow: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(233,216,200,0.95)",
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  triggeredName: { flex: 1, color: tc("#5F463A"), fontSize: 12, lineHeight: 16, fontWeight: "600" },
  triggeredPrice: { color: tc("#4A342A"), fontSize: 12, lineHeight: 16, fontWeight: "600" },
  offlineCard: { marginBottom: 10, borderRadius: 14, borderWidth: 1, borderColor: "rgba(138,58,82,0.35)", backgroundColor: "rgba(255,245,249,0.95)", padding: 10 },
  offlineHead: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  offlineTitle: { color: tc("#8A3A52"), fontSize: 13, lineHeight: 17, fontWeight: "600" },
  offlineText: { color: tc("#7A5B4E"), fontSize: 12, lineHeight: 17, fontWeight: "600", marginTop: 2 },
  offlineCmd: { marginTop: 4, borderRadius: 10, borderWidth: 1, borderColor: "rgba(233,216,200,0.95)", backgroundColor: tc("#FFF"), paddingHorizontal: 10, paddingVertical: 6, color: tc("#4A342A"), fontSize: 12, lineHeight: 16, fontWeight: "600" },
  layoutRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  sidePanel: {
    width: 220,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(233,216,200,0.95)",
    backgroundColor: "rgba(255,255,255,0.88)",
    padding: 12,
    shadowColor: "#5A1E3F",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  sideTitle: { color: tc("#4A342A"), fontSize: 14, lineHeight: 18, fontWeight: "600" },
  sideSubTitle: { marginTop: 10, marginBottom: 6, color: tc("#7A5B4E"), fontSize: 12, lineHeight: 16, fontWeight: "600" },
  sideBlock: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  filterPill: { borderRadius: 999, borderWidth: 1, borderColor: "rgba(233,216,200,0.95)", backgroundColor: "rgba(255,255,255,0.95)", paddingHorizontal: 9, paddingVertical: 6 },
  filterPillActive: { borderColor: BRAND, backgroundColor: BRAND },
  filterPillText: { color: tc("#7A5B4E"), fontSize: 11, lineHeight: 14, fontWeight: "600" },
  filterPillTextActive: { color: tc("#FFF") },
  mainArea: { flex: 1 },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(233,216,200,0.95)",
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipActive: { backgroundColor: BRAND, borderColor: BRAND },
  chipText: { color: tc("#7A5B4E"), fontSize: 11, lineHeight: 14, fontWeight: "600" },
  chipTextActive: { color: tc("#FFF") },
  resultsHead: {
    marginTop: 2,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  resultsTitle: { color: tc("#5F463A"), fontSize: 13, lineHeight: 17, fontWeight: "600" },
  resetBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(233,216,200,0.95)",
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 9,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  resetBtnText: { color: tc("#7A5B4E"), fontSize: 10, lineHeight: 13, fontWeight: "600" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  gridDesktop: { justifyContent: "space-between" },
  resultCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(233,216,200,0.95)",
    backgroundColor: "rgba(255,255,255,0.94)",
    padding: 12,
    position: "relative",
    overflow: "hidden",
    shadowColor: "#401f3b",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  resultCardGlow: {
    position: "absolute",
    top: -34,
    right: -28,
    width: 110,
    height: 110,
    borderRadius: 999,
    backgroundColor: "rgba(255,0,102,0.09)",
  },
  skeletonCard: { gap: 9 },
  skeletonImage: { width: "100%", height: 130, borderRadius: 12, backgroundColor: "rgba(233,216,200,0.55)" },
  skeletonLineLg: { width: "84%", height: 11, borderRadius: 999, backgroundColor: "rgba(233,216,200,0.62)" },
  skeletonLineMd: { width: "56%", height: 10, borderRadius: 999, backgroundColor: "rgba(233,216,200,0.48)" },
  skeletonPill: { width: "40%", height: 20, borderRadius: 999, backgroundColor: "rgba(255,0,102,0.18)" },
  skeletonRow: { marginTop: 6, flexDirection: "row", gap: 6 },
  skeletonBtn: { flex: 1, height: 36, borderRadius: 10, backgroundColor: "rgba(233,216,200,0.62)" },
  skeletonBtnPrimary: { flex: 1, height: 36, borderRadius: 10, backgroundColor: "rgba(255,0,102,0.28)" },
  emptyCard: {
    width: "100%",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(233,216,200,0.95)",
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 14,
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BRAND,
    marginBottom: 10,
  },
  emptyTitle: { color: tc("#4A342A"), fontSize: 14, lineHeight: 18, fontWeight: "700" },
  emptyText: { marginTop: 4, color: tc("#7A5B4E"), fontSize: 12, lineHeight: 16, fontWeight: "600", textAlign: "center" },
  imageTopAction: {
    position: "absolute",
    right: 16,
    top: 16,
    zIndex: 3,
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderWidth: 1,
    borderColor: "rgba(233,216,200,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  productImage: { width: "100%", height: 130, borderRadius: 12, backgroundColor: tc("#EFE7E1"), marginBottom: 8 },
  productImagePlaceholder: { width: "100%", height: 130, borderRadius: 12, backgroundColor: tc("#EFE7E1"), marginBottom: 8, alignItems: "center", justifyContent: "center" },
  productName: { color: tc("#3A281F"), fontSize: 13, lineHeight: 18, fontWeight: "600", minHeight: 36 },
  ratingRow: { marginTop: 5, flexDirection: "row", alignItems: "center", gap: 4 },
  ratingText: { color: tc("#5F463A"), fontSize: 11, lineHeight: 14, fontWeight: "600" },
  reviewText: { color: tc("#7A5B4E"), fontSize: 10, lineHeight: 13, fontWeight: "600" },
  bestWrap: { marginTop: 6, marginBottom: 6, gap: 5 },
  bestBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: BRAND, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  bestBadgeText: { color: tc("#FFF"), fontSize: 10, lineHeight: 13, fontWeight: "600" },
  bestPrice: { color: tc("#3A281F"), fontSize: 17, lineHeight: 22, fontWeight: "600" },
  alarmChip: { marginBottom: 6, borderRadius: 999, borderWidth: 1, borderColor: "rgba(233,216,200,0.95)", backgroundColor: "rgba(255,255,255,0.95)", alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 4 },
  alarmChipTriggered: { borderColor: BRAND, backgroundColor: BRAND },
  alarmChipText: { color: tc("#7A5B4E"), fontSize: 10, lineHeight: 13, fontWeight: "600" },
  alarmChipTextTriggered: { color: tc("#FFF") },
  offerRow: { marginTop: 4, borderRadius: 12, borderWidth: 1, borderColor: "rgba(233,216,200,0.9)", backgroundColor: tc("#FFFCF7"), paddingHorizontal: 10, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 6 },
  offerStore: { color: tc("#5F463A"), fontSize: 11, lineHeight: 14, fontWeight: "600" },
  offerMeta: { color: tc("#7A5B4E"), fontSize: 10, lineHeight: 13, fontWeight: "600", marginTop: 1 },
  offerPriceWrap: { alignItems: "flex-end" },
  offerOldPrice: { color: "rgba(122,91,78,0.65)", fontSize: 10, lineHeight: 13, fontWeight: "600", textDecorationLine: "line-through" },
  offerPrice: { color: tc("#4A342A"), fontSize: 12, lineHeight: 16, fontWeight: "600" },
  cardActions: { marginTop: 8, flexDirection: "row", gap: 6 },
  secondaryBtn: { flex: 1, minHeight: 36, borderRadius: 10, borderWidth: 1, borderColor: "rgba(233,216,200,0.95)", backgroundColor: tc("#FFF"), alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 5 },
  secondaryBtnText: { color: tc("#5F463A"), fontSize: 10, lineHeight: 13, fontWeight: "600" },
  gotoBtn: { flex: 1, minHeight: 36, borderRadius: 10, backgroundColor: BRAND, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 },
  gotoBtnText: { color: tc("#FFF"), fontSize: 11, lineHeight: 14, fontWeight: "600" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(43,27,20,0.35)", justifyContent: "flex-end" },
  modalCard: {
    backgroundColor: tc("#FFFDF9"),
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(233,216,200,0.8)",
    padding: 14,
    maxHeight: "86%",
    shadowColor: "#3A281F",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -6 },
    elevation: 10,
  },
  modalHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  modalTitle: { color: tc("#4A342A"), fontSize: 16, lineHeight: 21, fontWeight: "600" },
  modalImage: { width: "100%", height: 160, borderRadius: 12, backgroundColor: tc("#EFE7E1"), marginBottom: 8 },
  modalProductName: { color: tc("#3A281F"), fontSize: 14, lineHeight: 19, fontWeight: "600", marginBottom: 10 },
  modalAlarmRow: { borderRadius: 12, borderWidth: 1, borderColor: "rgba(233,216,200,0.95)", backgroundColor: tc("#FFFCF7"), padding: 10, marginBottom: 10 },
  modalSectionTitle: { color: tc("#5F463A"), fontSize: 12, lineHeight: 16, fontWeight: "600", marginBottom: 6 },
  modalInput: { borderRadius: 10, borderWidth: 1, borderColor: "rgba(233,216,200,0.95)", backgroundColor: tc("#FFF"), paddingHorizontal: 10, paddingVertical: 8, color: tc("#3A281F"), fontSize: 13, lineHeight: 17, fontWeight: "600", marginBottom: 8 },
  modalBtns: { flexDirection: "row", gap: 8 },
  modalPrimaryBtn: { flex: 1, minHeight: 36, borderRadius: 10, backgroundColor: BRAND, alignItems: "center", justifyContent: "center" },
  modalPrimaryBtnText: { color: tc("#FFF"), fontSize: 11, lineHeight: 14, fontWeight: "600" },
  modalGhostBtn: { flex: 1, minHeight: 36, borderRadius: 10, borderWidth: 1, borderColor: "rgba(233,216,200,0.95)", backgroundColor: tc("#FFF"), alignItems: "center", justifyContent: "center" },
  modalGhostBtnText: { color: tc("#5F463A"), fontSize: 11, lineHeight: 14, fontWeight: "600" },
  modalEmpty: { color: tc("#7A5B4E"), fontSize: 12, lineHeight: 16, fontWeight: "600" },
  modalOfferRow: { marginTop: 6, borderRadius: 10, borderWidth: 1, borderColor: "rgba(233,216,200,0.9)", backgroundColor: tc("#FFF"), paddingHorizontal: 10, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 8 },
  modalOfferStore: { color: tc("#5F463A"), fontSize: 12, lineHeight: 15, fontWeight: "600" },
  modalOfferMeta: { color: tc("#7A5B4E"), fontSize: 10, lineHeight: 13, fontWeight: "600" },
  modalOfferPrice: { color: tc("#3A281F"), fontSize: 12, lineHeight: 16, fontWeight: "600" },
  modalOpenBtn: { width: 28, height: 28, borderRadius: 8, backgroundColor: BRAND, alignItems: "center", justifyContent: "center" },
})














