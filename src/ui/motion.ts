import type { MutableRefObject } from "react"
import { Animated, Easing } from "react-native"

export type MotionProfile = "soft" | "normal" | "snappy"

// Change only this value to tune motion speed globally.
export const MOTION_PROFILE: MotionProfile = "normal"

const PRESET: Record<MotionProfile, { stagger: number; duration: number; pressIn: { speed: number; bounciness: number }; pressOut: { speed: number; bounciness: number } }> = {
  soft: {
    stagger: 90,
    duration: 380,
    pressIn: { speed: 20, bounciness: 3 },
    pressOut: { speed: 16, bounciness: 5 },
  },
  normal: {
    stagger: 70,
    duration: 320,
    pressIn: { speed: 24, bounciness: 4 },
    pressOut: { speed: 20, bounciness: 6 },
  },
  snappy: {
    stagger: 50,
    duration: 250,
    pressIn: { speed: 28, bounciness: 3 },
    pressOut: { speed: 24, bounciness: 5 },
  },
}

export const ensureEnterAnimArray = (ref: MutableRefObject<Animated.Value[]>, length: number) => {
  ref.current = Array.from({ length }, (_, i) => ref.current[i] ?? new Animated.Value(0))
  return ref.current
}

export const runStaggerEnter = (
  ref: MutableRefObject<Animated.Value[]>,
  staggerMs?: number,
  durationMs?: number,
) => {
  const preset = PRESET[MOTION_PROFILE]
  const stagger = staggerMs ?? preset.stagger
  const duration = durationMs ?? preset.duration
  ref.current.forEach((v) => v.setValue(0))
  Animated.stagger(
    stagger,
    ref.current.map((v) =>
      Animated.timing(v, {
        toValue: 1,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ),
  ).start()
}

export const getOrCreatePressAnim = (
  store: MutableRefObject<Record<string, Animated.Value>>,
  key: string,
) => {
  if (!store.current[key]) store.current[key] = new Animated.Value(1)
  return store.current[key]
}

export const pressIn = (value: Animated.Value) => {
  const cfg = PRESET[MOTION_PROFILE].pressIn
  Animated.spring(value, {
    toValue: 0.985,
    speed: cfg.speed,
    bounciness: cfg.bounciness,
    useNativeDriver: true,
  }).start()
}

export const pressOut = (value: Animated.Value) => {
  const cfg = PRESET[MOTION_PROFILE].pressOut
  Animated.spring(value, {
    toValue: 1,
    speed: cfg.speed,
    bounciness: cfg.bounciness,
    useNativeDriver: true,
  }).start()
}

export const cardMotionStyle = (enter: Animated.Value, press?: Animated.Value, lift = 14) => ({
  opacity: enter,
  transform: [
    { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [lift, 0] }) },
    ...(press ? [{ scale: press }] : []),
  ],
})
