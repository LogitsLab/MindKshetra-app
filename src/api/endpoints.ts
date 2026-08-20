import { apiFetch } from "@/api/client";
import type { Milestone } from "@/data/milestones";
import type {
  JournalEntry,
  PracticeStreak,
  SadhanaLogEntry,
  SadhanaPractice,
  SadhanaStreak,
  Sloka,
  Streak,
} from "@/types";

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
      return apiFetch<{ id: number | string; kind?: string }>("/api/journal", {
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
    return apiFetch<{ id: number | string; kind?: string }>("/api/journal", {
      method: "POST",
      body: JSON.stringify({
        reflection: slokaIdOrReflection,
        slokaId: opts.slokaId,
        kind: opts.kind ?? (opts.slokaId != null ? "verse" : "reflection"),
      }),
    });
  },
  /**
   * Share / unshare a journal reflection with sangha.
   * API visibility is `shared` | `private`; `community` is accepted as an alias for `shared`.
   * Kill switch: sharing while paused → 503 — callers should fail soft.
   */
  shareJournal: (
    id: number | string,
    visibility: "community" | "shared" | "private",
    language?: "en" | "hi"
  ) => {
    const apiVisibility = visibility === "community" ? "shared" : visibility;
    return apiFetch<{
      shared?: boolean;
      held?: boolean;
      crisis?: boolean;
      message?: string;
      error?: string;
    }>(`/api/journal/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        visibility: apiVisibility,
        ...(language ? { language } : {}),
      }),
    });
  },
  /** Thin wrapper — 503 when COMMUNITY_REPORTS_ENABLED is paused. */
  report: (contentType: string, contentId: string, reason?: string) =>
    apiFetch<{ ok: boolean }>("/api/report", {
      method: "POST",
      body: JSON.stringify({
        contentType,
        contentId,
        ...(reason ? { reason } : {}),
      }),
    }),
  blocks: () =>
    apiFetch<{ blocks: { blocked_user_id: string; created_at: string }[] }>(
      "/api/blocks"
    ),
  block: (blockedUserId: string) =>
    apiFetch<{ ok: boolean }>("/api/blocks", {
      method: "POST",
      body: JSON.stringify({ blockedUserId }),
    }),
  unblock: (blockedUserId: string) =>
    apiFetch<{ ok: boolean }>("/api/blocks", {
      method: "DELETE",
      body: JSON.stringify({ blockedUserId }),
    }),
  verseReflections: (slokaId: number) =>
    apiFetch<{
      reflections: Array<{
        id: string;
        reflection: string;
        sharedAt: string | null;
        author: { handle: string; displayName: string | null } | null;
      }>;
    }>(`/api/slokas/${slokaId}/reflections`),
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

type ProgressApiRaw = {
  completedIds?: number[];
  completed?: number[];
  cursor?: {
    slokaId?: number;
    chapter?: number;
    verse?: number;
    updatedAt?: string;
  } | null;
  continueSlokaId?: number | null;
};

export type ProgressView = {
  completed: number[];
  cursor?: { chapter: number; verse: number; slokaId?: number };
  continueSlokaId?: number | null;
};

function normalizeProgress(data: ProgressApiRaw): ProgressView {
  const completed = (data.completedIds ?? data.completed ?? [])
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0);

  let cursor: ProgressView["cursor"];
  if (data.cursor?.chapter != null && data.cursor?.verse != null) {
    cursor = {
      chapter: Number(data.cursor.chapter),
      verse: Number(data.cursor.verse),
      slokaId: data.cursor.slokaId,
    };
  } else if (data.cursor?.slokaId != null && data.cursor?.chapter != null) {
    // Server may omit verse on older deploys — chapter alone still drives Continue.
    cursor = {
      chapter: Number(data.cursor.chapter),
      verse: Number(data.cursor.verse ?? 1),
      slokaId: Number(data.cursor.slokaId),
    };
  }

  return {
    completed,
    cursor,
    continueSlokaId: data.continueSlokaId ?? null,
  };
}

export const progressApi = {
  get: async () => {
    const data = await apiFetch<ProgressApiRaw>("/api/progress");
    return normalizeProgress(data);
  },
  complete: (slokaId: number, completed = true) =>
    apiFetch<{ ok: boolean }>("/api/progress/complete", {
      method: "POST",
      body: JSON.stringify({ slokaId, completed }),
    }),
  setCursor: (slokaId: number) =>
    apiFetch<{ ok: boolean }>("/api/progress/cursor", {
      method: "PUT",
      body: JSON.stringify({ slokaId }),
    }),
  merge: (completed: number[]) =>
    apiFetch<{ ok: boolean }>("/api/progress/merge", {
      method: "POST",
      body: JSON.stringify({ completedIds: completed }),
    }),
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
  /** Public profile by handle — `/api/profiles/[handle]`. */
  byHandle: (handle: string) =>
    apiFetch<{
      profile: {
        handle: string;
        display_name: string | null;
        bio: string | null;
        avatar_key?: string | null;
        created_at?: string;
      };
    }>(`/api/profiles/${encodeURIComponent(handle.toLowerCase())}`),
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
