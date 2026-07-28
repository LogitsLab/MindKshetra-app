import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  theme: "mindkshetra-theme",
  lang: "mindkshetra-lang",
  onboarding: "mindkshetra-onboarding-complete",
  onboardingVersion: "mindkshetra-onboarding-version",
  chatSession: "mindkshetra-chat-session",
  guestProgress: "mindkshetra-guest-progress",
  verseCache: "mindkshetra-verse-cache",
} as const;

export async function getStoredTheme(): Promise<"dark" | "light" | null> {
  const v = await AsyncStorage.getItem(KEYS.theme);
  return v === "light" || v === "dark" ? v : null;
}

export async function setStoredTheme(theme: "dark" | "light"): Promise<void> {
  await AsyncStorage.setItem(KEYS.theme, theme);
}

export async function getStoredLang(): Promise<"en" | "hi" | null> {
  const v = await AsyncStorage.getItem(KEYS.lang);
  return v === "en" || v === "hi" ? v : null;
}

export async function setStoredLang(lang: "en" | "hi"): Promise<void> {
  await AsyncStorage.setItem(KEYS.lang, lang);
}

/** Bump when onboarding content/flow changes to re-show once for returning users. */
const ONBOARDING_VERSION = 4;

export async function getOnboardingComplete(): Promise<boolean> {
  const storedVersion = await AsyncStorage.getItem(KEYS.onboardingVersion);
  if (storedVersion !== String(ONBOARDING_VERSION)) {
    await AsyncStorage.multiRemove([KEYS.onboarding, KEYS.onboardingVersion]);
    return false;
  }
  const v = await AsyncStorage.getItem(KEYS.onboarding);
  return v === "1";
}

export async function setOnboardingComplete(): Promise<void> {
  await AsyncStorage.multiSet([
    [KEYS.onboarding, "1"],
    [KEYS.onboardingVersion, String(ONBOARDING_VERSION)],
  ]);
}

export async function clearOnboardingComplete(): Promise<void> {
  await AsyncStorage.multiRemove([KEYS.onboarding, KEYS.onboardingVersion]);
}

export async function getChatSessionId(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.chatSession);
}

export async function setChatSessionId(id: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.chatSession, id);
}

export type GuestProgress = {
  completed: number[];
  cursor?: { chapter: number; verse: number };
};

export async function getGuestProgress(): Promise<GuestProgress> {
  const raw = await AsyncStorage.getItem(KEYS.guestProgress);
  if (!raw) return { completed: [] };
  try {
    return JSON.parse(raw) as GuestProgress;
  } catch {
    return { completed: [] };
  }
}

export async function setGuestProgress(progress: GuestProgress): Promise<void> {
  await AsyncStorage.setItem(KEYS.guestProgress, JSON.stringify(progress));
}

export async function markGuestComplete(slokaId: number): Promise<void> {
  const p = await getGuestProgress();
  if (!p.completed.includes(slokaId)) {
    p.completed.push(slokaId);
    await setGuestProgress(p);
  }
}

export async function setGuestCursor(
  chapter: number,
  verse: number
): Promise<void> {
  const p = await getGuestProgress();
  p.cursor = { chapter, verse };
  await setGuestProgress(p);
}

export async function cacheVerse(id: number, payload: unknown): Promise<void> {
  const raw = await AsyncStorage.getItem(KEYS.verseCache);
  const map: Record<string, unknown> = raw ? JSON.parse(raw) : {};
  map[String(id)] = { at: Date.now(), payload };
  const keys = Object.keys(map);
  if (keys.length > 40) {
    const sorted = keys.sort(
      (a, b) => ((map[a] as { at: number }).at ?? 0) - ((map[b] as { at: number }).at ?? 0)
    );
    for (const k of sorted.slice(0, keys.length - 40)) delete map[k];
  }
  await AsyncStorage.setItem(KEYS.verseCache, JSON.stringify(map));
}

export async function getCachedVerse<T>(id: number): Promise<T | null> {
  const raw = await AsyncStorage.getItem(KEYS.verseCache);
  if (!raw) return null;
  try {
    const map = JSON.parse(raw) as Record<string, { payload: T }>;
    return map[String(id)]?.payload ?? null;
  } catch {
    return null;
  }
}
