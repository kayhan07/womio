import { Ionicons } from "@expo/vector-icons"
import { Image } from "expo-image"
import * as ImagePicker from "expo-image-picker"
import * as MediaLibrary from "expo-media-library"
import { useMemo, useRef, useState } from "react"
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native"
import ViewShot from "react-native-view-shot"
import { useAppLanguage } from "../../src/core/i18n"
import { moduleStyles } from "../../src/theme/moduleStyles"
import { tc } from "../../src/theme/tokens"

const API_BASE = `${process.env.EXPO_PUBLIC_API_BASE_URL || "https://womio.net/api"}`.trim().replace(/\/+$/, "")
const PHOTO_LAB_AI_ENDPOINT =
  process.env.EXPO_PUBLIC_PHOTO_LAB_ENDPOINT || `${API_BASE}/photo-lab/beautify`

type Tone = {
  title: string
  subtitle: string
  load: string
  looks: string
  camera: string
  gallery: string
  before: string
  after: string
  save: string
  share: string
  noImage: string
  permission: string
  saveDone: string
  saveFail: string
  apply: string
  applying: string
  aiReady: string
  aiFallback: string
  tips: string
}

const TEXT: Record<string, Tone> = {
  tr: {
    title: "Güzellik Stüdyosu",
    subtitle: "Selfie veya yüz fotoğrafını düzenle, görünümü güçlendir, kaydet ve paylaş.",
    load: "Fotoğrafını Hazırla",
    looks: "Hazır Görünümler",
    camera: "Kamera",
    gallery: "Galeriden Seç",
    before: "Önce",
    after: "Sonra",
    save: "İndir / Kaydet",
    share: "Sosyal Medyada Paylaş",
    noImage: "Önce bir yüz fotoğrafı seç.",
    permission: "Kamera/galeri izni gerekli.",
    saveDone: "Düzenlenen fotoğraf galeriye kaydedildi.",
    saveFail: "Kaydetme sırasında hata oluştu.",
    apply: "Görünümü Uygula",
    applying: "Görünüm hazırlanıyor...",
    aiReady: "Düzenleme hazır. Sonra görünümünde kontrol edebilirsin.",
    aiFallback: "Canlı servis erişilemedi, stüdyo önizlemesi kullanılıyor.",
    tips: "İpucu: Önden çekilmiş, net ve aydınlık bir portre en iyi sonucu verir.",
  },
  en: {
    title: "Beauty Studio",
    subtitle: "Refine a selfie, try a polished look, then save and share it.",
    load: "Prepare Photo",
    looks: "Quick Looks",
    camera: "Camera",
    gallery: "Gallery",
    before: "Before",
    after: "After",
    save: "Download / Save",
    share: "Share on Social Media",
    noImage: "Please choose a face photo first.",
    permission: "Camera/gallery permission is required.",
    saveDone: "Edited photo saved to gallery.",
    saveFail: "An error occurred while saving.",
    apply: "Apply Look",
    applying: "Preparing look...",
    aiReady: "Your look is ready. Check the After view.",
    aiFallback: "Live service is unavailable, using studio preview.",
    tips: "Tip: A front-facing, bright and clear portrait gives the best result.",
  },
}

const clamp = (v: number) => Math.max(0, Math.min(100, v))
const toBase64FromUri = async (uri: string) => {
  try {
    const response = await fetch(uri)
    const blob = await response.blob()
    const encoded = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onerror = () => reject(new Error("file-read-failed"))
      reader.onloadend = () => resolve(`${reader.result ?? ""}`)
      reader.readAsDataURL(blob)
    })
    const i = encoded.indexOf("base64,")
    if (i < 0) return ""
    return encoded.slice(i + "base64,".length)
  } catch {
    return ""
  }
}

