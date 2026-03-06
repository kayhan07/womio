import AsyncStorage from "@react-native-async-storage/async-storage"
import { Redirect } from "expo-router"
import { useEffect, useState } from "react"
import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native"

const USER_PROFILE_KEY = "womio:userProfile"

export default function Index() {
  const [nextRoute, setNextRoute] = useState<"/login" | "/(tabs)/home" | null>(null)
  const [introDone, setIntroDone] = useState(false)

  useEffect(() => {
    const introTimer = setTimeout(() => setIntroDone(true), 1200)

    const resolveInitialRoute = async () => {
      try {
        const raw = await AsyncStorage.getItem(USER_PROFILE_KEY)
        if (!raw) {
          setNextRoute("/login")
          return
        }

        const parsed = JSON.parse(raw) as { email?: string; username?: string } | null
        const hasIdentity = !!`${parsed?.email ?? ""}`.trim() || !!`${parsed?.username ?? ""}`.trim()
        if (hasIdentity) {
          setNextRoute("/(tabs)/home")
          return
        }
      } catch {}

      await AsyncStorage.removeItem(USER_PROFILE_KEY)
      setNextRoute("/login")
    }

    void resolveInitialRoute()
    return () => clearTimeout(introTimer)
  }, [])

  if (!introDone || !nextRoute) {
    return (
      <View style={styles.container}>
        <View style={styles.glowA} />
        <View style={styles.glowB} />
        <View style={styles.brandCard}>
          <Image source={require("../assets/logo.png")} style={styles.logo} />
          <Text style={styles.title}>womio</Text>
          <Text style={styles.subtitle}>senin alanin, senin ritmin</Text>
          <ActivityIndicator size="small" color="#FF0066" style={styles.loader} />
        </View>
      </View>
    )
  }

  return <Redirect href={nextRoute} />
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8EEFF",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  glowA: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: 999,
    right: -120,
    top: -90,
    backgroundColor: "rgba(255,0,102,0.14)",
  },
  glowB: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 999,
    left: -110,
    bottom: -80,
    backgroundColor: "rgba(130,82,200,0.16)",
  },
  brandCard: {
    width: "84%",
    maxWidth: 360,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.85)",
    backgroundColor: "rgba(255,255,255,0.78)",
    paddingVertical: 26,
    paddingHorizontal: 20,
    alignItems: "center",
    shadowColor: "#7E46A8",
    shadowOpacity: 0.18,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  logo: {
    width: 124,
    height: 124,
    resizeMode: "contain",
  },
  title: {
    marginTop: 8,
    fontSize: 36,
    lineHeight: 40,
    fontWeight: "800",
    letterSpacing: 0.5,
    color: "#4A2E65",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: "#785A95",
    fontWeight: "600",
    textAlign: "center",
  },
  loader: {
    marginTop: 14,
  },
})
