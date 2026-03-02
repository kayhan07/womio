import { Ionicons } from "@expo/vector-icons"
import * as ImagePicker from "expo-image-picker"
import { useMemo, useState } from "react"
import { moduleStyles, moduleTheme } from "@/src/theme/moduleStyles"
import {
  Alert,
  Platform,
  Image,
  ImageBackground,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native"
import { tc } from "@/src/theme/tokens"


type PickedPhoto = {
  uri: string
  width?: number
  height?: number
  fileName?: string
  base64?: string
  from: "camera" | "library"
}

const BRAND = moduleTheme.colors.brand
const COFFEE_HERO_URI =
  "https://images.unsplash.com/photo-1661685249322-bea84eac9b13?auto=format&fit=crop&w=1200&q=80"
const API_BASE = `${process.env.EXPO_PUBLIC_API_BASE_URL || "https://womio.net/api"}`.trim().replace(/\/+$/, "")

const COFFEE_VERIFY_ENDPOINT =
  process.env.EXPO_PUBLIC_COFFEE_VERIFY_ENDPOINT ||
  `${API_BASE}/astrology/coffee-verify`

const COFFEE_READING_ENDPOINT =
  process.env.EXPO_PUBLIC_COFFEE_READING_ENDPOINT ||
  `${API_BASE}/astrology/coffee-reading`

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n))

const scoreCupLike = (p: PickedPhoto) => {
  // Heuristic only (no ML). Helps reject obvious non-cup photos like screenshots/very tall selfies.
  const w = p.width ?? 0
  const h = p.height ?? 0
  const r = w > 0 && h > 0 ? w / h : 1

  let score = 1.0
  if (r > 1.35 || r < 0.75) score -= 0.35
  if (r > 1.7 || r < 0.6) score -= 0.35

  const name = (p.fileName ?? "").toLowerCase()
  if (name.includes("screenshot") || name.includes("ekran")) score -= 0.35
  if (p.from === "camera") score += 0.1
  return clamp(score, 0, 1)
}

