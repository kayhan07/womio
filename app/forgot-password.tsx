import { router } from "expo-router"
import { useState } from "react"
import { ImageBackground, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native"

const FORGOT_HERO_IMAGE_URI = "https://images.unsplash.com/photo-1516826957135-700dedea698c?auto=format&fit=crop&w=1200&q=80"

export default function ForgotPassword() {
  const { width } = useWindowDimensions()
  const compact = width < 360
  const [email, setEmail] = useState("")

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <View style={styles.content}>
        <View style={styles.hero}>
          <View pointerEvents="none" style={styles.bgWrap}>
            <ImageBackground source={{ uri: FORGOT_HERO_IMAGE_URI }} style={styles.bgWrap} imageStyle={styles.bgImage} />
          </View>
          <View pointerEvents="none" style={styles.bgOverlay} />

          <Text style={[styles.title, compact && styles.titleCompact]}>Şifremi Unuttum</Text>
          <Text style={[styles.info, compact && styles.infoCompact]}>
            Geçici şifre gönderimi için kayıtlı e-posta adresini gir.
          </Text>

          <View style={styles.fieldCard}>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="E-posta"
              placeholderTextColor="#7D6658"
              style={styles.input}
              autoCapitalize="none"
            />
          </View>

          <Pressable style={styles.primaryButton} onPress={() => router.push("/login")}>
            <Text style={styles.primaryText}>Geçici Şifre Gönder</Text>
          </Pressable>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9F3EC",
    padding: 16,
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
  bgImage: { opacity: 0.55 },
  bgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,247,239,0.7)" },
  title: { fontSize: 25, color: "#3F2B22", fontWeight: "800", marginBottom: 8, textAlign: "center", lineHeight: 31 },
  titleCompact: { fontSize: 22, lineHeight: 28 },
  info: { color: "#6C5B52", textAlign: "center", marginBottom: 14, fontSize: 14, lineHeight: 20 },
  infoCompact: { fontSize: 13, lineHeight: 18 },
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
  primaryButton: {
    backgroundColor: "#FF0066",
    minHeight: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: "#FFFFFF", textAlign: "center", fontWeight: "800", fontSize: 15, lineHeight: 20 },
})




