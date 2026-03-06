import type { AppearanceMode } from "./appearance"
import { tokens } from "./tokens"

const lightPalette = {
  colors: {
    brand: "#FF0066",
    brandDark: "#BE0054",
    brandSoft: "#FFE2F0",
    brandBorder: "#F7A6CC",
    accentPurple: "#6B3F8F",
    accentPurpleSoft: "#E8D8FA",
    accentRose: "#7F355E",
    textStrong: "#3A2740",
    textBody: "#56445E",
    textMuted: "#7E6A88",
    textInverted: "#FFFFFF",
    surface: "rgba(255,255,255,0.96)",
    surfaceSoft: "rgba(255,255,255,0.92)",
    surfaceMuted: "#FFF2FA",
    border: "#E5CDEE",
    borderStrong: "#CDAFDD",
    bgWarmPurple: "#7E57B4",
    appBackground: "#C9B0E3",
    tabInactive: "#856E94",
    tabBarBackground: "rgba(222,202,241,0.94)",
    tabBarBorder: "#9C73C3",
    headerBackground: "rgba(233,217,245,0.96)",
    headerBorder: "#B78ED8",
    avatar: "#B46FB5",
  },
  moduleCard: {
    health: "#F3C4CF",
    jobs: "#D6E4FF",
    shopping: "#D5F2E3",
    food: "#FCE8D9",
    astrology: "#FCE7C8",
  },
}

const darkPalette = {
  colors: {
    brand: "#FF0066",
    brandDark: "#B3004A",
    brandSoft: "rgba(255,0,102,0.18)",
    brandBorder: "rgba(255,120,178,0.44)",
    accentPurple: "#B996E8",
    accentPurpleSoft: "rgba(111,78,162,0.26)",
    accentRose: "#D08CB2",
    textStrong: "#F7ECFF",
    textBody: "#E8D8F5",
    textMuted: "#C7B1DB",
    textInverted: "#FFFFFF",
    surface: "rgba(38,25,56,0.90)",
    surfaceSoft: "rgba(45,30,65,0.88)",
    surfaceMuted: "rgba(59,38,84,0.72)",
    border: "rgba(170,136,214,0.40)",
    borderStrong: "rgba(191,153,238,0.56)",
    bgWarmPurple: "#5A3A82",
    appBackground: "#4B2F68",
    tabInactive: "#C3A8DD",
    tabBarBackground: "rgba(57,33,83,0.92)",
    tabBarBorder: "#744F99",
    headerBackground: "rgba(63,38,92,0.95)",
    headerBorder: "rgba(145,112,186,0.48)",
    avatar: "#E2C2FF",
  },
  moduleCard: {
    health: "rgba(129,82,124,0.65)",
    jobs: "rgba(94,106,158,0.62)",
    shopping: "rgba(74,120,102,0.62)",
    food: "rgba(138,112,88,0.62)",
    astrology: "rgba(128,103,140,0.62)",
  },
}

export const applyThemeMode = (mode: AppearanceMode) => {
  const src = mode === "dark" ? darkPalette : lightPalette
  Object.assign((tokens as any).colors, src.colors)
  Object.assign((tokens as any).moduleCard, src.moduleCard)
}

