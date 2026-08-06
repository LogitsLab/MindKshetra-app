import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { supabase } from "@/auth/supabase";
import { completeAuthFromUrl } from "@/auth/redirect";
import { useTheme } from "@/context/ThemeContext";
import { spacing } from "@/theme/tokens";

function hasAuthParams(url: string | null | undefined): boolean {
  if (!url) return false;
  return /[?#].*\b(code|access_token|error|error_code|auth_error)=/.test(url);
}

function urlFromRouteParams(params: Record<string, string | undefined>): string {
  const queryParams: Record<string, string> = {};
  for (const key of [
    "code",
    "error",
    "error_code",
    "auth_error",
    "error_description",
    "access_token",
    "refresh_token",
  ] as const) {
    const value = params[key];
    if (value) queryParams[key] = value;
  }
  return Linking.createURL("auth/callback", { queryParams });
}

async function signedInNonAnonymous(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  return Boolean(user && !user.is_anonymous);
}

export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    code?: string;
    error?: string;
    error_code?: string;
    auth_error?: string;
    error_description?: string;
    access_token?: string;
    refresh_token?: string;
  }>();
  const { colors } = useTheme();
  const [status, setStatus] = useState("Completing sign-in…");
  const linkingUrl = Linking.useURL();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // Google AuthSession often finishes first; the deep link still opens
        // this screen with a spent `code`. Don't treat that as failure.
        if (await signedInNonAnonymous()) {
          if (!alive) return;
          setStatus("Signed in");
          router.replace("/(tabs)/home");
          return;
        }

        // Prefer the *current* deep link (OAuth / magic-link return).
        // getInitialURL() is often the stale Metro launch URL without tokens,
        // which incorrectly fails sign-in with authLinkFailed.
        const initial = await Linking.getInitialURL();
        const fromParams = urlFromRouteParams({
          code: typeof params.code === "string" ? params.code : undefined,
          error: typeof params.error === "string" ? params.error : undefined,
          error_code:
            typeof params.error_code === "string" ? params.error_code : undefined,
          auth_error:
            typeof params.auth_error === "string" ? params.auth_error : undefined,
          error_description:
            typeof params.error_description === "string"
              ? params.error_description
              : undefined,
          access_token:
            typeof params.access_token === "string"
              ? params.access_token
              : undefined,
          refresh_token:
            typeof params.refresh_token === "string"
              ? params.refresh_token
              : undefined,
        });

        const candidates = [linkingUrl, initial, fromParams];
        const url =
          candidates.find((candidate) => hasAuthParams(candidate)) ?? fromParams;

        const result = await completeAuthFromUrl(
          url,
          (code) => supabase.auth.exchangeCodeForSession(code),
          ({ access_token, refresh_token }) =>
            supabase.auth.setSession({ access_token, refresh_token }),
          async () => {
            const { data } = await supabase.auth.getSession();
            return data.session;
          }
        );
        if (!alive) return;
        if (result === "ok") {
          setStatus("Signed in");
          setTimeout(() => router.replace("/account"), 400);
          return;
        }
        // Last chance: session landed via AuthSession while we were exchanging.
        if (await signedInNonAnonymous()) {
          router.replace("/(tabs)/home");
          return;
        }
        router.replace(`/account?auth_error=${result}`);
      } catch (e) {
        if (!alive) return;
        if (await signedInNonAnonymous()) {
          router.replace("/(tabs)/home");
          return;
        }
        const msg = ((e as Error).message || "").toLowerCase();
        const code =
          msg.includes("expired") || msg.includes("invalid")
            ? "otp_expired"
            : "auth_failed";
        router.replace(`/account?auth_error=${code}`);
      }
    })();
    return () => {
      alive = false;
    };
  }, [
    router,
    linkingUrl,
    params.code,
    params.error,
    params.error_code,
    params.auth_error,
    params.error_description,
    params.access_token,
    params.refresh_token,
  ]);

  return (
    <Screen>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.brass} />
        <Text
          variant="soft"
          style={{ marginTop: spacing.md, textAlign: "center" }}
        >
          {status}
        </Text>
      </View>
    </Screen>
  );
}
