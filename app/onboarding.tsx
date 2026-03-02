import { router } from "expo-router"
import { ImageBackground, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native"

const ONBOARD_IMAGE_URI = "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80"

export default function Onboarding() {
  const { width } = useWindowDimensions()
  const compact = width < 360

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <View style={styles.card}>
        <View pointerEvents="none" style={styles.bgWrap}>
          <ImageBackground source={{ uri: ONBOARD_IMAGE_URI }} style={styles.bgWrap} imageStyle={styles.bgImage} />
        </View>
        <View pointerEvents="none" style={styles.bgOverlay} />

        <Text style={[styles.title, compact && styles.titleCompact]}>WOMIO</Text>
        <Text style={[styles.subtitle, compact && styles.subtitleCompact]}>Gunluk hayatini planlayan dijital arkadasin</Text>

        <Pressable style={styles.button} onPress={() => router.replace("/login")}>
          <Text style={styles.buttonText}>Devam</Text>
        </Pressable>
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
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E9D8C8",
    backgroundColor: "#FFFDF9",
    minHeight: 320,
    justifyContent: "center",
    padding: 18,
    overflow: "hidden",
    position: "relative",
  },
  bgWrap: { ...StyleSheet.absoluteFillObject },
  bgImage: { opacity: 0.6 },
  bgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,247,239,0.66)" },
  title: {
    color: "#3F2B22",
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "900",
    textAlign: "center",
  },
  titleCompact: { fontSize: 30, lineHeight: 36 },
  subtitle: {
    marginTop: 10,
    color: "#6D564A",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 22,
    fontWeight: "500",
  },
  subtitleCompact: { fontSize: 14, lineHeight: 20 },
  button: {
    alignSelf: "center",
    minWidth: 170,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "#FF0066",
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
    lineHeight: 20,
  },
})


