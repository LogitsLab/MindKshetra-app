import { apiFetch } from "@/api/client";
import type { Milestone } from "@/data/milestones";
import type {
  AstrologyMember,
  CompatibilityResult,
  JournalEntry,
  PanchangDay,
  PracticeStreak,
  SadhanaLogEntry,
  SadhanaPractice,
  SadhanaStreak,
  Sloka,
  Streak,
} from "@/types";
import {
  extractPredictionsText,
  type PredictionsText,
} from "@/types/astrology";

function normalizeSlokaList(data: unknown): { slokas: Sloka[]; total: number } {
  if (Array.isArray(data)) {
    return { slokas: data as Sloka[], total: data.length };
  }
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.slokas)) {
      return {
        slokas: obj.slokas as Sloka[],
        total: Number(obj.total ?? obj.slokas.length),
      };
    }
    if (Array.isArray(obj.results)) {
      return {
        slokas: obj.results as Sloka[],
        total: obj.results.length,
      };
    }
  }
  return { slokas: [], total: 0 };
}

export const contentApi = {
  slokas: async (params?: { q?: string; chapter?: number; limit?: number }) => {
    const sp = new URLSearchParams();
    if (params?.q) sp.set("q", params.q);
    if (params?.chapter != null) sp.set("chapter", String(params.chapter));
    if (params?.limit != null) sp.set("limit", String(params.limit));
    const q = sp.toString();
    const data = await apiFetch<unknown>(`/api/slokas${q ? `?${q}` : ""}`);
    return normalizeSlokaList(data);
  },
  sloka: (id: number) => apiFetch<Sloka>(`/api/slokas/${id}`),
  story: (id: number, lang: "en" | "hi") =>
    apiFetch<{ story: string; language: string }>(
      `/api/slokas/${id}/story?lang=${lang}`
    ),
  moods: () => apiFetch<{ moods: { id: string; label: string }[] }>("/api/moods"),
  moodSlokas: (id: string) =>
    apiFetch<{ slokas: Sloka[] }>(`/api/moods/${id}/slokas`),
};

