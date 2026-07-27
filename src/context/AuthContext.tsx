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

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  configured: boolean;
  isAnonymous: boolean;
  isSignedIn: boolean;
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
    if (error) throw error;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!supabaseConfigured) return;
    const redirectTo = makeRedirectUri({ scheme: "mindkshetra", path: "auth/callback" });
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) throw error;
    if (data.url) {
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type === "success" && result.url) {
        const url = new URL(result.url);
        const params = new URLSearchParams(url.hash.replace(/^#/, ""));
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");
        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token });
          await mergeOnUpgrade();
        }
      }
    }
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
    const redirectTo = makeRedirectUri({ scheme: "mindkshetra", path: "auth/callback" });
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });
    if (error) throw error;
  }, []);

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
