/**
 * Pure decision logic for the notification system — no Expo imports, so it
 * runs under plain jest without the native module surface.
 */

/** How long a "Not now" keeps the pre-permission sheet away. */
export const PROMPT_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;

/** After this many declines the sheet never appears again. */
export const PROMPT_MAX_DECLINES = 2;

/**
 * Server-supported notification destinations. Dynamic segments intentionally
 * use Expo Router file syntax so scripts/validate-routes.mjs can verify them
 * against the app directory.
 */
export const NOTIFICATION_ROUTE_TARGETS = [
  "/sloka/[id]",
  "/verse-of-the-day",
  "/sadhana",
  "/meditation/[day]",
  "/paths/[id]",
] as const;

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
  if (
    !url.startsWith("/") ||
    url.startsWith("//") ||
    url !== url.trim() ||
    url.length > 2048 ||
    /[\u0000-\u001f\u007f\\]/.test(url)
  ) {
    return null;
  }

  let decodedPath: string;
  try {
    const parsed = new URL(url, "https://app.mindkshetra.invalid");
    const rawPath = url.split(/[?#]/, 1)[0];
    decodedPath = decodeURIComponent(rawPath);
    const segments = decodedPath.split("/");
    if (
      parsed.origin !== "https://app.mindkshetra.invalid" ||
      decodedPath.startsWith("//") ||
      /[\u0000-\u001f\u007f\\]/.test(decodedPath) ||
      segments.some((segment) => segment === "." || segment === "..")
    ) {
      return null;
    }
  } catch {
    return null;
  }

  const pathname = decodedPath.replace(/\/+$/, "") || "/";
  const segments = pathname.split("/");
  const known = NOTIFICATION_ROUTE_TARGETS.some((target) => {
    const targetSegments = target.split("/");
    return (
      targetSegments.length === segments.length &&
      targetSegments.every(
        (segment, index) =>
          (/^\[[^\]]+\]$/.test(segment) && Boolean(segments[index])) ||
          segment === segments[index]
      )
    );
  });
  if (!known) return null;
  return url;
}

/** Category string from a notification payload, for the notif_opened event. */
export function notificationCategory(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const category = (data as { category?: unknown }).category;
  return typeof category === "string" ? category : undefined;
}
