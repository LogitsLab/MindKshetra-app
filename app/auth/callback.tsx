import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { supabase } from "@/auth/supabase";
import { useTheme } from "@/context/ThemeContext";
import { spacing } from "@/theme/tokens";

function authErrorCode(params: URLSearchParams): string | null {
  const code = params.get("code");
  if (code) return null;
  const errorCode =
    params.get("error_code") || params.get("auth_error") || "";
  const error = params.get("error") || "";
  const description = (
    params.get("error_description") || ""
  ).toLowerCase();
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

async function completeAuthFromUrl(url: string): Promise<"ok" | string> {
  const hashIdx = url.indexOf("#");
  const queryIdx = url.indexOf("?");
  const hash = hashIdx >= 0 ? url.slice(hashIdx + 1) : "";
  const query =
    queryIdx >= 0
      ? url.slice(queryIdx + 1, hashIdx >= 0 ? hashIdx : undefined)
      : "";
  const params = new URLSearchParams(hash || query);

  const failed = authErrorCode(params);
  if (failed) return failed;

  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  const code = params.get("code");

  if (access_token && refresh_token) {
    const { error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("expired") || msg.includes("invalid")) return "otp_expired";
      return "auth_failed";
    }
    return "ok";
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("expired") || msg.includes("invalid")) return "otp_expired";
      return "auth_failed";
    }
    return "ok";
  }

  return "auth_failed";
}

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
        const result = await completeAuthFromUrl(url);
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
