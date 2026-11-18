/**
 * Meta App Events — no-ops until EXPO_PUBLIC_FACEBOOK_APP_ID is set and a
 * native build includes the Facebook SDK plugin. Safe to call from JS always.
 */
import { Platform } from "react-native";
import Constants from "expo-constants";

type FbModule = {
  AppEventsLogger: {
    logEvent: (name: string, ...args: unknown[]) => void;
    logPurchase?: (amount: number, currency: string) => void;
  };
  Settings: {
    setAppID: (id: string) => void;
    initializeSDK: () => void;
    setAdvertiserTrackingEnabled?: (enabled: boolean) => void;
  };
};

function facebookAppId(): string | null {
  const fromExtra = (
    Constants.expoConfig?.extra as { facebookAppId?: string } | undefined
  )?.facebookAppId;
  const fromEnv = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID;
  const id = (fromExtra || fromEnv || "").trim();
  return id && id !== "[SENSITIVE]" ? id : null;
}

function loadSdk(): FbModule | null {
  if (!facebookAppId()) return null;
  try {
    // Optional native module — absent in Expo Go / when plugin is off.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("react-native-fbsdk-next") as FbModule;
  } catch {
    return null;
  }
}

let initialized = false;

export async function initMetaSdk(): Promise<void> {
  const appId = facebookAppId();
  const sdk = loadSdk();
  if (!appId || !sdk || initialized) return;

  try {
    sdk.Settings.setAppID(appId);
    sdk.Settings.initializeSDK();

    if (Platform.OS === "ios") {
      try {
        const Tracking = require("expo-tracking-transparency") as {
          getTrackingPermissionsAsync: () => Promise<{ status: string }>;
          requestTrackingPermissionsAsync: () => Promise<{ status: string }>;
        };
        const { status: existing } =
          await Tracking.getTrackingPermissionsAsync();
        const status =
          existing === "undetermined"
            ? (await Tracking.requestTrackingPermissionsAsync()).status
            : existing;
        sdk.Settings.setAdvertiserTrackingEnabled?.(status === "granted");
      } catch {
        /* ATT module missing in Expo Go */
      }
    }

    sdk.AppEventsLogger.logEvent("fb_mobile_activate_app");
    initialized = true;
  } catch {
    /* keep no-op */
  }
}

export function trackMetaEvent(
  name: string,
  params?: Record<string, string | number>
): void {
  const sdk = loadSdk();
  if (!sdk || !initialized) return;
  try {
    if (params) sdk.AppEventsLogger.logEvent(name, params);
    else sdk.AppEventsLogger.logEvent(name);
  } catch {
    /* ignore */
  }
}

export const MetaEvents = {
  startSit: () => trackMetaEvent("StartSit"),
  completeSit: () => trackMetaEvent("CompleteSit"),
  firstVerseOpened: () => trackMetaEvent("FirstVerseOpened"),
  openMadhav: () => trackMetaEvent("OpenMadhav"),
  joinCommunity: () => trackMetaEvent("JoinCommunity"),
  completedRegistration: () => trackMetaEvent("fb_mobile_complete_registration"),
} as const;
