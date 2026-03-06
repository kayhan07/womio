import AsyncStorage from "@react-native-async-storage/async-storage"
import type { ImageSourcePropType } from "react-native"

export const PROFILE_AVATAR_STORAGE_KEY = "profileAvatarV1"

export type AvatarMode = "photo" | "preset"
export type AvatarPresetId =
  | "illustration-w1"
  | "illustration-w2"
  | "illustration-w3"
  | "illustration-w4"
  | "illustration-w5"
  | "illustration-w6"

export type ProfileAvatarConfig = {
  mode: AvatarMode
  photoUri: string
  presetId: AvatarPresetId
}

export const AVATAR_PRESETS: { id: AvatarPresetId; source: ImageSourcePropType }[] = [
  { id: "illustration-w1", source: require("../../../assets/avatars/woman1.png") },
  { id: "illustration-w2", source: require("../../../assets/avatars/woman2.png") },
  { id: "illustration-w3", source: require("../../../assets/avatars/woman3.png") },
  { id: "illustration-w4", source: require("../../../assets/avatars/woman4.png") },
  { id: "illustration-w5", source: require("../../../assets/avatars/woman5.png") },
  { id: "illustration-w6", source: require("../../../assets/avatars/woman6.png") },
]

const DEFAULT_PRESET_ID: AvatarPresetId = "illustration-w1"

const normalizePresetId = (value: unknown): AvatarPresetId => {
  const raw = `${value ?? ""}` as AvatarPresetId
  return AVATAR_PRESETS.some((x) => x.id === raw) ? raw : DEFAULT_PRESET_ID
}

export const normalizeAvatarConfig = (value: unknown): ProfileAvatarConfig => {
  const raw = (value ?? {}) as Partial<ProfileAvatarConfig>
  return {
    mode: raw.mode === "photo" ? "photo" : "preset",
    photoUri: `${raw.photoUri ?? ""}`.trim(),
    presetId: normalizePresetId(raw.presetId),
  }
}

export const loadProfileAvatarConfig = async (): Promise<ProfileAvatarConfig> => {
  const raw = await AsyncStorage.getItem(PROFILE_AVATAR_STORAGE_KEY)
  if (!raw) return normalizeAvatarConfig(null)
  try {
    return normalizeAvatarConfig(JSON.parse(raw))
  } catch {
    return normalizeAvatarConfig(null)
  }
}

export const getProfileAvatarSource = (avatar: ProfileAvatarConfig): ImageSourcePropType | { uri: string } => {
  if (avatar.mode === "photo" && avatar.photoUri) return { uri: avatar.photoUri }
  const preset = AVATAR_PRESETS.find((x) => x.id === avatar.presetId) ?? AVATAR_PRESETS[0]
  return preset.source
}

export const getInitials = (name: string) => {
  const safe = `${name || ""}`.trim()
  if (!safe) return "?"
  const parts = safe.split(" ").filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase()
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase()
}
