import AsyncStorage from "@react-native-async-storage/async-storage"
import { createContext, createElement, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { defaultLanguage, translations } from "./translations"
import type { AppLanguage } from "./types"

const LANGUAGE_STORAGE_KEY = "appLanguage"
const fallback = defaultLanguage

export const t = (key: string, language: AppLanguage = fallback) => {
  return translations[language]?.[key] ?? translations[fallback]?.[key] ?? key
}

export const saveLanguage = async (language: AppLanguage) => {
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language)
}

export const getLanguage = async (): Promise<AppLanguage> => {
  const language = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)
  if (language === "tr" || language === "en" || language === "de" || language === "ru") {
    return language
  }
  return fallback
}

type AppLanguageContextValue = {
  language: AppLanguage
  ready: boolean
  updateLanguage: (next: AppLanguage) => Promise<void>
}

const AppLanguageContext = createContext<AppLanguageContextValue | null>(null)

export const AppLanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<AppLanguage>(fallback)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      const selected = await getLanguage()
      if (!mounted) return
      setLanguage(selected)
      setReady(true)
    }
    void load()
    return () => {
      mounted = false
    }
  }, [])

  const updateLanguage = async (next: AppLanguage) => {
    setLanguage(next)
    await saveLanguage(next)
  }

  const value = useMemo<AppLanguageContextValue>(
    () => ({ language, ready, updateLanguage }),
    [language, ready]
  )

  return createElement(AppLanguageContext.Provider, { value }, children)
}

export const useAppLanguage = () => {
  const ctx = useContext(AppLanguageContext)
  if (!ctx) {
    // Fallback to avoid crash if provider is missing.
    return {
      language: fallback,
      ready: true,
      updateLanguage: saveLanguage,
    } as AppLanguageContextValue
  }
  return ctx
}
