import { Stack } from "expo-router"
import { useEffect } from "react"
import * as SplashScreen from "expo-splash-screen"
import { StyleSheet, View } from "react-native"
import { AppearanceProvider, useAppAppearance } from "../src/theme/appearance"
import { AppLanguageProvider } from "../src/core/i18n"
import { runInitialPermissionBootstrap } from "../src/core/permissions/bootstrap"

void SplashScreen.preventAutoHideAsync()

export default function Layout() {
  return (
    <AppearanceProvider>
      <AppLanguageProvider>
        <RootStack />
      </AppLanguageProvider>
    </AppearanceProvider>
  )
}

function RootStack() {
  const { mode } = useAppAppearance()
  const isDark = mode === "dark"

  useEffect(() => {
    let isMounted = true
    const boot = async () => {
      try {
        await runInitialPermissionBootstrap()
      } finally {
        // Keep splash visible briefly so logo is clearly seen before login/home.
        setTimeout(() => {
          if (!isMounted) return
          void SplashScreen.hideAsync()
        }, 900)
      }
    }
    void boot()
    return () => {
      isMounted = false
    }
  }, [])

  return (
    <View style={[styles.bg, isDark && styles.bgDark]}>
      <View pointerEvents="none" style={[styles.gradientTop, isDark && styles.gradientTopDark]} />
      <View pointerEvents="none" style={[styles.gradientMiddle, isDark && styles.gradientMiddleDark]} />
      <View pointerEvents="none" style={[styles.gradientBottom, isDark && styles.gradientBottomDark]} />
      <View pointerEvents="none" style={[styles.blobA, isDark && styles.blobADark]} />
      <View pointerEvents="none" style={[styles.blobB, isDark && styles.blobBDark]} />
      <View pointerEvents="none" style={[styles.blobC, isDark && styles.blobCDark]} />
      {isDark && <View pointerEvents="none" style={styles.darkVeil} />}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "transparent" },
          animation: "none",
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: "#C9B0E3",
    overflow: "hidden",
  },
  bgDark: {
    backgroundColor: "#4B2F68",
  },
  gradientTop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(86,45,139,0.34)",
  },
  gradientTopDark: {
    backgroundColor: "rgba(33,16,55,0.56)",
  },
  gradientMiddle: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(155,78,152,0.20)",
  },
  gradientMiddleDark: {
    backgroundColor: "rgba(82,36,108,0.32)",
  },
  gradientBottom: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(223,154,207,0.18)",
  },
  gradientBottomDark: {
    backgroundColor: "rgba(102,52,122,0.28)",
  },
  blobA: {
    position: "absolute",
    top: -140,
    right: -110,
    width: 360,
    height: 360,
    borderRadius: 999,
    backgroundColor: "rgba(118,70,176,0.36)",
  },
  blobADark: {
    backgroundColor: "rgba(80,45,133,0.52)",
  },
  blobB: {
    position: "absolute",
    top: "32%",
    left: -150,
    width: 300,
    height: 300,
    borderRadius: 999,
    backgroundColor: "rgba(208,122,187,0.22)",
  },
  blobBDark: {
    backgroundColor: "rgba(148,76,145,0.30)",
  },
  blobC: {
    position: "absolute",
    bottom: -160,
    right: -120,
    width: 340,
    height: 340,
    borderRadius: 999,
    backgroundColor: "rgba(95,58,153,0.28)",
  },
  blobCDark: {
    backgroundColor: "rgba(66,36,112,0.46)",
  },
  darkVeil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(20,10,34,0.26)",
  },
})
