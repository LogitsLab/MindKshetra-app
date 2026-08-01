import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import * as WebBrowser from "expo-web-browser";
import * as AppleAuthentication from "expo-apple-authentication";
import { makeRedirectUri } from "expo-auth-session";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { Platform } from "react-native";
import { supabase, supabaseConfigured } from "@/auth/supabase";
import { getAuthCallbackRedirect } from "@/auth/redirect";
import { shouldMerge } from "@/auth/should-merge";
import { chatApi, progressApi, sadhanaApi, userApi } from "@/api/endpoints";
import {
  registerPush,
  unregisterPush,
} from "@/notifications/registerPush";
import {
  clearSadhanaLog,
  getChatSessionId,
  getGuestProgress,
  getJournalDrafts,
  getSadhanaLog,
  getTimezoneSynced,
  removeJournalDrafts,
  setTimezoneSynced,
} from "@/storage/local";

WebBrowser.maybeCompleteAuthSession();

const OTP_COOLDOWN_MS = 90_000;
/** Built-in Supabase SMTP allows only ~2 auth emails/hour project-wide. */
const EMAIL_QUOTA_COOLDOWN_MS = 60 * 60_000;

type EmailAuthFail = "RATE_LIMITED" | "EMAIL_QUOTA";

function classifyEmailAuthError(
  message: string,
  code?: string
): EmailAuthFail | null {
  const lower = message.toLowerCase();
  if (
    code === "over_email_send_rate_limit" ||
    lower.includes("email rate limit") ||
    (lower.includes("too many") && lower.includes("email"))
  ) {
    return "EMAIL_QUOTA";
  }
  if (
    code === "over_request_rate_limit" ||
    lower.includes("rate") ||
    lower.includes("too many") ||
    lower.includes("security purposes") ||
    lower.includes("wait a minute")
  ) {
    // Default SMTP often returns "Too many attempts. Wait a minute…" while the
    // real ceiling is ~2 emails/hour — treat as quota so we stop burning retries.
    return "EMAIL_QUOTA";
  }
  return null;
}

