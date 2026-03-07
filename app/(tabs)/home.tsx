import { router } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  Animated,
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native"
import { Image as ExpoImage } from "expo-image"
import { t, useAppLanguage } from "../../src/core/i18n"
import { moduleRegistry } from "../../src/modules/registry"
import { SectionHeader } from "../../src/components/ui/SectionHeader"
import { AdSlot } from "../../src/components/monetization/AdSlot"
import { defaultAdminConfig, loadAdminConfig } from "../../src/modules/monetization/adminConfig"
import { moduleStyles, moduleTheme } from "../../src/theme/moduleStyles"
import { tc } from "../../src/theme/tokens"
import { cardMotionStyle, ensureEnterAnimArray, getOrCreatePressAnim, pressIn, pressOut, runStaggerEnter } from "../../src/ui/motion"

const BRAND = moduleTheme.colors.brand
const HERO_BG_SOURCE = require("../../assets/back2.png")

const moduleImages: Record<string, string> = {
  health: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=900&q=80",
  jobs: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=900&q=80",
  shopping: "https://images.unsplash.com/photo-1579113800032-c38bd7635818?auto=format&fit=crop&w=900&q=80",
  food: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80",
  astrology: "https://images.unsplash.com/photo-1515942661900-94b3d1972591?auto=format&fit=crop&w=900&q=80",
  photoLab: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80",
}

const moduleOverlays: Record<string, string> = {
  health: "rgba(255,249,242,0.24)",
  jobs: "rgba(255,249,242,0.24)",
  shopping: "rgba(255,249,242,0.26)",
  food: "rgba(255,249,242,0.26)",
  astrology: "rgba(255,249,242,0.30)",
  photoLab: "rgba(255,243,248,0.30)",
}

