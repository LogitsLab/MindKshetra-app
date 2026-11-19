/**
 * Meta App Events — no-ops until EXPO_PUBLIC_FACEBOOK_APP_ID is set and a
 * native build includes the Facebook SDK plugin. Safe to call from JS always.
 */
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
    sdk.Settings.setAdvertiserTrackingEnabled?.(false);

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
