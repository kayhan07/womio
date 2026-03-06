import AsyncStorage from "@react-native-async-storage/async-storage"
import * as ImagePicker from "expo-image-picker"
import * as Notifications from "expo-notifications"
import { PermissionsAndroid, Platform } from "react-native"

const PERMISSIONS_BOOTSTRAP_KEY = "womio:permissionsBootstrapV1"

type PermissionState = "granted" | "denied"

export type CorePermissionSnapshot = {
  notifications: PermissionState
  activityRecognition: PermissionState
  mediaLibrary: PermissionState
  camera: PermissionState
}

const requestNotificationsOnce = async (forceRequest = false) => {
  try {
    const current = await Notifications.getPermissionsAsync()
    if (current.status !== "granted" && forceRequest) {
      await Notifications.requestPermissionsAsync()
    }
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF0066",
      })
    }
  } catch {}
}

const requestActivityRecognitionOnce = async (forceRequest = false) => {
  if (Platform.OS !== "android") return
  try {
    const perm = PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION
    if (!perm) return
    const has = await PermissionsAndroid.check(perm)
    if (!has && forceRequest) await PermissionsAndroid.request(perm)
  } catch {}
}

const requestMediaPermissionsOnce = async (forceRequest = false) => {
  if (Platform.OS === "web") return
  try {
    const media = await ImagePicker.getMediaLibraryPermissionsAsync()
    if (!media.granted && media.canAskAgain && forceRequest) {
      await ImagePicker.requestMediaLibraryPermissionsAsync()
    }
  } catch {}
  try {
    const camera = await ImagePicker.getCameraPermissionsAsync()
    if (!camera.granted && camera.canAskAgain && forceRequest) {
      await ImagePicker.requestCameraPermissionsAsync()
    }
  } catch {}
}

const buildSnapshot = async (): Promise<CorePermissionSnapshot> => {
  let notifications: PermissionState = "denied"
  let activityRecognition: PermissionState = "granted"
  let mediaLibrary: PermissionState = "denied"
  let camera: PermissionState = "denied"

  try {
    const n = await Notifications.getPermissionsAsync()
    notifications = n.status === "granted" ? "granted" : "denied"
  } catch {}

  if (Platform.OS === "android") {
    try {
      const perm = PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION
      if (perm) {
        const has = await PermissionsAndroid.check(perm)
        activityRecognition = has ? "granted" : "denied"
      }
    } catch {
      activityRecognition = "denied"
    }
  }

  if (Platform.OS !== "web") {
    try {
      const media = await ImagePicker.getMediaLibraryPermissionsAsync()
      mediaLibrary = media.granted ? "granted" : "denied"
    } catch {}
    try {
      const cam = await ImagePicker.getCameraPermissionsAsync()
      camera = cam.granted ? "granted" : "denied"
    } catch {}
  } else {
    mediaLibrary = "granted"
    camera = "granted"
  }

  return { notifications, activityRecognition, mediaLibrary, camera }
}

export const ensureCorePermissions = async (forceRequest = false) => {
  await requestNotificationsOnce(forceRequest)
  await requestActivityRecognitionOnce(forceRequest)
  await requestMediaPermissionsOnce(forceRequest)
  return buildSnapshot()
}

export const runInitialPermissionBootstrap = async () => {
  const done = await AsyncStorage.getItem(PERMISSIONS_BOOTSTRAP_KEY)
  if (done === "done") return
  await ensureCorePermissions(true)
  await AsyncStorage.setItem(PERMISSIONS_BOOTSTRAP_KEY, "done")
}
