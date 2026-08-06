const AUTH_PARAM_KEYS = [
  "access_token",
  "refresh_token",
  "code",
  "error",
  "error_code",
  "auth_error",
  "error_description",
] as const;

/** Codes already exchanged in this JS runtime (Google AuthSession + deep-link race). */
const consumedAuthCodes = new Set<string>();

export function markAuthCodeConsumed(code: string | null | undefined) {
  if (code) consumedAuthCodes.add(code);
}

function getUrlParams(url: string): URLSearchParams {
  const hashIdx = url.indexOf("#");
  const queryIdx = url.indexOf("?");
  const hash = hashIdx >= 0 ? url.slice(hashIdx + 1) : "";
  const query =
    queryIdx >= 0
      ? url.slice(queryIdx + 1, hashIdx >= 0 ? hashIdx : undefined)
      : "";
  // Prefer query (PKCE `code=`) over hash; some clients append both.
  if (query && /(?:^|&)(code|access_token|error)=/.test(query)) {
    return new URLSearchParams(query);
  }
  return new URLSearchParams(hash || query);
}

function hasAuthPayload(params: URLSearchParams): boolean {
  return AUTH_PARAM_KEYS.some((key) => {
    const value = params.get(key);
    return Boolean(value && value.trim());
  });
}

export function authErrorCode(params: URLSearchParams): string | null {
  const code = params.get("code");
  if (code) return null;
  const errorCode = params.get("error_code") || params.get("auth_error") || "";
  const error = params.get("error") || "";
  const description = (params.get("error_description") || "").toLowerCase();
  if (
    errorCode === "otp_expired" ||
    (error === "access_denied" && description.includes("expired"))
  ) {
    return "otp_expired";
  }
  if (error === "access_denied" || errorCode || error) {
    return "auth_failed";
  }
  return null;
}

type SessionLike = {
  user?: { is_anonymous?: boolean | null } | null;
} | null;

export async function completeAuthFromUrl(
  url: string,
  exchangeCodeForSession: (code: string) => Promise<{ error: { message: string } | null }>,
  setSession: (session: {
    access_token: string;
    refresh_token: string;
  }) => Promise<{ error: { message: string } | null }>,
  /** When the code was already spent by AuthSession, treat an existing login as success. */
  getExistingSession?: () => Promise<SessionLike>
): Promise<"ok" | string> {
  const params = getUrlParams(url);
  const failed = authErrorCode(params);
  if (failed) return failed;

  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  const code = params.get("code");

  const existingIsSignedIn = async () => {
    const session = await getExistingSession?.();
    return Boolean(session?.user && !session.user.is_anonymous);
  };

  if (access_token && refresh_token) {
    const { error } = await setSession({ access_token, refresh_token });
    if (error) {
      if (await existingIsSignedIn()) return "ok";
      const msg = error.message.toLowerCase();
      if (msg.includes("expired") || msg.includes("invalid")) return "otp_expired";
      return "auth_failed";
    }
    return "ok";
  }

  if (code) {
    if (consumedAuthCodes.has(code)) {
      if (await existingIsSignedIn()) return "ok";
    }
    const { error } = await exchangeCodeForSession(code);
    if (error) {
      // Typical race: WebBrowser AuthSession exchanged first; deep link retries.
      if (await existingIsSignedIn()) {
        markAuthCodeConsumed(code);
        return "ok";
      }
      const msg = error.message.toLowerCase();
      if (msg.includes("expired") || msg.includes("invalid")) return "otp_expired";
      return "auth_failed";
    }
    markAuthCodeConsumed(code);
    return "ok";
  }

  if (await existingIsSignedIn()) return "ok";
  return "auth_failed";
}

export function getAuthCallbackRedirect(url: string): string | null {
  const params = getUrlParams(url);
  if (!hasAuthPayload(params) || url.includes("auth/callback")) return null;

  const forward = new URLSearchParams();
  for (const key of AUTH_PARAM_KEYS) {
    const value = params.get(key);
    if (value) forward.set(key, value);
  }

  const query = forward.toString();
  return query ? `/auth/callback?${query}` : null;
}