export default function AstrologyCoffeeScreen() {
  const { width } = useWindowDimensions()
  const compact = width < 360

  const [intention, setIntention] = useState("")
  const [photos, setPhotos] = useState<PickedPhoto[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [reading, setReading] = useState<string>("")
  const [previewUri, setPreviewUri] = useState<string | null>(null)
  const [status, setStatus] = useState<{ kind: "info" | "warn" | "error"; text: string } | null>(null)

  const cupScores = useMemo(() => photos.map((p) => scoreCupLike(p)), [photos])
  const cupLikelyCount = useMemo(() => cupScores.filter((s) => s >= 0.55).length, [cupScores])
  const canAnalyze = photos.length >= 1
  const bottomBarHeight = compact ? 86 : 92

  const ensurePermissions = async (mode: "camera" | "library") => {
    if (mode === "camera") {
      const res = await ImagePicker.requestCameraPermissionsAsync()
      if (!res.granted) throw new Error("camera-permission")
    } else {
      const res = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!res.granted) throw new Error("library-permission")
    }
  }

  const addPhotoAsset = (asset: ImagePicker.ImagePickerAsset, from: PickedPhoto["from"]) => {
    setPhotos((prev) => {
      if (prev.length >= 3) return prev
      const next: PickedPhoto = {
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        fileName: asset.fileName ?? undefined,
        base64: asset.base64 ?? undefined,
        from,
      }
      return [...prev, next].slice(0, 3)
    })
  }

  const pickFromLibrary = async () => {
    try {
      await ensurePermissions("library")
      const remaining = Math.max(0, 3 - photos.length)
      if (remaining === 0) return

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: remaining,
        base64: true,
        quality: 0.9,
      })
      if (result.canceled) return
      result.assets.slice(0, remaining).forEach((a) => addPhotoAsset(a, "library"))
    } catch (e) {
      if (`${e}`.includes("library-permission")) {
        Alert.alert("\u0130zin Gerekli", "Galeriden foto\u011fraf se\u00e7mek i\u00e7in izin vermen gerekiyor.")
        return
      }
      Alert.alert("Hata", "Foto\u011fraf se\u00e7ilemedi. L\u00fctfen tekrar dene.")
    }
  }

  const takePhoto = async () => {
    try {
      await ensurePermissions("camera")
      const remaining = Math.max(0, 3 - photos.length)
      if (remaining === 0) return

      const result = await ImagePicker.launchCameraAsync({ quality: 0.9, base64: true })
      if (result.canceled) return
      const a = result.assets[0]
      if (a) addPhotoAsset(a, "camera")
    } catch (e) {
      if (`${e}`.includes("camera-permission")) {
        Alert.alert("\u0130zin Gerekli", "Kamera ile foto\u011fraf \u00e7ekmek i\u00e7in izin vermen gerekiyor.")
        return
      }
      Alert.alert("Hata", "Foto\u011fraf \u00e7ekilemedi. L\u00fctfen tekrar dene.")
    }
  }

  const resetAll = () => {
    setPhotos([])
    setReading("")
    setStatus(null)
  }

  const analyze = async () => {
    if (isLoading) return
    if (!canAnalyze) {
      const msg =
        "Analiz i\u00e7in en az 1 foto\u011fraf gerekiyor. En iyi sonu\u00e7 i\u00e7in 3 farkl\u0131 a\u00e7\u0131dan foto\u011fraf ekle (fincan i\u00e7i net)."
      setStatus({ kind: "error", text: msg })
      Alert.alert("Eksik Foto\u011fraf", msg)
      return
    }

    setStatus(null)

    // ML verification (server-side vision) when available; fallback to heuristic silently.
    let mlCupLikelyCount: number | null = null
    try {
      const imgs = photos
        .map((p) => p.base64)
        .filter((b): b is string => Boolean(b))
        .slice(0, 3)

      if (imgs.length >= 1) {
        try {
          const resp = await fetch(COFFEE_VERIFY_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              images: imgs.map((b64) => `data:image/jpeg;base64,${b64}`),
            }),
          })

          if (resp.ok) {
            const data = (await resp.json()) as {
              ok?: boolean
              overall?: { isCup?: boolean; confidence?: number }
              results?: { isCup?: boolean; confidence?: number; label?: string }[]
            }
            if (Array.isArray(data.results)) {
              mlCupLikelyCount = data.results.filter((r) => r?.isCup).length
            } else if (data.overall?.isCup === true) {
              mlCupLikelyCount = 1
            } else if (data.overall?.isCup === false) {
              mlCupLikelyCount = 0
            }
          }
        } catch {
          // Backend might be down (common during local dev). We'll fall back to heuristic.
          mlCupLikelyCount = null
        }
      }
    } catch {
      // ignore
    }

    const cupOk = (mlCupLikelyCount ?? cupLikelyCount) >= 1
    if (!cupOk) {
      const msg =
        "Kahve fincan\u0131 alg\u0131lanamad\u0131. L\u00fctfen fincan\u0131n i\u00e7ini net g\u00f6steren bir foto\u011fraf y\u00fckle ve tekrar dene."
      setStatus({ kind: "error", text: msg })
      Alert.alert("Kahve Fincan\u0131 Bulunamad\u0131", msg)
      return
    }

    setIsLoading(true)
    try {
      const imgs = photos
        .map((p) => p.base64)
        .filter((b): b is string => Boolean(b))
        .slice(0, 3)

      if (imgs.length >= 1) {
        try {
          const resp = await fetch(COFFEE_READING_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              intention,
              images: imgs.map((b64) => `data:image/jpeg;base64,${b64}`),
            }),
          })

          if (resp.ok) {
            const data = (await resp.json()) as { ok?: boolean; source?: string; reading?: string; error?: string }
            const text = `${data.reading ?? ""}`.trim()

            if (text) {
              setReading(text)
              return
            }
          }
        } catch {
          const msg = "AI analiz servisine bağlanılamadı. Backend adresini ve API ayarlarını kontrol et."
          setStatus({ kind: "error", text: msg })
          Alert.alert("Bağlantı Hatasi", msg)
          return
        }
      }

      const msg = "AI yorum alinamadi. Backend endpoint yanit vermedi."
      setStatus({ kind: "error", text: msg })
      Alert.alert("AI Yorum Yok", msg)
      return
    } finally {
      setIsLoading(false)
    }
  }

  const gridGap = useMemo(
    () => Math.round(Math.max(10, Math.min(14, (Math.min(width, 520) - 32) * 0.03))),
    [width]
  )

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.page,
          compact && styles.pageCompact,
          { paddingBottom: bottomBarHeight + 22 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View pointerEvents="none" style={styles.decorBlobA} />
        <View pointerEvents="none" style={styles.decorBlobB} />

        <View style={styles.headerCard}>
          <View pointerEvents="none" style={styles.headerBg}>
            <ImageBackground
              source={{ uri: COFFEE_HERO_URI }}
              style={styles.headerBg}
              imageStyle={styles.headerBgImg}
              blurRadius={Platform.OS === "web" ? 0 : 2}
            />
          </View>
          <View pointerEvents="none" style={styles.headerBgOverlayStrong} />
          <View pointerEvents="none" style={styles.headerBgOverlayTint} />
          <View pointerEvents="none" style={styles.headerGlowA} />
          <View pointerEvents="none" style={styles.headerGlowB} />

          <View style={styles.headerRow}>
            <View style={styles.headerIcon}>
              <Ionicons name="cafe" size={18} color={tc("#FFF")} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>{"Kahve Fal\u0131"}</Text>
              <Text style={styles.headerSub} numberOfLines={2}>
                {"1-3 foto\u011fraf ekle. Fincan do\u011frulan\u0131rsa AI ile detayl\u0131 yorum al."}
              </Text>
            </View>
            <View style={styles.countPill}>
              <Text style={styles.countPillText}>{`${photos.length || 0}/3`}</Text>
            </View>
          </View>

          <View style={styles.stepRow}>
            {[
              { k: "Foto", a: photos.length === 0, d: photos.length > 0 },
              { k: "Do\u011frula", a: photos.length > 0 && !reading, d: Boolean(reading) },
              { k: "Yorum", a: Boolean(reading), d: false },
            ].map((s) => (
              <View key={s.k} style={[styles.stepChip, s.a && styles.stepChipActive, s.d && styles.stepChipDone]}>
                <Text style={[styles.stepChipText, (s.a || s.d) && styles.stepChipTextOn]}>{s.k}</Text>
              </View>
            ))}
          </View>

          {status ? (
            <View
              style={[
                styles.inlineStatus,
                status.kind === "error" && styles.inlineStatusError,
                status.kind === "warn" && styles.inlineStatusWarn,
              ]}
            >
              <Text style={styles.inlineStatusText}>{status.text}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.panel}>
          <View pointerEvents="none" style={styles.panelBgWrap}>
            <ImageBackground
              source={{ uri: COFFEE_HERO_URI }}
              style={styles.panelBgWrap}
              imageStyle={styles.panelBgImg}
              blurRadius={Platform.OS === "web" ? 0 : 2}
            />
          </View>
          <View pointerEvents="none" style={styles.panelBgOverlay} />

          <Text style={styles.panelTitle}>{"Foto\u011fraflar"}</Text>
          <Text style={styles.help}>
            {"\u0130pucu: En iyi sonu\u00e7 i\u00e7in 1) fincan i\u00e7i yak\u0131n, 2) kulp g\u00f6r\u00fcnecek a\u00e7\u0131, 3) tabak/kenar izleri olan a\u00e7\u0131 \u00e7ek."}
          </Text>

          <View style={[styles.photoRow, { marginHorizontal: -(gridGap / 2), marginTop: 10 }]}>
            {[0, 1, 2].map((idx) => {
              const p = photos[idx]
              return (
                <View key={idx} style={{ width: "33.3333%", paddingHorizontal: gridGap / 2 }}>
                  <Pressable
                    onPress={() => (p ? setPreviewUri(p.uri) : void 0)}
                    style={[styles.photoSlot, !p && styles.photoSlotEmpty]}
                  >
                    {p ? (
                      <Image source={{ uri: p.uri }} style={styles.photoImg} />
                    ) : (
                      <View style={styles.photoEmptyInner}>
                        <Ionicons name="image" size={18} color="rgba(36,21,28,0.55)" />
                        <Text style={styles.photoEmptyText}>{"Foto "}{idx + 1}</Text>
                      </View>
                    )}
                    <View pointerEvents="none" style={styles.slotBadge}>
                      <Text style={styles.slotBadgeText}>{idx + 1}</Text>
                    </View>
                  </Pressable>
                  <View style={styles.slotMetaRow}>
                    <View style={[styles.dot, p ? (scoreCupLike(p) >= 0.55 ? styles.dotOk : styles.dotWarn) : styles.dotIdle]} />
                    <Text style={styles.slotMetaText} numberOfLines={1}>
                      {!p ? "Bo\u015f" : p.from === "camera" ? "Kamera" : "Galeri"}
                    </Text>
                  </View>
                </View>
              )
            })}
          </View>

          {photos.length > 0 && photos.length < 3 ? (
            <View style={[styles.statusBox, styles.statusBoxWarn]}>
              <Text style={styles.statusText}>
                {`En iyi sonu\u00e7 i\u00e7in 3 foto\u011fraf \u00f6nerilir. \u015eu an ${photos.length} foto ile analiz yapabilirsin.`}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.panel}>
          <View pointerEvents="none" style={styles.panelBgWrap}>
            <ImageBackground
              source={{ uri: COFFEE_HERO_URI }}
              style={styles.panelBgWrap}
              imageStyle={styles.panelBgImg}
              blurRadius={Platform.OS === "web" ? 0 : 2}
            />
          </View>
          <View pointerEvents="none" style={styles.panelBgOverlay} />

          <Text style={styles.panelTitle}>Niyet (opsiyonel)</Text>
          <TextInput
            value={intention}
            onChangeText={setIntention}
            placeholder={"\u00d6rn: A\u015fk hayat\u0131mda bu ay beni ne bekliyor?"}
            placeholderTextColor="rgba(36,21,28,0.45)"
            style={styles.input}
          />
          <Text style={styles.help}>Niyet yazarsan yorum daha hedefli olur.</Text>
        </View>

        <View style={[styles.panel, { marginBottom: 20 }]}>
          <View pointerEvents="none" style={styles.panelBgWrap}>
            <ImageBackground
              source={{ uri: COFFEE_HERO_URI }}
              style={styles.panelBgWrap}
              imageStyle={styles.panelBgImg}
              blurRadius={Platform.OS === "web" ? 0 : 2}
            />
          </View>
          <View pointerEvents="none" style={styles.panelBgOverlay} />

          <Text style={styles.panelTitle}>Yorum</Text>
          {!reading ? (
            <Text style={styles.help}>
              {"\u00d6nce 3 foto\u011fraf y\u00fckleyip \"Analiz Et\" butonuna bas."}
            </Text>
          ) : (
            <Text style={styles.reading}>{reading}</Text>
          )}
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { height: bottomBarHeight }]}>
        <View style={styles.addRow}>
          <Pressable
            onPress={() => void takePhoto()}
            style={[styles.addBtn, photos.length >= 3 && styles.addBtnDisabled]}
            disabled={photos.length >= 3}
          >
            <Ionicons name="camera" size={18} color={tc("#24151C")} />
            <Text style={styles.addBtnText}>Kamera</Text>
          </Pressable>
          <Pressable
            onPress={() => void pickFromLibrary()}
            style={[styles.addBtn, photos.length >= 3 && styles.addBtnDisabled]}
            disabled={photos.length >= 3}
          >
            <Ionicons name="images" size={18} color={tc("#24151C")} />
            <Text style={styles.addBtnText}>Galeri</Text>
          </Pressable>

          <Pressable
            onPress={resetAll}
            style={[styles.addBtnGhost, (photos.length === 0 && !reading) && styles.addBtnDisabled]}
            disabled={photos.length === 0 && !reading}
          >
            <Ionicons name="trash" size={18} color={BRAND} />
            <Text style={styles.addBtnText}>Temizle</Text>
          </Pressable>
        </View>

        <Pressable onPress={() => void analyze()} style={[styles.ctaBtnLarge, !canAnalyze && styles.primaryBtnDisabled]}>
          <Text style={styles.ctaTextLarge}>
            {isLoading ? "Analiz ediliyor..." : !canAnalyze ? "Foto\u011fraf ekleyerek ba\u015fla" : "Analiz Et"}
          </Text>
        </Pressable>
      </View>

      <Modal visible={Boolean(previewUri)} transparent animationType="fade" onRequestClose={() => setPreviewUri(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPreviewUri(null)}>
          <View style={styles.modalCard}>
            {previewUri ? <Image source={{ uri: previewUri }} style={styles.modalImg} /> : null}
            <Pressable style={styles.modalClose} onPress={() => setPreviewUri(null)}>
              <Ionicons name="close" size={18} color={tc("#FFF")} />
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "transparent" },
  page: { ...moduleStyles.page, gap: 12 },
  pageCompact: { ...moduleStyles.pageCompact },
  decorBlobA: {
    position: "absolute",
    top: -140,
    right: -140,
    width: 300,
    height: 300,
    borderRadius: 999,
    backgroundColor: "rgba(255,0,102,0.08)",
  },
  decorBlobB: {
    position: "absolute",
    bottom: -160,
    left: -160,
    width: 360,
    height: 360,
    borderRadius: 999,
    backgroundColor: "rgba(122,91,78,0.10)",
  },
  headerCard: {
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(36,21,28,0.08)",
    backgroundColor: "rgba(255,255,255,0.86)",
    shadowColor: tc("#000"),
    shadowOpacity: 0.10,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
    gap: 10,
    overflow: "hidden",
    position: "relative",
  },
  headerBg: { ...StyleSheet.absoluteFillObject },
  headerBgImg: { opacity: 0.62 },
  headerBgOverlayStrong: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,248,241,0.62)" },
  headerBgOverlayTint: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,0,102,0.04)" },
  headerGlowA: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: "rgba(255,0,102,0.10)",
    right: -80,
    top: -90,
  },
  headerGlowB: {
    position: "absolute",
    width: 170,
    height: 170,
    borderRadius: 999,
    backgroundColor: "rgba(196,155,123,0.18)",
    left: -70,
    bottom: -90,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(255,0,102,0.88)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  headerTitle: { fontSize: 20, lineHeight: 24, fontWeight: "600", color: tc("#24151C") },
  headerSub: { marginTop: 2, fontSize: 13, lineHeight: 18, fontWeight: "600", color: "rgba(36,21,28,0.68)" },
  countPill: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,0,102,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,0,102,0.18)",
  },
  countPillText: { fontSize: 12, lineHeight: 16, fontWeight: "600", color: tc("#24151C") },
  stepRow: { flexDirection: "row", gap: 8, marginTop: 2 },
  stepChip: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "rgba(36,21,28,0.10)",
    backgroundColor: "rgba(36,21,28,0.04)",
    alignItems: "center",
  },
  stepChipActive: {
    borderColor: "rgba(255,0,102,0.28)",
    backgroundColor: "rgba(255,0,102,0.10)",
  },
  stepChipDone: {
    borderColor: "rgba(28,165,100,0.25)",
    backgroundColor: "rgba(28,165,100,0.10)",
  },
  stepChipText: { fontSize: 12, lineHeight: 16, fontWeight: "600", color: "rgba(36,21,28,0.66)" },
  stepChipTextOn: { color: tc("#24151C") },
  inlineStatus: {
    marginTop: 8,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(36,21,28,0.10)",
    backgroundColor: "rgba(36,21,28,0.04)",
  },
  inlineStatusWarn: {
    borderColor: "rgba(255,149,0,0.28)",
    backgroundColor: "rgba(255,149,0,0.10)",
  },
  inlineStatusError: {
    borderColor: "rgba(255,0,102,0.26)",
    backgroundColor: "rgba(255,0,102,0.10)",
  },
  inlineStatusText: { fontSize: 13, lineHeight: 18, fontWeight: "600", color: "rgba(36,21,28,0.84)" },
  panel: {
    backgroundColor: "rgba(255,255,255,0.72)",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(233,216,200,0.9)",
    shadowColor: tc("#000"),
    shadowOpacity: 0.10,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
    overflow: "hidden",
    position: "relative",
  },
  panelBgWrap: { ...StyleSheet.absoluteFillObject },
  panelBgImg: { opacity: 0.3 },
  panelBgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,249,242,0.82)" },
  // (legacy) panelWithImage* styles removed; hero now carries the coffee photo.
  panelTitle: { fontSize: 16, lineHeight: 22, fontWeight: "600", color: tc("#24151C") },
  // Improve contrast on top of the photo panel background.
  help: { marginTop: 8, fontSize: 13, lineHeight: 18, fontWeight: "600", color: "rgba(36,21,28,0.70)" },
  photoRow: { flexDirection: "row" },
  photoSlot: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(36,21,28,0.10)",
    backgroundColor: "rgba(255,255,255,0.86)",
  },
  photoSlotEmpty: { backgroundColor: "rgba(255,0,102,0.06)", borderColor: "rgba(255,0,102,0.14)" },
  photoImg: { width: "100%", height: "100%" },
  photoEmptyInner: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6 },
  photoEmptyText: { fontSize: 12, lineHeight: 16, fontWeight: "600", color: "rgba(36,21,28,0.72)" },
  slotBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.82)",
    borderWidth: 1,
    borderColor: "rgba(36,21,28,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  slotBadgeText: { fontSize: 12, lineHeight: 16, fontWeight: "600", color: tc("#24151C") },
  slotMetaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  slotMetaText: { flex: 1, fontSize: 12, lineHeight: 16, fontWeight: "600", color: "rgba(36,21,28,0.68)" },
  dot: { width: 8, height: 8, borderRadius: 999 },
  dotIdle: { backgroundColor: "rgba(36,21,28,0.20)" },
  dotOk: { backgroundColor: "rgba(28, 165, 100, 0.95)" },
  dotWarn: { backgroundColor: "rgba(255, 149, 0, 0.95)" },
  primaryBtnDisabled: { opacity: 0.55 },
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
  reading: { marginTop: 10, fontSize: 14, lineHeight: 20, fontWeight: "600", color: "rgba(36,21,28,0.86)" },
  bottomBar: {
    position: "absolute",
    bottom: 12,
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    marginHorizontal: 12,
    borderRadius: 20,
    padding: 10,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderWidth: 1,
    borderColor: "rgba(233,216,200,0.95)",
    shadowColor: tc("#000"),
    shadowOpacity: 0.10,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  addRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  addBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    backgroundColor: "rgba(36,21,28,0.05)",
    borderWidth: 1,
    borderColor: "rgba(36,21,28,0.10)",
  },
  addBtnGhost: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    backgroundColor: "rgba(255,0,102,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,0,102,0.18)",
  },
  addBtnDisabled: { opacity: 0.55 },
  addBtnText: { fontSize: 14, lineHeight: 18, fontWeight: "600", color: tc("#24151C") },
  ctaBtnLarge: {
    marginTop: 10,
    height: 48,
    borderRadius: 16,
    backgroundColor: BRAND,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: tc("#B1004A"),
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  ctaTextLarge: { fontSize: 15, lineHeight: 20, fontWeight: "600", color: tc("#FFF") },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", padding: 16 },
  modalCard: { width: "100%", maxWidth: 520, borderRadius: 18, overflow: "hidden", backgroundColor: tc("#000") },
  modalImg: { width: "100%", aspectRatio: 1, backgroundColor: tc("#000") },
  modalClose: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  statusBox: {
    marginTop: 12,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(36,21,28,0.10)",
    backgroundColor: "rgba(36,21,28,0.04)",
  },
  statusBoxWarn: {
    borderColor: "rgba(255,149,0,0.28)",
    backgroundColor: "rgba(255,149,0,0.10)",
  },
  statusBoxError: {
    borderColor: "rgba(255,0,102,0.26)",
    backgroundColor: "rgba(255,0,102,0.10)",
  },
  statusText: { fontSize: 13, lineHeight: 18, fontWeight: "600", color: "rgba(36,21,28,0.82)" },
})

















