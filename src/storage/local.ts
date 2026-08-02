import AsyncStorage from "@react-native-async-storage/async-storage";
import { normalizeDays } from "@/data/journeys";
import type { PanchangDay, SadhanaLogEntry } from "@/types";

/**
 * Per-journey guest progress: `mindkshetra-journey-<id>` → { completedDays }.
 * One key per journey rather than one blob, matching the web's storage format
 * so the two sides describe device-local progress the same way.
 */
const JOURNEY_KEY_PREFIX = "mindkshetra-journey-";

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
  panchangToday: "mindkshetra-panchang-today",
  pushToken: "mindkshetra-push-token",
  milestonesSeen: "mindkshetra-milestones-seen",
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
    KEYS.pushToken,
  ]);
  // Journey runs are one key per journey, so they are swept by prefix.
  await clearAllGuestJourneys();
}

export async function getStoredPushToken(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.pushToken);
}

export async function setStoredPushToken(token: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.pushToken, token);
}

export async function clearStoredPushToken(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.pushToken);
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

export type StoredVotd = {
  id: number;
  ref: string;
  date: string;
  /** Present when the day's verse was moon-driven. */
  nakshatra?: string;
};

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

/* ------------------------------------------------------------------ */
/* Guest journey runs.                                                 */
/*                                                                     */
/* Mobile had none of this: a signed-out person's path days lived only  */
/* in component state and were gone at the next launch. These four      */
/* helpers are the device-local half of the journeys engine — the sign- */
/* in merge in AuthContext replays them through /api/journeys/merge.    */
/*                                                                     */
/* The meditation course keeps its own completion queue rather than     */
/* folding in here: those rows carry mood before/after and a duration,  */
/* which a journey run has nowhere to put.                              */
/* ------------------------------------------------------------------ */

function journeyKey(journeyId: string): string {
  return `${JOURNEY_KEY_PREFIX}${journeyId}`;
}

export async function getGuestJourneyDays(
  journeyId: string,
  daysCount: number
): Promise<number[]> {
  const raw = await AsyncStorage.getItem(journeyKey(journeyId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as { completedDays?: unknown };
    return normalizeDays(parsed.completedDays, daysCount);
  } catch {
    return [];
  }
}

export async function setGuestJourneyDays(
  journeyId: string,
  completedDays: number[]
): Promise<void> {
  await AsyncStorage.setItem(
    journeyKey(journeyId),
    JSON.stringify({ completedDays })
  );
}

/** Add one day and return the updated, sorted list. */
export async function markGuestJourneyDay(
  journeyId: string,
  day: number,
  daysCount: number
): Promise<number[]> {
  const prior = await getGuestJourneyDays(journeyId, daysCount);
  const next = normalizeDays([...prior, day], daysCount);
  await setGuestJourneyDays(journeyId, next);
  return next;
}

/**
 * Every guest journey on this device, for the sign-in merge. The day count is
 * generously capped here because the catalog is not in hand at merge time —
 * the server re-validates each list against the real journey.
 */
export async function getAllGuestJourneys(): Promise<
  Array<{ journeyId: string; completedDays: number[] }>
> {
  const keys = await AsyncStorage.getAllKeys();
  const mine = keys.filter((k) => k.startsWith(JOURNEY_KEY_PREFIX));
  if (!mine.length) return [];
  const out: Array<{ journeyId: string; completedDays: number[] }> = [];
  for (const key of mine) {
    const journeyId = key.slice(JOURNEY_KEY_PREFIX.length);
    if (!journeyId) continue;
    const completedDays = await getGuestJourneyDays(journeyId, 400);
    if (completedDays.length) out.push({ journeyId, completedDays });
  }
  return out;
}

export async function clearGuestJourney(journeyId: string): Promise<void> {
  await AsyncStorage.removeItem(journeyKey(journeyId));
}

export async function clearAllGuestJourneys(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const mine = keys.filter((k) => k.startsWith(JOURNEY_KEY_PREFIX));
  if (mine.length) await AsyncStorage.multiRemove(mine);
}

/**
 * Milestone keys this device has already shown. `null` means the ledger has
 * never been written — a first read backfills silently rather than announcing
 * a long history all at once.
 */
export async function getMilestonesSeen(): Promise<string[] | null> {
  const raw = await AsyncStorage.getItem(KEYS.milestonesSeen);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((k): k is string => typeof k === "string")
      : null;
  } catch {
    return null;
  }
}

export async function setMilestonesSeen(keys: string[]): Promise<void> {
  await AsyncStorage.setItem(
    KEYS.milestonesSeen,
    JSON.stringify(Array.from(new Set(keys)))
  );
}

export type StoredPanchang = { date: string; payload: PanchangDay };

/** Day-scoped cache of the daily panchang (offline fallback, like votdToday). */
export async function getStoredPanchang(): Promise<StoredPanchang | null> {
  const raw = await AsyncStorage.getItem(KEYS.panchangToday);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredPanchang;
  } catch {
    return null;
  }
}

export async function setStoredPanchang(entry: StoredPanchang): Promise<void> {
  await AsyncStorage.setItem(KEYS.panchangToday, JSON.stringify(entry));
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
