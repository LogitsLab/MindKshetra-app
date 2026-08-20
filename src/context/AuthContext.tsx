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
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase, supabaseConfigured } from "@/auth/supabase";
import {
  completeAuthFromUrl,
  getAuthCallbackRedirect,
  markAuthCodeConsumed,
} from "@/auth/redirect";
import { resolveAuthRedirectUri } from "@/auth/oauthRedirect";
import { shouldMerge } from "@/auth/should-merge";
import {
  chatApi,
  journeysApi,
  progressApi,
  sadhanaApi,
  userApi,
} from "@/api/endpoints";
import { registerPush, unregisterPush } from "@/notifications/push";
import {
  clearAllGuestJourneys,
  clearPendingProgress,
  clearSadhanaLog,
  getAllGuestJourneys,
  getChatSessionId,
  getGuestProgress,
  getJournalDrafts,
  getPendingProgress,
  getSadhanaLog,
  getTimezoneSynced,
  removeJournalDrafts,
  setTimezoneSynced,
} from "@/storage/local";
import { flushMeditationGuestQueue } from "@/storage/meditationQueue";

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
  kind: "anonymous" | "google" | "apple" | "email" | "password",
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
    kind === "anonymous" &&
    (lower.includes("fetch failed") ||
      lower.includes("network request failed") ||
      lower.includes("failed to fetch"))
  ) {
    return "Could not reach MindKshetra auth. Check your connection and try again.";
  }
  if (
    kind === "google" &&
    (lower.includes("not enabled") || lower.includes("unsupported"))
  ) {
    return "Google sign-in is not set up yet. Use the email magic link instead.";
  }
  if (
    kind === "apple" &&
    (lower.includes("not enabled") || lower.includes("unsupported"))
  ) {
    return "Sign in with Apple is not set up yet. Use Google or email instead.";
  }
  if (
    kind === "apple" &&
    (lower.includes("fetch failed") ||
      lower.includes("network request failed") ||
      lower.includes("failed to fetch"))
  ) {
    return "Could not reach Apple sign-in. Check your connection and try again.";
  }
  if (
    kind === "apple" &&
    (lower.includes("audience") ||
      lower.includes("unacceptable") ||
      lower.includes("invalid jwt") ||
      lower.includes("invalid id token"))
  ) {
    return "Apple sign-in could not be verified. Try again, or use Google or email.";
  }
  if (kind === "password") {
    if (lower.includes("invalid login credentials")) {
      return "Wrong email or password.";
    }
    if (lower.includes("email not confirmed")) {
      return "Confirm your email first, then sign in.";
    }
    if (
      lower.includes("fetch failed") ||
      lower.includes("network request failed") ||
      lower.includes("failed to fetch")
    ) {
      return "Could not reach MindKshetra auth. Check your connection and try again.";
    }
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
  /**
   * True after guest→member upgrade when progress/chat/sadhana/meditation/
   * journeys were merged onto the account. Account screen shows a dismissible
   * banner; cleared via clearLastMergeRestored.
   */
  lastMergeRestored: boolean;
  clearLastMergeRestored: () => void;
  signInAnonymously: () => Promise<void>;
  /** false means the person cancelled; callers must not treat that as done. */
  signInWithGoogle: () => Promise<boolean>;
  /** Native Sign in with Apple (iOS). false means the person cancelled. */
  signInWithApple: () => Promise<boolean>;
  signInWithEmail: (email: string) => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** Returns true when any guest practice/chat data was successfully merged. */
async function mergeOnUpgrade(): Promise<boolean> {
  let restored = false;
  try {
    const sessionId = await getChatSessionId();
    if (sessionId) {
      await chatApi.merge(sessionId);
      restored = true;
    }
  } catch {
    /* ignore */
  }
  try {
    const guest = await getGuestProgress();
    const pending = await getPendingProgress();
    const completed = Array.from(new Set([...guest.completed, ...pending]));
    if (completed.length) {
      await progressApi.merge(completed);
      await clearPendingProgress();
      restored = true;
    }
  } catch {
    /* ignore */
  }
  try {
    const flushed = await flushMeditationGuestQueue();
    if (flushed > 0) restored = true;
  } catch {
    /* keep the queue for the next upgrade */
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
      restored = true;
    }
  } catch {
    /* keep the log */
  }
  // Journey days marked while signed out. Until now mobile had no guest store
  // at all, so a signed-out person's path progress simply vanished; these rows
  // replay through the idempotent merge endpoint, which re-validates each day
  // against the real journey. Clear only on success, like the sadhana log.
  try {
    const journeys = await getAllGuestJourneys();
    if (journeys.length) {
      await journeysApi.merge(journeys);
      await clearAllGuestJourneys();
      restored = true;
    }
  } catch {
    /* keep the runs for the next upgrade */
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
  // Personalization draft from onboarding (guest device → account).
  try {
    const raw = await AsyncStorage.getItem("mindkshetra-personalization-draft");
    if (raw) {
      const draft = JSON.parse(raw) as Record<string, unknown>;
      await userApi.completeOnboarding({
        goals: draft.goals,
        inspirations: draft.inspirations,
        dailyTimeMinutes: draft.dailyTimeMinutes,
        guidanceStyle: draft.guidanceStyle,
        displayName: draft.displayName,
        preferredLanguage: draft.preferredLanguage,
        skipped: Boolean(draft.skipped),
      });
      await AsyncStorage.removeItem("mindkshetra-personalization-draft");
    }
  } catch {
    /* keep draft */
  }
  return restored;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailCooldownUntil, setEmailCooldownUntil] = useState(0);
  const [emailCooldownSec, setEmailCooldownSec] = useState(0);
  const [lastMergeRestored, setLastMergeRestored] = useState(false);
  // The auth listener lives in a []-dep effect, so it must read the previous
  // user from a ref — the closure's `user` is frozen at its initial null.
  const prevUserRef = useRef<User | null>(null);
  const mergedForUserIdRef = useRef<string | null>(null);

  const clearLastMergeRestored = useCallback(() => {
    setLastMergeRestored(false);
  }, []);

  const mergeForUser = useCallback(async (userId: string) => {
    if (mergedForUserIdRef.current === userId) return;
    mergedForUserIdRef.current = userId;
    const restored = await mergeOnUpgrade();
    if (restored) setLastMergeRestored(true);
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
    supabase.auth
      .getSession()
      .then(({ data }) => {
        prevUserRef.current = data.session?.user ?? null;
        // A session restored at launch is not an upgrade; never re-merge it.
        if (data.session?.user && !data.session.user.is_anonymous) {
          mergedForUserIdRef.current = data.session.user.id;
        }
        setSession(data.session);
        setUser(data.session?.user ?? null);
      })
      .catch(() => {
        // Corrupted storage or a failed token refresh must degrade to
        // signed-out, never wedge the app: routing gates on `loading`, so a
        // rejection here without this handler left the root index black
        // forever with only the FAB rendered.
        prevUserRef.current = null;
        setSession(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
    // Do not await merge inside the listener — Supabase can deadlock auth
    // callbacks that hold the lock across network round-trips, which showed up
    // as a hard hang/crash right after Google / magic-link sign-in.
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      const prevUser = prevUserRef.current;
      prevUserRef.current = next?.user ?? null;
      setSession(next);
      setUser(next?.user ?? null);
      if (
        (event === "SIGNED_IN" || event === "USER_UPDATED") &&
        next?.user &&
        shouldMerge(prevUser, next.user)
      ) {
        void mergeForUser(next.user.id);
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

  // A signed-in verse completion that failed offline is queued locally. Replay
  // it on the next authenticated launch/state change and clear only on success.
  useEffect(() => {
    if (!user || user.is_anonymous) return;
    void (async () => {
      try {
        const pending = await getPendingProgress();
        if (!pending.length) return;
        await progressApi.merge(pending);
        await clearPendingProgress();
      } catch {
        /* keep queued */
      }
    })();
  }, [user]);

  // Best-effort Expo push token registration whenever a session exists
  // (including anonymous — the server re-owns the token on upgrade).
  // Silent by design: registerPush only proceeds when OS permission was
  // already granted; the ask itself lives in the pre-permission sheet.
  useEffect(() => {
    if (!session) return;
    void registerPush();
  }, [session]);

  const signInAnonymously = useCallback(async () => {
    if (!supabaseConfigured) return;

    // Stale sessions from a previous Supabase project (paused post-migration)
    // can leave Auth in a bad state on device. Clear first, then mint guest.
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      /* ignore — no session or storage glitch */
    }

    let { data, error } = await supabase.auth.signInAnonymously();
    if (error && /fetch failed|network request failed|failed to fetch/i.test(error.message)) {
      // One retry after a brief pause — cold DNS / flaky mobile radios.
      await new Promise((r) => setTimeout(r, 400));
      ({ data, error } = await supabase.auth.signInAnonymously());
    }
    if (error) throw new Error(friendlyAuthError(error.message, "anonymous"));
    if (!data.session) {
      throw new Error("Guest sign-in did not return a session. Try again.");
    }
  }, []);

  /** Resolves false when the person backed out, true when a session started. */
  const signInWithGoogle = useCallback(async () => {
    if (!supabaseConfigured) return false;
    const redirectTo = resolveAuthRedirectUri();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        skipBrowserRedirect: true,
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) throw new Error(friendlyAuthError(error.message, "google"));
    if (!data.url) throw new Error("Google sign-in failed to start.");

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== "success" || !result.url) {
      // iOS sometimes dismisses after a successful HTTPS return that Linking
      // still delivers — or the in-app callback route already exchanged.
      const { data: raced } = await supabase.auth.getSession();
      if (raced.session?.user && !raced.session.user.is_anonymous) {
        await mergeForUser(raced.session.user.id);
        return true;
      }
      return false;
    }

    const outcome = await completeAuthFromUrl(
      result.url,
      (code) => supabase.auth.exchangeCodeForSession(code),
      ({ access_token, refresh_token }) =>
        supabase.auth.setSession({ access_token, refresh_token }),
      async () => {
        const { data: sessionData } = await supabase.auth.getSession();
        return sessionData.session;
      }
    );
    if (outcome !== "ok") {
      const { data: raced } = await supabase.auth.getSession();
      if (!raced.session?.user || raced.session.user.is_anonymous) {
        throw new Error(
          outcome === "otp_expired"
            ? "Google sign-in expired. Try again."
            : "Google sign-in did not return a session."
        );
      }
    }

    const codeMatch = result.url.match(/[?&#]code=([^&]+)/);
    markAuthCodeConsumed(
      codeMatch?.[1] ? decodeURIComponent(codeMatch[1]) : null
    );

    // The SIGNED_IN listener also merges; mergeForUser dedupes by user id.
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session?.user) {
      await mergeForUser(sessionData.session.user.id);
    }
    return true;
  }, [mergeForUser]);

  /**
   * Native Sign in with Apple (iOS only). Resolves false when the person
   * cancels the system sheet, true when a session started. Uses a hashed nonce
   * so the Apple identity token can't be replayed against Supabase.
   */
  const signInWithApple = useCallback(async () => {
    if (!supabaseConfigured || Platform.OS !== "ios") return false;

    const rawNonce = Crypto.randomUUID();
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawNonce
    );

    let credential: AppleAuthentication.AppleAuthenticationCredential;
    try {
      credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });
    } catch (e) {
      // The person tapped Cancel on the system sheet — not an error.
      if ((e as { code?: string }).code === "ERR_REQUEST_CANCELED") {
        return false;
      }
      throw new Error("Sign in with Apple did not complete. Try again.");
    }

    if (!credential.identityToken) {
      throw new Error("Sign in with Apple did not return a token.");
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "apple",
      token: credential.identityToken,
      nonce: rawNonce,
    });
    if (error) throw new Error(friendlyAuthError(error.message, "apple"));
    if (!data.session) {
      throw new Error("Sign in with Apple did not return a session.");
    }

    // The SIGNED_IN listener also merges; mergeForUser dedupes by user id.
    await mergeForUser(data.session.user.id);
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

    const redirectTo = resolveAuthRedirectUri();
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

  /**
   * Email + password sign-in. Primarily for App Review (magic links aren't
   * testable by reviewers), but available to anyone with a password account.
   */
  const signInWithPassword = useCallback(
    async (email: string, password: string) => {
      if (!supabaseConfigured) return;
      const trimmed = email.trim();
      if (!trimmed.includes("@")) {
        throw new Error("Enter a valid email address.");
      }
      if (!password) throw new Error("Enter your password.");

      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmed,
        password,
      });
      if (error) throw new Error(friendlyAuthError(error.message, "password"));
      if (!data.session) {
        throw new Error("Sign-in did not return a session. Try again.");
      }
      await mergeForUser(data.session.user.id);
    },
    [mergeForUser]
  );

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
      lastMergeRestored,
      clearLastMergeRestored,
      signInAnonymously,
      signInWithGoogle,
      signInWithApple,
      signInWithEmail,
      signInWithPassword,
      signOut,
    }),
    [
      user,
      session,
      loading,
      emailCooldownSec,
      lastMergeRestored,
      clearLastMergeRestored,
      signInAnonymously,
      signInWithGoogle,
      signInWithApple,
      signInWithEmail,
      signInWithPassword,
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
