import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import AsyncStorage from "@react-native-async-storage/async-storage"
import * as ImagePicker from "expo-image-picker"
import { useEffect, useMemo, useState } from "react"
import {
  Alert,
  Image,
  type ImageSourcePropType,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native"
import { t, useAppLanguage } from "@/src/core/i18n"
import { languageLabels } from "@/src/core/i18n/translations"
import type { AppLanguage } from "@/src/core/i18n/types"
import { defaultAdminConfig, loadAdminConfig } from "@/src/modules/monetization/adminConfig"
import { showRewardedAd } from "@/src/modules/monetization/rewarded"
import { useAppAppearance } from "@/src/theme/appearance"
import { moduleStyles, moduleTheme } from "@/src/theme/moduleStyles"
import { tc } from "@/src/theme/tokens"

const BRAND = moduleTheme.colors.brand
const PROFILE_AVATAR_STORAGE_KEY = "profileAvatarV1"
const PROFILE_DETAILS_STORAGE_KEY = "profileDetailsV1"
const USER_PROFILE_KEY = "womio:userProfile"
const PROFILE_WALLET_STORAGE_KEY = "profileWalletV1"
const PROFILE_WALLET_REWARD_STORAGE_KEY = "profileWalletRewardV1"

const languages: AppLanguage[] = ["tr", "en", "de", "ru"]
const PROFILE_HERO_IMAGE_URI = "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1200&q=80"

type AvatarPreset = { id: string; source: ImageSourcePropType }
const avatarPresets: AvatarPreset[] = [
  {
    id: "illustration-w1",
    source: require("../../assets/avatars/woman1.png"),
  },
  {
    id: "illustration-w2",
    source: require("../../assets/avatars/woman2.png"),
  },
  {
    id: "illustration-w3",
    source: require("../../assets/avatars/woman3.png"),
  },
  {
    id: "illustration-w4",
    source: require("../../assets/avatars/woman4.png"),
  },
  {
    id: "illustration-w5",
    source: require("../../assets/avatars/woman5.png"),
  },
  {
    id: "illustration-w6",
    source: require("../../assets/avatars/woman6.png"),
  },
]

type WalletEntry = { id: string; amount: number; createdAt: string }
type WalletState = { balance: number; entries: WalletEntry[] }
type RewardState = { dayKey: string; watched: number; lastAt: number; lockUntil: number; attempts: number[]; avgRevenueMicros: number }

export default function Profile() {
  const { language, ready, updateLanguage } = useAppLanguage()
  const { mode, setMode } = useAppAppearance()
  const { width } = useWindowDimensions()
  const compact = width < 360
  const lt = (trText: string, enText: string, deText: string, ruText: string) => {
    if (language === "tr") return trText
    if (language === "en") return enText
    if (language === "de") return deText
    return ruText
  }

  const [avatarMode, setAvatarMode] = useState<"photo" | "preset">("preset")
  const [avatarPhotoUri, setAvatarPhotoUri] = useState("")
  const [avatarPreset, setAvatarPreset] = useState(avatarPresets[0].id)

  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [fullName, setFullName] = useState("")
  const [country, setCountry] = useState("")
  const [city, setCity] = useState("")
  const [birthDate, setBirthDate] = useState("")
  const [phone, setPhone] = useState("")
  const [bio, setBio] = useState("")

  const [wallet, setWallet] = useState<WalletState>({ balance: 0, entries: [] })
  const [walletAmount, setWalletAmount] = useState("")
  const [reward, setReward] = useState<RewardState>({ dayKey: "", watched: 0, lastAt: 0, lockUntil: 0, attempts: [], avgRevenueMicros: 0 })
  const [adminReward, setAdminReward] = useState(defaultAdminConfig.reward)
  const [rewardLoading, setRewardLoading] = useState(false)
  const [feedback, setFeedback] = useState("")
  const [nowTick, setNowTick] = useState(Date.now())
  const [isAdmin, setIsAdmin] = useState(false)

  const quickTopups = [50, 100, 250, 500]
  const selectedPreset = useMemo(
    () => avatarPresets.find((x) => x.id === avatarPreset) ?? avatarPresets[0],
    [avatarPreset]
  )
  const birthMask = useMemo<{ order: "dmy" | "mdy"; sep: "/" | "." }>(() => {
    if (language === "en") return { order: "mdy" as const, sep: "/" }
    if (language === "de") return { order: "dmy" as const, sep: "." }
    if (language === "ru") return { order: "dmy" as const, sep: "." }
    return { order: "dmy" as const, sep: "/" }
  }, [language])

  const formatBirthInput = (raw: string, order: "dmy" | "mdy", sep: "/" | ".") => {
    const digits = raw.replace(/\D/g, "").slice(0, 8)
    if (digits.length <= 2) return digits
    if (digits.length <= 4) return `${digits.slice(0, 2)}${sep}${digits.slice(2)}`
    if (order === "mdy") return `${digits.slice(0, 2)}${sep}${digits.slice(2, 4)}${sep}${digits.slice(4)}`
    return `${digits.slice(0, 2)}${sep}${digits.slice(2, 4)}${sep}${digits.slice(4)}`
  }

  const toCanonicalBirthDate = (value: string, order: "dmy" | "mdy") => {
    const digits = value.replace(/\D/g, "").slice(0, 8)
    if (digits.length !== 8) return value.trim()
    if (order === "mdy") {
      const mm = digits.slice(0, 2)
      const dd = digits.slice(2, 4)
      const yyyy = digits.slice(4, 8)
      return `${dd}/${mm}/${yyyy}`
    }
    const dd = digits.slice(0, 2)
    const mm = digits.slice(2, 4)
    const yyyy = digits.slice(4, 8)
    return `${dd}/${mm}/${yyyy}`
  }

  const onBirthDateChange = (raw: string) => {
    setBirthDate(formatBirthInput(raw, birthMask.order, birthMask.sep))
  }

  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const load = async () => {
      const [avatarRaw, detailsRaw, userRaw, walletRaw, rewardRaw] = await Promise.all([
        AsyncStorage.getItem(PROFILE_AVATAR_STORAGE_KEY),
        AsyncStorage.getItem(PROFILE_DETAILS_STORAGE_KEY),
        AsyncStorage.getItem(USER_PROFILE_KEY),
        AsyncStorage.getItem(PROFILE_WALLET_STORAGE_KEY),
        AsyncStorage.getItem(PROFILE_WALLET_REWARD_STORAGE_KEY),
      ])
      const cfg = await loadAdminConfig()
      setAdminReward(cfg.reward)

      try {
        if (avatarRaw) {
          const a = JSON.parse(avatarRaw) as { mode?: "photo" | "preset"; photoUri?: string; presetId?: string }
          const validPreset = avatarPresets.some((x) => x.id === a.presetId) ? a.presetId! : avatarPresets[0].id
          setAvatarMode(a.mode === "photo" ? "photo" : "preset")
          setAvatarPhotoUri(a.photoUri || "")
          setAvatarPreset(validPreset)
        }
      } catch {}

      try {
        if (detailsRaw) {
          const d = JSON.parse(detailsRaw) as Record<string, string>
          setUsername(d.username || "")
          setEmail(d.email || "")
          setFullName(d.fullName || "")
          setCountry(d.country || "")
          setCity(d.city || "")
          setBirthDate(d.birthDate || "")
          setPhone(d.phone || "")
          setBio(d.bio || "")
        }
      } catch {}

      try {
        if (userRaw) {
          const u = JSON.parse(userRaw) as Record<string, any>
          setUsername((p) => p || u.username || "")
          setEmail((p) => p || u.email || "")
          setBirthDate((p) => p || u.birthDate || "")
          const emailNorm = `${u.email || ""}`.trim().toLowerCase()
          const perms = Array.isArray(u.permissions) ? u.permissions.map((x: unknown) => `${x}`) : []
          setIsAdmin(
            Boolean(u.isAdmin) ||
            (!!emailNorm && emailNorm === cfg.auth.masterAdminEmail.trim().toLowerCase()) ||
            perms.includes("*") ||
            perms.includes("admin.access_panel")
          )
        }
      } catch {}

      try {
        if (walletRaw) {
          const w = JSON.parse(walletRaw) as WalletState
          setWallet({ balance: Number(w?.balance) || 0, entries: Array.isArray(w?.entries) ? w.entries.slice(0, 20) : [] })
        }
      } catch {}

      try {
        if (rewardRaw) {
          const r = JSON.parse(rewardRaw) as RewardState
          setReward({
            dayKey: `${r?.dayKey || ""}`,
            watched: Number(r?.watched) || 0,
            lastAt: Number(r?.lastAt) || 0,
            lockUntil: Number(r?.lockUntil) || 0,
            attempts: Array.isArray(r?.attempts) ? r.attempts.filter((x) => Number.isFinite(x)).map(Number).slice(-40) : [],
            avgRevenueMicros: Number(r?.avgRevenueMicros) || 0,
          })
        }
      } catch {}
    }
    void load()
  }, [])

  useEffect(() => {
    let mounted = true
    const pull = async () => {
      const cfg = await loadAdminConfig()
      if (mounted) setAdminReward(cfg.reward)
    }
    void pull()
    const timer = setInterval(() => void pull(), 2500)
    return () => {
      mounted = false
      clearInterval(timer)
    }
  }, [])

  const saveAvatar = async (next: { mode: "photo" | "preset"; photoUri?: string; presetId?: string }) => {
    setAvatarMode(next.mode)
    setAvatarPhotoUri(next.photoUri || "")
    const presetId = next.presetId && avatarPresets.some((x) => x.id === next.presetId)
      ? next.presetId
      : avatarPresets[0].id
    setAvatarPreset(presetId)
    await AsyncStorage.setItem(PROFILE_AVATAR_STORAGE_KEY, JSON.stringify({ ...next, presetId }))
  }

  const saveWallet = async (next: WalletState) => {
    setWallet(next)
    await AsyncStorage.setItem(PROFILE_WALLET_STORAGE_KEY, JSON.stringify(next))
  }

  const saveReward = async (next: RewardState) => {
    setReward(next)
    await AsyncStorage.setItem(PROFILE_WALLET_REWARD_STORAGE_KEY, JSON.stringify(next))
  }

  const toast = (msg: string) => {
    setFeedback(msg)
    setTimeout(() => setFeedback(""), 1800)
  }

  const todayKey = () => new Date().toISOString().slice(0, 10)
  const normalizedReward = useMemo<RewardState>(() => {
    const k = todayKey()
    if (reward.dayKey !== k) return { ...reward, dayKey: k, watched: 0, lastAt: 0, lockUntil: 0, attempts: [] }
    return reward
  }, [reward])

  const rewardAmountNow = useMemo(() => {
    if (!adminReward.dynamicEnabled) return adminReward.fixedAmountTl
    const usdTry = Number(process.env.EXPO_PUBLIC_USDTRY || "38")
    if (!normalizedReward.avgRevenueMicros || normalizedReward.avgRevenueMicros <= 0) return adminReward.fixedAmountTl
    const adRevenueTry = (normalizedReward.avgRevenueMicros / 1_000_000) * (Number.isFinite(usdTry) ? usdTry : 38)
    const suggested = Math.floor(adRevenueTry * 0.6)
    return Math.max(1, Math.min(8, suggested || adminReward.fixedAmountTl))
  }, [adminReward, normalizedReward])

  const rewardRemaining = Math.max(0, adminReward.dailyLimit - normalizedReward.watched)
  const cooldownLeftSec = Math.max(0, Math.ceil((normalizedReward.lastAt + adminReward.cooldownSec * 1000 - nowTick) / 1000))
  const lockLeftSec = Math.max(0, Math.ceil((normalizedReward.lockUntil - nowTick) / 1000))

  const addWalletCredit = async (amount: number, note: string) => {
    const nextEntry: WalletEntry = { id: `wallet-${Date.now()}`, amount: Math.round(amount), createdAt: new Date().toISOString() }
    const next: WalletState = { balance: wallet.balance + nextEntry.amount, entries: [nextEntry, ...wallet.entries].slice(0, 20) }
    await saveWallet(next)
    setWalletAmount("")
    toast(note)
  }

  const parseAmount = (raw: string) => {
    const normalized = raw.replace(",", ".").replace(/[^\d.]/g, "")
    const n = Number(normalized)
    return Number.isFinite(n) ? n : 0
  }

  const pickGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) return Alert.alert(lt("İzin gerekli", "Permission needed", "Berechtigung erforderlich", "Требуется разрешение"))
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, quality: 0.75, base64: true })
    if (res.canceled || !res.assets?.[0]) return
    const a = res.assets[0]
    const uri = a.base64 ? `data:image/jpeg;base64,${a.base64}` : a.uri
    await saveAvatar({ mode: "photo", photoUri: uri, presetId: avatarPreset })
  }

  const pickCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync()
    if (!perm.granted) return Alert.alert(lt("İzin gerekli", "Permission needed", "Berechtigung erforderlich", "Требуется разрешение"))
    const res = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.75, base64: true })
    if (res.canceled || !res.assets?.[0]) return
    const a = res.assets[0]
    const uri = a.base64 ? `data:image/jpeg;base64,${a.base64}` : a.uri
    await saveAvatar({ mode: "photo", photoUri: uri, presetId: avatarPreset })
  }

  const saveDetails = async () => {
    const normalizedBirthDate = toCanonicalBirthDate(birthDate, birthMask.order)
    await AsyncStorage.setItem(PROFILE_DETAILS_STORAGE_KEY, JSON.stringify({ username, email, fullName, country, city, birthDate: normalizedBirthDate, phone, bio }))
    setBirthDate(formatBirthInput(normalizedBirthDate, birthMask.order, birthMask.sep))
    toast(lt("Profil kaydedildi.", "Profile saved.", "Profil gespeichert.", "Профиль сохранён."))
  }

  const watchAdAndEarn = async () => {
    if (rewardLoading) return
    const current = normalizedReward
    const now = Date.now()
    if (now < current.lockUntil) return toast(lt(`Güvenlik kilidi: ${Math.ceil((current.lockUntil - now) / 1000)} sn`, "Security lock active", "Sicherheits-Sperre aktiv", "Защитная блокировка активна"))
    if (current.watched >= adminReward.dailyLimit) return toast(lt("Bugünkü hak doldu.", "Daily limit reached.", "Tageslimit erreicht.", "Дневной лимит достигнут."))
    if (now < current.lastAt + adminReward.cooldownSec * 1000) return toast(lt("Bekleme süresi devam ediyor.", "Cooldown active.", "Wartezeit aktiv.", "Ожидание ещё активно."))
    if (now < current.lastAt - 60_000) {
      await saveReward({ ...current, lockUntil: now + adminReward.clockDriftLockMinutes * 60_000 })
      return toast(lt("Saat uyumsuzluğu algılandı.", "Clock mismatch detected.", "Zeitabweichung erkannt.", "Обнаружено несоответствие времени."))
    }

    const attempts = [...current.attempts, now].filter((ts) => ts >= now - 10 * 60_000)
    if (attempts.length >= adminReward.maxAttemptsIn10Min) {
      await saveReward({ ...current, attempts, lockUntil: now + adminReward.spamLockMinutes * 60_000 })
      return toast(lt("Çok sık deneme algılandı.", "Too many attempts.", "Zu viele Versuche.", "Слишком много попыток."))
    }

    await saveReward({ ...current, attempts })
    setRewardLoading(true)
    const result = await showRewardedAd()
    setRewardLoading(false)
    if (!result.completed) return toast(lt("Reklam tamamlanmadı.", "Ad not completed.", "Werbung nicht abgeschlossen.", "Реклама не досмотрена."))

    const avgRevenueMicros = result.revenueMicros && result.revenueMicros > 0
      ? Math.round((current.avgRevenueMicros || result.revenueMicros) * 0.8 + result.revenueMicros * 0.2)
      : current.avgRevenueMicros
    await addWalletCredit(rewardAmountNow, lt(`İzle kazan: +${rewardAmountNow} TL`, `Watch & earn: +${rewardAmountNow} TRY`, `Ansehen & verdienen: +${rewardAmountNow} TRY`, `Смотри и получай: +${rewardAmountNow} TRY`))
    await saveReward({ ...current, watched: current.watched + 1, lastAt: Date.now(), avgRevenueMicros, lockUntil: 0, attempts })
  }

  if (!ready) return <View style={styles.container} />

  return (
    <ScrollView contentContainerStyle={[styles.container, compact && styles.containerCompact]}>
      <View style={styles.content}>
        <View style={styles.hero}>
          <ImageBackground source={{ uri: PROFILE_HERO_IMAGE_URI }} style={styles.bgWrap} imageStyle={styles.bgImage} />
          <View pointerEvents="none" style={styles.bgOverlay} />
          <View pointerEvents="none" style={styles.accentTop} />
          <View style={styles.heroRow}>
            <View style={styles.badge}><Ionicons name="person" size={14} color={tc("#5E4032")} /><Text style={styles.badgeText}>{t("profile", language)}</Text></View>
            {isAdmin && (
              <Pressable style={styles.adminBtn} onPress={() => router.push("/admin") }>
                <Ionicons name="settings-outline" size={14} color={tc("#7A2F4D")} />
                <Text style={styles.adminBtnText}>Admin</Text>
              </Pressable>
            )}
          </View>
          <View style={styles.avatarWrap}>
            {avatarMode === "photo" && avatarPhotoUri ? (
              <Image source={{ uri: avatarPhotoUri }} style={styles.avatarPhoto} />
            ) : (
              <View style={styles.avatarPresetBox}>
                <Image source={selectedPreset.source} style={styles.avatarPresetPreview} />
              </View>
            )}
          </View>
          <Text style={styles.title}>{t("profile", language)}</Text>
          <Text style={styles.subtitle}>{t("authAndSecurity", language)}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t("language", language)}</Text>
          <View style={styles.row}>{languages.map((l) => (
            <Pressable key={l} style={[styles.chip, language === l && styles.chipActive]} onPress={() => void updateLanguage(l)}><Text style={[styles.chipText, language === l && styles.chipTextActive]}>{languageLabels[l]}</Text></Pressable>
          ))}</View>
        </View>

        <View style={[styles.card, styles.cardPlain]}>
          <Text style={styles.sectionTitle}>{lt("Profil Fotoğrafı", "Profile Photo", "Profilfoto", "Фото профиля")}</Text>
          <View style={styles.row}>
            <Pressable style={styles.chip} onPress={() => void pickGallery()}><Text style={styles.chipText}>{lt("Galeriden Seç", "Gallery", "Galerie", "Галерея")}</Text></Pressable>
            <Pressable style={styles.chip} onPress={() => void pickCamera()}><Text style={styles.chipText}>{lt("Kamera", "Camera", "Kamera", "Kamera")}</Text></Pressable>
            <Pressable style={styles.chip} onPress={() => void saveAvatar({ mode: "preset", presetId: avatarPresets[0].id, photoUri: "" })}><Text style={styles.chipText}>{lt("Sıfırla", "Reset", "Zurücksetzen", "Сброс")}</Text></Pressable>
          </View>
          <View style={styles.row}>
            {avatarPresets.map((a) => (
              <Pressable key={a.id} style={[styles.avatarChip, avatarMode === "preset" && avatarPreset === a.id && styles.avatarChipActive]} onPress={() => void saveAvatar({ mode: "preset", presetId: a.id, photoUri: avatarPhotoUri })}>
                <Image source={a.source} style={styles.avatarChipImage} />
              </Pressable>
            ))}
          </View>
        </View>

        <View style={[styles.card, styles.cardPlain]}>
          <Text style={styles.sectionTitle}>{lt("Kişisel Bilgiler", "Personal Details", "Persönliche Daten", "Личные данные")}</Text>
          <Field label={lt("Kullanıcı Adı", "Username", "Benutzername", "Имя пользователя")} value={username} onChangeText={setUsername} placeholder={lt("Kullanıcı adını gir", "Enter username", "Benutzername eingeben", "Введите имя пользователя")} />
          <Field label={lt("E-posta", "Email", "E-Mail", "Эл. почта")} value={email} onChangeText={setEmail} placeholder={lt("E-posta adresini gir", "Enter email", "E-Mail eingeben", "Введите эл. почту")} keyboardType="email-address" />
          <Field label={lt("Ad Soyad", "Full Name", "Vollständiger Name", "Полное имя")} value={fullName} onChangeText={setFullName} placeholder={lt("Ad soyad gir", "Enter full name", "Vollständigen Namen eingeben", "Введите полное имя")} />
          <Field label={lt("Ülke", "Country", "Land", "Страна")} value={country} onChangeText={setCountry} placeholder={lt("Ülke", "Country", "Land", "Страна")} />
          <Field label={lt("Şehir", "City", "Stadt", "Город")} value={city} onChangeText={setCity} placeholder={lt("Şehir", "City", "Stadt", "Город")} />
          <Field
            label={lt("Doğum Tarihi", "Birth Date", "Geburtsdatum", "Дата рождения")}
            value={birthDate}
            onChangeText={onBirthDateChange}
            placeholder={lt("GG/AA/YYYY", "MM/DD/YYYY", "TT.MM.JJJJ", "DD.MM.YYYY")}
          />
          <Field label={lt("Telefon", "Phone", "Telefon", "Telefon")} value={phone} onChangeText={setPhone} placeholder={lt("Telefon", "Phone", "Telefon", "Telefon")} keyboardType="phone-pad" />
          <Text style={styles.fieldLabel}>{lt("Kısa Not / Hakkımda", "Short Bio", "Kurze Notiz / Über mich", "Краткая заметка / Обо мне")}</Text>
          <TextInput value={bio} onChangeText={setBio} placeholder={lt("Kendinden kısaca bahset", "Write a short bio", "Schreibe kurz über dich", "Кратко расскажи о себе")} placeholderTextColor={tc("#7B5A49")} style={[styles.input, styles.bioInput]} multiline />
          <Pressable style={styles.saveBtn} onPress={() => void saveDetails()}><Text style={styles.saveBtnText}>{lt("Bilgileri Kaydet", "Save", "Speichern", "Сохранить")}</Text></Pressable>
        </View>

        <View style={[styles.card, styles.cardPlain]}>
          <Text style={styles.sectionTitle}>{lt("Cüzdan", "Wallet", "Wallet", "Кошелёк")}</Text>
          <Text style={styles.walletBalance}>{`${wallet.balance.toLocaleString("tr-TR")} TL`}</Text>
          <Field label={lt("Bakiye Ekle", "Top Up", "Guthaben aufladen", "Пополнить баланс")} value={walletAmount} onChangeText={setWalletAmount} placeholder={lt("Tutar (TL)", "Amount (TRY)", "Betrag (TRY)", "Сумма (TRY)")} keyboardType="number-pad" />
          <View style={styles.row}>{quickTopups.map((v) => <Pressable key={v} style={styles.chip} onPress={() => void addWalletCredit(v, lt("Bakiye eklendi.", "Balance added.", "Guthaben hinzugefügt.", "Баланс пополнен."))}><Text style={styles.chipText}>{`+${v} TL`}</Text></Pressable>)}</View>
          <Pressable style={[styles.saveBtn, { marginTop: 8 }]} onPress={() => void addWalletCredit(parseAmount(walletAmount), lt("Bakiye eklendi.", "Balance added.", "Guthaben hinzugefügt.", "Баланс пополнен."))}><Text style={styles.saveBtnText}>{lt("Özel Tutar Ekle", "Add Custom", "Eigenen Betrag hinzufügen", "Добавить свою сумму")}</Text></Pressable>

          <View style={styles.rewardBox}>
            <Text style={styles.sectionTitle}>{lt("İzle Kazan", "Watch & Earn", "Schauen & Verdienen", "Смотри и зарабатывай")}</Text>
            <Text style={styles.rewardLine}>{lt(`Reklamı tam izleyince +${rewardAmountNow} TL kazanırsın.`, `Complete ad and earn +${rewardAmountNow} TRY.`, `Beim vollständigen Ansehen +${rewardAmountNow} TRY verdienen.`, `Dosmotri reklamu i poluchi +${rewardAmountNow} TRY.`)}</Text>
            <Text style={styles.rewardLine}>{lt(`Kalan hak: ${rewardRemaining}/${adminReward.dailyLimit}`, `Remaining: ${rewardRemaining}/${adminReward.dailyLimit}`, `Verbleibend: ${rewardRemaining}/${adminReward.dailyLimit}`, `Ostalos: ${rewardRemaining}/${adminReward.dailyLimit}`)}</Text>
            {!!lockLeftSec && <Text style={styles.rewardWait}>{lt(`Güvenlik kilidi: ${lockLeftSec} sn`, `Security lock: ${lockLeftSec}s`, `Sicherheits-Sperre: ${lockLeftSec}s`, `Защитная блокировка: ${lockLeftSec}s`)}</Text>}
            {!!cooldownLeftSec && <Text style={styles.rewardWait}>{lt(`Bekleme: ${cooldownLeftSec} sn`, `Cooldown: ${cooldownLeftSec}s`, `Wartezeit: ${cooldownLeftSec}s`, `Ожидание: ${cooldownLeftSec}s`)}</Text>}
            <Pressable style={[styles.saveBtn, (rewardLoading || rewardRemaining === 0 || cooldownLeftSec > 0 || lockLeftSec > 0) && styles.disabled]} onPress={() => void watchAdAndEarn()}>
              <Text style={styles.saveBtnText}>{rewardLoading ? lt("Reklam yükleniyor...", "Loading ad...", "Werbung lädt...", "Загружается реклама...") : lt("Reklam İzle + Kazan", "Watch + Earn", "Ansehen + Verdienen", "Смотреть + Получить")}</Text>
            </Pressable>
          </View>

          <Text style={styles.sectionTitle}>{lt("Son İşlemler", "Recent Transactions", "Letzte Transaktionen", "Последние операции")}</Text>
          {wallet.entries.length === 0 ? <Text style={styles.empty}>{lt("Henüz işlem yok.", "No transaction yet.", "Noch keine Transaktion.", "Пока нет операций.")}</Text> : wallet.entries.map((e) => (
            <View key={e.id} style={styles.txItem}><Text style={styles.txAmount}>{`+${e.amount} TL`}</Text><Text style={styles.txDate}>{new Date(e.createdAt).toLocaleDateString("tr-TR")}</Text></View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{lt("Görünüm", "Appearance", "Darstellung", "Внешний вид")}</Text>
          <View style={styles.row}>
            <Pressable
              style={[styles.chip, mode === "light" && styles.chipActive]}
              onPress={() => void setMode("light")}
            >
              <Text style={[styles.chipText, mode === "light" && styles.chipTextActive]}>
                {lt("Gündüz Modu", "Light Mode", "Tagmodus", "Дневной режим")}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.chip, mode === "dark" && styles.chipActive]}
              onPress={() => void setMode("dark")}
            >
              <Text style={[styles.chipText, mode === "dark" && styles.chipTextActive]}>
                {lt("Gece Modu", "Dark Mode", "Nachtmodus", "Ночной режим")}
              </Text>
            </Pressable>
          </View>
          <Text style={styles.modeHint}>
            {lt("Seçim tüm modüllerde anında uygulanır.", "Applies to all modules instantly.", "Wird sofort in allen Modulen angewendet.", "Применяется во всех модулях сразу.")}
          </Text>
        </View>

        {!!feedback && <Text style={styles.feedback}>{feedback}</Text>}
      </View>
    </ScrollView>
  )
}

