import AsyncStorage from "@react-native-async-storage/async-storage"
import { router } from "expo-router"
import { useState } from "react"
import {
  Alert,
  Image,
  ImageBackground,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native"
import { Image as ExpoImage } from "expo-image"
import { findMemberByEmail, upsertMember } from "../src/modules/admin/system"
import { loadAdminConfig, resolvePermissionsByRoleIds } from "../src/modules/monetization/adminConfig"
import { isAuthApiConfigured, loginWithApi } from "../src/core/api/auth"

const LOGIN_HERO_IMAGE = require("../assets/back.png")
const USER_PROFILE_KEY = "womio:userProfile"
const APP_INSTALL_URL = `${process.env.EXPO_PUBLIC_APP_INSTALL_URL || "https://womio.net/download"}`.trim()

export default function Login() {
  const { width } = useWindowDimensions()
  const compact = width < 360

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const openInstallLink = async () => {
    const target = APP_INSTALL_URL
    if (!target) return
    const canOpen = await Linking.canOpenURL(target)
    if (!canOpen) {
      Alert.alert("Bağlantı Hatası", "İndirme bağlantısı açılamadı.")
      return
    }
    await Linking.openURL(target)
  }

  const handleLogin = async () => {
    const emailNorm = email.trim().toLowerCase()
    if (!emailNorm || !password.trim()) {
      Alert.alert("Giriş Hatası", "E-posta ve şifre gerekli.")
      return
    }

    if (isAuthApiConfigured()) {
      try {
        const result = await loginWithApi({ email: emailNorm, password })
        const user = result.user
        const nextUser = {
          id: user.id,
          username: user.username || emailNorm.split("@")[0],
          email: user.email || emailNorm,
          birthDate: user.birthDate || "",
          isAdmin: !!user.isAdmin,
          roleIds: user.roleIds || [],
          permissions: user.isAdmin ? ["*"] : [],
        }
        await AsyncStorage.setItem(
          USER_PROFILE_KEY,
          JSON.stringify(nextUser)
        )
        await upsertMember({
          username: nextUser.username,
          email: nextUser.email,
          birthDate: nextUser.birthDate,
          roleIds: nextUser.roleIds || [],
        })
        router.replace("/(tabs)/home" as never)
        return
      } catch (error: any) {
        Alert.alert("Giriş Hatası", `${error?.message || "Giriş başarısız."}`)
        return
      }
    }

    const member = await findMemberByEmail(emailNorm)
    const cfg = await loadAdminConfig()
    const isAdmin = !!emailNorm && emailNorm === cfg.auth.masterAdminEmail.trim().toLowerCase()
    const permissions = isAdmin
      ? ["*"]
      : Array.from(resolvePermissionsByRoleIds(cfg.roles, member?.roleIds || []))
    if (isAdmin && password !== cfg.auth.masterAdminPassword) {
      Alert.alert("Giriş Hatası", "Admin şifresi hatalı.")
      return
    }

    if (member?.blocked) {
      Alert.alert(
        "Hesap Engelli",
        member.blockedReason
          ? `Hesabın geçici olarak engellendi: ${member.blockedReason}`
          : "Hesabın geçici olarak engellendi."
      )
      return
    }

    if (emailNorm) {
      await AsyncStorage.setItem(
        USER_PROFILE_KEY,
        JSON.stringify({
          username: member?.username || emailNorm.split("@")[0],
          email: emailNorm,
          birthDate: member?.birthDate || "",
          isAdmin,
          roleIds: member?.roleIds || [],
          permissions,
        })
      )
    }

    router.replace("/(tabs)/home" as never)
  }

  return (
    <ImageBackground source={require("../assets/background.jpg")} style={styles.screenBg} imageStyle={styles.screenBgImage}>
      <View pointerEvents="none" style={styles.screenBgOverlay} />
      <ScrollView contentContainerStyle={[styles.container, compact && styles.containerCompact]}>
        <View style={styles.content}>
          <View style={styles.hero}>
            <View pointerEvents="none" style={styles.bgWrap}>
              <ExpoImage source={LOGIN_HERO_IMAGE} style={styles.bgWrap} contentFit="cover" contentPosition="center" />
            </View>
            <View pointerEvents="none" style={styles.bgOverlay} />

            <Image source={require("../assets/logo.png")} style={styles.logo} />
            <Text style={[styles.title, compact && styles.titleCompact]}>Giriş Yap</Text>
            <Text style={[styles.subtitle, compact && styles.subtitleCompact]}>WOMIO hesabınla devam et</Text>
            <Pressable style={styles.installButton} onPress={() => void openInstallLink()}>
              <Text style={styles.installButtonText}>Uygulamayı İndir</Text>
            </Pressable>

            <View style={styles.fieldCard}>
              <TextInput
                placeholder="E-posta"
                placeholderTextColor="#7D6658"
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.fieldCard}>
              <View style={styles.passwordRow}>
                <TextInput
                  placeholder="Şifre"
                  placeholderTextColor="#7D6658"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  style={styles.passwordInput}
                />
                <Pressable onPress={() => setShowPassword((prev) => !prev)}>
                  <Text style={styles.showText}>{showPassword ? "Gizle" : "Göster"}</Text>
                </Pressable>
              </View>
            </View>

            <Pressable style={styles.primaryButton} onPress={() => void handleLogin()}>
              <Text style={styles.primaryText}>Giriş Yap</Text>
            </Pressable>

            <Pressable onPress={() => router.push("/forgot-password" as never)}>
              <Text style={styles.linkText}>Şifremi unuttum</Text>
            </Pressable>

            <Pressable onPress={() => router.push("/register" as never)}>
              <Text style={styles.linkText}>Hesabın yok mu? Kayıt Ol</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </ImageBackground>
  )
}

