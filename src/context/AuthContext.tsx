import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import * as WebBrowser from "expo-web-browser";
import * as AppleAuthentication from "expo-apple-authentication";
import { makeRedirectUri } from "expo-auth-session";
import { Platform } from "react-native";
import { supabase, supabaseConfigured } from "@/auth/supabase";
import { chatApi, progressApi } from "@/api/endpoints";
import { getChatSessionId, getGuestProgress } from "@/storage/local";

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
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
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
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailCooldownUntil, setEmailCooldownUntil] = useState(0);
  const [emailCooldownSec, setEmailCooldownSec] = useState(0);

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
    if (!supabaseConfigured) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, next) => {
      const prevAnon = user?.is_anonymous;
      setSession(next);
      setUser(next?.user ?? null);
      if (prevAnon && next?.user && !next.user.is_anonymous) {
        await mergeOnUpgrade();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signInAnonymously = useCallback(async () => {
    if (!supabaseConfigured) return;
    const { error } = await supabase.auth.signInAnonymously();
    if (error) throw new Error(friendlyAuthError(error.message, "anonymous"));
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!supabaseConfigured) return;
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
    if (result.type !== "success" || !result.url) return;

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
    await mergeOnUpgrade();
  }, []);

  const signInWithApple = useCallback(async () => {
    if (!supabaseConfigured || Platform.OS !== "ios") return;
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    if (!credential.identityToken) throw new Error("Apple Sign-In failed");
    const { error } = await supabase.auth.signInWithIdToken({
      provider: "apple",
      token: credential.identityToken,
    });
    if (error) throw error;
    await mergeOnUpgrade();
  }, []);

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
