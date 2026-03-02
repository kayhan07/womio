import { StyleSheet, Text, View } from "react-native"
import { tokens } from "@/src/theme/tokens"

type Props = {
  title: string
  subtitle?: string
  compact?: boolean
}

export function SectionHeader({ title, subtitle, compact = false }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, compact && styles.titleCompact]}>{title}</Text>
      {!!subtitle && <Text style={[styles.subtitle, compact && styles.subtitleCompact]}>{subtitle}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { marginBottom: tokens.spacing.sm },
  title: { color: tokens.colors.textStrong, fontSize: 22, lineHeight: 28, fontWeight: "600" },
  titleCompact: { fontSize: 20, lineHeight: 26 },
  subtitle: { marginTop: 4, color: tokens.colors.textMuted, fontSize: 14, lineHeight: 20, fontWeight: "500" },
  subtitleCompact: { fontSize: 13, lineHeight: 19 },
})