type FieldProps = { label: string; value: string; onChangeText: (v: string) => void; placeholder: string; keyboardType?: "default" | "email-address" | "phone-pad" | "number-pad" }
function Field({ label, value, onChangeText, placeholder, keyboardType = "default" }: FieldProps) {
  return (
    <>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={tc("#7B5A49")} style={styles.input} keyboardType={keyboardType} />
    </>
  )
}

const styles = StyleSheet.create({
  container: { ...moduleStyles.page, padding: 20 },
  containerCompact: { ...moduleStyles.pageCompact, padding: 16 },
  content: { ...moduleStyles.content },
  hero: { borderRadius: 16, borderWidth: 1, borderColor: tc("#E9D8C8"), backgroundColor: tc("#FFFDF9"), padding: 14, marginBottom: 12, overflow: "hidden" },
  bgWrap: { ...StyleSheet.absoluteFillObject },
  bgImage: { opacity: 0.4 },
  bgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,248,241,0.95)" },
  accentTop: { position: "absolute", left: 0, right: 0, top: 0, height: 4, backgroundColor: BRAND },
  heroRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  badge: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, borderWidth: 1, borderColor: tc("#E7D4C4"), backgroundColor: tc("#F3E7DC"), paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { color: tc("#5E4032"), fontSize: 12, fontWeight: "600" },
  adminBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, borderWidth: 1, borderColor: tc("#F0CADC"), backgroundColor: tc("#FFF5F9"), paddingHorizontal: 10, paddingVertical: 5 },
  adminBtnText: { color: tc("#7A2F4D"), fontSize: 12, fontWeight: "600" },
  avatarWrap: { width: 86, height: 86, borderRadius: 999, borderWidth: 2, borderColor: "rgba(255,255,255,0.9)", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.8)", marginBottom: 8 },
  avatarPhoto: { width: "100%", height: "100%", borderRadius: 999 },
  avatarPresetBox: { width: "100%", height: "100%", borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: tc("#EFE5F8") },
  avatarPresetPreview: { width: "100%", height: "100%", borderRadius: 999 },
  title: { fontSize: 28, color: tc("#4A342A"), fontWeight: "600" },
  subtitle: { marginTop: 4, color: tc("#7A5B4E"), fontSize: 14, fontWeight: "600" },
  card: { backgroundColor: tc("#FFFDF9"), borderRadius: 16, borderWidth: 1, borderColor: tc("#E9D8C8"), padding: 16, marginBottom: 12 },
  cardPlain: { backgroundColor: tc("#FFFFFF") },
  sectionTitle: { color: tc("#4A342A"), fontWeight: "600", marginBottom: 10, marginTop: 6, fontSize: 16 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: tc("#E0CFC2"), backgroundColor: tc("#FFF9F3") },
  chipActive: { borderColor: BRAND, backgroundColor: tc("#FFE8F2") },
  chipText: { color: tc("#4A342A"), fontSize: 13, fontWeight: "600" },
  chipTextActive: { color: tc("#7A2F4D") },
  modeHint: { color: tc("#7A5B4E"), fontSize: 12, fontWeight: "600", marginTop: 2 },
  avatarChip: {
    width: 92,
    height: 92,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: tc("#E0CFC2"),
    backgroundColor: tc("#F6F2F8"),
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarChipActive: {
    borderColor: BRAND,
    backgroundColor: tc("#FFE8F2"),
    shadowColor: BRAND,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  avatarChipImage: { width: "100%", height: "100%" },
  fieldLabel: { color: tc("#4A342A"), fontSize: 13, fontWeight: "600", marginBottom: 5, marginTop: 4 },
  input: { minHeight: 44, borderRadius: 10, borderWidth: 1.5, borderColor: tc("#CFAF9A"), backgroundColor: tc("#FFFFFF"), color: tc("#2F2018"), fontSize: 15, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8 },
  bioInput: { minHeight: 80, textAlignVertical: "top" },
  saveBtn: { minHeight: 42, borderRadius: 10, backgroundColor: BRAND, alignItems: "center", justifyContent: "center", marginTop: 4 },
  saveBtnText: { color: tc("#FFF"), fontSize: 14, fontWeight: "600" },
  disabled: { opacity: 0.5 },
  walletBalance: { color: tc("#2F2018"), fontSize: 28, fontWeight: "600", marginBottom: 8 },
  rewardBox: { marginTop: 10, borderWidth: 1, borderColor: tc("#E8D8CB"), borderRadius: 12, padding: 10, backgroundColor: tc("#FFF9F3") },
  rewardLine: { color: tc("#6B4D40"), fontSize: 12, fontWeight: "600", marginBottom: 2 },
  rewardWait: { color: tc("#7A2F4D"), fontSize: 11, fontWeight: "600", marginTop: 4 },
  empty: { color: tc("#7A5B4E"), fontSize: 12, fontWeight: "600" },
  txItem: { flexDirection: "row", justifyContent: "space-between", borderWidth: 1, borderColor: tc("#E8D8CB"), borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: tc("#FFF9F3"), marginBottom: 6 },
  txAmount: { color: tc("#2F2018"), fontSize: 13, fontWeight: "600" },
  txDate: { color: tc("#7A5B4E"), fontSize: 12, fontWeight: "600" },
  feedback: { color: tc("#7A2F4D"), fontSize: 12, fontWeight: "600", marginBottom: 10 },
})

