import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SadhanaLogEntry } from "@/types";

const KEYS = {
  theme: "mindkshetra-theme",
  lang: "mindkshetra-lang",
  textScale: "mindkshetra-text-scale",
  onboarding: "mindkshetra-onboarding-complete",
  onboardingVersion: "mindkshetra-onboarding-version",
  chatSession: "mindkshetra-chat-session",
  guestProgress: "mindkshetra-guest-progress",
  verseCache: "mindkshetra-verse-cache",
  visitDay: "mindkshetra-visit-day",
  votdToday: "mindkshetra-votd-today",
  journalDrafts: "mindkshetra-journal-drafts",
  timezoneSynced: "mindkshetra-tz-synced",
  sadhanaLog: "mindkshetra-sadhana-log",
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

export async function getStoredTextScale(): Promise<"sm" | "md" | "lg" | null> {
  const v = await AsyncStorage.getItem(KEYS.textScale);
  return v === "sm" || v === "md" || v === "lg" ? v : null;
}

export async function setStoredTextScale(scale: "sm" | "md" | "lg"): Promise<void> {
  await AsyncStorage.setItem(KEYS.textScale, scale);
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

/**
 * Wipes account-scoped local state after account deletion. Preferences
 * (theme, language, text scale, onboarding) survive — they belong to the
 * device, not the account.
 */
export async function clearUserLocalState(): Promise<void> {
  await AsyncStorage.multiRemove([
    KEYS.chatSession,
    KEYS.guestProgress,
    KEYS.visitDay,
    KEYS.journalDrafts,
    KEYS.timezoneSynced,
    KEYS.sadhanaLog,
  ]);
}

/** Local calendar date (device zone) as YYYY-MM-DD. */
export function localDayStamp(now = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/** Returns the stored day stamp for the last recorded visit (or null). */
export async function getVisitDay(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.visitDay);
}

export async function setVisitDay(day: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.visitDay, day);
}

/** `${userId}:${tz}` stamp of the last timezone written to preferences. */
export async function getTimezoneSynced(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.timezoneSynced);
}

export async function setTimezoneSynced(stamp: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.timezoneSynced, stamp);
}

export type StoredVotd = { id: number; ref: string; date: string };

/** Day-scoped cache of the server verse of the day (offline fallback). */
export async function getStoredVotd(): Promise<StoredVotd | null> {
  const raw = await AsyncStorage.getItem(KEYS.votdToday);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredVotd;
  } catch {
    return null;
  }
}

export async function setStoredVotd(votd: StoredVotd): Promise<void> {
  await AsyncStorage.setItem(KEYS.votdToday, JSON.stringify(votd));
}

/** Practice sessions logged with no Supabase session; replayed on upgrade. */
export async function getSadhanaLog(): Promise<SadhanaLogEntry[]> {
  const raw = await AsyncStorage.getItem(KEYS.sadhanaLog);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SadhanaLogEntry[]) : [];
  } catch {
    return [];
  }
}

export async function appendSadhanaLog(entry: SadhanaLogEntry): Promise<void> {
  const log = await getSadhanaLog();
  log.push(entry);
  await AsyncStorage.setItem(KEYS.sadhanaLog, JSON.stringify(log));
}

export async function clearSadhanaLog(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.sadhanaLog);
}

export type JournalDraft = { slokaId: number; text: string; at: number };

export async function getJournalDrafts(): Promise<JournalDraft[]> {
  const raw = await AsyncStorage.getItem(KEYS.journalDrafts);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as JournalDraft[]) : [];
  } catch {
    return [];
  }
}

export async function addJournalDraft(
  slokaId: number,
  text: string
): Promise<void> {
  const drafts = await getJournalDrafts();
  drafts.push({ slokaId, text, at: Date.now() });
  await AsyncStorage.setItem(KEYS.journalDrafts, JSON.stringify(drafts));
}

export async function removeJournalDrafts(
  predicate: (draft: JournalDraft) => boolean
): Promise<void> {
  const drafts = await getJournalDrafts();
  const remaining = drafts.filter((d) => !predicate(d));
  await AsyncStorage.setItem(KEYS.journalDrafts, JSON.stringify(remaining));
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
