import { StyleSheet } from "react-native"
import { tokens } from "@/src/theme/tokens"

export const moduleTheme = {
  colors: tokens.colors,
  moduleCard: tokens.moduleCard,
  radius: tokens.radius,
  spacing: tokens.spacing,
  typography: tokens.typography,
  shadow: tokens.shadow,
} as const

export const moduleStyles = StyleSheet.create({
  page: {
    flexGrow: 1,
    backgroundColor: "transparent",
    padding: tokens.spacing.md,
    paddingBottom: 116,
  },
  pageCompact: {
    padding: tokens.spacing.sm,
  },
  content: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    position: "relative",
  },
  card: {
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.lg + 6,
    borderWidth: 1.15,
    borderColor: tokens.colors.borderStrong,
    padding: tokens.spacing.md + 6,
    ...tokens.shadow.card,
  },
  cardCompact: {
    padding: tokens.spacing.sm,
  },
  title: {
    color: tokens.colors.textStrong,
    fontSize: tokens.typography.h2 + 1,
    lineHeight: 30,
    fontWeight: "600",
    letterSpacing: 0.12,
  },
  subtitle: {
    color: tokens.colors.textMuted,
    fontSize: tokens.typography.body + 1,
    lineHeight: 22,
    fontWeight: "500",
  },
  input: {
    backgroundColor: tokens.colors.surfaceSoft,
    borderWidth: 1.4,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.md + 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: tokens.colors.textStrong,
    fontSize: tokens.typography.body + 1,
    lineHeight: 21,
  },
  buttonPrimary: {
    backgroundColor: tokens.colors.brand,
    borderRadius: tokens.radius.md + 2,
    borderWidth: 1,
    borderColor: tokens.colors.brandDark,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    shadowColor: tokens.colors.brandDark,
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  buttonPrimaryText: {
    color: tokens.colors.textInverted,
    fontSize: tokens.typography.body,
    lineHeight: 19,
    fontWeight: "700",
  },
  buttonGhost: {
    backgroundColor: tokens.colors.brandSoft,
    borderColor: tokens.colors.brandBorder,
    borderWidth: 1,
    borderRadius: tokens.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  buttonGhostText: {
    color: tokens.colors.textStrong,
    fontSize: tokens.typography.caption,
    lineHeight: 16,
    fontWeight: "600",
  },
})

