import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"
import { tokens } from "@/src/theme/tokens"

type PremiumCardProps = {
  children: React.ReactNode
  onPress?: () => void
  style?: StyleProp<ViewStyle>
}

export function PremiumCard({ children, onPress, style }: PremiumCardProps) {
  if (!onPress) {
    return <View style={[styles.card, style]}>{children}</View>
  }

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}>
      {children}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.surface,
    overflow: "hidden",
    ...tokens.shadow.card,
  },
  pressed: {
    transform: [{ scale: 0.985 }],
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
})


