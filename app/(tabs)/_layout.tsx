import { Ionicons } from "@expo/vector-icons"
import { Tabs } from "expo-router"
import { useEffect, useRef, useState } from "react"
import { Animated, StyleSheet, View } from "react-native"
import { t, useAppLanguage } from "@/src/core/i18n"
import { CHAT_CURRENT_USER_ID, getUnreadCountForUser } from "@/src/modules/chat/storage"
import { defaultAdminConfig, loadAdminConfig } from "@/src/modules/monetization/adminConfig"
import { useAppAppearance } from "@/src/theme/appearance"
import { moduleTheme } from "@/src/theme/moduleStyles"
import { tc } from "@/src/theme/tokens"
import Header from "../components/Header"

export default function TabLayout() {
  const scrollY = useRef(new Animated.Value(0)).current
  const { language, ready } = useAppLanguage()
  const [unreadCount, setUnreadCount] = useState(0)
  const [moduleFlags, setModuleFlags] = useState(defaultAdminConfig.modules)
  const { mode } = useAppAppearance()
  const isDark = mode === "dark"

  useEffect(() => {
    let mounted = true
    const read = async () => {
      const count = await getUnreadCountForUser(CHAT_CURRENT_USER_ID)
      if (mounted) setUnreadCount(count)
    }
    void read()
    const timer = setInterval(() => void read(), 1800)
    return () => {
      mounted = false
      clearInterval(timer)
    }
  }, [])

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

  if (!ready) return null

  return (
    <View style={[styles.bg, isDark && styles.bgDark]}>
      <View pointerEvents="none" style={[styles.bgBlobTop, isDark && styles.bgBlobTopDark]} />
      <View pointerEvents="none" style={[styles.bgBlobMid, isDark && styles.bgBlobMidDark]} />
      <View pointerEvents="none" style={[styles.bgBlobBottom, isDark && styles.bgBlobBottomDark]} />
      {isDark && <View pointerEvents="none" style={styles.darkVeil} />}
      <Tabs
        detachInactiveScreens
        screenOptions={{
          animation: "fade",
          header: () => <Header scrollY={scrollY} />,
          sceneStyle: { backgroundColor: "transparent", overflow: "hidden" },
          tabBarActiveTintColor: moduleTheme.colors.brand,
          tabBarInactiveTintColor: isDark ? tc("#B89BCF") : moduleTheme.colors.tabInactive,
          tabBarLabelStyle: { fontSize: 10, fontWeight: "600", marginBottom: 2, letterSpacing: 0.15 },
          tabBarStyle: {
            backgroundColor: isDark ? "rgba(57,33,83,0.92)" : moduleTheme.colors.tabBarBackground,
            borderTopColor: isDark ? tc("#744F99") : moduleTheme.colors.tabBarBorder,
            borderTopWidth: 1,
            position: "absolute",
            left: 12,
            right: 12,
            bottom: 10,
            height: 80,
            borderRadius: 26,
            paddingTop: 9,
            paddingBottom: 8,
            paddingHorizontal: 5,
            shadowColor: isDark ? tc("#28153C") : moduleTheme.colors.accentPurple,
            shadowOpacity: isDark ? 0.5 : 0.3,
            shadowRadius: 26,
            shadowOffset: { width: 0, height: 14 },
            elevation: 18,
          },
          tabBarItemStyle: { borderRadius: 16, marginHorizontal: 2 },
          tabBarActiveBackgroundColor: isDark ? "rgba(255,0,102,0.20)" : moduleTheme.colors.brandSoft,
          tabBarHideOnKeyboard: true,
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            href: moduleFlags.home ? "/home" : null,
            title: t("tabHome", language),
            tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="health"
          options={{
            href: moduleFlags.health ? "/health" : null,
            title: t("tabHealth", language),
            tabBarIcon: ({ color, size }) => <Ionicons name="heart" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="services"
          options={{
            href: moduleFlags.services ? "/services" : null,
            title: t("tabServices", language),
            tabBarIcon: ({ color, size }) => <Ionicons name="briefcase" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="shopping"
          options={{
            href: moduleFlags.shopping ? "/shopping" : null,
            title: t("tabShopping", language),
            tabBarIcon: ({ color, size }) => <Ionicons name="cart" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="food"
          options={{
            href: moduleFlags.food ? "/food" : null,
            title: t("tabFood", language),
            tabBarIcon: ({ color, size }) => <Ionicons name="restaurant" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="messages"
          options={{
            href: moduleFlags.messages ? "/messages" : null,
            title: t("tabMessages", language),
            tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
            tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="astrology"
          options={{
            href: moduleFlags.astrology ? "/astrology" : null,
            title: t("tabAstrology", language),
            tabBarIcon: ({ color, size }) => <Ionicons name="moon" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            href: moduleFlags.profile ? "/profile" : null,
            title: t("tabProfile", language),
            tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
          }}
        />
        <Tabs.Screen name="cycle" options={{ href: null }} />
        <Tabs.Screen name="mood" options={{ href: null }} />
      </Tabs>
    </View>
  )
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: moduleTheme.colors.appBackground,
    overflow: "hidden",
  },
  bgDark: {
    backgroundColor: "#4B2F68",
  },
  bgBlobTop: {
    position: "absolute",
    top: -130,
    right: -100,
    width: 350,
    height: 350,
    borderRadius: 999,
    backgroundColor: "rgba(118,70,176,0.36)",
  },
  bgBlobTopDark: {
    backgroundColor: "rgba(80,45,133,0.52)",
  },
  bgBlobMid: {
    position: "absolute",
    top: "32%",
    left: -140,
    width: 300,
    height: 300,
    borderRadius: 999,
    backgroundColor: "rgba(208,122,187,0.22)",
  },
  bgBlobMidDark: {
    backgroundColor: "rgba(148,76,145,0.30)",
  },
  bgBlobBottom: {
    position: "absolute",
    bottom: -150,
    right: -110,
    width: 330,
    height: 330,
    borderRadius: 999,
    backgroundColor: "rgba(95,58,153,0.28)",
  },
  bgBlobBottomDark: {
    backgroundColor: "rgba(66,36,112,0.46)",
  },
  darkVeil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(20,10,34,0.28)",
  },
})



