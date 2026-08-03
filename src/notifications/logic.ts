/**
 * Pure decision logic for the notification system — no Expo imports, so it
 * runs under plain jest without the native module surface.
 */

/** How long a "Not now" keeps the pre-permission sheet away. */
export const PROMPT_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;

/** After this many declines the sheet never appears again. */
export const PROMPT_MAX_DECLINES = 2;

export type PromptState = {
  /** Epoch ms of the last time the sheet was declined; null = never shown. */
  lastPromptAt: number | null;
  declineCount: number;
};

/**
 * Whether the pre-permission sheet may appear. Callers must additionally
 * check that OS permission is still undetermined — this covers only the
 * decline history: never after two declines, and a 14-day quiet period
 * after each one.
 */
export function shouldShowPrompt(state: PromptState, now: number): boolean {
  if (state.declineCount >= PROMPT_MAX_DECLINES) return false;
  if (state.lastPromptAt == null) return true;
  return now - state.lastPromptAt >= PROMPT_COOLDOWN_MS;
}

/**
 * Extract a safe in-app route from a notification's data payload.
 * The server sends `{ url: "/sloka/123" }`; anything that is not a plain
 * app-relative path (external URLs, protocol-relative "//host", non-strings)
 * is rejected so a tampered payload can never navigate outside the app.
 */
export function notificationUrl(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const url = (data as { url?: unknown }).url;
  if (typeof url !== "string") return null;
  if (!url.startsWith("/") || url.startsWith("//")) return null;
  return url;
}

/** Category string from a notification payload, for the notif_opened event. */
export function notificationCategory(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const category = (data as { category?: unknown }).category;
  return typeof category === "string" ? category : undefined;
}
