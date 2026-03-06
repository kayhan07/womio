import AsyncStorage from "@react-native-async-storage/async-storage"
import { useEffect, useMemo, useState } from "react"
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native"
import { moduleStyles, moduleTheme } from "../../src/theme/moduleStyles"
import { tc } from "../../src/theme/tokens"

type MoodValue = "great" | "good" | "neutral" | "tired" | "stressed"

type MoodEntry = {
  mood: MoodValue
  energy: number
  stress: number
  date: string
}

const moodOptions: { key: MoodValue; label: string }[] = [
  { key: "great", label: "Cok iyi" },
  { key: "good", label: "Iyi" },
  { key: "neutral", label: "Normal" },
  { key: "tired", label: "Yorgun" },
  { key: "stressed", label: "Stresli" },
]

const moodStorageKey = "moodHistory"
const MOOD_HERO_IMAGE_URI = "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=80"
const MOOD_CARD_IMAGE_URI = "https://images.unsplash.com/photo-1519821172141-b5d8a71f4f39?auto=format&fit=crop&w=1200&q=80"

const pickAdvice = (entries: MoodEntry[]) => {
  if (entries.length === 0) return ""

  const recent = entries.slice(0, 3)
  const avgEnergy = recent.reduce((sum, item) => sum + item.energy, 0) / recent.length
  const avgStress = recent.reduce((sum, item) => sum + item.stress, 0) / recent.length
  const hardDays = recent.filter((item) => item.mood === "tired" || item.mood === "stressed").length

  if (hardDays >= 2) return "Son gunlerde zorlandigin gorunuyor. Bugun kendine alan acman faydali olabilir."
  if (avgStress >= 4) return "Stres seviyen yuksek. Kisa bir nefes egzersizi ve 10 dakikalik mola iyi gelebilir."
  if (avgEnergy >= 4) return "Enerjin yuksek. Bugun onemli islerini onceliklendirmek icin uygun bir gun."
  if (avgEnergy <= 2) return "Enerjin dusuk. Programini daha hafif tutup dinlenme payi eklemen iyi olur."

  return "Genel denge iyi gorunuyor. Rutini bozmadan devam edebilirsin."
}