export default function PhotoLabScreen() {
  const { language } = useAppLanguage()
  const t = useMemo(() => TEXT[language] || TEXT.en, [language])
  const presets = useMemo(
    () =>
      language === "tr"
        ? [
            { name: "Doğal Işıltı", makeup: 30, young: 20, smooth: 35 },
            { name: "Soft Glam", makeup: 55, young: 28, smooth: 48 },
            { name: "Canlı Selfie", makeup: 40, young: 38, smooth: 56 },
            { name: "Gece Işıltısı", makeup: 64, young: 24, smooth: 44 },
          ]
        : [
            { name: "Natural Glow", makeup: 30, young: 20, smooth: 35 },
            { name: "Soft Glam", makeup: 55, young: 28, smooth: 48 },
            { name: "Bright Selfie", makeup: 40, young: 38, smooth: 56 },
            { name: "Night Glow", makeup: 64, young: 24, smooth: 44 },
          ],
    [language]
  )
  const [imageUri, setImageUri] = useState("")
  const [aiImageUri, setAiImageUri] = useState("")
  const [showAfter, setShowAfter] = useState(true)
  const [makeup, setMakeup] = useState(40)
  const [young, setYoung] = useState(30)
  const [smooth, setSmooth] = useState(45)
  const [isApplying, setIsApplying] = useState(false)
  const [statusText, setStatusText] = useState("")
  const previewRef = useRef<ViewShot | null>(null)

  const requestCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync()
    return perm.granted
  }

  const requestGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    return perm.granted
  }

  const pickFromCamera = async () => {
    const ok = await requestCamera()
    if (!ok) {
      Alert.alert(t.permission)
      return
    }
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.95 })
    if (!res.canceled && res.assets?.[0]?.uri) {
      setImageUri(res.assets[0].uri)
      setAiImageUri("")
      setStatusText("")
    }
  }

  const pickFromGallery = async () => {
    const ok = await requestGallery()
    if (!ok) {
      Alert.alert(t.permission)
      return
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.95 })
    if (!res.canceled && res.assets?.[0]?.uri) {
      setImageUri(res.assets[0].uri)
      setAiImageUri("")
      setStatusText("")
    }
  }

  const applyAiEnhancement = async () => {
    if (!imageUri || isApplying) {
      if (!imageUri) Alert.alert(t.noImage)
      return
    }
    try {
      setIsApplying(true)
      setStatusText(t.applying)
      const b64 = await toBase64FromUri(imageUri)
      if (!b64) {
        setStatusText(t.aiFallback)
        return
      }
      const payload = {
        image: `data:image/jpeg;base64,${b64}`,
        options: { makeup, young, smooth },
      }
      const resp = await fetch(PHOTO_LAB_AI_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!resp.ok) {
        setStatusText(t.aiFallback)
        return
      }
      const data = (await resp.json()) as { ok?: boolean; outputImage?: string; error?: string }
      if (data?.ok && data.outputImage) {
        setAiImageUri(data.outputImage)
        setShowAfter(true)
        setStatusText(t.aiReady)
      } else {
        setStatusText(t.aiFallback)
      }
    } catch {
      setStatusText(t.aiFallback)
    } finally {
      setIsApplying(false)
    }
  }

  const captureEditedUri = async () => {
    if (!previewRef.current) return null
    return previewRef.current.capture?.()
  }

  const saveOrShare = async (social = false) => {
    if (!imageUri) {
      Alert.alert(t.noImage)
      return
    }
    const msg =
      language === "tr"
        ? `Womio Güzellik Stüdyosu ile düzenlendi | Makyaj:${makeup}% Genç:${young}% Pürüzsüz:${smooth}%`
        : `Edited with Womio Beauty Studio | Makeup:${makeup}% Young:${young}% Smooth:${smooth}%`
    try {
      const editedUri = await captureEditedUri()
      if (!editedUri) throw new Error("capture_failed")
      if (social) {
        await Share.share({
          message: `${msg} #womio #beauty`,
          url: editedUri,
        })
        return
      }
      const perm = await MediaLibrary.requestPermissionsAsync()
      if (!perm.granted) {
        Alert.alert(t.permission)
        return
      }
      await MediaLibrary.saveToLibraryAsync(editedUri)
      Alert.alert(t.saveDone)
    } catch {
      Alert.alert(social ? (language === "tr" ? "Paylaşım açılamadı." : "Share action could not be opened.") : t.saveFail)
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.title}>{t.title}</Text>
          <Text style={styles.subtitle}>{t.subtitle}</Text>
          <Text style={styles.tips}>{t.tips}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.load}</Text>
          <View style={styles.row}>
            <Pressable style={styles.actionBtn} onPress={() => void pickFromCamera()}>
              <Ionicons name="camera-outline" size={16} color={tc("#5A3148")} />
              <Text style={styles.actionBtnText}>{t.camera}</Text>
            </Pressable>
            <Pressable style={styles.actionBtn} onPress={() => void pickFromGallery()}>
              <Ionicons name="image-outline" size={16} color={tc("#5A3148")} />
              <Text style={styles.actionBtnText}>{t.gallery}</Text>
            </Pressable>
          </View>
          <Pressable style={[styles.primaryBtn, isApplying && styles.primaryBtnDisabled]} onPress={() => void applyAiEnhancement()} disabled={isApplying}>
            <Ionicons name="sparkles-outline" size={16} color={tc("#FFFFFF")} />
            <Text style={styles.primaryBtnText}>{isApplying ? t.applying : t.apply}</Text>
          </Pressable>
          {!!statusText && <Text style={styles.statusText}>{statusText}</Text>}
        </View>

        <View style={styles.previewWrap}>
          {!!imageUri ? (
            <ViewShot
              ref={previewRef}
              style={styles.previewInner}
              options={{ format: "jpg", quality: 0.96, result: "tmpfile" }}
            >
              <Image source={{ uri: showAfter && aiImageUri ? aiImageUri : imageUri }} style={styles.preview} contentFit="cover" />
              {showAfter && !aiImageUri && (
                <>
                  <View style={[styles.makeupOverlay, { opacity: makeup / 300 }]} />
                  <View style={[styles.youngOverlay, { opacity: young / 300 }]} />
                  <View style={[styles.smoothOverlay, { opacity: smooth / 340 }]} />
                </>
              )}
            </ViewShot>
          ) : (
            <View style={styles.previewEmpty}>
              <Ionicons name="person-circle-outline" size={36} color={tc("#A77A92")} />
              <Text style={styles.previewEmptyText}>{t.noImage}</Text>
            </View>
          )}
        </View>

        <View style={styles.switchRow}>
          <Pressable style={[styles.switchChip, !showAfter && styles.switchChipActive]} onPress={() => setShowAfter(false)}>
            <Text style={[styles.switchText, !showAfter && styles.switchTextActive]}>{t.before}</Text>
          </Pressable>
          <Pressable style={[styles.switchChip, showAfter && styles.switchChipActive]} onPress={() => setShowAfter(true)}>
            <Text style={[styles.switchText, showAfter && styles.switchTextActive]}>{t.after}</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.looks}</Text>
          <View style={styles.presetGrid}>
            {presets.map((preset) => (
              <Pressable
                key={preset.name}
                style={styles.presetChip}
                onPress={() => {
                  setMakeup(preset.makeup)
                  setYoung(preset.young)
                  setSmooth(preset.smooth)
                  setShowAfter(true)
                  setStatusText(language === "tr" ? `${preset.name} hazır.` : `${preset.name} ready.`)
                }}
              >
                <Text style={styles.presetChipTitle}>{preset.name}</Text>
                <Text style={styles.presetChipMeta}>
                  {language === "tr" ? `M ${preset.makeup} • G ${preset.young} • P ${preset.smooth}` : `M ${preset.makeup} • Y ${preset.young} • S ${preset.smooth}`}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <AdjustLine label={language === "tr" ? "Makyaj" : "Makeup"} value={makeup} onChange={setMakeup} />
          <AdjustLine label={language === "tr" ? "Gençleştirme" : "Younger look"} value={young} onChange={setYoung} />
          <AdjustLine label={language === "tr" ? "Pürüzsüz" : "Smooth skin"} value={smooth} onChange={setSmooth} />
        </View>

        <View style={styles.row}>
          <Pressable style={styles.primaryBtn} onPress={() => void saveOrShare(false)}>
            <Ionicons name="download-outline" size={16} color={tc("#FFFFFF")} />
            <Text style={styles.primaryBtnText}>{t.save}</Text>
          </Pressable>
          <Pressable style={styles.ghostBtn} onPress={() => void saveOrShare(true)}>
            <Ionicons name="share-social-outline" size={16} color={tc("#5A3148")} />
            <Text style={styles.ghostBtnText}>{t.share}</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  )
}

function AdjustLine({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <View style={styles.adjustLine}>
      <Text style={styles.adjustLabel}>{label}</Text>
      <View style={styles.adjustControls}>
        <Pressable style={styles.adjustBtn} onPress={() => onChange(clamp(value - 10))}>
          <Text style={styles.adjustBtnText}>-</Text>
        </Pressable>
        <Text style={styles.adjustValue}>{value}%</Text>
        <Pressable style={styles.adjustBtn} onPress={() => onChange(clamp(value + 10))}>
          <Text style={styles.adjustBtnText}>+</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  page: { ...moduleStyles.page, padding: 10 },
  container: { ...moduleStyles.content, gap: 10 },
  hero: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,0,102,0.25)",
    backgroundColor: "rgba(255,0,102,0.10)",
    padding: 12,
  },
  title: { color: tc("#5A3148"), fontSize: 22, fontWeight: "700" },
  subtitle: { color: tc("#6B4B5D"), fontSize: 13, marginTop: 4 },
  tips: { color: tc("#8A5E76"), fontSize: 11, marginTop: 6 },
  card: { borderRadius: 12, borderWidth: 1, borderColor: tc("#E4D2C4"), backgroundColor: tc("#FFFDF9"), padding: 10, gap: 8 },
  cardTitle: { color: tc("#4A342A"), fontSize: 14, fontWeight: "700" },
  row: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  actionBtn: {
    flex: 1,
    minWidth: 130,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: tc("#E0CFC2"),
    backgroundColor: tc("#FFF7F9"),
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
  },
  actionBtnText: { color: tc("#5A3148"), fontSize: 12, fontWeight: "600" },
  previewWrap: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: tc("#E0CFC2"),
    overflow: "hidden",
    backgroundColor: tc("#FFFDF9"),
    minHeight: 320,
  },
  previewInner: { width: "100%", aspectRatio: 4 / 5, position: "relative" },
  preview: { width: "100%", height: "100%" },
  previewEmpty: { minHeight: 320, alignItems: "center", justifyContent: "center", gap: 8 },
  previewEmptyText: { color: tc("#7A5B4E"), fontSize: 12 },
  makeupOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,92,142,0.45)" },
  youngOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,255,255,0.32)" },
  smoothOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(250,236,255,0.42)" },
  switchRow: { flexDirection: "row", gap: 8 },
  switchChip: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: tc("#E0CFC2"),
    backgroundColor: tc("#FFF9F3"),
    paddingVertical: 8,
    alignItems: "center",
  },
  switchChipActive: { borderColor: "rgba(255,0,102,0.55)", backgroundColor: "rgba(255,0,102,0.16)" },
  switchText: { color: tc("#6E5549"), fontSize: 12, fontWeight: "600" },
  switchTextActive: { color: tc("#6A2749") },
  adjustLine: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  adjustLabel: { color: tc("#5A3148"), fontSize: 12, fontWeight: "600" },
  adjustControls: { flexDirection: "row", alignItems: "center", gap: 8 },
  adjustBtn: {
    width: 28,
    height: 28,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: tc("#D7C2CF"),
    backgroundColor: tc("#FFFFFF"),
    alignItems: "center",
    justifyContent: "center",
  },
  adjustBtnText: { color: tc("#5A3148"), fontSize: 16, fontWeight: "700" },
  adjustValue: { minWidth: 52, textAlign: "center", color: tc("#6E5549"), fontSize: 12, fontWeight: "700" },
  primaryBtn: {
    flex: 1,
    minWidth: 140,
    minHeight: 42,
    borderRadius: 10,
    backgroundColor: tc("#FF007A"),
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
  },
  primaryBtnDisabled: { opacity: 0.7 },
  primaryBtnText: { color: tc("#FFFFFF"), fontSize: 12, fontWeight: "700" },
  statusText: { color: tc("#7A2D4F"), fontSize: 12, lineHeight: 16, fontWeight: "600" },
  ghostBtn: {
    flex: 1,
    minWidth: 140,
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: tc("#E0CFC2"),
    backgroundColor: tc("#FFFDF9"),
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
  },
  ghostBtnText: { color: tc("#5A3148"), fontSize: 12, fontWeight: "700" },
})
