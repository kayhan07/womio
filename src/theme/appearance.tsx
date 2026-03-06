import AsyncStorage from "@react-native-async-storage/async-storage"
import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { applyThemeMode } from "./runtimeTheme"

export type AppearanceMode = "light" | "dark"

const APPEARANCE_KEY = "womio:appearanceMode"

type AppearanceContextType = {
  mode: AppearanceMode
  ready: boolean
  setMode: (next: AppearanceMode) => Promise<void>
}

const AppearanceContext = createContext<AppearanceContextType>({
  mode: "light",
  ready: false,
  setMode: async () => {},
})

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<AppearanceMode>("light")
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem(APPEARANCE_KEY)
        if (!mounted) return
        if (raw === "dark" || raw === "light") {
          setModeState(raw)
          applyThemeMode(raw)
        } else {
          applyThemeMode("light")
        }
      } finally {
        if (mounted) setReady(true)
      }
    }
    void load()
    return () => {
      mounted = false
    }
  }, [])

  const setMode = async (next: AppearanceMode) => {
    applyThemeMode(next)
    setModeState(next)
    await AsyncStorage.setItem(APPEARANCE_KEY, next)
  }

  const value = useMemo(() => ({ mode, ready, setMode }), [mode, ready])
  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>
}

export const useAppAppearance = () => useContext(AppearanceContext)
