import { StyleSheet, Text, View } from "react-native"
import { tokens } from "../../theme/tokens"

type SectionHeaderProps = {
  title: string
  subtitle?: string
}

export function SectionHeader({ title, subtitle }: SectionHeaderProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: tokens.spacing.xl,
    marginBottom: tokens.spacing.sm,
  },
  title: {
    fontSize: tokens.typography.h2,
    lineHeight: 26,
    fontWeight: "600",
    color: tokens.colors.textStrong,
  },
  subtitle: {
    marginTop: 2,
    fontSize: tokens.typography.body,
    lineHeight: 20,
    color: tokens.colors.textMuted,
    fontWeight: "400",
  },
})


