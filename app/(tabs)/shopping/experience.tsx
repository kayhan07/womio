import { Ionicons } from "@expo/vector-icons"
import { Image } from "expo-image"
import * as ImagePicker from "expo-image-picker"
import { useEffect, useMemo, useState } from "react"
import {
  Alert,
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
import { t, useAppLanguage } from "@/src/core/i18n"
import { loadExperiences, saveExperiences } from "@/src/modules/shopping/storage"
import { Experience } from "@/src/modules/shopping/types"
import { SectionHeader } from "@/src/modules/shopping/ui/SectionHeader"
import { moduleStyles, moduleTheme } from "@/src/theme/moduleStyles"
import { ModuleButton, ModuleInput } from "@/src/components/ui/ModulePrimitives"
import { tc } from "@/src/theme/tokens"

const BRAND = moduleTheme.colors.brand
const EXPERIENCE_BG_URI =
  "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1200&q=80"
const EXPERIENCE_LIST_BG_URI =
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80"

const normalize = (value: string) =>
  value
    .toLocaleLowerCase("tr-TR")
    .replace(/\s+/g, " ")
    .trim()

export default function ShoppingExperienceScreen() {
  const { width } = useWindowDimensions()
  const compact = width < 360
  const { language, ready } = useAppLanguage()

  const [experiences, setExperiences] = useState<Experience[]>([])
  const [search, setSearch] = useState("")
  const [brand, setBrand] = useState("")
  const [model, setModel] = useState("")
  const [productName, setProductName] = useState("")
  const [photoUrl, setPhotoUrl] = useState("")
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState("")
  const [feedback, setFeedback] = useState("")
  const [zoomUri, setZoomUri] = useState("")

  useEffect(() => {
    const load = async () => setExperiences(await loadExperiences())
    void load()
  }, [])

  const notify = (message: string) => {
    setFeedback(message)
    setTimeout(() => setFeedback(""), 2200)
  }

  const addExperience = async () => {
    if (!brand.trim() || !model.trim() || !productName.trim() || !comment.trim()) {
      notify(t("shoppingExperienceErrorRequired", language))
      return
    }

    const nextItem: Experience = {
      id: `${Date.now()}`,
      brand: brand.trim(),
      model: model.trim(),
      productName: productName.trim(),
      photoUrl: photoUrl.trim(),
      rating,
      comment: comment.trim(),
      createdAt: new Date().toISOString(),
    }
    const next = [nextItem, ...experiences]
    setExperiences(next)
    await saveExperiences(next)

    setBrand("")
    setModel("")
    setProductName("")
    setPhotoUrl("")
    setRating(5)
    setComment("")
    notify(t("shoppingExperienceSaved", language))
  }

  const pickFromCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync()
    if (!permission.granted) {
      Alert.alert(t("shoppingPhotoPermissionTitle", language), t("shoppingPhotoPermissionDesc", language))
      return
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8 })
    if (!result.canceled && result.assets[0]?.uri) setPhotoUrl(result.assets[0].uri)
  }

  const pickFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      Alert.alert(t("shoppingPhotoPermissionTitle", language), t("shoppingPhotoPermissionDesc", language))
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: false,
    })
    if (!result.canceled && result.assets[0]?.uri) setPhotoUrl(result.assets[0].uri)
  }

  const filteredExperiences = useMemo(() => {
    const q = normalize(search)
    if (!q) return experiences
    return experiences.filter((item) => normalize(`${item.brand} ${item.model} ${item.productName}`).includes(q))
  }, [search, experiences])

  const averageRating = useMemo(() => {
    if (filteredExperiences.length === 0) return 0
    const total = filteredExperiences.reduce((sum, item) => sum + item.rating, 0)
    return total / filteredExperiences.length
  }, [filteredExperiences])

  if (!ready) return <View style={styles.container} />

  return (
    <ScrollView contentContainerStyle={[styles.container, compact && styles.containerCompact]} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <View pointerEvents="none" style={styles.decorA} />
        <View pointerEvents="none" style={styles.decorB} />

        <View style={[styles.card, compact && styles.cardCompact]}>
          <View pointerEvents="none" style={styles.cardBgWrap}>
            <ImageBackground source={{ uri: EXPERIENCE_BG_URI }} style={styles.cardBgWrap} imageStyle={styles.cardBgImage} />
          </View>
          <View pointerEvents="none" style={styles.cardBgOverlay} />
          <View pointerEvents="none" style={styles.cardAccentTop} />

          <SectionHeader
            title={t("shoppingExperienceCreateTitle", language)}
            subtitle={t("shoppingSectionExperienceDesc", language)}
            compact={compact}
          />

          <View style={styles.fieldCard}>
            <Ionicons name="pricetag-outline" size={16} color={tc("#6B4D40")} />
            <ModuleInput
              value={brand}
              onChangeText={setBrand}
              placeholder={t("shoppingBrandPlaceholder", language)}
              placeholderTextColor="rgba(107,77,64,0.55)"
              style={styles.inputInField}
            />
          </View>

          <View style={styles.fieldCard}>
            <Ionicons name="cube-outline" size={16} color={tc("#6B4D40")} />
            <ModuleInput
              value={model}
              onChangeText={setModel}
              placeholder={t("shoppingModelPlaceholder", language)}
              placeholderTextColor="rgba(107,77,64,0.55)"
              style={styles.inputInField}
            />
          </View>

          <View style={styles.fieldCard}>
            <Ionicons name="bag-outline" size={16} color={tc("#6B4D40")} />
            <ModuleInput
              value={productName}
              onChangeText={setProductName}
              placeholder={t("shoppingProductPlaceholder", language)}
              placeholderTextColor="rgba(107,77,64,0.55)"
              style={styles.inputInField}
            />
          </View>

          <View style={styles.photoActions}>
            <View style={styles.photoButtonWrap}>
              <Ionicons name="camera" size={16} color={tc("#4A342A")} />
              <ModuleButton text={t("shoppingPhotoFromCamera", language)} variant="ghost" onPress={() => void pickFromCamera()} style={styles.photoButton} />
            </View>
            <View style={styles.photoButtonWrap}>
              <Ionicons name="images" size={16} color={tc("#4A342A")} />
              <ModuleButton text={t("shoppingPhotoFromGallery", language)} variant="ghost" onPress={() => void pickFromLibrary()} style={styles.photoButton} />
            </View>
          </View>

          {!!photoUrl && (
            <Pressable style={styles.thumbWrap} onPress={() => setZoomUri(photoUrl)}>
              <Image source={{ uri: photoUrl }} style={styles.preview} contentFit="cover" />
              <View pointerEvents="none" style={styles.thumbBadge}>
                <Ionicons name="expand" size={14} color={tc("#FFF")} />
              </View>
            </Pressable>
          )}

          <Text style={styles.label}>{t("shoppingRatingLabel", language)}</Text>
          <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Pressable key={star} style={styles.starTap} onPress={() => setRating(star)}>
                <Ionicons name={star <= rating ? "star" : "star-outline"} size={26} color={star <= rating ? BRAND : "rgba(122,91,78,0.45)"} />
              </Pressable>
            ))}
          </View>

          <View style={styles.fieldCardBig}>
            <ModuleInput
              value={comment}
              onChangeText={setComment}
              placeholder={t("shoppingCommentPlaceholder", language)}
              placeholderTextColor="rgba(107,77,64,0.55)"
              style={[styles.inputInField, styles.textArea]}
              multiline
            />
          </View>

          <ModuleButton text={t("shoppingExperienceSave", language)} onPress={() => void addExperience()} style={styles.primaryButton} />

          {!!feedback && <Text style={styles.feedback}>{feedback}</Text>}
        </View>

        <View style={[styles.card, compact && styles.cardCompact]}>
          <View pointerEvents="none" style={styles.cardBgWrap}>
            <ImageBackground source={{ uri: EXPERIENCE_LIST_BG_URI }} style={styles.cardBgWrap} imageStyle={styles.cardBgImage} />
          </View>
          <View pointerEvents="none" style={styles.cardBgOverlay} />
          <View pointerEvents="none" style={styles.cardAccentTop} />

          <SectionHeader title={t("shoppingExperienceSearchTitle", language)} compact={compact} />

          <View style={styles.fieldCard}>
            <Ionicons name="search" size={16} color={tc("#6B4D40")} />
            <ModuleInput
              value={search}
              onChangeText={setSearch}
              placeholder={t("shoppingExperienceSearchPlaceholder", language)}
              placeholderTextColor="rgba(107,77,64,0.55)"
              style={styles.inputInField}
            />
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statChip}>
              <Text style={styles.statLabel}>{t("shoppingExperienceCount", language)}</Text>
              <Text style={styles.statValue}>{filteredExperiences.length}</Text>
            </View>
            <View style={styles.statChip}>
              <Text style={styles.statLabel}>{t("shoppingExperienceAvg", language)}</Text>
              <Text style={styles.statValue}>{averageRating.toFixed(1)} / 5</Text>
            </View>
          </View>

          <Text style={[styles.listTitle, compact && styles.listTitleCompact]}>{t("shoppingExperienceListTitle", language)}</Text>
          {filteredExperiences.length === 0 ? (
            <Text style={styles.helper}>{t("shoppingExperienceNoResult", language)}</Text>
          ) : (
            filteredExperiences.map((item) => (
              <View key={item.id} style={styles.itemCard}>
                <View style={styles.itemTopRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>{item.brand} {item.model}</Text>
                    <Text style={styles.itemSub}>{item.productName}</Text>
                  </View>
                  <View style={styles.itemStarsInline}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Ionicons
                        key={`${item.id}-s-${s}`}
                        name={s <= item.rating ? "star" : "star-outline"}
                        size={16}
                        color={s <= item.rating ? BRAND : "rgba(122,91,78,0.40)"}
                      />
                    ))}
                  </View>
                </View>

                {!!item.photoUrl && (
                  <Pressable style={styles.itemThumbWrap} onPress={() => setZoomUri(item.photoUrl)}>
                    <Image source={{ uri: item.photoUrl }} style={styles.itemPreview} contentFit="cover" />
                  </Pressable>
                )}
                <Text style={styles.itemComment}>{item.comment}</Text>
              </View>
            ))
          )}
        </View>
      </View>

      <Modal visible={!!zoomUri} transparent animationType="fade" onRequestClose={() => setZoomUri("")}>
        <Pressable style={styles.modalBackdrop} onPress={() => setZoomUri("")}>
          <View style={styles.modalCard}>
            {!!zoomUri && <Image source={{ uri: zoomUri }} style={styles.modalImage} contentFit="contain" />}
            <View style={styles.modalCloseWrap}>
              <Ionicons name="close" size={18} color={tc("#FFF")} />
            </View>
          </View>
        </Pressable>
      </Modal>
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
    shadowOpacity: 0.10,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  cardCompact: { padding: 12 },
  cardBgWrap: { ...StyleSheet.absoluteFillObject },
  cardBgImage: { opacity: 0.44 },
  cardBgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,250,255,0.22)" },
  cardAccentTop: { position: "absolute", left: 0, right: 0, top: 0, height: 4, backgroundColor: BRAND },

  helper: { color: tc("#7A5B4E"), fontSize: 14, lineHeight: 21, fontWeight: "600" },
  label: { color: tc("#6D5144"), fontSize: 13, lineHeight: 18, fontWeight: "600", marginBottom: 6 },
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
  fieldCardBig: {
    backgroundColor: "rgba(255,255,255,0.94)",
    borderWidth: 1.2,
    borderColor: tc("#E2D2C4"),
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
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
  textArea: { minHeight: 88, textAlignVertical: "top" },

  photoActions: { flexDirection: "row", gap: 8, marginBottom: 10 },
  photoButtonWrap: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  photoButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: tc("#E5D3C5"),
    backgroundColor: "rgba(255,255,255,0.86)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    flexDirection: "row",
    gap: 8,
  },
  photoButtonText: { color: tc("#5F463A"), fontSize: 12, lineHeight: 16, fontWeight: "600", textAlign: "center" },

  thumbWrap: { alignSelf: "flex-start", marginBottom: 10 },
  preview: {
    width: 96,
    height: 96,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(233,216,200,0.95)",
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  thumbBadge: {
    position: "absolute",
    right: 8,
    bottom: 8,
    width: 28,
    height: 28,
    borderRadius: 12,
    backgroundColor: "rgba(255,0,102,0.86)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },

  starRow: { flexDirection: "row", gap: 6, marginBottom: 10 },
  starTap: { paddingHorizontal: 2, paddingVertical: 2 },

  primaryButton: {
    marginTop: 4,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: BRAND,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    shadowColor: tc("#B1004A"),
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  primaryButtonText: { color: tc("#FFFFFF"), fontSize: 15, lineHeight: 19, fontWeight: "600" },
  feedback: { marginTop: 10, color: tc("#7A2F4D"), fontSize: 13, lineHeight: 18, fontWeight: "600" },

  statsRow: { flexDirection: "row", gap: 10, marginTop: 2, marginBottom: 8 },
  statChip: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(233,216,200,0.95)",
    backgroundColor: "rgba(255,255,255,0.92)",
    padding: 10,
  },
  statLabel: { color: tc("#7A5B4E"), fontSize: 11, lineHeight: 15, fontWeight: "600" },
  statValue: { color: tc("#4A342A"), fontSize: 14, lineHeight: 18, fontWeight: "600", marginTop: 4 },

  listTitle: { color: tc("#4A342A"), fontSize: 18, lineHeight: 23, fontWeight: "600", marginTop: 10, marginBottom: 8 },
  listTitleCompact: { fontSize: 17, lineHeight: 22 },
  itemCard: {
    borderWidth: 1,
    borderColor: "rgba(233,216,200,0.95)",
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.92)",
    padding: 12,
    marginBottom: 10,
  },
  itemTopRow: { flexDirection: "row", gap: 10, alignItems: "flex-start", justifyContent: "space-between" },
  itemTitle: { color: tc("#4A342A"), fontSize: 15, lineHeight: 20, fontWeight: "600" },
  itemSub: { color: tc("#7A5B4E"), fontSize: 13, lineHeight: 19, marginTop: 2, fontWeight: "600" },
  itemComment: { color: tc("#5F463A"), fontSize: 13, lineHeight: 19, marginTop: 8, fontWeight: "600" },
  itemStarsInline: { flexDirection: "row", gap: 2, alignItems: "center", marginTop: 2 },
  itemThumbWrap: { alignSelf: "flex-start", marginTop: 10 },
  itemPreview: {
    width: 110,
    height: 110,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(233,216,200,0.95)",
    backgroundColor: "rgba(255,255,255,0.9)",
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.60)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    width: "100%",
    maxWidth: 520,
    height: "72%",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(233,216,200,0.95)",
    backgroundColor: "rgba(255,255,255,0.96)",
    overflow: "hidden",
  },
  modalImage: { width: "100%", height: "100%", backgroundColor: "rgba(255,255,255,0.96)" },
  modalCloseWrap: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
})