export default function Home() {
  const { language, ready } = useAppLanguage()
  const { width } = useWindowDimensions()
  const compact = width < 360
  const isTr = language === "tr"
  const [moduleFlags, setModuleFlags] = useState(defaultAdminConfig.modules)
  const cardEnterAnims = useRef<Animated.Value[]>([])
  const pressAnims = useRef<Record<string, Animated.Value>>({})

  useEffect(() => {
    let mounted = true
    const load = async () => {
      const cfg = await loadAdminConfig()
      if (mounted) setModuleFlags(cfg.modules)
    }
    void load()
    const timer = setInterval(() => void load(), 2500)
    return () => {
      mounted = false
      clearInterval(timer)
    }
  }, [])

  const visibleModules = moduleRegistry.filter((m) => {
    if (m.id === "health") return moduleFlags.health
    if (m.id === "jobs") return moduleFlags.services
    if (m.id === "shopping") return moduleFlags.shopping
    if (m.id === "food") return moduleFlags.food
    return moduleFlags.astrology
  })

  const getPressAnim = (id: string) => {
    return getOrCreatePressAnim(pressAnims, id)
  }

  useMemo(() => {
    return ensureEnterAnimArray(cardEnterAnims, visibleModules.length)
  }, [visibleModules.length])

  useEffect(() => {
    runStaggerEnter(cardEnterAnims)
  }, [visibleModules.length])

  if (!ready) {
    return <View style={styles.container} />
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, compact && styles.containerCompact]}>
      <View style={styles.content}>

        <View style={styles.hero}>
          <View pointerEvents="none" style={styles.heroBgWrap}>
            <ExpoImage source={HERO_BG_SOURCE} style={styles.heroBgWrap} contentFit="cover" contentPosition="center" />
          </View>
          <View pointerEvents="none" style={styles.heroBgOverlay} />
          <View style={styles.heroBadge}>
            <Ionicons name="diamond" size={12} color={tc("#7A2E56")} />
            <Text style={styles.heroBadgeText}>WOMIO PREMIUM</Text>
          </View>
          <Image source={require("../../assets/logo.png")} style={[styles.heroLogo, compact && styles.heroLogoCompact]} />
          <Text style={styles.heroTitle}>{isTr ? "Dijital Asistanın" : "Your Digital Companion"}</Text>
          <Text style={[styles.tagline, compact && styles.taglineCompact]}>
            {t("appTagline", language)}
          </Text>
          <View style={styles.heroMetaRow}>
            <View style={styles.heroMetaPill}>
              <Ionicons name="sparkles" size={12} color={tc("#6E3B86")} />
              <Text style={styles.heroMetaText}>{isTr ? "Premium Deneyim" : "Premium Experience"}</Text>
            </View>
            <View style={styles.heroMetaPill}>
              <Ionicons name="shield-checkmark" size={12} color={tc("#6E3B86")} />
              <Text style={styles.heroMetaText}>{isTr ? "Güvenli Altyapı" : "Secure Core"}</Text>
            </View>
          </View>
        </View>

        <SectionHeader title={t("modulesTitle", language)} />
        <AdSlot
          placementKey="homeTop"
          compact={compact}
          title={isTr ? "WOMIO Reklam Alanı" : "WOMIO Ad Slot"}
          subtitle={isTr ? "Google reklam entegrasyonu için hazır alan" : "Reserved for Google ads integration"}
        />

        {visibleModules.map((module, index) => {
          const enter = cardEnterAnims.current[index]!
          const press = getPressAnim(module.id)
          return (
          <Animated.View
            key={module.id}
            style={cardMotionStyle(enter, press, 14)}
          >
          <Pressable
            style={[
              styles.card,
              compact && styles.cardCompact,
              { backgroundColor: module.color },
            ]}
            onPressIn={() => {
              pressIn(press)
            }}
            onPressOut={() => {
              pressOut(press)
            }}
            onPress={() => router.push(module.route as never)}
          >
            <View pointerEvents="none" style={styles.cardBgWrap}>
              <ImageBackground source={{ uri: moduleImages[module.id] }} style={styles.cardBgWrap} imageStyle={styles.cardBgImage} />
            </View>
            <View pointerEvents="none" style={[styles.cardBgOverlay, { backgroundColor: moduleOverlays[module.id] }]} />
            <View pointerEvents="none" style={styles.cardGradientTop} />
            <View pointerEvents="none" style={styles.cardGradientBottom} />
            <View pointerEvents="none" style={styles.cardShine} />
            <View pointerEvents="none" style={styles.cardAccentTop} />
            <View style={styles.cardRow}>
              <View style={styles.cardLeft}>
                <View style={styles.iconWrap}>
                  <Ionicons
                    name={
                      module.id === "health"
                        ? "heart"
                        : module.id === "jobs"
                          ? "briefcase"
                          : module.id === "shopping"
                            ? "cart"
                            : module.id === "food"
                              ? "restaurant"
                            : "moon"
                    }
                    size={19}
                    color={moduleTheme.colors.textStrong}
                  />
                </View>
                <View style={styles.cardCopy}>
                  <Text style={[styles.cardTitle, compact && styles.cardTitleCompact]}>
                    {t(module.id, language)}
                  </Text>
                  <Text style={[styles.cardSubtitle, compact && styles.cardSubtitleCompact]}>
                    {t(`${module.id}CardDesc`, language)}
                  </Text>
                  <Text style={styles.cardCta}>{isTr ? "Hemen Aç" : "Open Now"}</Text>
                </View>
              </View>
              <View style={styles.arrowWrap}>
                <Ionicons name="chevron-forward" size={18} color={moduleTheme.colors.textStrong} />
              </View>
            </View>
          </Pressable>
          </Animated.View>
        )})}

        <Pressable
          style={[
            styles.card,
            compact && styles.cardCompact,
            { backgroundColor: tc("#FFF3F8") },
          ]}
          onPress={() => router.push("/(tabs)/photo-lab" as never)}
        >
          <View pointerEvents="none" style={styles.cardBgWrap}>
            <ImageBackground source={{ uri: moduleImages.photoLab }} style={styles.cardBgWrap} imageStyle={styles.cardBgImage} />
          </View>
          <View pointerEvents="none" style={[styles.cardBgOverlay, { backgroundColor: moduleOverlays.photoLab }]} />
          <View pointerEvents="none" style={styles.cardGradientTop} />
          <View pointerEvents="none" style={styles.cardGradientBottom} />
          <View pointerEvents="none" style={styles.cardShine} />
          <View pointerEvents="none" style={styles.cardAccentTop} />
          <View style={styles.cardRow}>
            <View style={styles.cardLeft}>
              <View style={styles.iconWrap}>
                <Ionicons name="sparkles" size={19} color={moduleTheme.colors.textStrong} />
              </View>
              <View style={styles.cardCopy}>
                <Text style={[styles.cardTitle, compact && styles.cardTitleCompact]}>
                  {isTr ? "Güzellik Stüdyosu" : "Beauty Studio"}
                </Text>
                <Text style={[styles.cardSubtitle, compact && styles.cardSubtitleCompact]}>
                  {isTr ? "Selfie düzenle, görünüm dene, kaydet ve paylaş." : "Refine selfies, try a look, save and share."}
                </Text>
                <Text style={styles.cardCta}>{isTr ? "Hemen Aç" : "Open Now"}</Text>
              </View>
            </View>
            <View style={styles.arrowWrap}>
              <Ionicons name="chevron-forward" size={18} color={moduleTheme.colors.textStrong} />
            </View>
          </View>
        </Pressable>

        <AdSlot
          placementKey="homeBottom"
          compact={compact}
          title={isTr ? "Önerilen Markalar" : "Recommended Brands"}
          subtitle={isTr ? "Bu alan dinamik sponsorlu kartlar için kullanılacak" : "This area will host dynamic sponsored cards"}
          ctaLabel={isTr ? "Sponsorlu" : "Sponsored"}
        />
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    ...moduleStyles.page,
    padding: 20,
  },
  containerCompact: {
    ...moduleStyles.pageCompact,
    padding: 16,
  },
  content: {
    ...moduleStyles.content,
  },
  hero: {
    width: "100%",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: moduleTheme.colors.border,
    backgroundColor: moduleTheme.colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minHeight: 196,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "stretch",
    overflow: "hidden",
    shadowColor: tc("#3B2418"),
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  heroBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,236,247,0.95)",
    borderWidth: 1,
    borderColor: "rgba(255,0,102,0.24)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 6,
  },
  heroBadgeText: {
    color: tc("#7A2E56"),
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "600",
    letterSpacing: 0.4,
  },
  heroBgWrap: {
    ...StyleSheet.absoluteFillObject,
  },
  heroBgImage: { opacity: 0.9 },
  heroBgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,251,247,0.24)",
  },
  heroLogo: {
    width: 128,
    height: 128,
    marginBottom: 2,
    resizeMode: "contain",
  },
  heroLogoCompact: {
    width: 114,
    height: 114,
    marginBottom: 2,
  },
  heroTitle: {
    color: tc("#5E3A74"),
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "600",
    marginBottom: 2,
    textAlign: "center",
  },
  tagline: {
    marginTop: 2,
    color: moduleTheme.colors.textMuted,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: "500",
    textAlign: "center",
  },
  taglineCompact: {
    fontSize: 14,
    lineHeight: 20,
  },
  heroMetaRow: {
    marginTop: 10,
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  heroMetaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(121,76,170,0.24)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  heroMetaText: {
    color: tc("#5E3A74"),
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
  },
  card: {
    borderRadius: moduleTheme.radius.lg,
    borderWidth: 1,
    borderColor: moduleTheme.colors.border,
    padding: 14,
    marginBottom: 12,
    minHeight: 84,
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
    ...moduleTheme.shadow.card,
  },
  cardPressed: {
    transform: [{ scale: 0.985 }],
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardCompact: {
    padding: 16,
    minHeight: 78,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  cardCopy: { flex: 1 },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.84)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(61,42,79,0.08)",
  },
  cardBgWrap: {
    ...StyleSheet.absoluteFillObject,
  },
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
    top: -40,
    right: -30,
    width: 140,
    height: 140,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.24)",
  },
  cardAccentTop: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 5,
    backgroundColor: BRAND,
  },
  arrowWrap: {
    width: 34,
    height: 34,
    borderRadius: 14,
    backgroundColor: moduleTheme.colors.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,0,102,0.20)",
  },
  cardTitle: {
    fontSize: 18,
    color: moduleTheme.colors.textStrong,
    fontWeight: "600",
    lineHeight: 22,
  },
  cardTitleCompact: {
    fontSize: 16,
    lineHeight: 20,
  },
  cardSubtitle: {
    marginTop: 3,
    color: moduleTheme.colors.textBody,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  cardCta: {
    marginTop: 6,
    color: tc("#7A2E56"),
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  cardSubtitleCompact: {
    fontSize: 12,
    lineHeight: 17,
  },
})



















