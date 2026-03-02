import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { useEffect, useMemo, useRef } from "react"
import { Animated, ImageBackground, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native"
import { t, useAppLanguage } from "@/src/core/i18n"
import { SectionHeader } from "@/src/modules/shopping/ui/SectionHeader"
import { moduleStyles, moduleTheme } from "@/src/theme/moduleStyles"
import { tc } from "@/src/theme/tokens"
import { cardMotionStyle, ensureEnterAnimArray, getOrCreatePressAnim, pressIn, pressOut, runStaggerEnter } from "@/src/ui/motion"

const BRAND = moduleTheme.colors.brand

const cardImages = {
  daily: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1200&q=80",
  compatibility: "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=1200&q=80",
  tarot: "https://images.unsplash.com/photo-1518562180175-34a163b1a9a6?auto=format&fit=crop&w=1200&q=80",
  coffee: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80",
} as const

export default function AstrologyHubScreen() {
  const router = useRouter()
  const { width } = useWindowDimensions()
  const compact = width < 360
  const { language, ready } = useAppLanguage()
  const enterAnims = useRef<Animated.Value[]>([])
  const pressAnims = useRef<Record<string, Animated.Value>>({})

  const cardKeys = ["daily", "compatibility", "tarot", "coffee"] as const

  const getPressAnim = (id: string) => {
    return getOrCreatePressAnim(pressAnims, id)
  }

  useMemo(() => {
    return ensureEnterAnimArray(enterAnims, cardKeys.length)
  }, [])

  useEffect(() => {
    runStaggerEnter(enterAnims)
  }, [])

  if (!ready) return <View style={styles.container} />

  return (
    <ScrollView contentContainerStyle={[styles.container, compact && styles.containerCompact]} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>

        <SectionHeader
          title={t("astrologyTitle", language)}
          subtitle={t("astrologySubtitle", language)}
          compact={compact}
        />

        <Animated.View
          style={cardMotionStyle(enterAnims.current[0]!, getPressAnim("daily"), 14)}
        >
        <Pressable
          style={[styles.card, styles.cardPink]}
          onPressIn={() => pressIn(getPressAnim("daily"))}
          onPressOut={() => pressOut(getPressAnim("daily"))}
          onPress={() => router.push("/(tabs)/astrology/daily")}
        >
          <View pointerEvents="none" style={styles.cardBgWrap}>
            <ImageBackground source={{ uri: cardImages.daily }} style={styles.cardBgWrap} imageStyle={styles.cardBgImage} />
          </View>
          <View pointerEvents="none" style={styles.cardBgOverlay} />
          <View pointerEvents="none" style={styles.cardShine} />
          <View pointerEvents="none" style={styles.cardAccentTop} />
          <View style={styles.cardRow}>
            <View style={styles.cardLeft}>
              <View style={styles.iconWrap}><Ionicons name="sunny" size={18} color={tc("#4A342A")} /></View>
              <View style={styles.cardCopy}>
                <Text style={[styles.cardTitle, compact && styles.cardTitleCompact]}>{"G\u00fcnl\u00fck Bur\u00e7 Yorumu"}</Text>
                <Text style={styles.cardDesc}>{"Enerji, a\u015fk, para, kariyer ve ruh hali g\u00f6r\u00fcn\u00fcm\u00fc."}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={tc("#4A342A")} />
          </View>
        </Pressable>
        </Animated.View>

        <Animated.View
          style={cardMotionStyle(enterAnims.current[1]!, getPressAnim("compatibility"), 14)}
        >
        <Pressable
          style={[styles.card, styles.cardBlue]}
          onPressIn={() => pressIn(getPressAnim("compatibility"))}
          onPressOut={() => pressOut(getPressAnim("compatibility"))}
          onPress={() => router.push("/(tabs)/astrology/compatibility")}
        >
          <View pointerEvents="none" style={styles.cardBgWrap}>
            <ImageBackground
              source={{ uri: cardImages.compatibility }}
              style={styles.cardBgWrap}
              imageStyle={styles.cardBgImage}
            />
          </View>
          <View pointerEvents="none" style={styles.cardBgOverlay} />
          <View pointerEvents="none" style={styles.cardShine} />
          <View pointerEvents="none" style={styles.cardAccentTop} />
          <View style={styles.cardRow}>
            <View style={styles.cardLeft}>
              <View style={styles.iconWrap}><Ionicons name="heart" size={18} color={tc("#4A342A")} /></View>
              <View style={styles.cardCopy}>
                <Text style={[styles.cardTitle, compact && styles.cardTitleCompact]}>{"Bur\u00e7 Uyumu"}</Text>
                <Text style={styles.cardDesc}>{"Partner burcuna g\u00f6re uyum puan\u0131 ve k\u0131sa yorum."}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={tc("#4A342A")} />
          </View>
        </Pressable>
        </Animated.View>

        <Animated.View
          style={cardMotionStyle(enterAnims.current[2]!, getPressAnim("tarot"), 14)}
        >
        <Pressable
          style={[styles.card, styles.cardGreen]}
          onPressIn={() => pressIn(getPressAnim("tarot"))}
          onPressOut={() => pressOut(getPressAnim("tarot"))}
          onPress={() => router.push("/(tabs)/astrology/tarot")}
        >
          <View pointerEvents="none" style={styles.cardBgWrap}>
            <ImageBackground source={{ uri: cardImages.tarot }} style={styles.cardBgWrap} imageStyle={styles.cardBgImage} />
          </View>
          <View pointerEvents="none" style={styles.cardBgOverlay} />
          <View pointerEvents="none" style={styles.cardShine} />
          <View pointerEvents="none" style={styles.cardAccentTop} />
          <View style={styles.cardRow}>
            <View style={styles.cardLeft}>
              <View style={styles.iconWrap}><Ionicons name="albums" size={18} color={tc("#4A342A")} /></View>
              <View style={styles.cardCopy}>
                <Text style={[styles.cardTitle, compact && styles.cardTitleCompact]}>{"Tarot Fal\u0131"}</Text>
                <Text style={styles.cardDesc}>{"3 kart se\u00e7, kartlar d\u00f6nerek a\u00e7\u0131ls\u0131n ve yorumunu al."}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={tc("#4A342A")} />
          </View>
        </Pressable>
        </Animated.View>

        <Animated.View
          style={cardMotionStyle(enterAnims.current[3]!, getPressAnim("coffee"), 14)}
        >
        <Pressable
          style={[styles.card, styles.cardBeige]}
          onPressIn={() => pressIn(getPressAnim("coffee"))}
          onPressOut={() => pressOut(getPressAnim("coffee"))}
          onPress={() => router.push("/(tabs)/astrology/coffee")}
        >
          <View pointerEvents="none" style={styles.cardBgWrap}>
            <ImageBackground source={{ uri: cardImages.coffee }} style={styles.cardBgWrap} imageStyle={styles.cardBgImage} />
          </View>
          <View pointerEvents="none" style={styles.cardBgOverlay} />
          <View pointerEvents="none" style={styles.cardShine} />
          <View pointerEvents="none" style={styles.cardAccentTop} />
          <View style={styles.cardRow}>
            <View style={styles.cardLeft}>
              <View style={styles.iconWrap}><Ionicons name="cafe" size={18} color={tc("#4A342A")} /></View>
              <View style={styles.cardCopy}>
                <Text style={[styles.cardTitle, compact && styles.cardTitleCompact]}>{"Kahve Fal\u0131"}</Text>
                <Text style={styles.cardDesc}>{"1-3 foto\u011fraf y\u00fckle, fincan do\u011frulans\u0131n ve yorum gelsin."}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={tc("#4A342A")} />
          </View>
        </Pressable>
        </Animated.View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    ...moduleStyles.page,
  },
  containerCompact: { ...moduleStyles.pageCompact },
  content: {
    ...moduleStyles.content,
  },
  card: {
    marginTop: 12,
    borderRadius: moduleTheme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
    ...moduleTheme.shadow.card,
  },
  cardBgWrap: { ...StyleSheet.absoluteFillObject },
  cardBgImage: { opacity: 0.44 },
  cardBgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,250,255,0.22)" },
  cardShine: {
    position: "absolute",
    top: -34,
    right: -28,
    width: 120,
    height: 120,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.20)",
  },
  cardAccentTop: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 4,
    backgroundColor: BRAND,
  },
  cardRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  cardLeft: { flexDirection: "row", alignItems: "flex-start", gap: 10, flex: 1 },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.82)",
    borderWidth: 1,
    borderColor: "rgba(61,42,79,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  cardCopy: { flex: 1 },
  cardTitle: { color: moduleTheme.colors.textStrong, fontSize: 22, lineHeight: 28, fontWeight: "600" },
  cardTitleCompact: { fontSize: 19, lineHeight: 24 },
  cardDesc: { marginTop: 4, color: moduleTheme.colors.textMuted, fontSize: 12, lineHeight: 17, fontWeight: "500" },
  cardPink: { backgroundColor: tc("#F2D2CC"), borderColor: tc("#E6B9B0") },
  cardBlue: { backgroundColor: tc("#E8D8CE"), borderColor: tc("#D8C5B9") },
  cardGreen: { backgroundColor: tc("#E6DECC"), borderColor: tc("#D3C8B2") },
  cardBeige: { backgroundColor: tc("#F2E1C8"), borderColor: tc("#E2CFAF") },
})




















