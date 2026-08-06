import { apiFetch, getApiUrl } from "@/api/client";
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
    apiFetch<{ story: string | null; language?: string }>(
      `/api/slokas/${id}/story?lang=${lang}`
    ),
  /** First visit / refresh — server generates when no quality story is cached. */
  generateStory: (id: number, lang: "en" | "hi", regenerate = false) =>
    apiFetch<{ story: string | null; language?: string; error?: string }>(
      `/api/slokas/${id}/story?lang=${lang}`,
      {
        method: "POST",
        body: JSON.stringify({ regenerate }),
      }
    ),
  moods: async () => {
    const data = await apiFetch<unknown>("/api/moods");
    if (Array.isArray(data)) {
      return { moods: data as { id: string; label: string; labelHi?: string }[] };
    }
    if (data && typeof data === "object" && Array.isArray((data as { moods?: unknown }).moods)) {
      return data as {
        moods: { id: string; label: string; labelHi?: string }[];
      };
    }
    return { moods: [] };
  },
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
  journal: (kind?: string) =>
    apiFetch<{ entries: JournalEntry[] }>(
      `/api/journal${kind ? `?kind=${encodeURIComponent(kind)}` : ""}`
    ),
  addJournal: (
    slokaIdOrReflection: number | string,
    reflectionOrOpts?: string | { slokaId?: number; kind?: string }
  ) => {
    // Back-compat: addJournal(slokaId, text) OR addJournal(text, opts)
    if (typeof slokaIdOrReflection === "number") {
      return apiFetch<{ id: string; kind?: string }>("/api/journal", {
        method: "POST",
        body: JSON.stringify({
          slokaId: slokaIdOrReflection,
          reflection: String(reflectionOrOpts ?? ""),
          kind: "verse",
        }),
      });
    }
    const opts =
      typeof reflectionOrOpts === "object" && reflectionOrOpts
        ? reflectionOrOpts
        : {};
    return apiFetch<{ id: string; kind?: string }>("/api/journal", {
      method: "POST",
      body: JSON.stringify({
        reflection: slokaIdOrReflection,
        slokaId: opts.slokaId,
        kind: opts.kind ?? (opts.slokaId != null ? "verse" : "reflection"),
      }),
    });
  },
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
  completeOnboarding: (body: Record<string, unknown>) =>
    apiFetch<{
      ok: boolean;
      goals?: string[];
      onboardingCompletedAt?: string;
    }>("/api/account/onboarding/complete", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  achievements: () =>
    apiFetch<{
      seeker: {
        rankKey: string;
        level: number;
        labelEn: string;
        labelHi: string;
      };
      achievements: Array<{
        id: string;
        progress: number;
        target: number;
        unlocked: boolean;
        unlockedAt: string | null;
        motif: string;
        nameEn: string;
        nameHi: string;
        lineEn: string;
        lineHi: string;
      }>;
    }>("/api/account/achievements"),
  progressSummary: (range: "daily" | "weekly" | "monthly" | "yearly" = "monthly") =>
    apiFetch<{
      range: string;
      sessions: number;
      durationMinutes: number;
      mantras: number;
      versesCompleted: number;
      journalEntries: number;
      distribution: {
        meditation: number;
        japa: number;
        reading: number;
        other: number;
      };
      visitStreak: { current: number; longest: number };
      seeker?: {
        rankKey: string;
        level: number;
        labelEn: string;
        labelHi: string;
      };
    }>(`/api/account/progress-summary?range=${range}`),
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
   * `offset` (e.g. -1 / -2) matches the web home carousel days.
   * `full` includes the sloka body so the client can skip a second fetch.
   */
  today: (opts?: { offset?: number; full?: boolean }) => {
    const params = new URLSearchParams();
    if (opts?.offset != null && opts.offset !== 0) {
      params.set("offset", String(opts.offset));
    }
    if (opts?.full) params.set("full", "1");
    const q = params.toString();
    return apiFetch<{
      id: number;
      ref: string;
      date: string;
      offset?: number;
      nakshatra?: string;
      sloka?: import("@/types").Sloka;
    }>(`/api/votd/today${q ? `?${q}` : ""}`);
  },
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
  progress: (program = "sitting-course") =>
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
      milestone?: 7 | 21 | 45 | null;
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
  /** Upserts — works authed or anonymous (token rows re-home on upgrade). */
  register: (body: {
    expoPushToken: string;
    platform: "ios" | "android";
    appVersion: string;
  }) =>
    apiFetch<{ ok: boolean }>("/api/account/push-tokens", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  unregister: (body: { expoPushToken: string }) =>
    apiFetch<{ ok: boolean }>("/api/account/push-tokens", {
      method: "DELETE",
      body: JSON.stringify(body),
    }),
};

export type NotificationPreferences = {
  pushEnabled: boolean;
  dailyVerse: boolean;
  streakReminder: boolean;
  continueReading: boolean;
  astrologyAlerts: boolean;
  reflections: boolean;
  weeklyDigestEmail: boolean;
  /** Local hour of day the daily verse goes out, 4–21. */
  sendHourLocal: number;
};

export const notificationPrefsApi = {
  /** Auth required; the server creates defaults on first read. */
  get: () =>
    apiFetch<NotificationPreferences>("/api/account/notification-preferences"),
  update: (body: Partial<NotificationPreferences>) =>
    apiFetch<NotificationPreferences>(
      "/api/account/notification-preferences",
      { method: "PATCH", body: JSON.stringify(body) }
    ),
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
  /** Month calendar — `month` as YYYY-MM. Defaults to New Delhi sky. */
  calendar: (month: string) =>
    apiFetch<{
      month: string;
      ianaTz: string;
      days: Array<{
        date: string;
        tithi: string;
        nakshatra: string;
        vaar: string;
        isEkadashi?: boolean;
        isPurnima?: boolean;
        isAmavasya?: boolean;
      }>;
      observances: Array<{ date: string; name: string; kind?: string }>;
    }>(`/api/panchang/calendar?month=${encodeURIComponent(month)}`),
};

export const profileApi = {
  get: () =>
    apiFetch<{
      profile: {
        handle: string;
        display_name: string | null;
        bio: string | null;
        is_public: boolean;
      } | null;
    }>("/api/profile"),
  save: (body: {
    handle: string;
    displayName?: string;
    bio?: string;
    isPublic?: boolean;
  }) =>
    apiFetch<{ profile: unknown }>("/api/profile", {
      method: "PUT",
      body: JSON.stringify(body),
    }),
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

/**
 * Failure detail apiFetch cannot carry: the Retry-After header on 429 and the
 * `recoverable` flag a 404 body sets when the chart session expired but can be
 * rebuilt from a stored birth payload. usePredictions maps these to UX.
 */
export class PredictionsError extends Error {
  status: number;
  retryAfterSec: number | null;
  recoverable: boolean;
  constructor(
    status: number,
    message: string,
    retryAfterSec: number | null = null,
    recoverable = false
  ) {
    super(message);
    this.name = "PredictionsError";
    this.status = status;
    this.retryAfterSec = retryAfterSec;
    this.recoverable = recoverable;
  }
}

/**
 * Auth header for the one endpoint below that must read response headers and
 * error bodies itself. Lazy import so test environments that never call this
 * do not pay for the supabase module's configuration check.
 */
async function predictionsAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  try {
    const { supabase, supabaseConfigured } = await import("@/auth/supabase");
    if (!supabaseConfigured) return headers;
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch {
    // Fall through to an unauthenticated request, same as apiFetch.
  }
  return headers;
}

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
  /**
   * predictions() with the latency-UX extras: AbortSignal support, the
   * Retry-After header on 429, and the body's `recoverable` flag on 404.
   * Same request/response contract as predictions() otherwise.
   */
  predictionsDetailed: async (
    body: Record<string, unknown>,
    signal?: AbortSignal
  ) => {
    const res = await fetch(`${getApiUrl()}/api/astrology/predictions`, {
      method: "POST",
      headers: await predictionsAuthHeaders(),
      body: JSON.stringify(body),
      signal,
    });
    if (!res.ok) {
      let message = res.statusText;
      let recoverable = false;
      try {
        const errBody = (await res.json()) as {
          error?: string;
          message?: string;
          recoverable?: boolean;
        };
        message = errBody.error ?? errBody.message ?? message;
        recoverable = Boolean(errBody.recoverable);
      } catch {
        /* non-JSON error body */
      }
      const header = res.headers?.get?.("retry-after");
      const parsed = header ? Number.parseInt(header, 10) : Number.NaN;
      throw new PredictionsError(
        res.status,
        message,
        Number.isFinite(parsed) && parsed >= 0 ? parsed : null,
        recoverable
      );
    }
    const data = (await res.json()) as {
      chart?: { predictionsText?: unknown };
      predictionsText?: unknown;
      source?: "llm" | "rules";
      cached?: boolean;
    };
    const predictionsText = extractPredictionsText(data);
    return {
      chart: data.chart as Record<string, unknown> | undefined,
      predictionsText: predictionsText as PredictionsText | null,
      source: predictionsText?.source ?? data.source,
      cached: data.cached,
    };
  },
  muhurat: (opts?: { date?: string; lat?: number; lng?: number }) => {
    const q = new URLSearchParams();
    if (opts?.date) q.set("date", opts.date);
    if (opts?.lat != null) q.set("lat", String(opts.lat));
    if (opts?.lng != null) q.set("lng", String(opts.lng));
    const qs = q.toString();
    return apiFetch<{
      date: string;
      disclaimer: string;
      muhurats: Array<{
        nameEn: string;
        nameHi: string;
        startIso: string;
        endIso: string;
        tag: string;
      }>;
      choghadiya: Array<{
        kind: string;
        startIso: string;
        endIso: string;
        quality: string;
      }>;
    }>(`/api/astrology/muhurat${qs ? `?${qs}` : ""}`);
  },
  health: () => apiFetch<{ ok: boolean; ephemeris?: { mode: string } }>("/api/astrology/health"),
};
