import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { pushApi } from "@/api/endpoints";
import {
  clearStoredPushToken,
  getStoredPushToken,
  setStoredPushToken,
} from "@/storage/local";

function projectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId
  );
}

/**
 * Best-effort Expo push registration. No-ops on web, simulators, denied
 * permissions, missing projectId, and Expo Go / credential gaps — callers
 * must never surface these as user-facing errors.
 */
export async function registerPush(): Promise<string | null> {
  if (Platform.OS !== "ios" && Platform.OS !== "android") return null;
  if (!Device.isDevice) return null;

  try {
    const current = await Notifications.getPermissionsAsync();
    let status = current.status;
    if (status !== "granted") {
      const asked = await Notifications.requestPermissionsAsync();
      status = asked.status;
    }
    if (status !== "granted") return null;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("daily-verse", {
        name: "Daily verse",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const id = projectId();
    if (!id) return null;

    const { data: token } = await Notifications.getExpoPushTokenAsync({
      projectId: id,
    });
    if (!token) return null;

    await pushApi.register({ token, platform: Platform.OS });
    await setStoredPushToken(token);
    return token;
  } catch {
    // Expo Go remote-push limits, missing APNs/FCM, offline, etc.
    return null;
  }
}

/**
 * Disable the stored device token on the server, then clear local storage.
 * Best-effort — sign-out must proceed even if unregister fails.
 */
export async function unregisterPush(): Promise<void> {
  try {
    const token = await getStoredPushToken();
    if (token) {
      try {
        await pushApi.disable({ token });
      } catch {
        /* still clear local */
      }
    }
  } finally {
    await clearStoredPushToken();
  }
}
