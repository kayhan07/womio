import { useEffect, useState } from "react"
import { Ionicons } from "@expo/vector-icons"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { AdPlacementKey, loadAdminConfig } from "@/src/modules/monetization/adminConfig"
import { moduleTheme } from "@/src/theme/moduleStyles"
import { tc } from "@/src/theme/tokens"

type AdSlotProps = {
  compact?: boolean
  title?: string
  subtitle?: string
  ctaLabel?: string
  placementKey?: AdPlacementKey
  onPress?: () => void
}

export function AdSlot({
  compact = false,
  title = "Reklam Alanı",
  subtitle = "Google Ads / AdMob kodu burada çalışacak",
  ctaLabel = "Sponsorlu İçerik",
  placementKey,
  onPress,
}: AdSlotProps) {
  const [enabled, setEnabled] = useState(true)
  const [resolvedTitle, setResolvedTitle] = useState(title)
  const [resolvedSubtitle, setResolvedSubtitle] = useState(subtitle)
  const [resolvedCta, setResolvedCta] = useState(ctaLabel)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      const cfg = await loadAdminConfig()
      if (!mounted) return
      if (!cfg.adsEnabled) {
        setEnabled(false)
        return
      }
      if (placementKey) {
        const slot = cfg.placements[placementKey]
        if (slot) {
          setEnabled(slot.enabled)
          setResolvedTitle(slot.title)
          setResolvedSubtitle(slot.subtitle)
          setResolvedCta(slot.ctaLabel)
          return
        }
      }
      setEnabled(true)
      setResolvedTitle(title)
      setResolvedSubtitle(subtitle)
      setResolvedCta(ctaLabel)
    }
    void load()
    const timer = setInterval(() => void load(), 2500)
    return () => {
      mounted = false
      clearInterval(timer)
    }
  }, [placementKey, title, subtitle, ctaLabel])

  if (!enabled) return null

  return (
    <Pressable
      style={[styles.wrap, compact && styles.wrapCompact]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.iconBox}>
        <Ionicons name="megaphone-outline" size={15} color={tc("#7A2E56")} />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.title, compact && styles.titleCompact]}>{resolvedTitle}</Text>
        <Text style={[styles.subtitle, compact && styles.subtitleCompact]}>{resolvedSubtitle}</Text>
      </View>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{resolvedCta}</Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    minHeight: 68,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,0,102,0.24)",
    backgroundColor: "rgba(255,245,251,0.92)",
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 12,
  },
  wrapCompact: {
    minHeight: 62,
    paddingHorizontal: 9,
    paddingVertical: 9,
    marginBottom: 10,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 1,
    borderColor: "rgba(122,46,86,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { flex: 1 },
  title: {
    color: moduleTheme.colors.textStrong,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "800",
  },
  titleCompact: {
    fontSize: 13,
    lineHeight: 17,
  },
  subtitle: {
    marginTop: 2,
    color: moduleTheme.colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },
  subtitleCompact: {
    fontSize: 11,
    lineHeight: 15,
  },
  badge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(122,46,86,0.2)",
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  badgeText: {
    color: tc("#7A2E56"),
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "800",
  },
})
