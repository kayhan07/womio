import { Image } from "expo-image"
import { StyleSheet, Text, View } from "react-native"
import { tc } from "../../theme/tokens"
import { getInitials, getProfileAvatarSource, ProfileAvatarConfig } from "../../modules/profile/avatar"

type Props = {
  size?: number
  name?: string
  avatar?: ProfileAvatarConfig | null
  active?: boolean
}

export function AppAvatar({ size = 36, name = "", avatar, active = false }: Props) {
  const radius = Math.round(size / 2)
  if (avatar) {
    return (
      <View style={[styles.wrap, { width: size, height: size, borderRadius: radius }, active && styles.wrapActive]}>
        <Image source={getProfileAvatarSource(avatar)} style={{ width: size, height: size, borderRadius: radius }} contentFit="cover" />
      </View>
    )
  }
  return (
    <View style={[styles.wrap, styles.fallback, { width: size, height: size, borderRadius: radius }, active && styles.wrapActive]}>
      <Text style={[styles.txt, active && styles.txtActive]}>{getInitials(name)}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderColor: tc("#E6D2C6"),
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tc("#FFF"),
  },
  fallback: { backgroundColor: tc("#FFF4EC") },
  wrapActive: { borderColor: tc("#FF0066") },
  txt: { color: tc("#6E5549"), fontSize: 11, fontWeight: "700" },
  txtActive: { color: tc("#6F3453") },
})
