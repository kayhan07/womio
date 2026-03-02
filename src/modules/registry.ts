import { tokens } from "@/src/theme/tokens"

export type AppModule = {
  id: "health" | "jobs" | "shopping" | "food" | "astrology"
  route: "/(tabs)/health" | "/(tabs)/services" | "/(tabs)/shopping" | "/(tabs)/food" | "/(tabs)/astrology"
  color: string
}

export const moduleRegistry: AppModule[] = [
  {
    id: "health",
    route: "/(tabs)/health",
    color: tokens.moduleCard.health,
  },
  {
    id: "jobs",
    route: "/(tabs)/services",
    color: tokens.moduleCard.jobs,
  },
  {
    id: "shopping",
    route: "/(tabs)/shopping",
    color: tokens.moduleCard.shopping,
  },
  {
    id: "food",
    route: "/(tabs)/food",
    color: tokens.moduleCard.food,
  },
  {
    id: "astrology",
    route: "/(tabs)/astrology",
    color: tokens.moduleCard.astrology,
  },
]
