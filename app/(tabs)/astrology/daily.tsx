import AsyncStorage from "@react-native-async-storage/async-storage"
import { useEffect, useMemo, useState } from "react"
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native"
import { moduleStyles, moduleTheme } from "@/src/theme/moduleStyles"
import { tc } from "@/src/theme/tokens"

const DAILY_IMAGE_URI = "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1200&q=80"
const USER_PROFILE_KEY = "womio:userProfile"

const signs = ["Koç", "Boğa", "İkizler", "Yengeç", "Aslan", "Başak", "Terazi", "Akrep", "Yay", "Oğlak", "Kova", "Balık"]

const dayTexts = {
  energy: ["yüksek", "dengeli", "odaklı", "sakin", "hareketli"],
  love: ["iletişim artıyor", "empati iyi gelir", "netlik kazandırır", "romantik bir akış var", "sakin kalmak avantajlı"],
  money: ["bütçeyi korumak faydalı", "küçük fırsatlar var", "ani harcamalara dikkat", "planlı ilerlemek iyi", "karşılaştırma yapmak kazandırır"],
  career: ["toplantılar verimli geçebilir", "yeni fikirler öne çıkıyor", "detaylarda güçlüsün", "öncelik belirlemek gerekli", "iş birliği avantajlı"],
  mood: ["motivasyon", "denge", "merak", "özgüven", "sakinlik"],
}

const parseBirthDate = (input: string) => {
  const m = input.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return null
  const day = Number(m[1])
  const month = Number(m[2])
  if (day < 1 || day > 31 || month < 1 || month > 12) return null
  return { day, month }
}

const signFromDayMonth = (day: number, month: number) => {
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return "Koç"
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return "Boğa"
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return "İkizler"
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return "Yengeç"
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return "Aslan"
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return "Başak"
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return "Terazi"
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return "Akrep"
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return "Yay"
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return "Oğlak"
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return "Kova"
  return "Balık"
}

const getDayOfYear = (d: Date) => {
  const start = new Date(d.getFullYear(), 0, 0)
  const diff = d.getTime() - start.getTime()
  return Math.floor(diff / 86400000)
}

export default function AstrologyDailyScreen() {
  const { width } = useWindowDimensions()
  const compact = width < 360
  const [selectedSign, setSelectedSign] = useState(signs[0])

  useEffect(() => {
    const loadFromProfile = async () => {
      const raw = await AsyncStorage.getItem(USER_PROFILE_KEY)
      if (!raw) return
      try {
        const profile = JSON.parse(raw) as { birthDate?: string }
        if (!profile.birthDate) return
        const parsed = parseBirthDate(profile.birthDate)
        if (!parsed) return
        setSelectedSign(signFromDayMonth(parsed.day, parsed.month))
      } catch {
        // ignore
      }
    }
    void loadFromProfile()
  }, [])

  const daily = useMemo(() => {
    const daySeed = getDayOfYear(new Date())
    const signSeed = Math.max(0, signs.indexOf(selectedSign))
    const pick = (arr: string[], offset: number) => arr[(daySeed + signSeed + offset) % arr.length]
    return {
      energy: pick(dayTexts.energy, 0),
      love: pick(dayTexts.love, 1),
      money: pick(dayTexts.money, 2),
      career: pick(dayTexts.career, 3),
      mood: pick(dayTexts.mood, 4),
    }
  }, [selectedSign])

  const dailyComment = useMemo(
    () =>
      `Bugün ${selectedSign} burcu için genel enerji ${daily.energy}. Aşk tarafında ${daily.love}. Para konusunda ${daily.money}. Kariyerde ${daily.career}. Günün ruh hali: ${daily.mood}.`,
    [daily, selectedSign]
  )

  return (
    <ScrollView contentContainerStyle={[styles.container, compact && styles.containerCompact]}>
      <View style={styles.content}>
        <View style={styles.card}>
          <View pointerEvents="none" style={styles.bgWrap}>
            <ImageBackground source={{ uri: DAILY_IMAGE_URI }} style={styles.bgWrap} imageStyle={styles.bgImage} />
          </View>
          <View pointerEvents="none" style={styles.bgOverlay} />

          <Text style={[styles.title, compact && styles.titleCompact]}>Günlük Burç Yorumu</Text>
          <Text style={styles.subtitle}>Burcun otomatik seçilir, yorum metni her gün yenilenir.</Text>

          <View style={styles.rowWrap}>
            {signs.map((sign) => (
              <Pressable key={sign} style={[styles.chip, selectedSign === sign && styles.chipActive]} onPress={() => setSelectedSign(sign)}>
                <Text style={[styles.chipText, selectedSign === sign && styles.chipTextActive]}>{sign}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.resultBox}>
            <Text style={styles.resultTitle}>Bugünün Yorumu</Text>
            <Text style={styles.resultParagraph}>{dailyComment}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { ...moduleStyles.page },
  containerCompact: { ...moduleStyles.pageCompact },
  content: { ...moduleStyles.content },
  card: { backgroundColor: moduleTheme.colors.surface, borderWidth: 1, borderColor: moduleTheme.colors.border, borderRadius: 14, padding: 14, overflow: "hidden", position: "relative" },
  bgWrap: { ...StyleSheet.absoluteFillObject },
  bgImage: { opacity: 0.44 },
  bgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,249,242,0.72)" },
  title: { color: moduleTheme.colors.textStrong, fontSize: 20, lineHeight: 26, fontWeight: "600" },
  titleCompact: { fontSize: 18, lineHeight: 24 },
  subtitle: { marginTop: 4, marginBottom: 10, color: moduleTheme.colors.textMuted, fontSize: 13, lineHeight: 18, fontWeight: "600" },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, backgroundColor: tc("#FFF5EE"), borderWidth: 1, borderColor: tc("#E9D4C8") },
  chipActive: { backgroundColor: tc("#FFE0EC"), borderColor: tc("#FF9EC3") },
  chipText: { color: tc("#5E4032"), fontSize: 13, lineHeight: 18, fontWeight: "600" },
  chipTextActive: { color: tc("#4A2735"), fontWeight: "600" },
  resultBox: { borderWidth: 1, borderColor: tc("#EAD9CD"), borderRadius: 10, backgroundColor: "rgba(255,255,255,0.92)", padding: 10 },
  resultTitle: { color: tc("#5A3F32"), fontSize: 14, lineHeight: 19, fontWeight: "600", marginBottom: 6 },
  resultParagraph: { color: tc("#4F392E"), fontSize: 14, lineHeight: 22, fontWeight: "600" },
})