const styles = StyleSheet.create({
  screenBg: { flex: 1 },
  screenBgImage: { opacity: 0.92 },
  screenBgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(248,243,255,0.16)" },
  container: {
    flexGrow: 1,
    backgroundColor: "transparent",
    padding: 16,
    paddingBottom: 24,
    justifyContent: "center",
  },
  containerCompact: { padding: 12 },
  content: { width: "100%", maxWidth: 520, alignSelf: "center" },
  hero: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E9D8C8",
    backgroundColor: "#FFFDF9",
    padding: 16,
    overflow: "hidden",
    position: "relative",
  },
  bgWrap: { ...StyleSheet.absoluteFillObject },
  bgImage: { opacity: 0.98 },
  bgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,247,239,0.14)" },
  logo: {
    width: 184,
    height: 184,
    alignSelf: "center",
    marginBottom: 10,
    resizeMode: "contain",
  },
  title: { fontSize: 28, lineHeight: 34, color: "#3F2B22", fontWeight: "800", textAlign: "center" },
  titleCompact: { fontSize: 24, lineHeight: 30 },
  subtitle: { marginTop: 4, marginBottom: 14, color: "#6E5548", fontSize: 14, lineHeight: 20, textAlign: "center" },
  subtitleCompact: { fontSize: 13, lineHeight: 18 },
  installButton: {
    alignSelf: "center",
    marginBottom: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E4D0BF",
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  installButtonText: {
    color: "#6E5548",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },
  fieldCard: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 1,
    borderColor: "#E4D0BF",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  input: { minHeight: 44, color: "#3F2B22", fontSize: 15, lineHeight: 20 },
  passwordRow: { flexDirection: "row", alignItems: "center" },
  passwordInput: { flex: 1, minHeight: 44, color: "#3F2B22", fontSize: 15, lineHeight: 20 },
  showText: { color: "#8A5C4E", fontWeight: "700", fontSize: 13, lineHeight: 18 },
  primaryButton: {
    marginTop: 2,
    minHeight: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF0066",
  },
  primaryText: { color: "#FFFFFF", fontSize: 15, lineHeight: 20, fontWeight: "800" },
  linkText: { textAlign: "center", color: "#8A5C4E", marginTop: 11, fontSize: 13, lineHeight: 18, fontWeight: "600" },
})
