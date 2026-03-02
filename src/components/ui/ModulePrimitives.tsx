import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from "react-native"
import { moduleStyles, moduleTheme } from "@/src/theme/moduleStyles"

type ModuleScreenProps = {
  children: React.ReactNode
  compact?: boolean
  contentStyle?: StyleProp<ViewStyle>
  showsVerticalScrollIndicator?: boolean
}

type ModuleCardProps = {
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
}

type ModuleButtonProps = {
  text: string
  onPress?: () => void
  variant?: "primary" | "ghost"
  style?: StyleProp<ViewStyle>
  disabled?: boolean
}

type ModuleInputProps = TextInputProps & {
  style?: TextInputProps["style"]
}

export function ModuleScreen({ children, compact, contentStyle, showsVerticalScrollIndicator = false }: ModuleScreenProps) {
  return (
    <ScrollView
      contentContainerStyle={[moduleStyles.page, compact && moduleStyles.pageCompact, contentStyle]}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
    >
      {children}
    </ScrollView>
  )
}

export function ModuleCard({ children, style }: ModuleCardProps) {
  return <View style={[moduleStyles.card, style]}>{children}</View>
}

export function ModuleButton({ text, onPress, variant = "primary", style, disabled }: ModuleButtonProps) {
  const buttonStyle = variant === "primary" ? moduleStyles.buttonPrimary : moduleStyles.buttonGhost
  const textStyle = variant === "primary" ? moduleStyles.buttonPrimaryText : moduleStyles.buttonGhostText
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[buttonStyle, disabled && styles.disabled, style]}>
      <Text style={textStyle}>{text}</Text>
    </Pressable>
  )
}

export function ModuleInput(props: ModuleInputProps) {
  return <TextInput {...props} style={[moduleStyles.input, props.style]} />
}

const styles = StyleSheet.create({
  disabled: {
    opacity: 0.55,
  },
  subtleBorder: {
    borderColor: moduleTheme.colors.border,
  },
})

