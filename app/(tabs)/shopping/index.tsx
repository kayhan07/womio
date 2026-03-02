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
  experience: "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1200&q=80",
  market: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80",
  compare: "https://images.unsplash.com/photo-1556742031-c6961e8560b0?auto=format&fit=crop&w=1200&q=80",
  sell: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80",
} as const

export default function ShoppingHubScreen() {
  const router = useRouter()
  const { width } = useWindowDimensions()
  const compact = width < 360
  const { language, ready } = useAppLanguage()
  const enterAnims = useRef<Animated.Value[]>([])
  const pressAnims = useRef<Record<string, Animated.Value>>({})

  const cardKeys = ["experience", "market", "compare", "sell"] as const

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
    <ScrollView contentContainerStyle={[styles.container, compact && styles.containerCompact]}>
      <View style={styles.content}>

        <SectionHeader
          title={t("shoppingHubTitle", language)}
          subtitle={t("shoppingHubSubtitle", language)}
          compact={compact}
        />

        <Animated.View
          style={cardMotionStyle(enterAnims.current[0]!, getPressAnim("experience"), 14)}
        >
        <Pressable
          style={[styles.card, styles.cardPink]}
          onPressIn={() => pressIn(getPressAnim("experience"))}
          onPressOut={() => pressOut(getPressAnim("experience"))}
          onPress={() => router.push("/(tabs)/shopping/experience")}
        >
          <View pointerEvents="none" style={styles.cardBgWrap}>
            <ImageBackground
              source={{ uri: cardImages.experience }}
              style={styles.cardBgWrap}
              imageStyle={styles.cardBgImage}
            />
          </View>
          <View pointerEvents="none" style={styles.cardBgOverlay} />
          <View pointerEvents="none" style={styles.cardGradientTop} />
          <View pointerEvents="none" style={styles.cardGradientBottom} />
          <View pointerEvents="none" style={styles.cardShine} />
          <View pointerEvents="none" style={styles.cardAccentTop} />
          <View style={styles.cardRow}>
            <View style={styles.cardLeft}>
              <View style={styles.iconWrap}><Ionicons name="chatbubble-ellipses" size={18} color={tc("#4A342A")} /></View>
              <View style={styles.cardCopy}>
                <Text style={[styles.cardTitle, compact && styles.cardTitleCompact]}>{t("shoppingSectionExperience", language)}</Text>
                <Text style={styles.cardDesc}>{t("shoppingSectionExperienceDesc", language)}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={tc("#4A342A")} />
          </View>
        </Pressable>
        </Animated.View>

        <Animated.View
          style={cardMotionStyle(enterAnims.current[1]!, getPressAnim("market"), 14)}
        >
        <Pressable
          style={[styles.card, styles.cardBlue]}
          onPressIn={() => pressIn(getPressAnim("market"))}
          onPressOut={() => pressOut(getPressAnim("market"))}
          onPress={() => router.push("/(tabs)/shopping/market")}
        >
          <View pointerEvents="none" style={styles.cardBgWrap}>
            <ImageBackground
              source={{ uri: cardImages.market }}
              style={styles.cardBgWrap}
              imageStyle={styles.cardBgImage}
            />
          </View>
          <View pointerEvents="none" style={styles.cardBgOverlay} />
          <View pointerEvents="none" style={styles.cardGradientTop} />
          <View pointerEvents="none" style={styles.cardGradientBottom} />
          <View pointerEvents="none" style={styles.cardShine} />
          <View pointerEvents="none" style={styles.cardAccentTop} />
          <View style={styles.cardRow}>
            <View style={styles.cardLeft}>
              <View style={styles.iconWrap}><Ionicons name="list" size={18} color={tc("#4A342A")} /></View>
              <View style={styles.cardCopy}>
                <Text style={[styles.cardTitle, compact && styles.cardTitleCompact]}>{t("shoppingSectionMarket", language)}</Text>
                <Text style={styles.cardDesc}>{t("shoppingSectionMarketDesc", language)}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={tc("#4A342A")} />
          </View>
        </Pressable>
        </Animated.View>

        <Animated.View
          style={cardMotionStyle(enterAnims.current[2]!, getPressAnim("compare"), 14)}
        >
        <Pressable
          style={[styles.card, styles.cardGreen]}
          onPressIn={() => pressIn(getPressAnim("compare"))}
          onPressOut={() => pressOut(getPressAnim("compare"))}
          onPress={() => router.push("/(tabs)/shopping/compare")}
        >
          <View pointerEvents="none" style={styles.cardBgWrap}>
            <ImageBackground
              source={{ uri: cardImages.compare }}
              style={styles.cardBgWrap}
              imageStyle={styles.cardBgImage}
            />
          </View>
          <View pointerEvents="none" style={styles.cardBgOverlay} />
          <View pointerEvents="none" style={styles.cardGradientTop} />
          <View pointerEvents="none" style={styles.cardGradientBottom} />
          <View pointerEvents="none" style={styles.cardShine} />
          <View pointerEvents="none" style={styles.cardAccentTop} />
          <View style={styles.cardRow}>
            <View style={styles.cardLeft}>
              <View style={styles.iconWrap}><Ionicons name="swap-horizontal" size={18} color={tc("#4A342A")} /></View>
              <View style={styles.cardCopy}>
                <Text style={[styles.cardTitle, compact && styles.cardTitleCompact]}>{t("shoppingSectionCompare", language)}</Text>
                <Text style={styles.cardDesc}>{t("shoppingSectionCompareDesc", language)}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={tc("#4A342A")} />
          </View>
        </Pressable>
        </Animated.View>

        <Animated.View
          style={cardMotionStyle(enterAnims.current[3]!, getPressAnim("sell"), 14)}
        >
        <Pressable
          style={[styles.card, styles.cardBeige]}
          onPressIn={() => pressIn(getPressAnim("sell"))}
          onPressOut={() => pressOut(getPressAnim("sell"))}
          onPress={() => router.push("/(tabs)/shopping/sell")}
        >
          <View pointerEvents="none" style={styles.cardBgWrap}>
            <ImageBackground
              source={{ uri: cardImages.sell }}
              style={styles.cardBgWrap}
              imageStyle={styles.cardBgImage}
            />
          </View>
          <View pointerEvents="none" style={styles.cardBgOverlay} />
          <View pointerEvents="none" style={styles.cardGradientTop} />
          <View pointerEvents="none" style={styles.cardGradientBottom} />
          <View pointerEvents="none" style={styles.cardShine} />
          <View pointerEvents="none" style={styles.cardAccentTop} />
          <View style={styles.cardRow}>
            <View style={styles.cardLeft}>
              <View style={styles.iconWrap}><Ionicons name="pricetag" size={18} color={tc("#4A342A")} /></View>
              <View style={styles.cardCopy}>
                <Text style={[styles.cardTitle, compact && styles.cardTitleCompact]}>{t("shoppingSectionSell", language)}</Text>
                <Text style={styles.cardDesc}>{t("shoppingSectionSellDesc", language)}</Text>
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
  cardGradientTop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.16)",
    top: 0,
    bottom: "52%",
  },
  cardGradientBottom: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(88,48,109,0.09)",
    top: "52%",
    bottom: 0,
  },
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


















