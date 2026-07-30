import { apiFetch } from "@/api/client";
import type { AstrologyMember, JournalEntry, Sloka, Streak } from "@/types";
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
  preferences: () =>
    apiFetch<{
      votdEmailEnabled?: boolean;
      displayName?: string;
      email?: string | null;
      [key: string]: unknown;
    }>("/api/account/preferences"),
  updatePreferences: (body: Record<string, unknown>) =>
    apiFetch<{
      votdEmailEnabled?: boolean;
      [key: string]: unknown;
    }>("/api/account/preferences", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  exportData: () => apiFetch<Record<string, unknown>>("/api/account/export"),
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
  merge: (completed: number[]) =>
    apiFetch<{ ok: boolean }>("/api/progress/merge", {
      method: "POST",
      body: JSON.stringify({ completed }),
    }),
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