export default function Mood() {
  const { width } = useWindowDimensions()
  const compact = width < 360

  const [selectedMood, setSelectedMood] = useState<MoodValue | null>(null)
  const [energy, setEnergy] = useState<number | null>(null)
  const [stress, setStress] = useState<number | null>(null)
  const [history, setHistory] = useState<MoodEntry[]>([])

  const aiSuggestion = useMemo(() => pickAdvice(history), [history])

  useEffect(() => {
    const loadData = async () => {
      const raw = await AsyncStorage.getItem(moodStorageKey)
      if (!raw) return
      try {
        const parsed = JSON.parse(raw) as MoodEntry[]
        setHistory(Array.isArray(parsed) ? parsed : [])
      } catch {
        setHistory([])
      }
    }

    void loadData()
  }, [])

  const saveMood = async () => {
    if (!selectedMood || energy == null || stress == null) return

    const nextEntry: MoodEntry = {
      mood: selectedMood,
      energy,
      stress,
      date: new Date().toLocaleDateString("tr-TR"),
    }

    const next = [nextEntry, ...history]
    setHistory(next)
    await AsyncStorage.setItem(moodStorageKey, JSON.stringify(next))

    setSelectedMood(null)
    setEnergy(null)
    setStress(null)
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, compact && styles.containerCompact]}>
      <View style={styles.content}>
        <View style={styles.hero}>
          <View pointerEvents="none" style={styles.bgWrap}>
            <ImageBackground source={{ uri: MOOD_HERO_IMAGE_URI }} style={styles.bgWrap} imageStyle={styles.bgImage} />
          </View>
          <View pointerEvents="none" style={styles.bgOverlay} />
          <Text style={[styles.title, compact && styles.titleCompact]}>Ruh Hali Takibi</Text>
          <Text style={[styles.subtitle, compact && styles.subtitleCompact]}>
            Gunluk ruh hali, enerji ve stres puanini kaydet. Uygulama son kayıtlara gore kisa oneriler uretir.
          </Text>
        </View>

        <View style={[styles.card, compact && styles.cardCompact]}>
          <View pointerEvents="none" style={styles.bgWrap}>
            <ImageBackground source={{ uri: MOOD_CARD_IMAGE_URI }} style={styles.bgWrap} imageStyle={styles.bgImage} />
          </View>
          <View pointerEvents="none" style={styles.bgOverlaySoft} />
          <Text style={styles.sectionTitle}>Bugun nasil hissediyorsun?</Text>
          <View style={styles.moodGrid}>
            {moodOptions.map((option) => (
              <Pressable
                key={option.key}
                onPress={() => setSelectedMood(option.key)}
                style={[styles.moodChip, selectedMood === option.key && styles.moodChipActive]}
              >
                <Text style={[styles.moodChipText, selectedMood === option.key && styles.moodChipTextActive]}>{option.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Enerji (1-5)</Text>
          <View style={styles.levelRow}>
            {[1, 2, 3, 4, 5].map((value) => (
              <Pressable key={`e-${value}`} onPress={() => setEnergy(value)} style={[styles.levelButton, energy === value && styles.levelButtonActive]}>
                <Text style={[styles.levelText, energy === value && styles.levelTextActive]}>{value}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Stres (1-5)</Text>
          <View style={styles.levelRow}>
            {[1, 2, 3, 4, 5].map((value) => (
              <Pressable key={`s-${value}`} onPress={() => setStress(value)} style={[styles.levelButton, stress === value && styles.levelButtonActive]}>
                <Text style={[styles.levelText, stress === value && styles.levelTextActive]}>{value}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable style={styles.saveButton} onPress={() => void saveMood()}>
            <Text style={styles.saveText}>Kaydet</Text>
          </Pressable>
        </View>

        <View style={[styles.card, compact && styles.cardCompact]}>
          <View pointerEvents="none" style={styles.bgWrap}>
            <ImageBackground source={{ uri: MOOD_CARD_IMAGE_URI }} style={styles.bgWrap} imageStyle={styles.bgImage} />
          </View>
          <View pointerEvents="none" style={styles.bgOverlaySoft} />
          <Text style={styles.sectionTitle}>Akilli Oneri</Text>
          <View style={styles.aiBox}>
            <Text style={styles.aiText}>{aiSuggestion || "Henüz kayıt yok. İlk kaydını oluştur."}</Text>
          </View>

          <Text style={[styles.sectionTitle, styles.historyTitle]}>Gecmis kayıtlar</Text>
          {history.length === 0 ? (
            <Text style={styles.helper}>kayıt bulunmuyor.</Text>
          ) : (
            history.map((item, index) => (
              <View key={`${item.date}-${index}`} style={styles.historyItem}>
                <Text style={styles.historyText}>
                  {item.date} | {moodOptions.find((m) => m.key === item.mood)?.label ?? item.mood}
                </Text>
                <Text style={styles.historySub}>Enerji: {item.energy} | Stres: {item.stress}</Text>
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    ...moduleStyles.page,
  },
  containerCompact: { ...moduleStyles.pageCompact },
  content: { ...moduleStyles.content },
  hero: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: tc("#E9D8C8"),
    backgroundColor: tc("#FFFDF9"),
    padding: 14,
    marginBottom: 12,
    overflow: "hidden",
    position: "relative",
  },
  bgWrap: { ...StyleSheet.absoluteFillObject },
  bgImage: { opacity: 0.44 },
  bgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,248,241,0.84)" },
  bgOverlaySoft: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,250,245,0.87)" },
  title: { fontSize: 24, lineHeight: 30, color: tc("#4A342A"), fontWeight: "600" },
  titleCompact: { fontSize: 21, lineHeight: 27 },
  subtitle: { marginTop: 6, color: tc("#7A5B4E"), fontSize: 14, lineHeight: 21 },
  subtitleCompact: { fontSize: 13, lineHeight: 19 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: tc("#E9D8C8"),
    backgroundColor: tc("#FFFDF9"),
    padding: 14,
    marginBottom: 12,
    overflow: "hidden",
    position: "relative",
  },
  cardCompact: { padding: 12 },
  sectionTitle: { color: tc("#4A342A"), fontSize: 17, lineHeight: 22, fontWeight: "600", marginBottom: 8 },
  moodGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  moodChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: tc("#E2D0C0"),
    backgroundColor: tc("#FFF7EF"),
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  moodChipActive: { backgroundColor: tc("#E8C3B9"), borderColor: tc("#D9A89C") },
  moodChipText: { color: tc("#5D4438"), fontSize: 13, lineHeight: 18, fontWeight: "600" },
  moodChipTextActive: { color: tc("#402A22"), fontWeight: "600" },
  label: { marginTop: 6, marginBottom: 6, color: tc("#6C4F42"), fontSize: 13, lineHeight: 17, fontWeight: "600" },
  levelRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  levelButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: tc("#E4D2C4"),
    backgroundColor: tc("#FFF7EF"),
    alignItems: "center",
    justifyContent: "center",
  },
  levelButtonActive: { backgroundColor: tc("#E8C3B9"), borderColor: tc("#D9A89C") },
  levelText: { color: tc("#6A4C3F"), fontSize: 14, lineHeight: 18, fontWeight: "600" },
  levelTextActive: { color: tc("#3F2C24") },
  saveButton: {
    marginTop: 6,
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: moduleTheme.colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: { color: tc("#FFFFFF"), fontSize: 15, lineHeight: 19, fontWeight: "600" },
  aiBox: {
    borderWidth: 1,
    borderColor: tc("#E5D5C8"),
    borderRadius: 10,
    backgroundColor: tc("#FFF9F3"),
    padding: 10,
  },
  aiText: { color: tc("#5F463A"), fontSize: 14, lineHeight: 21, fontWeight: "500" },
  historyTitle: { marginTop: 12 },
  helper: { color: tc("#7A5B4E"), fontSize: 14, lineHeight: 21, fontWeight: "500" },
  historyItem: {
    borderWidth: 1,
    borderColor: tc("#E9D8C8"),
    borderRadius: 10,
    backgroundColor: tc("#FFF9F3"),
    padding: 10,
    marginTop: 8,
  },
  historyText: { color: tc("#4A342A"), fontSize: 14, lineHeight: 20, fontWeight: "600" },
  historySub: { marginTop: 2, color: tc("#6F5448"), fontSize: 13, lineHeight: 18, fontWeight: "500" },
})











