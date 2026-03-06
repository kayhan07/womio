import { Stack } from "expo-router"
import { moduleTheme } from "../../../src/theme/moduleStyles"

export default function AstrologyLayout() {
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
      <Stack.Screen name="daily" options={{ title: "Günlük Burç Yorumu" }} />
      <Stack.Screen name="compatibility" options={{ title: "" }} />
      <Stack.Screen name="tarot" options={{ title: "Tarot Falı" }} />
      <Stack.Screen name="coffee" options={{ title: "Kahve Falı" }} />
    </Stack>
  )
}






