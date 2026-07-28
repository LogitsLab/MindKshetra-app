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

export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    code?: string;
    error?: string;
    error_code?: string;
    auth_error?: string;
  }>();
  const { colors } = useTheme();
  const [status, setStatus] = useState("Completing sign-in…");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // Prefer deep-link URL; fall back to route params (Expo Router).
        const initial = await Linking.getInitialURL();
        const url =
          initial ??
          Linking.createURL("auth/callback", {
            queryParams: {
              code: params.code,
              error: params.error,
              error_code: params.error_code,
              auth_error: params.auth_error,
            },
          });
        const result = await completeAuthFromUrl(
          url,
          (code) => supabase.auth.exchangeCodeForSession(code),
          ({ access_token, refresh_token }) =>
            supabase.auth.setSession({ access_token, refresh_token })
        );
        if (!alive) return;
        if (result === "ok") {
          setStatus("Signed in");
          setTimeout(() => router.replace("/account"), 400);
          return;
        }
        router.replace(`/account?auth_error=${result}`);
      } catch (e) {
        if (!alive) return;
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
  }, [router, params.code, params.error, params.error_code, params.auth_error]);

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
