import AsyncStorage from "@react-native-async-storage/async-storage"

export const AUTH_TOKEN_KEY = "womio:authToken"

export type AuthUser = {
  id: string
  username: string
  email: string
  birthDate?: string
  roleIds?: string[]
  isAdmin?: boolean
}

const API_BASE = `${process.env.EXPO_PUBLIC_API_BASE_URL ?? ""}`.trim().replace(/\/+$/, "")

export const isAuthApiConfigured = () => API_BASE.length > 0

const requestJson = async (path: string, init?: RequestInit) => {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = [data?.error, data?.detail].filter(Boolean).join(": ")
    throw new Error(`${message || "request failed"}`)
  }
  return data
}

export const registerWithApi = async (input: {
  username: string
  email: string
  password: string
  birthDate?: string
}) => {
  if (!isAuthApiConfigured()) throw new Error("api base url is not configured")
  const data = await requestJson("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  })
  if (data?.token) {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, `${data.token}`)
  }
  return data as { token: string; user: AuthUser }
}

export const loginWithApi = async (input: { email: string; password: string }) => {
  if (!isAuthApiConfigured()) throw new Error("api base url is not configured")
  const data = await requestJson("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  })
  if (data?.token) {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, `${data.token}`)
  }
  return data as { token: string; user: AuthUser }
}

export const getCurrentUserFromApi = async () => {
  if (!isAuthApiConfigured()) return null
  const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY)
  if (!token) return null
  const data = await requestJson("/auth/me", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  })
  return data?.user as AuthUser | undefined
}

export const clearAuthToken = async () => {
  await AsyncStorage.removeItem(AUTH_TOKEN_KEY)
}

