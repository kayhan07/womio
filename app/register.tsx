import AsyncStorage from "@react-native-async-storage/async-storage"
import { router } from "expo-router"
import { useState } from "react"
import {
  Alert,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native"
import { upsertMember } from "../src/modules/admin/system"
import { loadAdminConfig } from "../src/modules/monetization/adminConfig"
import { isAuthApiConfigured, registerWithApi } from "../src/core/api/auth"

const REGISTER_HERO_IMAGE_URI = "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=80"
const USER_PROFILE_KEY = "womio:userProfile"
const PROFILE_DETAILS_STORAGE_KEY = "profileDetailsV1"

export default function Register() {
  const { width } = useWindowDimensions()
  const compact = width < 360

  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [country, setCountry] = useState("")
  const [city, setCity] = useState("")
  const [birthDate, setBirthDate] = useState("")
  const [phone, setPhone] = useState("")
  const [bio, setBio] = useState("")

  const handleRegister = async () => {
    const usernameTrim = username.trim()
    const emailNorm = email.trim().toLowerCase()
    const birthDateTrim = birthDate.trim()
    if (!usernameTrim || !emailNorm || !password.trim()) {
      Alert.alert("Kayıt Hatası", "Kullanıcı adı, e-posta ve şifre gerekli.")
      return
    }

    if (isAuthApiConfigured()) {
      try {
        const result = await registerWithApi({
          username: usernameTrim,
          email: emailNorm,
          password,
          birthDate: birthDateTrim,
        })
        const user = result.user
        const nextUser = {
          id: user.id,
          username: user.username || usernameTrim,
          email: user.email || emailNorm,
          birthDate: user.birthDate || birthDateTrim,
          isAdmin: !!user.isAdmin,
          roleIds: user.roleIds || [],
          permissions: user.isAdmin ? ["*"] : [],
        }
        const nextDetails = {
          username: nextUser.username,
          email: nextUser.email,
          fullName: fullName.trim(),
          country: country.trim(),
          city: city.trim(),
          birthDate: nextUser.birthDate,
          phone: phone.trim(),
          bio: bio.trim(),
        }
        await Promise.all([
          AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(nextUser)),
          AsyncStorage.setItem(PROFILE_DETAILS_STORAGE_KEY, JSON.stringify(nextDetails)),
          upsertMember({
            username: nextUser.username,
            email: nextUser.email,
            fullName: fullName.trim(),
            country: country.trim(),
            city: city.trim(),
            birthDate: nextUser.birthDate,
            phone: phone.trim(),
            roleIds: nextUser.roleIds || [],
          }),
        ])
        router.replace("/(tabs)/home")
        return
      } catch (error: any) {
        Alert.alert("Kayıt Hatası", `${error?.message || "Kayıt başarısız."}`)
        return
      }
    }

    const cfg = await loadAdminConfig()
    const isAdmin = !!emailNorm && emailNorm === cfg.auth.masterAdminEmail.trim().toLowerCase()
    const nextUser = {
      username: usernameTrim,
      email: emailNorm,
      birthDate: birthDateTrim,
      isAdmin,
      roleIds: [] as string[],
      permissions: isAdmin ? ["*"] : [],
    }
    const nextDetails = {
      username: usernameTrim,
      email: emailNorm,
      fullName: fullName.trim(),
      country: country.trim(),
      city: city.trim(),
      birthDate: birthDateTrim,
      phone: phone.trim(),
      bio: bio.trim(),
    }

    await Promise.all([
      AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(nextUser)),
      AsyncStorage.setItem(PROFILE_DETAILS_STORAGE_KEY, JSON.stringify(nextDetails)),
      upsertMember({
        username: usernameTrim,
        email: emailNorm,
        fullName: fullName.trim(),
        country: country.trim(),
        city: city.trim(),
        birthDate: birthDateTrim,
        phone: phone.trim(),
        roleIds: [],
      }),
    ])
    router.replace("/(tabs)/home")
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, compact && styles.containerCompact]}>
      <View style={styles.content}>
        <View style={styles.hero}>
          <View pointerEvents="none" style={styles.bgWrap}>
            <ImageBackground source={{ uri: REGISTER_HERO_IMAGE_URI }} style={styles.bgWrap} imageStyle={styles.bgImage} />
          </View>
          <View pointerEvents="none" style={styles.bgOverlay} />

          <Text style={[styles.title, compact && styles.titleCompact]}>Kayıt Ol</Text>
          <Text style={[styles.subtitle, compact && styles.subtitleCompact]}>Hesabını oluştur ve WOMIO ile başla</Text>

          <View style={styles.fieldCard}>
            <TextInput value={username} onChangeText={setUsername} placeholder="Kullanıcı adı" placeholderTextColor="#8A6755" style={styles.input} autoCapitalize="none" />
          </View>
          <View style={styles.fieldCard}>
            <TextInput value={email} onChangeText={setEmail} placeholder="E-posta" placeholderTextColor="#8A6755" style={styles.input} autoCapitalize="none" keyboardType="email-address" />
          </View>
          <View style={styles.fieldCard}>
            <TextInput value={fullName} onChangeText={setFullName} placeholder="Ad Soyad" placeholderTextColor="#8A6755" style={styles.input} />
          </View>
          <View style={styles.fieldCard}>
            <TextInput value={country} onChangeText={setCountry} placeholder="Ülke" placeholderTextColor="#8A6755" style={styles.input} />
          </View>
          <View style={styles.fieldCard}>
            <TextInput value={city} onChangeText={setCity} placeholder="Şehir" placeholderTextColor="#8A6755" style={styles.input} />
          </View>
          <View style={styles.fieldCard}>
            <TextInput value={birthDate} onChangeText={setBirthDate} placeholder="Doğum tarihi (GG/AA/YYYY)" placeholderTextColor="#8A6755" style={styles.input} />
          </View>
          <View style={styles.fieldCard}>
            <TextInput value={phone} onChangeText={setPhone} placeholder="Telefon" placeholderTextColor="#8A6755" style={styles.input} keyboardType="phone-pad" />
          </View>
          <View style={styles.fieldCard}>
            <TextInput value={password} onChangeText={setPassword} placeholder="Şifre" placeholderTextColor="#8A6755" style={styles.input} secureTextEntry />
          </View>
          <View style={styles.fieldCard}>
            <TextInput value={bio} onChangeText={setBio} placeholder="Kısa Not / Hakkımda" placeholderTextColor="#8A6755" style={[styles.input, styles.bioInput]} multiline />
          </View>

          <Pressable style={styles.primaryButton} onPress={() => void handleRegister()}>
            <Text style={styles.primaryText}>Hesap Oluştur</Text>
          </Pressable>

          <Pressable onPress={() => router.push("/login")}>
            <Text style={styles.link}>Zaten hesabın var mı? Giriş Yap</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#F9F3EC",
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
  bgImage: { opacity: 0.24 },
  bgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,247,239,0.9)" },
  title: { fontSize: 28, color: "#3F2B22", fontWeight: "800", marginBottom: 4, textAlign: "center", lineHeight: 34 },
  titleCompact: { fontSize: 24, lineHeight: 30 },
  subtitle: { color: "#6E5548", textAlign: "center", marginBottom: 14, fontSize: 14, lineHeight: 20 },
  subtitleCompact: { fontSize: 13, lineHeight: 18 },
  fieldCard: {
    backgroundColor: "#FFF9F4",
    borderWidth: 1,
    borderColor: "#DCC5B3",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  input: { minHeight: 44, color: "#3F2B22", fontSize: 15, lineHeight: 20, fontWeight: "600" },
  bioInput: { minHeight: 80, textAlignVertical: "top", paddingTop: 10 },
  primaryButton: {
    backgroundColor: "#FF0066",
    minHeight: 46,
    borderRadius: 12,
    marginTop: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: "#FFFFFF", textAlign: "center", fontWeight: "800", fontSize: 15, lineHeight: 20 },
  link: { textAlign: "center", color: "#8A5C4E", marginTop: 12, fontSize: 13, lineHeight: 18, fontWeight: "600" },
})

