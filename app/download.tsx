import { Ionicons } from "@expo/vector-icons"
import { useMemo } from "react"
import { Linking, Pressable, StyleSheet, Text, View } from "react-native"

type LinkItem = {
  id: string
  title: string
  subtitle: string
  url?: string
  icon: keyof typeof Ionicons.glyphMap
}

const FALLBACKS = {
  website: "https://womio.net",
  android: "https://womio.net/downloads/womio-latest.apk",
  ios: "https://womio.net/downloads/womio-ios.ipa",
}

export default function DownloadScreen() {
  const links = useMemo<LinkItem[]>(
    () => [
      {
        id: "android",
        title: "Android",
        subtitle: "APK dosyasini indir",
        url: process.env.EXPO_PUBLIC_ANDROID_APK_URL || FALLBACKS.android,
        icon: "logo-android",
      },
      {
        id: "iphone",
        title: "iPhone",
        subtitle: "iOS yukleme dosyasi",
        url: process.env.EXPO_PUBLIC_IOS_APP_URL || FALLBACKS.ios,
        icon: "logo-apple",
      },
    ],
    []
  )

  const websiteUrl = process.env.EXPO_PUBLIC_WEBSITE_URL || FALLBACKS.website

  const openUrl = async (url?: string) => {
    if (!url) return
    await Linking.openURL(url)
  }

  return (
    <View style={s.page}>
      <Text style={s.badge}>WOMIO</Text>
      <Text style={s.title}>Mobil Uygulamayi Indir</Text>
      <Text style={s.subtitle}>Android ve iPhone yukleme dosyalarina buradan ulas.</Text>

      {links.map((item) => {
        const disabled = !item.url
        return (
          <Pressable
            key={item.id}
            disabled={disabled}
            onPress={() => openUrl(item.url)}
            style={({ pressed }) => [s.card, pressed && !disabled ? s.cardPressed : undefined, disabled ? s.cardDisabled : undefined]}
          >
            <View style={s.iconWrap}>
              <Ionicons name={item.icon} size={20} color="#0F172A" />
            </View>
            <View style={s.cardBody}>
              <Text style={s.cardTitle}>{item.title}</Text>
              <Text style={s.cardSubtitle}>{disabled ? "Baglanti yakinda eklenecek" : item.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#334155" />
          </Pressable>
        )
      })}

      <Pressable onPress={() => openUrl(websiteUrl)} style={({ pressed }) => [s.siteBtn, pressed ? s.siteBtnPressed : undefined]}>
        <Ionicons name="globe-outline" size={16} color="#FFFFFF" />
        <Text style={s.siteBtnText}>womio.net</Text>
      </Pressable>
    </View>
  )
}

const s = StyleSheet.create({
  page: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 64,
    backgroundColor: "#F8FAFC",
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#E2E8F0",
    color: "#0F172A",
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  title: {
    marginTop: 14,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800",
    color: "#020617",
  },
  subtitle: {
    marginTop: 8,
    color: "#475569",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 22,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 12,
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.995 }],
  },
  cardDisabled: {
    opacity: 0.55,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "700",
  },
  cardSubtitle: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 2,
  },
  siteBtn: {
    marginTop: 8,
    borderRadius: 14,
    backgroundColor: "#0F172A",
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  siteBtnPressed: {
    opacity: 0.9,
  },
  siteBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
    letterSpacing: 0.2,
  },
})
