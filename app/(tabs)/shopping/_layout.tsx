import { Stack } from "expo-router"
import { t, useAppLanguage } from "@/src/core/i18n"
import { moduleTheme } from "@/src/theme/moduleStyles"

export default function ShoppingLayout() {
  const { language, ready } = useAppLanguage()

  return (
    <Stack
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: moduleTheme.colors.appBackground },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: moduleTheme.colors.appBackground },
        headerTintColor: moduleTheme.colors.textStrong,
        headerTitleStyle: { fontWeight: "600" },
      }}
    >
      <Stack.Screen name="index" options={{ title: "", headerBackVisible: false }} />
      <Stack.Screen name="experience" options={{ title: ready ? t("shoppingSectionExperience", language) : "Experience" }} />
      <Stack.Screen name="market" options={{ title: ready ? t("shoppingSectionMarket", language) : "Market" }} />
      <Stack.Screen name="compare" options={{ title: ready ? t("shoppingSectionCompare", language) : "Compare" }} />
      <Stack.Screen name="sell" options={{ title: ready ? t("shoppingSectionSell", language) : "Sell" }} />
      <Stack.Screen name="sell-detail" options={{ title: "Ürün Detay" }} />
    </Stack>
  )
}





