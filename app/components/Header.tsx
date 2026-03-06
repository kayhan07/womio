import { Ionicons } from "@expo/vector-icons"
import { router, usePathname } from "expo-router"
import { useEffect, useState } from "react"
import {
  Animated,
  Pressable,
  View,
  StyleSheet
} from "react-native"
import { moduleTheme } from "../../src/theme/moduleStyles"
import { AppAvatar } from "../../src/components/ui/AppAvatar"
import { loadProfileAvatarConfig, ProfileAvatarConfig } from "../../src/modules/profile/avatar"

export default function Header({ scrollY }: any) {
  const pathname = usePathname()
  const [avatar, setAvatar] = useState<ProfileAvatarConfig | null>(null)
  const onHome =
    pathname === "/" ||
    pathname === "/home" ||
    pathname === "/(tabs)/home"

  useEffect(() => {
    let mounted = true
    const load = async () => {
      const next = await loadProfileAvatarConfig()
      if (mounted) setAvatar(next)
    }
    void load()
    const timer = setInterval(() => void load(), 2000)
    return () => {
      mounted = false
      clearInterval(timer)
    }
  }, [])

  const headerHeight = scrollY
    ? scrollY.interpolate({
        inputRange: [0, 100],
        outputRange: [96, 68],
        extrapolate: "clamp",
      })
    : 96

  const logoSize = scrollY
    ? scrollY.interpolate({
        inputRange: [0, 100],
        outputRange: [92, 62],
        extrapolate: "clamp",
      })
    : 92

  return (
    <Animated.View
      style={[
        styles.container,
        { height: headerHeight },
      ]}
    >
      <Animated.View style={styles.gloss} />
      <Animated.Image
        source={require("../../assets/logo.png")}
        style={[
          styles.logo,
          { width: logoSize, height: logoSize },
        ]}
      />
      {!onHome && (
        <Pressable
          style={styles.homeBtn}
          onPress={() => router.push("/(tabs)/home")}
        >
          <Ionicons
            name="home"
            size={16}
            color={moduleTheme.colors.avatar}
          />
        </Pressable>
      )}

      {/* Profil Avatar */}
      <Pressable
        style={styles.avatar}
        onPress={() => router.push("/(tabs)/profile")}
      >
        {avatar ? (
          <AppAvatar avatar={avatar} size={34} />
        ) : (
          <View style={styles.avatarFallback}>
            <Ionicons
              name="person"
              size={18}
              color={moduleTheme.colors.avatar}
            />
          </View>
        )}
      </Pressable>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: moduleTheme.colors.headerBackground,
    justifyContent: "center",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: moduleTheme.colors.headerBorder,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    overflow: "hidden",
    shadowColor: moduleTheme.colors.accentPurple,
    shadowOpacity: 0.24,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 12,
  },
  gloss: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 24,
    backgroundColor: "rgba(255,255,255,0.34)",
  },
  logo: {
    resizeMode: "contain",
  },
  avatar: {
    position: "absolute",
    right: 14,
    bottom: 12,
  },
  homeBtn: {
    position: "absolute",
    left: 14,
    bottom: 12,
    width: 34,
    height: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.75)",
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallback: {
    width: 34,
    height: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.75)",
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
})

