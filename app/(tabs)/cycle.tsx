import { Ionicons } from "@expo/vector-icons"
import { ImageBackground, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native"
import { t, useAppLanguage } from "@/src/core/i18n"
import { moduleStyles } from "@/src/theme/moduleStyles"
import { tc } from "@/src/theme/tokens"

const CYCLE_HERO_IMAGE_URI = "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80"
const CYCLE_CARD_IMAGE_URI = "https://images.unsplash.com/photo-1559757175-5700dde675bc?auto=format&fit=crop&w=1200&q=80"

export default function Cycle() {
  const { width } = useWindowDimensions()
  const compact = width < 360
  const { language, ready } = useAppLanguage()

  if (!ready) return <View style={styles.container} />

  return (
    <ScrollView contentContainerStyle={[styles.container, compact && styles.containerCompact]}>
      <View style={styles.content}>
        <View style={styles.hero}>
          <View pointerEvents="none" style={styles.bgWrap}>
            <ImageBackground source={{ uri: CYCLE_HERO_IMAGE_URI }} style={styles.bgWrap} imageStyle={styles.bgImage} />
          </View>
          <View pointerEvents="none" style={styles.bgOverlay} />
          <View style={styles.badge}>
            <Ionicons name="calendar" size={14} color={tc("#5E4032")} />
            <Text style={styles.badgeText}>{t("tabHealth", language)}</Text>
          </View>
          <Text style={[styles.title, compact && styles.titleCompact]}>Regl ve DÃ¶ngÃ¼ Takibi</Text>
          <Text style={[styles.subtitle, compact && styles.subtitleCompact]}>
            Bu ekran yakÄ±nda saÄŸlÄ±k modÃ¼lÃ¼ndeki dÃ¶ngÃ¼ takibi ile birleÅŸtirilecek.
          </Text>
        </View>

        <View style={styles.card}>
          <View pointerEvents="none" style={styles.bgWrap}>
            <ImageBackground source={{ uri: CYCLE_CARD_IMAGE_URI }} style={styles.bgWrap} imageStyle={styles.bgImage} />
          </View>
          <View pointerEvents="none" style={styles.bgOverlaySoft} />
          <Text style={[styles.cardTitle, compact && styles.cardTitleCompact]}>Planlanan Alanlar</Text>
          <Text style={[styles.item, compact && styles.itemCompact]}>- Son adet tarihi ve tahmini sonraki tarih</Text>
          <Text style={[styles.item, compact && styles.itemCompact]}>- Hamile kalma olasÄ±lÄ±ÄŸÄ± yÃ¼ksek gÃ¼nler</Text>
          <Text style={[styles.item, compact && styles.itemCompact]}>- Bildirim ve takvim senkronu</Text>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { ...moduleStyles.page },
  containerCompact: { ...moduleStyles.pageCompact },
  content: { ...moduleStyles.content },
  hero: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: tc("#E9D8C8"),
    backgroundColor: tc("#FFFDF9"),
    padding: 14,
    overflow: "hidden",
    position: "relative",
  },
  bgWrap: { ...StyleSheet.absoluteFillObject },
  bgImage: { opacity: 0.44 },
  bgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,248,241,0.84)" },
  bgOverlaySoft: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,250,245,0.87)" },
  badge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: tc("#F3E7DC"),
    borderWidth: 1,
    borderColor: tc("#E7D4C4"),
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 8,
  },
  badgeText: { color: tc("#5E4032"), fontSize: 12, lineHeight: 16, fontWeight: "600" },
  title: {
    color: tc("#4A342A"),
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "600",
  },
  titleCompact: { fontSize: 21, lineHeight: 27 },
  subtitle: {
    marginTop: 6,
    color: tc("#7A5B4E"),
    fontSize: 15,
    lineHeight: 22,
  },
  subtitleCompact: { fontSize: 14, lineHeight: 20 },
  card: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: tc("#E9D8C8"),
    borderRadius: 12,
    backgroundColor: tc("#FFF9F4"),
    padding: 12,
    overflow: "hidden",
    position: "relative",
  },
  cardTitle: {
    color: tc("#4A342A"),
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "600",
    marginBottom: 6,
  },
  cardTitleCompact: { fontSize: 16, lineHeight: 20 },
  item: {
    color: tc("#6E5246"),
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 4,
    fontWeight: "500",
  },
  itemCompact: { fontSize: 13, lineHeight: 19 },
})










