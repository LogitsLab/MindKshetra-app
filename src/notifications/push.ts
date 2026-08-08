import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { pushApi } from "@/api/endpoints";
import { getAppVersion } from "@/utils/appVersion";
import {
  clearStoredPushToken,
  getStoredPushToken,
  setStoredPushToken,
} from "@/storage/local";

function projectId(): string | undefined {
  return (
    Constants.easConfig?.projectId ??
    Constants.expoConfig?.extra?.eas?.projectId
  );
}

/**
 * FCM is wired through app.json → android.googleServicesFile. Without it,
 * getExpoPushTokenAsync dies in native code ("Default FirebaseApp is not
 * initialized") — a JS try/catch cannot contain it, and because registration
 * fires whenever a session exists, Android crash-looped on every launch
 * after the first sign-in.
 */
function androidFcmConfigured(): boolean {
  const android = Constants.expoConfig?.android as
    | { googleServicesFile?: string }
    | undefined;
  return Boolean(android?.googleServicesFile);
}

/** Why remote push cannot register on this runtime (null when supported). */
export type PushUnavailableReason =
  | "simulator"
  | "expo-go"
  | "credentials"
  | "platform";

export function pushUnavailableReason(): PushUnavailableReason | null {
  if (Platform.OS !== "ios" && Platform.OS !== "android") return "platform";
  if (!Device.isDevice) return "simulator";
  if (Platform.OS === "android" && !androidFcmConfigured()) {
    return "credentials";
  }
  // Expo Go cannot reliably register for production push cohorts.
  if (Constants.appOwnership === "expo") return "expo-go";
  if (!projectId()) return "credentials";
  return null;
}

/** True where remote push can work at all: a real iOS/Android device. */
export function pushSupported(): boolean {
  return pushUnavailableReason() == null;
}

/**
 * Schedule a one-shot local daily-verse reminder so the hour picker UX can
 * be verified without APNs/FCM. Best-effort; never throws to callers.
 */
export async function scheduleLocalDailyVerseSmoke(
  hourLocal: number
): Promise<boolean> {
  if (!Device.isDevice) return false;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return false;
    await ensureDailyVerseChannel();
    await Notifications.cancelScheduledNotificationAsync(
      "local-daily-verse-smoke"
    ).catch(() => undefined);
    const hour = Math.min(21, Math.max(4, Math.floor(hourLocal)));
    await Notifications.scheduleNotificationAsync({
      identifier: "local-daily-verse-smoke",
      content: {
        title: "MindKshetra",
        body: "Your daily verse reminder is ready on this device.",
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute: 0,
        channelId: Platform.OS === "android" ? "daily-verse" : undefined,
      },
    });
    return true;
  } catch {
    return false;
  }
}

export type PushPermission = "granted" | "denied" | "undetermined";

/**
 * Current OS permission, without ever prompting. "denied" doubles as the
 * unsupported answer (web, simulator, Expo Go) so callers can treat it as
 * "will not receive push here".
 */
export async function getPushPermission(): Promise<PushPermission> {
  if (!pushSupported()) return "denied";
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status === "granted") return "granted";
    if (status === "undetermined") return "undetermined";
    return "denied";
  } catch {
    return "denied";
  }
}

/**
 * Show the OS permission prompt. Called ONLY from explicit user intent —
 * the pre-permission sheet's accept and the settings master toggle. Never
 * on launch, never from registerPush().
 */
export async function requestPushPermission(): Promise<boolean> {
  if (!pushSupported()) return false;
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === "granted";
  } catch {
    return false;
  }
}

/**
 * The Android channel the server targets (app.json defaultChannel). Calm by
 * design: DEFAULT importance, stock sound, a brass notification light.
 */
async function ensureDailyVerseChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("daily-verse", {
    name: "Daily verse",
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: "#c9a227",
  });
}

/**
 * Best-effort Expo push registration. Silent: registers only when OS
 * permission is ALREADY granted (asking is the pre-permission sheet's job),
 * and no-ops on web, simulators, missing projectId, and Expo Go / credential
 * gaps — callers must never surface these as user-facing errors.
 */
export async function registerPush(): Promise<string | null> {
  if (!pushSupported()) return null;

  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return null;

    await ensureDailyVerseChannel();

    const id = projectId();
    if (!id) return null;

    const { data: token } = await Notifications.getExpoPushTokenAsync({
      projectId: id,
    });
    if (!token) return null;

    await pushApi.register({
      expoPushToken: token,
      platform: Platform.OS as "ios" | "android",
      appVersion: getAppVersion(),
    });
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
        await pushApi.unregister({ expoPushToken: token });
      } catch {
        /* still clear local */
      }
    }
  } finally {
    await clearStoredPushToken();
  }
}
