import { StyleSheet, View } from "react-native"

export function ModuleDecor() {
  return (
    <View pointerEvents="none" style={styles.layer}>
      <View style={styles.decorA} />
      <View style={styles.decorB} />
      <View style={styles.decorC} />
    </View>
  )
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
  },
  decorA: {
    position: "absolute",
    top: -150,
    right: -120,
    width: 330,
    height: 330,
    borderRadius: 999,
    backgroundColor: "rgba(82,36,196,0.34)",
  },
  decorB: {
    position: "absolute",
    bottom: -170,
    left: -150,
    width: 380,
    height: 380,
    borderRadius: 999,
    backgroundColor: "rgba(176,48,142,0.26)",
  },
  decorC: {
    position: "absolute",
    top: "35%",
    left: "30%",
    width: 200,
    height: 200,
    borderRadius: 999,
    backgroundColor: "rgba(62,30,160,0.18)",
  },
})