export const userApi = {
  favorites: () => apiFetch<{ slokas: Sloka[] }>("/api/favorites"),
  favoriteStatus: (slokaId: number) =>
    apiFetch<{ saved: boolean }>(`/api/favorites?slokaId=${slokaId}`),
  addFavorite: (slokaId: number) =>
    apiFetch<{ ok: boolean }>("/api/favorites", {
      method: "POST",
      body: JSON.stringify({ slokaId }),
    }),
  removeFavorite: (slokaId: number) =>
    apiFetch<{ ok: boolean }>(`/api/favorites?slokaId=${slokaId}`, {
      method: "DELETE",
    }),
  journal: () => apiFetch<{ entries: JournalEntry[] }>("/api/journal"),
  addJournal: (slokaId: number, reflection: string) =>
    apiFetch<{ id: string }>("/api/journal", {
      method: "POST",
      body: JSON.stringify({ slokaId, reflection }),
    }),
  streak: () => apiFetch<Streak>("/api/account/streak"),
  recordVisit: (timezone?: string) =>
    apiFetch<Streak>("/api/account/streak", {
      method: "POST",
      body: JSON.stringify(timezone ? { timezone } : {}),
    }),
  preferences: () =>
    apiFetch<{
      votdEmailEnabled?: boolean;
      notifDailyVerse?: boolean;
      notifDailyVerseHour?: number;
      notifStreakReminder?: boolean;
      displayName?: string;
      email?: string | null;
      [key: string]: unknown;
    }>("/api/account/preferences"),
  updatePreferences: (body: Record<string, unknown>) =>
    apiFetch<{
      votdEmailEnabled?: boolean;
      notifDailyVerse?: boolean;
      notifDailyVerseHour?: number;
      notifStreakReminder?: boolean;
      [key: string]: unknown;
    }>("/api/account/preferences", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  exportData: () => apiFetch<Record<string, unknown>>("/api/account/export"),
  deleteAccount: () =>
    apiFetch<{ ok: boolean }>("/api/account/delete", { method: "POST" }),
};

export const accountApi = {
  /**
   * Quiet milestones, private to their own user. Signed-out callers get
   * `{ guest: true }` rather than a 401, and compute the same shape locally.
   */
  milestones: () =>
    apiFetch<{
      guest: boolean;
      milestones?: Milestone[];
      next?: Milestone | null;
      summary?: {
        visitCurrent: number;
        visitLongest: number;
        versesRead: number;
        totalVerses: number;
        japaLifetimeCount: number;
      };
    }>("/api/account/milestones"),
};

export const votdApi = {
  status: () =>
    apiFetch<{
      configured: boolean;
      enabled: boolean;
      testingMode?: boolean;
    }>("/api/votd/email"),
  send: () =>
    apiFetch<{ ok: boolean; ref?: string; to?: string }>("/api/votd/email", {
      method: "POST",
    }),
  /**
   * Server-authoritative verse of the day — never derive it from the clock.
   * `nakshatra` is present when the day's pick was moon-driven (provenance
   * context, not causation).
   */
  today: () =>
    apiFetch<{ id: number; ref: string; date: string; nakshatra?: string }>(
      "/api/votd/today"
    ),
};

export const eventsApi = {
  /** Fire-and-forget; callers must never await this on a user-facing path. */
  send: (name: string, props?: Record<string, unknown>) =>
    apiFetch<{ ok: boolean }>("/api/events", {
      method: "POST",
      body: JSON.stringify(props ? { name, props } : { name }),
    }).catch(() => ({ ok: false })),
};

export const journeysApi = {
  /** Catalog summaries, no day bodies — the 21-day arcs carry guided scripts. */
  catalog: () =>
    apiFetch<{
      journeys: Array<{
        id: string;
        kind: "scripture" | "meditation";
        unlock: "chain" | "open";
        daysCount: number;
        title: { en: string; hi: string };
        intro: { en: string; hi: string };
      }>;
    }>("/api/journeys"),
  /** Guests get `{ guest: true }` with an empty run, not a 401. */
  run: (journeyId: string) =>
    apiFetch<{
      journeyId: string;
      currentDay: number;
      completedDays: number[];
      guest?: boolean;
    }>(`/api/journeys/${encodeURIComponent(journeyId)}/run`),
  /** 409 means the day is locked — the server enforces the chain, not the client. */
  markDay: (journeyId: string, day: number) =>
    apiFetch<{ currentDay?: number; completedDays?: number[] }>(
      `/api/journeys/${encodeURIComponent(journeyId)}/run`,
      { method: "POST", body: JSON.stringify({ day }) }
    ),
  /** Replay of device-local runs on sign-in; idempotent, the server dedupes. */
  merge: (journeys: Array<{ journeyId: string; completedDays: number[] }>) =>
    apiFetch<{ ok: boolean; merged?: number }>("/api/journeys/merge", {
      method: "POST",
      body: JSON.stringify({ journeys }),
    }),
};

export const pathsApi = {
  /**
   * Repointed at the journeys route, which is the same write with server-side
   * unlock enforcement. `/api/paths/[id]/run` still exists as a forwarder for
   * one release, so an older build keeps working; new calls skip the hop.
   */
  markDay: (pathId: string, day: number) => journeysApi.markDay(pathId, day),
};

export const meditationApi = {
  progress: (program = "foundation-7") =>
    apiFetch<{
      currentDay: number;
      completedDays: number[];
      guest?: boolean;
      streak: { current: number; longest: number } | null;
    }>(`/api/meditation/progress?program=${encodeURIComponent(program)}`),
  complete: (body: {
    sessionId: string;
    moodBefore?: number | null;
    moodAfter?: number | null;
    durationSec?: number;
    clientRef: string;
    timezone?: string;
  }) =>
    apiFetch<{
      ok: boolean;
      progress: { currentDay: number; completedDays: number[] };
      streak: { current: number; longest: number };
    }>("/api/meditation/complete", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  merge: (completions: unknown[], timezone?: string) =>
    apiFetch<{ ok: boolean; merged: number }>("/api/meditation/merge", {
      method: "POST",
      body: JSON.stringify({ completions, timezone }),
    }),
};

export const pushApi = {
  register: (body: { token: string; platform: "ios" | "android" }) =>
    apiFetch<{ ok: boolean }>("/api/push/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  disable: (body: { token: string }) =>
    apiFetch<{ ok: boolean }>("/api/push/register", {
      method: "DELETE",
      body: JSON.stringify(body),
    }),
};

export const progressApi = {
  get: () =>
    apiFetch<{ completed: number[]; cursor?: { chapter: number; verse: number } }>(
      "/api/progress"
    ),
  complete: (slokaId: number) =>
    apiFetch<{ ok: boolean }>("/api/progress/complete", {
      method: "POST",
      body: JSON.stringify({ slokaId }),
    }),
  setCursor: (slokaId: number) =>
    apiFetch<{ ok: boolean }>("/api/progress/cursor", {
      method: "PUT",
      body: JSON.stringify({ slokaId }),
    }),
  merge: (completed: number[]) =>
    apiFetch<{ ok: boolean }>("/api/progress/merge", {
      method: "POST",
      body: JSON.stringify({ completed }),
    }),
};

export const panchangApi = {
  /** No args in v1 — the server defaults to the shared New Delhi reference sky. */
  today: () => apiFetch<PanchangDay>("/api/panchang"),
};

export const sadhanaApi = {
  /** Guests get an empty summary (not a 401); safe to call sessionless. */
  summary: (tz?: string) =>
    apiFetch<{
      today: string | null;
      doneToday: SadhanaPractice[];
      streaks: PracticeStreak[];
    }>(`/api/sadhana${tz ? `?tz=${encodeURIComponent(tz)}` : ""}`),
  /** Requires a Supabase session — anonymous sessions persist too. */
  log: (body: {
    practice: SadhanaPractice;
    occurredOn?: string;
    durationSec?: number;
    count?: number;
    details?: Record<string, unknown>;
    clientRef?: string;
    timezone?: string;
  }) =>
    apiFetch<{ ok: boolean; occurredOn: string; streak: SadhanaStreak }>(
      "/api/sadhana",
      { method: "POST", body: JSON.stringify(body) }
    ),
  /** Replay of the device-local log; requires non-anonymous sign-in. */
  merge: (body: { sessions: SadhanaLogEntry[]; timezone?: string }) =>
    apiFetch<{ merged: number; streaks: PracticeStreak[] }>(
      "/api/sadhana/merge",
      { method: "POST", body: JSON.stringify(body) }
    ),
};

export const chatApi = {
  sessions: () =>
    apiFetch<{ sessions: { id: string; updated_at: string; title?: string }[] }>(
      "/api/chat/sessions"
    ),
  session: (sessionId: string) =>
    apiFetch<{ messages: { role: string; content: string }[] }>(
      `/api/chat/sessions?sessionId=${sessionId}`
    ),
  merge: (sessionId: string) =>
    apiFetch<{ ok: boolean }>("/api/chat/merge", {
      method: "POST",
      body: JSON.stringify({ sessionId }),
    }),
};

export const astrologyApi = {
  members: () => apiFetch<{ members: AstrologyMember[] }>("/api/astrology/members"),
  createMember: (body: Record<string, unknown>) =>
    apiFetch<{ member: AstrologyMember }>("/api/astrology/members", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  member: (id: string) =>
    apiFetch<{ member: AstrologyMember }>(`/api/astrology/members/${id}`),
  deleteMember: (id: string) =>
    apiFetch<{ ok: boolean }>(`/api/astrology/members/${id}`, { method: "DELETE" }),
  chart: (id: string) =>
    apiFetch<{ chart: Record<string, unknown> }>(`/api/astrology/members/${id}/chart`),
  practiceCard: (memberId: string) =>
    apiFetch<{
      verse: {
        id: number;
        ref: string;
        english: string;
        hindi: string;
      };
    }>("/api/astrology/practice-card", {
      method: "POST",
      body: JSON.stringify({ memberId }),
    }),
  compute: (body: Record<string, unknown>) =>
    apiFetch<{ chart: Record<string, unknown>; chartSessionId?: string }>(
      "/api/astrology/compute",
      { method: "POST", body: JSON.stringify(body) }
    ),
  geocode: (q: string) =>
    apiFetch<{
      results: { label: string; lat: number; lng: number; ianaTz: string }[];
    }>("/api/astrology/geocode", {
      method: "POST",
      body: JSON.stringify({ query: q }),
    }),
  /**
   * Ashtakoota between two SAVED members (never raw birth payloads).
   * 422 means a missing birth time — render the message, never a zero score.
   */
  compatibility: (memberA: string, memberB: string) =>
    apiFetch<{ result: CompatibilityResult }>("/api/astrology/compatibility", {
      method: "POST",
      body: JSON.stringify({ memberA, memberB }),
    }),
  predictions: async (body: Record<string, unknown>) => {
    const data = await apiFetch<{
      chart?: { predictionsText?: unknown };
      predictionsText?: unknown;
      source?: "llm" | "rules";
      cached?: boolean;
    }>("/api/astrology/predictions", {
      method: "POST",
      body: JSON.stringify(body),
    });
    const predictionsText = extractPredictionsText(data);
    return {
      chart: data.chart as Record<string, unknown> | undefined,
      predictionsText: predictionsText as PredictionsText | null,
      source: predictionsText?.source ?? data.source,
      cached: data.cached,
    };
  },
  health: () => apiFetch<{ ok: boolean; ephemeris?: { mode: string } }>("/api/astrology/health"),
};