function friendlyAuthError(
  message: string,
  kind: "anonymous" | "google" | "email",
  code?: string
): string {
  const lower = message.toLowerCase();
  if (
    kind === "anonymous" &&
    (lower.includes("disabled") || lower.includes("not enabled"))
  ) {
    return "Guest sign-in is not enabled yet. Use email below.";
  }
  if (
    kind === "google" &&
    (lower.includes("not enabled") || lower.includes("unsupported"))
  ) {
    return "Google sign-in is not set up yet. Use the email magic link instead.";
  }
  if (kind === "email") {
    const classified = classifyEmailAuthError(message, code);
    if (classified) return classified;
  }
  return message;
}

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  configured: boolean;
  isAnonymous: boolean;
  isSignedIn: boolean;
  /** Seconds remaining before another magic-link request is allowed */
  emailCooldownSec: number;
  signInAnonymously: () => Promise<void>;
  /** false means the person cancelled; callers must not treat that as done. */
  signInWithGoogle: () => Promise<boolean>;
  /** false means the person cancelled; callers must not treat that as done. */
  signInWithApple: () => Promise<boolean>;
  signInWithEmail: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function mergeOnUpgrade() {
  try {
    const sessionId = await getChatSessionId();
    if (sessionId) await chatApi.merge(sessionId);
  } catch {
    /* ignore */
  }
  try {
    const guest = await getGuestProgress();
    if (guest.completed.length) await progressApi.merge(guest.completed);
  } catch {
    /* ignore */
  }
  // Practice sessions logged with no session replay through the idempotent
  // merge endpoint (clientRef dedupes). The server caps one request at 200
  // sessions, so replay in chunks and clear only after every chunk landed —
  // a failed chunk keeps the whole log for the next upgrade rather than
  // clearing history the server never received.
  try {
    const sessions = await getSadhanaLog();
    if (sessions.length) {
      let timezone: string | undefined;
      try {
        timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
      } catch {
        timezone = undefined;
      }
      const CHUNK = 200;
      for (let i = 0; i < sessions.length; i += CHUNK) {
        await sadhanaApi.merge({
          sessions: sessions.slice(i, i + CHUNK),
          timezone,
        });
      }
      await clearSadhanaLog();
    }
  } catch {
    /* keep the log */
  }
  // Reflections written while signed out wait as local drafts; failed sends
  // stay queued for the next upgrade.
  try {
    const drafts = await getJournalDrafts();
    for (const draft of drafts) {
      try {
        await userApi.addJournal(draft.slokaId, draft.text);
        await removeJournalDrafts((d) => d.at === draft.at);
      } catch {
        /* leave this draft in place */
      }
    }
  } catch {
    /* ignore */
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailCooldownUntil, setEmailCooldownUntil] = useState(0);
  const [emailCooldownSec, setEmailCooldownSec] = useState(0);
  // The auth listener lives in a []-dep effect, so it must read the previous
  // user from a ref — the closure's `user` is frozen at its initial null.
  const prevUserRef = useRef<User | null>(null);
  const mergedForUserIdRef = useRef<string | null>(null);

  const mergeForUser = useCallback(async (userId: string) => {
    if (mergedForUserIdRef.current === userId) return;
    mergedForUserIdRef.current = userId;
    await mergeOnUpgrade();
  }, []);

  useEffect(() => {
    if (!emailCooldownUntil) {
      setEmailCooldownSec(0);
      return;
    }
    const tick = () => {
      const left = Math.max(0, Math.ceil((emailCooldownUntil - Date.now()) / 1000));
      setEmailCooldownSec(left);
      if (left <= 0) setEmailCooldownUntil(0);
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [emailCooldownUntil]);

  useEffect(() => {
    const rescueAuthRedirect = (url: string | null) => {
      if (!url) return;
      const target = getAuthCallbackRedirect(url);
      if (target) router.replace(target);
    };

    void Linking.getInitialURL().then(rescueAuthRedirect);
    const sub = Linking.addEventListener("url", ({ url }) => {
      rescueAuthRedirect(url);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!supabaseConfigured) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      prevUserRef.current = data.session?.user ?? null;
      // A session restored at launch is not an upgrade; never re-merge it.
      if (data.session?.user && !data.session.user.is_anonymous) {
        mergedForUserIdRef.current = data.session.user.id;
      }
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, next) => {
      const prevUser = prevUserRef.current;
      prevUserRef.current = next?.user ?? null;
      setSession(next);
      setUser(next?.user ?? null);
      if (
        (event === "SIGNED_IN" || event === "USER_UPDATED") &&
        next?.user &&
        shouldMerge(prevUser, next.user)
      ) {
        await mergeForUser(next.user.id);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [mergeForUser]);

  // Keep the server's stored timezone in step with the device so streak day
  // boundaries (and later, notification send windows) are local. One PATCH
  // per user+zone, stamped in AsyncStorage.
  useEffect(() => {
    if (!user) return;
    let tz: string | undefined;
    try {
      tz = Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
    } catch {
      return;
    }
    if (!tz) return;
    const stamp = `${user.id}:${tz}`;
    void (async () => {
      try {
        if ((await getTimezoneSynced()) === stamp) return;
        await userApi.updatePreferences({ timezone: tz });
        await setTimezoneSynced(stamp);
      } catch {
        // Offline — retried on the next auth state change or launch.
      }
    })();
  }, [user]);

  // Best-effort Expo push token registration whenever a session exists
  // (including anonymous — the server re-owns the token on upgrade).
  useEffect(() => {
    if (!session) return;
    void registerPush();
  }, [session]);

  const signInAnonymously = useCallback(async () => {
    if (!supabaseConfigured) return;
    const { error } = await supabase.auth.signInAnonymously();
    if (error) throw new Error(friendlyAuthError(error.message, "anonymous"));
  }, []);

  /** Resolves false when the person backed out, true when a session started. */
  const signInWithGoogle = useCallback(async () => {
    if (!supabaseConfigured) return false;
    const redirectTo = makeRedirectUri({
      scheme: "mindkshetra",
      path: "auth/callback",
    });
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) throw new Error(friendlyAuthError(error.message, "google"));
    if (!data.url) throw new Error("Google sign-in failed to start.");

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== "success" || !result.url) return false;

    const hashIdx = result.url.indexOf("#");
    const queryIdx = result.url.indexOf("?");
    const hash = hashIdx >= 0 ? result.url.slice(hashIdx + 1) : "";
    const query =
      queryIdx >= 0
        ? result.url.slice(queryIdx + 1, hashIdx >= 0 ? hashIdx : undefined)
        : "";
    const params = new URLSearchParams(hash || query);
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    const code = params.get("code");

    if (access_token && refresh_token) {
      const { error: sessionError } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });
      if (sessionError) {
        throw new Error(friendlyAuthError(sessionError.message, "google"));
      }
    } else if (code) {
      const { error: exchangeError } =
        await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) {
        throw new Error(friendlyAuthError(exchangeError.message, "google"));
      }
    } else {
      throw new Error("Google sign-in did not return a session.");
    }
    // The SIGNED_IN listener also merges; mergeForUser dedupes by user id.
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session?.user) {
      await mergeForUser(sessionData.session.user.id);
    }
    return true;
  }, [mergeForUser]);

  /** Resolves false when the person backed out, true when a session started. */
  const signInWithApple = useCallback(async () => {
    if (!supabaseConfigured || Platform.OS !== "ios") return false;
    let credential: AppleAuthentication.AppleAuthenticationCredential;
    try {
      credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
    } catch (e) {
      // Dismissing the Apple sheet is a decision, not a failure. Surfacing it
      // as an error message would blame the user for changing their mind.
      if ((e as { code?: string }).code === "ERR_REQUEST_CANCELED") return false;
      throw e;
    }
    if (!credential.identityToken) throw new Error("Apple Sign-In failed");
    const { error } = await supabase.auth.signInWithIdToken({
      provider: "apple",
      token: credential.identityToken,
    });
    if (error) throw error;
    // The SIGNED_IN listener also merges; mergeForUser dedupes by user id.
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session?.user) {
      await mergeForUser(sessionData.session.user.id);
    }
    return true;
  }, [mergeForUser]);

  const signInWithEmail = useCallback(async (email: string) => {
    if (!supabaseConfigured) return;
    const trimmed = email.trim();
    if (!trimmed.includes("@")) throw new Error("Enter a valid email address.");

    const left = Math.max(0, Math.ceil((emailCooldownUntil - Date.now()) / 1000));
    if (left > 0) {
      throw new Error("RATE_LIMITED");
    }

    const redirectTo = makeRedirectUri({
      scheme: "mindkshetra",
      path: "auth/callback",
    });
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { emailRedirectTo: redirectTo },
    });
    if (error) {
      const classified = classifyEmailAuthError(
        error.message,
        (error as { code?: string }).code
      );
      setEmailCooldownUntil(
        Date.now() +
          (classified === "EMAIL_QUOTA"
            ? EMAIL_QUOTA_COOLDOWN_MS
            : OTP_COOLDOWN_MS)
      );
      throw new Error(
        friendlyAuthError(
          error.message,
          "email",
          (error as { code?: string }).code
        )
      );
    }
    // Cool down after a successful send so double-taps don’t burn quota.
    setEmailCooldownUntil(Date.now() + OTP_COOLDOWN_MS);
  }, [emailCooldownUntil]);

  const signOut = useCallback(async () => {
    if (!supabaseConfigured) return;
    await unregisterPush();
    await supabase.auth.signOut();
  }, []);

  const value = useMemo(
    () => ({
      user,
      session,
      loading,
      configured: supabaseConfigured,
      isAnonymous: Boolean(user?.is_anonymous),
      isSignedIn: Boolean(user && !user.is_anonymous),
      emailCooldownSec,
      signInAnonymously,
      signInWithGoogle,
      signInWithApple,
      signInWithEmail,
      signOut,
    }),
    [
      user,
      session,
      loading,
      emailCooldownSec,
      signInAnonymously,
      signInWithGoogle,
      signInWithApple,
      signInWithEmail,
      signOut,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth requires AuthProvider");
  return ctx;
}
