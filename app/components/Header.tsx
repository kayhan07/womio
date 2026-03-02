import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import {
  Animated,
  Pressable,
  StyleSheet
} from "react-native"
import { moduleTheme } from "@/src/theme/moduleStyles"

export default function Header({ scrollY }: any) {
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

      {/* Profil Avatar */}
      <Pressable
        style={styles.avatar}
        onPress={() => router.push("/(tabs)/profile")}
      >
        <Ionicons
          name="person-circle"
          size={32}
          color={moduleTheme.colors.avatar}
        />
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
})

